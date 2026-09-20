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
