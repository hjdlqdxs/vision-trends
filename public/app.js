import { escapeHtml as esc, graphSvg, rankRows, lineSvg, COLORS } from './charts.js';
import { mountImport } from './import.js';

const app = document.querySelector('#app');
const modal = document.querySelector('#modal');
let routeVersion = 0;
let timer = null;
let toastTimer;
export async function api(path, options = {}) {
  const response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json',
    ...(sessionStorage.getItem('adminToken') ? { Authorization: `Bearer ${sessionStorage.getItem('adminToken')}` } : {}), ...options.headers } });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
  return result;
}
export function toast(message) {
  const box = document.querySelector('#toast');
  box.textContent = message; box.classList.add('visible');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => box.classList.remove('visible'), 5500);
}
export function busy(button, text = '处理中…') {
  const original = button.textContent; button.disabled = true; button.textContent = text;
  return () => { button.disabled = false; button.textContent = original; };
}
const badge = p => `<span class="pill ${p.conference.toLowerCase()}">${esc(p.conference)} ${p.year}</span>`;
const tags = p => p.keywords.slice(0, 3).map(k => `<button class="tag-button" data-keyword="${esc(k)}">${esc(k)}</button>`).join('');
const heading = (en, title, subtitle, actions = '') => `<div class="page-heading"><div><div class="eyebrow">${en}</div><h1>${title}</h1><p>${subtitle}</p></div><div class="heading-actions">${actions}</div></div>`;
const conferenceOptions = selected => `<option value="">全部会议</option>${['CVPR', 'ICCV', 'ECCV'].map(c => `<option ${c === selected ? 'selected' : ''}>${c}</option>`).join('')}`;
const yearOptions = selected => `<option value="">全部年份</option>${[2022, 2023, 2024, 2025, 2026].map(y => `<option ${String(y) === String(selected) ? 'selected' : ''}>${y}</option>`).join('')}`;
const filterControls = params => `<div class="filters"><select id="filter-conference" aria-label="会议">${conferenceOptions(params.get('conference'))}</select><select id="filter-year" aria-label="年份">${yearOptions(params.get('year'))}</select></div>`;
function bindFilters(params, page) {
  for (const field of ['conference', 'year']) document.querySelector(`#filter-${field}`)?.addEventListener('change', event => {
    const p = new URLSearchParams(params); p.delete('page'); p.set(field, event.target.value); location.hash = `#/${page}?${p}`;
  });
}
function bindKeywords(params = new URLSearchParams()) {
  app.querySelectorAll('[data-keyword]').forEach(element => {
    const navigate = () => { const p = new URLSearchParams(); for (const k of ['conference', 'year']) if (params.get(k)) p.set(k, params.get(k)); p.set('keyword', element.dataset.keyword); location.hash = `#/papers?${p}`; };
    element.addEventListener('click', navigate);
    element.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(); } });
  });
}
function paperTable(papers, manage = false) {
  return `<div class="table-scroll"><table><thead><tr><th>论文标题 / PAPER</th><th>会议</th><th>研究方向</th><th>${manage ? '操作' : '阅读'}</th></tr></thead><tbody>${papers.map(p => `<tr><td><a class="paper-title" href="#/paper/${p.id}">${esc(p.title)}</a><div class="paper-sub">#${p.id} · ${esc(p.authors.slice(0, 85))}${p.authors.length > 85 ? '…' : ''}</div></td><td>${badge(p)}</td><td>${tags(p) || '<span class="paper-sub">待补充关键词</span>'}</td><td class="actions">${manage ? `<button data-edit="${p.id}">编辑</button><button class="danger" data-delete="${p.id}">删除</button>` : `<a href="#/paper/${p.id}" class="subtle-link">详情 ↗</a>`}</td></tr>`).join('')}</tbody></table></div>`;
}
function showModal(content) {
  document.querySelector('#modal-content').innerHTML = content;
  modal.showModal();
  modal.querySelectorAll('[data-close]').forEach(b => b.onclick = () => modal.close());
}
async function editPaper(id) {
  try {
    const p = id ? await api(`/api/papers/${id}`) : { title: '', conference: 'CVPR', year: 2025, abstract: '', authors: '', keywords: [], paperUrl: '', sourceUrl: '' };
    showModal(`<div class="modal-heading"><h2>${id ? '编辑论文' : '新增论文'}</h2><button data-close aria-label="关闭">×</button></div><form id="paper-form"><div class="field"><label for="edit-title">论文标题 *</label><input id="edit-title" name="title" required minlength="3" maxlength="600" value="${esc(p.title)}"></div><div class="two-fields"><div class="field"><label for="edit-conference">会议 *</label><select id="edit-conference" name="conference">${['CVPR', 'ICCV', 'ECCV'].map(c => `<option ${c === p.conference ? 'selected' : ''}>${c}</option>`).join('')}</select></div><div class="field"><label for="edit-year">年份 *</label><input id="edit-year" name="year" type="number" min="2000" max="2027" value="${p.year}" required></div></div><div class="field"><label for="edit-authors">作者</label><input id="edit-authors" name="authors" value="${esc(p.authors)}"></div><div class="field"><label for="edit-abstract">摘要</label><textarea id="edit-abstract" name="abstract" rows="5">${esc(p.abstract)}</textarea></div><div class="field"><label for="edit-keywords">关键词（英文逗号分隔，留空自动提取）</label><input id="edit-keywords" name="keywords" value="${esc(p.keywords.join(', '))}"></div><div class="field"><label for="edit-url">原文 HTTPS 链接</label><input id="edit-url" name="paperUrl" type="url" value="${esc(p.paperUrl)}"></div><div class="field"><label for="edit-source">来源 HTTPS 链接</label><input id="edit-source" name="sourceUrl" type="url" value="${esc(p.sourceUrl)}"></div><div class="modal-actions"><button type="button" data-close>取消</button><button class="primary" type="submit">保存论文</button></div></form>`);
    document.querySelector('#paper-form').onsubmit = async event => {
      event.preventDefault(); const done = busy(event.submitter);
      try {
        const body = Object.fromEntries(new FormData(event.target));
        body.year = Number(body.year);
        if (body.keywords.trim()) { body.keywords = body.keywords.split(',').map(k => k.trim()); body.keywordMethod = 'manual'; }
        else { delete body.keywords; body.keywordMethod = 'controlled-vocabulary-v1'; }
        const result = await api(id ? `/api/papers/${id}` : '/api/papers', { method: id ? 'PUT' : 'POST', body: JSON.stringify(body) });
        modal.close(); toast(result.duplicate ? '该论文已存在，未重复新增' : '论文已保存'); await render();
      } catch (error) { toast(error.message); } finally { done(); }
    };
  } catch (error) { toast(error.message); }
}
function bindManage() {
  app.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => editPaper(Number(b.dataset.edit)));
  app.querySelectorAll('[data-delete]').forEach(b => b.onclick = () => {
    showModal(`<div class="modal-heading"><h2>删除这篇论文？</h2><button data-close aria-label="关闭">×</button></div><p class="prose">论文 #${b.dataset.delete} 将从本地资料库移除，相关统计会重新计算。</p><div class="modal-actions"><button data-close>保留论文</button><button id="confirm-delete" class="danger">确认删除</button></div>`);
    document.querySelector('#confirm-delete').onclick = async () => {
      try { await api(`/api/papers/${b.dataset.delete}`, { method: 'DELETE' }); modal.close(); toast('论文已删除'); await render(); }
      catch (error) { toast(error.message); }
    };
  });
}

