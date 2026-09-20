export const COLORS = ['#315f48', '#9581b5', '#d29770'];
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function graphSvg(graph) {
  const positions = graph.nodes.map((n, i) => {
    const angle = i * 2.39996 - 1.1;
    const radius = i === 0 ? 0 : 40 + Math.sqrt(i) * 26;
    return { ...n, x: 270 + Math.cos(angle) * radius * 1.45, y: 171 + Math.sin(angle) * radius,
      r: 19 + Math.sqrt(n.count / (graph.nodes[0]?.count || 1)) * 20 };
  });
  const lookup = new Map(positions.map(p => [p.name, p]));
  return `<svg class="graph" viewBox="0 0 540 350" role="img" aria-label="关键词共现图谱，点击节点查看论文">
    ${graph.edges.map(e => { const a = lookup.get(e.source); const b = lookup.get(e.target); return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#cedbbc" opacity="${Math.min(.7, .15 + e.weight / 20)}" stroke-width="${Math.min(4, .5 + e.weight / 5)}"/>`; }).join('')}
    ${positions.map((n, i) => `<g class="graph-node" data-keyword="${escapeHtml(n.name)}" role="button" tabindex="0" aria-label="${escapeHtml(n.name)}，${n.count}篇"><title>${escapeHtml(n.name)} · ${n.count} 篇</title><circle cx="${n.x}" cy="${n.y}" r="${n.r}" fill="${i === 0 ? '#456b42' : ['#d6e4ba', '#e3e8cc', '#eddfcd', '#e3e3ed'][i % 4]}" stroke="#fff" stroke-width="2"/><text x="${n.x}" y="${n.y + n.r + 13}" text-anchor="middle">${escapeHtml(n.name)}</text><text x="${n.x}" y="${n.y + 4}" text-anchor="middle" style="font-size:13px;fill:${i === 0 ? '#fff' : '#71845a'}">${n.count}</text></g>`).join('')}
  </svg>`;
}

export function lineSvg(data, metric = 'percent', until = Infinity) {
  const width = 920, height = 340, left = 55, right = 30, top = 28, bottom = 50;
  const all = data.series.flatMap(s => s.points.map(p => p[metric]).filter(v => v !== null));
  const max = Math.max(5, Math.ceil(Math.max(0, ...all) / 5) * 5);
  const x = i => left + i / Math.max(1, data.years.length - 1) * (width - left - right);
  const y = v => height - bottom - v / max * (height - top - bottom);
  let svg = `<svg class="chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="三大会议关键词${metric === 'percent' ? '占比' : '论文数'}走势">`;
  for (let i = 0; i <= 4; i++) {
    const v = max * i / 4;
    svg += `<line x1="${left}" y1="${y(v)}" x2="${width - right}" y2="${y(v)}" stroke="#e9eee0" stroke-dasharray="3 5"/><text x="${left - 13}" y="${y(v) + 4}" text-anchor="end">${Number(v.toFixed(1))}${metric === 'percent' ? '%' : ''}</text>`;
  }
  data.years.forEach((year, i) => { svg += `<text x="${x(i)}" y="${height - 16}" text-anchor="middle">${year}</text>`; });
  data.series.forEach((series, index) => {
    const valid = series.points.map((p, i) => ({ ...p, i })).filter(p => p[metric] !== null && p.year <= until);
    if (valid.length > 1) svg += `<polyline points="${valid.map(p => `${x(p.i)},${y(p[metric])}`).join(' ')}" fill="none" stroke="${COLORS[index]}" stroke-width="2.8" stroke-linejoin="round" ${series.conference === 'CVPR' ? '' : 'stroke-dasharray="6 5"'}/>`;
    for (const p of valid) svg += `<circle cx="${x(p.i)}" cy="${y(p[metric])}" r="5" fill="white" stroke="${COLORS[index]}" stroke-width="2.5"><title>${series.conference} ${p.year}: ${p.count}/${p.total}篇 (${p.percent.toFixed(1)}%)</title></circle><text x="${x(p.i)}" y="${y(p[metric]) - 13}" text-anchor="middle" style="fill:${COLORS[index]};font-size:10px">${metric === 'percent' ? p.percent.toFixed(1) + '%' : p.count}</text>`;
  });
  return svg + '</svg>';
}

export function rankRows(topics, evolution = false) {
  if (!topics.length) return '<div class="empty">该范围尚无关键词样本</div>';
  const max = topics[0].count;
  return topics.map((t, i) => `<div class="${evolution ? 'evolution-row' : 'rank-row'}" role="button" tabindex="0" data-keyword="${escapeHtml(t.name)}" aria-label="查看${escapeHtml(t.name)}相关论文"><span class="rank-number">${String(i + 1).padStart(2, '0')}</span><span class="rank-name">${escapeHtml(t.name)}</span><div class="bar-track"><div class="bar-fill" style="width:${t.count / max * 100}%"></div></div><span class="rank-count">${t.count}</span></div>`).join('');
}
