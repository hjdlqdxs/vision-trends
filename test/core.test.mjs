import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase, validatePaper } from '../src/database.mjs';
import { extractKeywords } from '../src/keywords.mjs';
import { summarize, trends, toCsv } from '../src/analytics.mjs';
import { allowedUrl, parseList, parseDetail, createCrawler } from '../src/crawler.mjs';
import { parseTitles } from '../public/import.js';
import { createApp } from '../src/server.mjs';

const paper = (extra = {}) => ({ title: 'Diffusion Models for 3D Vision', conference: 'CVPR', year: 2024,
  abstract: 'A diffusion model for point clouds.', sourceUrl: 'https://openaccess.thecvf.com/paper.html',
  paperUrl: 'https://openaccess.thecvf.com/paper.pdf', ...extra });

test('extracts phrase variants once and respects word boundaries', () => {
  assert.deepEqual(extractKeywords('Diffusion diffusion models in 3D', '3D point clouds'), ['Diffusion models', '3D vision']);
  assert.equal(extractKeywords('Eclipse preclip and transformation').includes('Vision-language'), false);
  assert.ok(extractKeywords('Self-supervised vision-language learning').includes('Vision-language'));
});
test('rejects wrong conference, year parity and dangerous links', () => {
  for (const extra of [{ conference: 'NeurIPS' }, { conference: 'ECCV', year: 2023 }, { conference: 'ICCV', year: 2024 }, { year: 'nan' }, { paperUrl: 'javascript:alert(1)' }]) assert.throws(() => validatePaper(paper(extra)));
});
test('CRUD persists, deduplicates variants and retains manual edits on reimport', () => {
  const db = openDatabase(':memory:');
  try {
    const first = db.save(paper());
    assert.equal(first.created, true);
    assert.equal(db.save(paper({ title: 'diffusion models for 3d vision!' })).duplicate, true);
    db.save(paper({ abstract: 'Reviewed abstract', keywords: ['Human-reviewed'], keywordMethod: 'manual' }), first.paper.id);
    assert.equal(db.save(paper()).paper.abstract, 'Reviewed abstract');
    assert.equal(db.list({ keyword: 'Human-reviewed' }).length, 1);
    assert.equal(db.list({ q: String(first.paper.id) }).length, 1);
    assert.equal(db.list({ q: 'DIFFUSION MODELS FOR 3D VISION', exact: true }).length, 1);
    assert.equal(db.list({ q: 'diffusion', exact: true }).length, 0);
    assert.equal(db.list({ q: "' OR 1=1 --" }).length, 0);
    assert.equal(db.list({ q: '%' }).length, 0);
    assert.equal(db.remove(first.paper.id), 1);
    assert.equal(db.get(first.paper.id), null);
  } finally { db.close(); }
});
test('same title in different editions remains distinct', () => {
  const db = openDatabase(':memory:');
  try { db.save(paper()); db.save(paper({ year: 2025 })); assert.equal(db.list().length, 2); } finally { db.close(); }
});
test('SQLite persists across reopen', () => {
  const dir = mkdtempSync(join(tmpdir(), 'vision-db-'));
  try { let db = openDatabase(join(dir, 'test.sqlite')); db.save(paper()); db.close(); db = openDatabase(join(dir, 'test.sqlite')); assert.equal(db.list().length, 1); db.close(); }
  finally { rmSync(dir, { recursive: true, force: true }); }
});
test('ranking counts documents, co-occurrence is undirected', () => {
  const result = summarize([paper({ keywords: ['A', 'A', 'B'] }), paper({ keywords: ['B'] })]);
  assert.deepEqual(result.top10.map(t => [t.name, t.count, t.percent]), [['B', 2, 100], ['A', 1, 50]]);
  assert.deepEqual(result.graph.edges, [{ source: 'A', target: 'B', weight: 1 }]);
  assert.equal(summarize([]).total, 0);
});
test('trends distinguish zero hits, absent data and non-held conference years', () => {
  const result = trends([paper({ keywords: ['A'] })], 'B', 2023, 2024);
  assert.equal(result.series[0].points[0].count, null);
  assert.equal(result.series[0].points[1].count, 0);
  assert.equal(result.series[1].points[1].status, 'not-held');
  assert.equal(result.series[2].points[1].status, 'not-collected');
  assert.throws(() => trends([], 'A', 2025, 2022));
});
test('CSV round-trip handles commas, newlines, quotes and formula neutralization', () => {
  assert.deepEqual(parseTitles('title,year\n"A, B",2024\n"C ""D""",2023', 'papers.csv'), ['A, B', 'C "D"']);
  assert.deepEqual(parseTitles('\uFEFFAlpha\nAlpha\nBeta\n'), ['Alpha', 'Beta']);
  assert.throws(() => parseTitles('"Unclosed', 'x.csv'));
  assert.match(toCsv([paper({ id: 1, title: '=cmd()', keywords: [] })]), /'\=cmd/);
});
test('official parser supports quoted CVF and unquoted ECVA links', () => {
  const html = '<dt class="ptitle"><br><a href=papers/eccv_2024/papers_ECCV/html/1.php>A &amp; B</a></dt><dt class="ptitle"><a href="papers/eccv_2022/papers_ECCV/html/2.php">Old</a></dt>';
  const entries = parseList(html, 'https://www.ecva.net/papers.php', 'ECCV', 2024);
  assert.equal(entries.length, 1); assert.equal(entries[0].title, 'A & B');
});
test('detail parser extracts official abstract and PDF without fabricating missing text', () => {
  const entry = paper();
  const html = '<meta content="A &amp; B" name="citation_title"><meta name="citation_author" content="Author"><div id="abstract">A <i>real</i> abstract.</div><a href="/main.pdf">pdf</a>';
  const result = parseDetail(html, entry);
  assert.equal(result.title, 'A & B'); assert.equal(result.abstract, 'A real abstract.');
  assert.equal(result.paperUrl, 'https://openaccess.thecvf.com/main.pdf');
  assert.equal(parseDetail('<a href="/main.pdf">pdf</a>', entry).abstract, '');
  assert.throws(() => parseDetail('<html>Blocked</html>', entry));
});
test('crawler rejects arbitrary hosts, credentials, ports and non-HTTPS', () => {
  for (const url of ['http://openaccess.thecvf.com/', 'https://localhost/', 'https://openaccess.thecvf.com.evil.test/', 'https://user@openaccess.thecvf.com/', 'https://openaccess.thecvf.com:444/']) assert.throws(() => allowedUrl(url));
});
test('crawler reports anti-bot challenge rather than caching it as valid data', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'vision-cache-'));
  try {
    const crawler = createCrawler({ cacheDir: dir, delay: 0, fetcher: async () => new Response('<html>anubis_challenge</html>') });
    await assert.rejects(crawler.get('https://dblp.org/search/publ/api'), /人机验证/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

async function withServer(callback, token = 'test-admin-token-1234') {
  const database = openDatabase(':memory:');
  const crawler = { search: async (q, options) => ({ papers: q === 'missing' ? [] : [paper({ title: q })], warnings: [] }),
    list: async () => [paper()], detail: async p => p };
  const { server } = createApp({ database, crawler, token });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (path, method = 'GET', body, auth = token, extra = {}) => {
    const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth}`, ...extra }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: response.status, data: await response.json() };
  };
  try { await callback(call, database); } finally { await new Promise(resolve => server.close(resolve)); database.close(); }
}
test('API CRUD, duplicate edits and malformed input return expected statuses', async () => withServer(async call => {
  const added = await call('/api/papers', 'POST', paper());
  assert.equal(added.status, 201);
  const id = added.data.paper.id;
  assert.equal((await call('/api/papers/' + id)).data.title, paper().title);
  assert.equal((await call('/api/papers/' + id, 'PUT', { title: 'Updated paper title' })).status, 200);
  assert.equal((await call('/api/papers', 'POST', { title: 'x' })).status, 400);
  assert.equal((await call('/api/papers/' + id, 'DELETE')).status, 200);
  assert.equal((await call('/api/papers/' + id)).status, 404);
}));
test('cloud reads are public, writes need token and cross-site writes are rejected', async () => withServer(async call => {
  assert.equal((await call('/api/stats', 'GET', undefined, '')).status, 200);
  assert.equal((await call('/api/papers', 'POST', paper(), '')).status, 401);
  assert.equal((await call('/api/papers', 'POST', paper(), 'test-admin-token-1234', { Origin: 'https://evil.test' })).status, 403);
}));
test('online fallback imports results and batch continues after missing title', async () => withServer(async call => {
  assert.equal((await call('/api/search-online', 'POST', { q: 'New valid paper' })).data.papers.length, 1);
  const result = await call('/api/crawl', 'POST', { titles: ['missing', 'Another valid paper'] });
  assert.equal(result.data.results[0].ok, false);
  assert.equal(result.data.results[1].ok, true);
  assert.equal((await call('/api/papers')).data.total, 2);
}));
test('clearing edited keywords regenerates labels from updated title and abstract', async () => withServer(async call => {
  const { data } = await call('/api/papers', 'POST', paper({ keywords: ['Custom'], keywordMethod: 'manual' }));
  const updated = await call(`/api/papers/${data.paper.id}`, 'PUT', { title: 'Diffusion Models for 3D Vision', keywordMethod: 'controlled-vocabulary-v1' });
  assert.ok(updated.data.paper.keywords.includes('Diffusion models'));
  assert.equal(updated.data.paper.keywords.includes('Custom'), false);
}));
