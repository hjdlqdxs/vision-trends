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