async function overview(params, version) {
  const [stats, recent] = await Promise.all([api(`/api/stats?${params}`), api(`/api/papers?${params}&pageSize=4`)]);
  if (version !== routeVersion) return;
  app.innerHTML = heading('THE BIG PICTURE', '发现视觉研究的下一站', '连接论文与灵感，让研究方向有迹可循。', filterControls(params)) +
    `<section class="hero"><div><div class="eyebrow">EXPLORE · CONNECT · UNDERSTAND</div><h2>从海量论文中，<br>看见<em>值得探索的方向。</em></h2><p>汇集 CVPR、ICCV、ECCV 公开论文，用可解释的关键词统计，描绘计算机视觉研究图景。</p></div><svg class="hero-art" viewBox="0 0 280 155" aria-hidden="true"><g fill="none" stroke="#6e8c70" stroke-width="1"><ellipse cx="146" cy="77" rx="95" ry="49" transform="rotate(-24 146 77)"/><ellipse cx="146" cy="77" rx="95" ry="49" transform="rotate(34 146 77)"/><ellipse cx="146" cy="77" rx="95" ry="49" transform="rotate(90 146 77)"/><circle cx="146" cy="77" r="29"/></g><circle cx="146" cy="77" r="16" fill="#dceaa8"/><circle cx="62" cy="108" r="6" fill="#b5c795"/><circle cx="229" cy="46" r="5" fill="#d9ad85"/><circle cx="176" cy="139" r="4" fill="#9ab8a8"/><path d="M141 77h10M146 72v10" stroke="#496648"/></svg></section>` +
    `<div class="metrics"><div class="metric"><div class="metric-label">已收录论文 <span>▤</span></div><strong>${stats.total}<i>篇</i></strong><small>官方公开页面 · 本地样本</small></div><div class="metric"><div class="metric-label">研究方向 <span>◈</span></div><strong>${stats.topics.length}<i>个</i></strong><small>受控短语词典 · 自动提取</small></div><div class="metric"><div class="metric-label">覆盖会议 <span>◫</span></div><strong>${stats.conferences.filter(c => c.count).length}<i>/ 3</i></strong><small>CVPR · ICCV · ECCV</small></div><div class="metric"><div class="metric-label">时间跨度 <span>◷</span></div><strong>${stats.years.length}<i>年</i></strong><small>${stats.years.length ? `${stats.years[0]} — ${stats.years.at(-1)}` : '暂无数据'} · 持续探索</small></div></div>` +
    `<div class="grid-2"><section class="panel"><div class="panel-title"><div><h2>热门研究方向 <span class="tiny-label">TOP 10</span></h2><p>按关键词命中论文数排序</p></div><a href="#/trends">查看走势 ↗</a></div>${rankRows(stats.top10)}<div class="note">点击研究方向，探索相关论文。每篇每词计一次。</div></section><section class="panel"><div class="panel-title"><div><h2>关键词共现图谱</h2><p>发现研究方向之间的连接</p></div><span class="tiny-label">${stats.graph.nodes.length} NODES</span></div>${graphSvg(stats.graph)}<p class="graph-help">节点大小 = 论文数 · 连线 = 同篇共现 · 点击节点查看论文</p></section></div>` +
    `<section class="panel recent"><div class="panel-title"><div><h2>论文速览</h2><p>从一个方向出发，找到下一篇阅读</p></div><a href="#/papers">全部论文 →</a></div>${paperTable(recent.papers)}</section><div class="note">统计范围为已采集样本，不代表会议完整收录。${stats.abstractCount}/${stats.total} 篇包含摘要；${stats.keywordCoverage}/${stats.total} 篇命中词典。<a href="#/about">了解口径 ↗</a></div>`;
  bindFilters(params, 'overview'); bindKeywords(params);
}

