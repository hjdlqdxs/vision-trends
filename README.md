# 视界 · Vision Trends

面向初学者的 CVPR、ICCV、ECCV 论文管理和研究方向探索平台。采用 Node.js 22 内置 HTTP、SQLite 和原生 JavaScript，无第三方运行时依赖；程序由独立源码实现，未使用原型工具导出的代码。

## 作业信息

- 学号 / 姓名：**102400409 / 郑雯心**
- 课程地址：[福州大学软件工程实践2026](https://bbs.csdn.net/forums/FZU_university_2026)
- 作业地址：[第二次作业——与AI结对编程](https://bbs.csdn.net/topics/620526370)
- CodeArts 项目：[102400409](https://devcloud.cn-north-4.huaweicloud.com/projectman/scrum/3c8a2a500474485cb17c62c02c96db74/workitem/backlog)
- CodeArts 仓库：[vision-trends](https://devcloud.cn-north-4.huaweicloud.com/codehub/project/3c8a2a500474485cb17c62c02c96db74/codehub/3089334/home)
- AI 编程助手：Codex，本会话系统标识 GPT-6；负责需求草稿、代码、测试和文档初稿。学生审阅、修改和理解记录待本人补充。
- 截止时间：2026-09-24 23:59（以课程通知为准）。

## 在线访问

- [公网网站（Render Free）](https://vision-trends.onrender.com/)
- [健康检查](https://vision-trends.onrender.com/api/health)
- [GitHub部署镜像仓库](https://github.com/hjdlqdxs/vision-trends)

按老师后续通知，本次个人作业可使用其他免费平台，团队项目仍要求华为云。2026-09-23用户截图确认部署成功及无痕访问；AI只读检查健康、189篇论文列表、趋势和权限配置接口均返回200。证据见 [部署验收记录](docs/deployment-review.md)。Free实例空闲后会休眠，本地SQLite没有持久磁盘，重启/重新部署可能丢失后续修改并重新载入样本；它是课程演示实例。

## 快速启动

安装 Node.js 22.13+（建议 22 LTS），在项目目录运行：

```sh
npm run seed
npm start
```

浏览器打开 http://127.0.0.1:3000 。重复 seed 不会覆盖已修改数据。`npm test` 执行测试，`npm run check` 检查源码语法。默认数据库在 `var/papers.sqlite`。

## 功能

单篇 / 批量标题抓取、会议列表抓取、论文增删改查、本地未命中时联网搜索、Top 10 方向、可点击共现图谱、多年三会热度对比和动画、年度榜单、CSV 导出、数据来源与统计口径。

## 数据来源与局限

CVF Open Access（https://openaccess.thecvf.com/）、ECCV ECVA（https://www.ecva.net/papers.php）和 DBLP 公开检索 API（https://dblp.org/faq/How+to+use+the+dblp+search+API.html）。DBLP 用于标题定位，不冒充摘要来源；摘要只取官方论文页面，未提供时留空并标记缺失。关键词由本项目受控领域词典提取，不称为作者关键词。内置数据的真实采集来源、样本数量和日期见 `data/provenance.json`。

统计只反映已入库样本，不能代表三大会议整体趋势。详情保留来源和采集时间。默认写操作仅开放本地，云端需设置 `ADMIN_TOKEN`，详见 [部署手册](deploy/README.md)。

## 材料入口

- [需求、NABCD 与验收标准](docs/requirements.md)
- [PSP 预估与实际记录](docs/psp.md)
- [代码规范](codestyle.md)
- [博客草稿](docs/blog.md)
- [交付状态与待办](docs/submission-checklist.md)
- [AI 协作真实记录](docs/ai-collaboration.md)
- [原型说明](prototype/README.md)

本地开发提交使用 `Codex AI <codex-ai@local.invalid>` 作者标识，保留真实时间，不代表学生本人完成了人工审阅。外部发布、专用工具实际操作、个人反思不能由文件占位视为完成。
