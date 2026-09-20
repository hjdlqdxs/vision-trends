import { mkdirSync, writeFileSync } from 'node:fs';
import { createCrawler, EDITIONS } from '../src/crawler.mjs';

const count = Number(process.argv[2] || 24);
if (!Number.isInteger(count) || count < 1 || count > 200) throw new Error('Sample size must be 1—200 per edition');
const crawler = createCrawler();
const papers = [];
const editions = [];
const failures = [];
const startedAt = new Date().toISOString();
mkdirSync('data', { recursive: true });
for (const [conference, year] of EDITIONS) {
  try {
    const entries = await crawler.list(conference, year);
    const selected = Array.from({ length: Math.min(count, entries.length) }, (_, i) => entries[Math.floor(i * entries.length / Math.min(count, entries.length))]);
    let obtained = 0;
    for (const entry of selected) {
      try { papers.push(await crawler.detail(entry)); obtained++; }
      catch (error) { failures.push({ ...entry, error: error.message }); }
      console.log(`${conference} ${year}: ${obtained}/${selected.length} collected (${papers.length} total)`);
    }
    editions.push({ conference, year, listed: entries.length, requested: selected.length, collected: obtained });
  } catch (error) { failures.push({ conference, year, error: error.message }); }
  writeFileSync('data/papers.json', JSON.stringify(papers, null, 2) + '\n');
  writeFileSync('data/provenance.json', JSON.stringify({ startedAt, finishedAt: new Date().toISOString(),
    method: 'Deterministic evenly spaced samples from official index order; not a random or complete census.',
    keywords: 'controlled-vocabulary-v1 from title + official abstract; not author-provided keywords',
    editions, failures }, null, 2) + '\n');
}
console.log(`Saved ${papers.length} official records; ${failures.length} failures. See data/provenance.json.`);
