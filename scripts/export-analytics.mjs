import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { summarize, trends } from '../src/analytics.mjs';
const papers = JSON.parse(readFileSync('data/papers.json', 'utf8'));
mkdirSync('docs/media', { recursive: true });
writeFileSync('docs/media/analytics.json', JSON.stringify({
  generatedAt: new Date().toISOString(), source: 'data/papers.json',
  summary: summarize(papers),
  diffusion: trends(papers, 'Diffusion models'),
  annual: [2022, 2023, 2024, 2025].map(year => ({ year, ...summarize(papers.filter(p => p.year === year)) })),
}, null, 2));
console.log('Exported actual application analytics to docs/media/analytics.json');
