# 华为云 ECS / CodeArts 部署与发布

当前状态：已在Render Free部署 https://vision-trends.onrender.com/ ，用户提供成功与无痕访问截图；4项公网只读API检查通过。CodeArts已上传首批历史和源码包，后续修复仍需同步。老师已允许个人作业使用其他免费平台，下面ECS方案仅作可选资料。

## 免费 Render 部署（本次个人作业推荐）

老师已说明个人练习无需强制使用华为云。项目根目录的 `render.yaml` 已配置免费 Docker Web Service。Render 免费实例会休眠，首次访问可能等待几十秒；免费实例没有持久磁盘，SQLite 写入在实例重启或重新部署后可能恢复为种子数据，适合课程演示，不适合作为生产服务。

1. 将本仓库同步到自己的 GitHub **公开仓库**，不要提交 `.env`、密码或私钥。
2. 注册/登录 [Render](https://render.com/)，选择 **New → Blueprint**，连接 GitHub 并选择该仓库。
3. Render 读取 `render.yaml`，确认服务名 `vision-trends`、计划 `Free`，点击 **Apply**。配置会自动生成 `ADMIN_TOKEN`，不要把它写入博客或截图。
4. 等待部署完成，在 Render 的服务页打开 `https://你的服务名.onrender.com`，先访问 `/api/health`，应返回 `{"ok":true,"version":"1.0.0"}`，再检查总览、论文库、图谱和趋势页面。
5. 将真实 Render URL 填入博客，并截图部署日志、健康检查和网页访问结果。首次唤醒较慢属于免费实例限制。

## 1. CodeArts 项目与仓库

1. 在 CodeArts 新建项目，项目名称使用**本人学号**，创建空仓库，不勾选自动 README。
2. 在本地项目目录设置远端（替换 URL）。保留现有真实 AI commit，不改写作者或时间。

```sh
git remote add origin YOUR_CODEARTS_REPOSITORY_URL
git push -u origin main
git push -u origin dev
git push origin v1.0.0
```

3. 学生实际审阅并修改后，在 dev 分支提交自己的修改；使用本人 Git 身份，准确说明修改原因。
4. CodeArts 新建 Issue，例如“人工复核领域词典和样本覆盖”；完成后用真实 PR 将 dev 合并 main。不要创建虚构的评审记录。
5. 本账号CodeArts仓库界面没有独立Release入口；实际使用仓库v1.0.0标签，加“制品仓库→软件发布库”上传vision-trends-1.0.0.zip，发布版本设为1.0.0。用户已提供上传截图并确认版本字段修改；不要把它描述为未出现的GitHub式Release页面。

## 2. ECS 容器部署

使用已开通的华为云 Linux ECS（例如 Ubuntu 22.04/24.04），安装 Docker Engine 与 Compose 插件。安装方法以 [Docker Ubuntu 官方文档](https://docs.docker.com/engine/install/ubuntu/) 为准。

```sh
git clone YOUR_CODEARTS_REPOSITORY_URL vision-trends
cd vision-trends
cp .env.example .env
# 编辑 .env：设置至少16字符随机 ADMIN_TOKEN；不要使用示例字符串。
docker compose up -d --build
docker compose ps
curl --fail http://127.0.0.1/api/health
```

在华为云安全组放行 TCP 80。22 端口仅允许本人管理地址；不要开放数据库文件或其他调试端口。浏览器打开 `http://ECS_PUBLIC_IP/` 验证六类页面，并在博客填写实际 URL。

Docker 镜像构建会拉取 Node 22，需要服务器能访问镜像源；运行时无 npm 第三方依赖。具名卷保存 SQLite 和抓取缓存，更新镜像不会清空数据。禁止用 `docker compose down -v` 作为更新步骤。

公开演示可使用 HTTP 只读访问；管理员编辑建议配置 HTTPS 或 SSH 本地转发后操作，避免口令在明文网络传输。已持有域名可通过 Nginx/Caddy 配置证书，按服务器现有环境适配。

## 3. 不使用 Docker 的运行方式

服务器安装 Node.js 22.13+，项目目录执行：

```sh
node scripts/seed.mjs
export HOST=0.0.0.0
export PORT=3000
export ADMIN_TOKEN='YOUR_OWN_RANDOM_SECRET'
node src/server.mjs
```

生产运行应使用 systemd 等服务管理器。此方式安全组开放对应端口，博客 URL 应包含端口。数据库默认在项目 `var/`；使用环境变量 DB_PATH 可更改路径。

## 4. CodeArts 流水线阶段建议

1. 从 main 拉取代码。
2. Node 22 环境运行 `npm run check`、`npm test`。
3. 构建镜像，或通过 CodeArts Deploy 的 SSH 主机任务同步源码。
4. 在 ECS 项目目录执行 `docker compose up -d --build`。
5. HTTP 健康检查 `curl --fail http://127.0.0.1/api/health`。
6. 从另一台设备访问公网 URL，检查资源加载、只读图表、口令保护、刷新后数据持久化。

凭据使用 CodeArts 的服务连接/凭据管理功能，不写进仓库或博客截图。

## 5. 验收证据（必须真实补充）

- ECS 实例与安全组截图（遮挡敏感字段）。
- CodeArts 项目、dev/main、提交记录、PR、Release 截图。
- 公网访问截图及健康检查结果。
- 服务器更新后论文编辑仍然保留的验证记录。
- 实际 URL、发布日期、出现的问题与修复过程。
