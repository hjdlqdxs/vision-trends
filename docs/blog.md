# 视界：与 AI 结对构建计算机视觉顶会热词平台

> **提交前状态说明**：这是依据真实项目生成的博客草稿。文中“待本人填写/待完成”必须在实际操作后补齐。真实部署与原型链接已补齐；个人工时、阅读反思、未发生的人工审阅仍须本人填写。

| 这个作业属于哪个课程 | [福州大学软件工程实践2026](https://bbs.csdn.net/forums/FZU_university_2026) |
|---|---|
| 学号-姓名 | 102400409-郑雯心 |
| 这个作业要求在哪里 | [第二次作业——与AI结对编程](https://bbs.csdn.net/topics/620526370) |
| 这个作业的目标 | 与AI结对完成需求分析、专用工具原型、顶会论文管理与热点分析、测试及云端部署（依老师通知使用免费Render），并反思人机协作 |
| 其他参考文献 | 《构建之法》第3/4/8章；CVF Open Access；ECVA；DBLP API；Node.js文档；Google JavaScript Style Guide |

**CodeArts 项目地址：[102400409](https://devcloud.cn-north-4.huaweicloud.com/projectman/scrum/3c8a2a500474485cb17c62c02c96db74/workitem/backlog)。**

**AI 编程助手：Codex 桌面会话，本次系统标识 GPT-6，主要用于需求草稿、实现、测试、修复与文档。界面显示的具体版本以实际截图为准。**

## 目录

- [一、仓库、规范与AI说明](#repository)
- [二、PSP表格](#psp)
- [三、NABCD需求分析](#nabcd)
- [四、原型设计与链接](#prototype)
- [五、成品展示](#demo)
- [六、人机结对讨论与三个案例](#collaboration)
- [七、设计实现过程](#architecture)
- [八、关键代码与解释](#code)
- [九、测试与修复](#tests)
- [十、心路历程、收获](#reflection)
- [十一、对AI伙伴的评价](#evaluation)
- [十二、发布与提交核对](#submission)

<a id="repository"></a>
## 一、仓库、规范与AI说明

项目名“视界 / Vision Trends”，面向刚进入计算机视觉领域的学生。用户先从Top10与共现图谱发现方向，再进入论文库读摘要、原文，也能导入自己的论文清单。技术栈为 Node.js 22 内置 HTTP、SQLite 和原生 JavaScript/SVG，没有第三方运行时依赖。

| 入口 | 实际地址/状态 |
|---|---|
| CodeArts 仓库 | [vision-trends](https://devcloud.cn-north-4.huaweicloud.com/codehub/project/3c8a2a500474485cb17c62c02c96db74/codehub/3089334/home)（用户截图确认27次提交、2分支、1标签；后续部署修复待同步） |
| 代码规范 | [codestyle.md（GitHub同步仓库）](https://github.com/hjdlqdxs/vision-trends/blob/main/codestyle.md) |
| 原型网页 | [视界 · Figma交互原型](https://www.figma.com/proto/bzD97C7vaq4mSYRu66Gi5t/%E8%A7%86%E7%95%8C%E2%80%94%E2%80%94%E9%A1%B6%E4%BC%9A%E7%83%AD%E8%AF%8D%E7%BB%9F%E8%AE%A1%E5%B9%B3%E5%8F%B0%E5%8E%9F%E5%9E%8B?page-id=0%3A1&node-id=2-2&viewport=40%2C307%2C0.19&t=Jn46pMajG0sacE0l-1&scaling=contain&content-scaling=fixed&starting-point-node-id=2%3A2)（用户已确认无痕访问成功） |
| 公网部署地址 | [Render免费实例](https://vision-trends.onrender.com/)；[健康检查](https://vision-trends.onrender.com/api/health) |
| GitHub同步仓库 | [hjdlqdxs/vision-trends](https://github.com/hjdlqdxs/vision-trends) |
| 本地启动 | `node scripts/seed.mjs` → `node src/server.mjs` → http://127.0.0.1:3000 |
| 版本 | CodeArts已有v1.0.0标签与1.0.0源码包；Render运行后续修复提交a9671ee，首版标签保留不改写 |

代码规范来源为 [Google JavaScript Style Guide](https://google.github.io/styleguide/jsguide.html)、[Node.js官方文档](https://nodejs.org/docs/latest-v22.x/api/) 和 [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript)。

**贡献声明**：当前源码、测试和文档初稿主要由AI生成；Git使用 `Codex AI` 标记真实作者。学生实际编写/修改的文件、行和理由应在审阅后补充。目前不能声明“我已理解所有代码”或“我独立实现了某模块”。程序源码不是由原型工具导出。

<a id="psp"></a>
## 二、PSP表格

预估在首个代码实现前记录并提交。下表是完成整个课程实践的时间预算，不是AI生成项目所花时间。本人实际工时需要从实际学习、设计、审阅、开发、部署与写作记录填写。

| 阶段 | 子任务 | 预估（分钟，学生完整实践） | 实际（学生，待记录） |
|---|---|---:|---|
| Planning | 任务拆解、PSP 估计 | 20 | 待本人填写 |
| Analysis | 需求分析、阅读第3/8章、技术学习 | 60 | 待本人填写 |
| Design Spec | NABCD、验收条件与接口设计 | 35 | 待本人填写 |
| Design Review | 审阅AI方案、确定统计口径 | 25 | 待本人填写 |
| Coding Standard | 官方风格规范与检查 | 15 | 待本人填写 |
| Design | 学习专用原型工具、5类页面及交互 | 100 | 待本人填写 |
| Coding | 数据库与论文CRUD | 55 | 待本人填写 |
| Coding | 官方抓取、批量导入与清洗 | 80 | 待本人填写 |
| Coding | 热词、图谱、趋势与年度榜单 | 80 | 待本人填写 |
| Coding | 页面整合、部署配置 | 75 | 待本人填写 |
| Code Review | 解释代码与人工审阅 | 35 | 待本人填写 |
| Test | 自动化、交互测试、Bug修复 | 60 | 待本人填写 |
| Test Report | 测试报告、截图与GIF | 30 | 待本人填写 |
| Size Measurement | Git、工作量与版本发布 | 20 | 待本人填写 |
| Postmortem | 博客、阅读第4章、个人反思 | 90 | 待本人填写 |
| **合计** | | **880** | **待本人统计** |

**实际偏差分析（待本人写）**：我原估____分钟，实耗____分钟；最大的偏差在____，因为____。AI在____节省了____分钟，但____返工增加了____分钟。下次我会____。

AI工作区实际时间区间可从 `git log --format="%h %cI %s" --reverse` 核验。此区间包含等待、工具操作与文档制作，不能伪装成学生个人工时。

<a id="nabcd"></a>
## 三、NABCD需求分析

### N · Need

小刚不了解计算机视觉，想从近年顶会论文快速发现方向并定位可阅读论文。次要用户是选题学生和助教。主要场景为“看热点→点关键词→筛选会议/年份→读摘要与原文”，以及“导入导师推荐清单→补齐信息→管理个人文献库”。需要降低查找成本，同时避免让不完整样本生成看似权威的结论。当前为课程单用户项目，不包含商业推荐、全文语义搜索或用户权限体系。

### A · Approach（重点）

1. **可信入口**：CVF / ECVA 官方列表提供会议、年份、标题和详情地址；DBLP 补充按标题定位。按 HTTPS 域名白名单访问，不接受任意网络地址。
2. **统一数据**：SQLite 保存标题规范化键、会议、年份、摘要、提取词、来源、原文和采集时间。按规范化标题+会议+年份去重，保留不同版本；缺失摘要明确显示。
3. **可解释统计**：英文短语词典合并 diffusion / diffusion models 等变体。一个关键词在同一篇论文只计一次；热度=命中论文数/当前筛选样本论文数×100%，Top 10 按文档频数排序。允许人工编辑词。避免词典外方向被误认为不存在，博客说明局限。
4. **交互闭环**：首页 Top 10 和图谱点击进入论文列表；搜索本地未命中时显式提示并进行在线标题定位；批量抓取逐条显示结果；删除二次确认；趋势提供计数与占比、播放/暂停、时间滑块及 CSV。
5. **实现策略**：Node.js 内置 HTTP 和 SQLite，前端原生 SVG 图表；浏览器不依赖远程 CDN，样本离线可演示，在线抓取需要网络。五类必需页面加年度演变页面。
6. **评价指标**：自动化验证增删改查、去重、无数据、异常输入；浏览器验证所有页面和图谱联动；用实际页面截图和动画说明功能。抓取失败返回失败，不返回虚构摘要。

### B · Benefit

用户无需逐篇手动打开论文页，可以集中查看方向和相关论文。占比指标降低不同采集量的直接影响，但不能消除抽样偏差；明确展示样本规模，帮助用户合理解释结果。收益是流程步骤减少和可追溯性提高，未进行用户实验，不声称节省了具体百分比时间。

### C · Competition（重点）

| 产品/方式 | 已有优势 | 本项目选择的差异 | 本项目不足 |
|---|---|---|---|
| Google Scholar | 广泛覆盖、引用与检索 | 聚焦三会+年度方向可视化+个人库编辑 | 无法替代全面检索与引用指标 |
| Semantic Scholar | 大规模语义检索、关联推荐 | 无密钥离线演示、展示具体统计公式 | 词典提取覆盖率远低于大模型语义理解 |
| DBLP | 书目信息可信、开放 API | 补充官方摘要、方向共现与动态比较 | 依赖外部网站、摘要缺失不可避免 |
| CVF / ECVA 官方列表 | 来源权威、原文便利 | 跨会议跨年份统一检索和可视化 | 采集样本不等于完整会议语料 |
| Excel 手工汇总 | 灵活可编辑、门槛低 | 自动定位、持久化、查询联动、动画 | 开发维护成本更高 |

这些对比为公开功能层面的分析草稿，不是实际竞品评测报告。竞争方式是服务“初学者快速进入领域”这一窄场景，不宣称全面超越成熟平台。人工应核对公开功能和自身真实使用体验。

### D · Delivery

通过 CodeArts 管理源码和版本；按老师后续通知，本次个人作业使用Render免费云端容器部署；博客附原型链接、部署 URL、Git 仓库、演示截图/GIF。班级内以“从零认识扩散模型方向”的路径演示。访问端不需注册，写入端使用部署者口令。收集反馈后增加词典或语义提取，保留统计版本说明。



**阅读与人工复核待补**：阅读《构建之法》第3章、第8章后，补充我认为方案最不合理的一点____，最终修改为____，理由____。以上AI分析不等于本人已完成阅读。

<a id="prototype"></a>
## 四、原型设计与链接

已使用 Figma 专用原型工具。项目提供原生 Frame/Text/Rectangle 生成插件，用户实际运行后创建了总览、论文库、采集、趋势、年度演变、关于、详情、编辑、删除确认和关键词结果10张画板。界面采用浅色底与深绿主色，强调信息层级和可追溯统计。

插件与说明见 `prototype/`。它生成的是可编辑设计稿，应用由 `src/` 与 `public/` 独立实现，未使用原型生成代码。

**原型网页：[视界 · Figma交互原型](https://www.figma.com/proto/bzD97C7vaq4mSYRu66Gi5t/%E8%A7%86%E7%95%8C%E2%80%94%E2%80%94%E9%A1%B6%E4%BC%9A%E7%83%AD%E8%AF%8D%E7%BB%9F%E8%AE%A1%E5%B9%B3%E5%8F%B0%E5%8E%9F%E5%9E%8B?page-id=0%3A1&node-id=2-2&viewport=40%2C307%2C0.19&t=Jn46pMajG0sacE0l-1&scaling=contain&content-scaling=fixed&starting-point-node-id=2%3A2)。用户已提供分享链接，并确认无痕窗口访问成功。**

用户截图显示插件154个位置检查通过，6个当前栏目保持本页；调整预览缩放后，用户确认论文资料库可以返回研究总览。这不代表所有交互已人工验收。热门词仍指向统一示例结果，图谱与趋势原型仍有简化，真实统计和动画由独立应用实现。修复过程见 `prototype-repair.md`。

主要交互规则：侧栏在各页一致；Top10与图谱节点跳到同关键词筛选结果；论文标题进入详情；新增/编辑显示表单，删除二次确认；查询无结果允许在线检索；趋势播放、暂停、滑块控制当前年份；年度榜单词条链接回论文库。

| 人工检查项 | 初稿问题 | 我的调整 | 原因与截图 |
|---|---|---|---|
| 侧栏按钮点击范围 | 只有文字可点击 | 用户手工调整整块Frame，随后反馈其他跳转问题 | 扩大可点击区域；具体操作前后截图仍待整理 |
| 原型跳转失败 | 当前栏目导航回自身画板被Figma拒绝 | 用户提供完整报错，AI修复插件，用户重新执行 | 同画板保持原位，跨画板导航；见下面真实结果截图 |
| 预览裁切 | 放大后右侧返回按钮不可见 | 用户按指导切换适应屏幕并确认返回可用 | 展示整张画板，避免把裁切误认成缺失 |

以下为用户提供的真实原型截图；分享链接已由用户无痕验证。操作前后与聊天对话证据仍需整理，不能把统计配图当成原型截图。

![Figma总览预览](evidence/figma-overview.png)

![Figma画板与交互连线](evidence/figma-connections.png)

![Figma修复结果](evidence/figma-repair-passed.png)

<a id="demo"></a>
## 五、成品展示

应用实现论文采集、论文管理、Top10、关键词图谱和多年度三会动画，并扩展年度榜单、CSV导出、会议介绍和来源审计。

下图是用户提供的公网网站无痕访问截图，确认热度走势界面可显示。该截图不单独证明播放动画已验收；后续云端增删改已有用户确认，单篇采集证据见下文。

![Render公网网站热度走势](evidence/cloud-trends-incognito.png)

其余以下素材直接使用应用统计模块导出的真实数据制作，是**统计结果图/GIF，不是浏览器界面截图**。189篇样本来自官方页面，目标192篇中的3次网络失败单独留痕。请在发布博客时上传图片/GIF到博客平台，调整地址，测试动图可播放。

### 5.0 实际单篇采集、查询与来源验证

用户在启用云端管理权限后确认新增、编辑、删除测试成功；该项目前为用户文字确认，过程截图待补。随后单篇采集ICCV2023论文《Segment Anything》，提供以下5张真实截图，并确认全部正常。

![单篇采集成功](evidence/single-crawl-success.png)

采集结果为成功1/1、已新增、摘要已获取、2个研究标签。原189篇为初始样本，真实采集会增加云端记录数；后续统计以当前数据库为准，不应把数量增长当成故障，也不修改原始采样统计图。

![精确标题查询命中](evidence/exact-title-result.png)

完整标题精确查询返回1篇，页面显示ICCV2023及编号190。

![论文详情与摘要](evidence/segment-anything-detail.png)

详情包含作者、官方摘要、系统提取标签、原文及来源链接，关键词生成方式如实标注为受控领域词典。采集时间显示2026-09-23T01:34:30.164Z。

![打开原文PDF](evidence/segment-anything-pdf.png)

![打开CVF官方来源](evidence/segment-anything-official.png)

用户实际打开PDF与官方来源页。此次验证覆盖单篇采集、精确查询、摘要/标签展示和外部链接，不等于批量导入、未命中联网回退及所有动画均已验收。

### 5.0.1 实际批量TXT导入验证

2026-09-23，用户上传包含两个ICCV2023论文标题的TXT文件，页面显示“已识别2个不同标题”，会议与年份选择ICCV、2023。采集结果显示“成功2/2”和“采集完成：2条成功”。

![批量TXT导入成功2条](evidence/batch-import-success.png)

截图可见《Segment Anything》为“已存在，未覆盖”，摘要已获取并显示2个标签，符合重复采集不覆盖已有数据的规则。第二条结果详情位于截图外，因此仅记录批次成功计数，不推断第二条新增或更新状态。本次为TXT成功路径人工验收；CSV、部分失败以及动画交互需要分别验证。

### 5.1 Top10：从方向进入论文

![Top10研究方向](media/top10.png)

图1：3D vision 在当前样本中命中47篇。一个词在同一篇摘要重复出现不会重复计数。成品中点击排行条目会进入相关文章列表。

### 5.2 关键词关系

![关键词共现网络](media/keyword-network.png)

图2：节点代表研究方向，连线表示同篇论文共现。此处为静态统计导出图；成品图谱节点可以点击，需要另补真实交互截图。

### 5.3 跨会议热度走势动图

![三会扩散模型热度对比](media/trend-comparison.gif)

动图1：逐年显示 Diffusion models 在三会样本中的占比；标签同时给出命中数/样本数。ICCV与ECCV的缺失届次不填零。虚线只连接已有观测，不提供缺失年份估计。

### 5.4 年度热门方向演变

![年度榜单演变](media/annual-evolution.gif)

动图2：每个年份重新统计Top10。某方向名次变化不必然意味着全领域趋势变化，也受到采样和词典影响。

### 5.5 年度结果分图

![2022年Top10](media/annual-2022.png)

图3：2022年样本中的方向分布，作为后续比较起点。

![2023年Top10](media/annual-2023.png)

图4：2023年榜单，包含当年已采集CVPR和ICCV论文。

![2024年Top10](media/annual-2024.png)

图5：2024年榜单，包含CVPR和ECCV样本，注意会议组合与2023年不同。

![2025年Top10](media/annual-2025.png)

图6：2025年榜单。比较时应同时查看每届样本量，不直接把排名当作学科评价。

### 5.6 趋势逐帧与完整比较

![趋势截至2022](media/trend-2022.png)

图7：动画起始帧，只显示已观测2022年数据。

![趋势截至2023](media/trend-2023.png)

图8：加入2023年CVPR和ICCV数据，保持相同纵轴便于比较。

![趋势截至2024](media/trend-2024.png)

图9：加入2024年ECCV和CVPR。虚线跨过未举办年份，不把空档降为零。

![趋势截至2025](media/trend-2025.png)

图10：加入2025年观测，完成四年比较。

![完整热度比较](media/trend-comparison.png)

图11：完整比较静态版，适合无法播放GIF的平台。它与图10相同视图，不能为了凑展示数量冒充另一个功能。

**必须补充实际界面展示**：新增/编辑/删除、精确与模糊查询、未命中在线回退、单篇与批量采集结果、图谱联动、手机视口。仅统计图不足以证明全部功能。`scripts/capture-browser.ps1` 可自动准备14类界面素材，但本会话浏览器IPC受限，尚未运行成功；也可以真实手动截图或录屏。

<a id="collaboration"></a>
## 六、人机结对讨论与三个案例

### 6.1 协作事实

初始用户提示词为“帮我完成作业的所有要求”，附完整作业要求，之后AI主动拆分、实现和自检。后续本人实际体验网站，发现“会议筛选后进入热门方向论文列表，无法直接返回上一级”，并反馈给AI推动修复。这一轮是真实人工审阅，详见新增案例D；其余未发生的人工修改和复验不能补写为已完成。

### 案例A：需求和原型

AI把功能映射为六个导航页面与详情弹窗，给出NABCD和验收标准。主要设计决策是展示样本规模、来源和缺失状态，避免图表造成“完整会议统计”的错觉。用户实际运行Figma插件、发现点击范围和导航问题、手工调整一处按钮后继续反馈；AI修复插件，用户提供成功截图并确认返回总览可用，随后复制分享链接。相关对话与截图仍需整理嵌入博客。

**本人参与待补**：我拒绝/修改AI的____建议，因为____；实际改动____；截图____。

### 案例B：采集与统计

在线探测时DBLP返回人机验证HTML而非JSON。AI将优先路径改为CVF/ECVA官方目录，DBLP作为备用定位，增加响应检查、限速缓存与错误报告。不是绕过验证，也没有编造摘要。

对关键词采用受控短语词典，合并常见变体，并按文档频数统计。优点是可以解释和修订；缺点是覆盖有限、多义词可能误判。官方摘要、词典标签和人工标签分别标识。

**本人参与待补**：抽查5篇来源与标签，发现____；我选择____改法，理由____；提示词与官方页面截图____。

### 案例C：实际Bug与修复

编辑表单声明“关键词留空自动提取”，但后端使用 `{ ...old, ...body }` 合并对象，省略keywords时旧标签被保留。回归测试首次失败，16项仅15项通过。

修复时在明确切回自动提取的请求中删除旧keywords字段，再交给数据层提取。修复后16项全通过，前后测试文件和两个提交保留在仓库。

此Bug由AI自检发现，不能写成我本人发现。本人需亲自复现，并解释“字段未传”和“请求自动重算”两种语义不同之处。

**本人复现、审阅与截图待补**：____。

### 案例D：本人发现导航缺陷，推动AI修复

我打开网站并体验交互，发现选择会议后点击热门研究方向进入论文库，没有直接返回上一级的入口，便向AI报告了操作路径。AI检查后确认旧版只带查询筛选，没有来源和返回控件。

修复后论文库新增“返回研究总览”，恢复原会议及年份；从年度演变进入时返回相应年度页。来源保存在URL中，搜索、翻页或刷新后仍可返回；清除关键词保留会议/年份。AI新增6项导航测试，连同原16项共22项通过。

本人修复后复验：**已确认本次返回导航修复符合预期**，实际反馈为“符合我的预期，请告诉我接下来要做什么”。本人贡献是体验、发现并描述问题、确认修复符合预期；AI贡献是定位、修复和自动化验证。仍需补充本次真实反馈与修复回复的聊天截图、返回入口及返回后保留筛选的总览截图，以及实际耗时。此确认不代表所有界面和边界情况均已完成验收。

完整事实记录、真实输出摘要和待执行提示词建议见 `docs/ai-collaboration.md`。所有对话截图都应从实际Codex界面截取，不制作仿对话图片。

### 补充案例：AI部署配置错误与修复

部署时用户提供Render失败截图。AI检查发现自己在提交5e5e647中把Dockerfile健康检查指令写成CMD-SHELL，实际应使用CMD。此前JavaScript语法检查与原型测试都不能验证Dockerfile语法，因此没有发现该错误。本地Docker引擎未启动，AI也未完成容器构建验证。

修复提交为a9671ee。用户第一次仍查看旧部署5e5e647的失败记录，AI根据SOURCE字段指出版本不同，随后用户推送新代码。Render自动构建成功，用户在无痕窗口打开公网走势页面。这个过程表明，必须对照实际部署的提交编号，并验证与变更类型相关的构建，而不能仅凭其他测试通过认定部署可用。

![Render旧配置构建失败](evidence/render-build-failure.png)

修复后的真实上线截图见文末，完整记录见 `deployment-review.md`。学生贡献为实际执行、提供失败及成功证据；AI贡献为定位自己的错误、修正和后续公网只读验证。

<a id="architecture"></a>
## 七、设计实现过程

### 7.1 功能结构图

```mermaid
flowchart TB
  U[浏览器工作台] --> O[首页Top10与关键词图谱]
  U --> L[论文库 增删改查]
  U --> C[单篇/批量/会议采集]
  U --> T[三会趋势动画 / 年度榜单]
  U --> A[会议介绍与来源审计]
  L -->|本地未命中| S[在线标题检索]
  C --> R[CVF/ECVA官方来源 DBLP备用]
  S --> R
  R --> P[解析摘要/原文 词典标签 校验去重]
  P --> D[(SQLite papers)]
  L <--> D
  D --> K[文档频数/占比/共现统计]
  K --> O
  K --> T
```

若博客平台不支持Mermaid，应导出真实架构图再上传，不能保留无法渲染的代码块。

### 7.2 数据模型与查询

`papers` 保存id、title、normalized_title、conference、year、abstract、authors、keywords、source_url、paper_url、keyword_method、retrieved_at、updated_at。唯一约束为规范化标题+会议+年份，避免同篇重复，同时保留跨会议/年份同名版本。

查询使用绑定参数；精确查询比较规范化标题，模糊查询匹配标题、摘要、关键词或编号；对LIKE通配符进行转义。手工编辑后再次采集不会覆盖已有修改。

### 7.3 数据流与失败处理

标题→官方目录定位→详情解析→校验→关键词提取→SQLite。抓取只允许官方HTTPS域名，不跟随任意重定向；设置20秒超时、32MB上限、400ms间隔和24小时缓存。批量最多30条，每条有成功/失败结果；摘要缺失如实标注，网络失败不生成替代内容。

189篇样本分布为CVPR 94、ICCV 47、ECCV 48。来源列表条目数与会议录取总数不一定一致，不对齐或改造官方数据来迎合作业示例。

### 7.4 图谱和动画

图谱取出现频数最高的最多16个词，节点大小与频数有关；每篇论文的标签两两配对累加边权，最多展示50条边。SVG节点支持点击和键盘进入论文列表。

趋势返回每会议每年份的count、percent、total和status。已采集但没有该词为0；未举办/未采集为null。前端播放定时推进滑块，切换路由清理定时器；避免多个页面动画继续占用资源。年度榜单每年重新排序。

### 7.5 部署设计

老师后续群通知允许个人练习使用其他免费平台，本次选择Render Free Docker服务，CodeArts继续保存课程代码。Docker以非root用户运行，容器启动导入189篇样本；Render设置PORT，应用监听0.0.0.0，公网写接口使用自动生成的ADMIN_TOKEN。免费实例空闲休眠，SQLite没有持久磁盘，重启或重新部署可能丢失用户修改并恢复种子数据。项目另有Compose具名卷方案，但本次Render未使用该方案。详见 `deploy/README.md` 和 `deployment-review.md`。

<a id="code"></a>
## 八、关键代码与解释

以下摘自最终源码，约300行；文件名标明模块，不把互相独立的片段误当作可直接合并运行的单文件。AI生成的代码同样需要本人解释。

本节源码共 **303 行**（含注释与空行）。

### 8.1 src/database.mjs

数据层负责校验、绑定SQL参数和去重。save在冲突时返回已存在记录而非覆盖，保护人工编辑；list以相同筛选口径服务论文库与统计。规范化标题只是匹配键，展示仍保留原始标题。

```javascript
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { cleanKeywords, extractKeywords, normalizeText } from './keywords.mjs';

export const CONFERENCES = ['CVPR', 'ICCV', 'ECCV'];

export function validatePaper(input) {
  const title = String(input.title || '').trim();
  if (title.length < 3 || title.length > 600) throw new Error('论文标题需为3至600字符');
  const conference = String(input.conference || '').toUpperCase();
  if (!CONFERENCES.includes(conference)) throw new Error('会议仅支持 CVPR、ICCV、ECCV');
  const year = Number(input.year);
  if (!Number.isInteger(year) || year < 2000 || year > new Date().getFullYear() + 1) throw new Error('年份不合法');
  if ((conference === 'ICCV' && year % 2 === 0) || (conference === 'ECCV' && year % 2 === 1)) {
    throw new Error('ICCV 为奇数年、ECCV 为偶数年，请核对会议年份');
  }
  const abstract = String(input.abstract || '').trim();
  if (abstract.length > 30000) throw new Error('摘要过长');
  const links = {};
  for (const key of ['sourceUrl', 'paperUrl']) {
    const value = String(input[key] || '').trim();
    if (value) {
      let url;
      try { url = new URL(value); } catch { throw new Error('论文链接格式不正确'); }
      if (url.protocol !== 'https:' || url.username || url.password) throw new Error('论文链接必须是 HTTPS');
    }
    links[key] = value;
  }
  return { title, conference, year, abstract, ...links,
    authors: String(input.authors || '').slice(0, 4000),
    keywords: input.keywords === undefined ? extractKeywords(title, abstract) : cleanKeywords(input.keywords),
    keywordMethod: input.keywordMethod === 'manual' ? 'manual' : 'controlled-vocabulary-v1',
    retrievedAt: String(input.retrievedAt || new Date().toISOString()).slice(0, 40),
  };
}

export function openDatabase(path = 'var/papers.sqlite') {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS papers (
      id INTEGER PRIMARY KEY, title TEXT NOT NULL, normalized_title TEXT NOT NULL,
      conference TEXT NOT NULL, year INTEGER NOT NULL, abstract TEXT NOT NULL,
      authors TEXT NOT NULL, keywords TEXT NOT NULL, source_url TEXT NOT NULL,
      paper_url TEXT NOT NULL, keyword_method TEXT NOT NULL, retrieved_at TEXT NOT NULL,
      updated_at TEXT NOT NULL, UNIQUE(normalized_title, conference, year)
    ); CREATE INDEX IF NOT EXISTS papers_scope ON papers(conference, year);`);
  function decode(row) {
    if (!row) return null;
    return { id: row.id, title: row.title, conference: row.conference, year: row.year,
      abstract: row.abstract, authors: row.authors, keywords: JSON.parse(row.keywords),
      sourceUrl: row.source_url, paperUrl: row.paper_url, keywordMethod: row.keyword_method,
      retrievedAt: row.retrieved_at, updatedAt: row.updated_at };
  }
  const get = id => decode(db.prepare('SELECT * FROM papers WHERE id = ?').get(id));
  function save(input, id = null) {
    const p = validatePaper(input);
    const norm = normalizeText(p.title);
    const duplicate = db.prepare('SELECT id FROM papers WHERE normalized_title=? AND conference=? AND year=?').get(norm, p.conference, p.year);
    if (duplicate && duplicate.id !== id) return { paper: get(duplicate.id), created: false, duplicate: true };
    const values = [p.title, norm, p.conference, p.year, p.abstract, p.authors,
      JSON.stringify(p.keywords), p.sourceUrl, p.paperUrl, p.keywordMethod, p.retrievedAt, new Date().toISOString()];
    if (id !== null) {
      if (!get(id)) throw new Error('论文不存在');
      db.prepare(`UPDATE papers SET title=?, normalized_title=?, conference=?, year=?, abstract=?,
        authors=?, keywords=?, source_url=?, paper_url=?, keyword_method=?, retrieved_at=?, updated_at=? WHERE id=?`).run(...values, id);
      return { paper: get(id), created: false };
    }
    const result = db.prepare(`INSERT INTO papers(title, normalized_title, conference, year, abstract,
      authors, keywords, source_url, paper_url, keyword_method, retrieved_at, updated_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).run(...values);
    return { paper: get(Number(result.lastInsertRowid)), created: true };
  }
  function list({ q = '', exact = false, conference = '', year = '', keyword = '' } = {}) {
    const params = [];
    const clauses = [];
    if (conference) { clauses.push('conference=?'); params.push(conference); }
    if (year) { clauses.push('year=?'); params.push(Number(year)); }
    if (q) {
      if (exact) { clauses.push('normalized_title=?'); params.push(normalizeText(q)); }
      else {
        clauses.push("(title LIKE ? ESCAPE '\\' OR abstract LIKE ? ESCAPE '\\' OR keywords LIKE ? ESCAPE '\\' OR CAST(id AS TEXT)=?)");
        const like = `%${q.replace(/[\\%_]/g, '\\{{KEY_CODE}}')}%`;
        params.push(like, like, like, q);
      }
    }
    const rows = db.prepare(`SELECT * FROM papers ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''} ORDER BY year DESC, id DESC`).all(...params).map(decode);
    return keyword ? rows.filter(p => p.keywords.includes(keyword)) : rows;
  }
  return { db, get, save, list, remove: id => Number(db.prepare('DELETE FROM papers WHERE id=?').run(id).changes), close: () => db.close() };
}
```

### 8.2 src/crawler.mjs

抓取层把“网络获取”“HTML解析”“标题定位”分开。官方列表同时提供会议/年份元信息；详情只读取官方摘要。白名单、禁止重定向、限速、缓存、超时与响应大小限制分别控制目标、负载和失败边界。DBLP反机器人HTML不能当作JSON或摘要。

```javascript
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { normalizeText, extractKeywords } from './keywords.mjs';

const HOSTS = new Set(['openaccess.thecvf.com', 'www.ecva.net', 'ecva.net', 'dblp.org']);
export const EDITIONS = [
  ['CVPR', 2022], ['ECCV', 2022], ['CVPR', 2023], ['ICCV', 2023],
  ['CVPR', 2024], ['ECCV', 2024], ['CVPR', 2025], ['ICCV', 2025],
];

export function allowedUrl(value) {
  const u = new URL(value);
  if (u.protocol !== 'https:' || !HOSTS.has(u.hostname) || u.port || u.username || u.password) {
    throw new Error('只能抓取 CVF、ECVA、DBLP 官方 HTTPS 地址');
  }
  return u.href;
}

export function plainText(html) {
  return String(html).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]*>/g, ' ').replace(/&(?:#(x[\da-f]+|\d+)|([a-z]+));/gi, (s, n, name) => {
      if (n) {
        const code = n[0].toLowerCase() === 'x' ? parseInt(n.slice(1), 16) : Number(n);
        return code <= 0x10ffff ? String.fromCodePoint(code) : '';
      }
      return ({ amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ', ndash: '–', mdash: '—' })[name.toLowerCase()] || s;
    }).replace(/\s+/g, ' ').trim();
}

function attributes(tag) {
  const result = {};
  for (const m of tag.matchAll(/([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    result[m[1].toLowerCase()] = plainText(m[2] ?? m[3] ?? m[4]);
  }
  return result;
}

export function parseList(html, base, conference, year) {
  const papers = [];
  const seen = new Set();
  for (const m of html.matchAll(/<dt\b[^>]*class\s*=\s*["']ptitle["'][^>]*>([\s\S]*?)<\/dt>/gi)) {
    const a = m[1].match(/<a\b([^>]*)>([\s\S]*?)<\/a>/i);
    if (!a) continue;
    const href = attributes(a[1]).href;
    if (!href) continue;
    const sourceUrl = allowedUrl(new URL(href, base).href);
    if (conference === 'ECCV' && !sourceUrl.toLowerCase().includes(`eccv_${year}`)) continue;
    if (seen.has(sourceUrl)) continue;
    seen.add(sourceUrl);
    papers.push({ title: plainText(a[2]), conference, year, sourceUrl });
  }
  return papers;
}

export function parseDetail(html, entry) {
  const meta = {};
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const a = attributes(m[0]);
    if (a.name && a.content) (meta[a.name] ||= []).push(a.content);
  }
  const abstract = plainText(html.match(/<div\b[^>]*id=["']abstract["'][^>]*>([\s\S]*?)<\/div>/i)?.[1] || '');
  const title = meta.citation_title?.[0] || plainText(html.match(/<div\b[^>]*id=["']papertitle["'][^>]*>([\s\S]*?)<\/div>/i)?.[1] || entry.title);
  let paperUrl = meta.citation_pdf_url?.[0] || '';
  if (!paperUrl) {
    for (const a of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
      const href = attributes(a[1]).href;
      if (href && /\.pdf(?:\?|$)/i.test(href) && !/supp/i.test(href)) { paperUrl = new URL(href, entry.sourceUrl).href; break; }
    }
  }
  if (paperUrl) paperUrl = allowedUrl(paperUrl);
  if (!title || (!abstract && !paperUrl)) throw new Error('官方页面缺少可解析的论文信息，未保存');
  return { ...entry, title, abstract, paperUrl,
    authors: meta.citation_author?.join('; ') || plainText(html.match(/<div\b[^>]*id=["']authors["'][^>]*>([\s\S]*?)<\/div>/i)?.[1] || ''),
    keywords: extractKeywords(title, abstract), keywordMethod: 'controlled-vocabulary-v1',
    retrievedAt: new Date().toISOString() };
}

export function createCrawler({ cacheDir = 'var/cache', fetcher = fetch, delay = 400 } = {}) {
  mkdirSync(cacheDir, { recursive: true });
  let queue = Promise.resolve();
  const memoryLists = new Map();
  async function get(url) {
    url = allowedUrl(url);
    const file = join(cacheDir, createHash('sha256').update(url).digest('hex') + '.html');
    if (existsSync(file) && Date.now() - statSync(file).mtimeMs < 86400000) return readFileSync(file, 'utf8');
    const task = queue.then(async () => {
      await new Promise(resolve => setTimeout(resolve, delay));
      const response = await fetcher(url, { redirect: 'error', signal: AbortSignal.timeout(20000),
        headers: { 'User-Agent': 'VisionTrendsCourseProject/1.0 (educational, cached, rate-limited)', Accept: 'text/html,application/json' } });
      if (!response.ok) throw new Error(`来源网站返回 HTTP ${response.status}`);
      const chunks = [];
      let size = 0;
      for await (const chunk of response.body) {
        size += chunk.length;
        if (size > 32 * 1024 * 1024) throw new Error('来源响应超过32MB限制');
        chunks.push(chunk);
      }
      const text = Buffer.concat(chunks).toString('utf8');
      if (/anubis_challenge|Making sure you.*not a bot/i.test(text)) throw new Error('来源网站启用了人机验证，请使用官方会议列表');
      writeFileSync(file, text);
      return text;
    });
    queue = task.catch(() => {});
    return task;
  }
  async function list(conference, year) {
    if (!EDITIONS.some(([c, y]) => c === conference && y === Number(year))) throw new Error('当前支持2022—2025已收录的三会届次');
    const key = `${conference}${year}`;
    if (memoryLists.has(key)) return memoryLists.get(key);
    const url = conference === 'ECCV' ? 'https://www.ecva.net/papers.php' : `https://openaccess.thecvf.com/${conference}${year}?day=all`;
    const entries = parseList(await get(url), url, conference, Number(year));
    if (!entries.length) throw new Error('会议页面未解析到论文，请检查官网结构');
    memoryLists.set(key, entries);
    return entries;
  }
  async function detail(entry) { return parseDetail(await get(entry.sourceUrl), entry); }
  async function search(title, { conference, year, limit = 3, exact = false } = {}) {
    const query = normalizeText(title);
    if (query.length < 3) throw new Error('在线检索至少需要3个有效字符');
    const editions = EDITIONS.filter(([c, y]) => (!conference || c === conference) && (!year || y === Number(year))).toReversed();
    const candidates = [];
    const warnings = [];
    // Official indexes remain usable when DBLP presents an anti-bot challenge.
    for (const [c, y] of editions) {
      try {
        const entries = await list(c, y);
        for (const entry of entries) {
          const n = normalizeText(entry.title);
          if (n === query || (!exact && n.includes(query))) candidates.push({ ...entry, score: n === query ? 2 : 1 });
        }
      } catch (error) { warnings.push(`${c} ${y}: ${error.message}`); }
    }
    if (!candidates.length) {
      try {
        const url = `https://dblp.org/search/publ/api?q=${encodeURIComponent(title)}&format=json&h=20`;
        const data = JSON.parse(await get(url));
        for (const hit of data.result?.hits?.hit || []) {
          const info = hit.info;
          const venue = String(info.venue);
          const c = ['CVPR', 'ICCV', 'ECCV'].find(x => new RegExp(`\\b${x}\\b`).test(venue));
          if (!c || /workshop/i.test(venue) || (conference && c !== conference) || (year && Number(info.year) !== Number(year))) continue;
          const n = normalizeText(info.title);
          if (!(n === query || (!exact && n.includes(query)))) continue;
          const urls = Array.isArray(info.ee) ? info.ee : [info.ee];
          const ee = urls.map(x => typeof x === 'object' ? x.text : x).find(x => /^https:\/\/(openaccess\.thecvf\.com|(?:www\.)?ecva\.net)\//.test(x || '') && !/\.pdf$/.test(x));
          if (ee) candidates.push({ title: info.title, conference: c, year: Number(info.year), sourceUrl: ee, score: n === query ? 2 : 1 });
        }
      } catch (error) { warnings.push(`DBLP: ${error.message}`); }
    }
    const papers = [];
    for (const entry of candidates.sort((a, b) => b.score - a.score).slice(0, limit)) {
      try { papers.push(await detail(entry)); } catch (error) { warnings.push(`${entry.title}: ${error.message}`); }
    }
    return { papers, warnings };
  }
  return { get, list, detail, search };
}
```

### 8.3 src/analytics.mjs

统计层先对每篇标签去重，再累加文档频数与两两共现。趋势严格区分0与null，并同时返回样本分母，让占比可以复算。CSV导出对特殊字符转义并中和公式开头。

```javascript
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
```


**阅读后自测**：我能否不看AI解释，独立画出查询、抓取、去重、更新和统计的数据流？我能否说明null和0的差异，并手算两篇论文的共现边权？待本人实际完成后记录答案。

<a id="tests"></a>
## 九、测试与修复

当前30项自动化测试曾通过（16项核心、6项导航、8项原型模拟），覆盖CRUD、持久化、去重、关键词边界、统计、缺失年份、CSV、官网解析、错误响应、访问权限和在线回退。`docs/test-before-fix.txt`与`docs/test-after-fix.txt`保留真实前后结果。

另外通过真实HTTP接口采集ICCV 2023《Segment Anything》，取得866字符官方摘要、关键词和PDF链接，随后精确查询命中。使用临时内存库，不修改正式样本；结果见 `docs/live-smoke.json`。首页与前端资源返回200，但资源可访问不等于浏览器交互已验收。

Node默认测试子进程受当前Windows管理环境限制，测试命令使用非隔离模式；测试数据库仍分别创建。运行时不用Python，Python仅用于可选图表导出。

自动浏览器截图受Windows IPC限制，不能把HTTP测试或统计图视为真实浏览器验收。用户已手动浏览本地网站并确认返回导航可用；Figma插件执行有成功截图，原型返回路径已由用户确认，分享链接已由用户通过无痕窗口验证可访问。现已在Render部署；用户无痕窗口截图证明公网走势页可见。AI只读检查健康、论文列表、趋势和权限配置4个接口均返回200，论文总数189，详见 `cloud-readonly-check.json`；之后用户确认云端CRUD成功，并提供单篇采集、精确查询、详情与来源的5张截图；随后批量TXT导入截图显示2/2成功；未命中联网查询与动画等场景待验证。

<a id="reflection"></a>
## 十、心路历程、收获（必须本人写）

以下是写作引导，不是可直接提交的代写感想：

1. 阅读《构建之法》第4章后，我怎样理解驾驶员与领航员？本次我实际承担了哪些判断和审阅？
2. 哪一次AI输出让我误以为正确？我是怎样核实的？请给出具体输入、现象和证据。
3. 我在哪个模块从“能运行”进步到“能解释”？用一段自己的话说明设计。
4. 与最初预估相比，实际时间耗在哪？如果重做，我会改变哪一个协作步骤？
5. 如果换成人类结对伙伴，哪些沟通和相互负责的机制会不同？AI无法替我承担什么责任？

本人正文：____（建议400—700字，结合真实操作与截图）。

<a id="evaluation"></a>
## 十一、对AI结对伙伴的评价（本人核实后改写）

可参考的具体事实：AI快速形成需求清单和跨模块实现，并用测试发现自己的标签更新Bug；面对DBLP人机验证调整了数据来源路径。但最初环境判断不完整，浏览器工具受限也没有完成UI视觉验收。一次大规模生成容易使学生缺少主动设计和审查，必须用实际修改与复现补上。

与人人结对相比，人机结对能快速给出多个候选方案和代码草稿，却不具备同学对课程上下文的共同经验，也不能替代学生对需求取舍、证据真实性和提交负责。AI可能产生幻觉、过时API、遗漏状态或安全问题；来源校验、测试和本人理解仍然必要。

本人评价：我采纳____，拒绝____；最大的贡献____，最明显的局限____；下一次我会要求AI先____，再____。

<a id="submission"></a>
## 十二、发布与提交核对

- CodeArts已存在学号项目、27次提交截图、两个分支、v1.0.0标签和源码包；需要补同步后续修复，实际完成Issue/PR审阅证据。
- 整理设计过程与本人修改证据，补充尚未完成的原型交互。
- 已按老师更新通知免费部署到Render，给出真实公网URL和访问截图；云端CRUD及单篇采集已有用户验证，批量TXT导入已有2/2成功截图，未命中联网查询与动画等场景待补。
- 补真实界面展示、对话截图、个人PSP与感想，不把占位内容当完成。
- 发布博客后测试目录、图床、GIF和外部链接；在2026-09-24 23:59前通过课程页面提交，留意审核及班级群额外通知。

![CodeArts提交与分支](evidence/codearts-history.png)

![v1.0.0标签](evidence/codearts-tag.png)

![版本包上传成功](evidence/codearts-artifact-upload.png)

上图发布版本仍显示latest；后续本人确认已改为1.0.0，最终字段截图待补。

![Render部署成功](evidence/render-live.png)

详细清单见 `docs/submission-checklist.md`。
