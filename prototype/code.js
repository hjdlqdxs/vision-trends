// Figma development plugin: creates editable native frames, not application code.
// Import manifest.json in Figma desktop, run once in a blank design file.
async function main() {
  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
  await figma.loadFontAsync({ family: 'Inter', style: 'Semi Bold' });
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
  for (const [node, target] of [...navs, ...links]) await node.setReactionsAsync([{ trigger: { type: 'ON_CLICK' }, actions: [{ type: 'NODE', destinationId: frames[target].id, navigation: 'NAVIGATE', transition: null, preserveScrollPosition: false }] }]);
  figma.currentPage.name = 'Vision Trends · 全页面可编辑原型';
  figma.viewport.scrollAndZoomIntoView([frames[0]]);
  figma.notify('已创建10个可编辑原型画板及点击跳转。请人工复核并设置展示起点、分享权限。');
  figma.closePlugin();
}
main().catch(error => { figma.notify(error.message, { error: true }); figma.closePlugin(); });
