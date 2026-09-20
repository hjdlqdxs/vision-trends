import { readFileSync, writeFileSync } from 'node:fs';
const read = path => readFileSync(path, 'utf8');
const requirements = read('docs/requirements.md');
const nabcd = requirements.slice(requirements.indexOf('### N ·'), requirements.indexOf('## 优先级'));
const psp = read('docs/psp.md');
const table = psp.slice(psp.indexOf('| 阶段'), psp.indexOf('\n\n偏差分析'));
const explanations = {
  'src/database.mjs': '数据层负责校验、绑定SQL参数和去重。save在冲突时返回已存在记录而非覆盖，保护人工编辑；list以相同筛选口径服务论文库与统计。规范化标题只是匹配键，展示仍保留原始标题。',
  'src/crawler.mjs': '抓取层把“网络获取”“HTML解析”“标题定位”分开。官方列表同时提供会议/年份元信息；详情只读取官方摘要。白名单、禁止重定向、限速、缓存、超时与响应大小限制分别控制目标、负载和失败边界。DBLP反机器人HTML不能当作JSON或摘要。',
  'src/analytics.mjs': '统计层先对每篇标签去重，再累加文档频数与两两共现。趋势严格区分0与null，并同时返回样本分母，让占比可以复算。CSV导出对特殊字符转义并中和公式开头。',
};
let lines = 0;
const code = Object.entries(explanations).map(([path, explanation], index) => {
  const source = read(path).trimEnd(); lines += source.split('\n').length;
  return `### 8.${index + 1} ${path}\n\n${explanation}\n\n\`\`\`javascript\n${source}\n\`\`\`\n`;
}).join('\n');
const blog = read('docs/blog-source.md').replace('{{PSP_TABLE}}', table).replace('{{NABCD}}', nabcd).replace('{{KEY_CODE}}', `本节源码共 **${lines} 行**（含注释与空行）。\n\n${code}`);
writeFileSync('docs/blog.md', blog);
writeFileSync('docs/key-code.md', `# 关键代码与解释\n\n共 ${lines} 行。以下各段属于独立模块，不应直接拼接为单文件。\n\n${code}`);
console.log(`Built complete Markdown blog with ${lines} source lines.`);
