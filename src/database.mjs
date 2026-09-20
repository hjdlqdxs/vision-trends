import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { cleanKeywords, extractKeywords, normalizeText } from './keywords.mjs';

export const CONFERENCES = ['CVPR', 'ICCV', 'ECCV'];

export function validatePaper(input) {
  const title = String(input.title || '').trim();
  if (title.length < 3 || title.length > 600) throw new Error('论文标题需为3至600字符');
  const conference = String(input.conference || '').toUpperCase();
  if (!CONFERENCES.includes(conference)) throw new Error('会议仅支持 CVPR、ICCV、ECCV');
  const year = Number(input.year);
  if (!Number.isInteger(year) || year < 2000 || year > new Date().getFullYear() + 1) throw new Error('年份不合法');
  if ((conference === 'ICCV' && year % 2 === 0) || (conference === 'ECCV' && year % 2 === 1)) {
    throw new Error('ICCV 为奇数年、ECCV 为偶数年，请核对会议年份');
  }
  const abstract = String(input.abstract || '').trim();
  if (abstract.length > 30000) throw new Error('摘要过长');
  const links = {};
  for (const key of ['sourceUrl', 'paperUrl']) {
    const value = String(input[key] || '').trim();
    if (value) {
      let url;
      try { url = new URL(value); } catch { throw new Error('论文链接格式不正确'); }
      if (url.protocol !== 'https:' || url.username || url.password) throw new Error('论文链接必须是 HTTPS');
    }
    links[key] = value;
  }
  return { title, conference, year, abstract, ...links,
    authors: String(input.authors || '').slice(0, 4000),
    keywords: input.keywords === undefined ? extractKeywords(title, abstract) : cleanKeywords(input.keywords),
    keywordMethod: input.keywordMethod === 'manual' ? 'manual' : 'controlled-vocabulary-v1',
    retrievedAt: String(input.retrievedAt || new Date().toISOString()).slice(0, 40),
  };
}

export function openDatabase(path = 'var/papers.sqlite') {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS papers (
      id INTEGER PRIMARY KEY, title TEXT NOT NULL, normalized_title TEXT NOT NULL,
      conference TEXT NOT NULL, year INTEGER NOT NULL, abstract TEXT NOT NULL,
      authors TEXT NOT NULL, keywords TEXT NOT NULL, source_url TEXT NOT NULL,
      paper_url TEXT NOT NULL, keyword_method TEXT NOT NULL, retrieved_at TEXT NOT NULL,
      updated_at TEXT NOT NULL, UNIQUE(normalized_title, conference, year)
    ); CREATE INDEX IF NOT EXISTS papers_scope ON papers(conference, year);`);
  function decode(row) {
    if (!row) return null;
    return { id: row.id, title: row.title, conference: row.conference, year: row.year,
      abstract: row.abstract, authors: row.authors, keywords: JSON.parse(row.keywords),
      sourceUrl: row.source_url, paperUrl: row.paper_url, keywordMethod: row.keyword_method,
      retrievedAt: row.retrieved_at, updatedAt: row.updated_at };
  }
  const get = id => decode(db.prepare('SELECT * FROM papers WHERE id = ?').get(id));
  function save(input, id = null) {
    const p = validatePaper(input);
    const norm = normalizeText(p.title);
    const duplicate = db.prepare('SELECT id FROM papers WHERE normalized_title=? AND conference=? AND year=?').get(norm, p.conference, p.year);
    if (duplicate && duplicate.id !== id) return { paper: get(duplicate.id), created: false, duplicate: true };
    const values = [p.title, norm, p.conference, p.year, p.abstract, p.authors,
      JSON.stringify(p.keywords), p.sourceUrl, p.paperUrl, p.keywordMethod, p.retrievedAt, new Date().toISOString()];
    if (id !== null) {
      if (!get(id)) throw new Error('论文不存在');
      db.prepare(`UPDATE papers SET title=?, normalized_title=?, conference=?, year=?, abstract=?,
        authors=?, keywords=?, source_url=?, paper_url=?, keyword_method=?, retrieved_at=?, updated_at=? WHERE id=?`).run(...values, id);
      return { paper: get(id), created: false };
    }
    const result = db.prepare(`INSERT INTO papers(title, normalized_title, conference, year, abstract,
      authors, keywords, source_url, paper_url, keyword_method, retrieved_at, updated_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).run(...values);
    return { paper: get(Number(result.lastInsertRowid)), created: true };
  }
  function list({ q = '', exact = false, conference = '', year = '', keyword = '' } = {}) {
    const params = [];
    const clauses = [];
    if (conference) { clauses.push('conference=?'); params.push(conference); }
    if (year) { clauses.push('year=?'); params.push(Number(year)); }
    if (q) {
      if (exact) { clauses.push('normalized_title=?'); params.push(normalizeText(q)); }
      else {
        clauses.push("(title LIKE ? ESCAPE '\\' OR abstract LIKE ? ESCAPE '\\' OR keywords LIKE ? ESCAPE '\\' OR CAST(id AS TEXT)=?)");
        const like = `%${q.replace(/[\\%_]/g, '\\$&')}%`;
        params.push(like, like, like, q);
      }
    }
    const rows = db.prepare(`SELECT * FROM papers ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''} ORDER BY year DESC, id DESC`).all(...params).map(decode);
    return keyword ? rows.filter(p => p.keywords.includes(keyword)) : rows;
  }
  return { db, get, save, list, remove: id => Number(db.prepare('DELETE FROM papers WHERE id=?').run(id).changes), close: () => db.close() };
}