async function papers(params, version) {
  const result = await api(`/api/papers?${params}`);
  if (version !== routeVersion) return;
  app.innerHTML = heading('YOUR RESEARCH LIBRARY', '论文资料库', '将感兴趣的研究，整理成自己的知识地图。', '<button id="add-paper" class="primary">＋ 新增论文</button><a class="subtle-link" href="#/import">采集论文 ↗</a>') +
    `<form id="search-form" class="toolbar"><input type="search" name="q" placeholder="搜索论文标题、编号、关键词或摘要…" aria-label="搜索论文" value="${esc(params.get('q') || '')}"><select name="conference" aria-label="筛选会议">${conferenceOptions(params.get('conference'))}</select><select name="year" aria-label="筛选年份">${yearOptions(params.get('year'))}</select><label><input type="checkbox" name="exact" ${params.get('exact') === 'true' ? 'checked' : ''}> 精确标题</label><button type="submit" class="primary">搜索</button></form>` +
    `<div class="list-meta"><span>共 ${result.total} 篇论文 ${params.get('keyword') ? `· 方向：<span class="pill">${esc(params.get('keyword'))}</span> <a href="#/papers">清除 ×</a>` : ''}</span><a href="/api/export?${params}" download>↓ 导出 CSV</a></div>` +
    (result.total ? `<section class="panel">${paperTable(result.papers, true)}</section><div class="pagination"><button id="prev-page" ${result.page <= 1 ? 'disabled' : ''}>← 上一页</button><span>${result.page} / ${Math.ceil(result.total / result.pageSize)}</span><button id="next-page" ${result.page * result.pageSize >= result.total ? 'disabled' : ''}>下一页 →</button></div>` : `<section class="panel empty"><strong>还没有找到这篇论文</strong><p>本地资料库暂无匹配结果，可到官方会议目录继续查找。</p>${params.get('q') ? '<button id="online-search" class="primary">联网查找并入库</button><div id="online-status" class="prose spaced"></div>' : '<a href="#/import" class="subtle-link">前往采集工作台 →</a>'}</section>`) +
    '<div class="note">本地搜索支持标题、编号、摘要和关键词；未命中时自动尝试联网。精确标题查询只匹配完整标题。线上写入需管理员口令。</div>';
  document.querySelector('#add-paper').onclick = () => editPaper();
  document.querySelector('#search-form').onsubmit = event => {
    event.preventDefault(); const p = new URLSearchParams(new FormData(event.target));
    if (p.has('exact')) p.set('exact', 'true'); location.hash = `#/papers?${p}`;
  };
  for (const [id, delta] of [['prev-page', -1], ['next-page', 1]]) document.querySelector(`#${id}`)?.addEventListener('click', () => { const p = new URLSearchParams(params); p.set('page', result.page + delta); location.hash = `#/papers?${p}`; });
  const online = document.querySelector('#online-search');
  if (online) {
    online.onclick = async () => {
      const done = busy(online, '正在检索官方目录…');
      const status = document.querySelector('#online-status'); status.textContent = '首次检索需要获取会议索引，可能需要一两分钟。';
      try {
        const found = await api('/api/search-online', { method: 'POST', body: JSON.stringify({ q: params.get('q'), conference: params.get('conference'), year: params.get('year'), exact: params.get('exact') === 'true' }) });
        if (version !== routeVersion) return;
        if (found.papers.length) { toast(`已找到 ${found.papers.length} 篇论文`); await render(); }
        else status.textContent = '官方来源暂无可入库结果。' + found.warnings.join('；');
      } catch (error) { if (version === routeVersion) status.textContent = error.message; } finally { done(); }
    };
    if ((params.get('q') || '').trim().length >= 3) online.click();
  }
  bindKeywords(params); bindManage();
}

