# 关键代码与解释

共 303 行。以下各段属于独立模块，不应直接拼接为单文件。

### 8.1 src/database.mjs

数据层负责校验、绑定SQL参数和去重。save在冲突时返回已存在记录而非覆盖，保护人工编辑；list以相同筛选口径服务论文库与统计。规范化标题只是匹配键，展示仍保留原始标题。

```javascript
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
```

### 8.2 src/crawler.mjs

抓取层把“网络获取”“HTML解析”“标题定位”分开。官方列表同时提供会议/年份元信息；详情只读取官方摘要。白名单、禁止重定向、限速、缓存、超时与响应大小限制分别控制目标、负载和失败边界。DBLP反机器人HTML不能当作JSON或摘要。

```javascript
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { normalizeText, extractKeywords } from './keywords.mjs';

const HOSTS = new Set(['openaccess.thecvf.com', 'www.ecva.net', 'ecva.net', 'dblp.org']);
export const EDITIONS = [
  ['CVPR', 2022], ['ECCV', 2022], ['CVPR', 2023], ['ICCV', 2023],
  ['CVPR', 2024], ['ECCV', 2024], ['CVPR', 2025], ['ICCV', 2025],
];

export function allowedUrl(value) {
  const u = new URL(value);
  if (u.protocol !== 'https:' || !HOSTS.has(u.hostname) || u.port || u.username || u.password) {
    throw new Error('只能抓取 CVF、ECVA、DBLP 官方 HTTPS 地址');
  }
  return u.href;
}

export function plainText(html) {
  return String(html).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]*>/g, ' ').replace(/&(?:#(x[\da-f]+|\d+)|([a-z]+));/gi, (s, n, name) => {
      if (n) {
        const code = n[0].toLowerCase() === 'x' ? parseInt(n.slice(1), 16) : Number(n);
        return code <= 0x10ffff ? String.fromCodePoint(code) : '';
      }
      return ({ amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ', ndash: '–', mdash: '—' })[name.toLowerCase()] || s;
    }).replace(/\s+/g, ' ').trim();
}

function attributes(tag) {
  const result = {};
  for (const m of tag.matchAll(/([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    result[m[1].toLowerCase()] = plainText(m[2] ?? m[3] ?? m[4]);
  }
  return result;
}

export function parseList(html, base, conference, year) {
  const papers = [];
  const seen = new Set();
  for (const m of html.matchAll(/<dt\b[^>]*class\s*=\s*["']ptitle["'][^>]*>([\s\S]*?)<\/dt>/gi)) {
    const a = m[1].match(/<a\b([^>]*)>([\s\S]*?)<\/a>/i);
    if (!a) continue;
    const href = attributes(a[1]).href;
    if (!href) continue;
    const sourceUrl = allowedUrl(new URL(href, base).href);
    if (conference === 'ECCV' && !sourceUrl.toLowerCase().includes(`eccv_${year}`)) continue;
    if (seen.has(sourceUrl)) continue;
    seen.add(sourceUrl);
    papers.push({ title: plainText(a[2]), conference, year, sourceUrl });
  }
  return papers;
}

export function parseDetail(html, entry) {
  const meta = {};
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const a = attributes(m[0]);
    if (a.name && a.content) (meta[a.name] ||= []).push(a.content);
  }
  const abstract = plainText(html.match(/<div\b[^>]*id=["']abstract["'][^>]*>([\s\S]*?)<\/div>/i)?.[1] || '');
  const title = meta.citation_title?.[0] || plainText(html.match(/<div\b[^>]*id=["']papertitle["'][^>]*>([\s\S]*?)<\/div>/i)?.[1] || entry.title);
  let paperUrl = meta.citation_pdf_url?.[0] || '';
  if (!paperUrl) {
    for (const a of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
      const href = attributes(a[1]).href;
      if (href && /\.pdf(?:\?|$)/i.test(href) && !/supp/i.test(href)) { paperUrl = new URL(href, entry.sourceUrl).href; break; }
    }
  }
  if (paperUrl) paperUrl = allowedUrl(paperUrl);
  if (!title || (!abstract && !paperUrl)) throw new Error('官方页面缺少可解析的论文信息，未保存');
  return { ...entry, title, abstract, paperUrl,
    authors: meta.citation_author?.join('; ') || plainText(html.match(/<div\b[^>]*id=["']authors["'][^>]*>([\s\S]*?)<\/div>/i)?.[1] || ''),
    keywords: extractKeywords(title, abstract), keywordMethod: 'controlled-vocabulary-v1',
    retrievedAt: new Date().toISOString() };
}

export function createCrawler({ cacheDir = 'var/cache', fetcher = fetch, delay = 400 } = {}) {
  mkdirSync(cacheDir, { recursive: true });
  let queue = Promise.resolve();
  const memoryLists = new Map();
  async function get(url) {
    url = allowedUrl(url);
    const file = join(cacheDir, createHash('sha256').update(url).digest('hex') + '.html');
    if (existsSync(file) && Date.now() - statSync(file).mtimeMs < 86400000) return readFileSync(file, 'utf8');
    const task = queue.then(async () => {
      await new Promise(resolve => setTimeout(resolve, delay));
      const response = await fetcher(url, { redirect: 'error', signal: AbortSignal.timeout(20000),
        headers: { 'User-Agent': 'VisionTrendsCourseProject/1.0 (educational, cached, rate-limited)', Accept: 'text/html,application/json' } });
      if (!response.ok) throw new Error(`来源网站返回 HTTP ${response.status}`);
      const chunks = [];
      let size = 0;
      for await (const chunk of response.body) {
        size += chunk.length;
        if (size > 32 * 1024 * 1024) throw new Error('来源响应超过32MB限制');
        chunks.push(chunk);
      }
      const text = Buffer.concat(chunks).toString('utf8');
      if (/anubis_challenge|Making sure you.*not a bot/i.test(text)) throw new Error('来源网站启用了人机验证，请使用官方会议列表');
      writeFileSync(file, text);
      return text;
    });
    queue = task.catch(() => {});
    return task;
  }
  async function list(conference, year) {
    if (!EDITIONS.some(([c, y]) => c === conference && y === Number(year))) throw new Error('当前支持2022—2025已收录的三会届次');
    const key = `${conference}${year}`;
    if (memoryLists.has(key)) return memoryLists.get(key);
    const url = conference === 'ECCV' ? 'https://www.ecva.net/papers.php' : `https://openaccess.thecvf.com/${conference}${year}?day=all`;
    const entries = parseList(await get(url), url, conference, Number(year));
    if (!entries.length) throw new Error('会议页面未解析到论文，请检查官网结构');
    memoryLists.set(key, entries);
    return entries;
  }
  async function detail(entry) { return parseDetail(await get(entry.sourceUrl), entry); }
  async function search(title, { conference, year, limit = 3, exact = false } = {}) {
    const query = normalizeText(title);
    if (query.length < 3) throw new Error('在线检索至少需要3个有效字符');
    const editions = EDITIONS.filter(([c, y]) => (!conference || c === conference) && (!year || y === Number(year))).toReversed();
    const candidates = [];
    const warnings = [];
    // Official indexes remain usable when DBLP presents an anti-bot challenge.
    for (const [c, y] of editions) {
      try {
        const entries = await list(c, y);
        for (const entry of entries) {
          const n = normalizeText(entry.title);
          if (n === query || (!exact && n.includes(query))) candidates.push({ ...entry, score: n === query ? 2 : 1 });
        }
      } catch (error) { warnings.push(`${c} ${y}: ${error.message}`); }
    }
    if (!candidates.length) {
      try {
        const url = `https://dblp.org/search/publ/api?q=${encodeURIComponent(title)}&format=json&h=20`;
        const data = JSON.parse(await get(url));
        for (const hit of data.result?.hits?.hit || []) {
          const info = hit.info;
          const venue = String(info.venue);
          const c = ['CVPR', 'ICCV', 'ECCV'].find(x => new RegExp(`\\b${x}\\b`).test(venue));
          if (!c || /workshop/i.test(venue) || (conference && c !== conference) || (year && Number(info.year) !== Number(year))) continue;
          const n = normalizeText(info.title);
          if (!(n === query || (!exact && n.includes(query)))) continue;
          const urls = Array.isArray(info.ee) ? info.ee : [info.ee];
          const ee = urls.map(x => typeof x === 'object' ? x.text : x).find(x => /^https:\/\/(openaccess\.thecvf\.com|(?:www\.)?ecva\.net)\//.test(x || '') && !/\.pdf$/.test(x));
          if (ee) candidates.push({ title: info.title, conference: c, year: Number(info.year), sourceUrl: ee, score: n === query ? 2 : 1 });
        }
      } catch (error) { warnings.push(`DBLP: ${error.message}`); }
    }
    const papers = [];
    for (const entry of candidates.sort((a, b) => b.score - a.score).slice(0, limit)) {
      try { papers.push(await detail(entry)); } catch (error) { warnings.push(`${entry.title}: ${error.message}`); }
    }
    return { papers, warnings };
  }
  return { get, list, detail, search };
}
```

### 8.3 src/analytics.mjs

统计层先对每篇标签去重，再累加文档频数与两两共现。趋势严格区分0与null，并同时返回样本分母，让占比可以复算。CSV导出对特殊字符转义并中和公式开头。

```javascript
import { CONFERENCES } from './database.mjs';

