export function parseTitles(text, filename = '') {
  text = text.replace(/^\uFEFF/, '');
  if (!filename.toLowerCase().endsWith('.csv')) return [...new Set(text.split(/\r?\n/).map(x => x.trim()).filter(Boolean))];
  const rows = []; let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (c === ',' && !quoted) { row.push(cell); cell = ''; }
    else if (c === '\n' && !quoted) { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (quoted) throw new Error('CSV 引号未闭合');
  if (cell || row.length) { row.push(cell.replace(/\r$/, '')); rows.push(row); }
  const index = rows[0]?.findIndex(x => ['title', '标题', '论文标题'].includes(x.trim().toLowerCase())) ?? -1;
  return [...new Set((index >= 0 ? rows.slice(1) : rows).map(r => (r[index >= 0 ? index : 0] || '').trim()).filter(Boolean))];
}

export function mountImport(app, { api, toast, busy, heading, esc }) {
  let mode = 'single';
  app.innerHTML = heading('BUILD YOUR KNOWLEDGE BASE', '把下一篇好论文，收入视野', '从一个标题开始，自动补全摘要、研究方向和原文链接。') +
    `<div class="grid-2"><section class="panel"><div class="tabs" role="tablist" aria-label="采集方式"><button class="active" data-mode="single" role="tab" aria-selected="true">单篇采集</button><button data-mode="batch" role="tab" aria-selected="false">批量导入</button><button data-mode="edition" role="tab" aria-selected="false">会议目录</button></div><form id="crawl-form"><div id="title-fields"></div><div class="two-fields"><div class="field"><label for="crawl-conference">限定会议</label><select id="crawl-conference"><option value="">全部会议</option><option>CVPR</option><option>ICCV</option><option>ECCV</option></select></div><div class="field"><label for="crawl-year">限定年份</label><select id="crawl-year"><option value="">全部年份</option><option>2022</option><option>2023</option><option>2024</option><option>2025</option></select></div></div><button type="submit" class="primary" id="crawl-submit">↧ 开始采集</button><p class="paper-sub">使用官方公开目录 · 同篇自动去重 · 每批最多30篇</p></form><div id="crawl-results" class="spaced" aria-live="polite"></div></section><aside class="panel"><div class="panel-title"><h2>从标题到知识，只需三步</h2><span class="tiny-label">HOW IT WORKS</span></div><div class="step"><b>1</b><div><h3>输入你想读的论文</h3><p>粘贴完整英文标题，或上传 TXT / CSV 标题清单。</p></div></div><div class="step"><b>2</b><div><h3>连接官方公开资料</h3><p>优先检索 CVF、ECVA 目录，定位官方摘要和原文链接。</p></div></div><div class="step"><b>3</b><div><h3>自动整理，继续探索</h3><p>提取研究标签、去重入库，图谱与榜单同步更新。</p></div></div><div class="note">建议选择会议与年份以缩小检索范围。首次请求需获取官方目录，后续使用24小时缓存。</div><div class="note warning">仅抓取公开页面用于课程学习。摘要缺失会保留缺失状态，不生成虚构摘要。网络验证或站点变化会明确报错。</div><a href="#/papers" class="subtle-link">查看已有论文 →</a></aside></div>`;
  const form = document.querySelector('#crawl-form');
  const fields = document.querySelector('#title-fields');
  const draw = () => {
    fields.innerHTML = mode === 'single' ? '<div class="field"><label for="crawl-titles">论文完整标题 *</label><input id="crawl-titles" required minlength="3" maxlength="600" placeholder="例如：Segment Anything"><small>请使用英文原标题。关键词检索请前往论文资料库。</small></div>' : mode === 'batch' ? '<div class="drop-zone">↥ 导入论文标题清单<input id="title-file" type="file" accept=".txt,.csv" aria-label="上传TXT或CSV"><span class="paper-sub">TXT 每行一个标题；CSV 支持 title / 标题列，最多1MB</span></div><div class="field"><label for="crawl-titles">标题列表 *</label><textarea id="crawl-titles" required rows="7" placeholder="每行一个完整论文标题"></textarea><small id="title-count">最多30篇，逐条报告成功或失败。</small></div>' : '<div class="field"><label for="crawl-limit">本次采集数量</label><input id="crawl-limit" type="number" min="1" max="30" value="10" required><small>按官方目录顺序采集前N篇，必须选择会议和年份。</small></div>';
    const file = document.querySelector('#title-file');
    if (file) file.onchange = async () => {
      try {
        if (!file.files[0]) return;
        if (file.files[0].size > 1024 * 1024) throw new Error('文件不能超过1MB');
        const titles = parseTitles(await file.files[0].text(), file.files[0].name);
        if (titles.length > 30) throw new Error(`文件有 ${titles.length} 个标题，请拆分为每批30篇以内`);
        document.querySelector('#crawl-titles').value = titles.join('\n');
        document.querySelector('#title-count').textContent = `已识别 ${titles.length} 个不同标题`;
      } catch (error) { toast(error.message); }
    };
  };
  app.querySelectorAll('[data-mode]').forEach(button => button.onclick = () => {
    mode = button.dataset.mode;
    app.querySelectorAll('[data-mode]').forEach(b => { b.classList.toggle('active', b === button); b.setAttribute('aria-selected', String(b === button)); });
    draw();
  });
  form.onsubmit = async event => {
    event.preventDefault(); const done = busy(event.submitter, '正在访问官方来源…');
    const results = document.querySelector('#crawl-results');
    const controls = [...form.querySelectorAll('input,select,textarea')]; controls.forEach(c => c.disabled = true);
    const tabs = [...app.querySelectorAll('[data-mode]')]; tabs.forEach(c => c.disabled = true);
    try {
      const body = { conference: document.querySelector('#crawl-conference').value || undefined, year: document.querySelector('#crawl-year').value || undefined };
      if (mode === 'edition') {
        if (!body.conference || !body.year) throw new Error('会议目录采集需要选择会议和年份');
        body.limit = Number(document.querySelector('#crawl-limit').value);
      } else {
        body.titles = parseTitles(document.querySelector('#crawl-titles').value);
        if (!body.titles.length || body.titles.length > 30) throw new Error('请提供1—30个有效标题');
      }
      results.innerHTML = '<div class="note">正在检索与采集，首批可能需要数分钟。请保留当前页面。</div>';
      const result = await api(mode === 'edition' ? '/api/crawl-edition' : '/api/crawl', { method: 'POST', body: JSON.stringify(body) });
      const success = result.results.filter(r => r.ok).length;
      results.innerHTML = `<div class="panel-title"><h2>采集结果</h2><span class="pill">成功 ${success} / ${result.results.length}</span></div>` + result.results.map(r => `<div class="result-item ${r.ok ? '' : 'error'}"><strong style="font-weight:500">${r.ok ? '✓' : '×'} ${esc(r.title)}</strong><p>${r.ok ? `${r.created ? '已新增' : '已存在，未覆盖'} · ${r.paper.abstract ? '摘要已获取' : '摘要缺失'} · ${r.paper.keywords.length} 个标签 · <a href="#/paper/${r.paper.id}">查看论文 ↗</a>` : esc(r.error)}</p></div>`).join('');
      toast(`采集完成：${success} 条成功`);
    } catch (error) { results.innerHTML = `<div class="note warning">${esc(error.message)}</div>`; }
    finally { controls.forEach(c => c.disabled = false); tabs.forEach(c => c.disabled = false); done(); }
  };
  draw();
}