async function detail(id, version) {
  const p = await api(`/api/papers/${id}`);
  if (version !== routeVersion) return;
  app.innerHTML = `<a href="#/papers" class="subtle-link">← 返回论文资料库</a><div class="spaced">${badge(p)} <span class="tiny-label">PAPER #${p.id}</span></div><h1 class="detail-title">${esc(p.title)}</h1><div class="detail-meta">${esc(p.authors || '来源页未提供作者信息')}</div><div>${tags({ ...p, keywords: p.keywords })}</div><div class="detail-layout"><section class="panel"><div class="panel-title"><h2>Abstract · 论文摘要</h2><span class="tiny-label">OFFICIAL SOURCE</span></div><p class="abstract">${esc(p.abstract || '官方页面未提供可解析摘要，请查看原文。')}</p></section><aside class="panel"><div class="panel-title"><h2>阅读与溯源</h2></div>${p.paperUrl ? `<a href="${esc(p.paperUrl)}" target="_blank" rel="noopener noreferrer" class="pill">打开原文 PDF ↗</a>` : '<p class="prose">暂无原文链接</p>'}<div class="detail-fact"><span>论文来源</span>${p.sourceUrl ? `<a href="${esc(p.sourceUrl)}" target="_blank" rel="noopener noreferrer">官方详情页 ↗</a>` : '手动录入，未填写来源'}</div><div class="detail-fact"><span>采集时间</span>${esc(p.retrievedAt)}</div><div class="detail-fact"><span>关键词生成方式</span>${p.keywordMethod === 'manual' ? '人工编辑' : '受控领域词典 v1'}</div><div class="detail-fact"><span>最后更新</span>${esc(p.updatedAt)}</div><button class="spaced" data-edit="${p.id}">编辑论文信息</button></aside></div><div class="note">关键词为系统提取或人工编辑的研究标签，不等同于论文作者提供的关键词。摘要版权归原作者所有。</div>`;
  bindKeywords(); bindManage();
}