export function summarize(papers) {
  const counts = new Map();
  const pairs = new Map();
  for (const paper of papers) {
    const keywords = [...new Set(paper.keywords)].sort();
    for (const keyword of keywords) counts.set(keyword, (counts.get(keyword) || 0) + 1);
    for (let i = 0; i < keywords.length; i++) {
      for (let j = i + 1; j < keywords.length; j++) {
        const key = JSON.stringify([keywords[i], keywords[j]]);
        pairs.set(key, (pairs.get(key) || 0) + 1);
      }
    }
  }
  const topics = [...counts].map(([name, count]) => ({ name, count, percent: papers.length ? count / papers.length * 100 : 0 }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'en'));
  const nodes = topics.slice(0, 16);
  const names = new Set(nodes.map(n => n.name));
  const edges = [...pairs].map(([pair, weight]) => ({ source: JSON.parse(pair)[0], target: JSON.parse(pair)[1], weight }))
    .filter(e => names.has(e.source) && names.has(e.target)).sort((a, b) => b.weight - a.weight).slice(0, 50);
  return { total: papers.length, abstractCount: papers.filter(p => p.abstract).length,
    keywordCoverage: papers.filter(p => p.keywords.length).length,
    years: [...new Set(papers.map(p => p.year))].sort(),
    conferences: CONFERENCES.map(name => ({ name, count: papers.filter(p => p.conference === name).length })),
    topics, top10: topics.slice(0, 10), graph: { nodes, edges },
    formula: '每篇每词计1次；占比=关键词命中论文数/该筛选条件样本论文数×100%。样本不代表会议全量。' };
}

