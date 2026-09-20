// Optional genuine network test. Does not change the user's library.
import { openDatabase } from '../src/database.mjs';
import { createCrawler } from '../src/crawler.mjs';
import { createApp } from '../src/server.mjs';
import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const database = openDatabase(':memory:');
const { server } = createApp({ database, crawler: createCrawler(), token: '' });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const findings = [];
try {
  for (const path of ['/', '/app.js', '/charts.js', '/import.js', '/styles.css', '/api/health']) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 200);
    findings.push({ path, status: response.status, bytes: (await response.arrayBuffer()).byteLength });
  }
  const response = await fetch(origin + '/api/crawl', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ titles: ['Segment Anything'], conference: 'ICCV', year: 2023 }) });
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.results[0].ok, true, JSON.stringify(result));
  const paper = result.results[0].paper;
  assert.ok(paper.abstract.length > 100);
  assert.ok(paper.paperUrl.startsWith('https://openaccess.thecvf.com/'));
  findings.push({ operation: 'Actual online exact-title crawl through HTTP', title: paper.title,
    abstractCharacters: paper.abstract.length, keywords: paper.keywords, sourceUrl: paper.sourceUrl, paperUrl: paper.paperUrl });
  const search = await (await fetch(origin + '/api/papers?q=Segment%20Anything&exact=true')).json();
  assert.equal(search.total, 1);
  findings.push({ operation: 'Exact search after real crawl', total: search.total });
  writeFileSync('docs/live-smoke.json', JSON.stringify({ testedAt: new Date().toISOString(), passed: true, findings }, null, 2));
  console.log('Live smoke passed: all assets, actual official crawl, abstract/PDF and exact search.');
} finally { await new Promise(resolve => server.close(resolve)); database.close(); }
