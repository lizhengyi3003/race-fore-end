# 涉农信贷风控系统 · 竞赛前端（fore-end）

> 挑战杯创业计划竞赛（东北振兴产业升级专项赛）· 数智赋能产业组
> 面向用户的演示前端：数据录入 → 信用评估 → 结果展示，配套数据看板与团队介绍

## 技术栈

Vue 3.5（`<script setup>` SFC）+ TypeScript 6 + Vite 8 + Element Plus + Pinia + Vue Router（Hash 路由）+ ECharts（vue-echarts）+ Axios + Sass

## 功能页面

| 路由 | 页面 | 说明 | 权限 |
|---|---|---|---|
| `/home` | 项目介绍 | 系统与「四大维度 15 项替代数据指标」体系介绍 | 公开 |
| `/login` | 登录 | 邀约制登录（无注册，账号由后台管理平台开通） | 公开 |
| `/input` | 数据录入 | 15 项指标表单（土地经营/农业补贴/农业保险/产销经营），信贷员 3 分钟完成录入 | 需登录 |
| `/result` | 评估结果 | 信用评分仪表盘（0-1000）· 风险等级 · 违约概率 · 授信建议 · 15 项指标贡献 · 前三项扣分原因 · 打印报告 | 需登录 |
| `/dashboard` | 数据看板 | 评分分布 / 评估趋势 / 行业分布等统计图表 | 需登录 |
| `/team` | 团队介绍 | 团队成员展示 | 公开 |

## 本地启动

```bash
cd fore-end
npm install
npm run dev        # http://localhost:5174，/api 代理到 localhost:8000
```

环境变量：

| 文件 | 值 | 说明 |
|---|---|---|
| `.env.development` | `VITE_API_BASE_URL=/api/v1` | 开发走 Vite 代理（vite.config.ts 代理到 :8000） |
| `.env.production` | `VITE_API_BASE_URL=https://api.intellicoretech.cn/api/v1` | 生产直连后端 API |

## 与后端契约

- 接口封装：`src/api/`（`auth.ts` 登录、`risk.ts` 评估、`types.ts` 类型契约）
- 15 项指标类型与四大维度分类：`src/api/types.ts`（`RiskInput` / `CATEGORIES`）
- 本地演示兜底评分卡：`src/utils/riskModel.ts`（评分中心 600，仅接口异常时兜底）
- 登录态：`src/stores/auth.ts`（token 存 `race_token`，401 自动清理并跳登录）
- 评估表单状态：`src/stores/risk.ts`
- 路由守卫：`src/router/index.ts`（`/input` `/result` `/dashboard` 需登录）

## 质量检查

```bash
npm run lint        # eslint . --max-warnings=0
npm run format      # prettier --write src/**
npm run build       # vue-tsc + vite 构建验证
```

## 部署（Cloudflare Pages）

1. 构建命令 `npm run build`，输出目录 `dist`
2. 项目使用 Hash 路由（`createWebHashHistory`），无需配置 SPA rewrite 规则
3. 生产 API 地址在 `.env.production` 中配置
4. 部署后访问 https://intellicoretech.cn
