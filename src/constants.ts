/**
 * 全局常量：应用信息与本地存储键
 * ------------------------------------------------------------------
 * 统一维护应用名称、版本号、本地存储键等，避免各文件硬编码分散导致改一处漏一处。
 * 升级版本时：同步修改本文件 APP_VERSION 与 package.json 的 version 字段。
 */

/** 应用简称（侧边栏 / 登录页 / 路由标题统一使用） */
export const APP_NAME = '涉农信贷风控系统'

/** 应用全称（首页标题 / 打印报告等正式场景使用） */
export const APP_FULL_NAME = '涉农小微企业信贷风险智能评估系统'

/** 当前版本号（与 package.json 的 version 字段同步维护） */
export const APP_VERSION = '1.9.0'

/** 页面头部版本徽标文案 */
export const APP_VERSION_BADGE = `Demo v${APP_VERSION}`

/** 本地存储：登录 token */
export const TOKEN_KEY = 'race_token'

/** 本地存储：当前登录用户 JSON */
export const USER_KEY = 'race_user'

/** 页脚版权文案（布局与登录页共用） */
export const FOOTER_TEXT = '© 2026 涉农信贷风控系统 · "挑战杯"创业计划竞赛 · 东北乡村振兴'
