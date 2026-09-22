// Figma development plugin: creates editable native frames, not application code.
// Re-running repairs known links in existing frames without recreating the design.
const PAGE_NAMES = ['研究总览', '论文资料库', '采集工作台', '热度走势', '年度演变', '关于与数据', '论文详情', '编辑论文', '删除确认', '关键词查询结果'];
function withDeadline(promise, label, milliseconds = 8000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`${label}超时。画板已保留，请先手动检查 Prototype 连线。`)), milliseconds);
    Promise.resolve(promise).then(value => { clearTimeout(timeout); resolve(value); }, error => { clearTimeout(timeout); reject(error); });
  });
}
function existingFrames() {
  return PAGE_NAMES.map((name, index) => figma.currentPage.children.find(node => node.type === 'FRAME' && node.name === `${String(index + 1).padStart(2, '0')} ${name}`));
}
function recoverLinks(frames) {
  const links = [];
  for (let index = 0; index < frames.length; index++) {
    const frame = frames[index];
    for (const node of frame.findAll(n => n.type === 'FRAME' || n.type === 'TEXT')) {
      const saved = node.getPluginData('visionTrendsTarget');
      if (node.type === 'FRAME') {
        const label = node.children.find(child => child.type === 'TEXT')?.characters;
        const nav = PAGE_NAMES.indexOf(label);
        if (node.width <= 260 && node.height <= 64 && nav >= 0 && nav < 6) links.push([node, nav]);
        else if (label && /^(?:←\s*)?返回研究总览$/.test(label.trim())) links.push([node, 0]);
        else if (['编辑', '新增论文', '编辑论文'].includes(label)) links.push([node, 7]);
        else if (label === '删除') links.push([node, 8]);
        else if (['保存论文', '确认删除', '取消', '返回论文库', '开始采集'].includes(label)) links.push([node, 1]);
        else if (label === '搜索') links.push([node, 9]);
        else if (label === '▶ 播放 / 暂停') links.push([node, 4]);
        else if (label === '▶ 播放演变') links.push([node, 3]);
        else if (index === 0 && node.width === 145 && node.height === 40) links.push([node, 9]);
        else if (/^\d$/.test(saved)) links.push([node, Number(saved)]);
      } else if (node.type === 'TEXT') {
        // Original generator has no metadata: recover only recognisable positions.
        if (index === 0 && /^\d{2}   /.test(node.characters)) links.push([node, 9]);
        if (index === 4 && node.x === 50 && node.y >= 100 && node.y <= 496) links.push([node, 9]);
        if ([1, 9].includes(index) && node.x === 25 && [100, 200, 300, 400].includes(node.y)) links.push([node, 6]);
        if (/^(?:←\s*)?返回研究总览$/.test(node.characters.trim()) && node.parent === frame) links.push([node, 0]);
        if (/^\d$/.test(saved) && !links.some(([item]) => item === node)) links.push([node, Number(saved)]);
      } else if (/^\d$/.test(saved)) {
        links.push([node, Number(saved)]);
      }
    }
  }
  return links;
}
function navigationActions(reaction) {
  return reaction.actions || (reaction.action ? [reaction.action] : []);
}
function errorText(error) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error) return error;
  try {
    const json = JSON.stringify(error);
    return json && json !== '{}' ? json : 'Figma 未返回具体错误信息';
  } catch { return 'Figma 未返回具体错误信息'; }
}
function validClick(node, destinationId) {
  const clicks = (node.reactions || []).filter(r => r.trigger && r.trigger.type === 'ON_CLICK');
  return clicks.length === 1 && navigationActions(clicks[0]).length === 1 &&
    navigationActions(clicks[0])[0].type === 'NODE' && navigationActions(clicks[0])[0].navigation === 'NAVIGATE' &&
    navigationActions(clicks[0])[0].destinationId === destinationId;
}
async function addReturnEntrances(frames) {
  for (const index of [1, 9]) {
    const frame = frames[index];
    if (frame.findAll(n => n.type === 'TEXT' && /^(?:←\s*)?返回研究总览$/.test(n.characters.trim())).length) continue;
    await withDeadline(figma.loadFontAsync({ family: 'Inter', style: 'Regular' }), '加载返回按钮字体');
    const button = figma.createFrame(); frame.appendChild(button);
    button.name = '返回研究总览 · 整块可点击'; button.x = 1130; button.y = 82; button.resize(260, 42);
    button.cornerRadius = 8; button.fills = [{ type: 'SOLID', color: { r: .87, g: .91, b: .81 } }];
    button.setPluginData('visionTrendsTarget', '0');
    const label = figma.createText(); button.appendChild(label);
    label.fontName = { family: 'Inter', style: 'Regular' }; label.fontSize = 16;
    label.characters = '← 返回研究总览'; label.x = 16; label.y = 11;
    label.fills = [{ type: 'SOLID', color: { r: .12, g: .30, b: .25 } }];
  }
}
function expandTextTargets(links) {
  const expanded = [...links];
  for (const [node, target] of links) {
    if (node.type !== 'TEXT') continue;
    const parent = node.parent;
    // Standalone list text receives an invisible, padded click area. Reuse it on reruns.
    const key = node.id;
    let hit = parent.children.find(n => n.getPluginData('visionTrendsHitFor') === key);
    if (!hit) { hit = figma.createRectangle(); parent.appendChild(hit); hit.setPluginData('visionTrendsHitFor', key); }
    hit.name = `点击区域 · ${node.characters.slice(0, 45)}`;
    hit.x = Math.max(0, node.x - 6); hit.y = Math.max(0, node.y - 5);
    const rowWidth = /^\d{2}   /.test(node.characters) ? parent.width - hit.x - 20 : node.width + 16;
    hit.resize(Math.max(44, rowWidth), Math.max(28, node.height + 10));
    hit.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 }, opacity: .001 }];
    hit.setPluginData('visionTrendsTarget', String(target));
    expanded.push([hit, target]);
  }
  return [...new Map(expanded.map(([node, target]) => [node.id, [node, target]])).values()];
}
function showRepairPanel() {
  figma.showUI(`<html><meta charset="utf-8"><style>body{font:13px system-ui;padding:18px;color:#263d35}h2{font-size:17px}pre{white-space:pre-wrap;max-height:240px;overflow:auto;background:#f2f5eb;padding:10px}button{padding:9px 18px;background:#1f4c40;color:white;border:0;border-radius:6px}</style><h2>视界 · 批量修复页面跳转</h2><p id="status">正在识别已有画板…</p><pre id="detail">保留画板和视觉设计，检查已知按钮的目标。</pre><button onclick="parent.postMessage({pluginMessage:{type:'close'}},'*')">关闭</button><script>onmessage=e=>{const m=e.data.pluginMessage;if(!m)return;document.getElementById('status').textContent=m.status;document.getElementById('detail').textContent=m.detail||''}</script></html>`, { width: 430, height: 400 });
  figma.ui.onmessage = message => { if (message.type === 'close') figma.closePlugin(); };
}
async function connectFrames(frames, links) {
  showRepairPanel();
  let completed = 0;
  let changed = 0;
  let samePage = 0;
  const failures = [];
  const startedAt = Date.now();
  for (const [node, target] of links) node.setPluginData('visionTrendsTarget', String(target));
  for (let i = 0; i < links.length; i += 6) {
    if (Date.now() - startedAt > 90000) { failures.push(`仍有${links.length - i}个位置未处理：已达到90秒运行上限，可再次运行继续。`); break; }
    await Promise.all(links.slice(i, i + 6).map(async ([node, target]) => {
      try {
        const destinationId = frames[target]?.id;
        if (!destinationId) throw new Error(`目标画板不存在（索引 ${target}）`);
        let owner = node;
        while (owner.parent && owner.parent !== figma.currentPage) owner = owner.parent;
        const staysHere = owner.id === destinationId;
        const clickIsCorrect = () => staysHere
          ? !(node.reactions || []).some(r => r.trigger && r.trigger.type === 'ON_CLICK')
          : validClick(node, destinationId);
        if (!clickIsCorrect()) {
          const other = (node.reactions || []).filter(r => !r.trigger || r.trigger.type !== 'ON_CLICK');
          // Figma rejects NAVIGATE to the source's own top-level frame.
          const reactions = staysHere ? other : [...other, { trigger: { type: 'ON_CLICK' }, actions: [{ type: 'NODE', destinationId, navigation: 'NAVIGATE', transition: null, preserveScrollPosition: false }] }];
          try {
            if (typeof node.setReactionsAsync === 'function') await withDeadline(node.setReactionsAsync(reactions), `设置“${node.name || node.type}”跳转`, 5000);
            else node.reactions = reactions;
          } catch (firstError) {
            // Older Figma desktop builds expose reactions as a writable property but reject the async method.
            try { node.reactions = reactions; } catch { throw new Error(`异步接口失败：${errorText(firstError)}`); }
          }
          if (!clickIsCorrect()) throw new Error('写入后未读回正确点击设置');
          changed++;
        }
        // Child text can intercept a click on an otherwise-correct full button.
        if (node.type === 'FRAME') {
          for (const child of node.children.filter(n => n.type === 'TEXT' && (n.reactions || []).some(r => r.trigger && r.trigger.type === 'ON_CLICK'))) {
            const cleaned = child.reactions.filter(r => !r.trigger || r.trigger.type !== 'ON_CLICK');
            try {
              if (typeof child.setReactionsAsync === 'function') await withDeadline(child.setReactionsAsync(cleaned), '移除文字上的重复点击', 5000);
              else child.reactions = cleaned;
            } catch (firstError) {
              try { child.reactions = cleaned; } catch { throw new Error(`移除文字重复点击失败：${errorText(firstError)}`); }
            }
          }
        }
        if (staysHere) samePage++;
        completed++;
      } catch (error) { failures.push(`${node.name || node.type || '未知图层'}: ${errorText(error)}`); }
    }));
    figma.ui.postMessage({ status: `已检查 ${Math.min(i + 6, links.length)}/${links.length}；成功 ${completed}；失败 ${failures.length}`, detail: failures.join('\n') || '正在设置整块按钮点击与返回路径，请稍候…' });
  }
  figma.currentPage.name = 'Vision Trends · 全页面可编辑原型';
  try {
    if (!(figma.currentPage.flowStartingPoints || []).some(flow => flow.nodeId === frames[0].id)) {
      figma.currentPage.flowStartingPoints = [...(figma.currentPage.flowStartingPoints || []), { nodeId: frames[0].id, name: '视界演示' }];
    }
  } catch (error) { failures.push(`设置演示起点：${errorText(error)}`); }
  figma.viewport.scrollAndZoomIntoView([frames[0]]);
  const report = { checked: links.length, completed, changed, samePage, failures, timestamp: new Date().toISOString() };
  figma.currentPage.setPluginData('visionTrendsRepairReport', JSON.stringify(report));
  figma.ui.postMessage({ status: failures.length ? '修复结束，但有未完成项，请截取此窗口。' : `修复完成：${completed}个位置检查通过，更新${changed}个点击设置。`, detail: failures.join('\n') || `当前栏目保持本页：${samePage}处。\n\n请点击“关闭”，关闭旧预览标签，从01研究总览重新播放。\n\n已检查：侧栏、热门方向、论文标题、编辑/删除、保存/取消、返回入口。\n\n这只是原型导航，不等于搜索、导入或趋势动画引擎。` });
  return report;
}
async function main() {
  const existing = existingFrames();
  if (existing.every(Boolean)) {
    await addReturnEntrances(existing);
    await connectFrames(existing, expandTextTargets(recoverLinks(existing)));
    return;
  }
  if (existing.some(Boolean)) throw new Error('检测到部分原型画板，已停止以避免重复创建。请提供截图检查，不要删除现有设计。');
  await withDeadline(figma.loadFontAsync({ family: 'Inter', style: 'Regular' }), '加载常规字体');
  await withDeadline(figma.loadFontAsync({ family: 'Inter', style: 'Semi Bold' }), '加载粗体字体');
  const rgb = hex => ({ r: parseInt(hex.slice(1, 3), 16) / 255, g: parseInt(hex.slice(3, 5), 16) / 255, b: parseInt(hex.slice(5, 7), 16) / 255 });
  const ink = '#263d35', green = '#1f4c40', muted = '#83917b', line = '#e4e8e0';
  function rect(parent, x, y, w, h, fill, radius = 0) {
    const node = figma.createRectangle(); parent.appendChild(node); node.x = x; node.y = y; node.resize(w, h);
    node.fills = [{ type: 'SOLID', color: rgb(fill) }]; node.cornerRadius = radius; return node;
  }
  function text(parent, label, x, y, size = 14, color = ink, bold = false, width) {
    const node = figma.createText(); parent.appendChild(node);
    node.fontName = { family: 'Inter', style: bold ? 'Semi Bold' : 'Regular' }; node.fontSize = size;
    node.characters = label; node.fills = [{ type: 'SOLID', color: rgb(color) }];
    node.x = x; node.y = y; if (width) { node.resize(width, node.height); node.textAutoResize = 'HEIGHT'; }
    return node;
  }
  function button(parent, label, x, y, w = 150, primary = true) {
    const node = figma.createFrame(); parent.appendChild(node); node.x = x; node.y = y; node.resize(w, 40);
    node.fills = [{ type: 'SOLID', color: rgb(primary ? green : '#edf2e3') }]; node.cornerRadius = 8;
    text(node, label, 14, 11, 13, primary ? '#ffffff' : green); return node;
  }
  function card(parent, x, y, w, h, title, subtitle = '') {
    const node = figma.createFrame(); parent.appendChild(node); node.x = x; node.y = y; node.resize(w, h);
    node.fills = [{ type: 'SOLID', color: rgb('#ffffff') }]; node.strokes = [{ type: 'SOLID', color: rgb(line) }]; node.cornerRadius = 12;
    text(node, title, 24, 22, 16, ink, true); if (subtitle) text(node, subtitle, 24, 48, 11, muted); return node;
  }
  const names = ['研究总览', '论文资料库', '采集工作台', '热度走势', '年度演变', '关于与数据', '论文详情', '编辑论文', '删除确认', '关键词查询结果'];
  const frames = []; const navs = []; const links = [];
  for (let i = 0; i < names.length; i++) {
    const frame = figma.createFrame(); frame.name = `${String(i + 1).padStart(2, '0')} ${names[i]}`;
    frame.resize(1440, 1000); frame.x = (i % 3) * 1550; frame.y = Math.floor(i / 3) * 1100;
    frame.fills = [{ type: 'SOLID', color: rgb('#f6f7f3') }]; frames.push(frame);
    rect(frame, 0, 0, 224, 1000, '#ffffff'); rect(frame, 224, 0, 1216, 72, '#fafbf8');
    rect(frame, 26, 30, 43, 44, green, 12); text(frame, '◈', 35, 34, 27, '#dceaa8');
    text(frame, '视界', 82, 30, 25, ink, true); text(frame, 'VISION TRENDS', 82, 61, 9, muted);
    text(frame, 'RESEARCH WORKSPACE', 28, 111, 9, muted);
    for (let n = 0; n < 6; n++) {
      const nav = button(frame, names[n], 20, 143 + n * 61, 184, false);
      if (n === i) nav.fills = [{ type: 'SOLID', color: rgb('#dfe9ce') }];
      navs.push([nav, n]);
    }
    text(frame, '真实论文 · 可追溯来源', 29, 902, 11, muted);
    text(frame, '计算机视觉研究观察站  /  ' + names[i], 262, 28, 12, muted);
    text(frame, 'VISION TRENDS / PROTOTYPE', 264, 106, 10, muted);
    text(frame, names[i], 262, 132, 30, ink, true);
    text(frame, '从一篇论文，发现一个方向。', 264, 179, 13, muted);
  }
  const topics = ['3D vision', 'Video understanding', 'Transformers', 'Image segmentation', 'Visual recognition', 'Image generation', 'Diffusion models', 'Vision-language', 'Few-shot learning', 'Object detection'];
  const counts = [47, 34, 30, 27, 25, 23, 21, 19, 18, 15];
  const f = frames[0]; rect(f, 262, 221, 1140, 162, green, 14);
  text(f, '从海量论文中，看见值得探索的方向。', 294, 254, 28, '#e4edbb', true);
  text(f, 'CVPR · ICCV · ECCV   /   可解释统计 · 关键词连接 · 多年趋势', 294, 317, 13, '#bdcfc4');
  ['已收录论文  189', '研究方向  20', '覆盖会议  3', '时间跨度  4 年'].forEach((label, i) => { card(f, 262 + i * 290, 405, 270, 95, label, '原型演示数字，以成品实时统计为准'); });
  const ranks = card(f, 262, 523, 530, 432, '热门研究方向 TOP 10', '按关键词命中论文数排序');
  topics.forEach((t, i) => { const label = text(ranks, `${String(i + 1).padStart(2, '0')}   ${t}`, 24, 85 + i * 30, 12); rect(ranks, 280, 89 + i * 30, counts[i] * 4.2, 6, '#9aae79', 3); links.push([label, 9]); });
  const graph = card(f, 813, 523, 589, 432, '关键词共现图谱', '节点→相关论文；连线→同篇共现');
  topics.slice(0, 8).forEach((t, i) => { const x = 70 + (i % 3) * 172, y = 110 + Math.floor(i / 3) * 98; const node = button(graph, t, x, y, 145, false); links.push([node, 9]); });
  function paperList(frame, title) {
    const table = card(frame, 262, 320, 1140, 540, title, '论文标题 / 会议年份 / 研究方向 / 操作');
    const titles = ['Unmixing Diffusion for Self-Supervised Hyperspectral Image Denoising', 'Segment Anything', '4D Contrastive Superflows are Dense 3D Representation Learners', 'Octopus: Embodied Vision-Language Programmer from Environmental Feedback'];
    titles.forEach((t, i) => { rect(table, 20, 80 + i * 100, 1100, 1, line); const a = text(table, t, 25, 100 + i * 100, 13, ink, true, 710); text(table, 'CVPR / ICCV / ECCV · 原型示意，正式信息见成品', 25, 136 + i * 100, 10, muted); links.push([a, 6]); links.push([button(table, '编辑', 855, 104 + i * 100, 85, false), 7]); links.push([button(table, '删除', 955, 104 + i * 100, 85, false), 8]); });
    links.push([button(frame, '新增论文', 1230, 146, 160), 7]);
  }
  paperList(frames[1], '论文资料库');
  rect(frames[1], 262, 240, 1140, 54, '#ffffff', 9); text(frames[1], '搜索论文标题、编号、关键词…       全部会议       全部年份       精确标题', 282, 257, 14, muted); links.push([button(frames[1], '搜索', 1270, 246, 115), 9]);
  paperList(frames[9], '关键词查询结果：Diffusion models');
  text(frames[9], '由图谱点击进入 · 保留会议/年份 · 可清除筛选', 264, 249, 14, muted);
  const importCard = card(frames[2], 262, 237, 740, 646, '单篇采集  /  批量导入  /  会议目录', '完整英文标题，支持 TXT / CSV');
  rect(importCard, 24, 92, 690, 175, '#f6f8f1', 10); text(importCard, '每行一个论文标题\n\nSegment Anything\nUnmixing Diffusion for Self-Supervised Hyperspectral Image Denoising', 42, 116, 13, muted, false, 650);
  text(importCard, '限定会议：全部       限定年份：2022—2025', 25, 303, 14, muted); links.push([button(importCard, '开始采集', 24, 360), 1]);
  text(importCard, '交互状态：加载 → 逐条成功/失败 → 进入论文详情\n重复论文不覆盖人工修改；缺失摘要如实标记。', 25, 443, 13, muted, false, 650);
  card(frames[2], 1025, 237, 377, 440, '采集规则', '官方来源 / 限速缓存 / 逐条报告');
  const trend = card(frames[3], 262, 280, 1140, 570, 'Diffusion models · 三会走势', '样本占比；缺失届次不填零');
  for (let i = 0; i < 5; i++) { rect(trend, 70, 110 + i * 70, 1010, 1, line); text(trend, `${40 - i * 10}%`, 25, 102 + i * 70, 11, muted); }
  ['2022', '2023', '2024', '2025'].forEach((y, i) => text(trend, y, 72 + i * 318, 415, 12, muted));
  text(trend, 'CVPR ━━━━━   ICCV ┄┄┄┄┄   ECCV ┄┄┄┄┄', 330, 65, 15, green);
  text(trend, '折线数据来自成品统计；此处为交互结构原型。', 280, 240, 16, muted);
  links.push([button(trend, '▶ 播放 / 暂停', 25, 487, 180), 4]);
  rect(trend, 235, 505, 820, 4, '#a7bb89', 2); text(frames[3], '方向选择：Diffusion models        指标：样本占比 / 论文数量', 264, 237, 14, muted);
  const evo = card(frames[4], 262, 236, 1140, 666, '年度热门方向 TOP 10', '拖动年份 / 播放演变 / 点击方向');
  text(evo, '2024', 972, 25, 40, '#bfcfa7', true);
  topics.forEach((t, i) => { const a = text(evo, t, 50, 100 + i * 44, 13); rect(evo, 260, 103 + i * 44, counts[i] * 15, 20, i ? '#a6ba88' : green, 4); links.push([a, 9]); });
  links.push([button(evo, '▶ 播放演变', 25, 583, 160), 3]);
  const about = card(frames[5], 262, 238, 1140, 650, '会议与数据说明');
  text(about, 'CVPR · 每年举办\nICCV · 奇数年举办\nECCV · 偶数年举办\n\n来源：CVF Open Access / ECVA；DBLP 为备用定位。\n热度 = 命中论文数 / 同范围样本数 × 100%\n每篇每词计一次；词典标签不等于作者关键词。\n\n抽样偏差、缺失摘要、词典覆盖不足必须在成品说明。\n本原型演示数字不作为真实统计结果。', 30, 85, 18, muted, false, 1020);
  const detail = card(frames[6], 262, 240, 1140, 610, '论文标题 · 官方摘要 · 研究标签', 'CVPR / ICCV / ECCV · 来源页 · 采集时间');
  text(detail, 'Abstract\n\n展示官方摘要正文。没有摘要时明确提示缺失，不生成替代文本。\n\n关键词标签可点击联动到筛选后的论文列表。\n\n原文与来源跳转到官方 HTTPS 页面。', 30, 110, 17, muted, false, 1000);
  links.push([button(detail, '编辑论文', 30, 487), 7]); links.push([button(detail, '返回论文库', 200, 487, 160, false), 1]);
  for (const i of [7, 8]) {
    rect(frames[i], 245, 220, 1170, 730, '#e4e9df', 12);
    const dialog = card(frames[i], 470, 286, 710, 550, i === 7 ? '新增 / 编辑论文' : '删除这篇论文？');
    text(dialog, i === 7 ? '标题 *\n\n会议 *                       年份 *\n\n摘要\n\n关键词（留空自动提取）\n\n原文 / 来源 HTTPS 地址' : '删除会立即影响本地论文库、Top 10、图谱与趋势。\n\n需要二次确认，避免误操作。', 35, 92, 16, muted, false, 640);
    links.push([button(dialog, i === 7 ? '保存论文' : '确认删除', 490, 473, 160), 1]);
    links.push([button(dialog, '取消', 305, 473, 160, false), 1]);
  }
  await addReturnEntrances(frames);
  await connectFrames(frames, expandTextTargets(recoverLinks(frames)));
}
main().catch(error => { console.error(error); figma.closePlugin(`原型未全部完成：${error.message}`); });