export function trends(papers, keyword, start = 2022, end = 2025) {
  if (!Number.isInteger(start) || !Number.isInteger(end) || end < start || end - start > 30) throw new Error('趋势年份范围不合法');
  const years = Array.from({ length: end - start + 1 }, (_, i) => start + i);
  return { keyword, years, series: CONFERENCES.map(conference => ({ conference,
    points: years.map(year => {
      const held = conference === 'CVPR' || (conference === 'ICCV' ? year % 2 === 1 : year % 2 === 0);
      const scope = papers.filter(p => p.conference === conference && p.year === year);
      const count = scope.filter(p => p.keywords.includes(keyword)).length;
      return { year, total: scope.length, count: scope.length ? count : null,
        percent: scope.length ? count / scope.length * 100 : null,
        status: scope.length ? 'sampled' : held ? 'not-collected' : 'not-held' };
    }) })) };
}

export function toCsv(papers) {
  const cell = value => {
    let text = String(value ?? '');
    if (/^[\s]*[=+@\-\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  const rows = [['id', 'title', 'conference', 'year', 'keywords', 'abstract', 'paperUrl', 'sourceUrl', 'retrievedAt'],
    ...papers.map(p => [p.id, p.title, p.conference, p.year, p.keywords.join('; '), p.abstract, p.paperUrl, p.sourceUrl, p.retrievedAt])];
  return '\uFEFF' + rows.map(row => row.map(cell).join(',')).join('\r\n');
}
```
