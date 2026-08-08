# 任务交接：main/dev 双环境部署（后端+隧道+网关）

> 交接日期：2026-08-08。在新对话中可让 Copilot 读取本文件继续任务。

## 背景
竞赛项目「农业信贷风控系统」需要 **main 分支（生产）与 dev 分支（开发）后端同时在线、独立网址**，避免"切分支改代码"。用户已在 Cloudflare 面板给隧道加了 `backend-dev.intellicoretech.cn`。

## 目标架构
```
前端 main (intellicoretech.cn) ─┐
前端 dev 预览 (*.workers.dev) ──┼→ api.intellicoretech.cn (Worker网关 intellicore-worker)
                                  ├─ 非 /dev 前缀 → backend.intellicoretech.cn → 隧道 → :8000 (main容器 race-backend)
                                  └─ /dev 前缀(剥离) → backend-dev.intellicoretech.cn → 隧道 → :8081 (dev容器 race-backend-dev)
```

## 已完成 ✅
1. **服务器 dev 环境**（8.156.70.151，root，SSH key `~/.ssh/id_rsa`）：
   - 目录 `/root/race-back-end-dev`（git checkout dev 分支，当前 7d0c880）
   - 容器 `race-backend-dev`，端口 **8081:8000**，复用 `race-mysql`（external network `race-back-end_default`）
   - compose：`/root/race-back-end-dev/docker-compose.dev.yml`（已提交到后端仓库根目录）
   - 本地验证：localhost:8000/admin=200，localhost:8081/admin=200
2. **deploy-backend.sh**（服务器 /root/）：按分支部署 main→/root/race-back-end、dev→/root/race-back-end-dev，手动触发 dev 部署验证通过
3. **网关 Worker**：`fore-end/cloudflare/intellicore-worker/worker.js` 加 `/dev` 前缀分流（`/dev/admin`→`/admin` 转发到 backend-dev）。**已部署**（wrangler，version e00f9034）。wrangler 已 OAuth 登录（feichuan613@gmail.com）
4. **前端自动分流**：`src/api/index.ts` 按 `location.hostname.endsWith('.workers.dev')` 判断 → 预览走 `/dev/api/v1`，生产走 `/api/v1`；`.env.production` 的硬编码已注释。已推送 dev 分支 `1a4b96b`（Cloudflare 预览构建中）
5. **Cloudflare MCP 已配置**（用户级 `%APPDATA%\Code\User\mcp.json`，5 个：cloudflare / cloudflare-docs / cloudflare-bindings / cloudflare-builds / cloudflare-observability）——**需新对话才加载工具**

## ⚠️ 当前卡点（隧道 origin 协议错误）
- 症状：`api.intellicoretech.cn/admin/`、`/dev/admin/`、直连 backend/backend-dev 全部 **502**
- 根因：Cloudflare 面板 `race-backend-tunnel` 的两条 Public Hostname 的 Service 被配成 **`https://`**：
  - `backend.intellicoretech.cn → https://localhost:8000`（应 http）
  - `backend-dev.intellicoretech.cn → https://localhost:8081`（应 http）
  - cloudflared 日志：`tls: first record does not look like a TLS handshake`，`originService=https://localhost:8000`
- 已确认：本地 ingress 配置无法覆盖远程管理隧道的面板配置（试过 token 模式+config、credentials 模式+config 均无效）
- **解决办法（二选一）**：
  - A. **新对话用 cloudflare MCP（OAuth）直接改隧道配置**（用户已配 MCP，但当前对话工具集旧，需新对话）
  - B. 用户在面板把两条 Service 的 `https://` 改成 `http://`
- 服务器 cloudflared 当前用 credentials 模式（本地配置 `/etc/cloudflared/config.yml` + 凭证 `aa1b1ed6-...json`），QUIC 连接已注册成功（sjc01/sjc06），**连接本身是好的**，只差 ingress 协议

## 验证命令（修复后）
```powershell
curl.exe -s -o NUL -w "main: %{http_code}  " https://api.intellicoretech.cn/admin/
curl.exe -s -o NUL -w "dev: %{http_code}`n" https://api.intellicoretech.cn/dev/admin/
curl.exe -s -o NUL -w "dev-api: %{http_code}  " https://api.intellicoretech.cn/dev/api/v1/indicators/tree
curl.exe -s -o NUL -w "main-api: %{http_code}`n" https://api.intellicoretech.cn/api/v1/indicators/tree
```

## 关键信息
- 服务器：8.156.70.151（阿里云，Ubuntu），SSH：`ssh -i $HOME\.ssh\id_rsa root@8.156.70.151`
- 隧道：`race-backend-tunnel`（id `aa1b1ed6-ad6b-4fe0-ae2d-1b6f6f918aa3`），cloudflared systemd 服务，QUIC + `--region us` + `--edge-ip-version 4`
- 后端仓库：github.com/lizhengyi3003/race-back-end（本地 `e:\Project\Web\race\back-end`，远程 origin，dev 分支）
- 前端仓库：github.com/lizhengyi3003/race-fore-end（本地 `e:\Project\Web\race\fore-end`，远程 github，dev 分支）
- 数据库：race-mysql（docker），本地 127.0.0.1:3307/race（root/race123456）
- 线上 API 网关：api.intellicoretech.cn（intellicore-worker）
- 管理后台：`/admin`（后端 main.py 挂载 admin-web/dist，dev 容器同样有）
- Cloudflare 账户：d08d42f9b1e53cc1648cdc9c1eab5a0e（feichuan613@gmail.com）

## 待办
1. ✅ **已修复**：隧道 origin 协议 https→http（2026-08-08 完成，见下方"修复记录"）
2. ✅ **已完成**：前端 dev 预览构建成功 + 端到端登录验证（走 /dev/api/v1）
3. ✅ **已确认**：dev 预览 URL = https://fb895e3a-race-fore-end.feichuan613.workers.dev（别名 dev-race-fore-end.feichuan613.workers.dev）

## ✅ 修复记录（2026-08-08，cloudflare MCP 完成）
- **操作**：cloudflare MCP 调 API `PUT /accounts/{acct}/cfd_tunnel/aa1b1ed6-ad6b-4fe0-ae2d-1b6f6f918aa3/configurations`，
  把两条 Public Hostname Service 的 `https://` 改为 `http://`（version 2→3，source=cloudflare）
- **关键**：改完面板配置后，**必须重启服务器 cloudflared 服务**才重新拉取配置（日志：
  `Updated to new configuration ... version=3`）。重启后连接注册 sjc05/sjc06 QUIC 正常
- **注意**：重启后首次请求可能仍 502（预热/边缘同步瞬时），稍等几秒再验证即 200
- 服务器本地 config.yml 一直是对的（http），但远程管理隧道**面板配置优先**，本地无法覆盖
- **最终验证（全链路）**：
  - main: `/admin/`=200、`/api/v1/indicators/tree`=200、登录=200(JWT)
  - dev: `/dev/admin/`=200、`/dev/api/v1/indicators/tree`=200、登录=200(JWT)
  - 前端 dev 预览(https://fb895e3a-race-fore-end.feichuan613.workers.dev)：首页 200、登录成功跳转首页
  - 前端 api chunk 确认分流：`hostname.endsWith(".workers.dev") ? "/dev/api/v1" : "/api/v1"`