async function trendPage(params, version) {
  const stats = await api('/api/stats');
  const keyword = params.get('keyword') || stats.top10[0]?.name || 'Diffusion models';
  const data = await api(`/api/trends?keyword=${encodeURIComponent(keyword)}`);
  if (version !== routeVersion) return;
  app.innerHTML = heading('RESEARCH IN MOTION', '让研究趋势，动起来', '在时间的坐标中，比较三大顶会的研究关注点。') +
    `<div class="toolbar"><label for="trend-keyword">研究方向</label><select id="trend-keyword">${stats.topics.map(t => `<option ${t.name === keyword ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select><label for="trend-metric">统计指标</label><select id="trend-metric"><option value="percent">样本占比（%）</option><option value="count">论文数量（篇）</option></select><span class="paper-sub">2022 — 2025 · 三会对比</span></div><section class="panel"><div class="panel-title"><div><h2>${esc(keyword)}</h2><p>各会议当年样本中的关键词覆盖率</p></div><div class="legend">${['CVPR', 'ICCV', 'ECCV'].map((c, i) => `<span><i style="background:${COLORS[i]}"></i>${c}</span>`).join('')}</div></div><div id="trend-chart"></div><div class="chart-controls"><button id="play" class="primary">▶ 播放趋势</button><label for="year-slider" class="paper-sub">截至年份</label><input id="year-slider" type="range" min="0" max="${data.years.length - 1}" value="${data.years.length - 1}" step="1"><strong id="current-year">${data.years.at(-1)}</strong></div></section><div class="note">ICCV 在奇数年举办，ECCV 在偶数年举办。虚线仅连接已观测届次；未举办或未采集年份不作零值，不进行插值。占比基于样本，不代表整个会议。</div><section class="panel spaced"><div class="panel-title"><h2>读懂每一个数据点</h2><span class="tiny-label">COUNT / SAMPLE SIZE</span></div><div class="table-scroll"><table><thead><tr><th>会议</th>${data.years.map(y => `<th>${y}</th>`).join('')}</tr></thead><tbody>${data.series.map(s => `<tr><td>${s.conference}</td>${s.points.map(p => `<td>${p.count === null ? `<span class="paper-sub">${p.status === 'not-held' ? '未举办' : '未采集'}</span>` : `${p.count} / ${p.total} <span class="paper-sub">(${p.percent.toFixed(1)}%)</span>`}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>`;
  const slider = document.querySelector('#year-slider');
  const play = document.querySelector('#play');
  const draw = () => { document.querySelector('#trend-chart').innerHTML = lineSvg(data, document.querySelector('#trend-metric').value, data.years[Number(slider.value)]); document.querySelector('#current-year').textContent = data.years[Number(slider.value)]; };
  slider.oninput = draw; document.querySelector('#trend-metric').onchange = draw;
  document.querySelector('#trend-keyword').onchange = e => { location.hash = `#/trends?keyword=${encodeURIComponent(e.target.value)}`; };
  play.onclick = () => {
    if (timer) { clearInterval(timer); timer = null; play.textContent = '▶ 播放趋势'; return; }
    slider.value = 0; draw(); play.textContent = 'Ⅱ 暂停';
    timer = setInterval(() => { slider.value = (Number(slider.value) + 1) % data.years.length; draw(); }, 1300);
  };
  draw();
}

async function evolution(params, version) {
  const years = [2022, 2023, 2024, 2025];
  const stats = await Promise.all(years.map(y => api(`/api/stats?year=${y}&conference=${params.get('conference') || ''}`)));
  if (version !== routeVersion) return;
  let index = Math.max(0, years.indexOf(Number(params.get('year') || 2022)));
  app.innerHTML = heading('THE YEAR IN KEYWORDS', '每一年，都有新的焦点', '用动态榜单回看研究方向的年度变化。', `<select id="evolution-conference" aria-label="会议">${conferenceOptions(params.get('conference'))}</select>`) + `<section class="panel"><div class="panel-title"><div><h2>年度热门方向 Top 10</h2><p id="evolution-meta"></p></div><strong id="evolution-year" class="year-number"></strong></div><div id="evolution-bars"></div><div class="chart-controls"><button id="evolution-play" class="primary">▶ 播放演变</button><input id="evolution-slider" type="range" min="0" max="3" value="${index}" aria-label="年度"><span class="paper-sub">2022 — 2025</span></div></section><div class="note">每年榜单由该年份已采集样本重新计算；排名变化可能受到样本规模与词典覆盖的影响，不宜直接推断学科整体兴衰。</div>`;
  const slider = document.querySelector('#evolution-slider'); const play = document.querySelector('#evolution-play');
  const draw = () => { index = Number(slider.value); document.querySelector('#evolution-year').textContent = years[index]; document.querySelector('#evolution-meta').textContent = `${stats[index].total} 篇样本 · 每篇每词计一次`; document.querySelector('#evolution-bars').innerHTML = rankRows(stats[index].top10, true); const p = new URLSearchParams(params); p.set('year', years[index]); bindKeywords(p); };
  slider.oninput = draw;
  document.querySelector('#evolution-conference').onchange = e => { location.hash = `#/evolution?conference=${e.target.value}`; };
  play.onclick = () => { if (timer) { clearInterval(timer); timer = null; play.textContent = '▶ 播放演变'; } else { play.textContent = 'Ⅱ 暂停'; timer = setInterval(() => { slider.value = (Number(slider.value) + 1) % 4; draw(); }, 1500); } };
  draw();
}

async function about(version) {
  const provenance = await api('/api/provenance');
  if (version !== routeVersion) return;
  app.innerHTML = heading('BEHIND THE NUMBERS', '理解会议，也理解数据', '让每一个数字，都有来处、有边界。') + `<div class="edition-cards">${[
    ['CVPR', 'IEEE / CVF', '计算机视觉与模式识别会议', '每年举办。覆盖视觉识别、生成、三维感知等研究。', 'https://cvpr.thecvf.com/'],
    ['ICCV', 'IEEE / CVF', '国际计算机视觉大会', '奇数年举办。聚焦计算机视觉理论、方法与应用。', 'https://iccv.thecvf.com/'],
    ['ECCV', 'ECVA', '欧洲计算机视觉会议', '偶数年举办。与 CVPR、ICCV 共同构成视觉领域重要交流平台。', 'https://www.ecva.net/']
  ].map(([name, org, title, text, url]) => `<section class="edition-card"><div class="eyebrow">${org}</div><h2>${name}</h2><strong style="font-size:12px;font-weight:500">${title}</strong><p>${text}</p><a href="${url}" target="_blank" rel="noopener noreferrer" class="subtle-link">访问官网 ↗</a></section>`).join('')}</div><div class="grid-2"><section class="panel prose"><h3>01 / 数据从哪里来</h3><p>内置论文来自 CVF Open Access 和 ECVA 官方公开页面。按官方列表顺序等间距抽样，每个届次目标24篇；抽样不是随机样本，不能代表完整会议。DBLP 仅用于备用标题定位。</p><p>摘要来自官方详情页，原文链接指向官方 PDF。记录保留采集日期、来源、作者和摘要缺失状态。未收录不等于不存在。</p><h3>02 / 热度如何计算</h3><p>使用受控领域短语词典，从标题与摘要提取研究方向；合并常见英文变体，按词边界匹配。关键词不是作者声明关键词。每篇论文对同一关键词只贡献1次。</p><p><strong>热度占比 = 命中该词的论文数 ÷ 同会议同年份已采集论文数 × 100%</strong></p><p>Top 10 按论文命中数排序；图谱边权为两词同篇共现数。未举办或未采集年份显示缺失值。</p></section><section class="panel prose"><h3>03 / 这些数字不能告诉你什么</h3><p>它不能衡量论文质量、引用影响力或研究价值。词典会遗漏新术语，也可能把多义词误归类。不同会议采集量、列表排序和时间范围都会影响趋势。</p><h3>04 / 可复现与可编辑</h3><p>可以在论文库手动修改标签，并立即重新计算图表。CSV 导出保留原始来源；重新采集不会覆盖已有人工编辑。抓取请求顺序执行、缓存24小时、设置超时，失败会逐条返回。</p><h3>05 / 关于这个项目</h3><p>软件工程实践 · 与 AI 结对编程。Node.js + SQLite + 原生 Web。AI 参与需求草稿、实现与测试；人工理解、审阅和反思需要学生本人完成。</p></section></div><section class="panel spaced"><div class="panel-title"><h2>采集范围与来源记录</h2><span class="tiny-label">SOURCE AUDIT</span></div><table><thead><tr><th>会议届次</th><th>官方目录条目</th><th>目标样本</th><th>成功采集</th></tr></thead><tbody>${provenance.editions.map(e => `<tr><td>${e.conference} ${e.year}</td><td>${e.listed}</td><td>${e.requested}</td><td>${e.collected}</td></tr>`).join('')}</tbody></table><p class="paper-sub">采集时间：${esc(provenance.startedAt || '暂无')} — ${esc(provenance.finishedAt || '暂无')}；失败 ${provenance.failures.length} 条，详见仓库 data/provenance.json。</p></section>`;
}

async function render() {
  const version = ++routeVersion;
  if (timer) { clearInterval(timer); timer = null; }
  const [path, query = ''] = (location.hash.slice(1) || '/overview').split('?');
  const page = path.split('/')[1]; const params = new URLSearchParams(query);
  const titles = { overview: '研究总览', papers: '论文资料库', import: '采集工作台', trends: '热度走势', evolution: '年度演变', about: '关于与数据', paper: '论文详情' };
  document.querySelector('#breadcrumb').textContent = titles[page] || '研究总览';
  document.querySelectorAll('nav a').forEach(a => { a.classList.toggle('active', a.dataset.page === (page === 'paper' ? 'papers' : page)); if (a.classList.contains('active')) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  app.innerHTML = '<div class="loading">正在读取研究数据…</div>';
  try {
    if (page === 'papers') await papers(params, version);
    else if (page === 'paper') await detail(path.split('/')[2], version);
    else if (page === 'import') mountImport(app, { api, toast, busy, heading, esc });
    else if (page === 'trends') await trendPage(params, version);
    else if (page === 'evolution') await evolution(params, version);
    else if (page === 'about') await about(version);
    else await overview(params, version);
  } catch (error) { if (version === routeVersion) app.innerHTML = `<section class="panel empty"><strong>暂时无法载入</strong><p>${esc(error.message)}</p><button id="retry">重试</button></section>`; document.querySelector('#retry')?.addEventListener('click', render); }
}
document.querySelector('#auth-button').onclick = () => {
  showModal('<div class="modal-heading"><h2>管理权限</h2><button data-close aria-label="关闭">×</button></div><p class="prose">本机默认可以编辑。云端部署填写管理员口令，仅在当前标签页会话保存。</p><form id="auth-form"><div class="field"><label for="admin-token">管理员口令</label><input type="password" id="admin-token" autocomplete="off"></div><div class="modal-actions"><button id="clear-token" type="button">清除口令</button><button class="primary">保存</button></div></form>');
  document.querySelector('#auth-form').onsubmit = e => { e.preventDefault(); sessionStorage.setItem('adminToken', document.querySelector('#admin-token').value); modal.close(); toast('口令已保存在当前会话'); };
  document.querySelector('#clear-token').onclick = () => { sessionStorage.removeItem('adminToken'); modal.close(); toast('口令已清除'); };
};
window.addEventListener('hashchange', render);
render();
