import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { APP_NAME } from '@/constants'

/**
 * 懒加载包装：当路由组件 chunk 加载失败时（通常因部署更新后旧 chunk 已从线上移除，
 * 而当前页面仍运行旧版入口），自动刷新页面加载最新版本，避免页面卡在旧路由。
 * 增加超时兜底：chunk 网络挂起（如隧道 HTTP2 PING 失败）超时后同样自动刷新，防止导航卡死。
 */
const MAX_AUTO_RELOAD = 2
const CHUNK_TIMEOUT = 20000

function lazyView(loader: () => Promise<unknown>): () => Promise<unknown> {
  return () =>
    Promise.race([
      loader(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('chunk load timeout')), CHUNK_TIMEOUT)),
    ]).catch((err: unknown) => {
      console.warn('[router] 路由组件懒加载失败，自动刷新加载最新版本:', err)
      const count = Number(sessionStorage.getItem('__race_chunk_reload__') || 0)
      if (count < MAX_AUTO_RELOAD) {
        sessionStorage.setItem('__race_chunk_reload__', String(count + 1))
        window.location.reload()
      }
      sessionStorage.removeItem('__race_chunk_reload__')
      throw err
    })
}

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: lazyView(() => import('@/views/Login.vue')),
    meta: { title: '登录', public: true },
  },
  {
    path: '/',
    component: lazyView(() => import('@/layouts/AppLayout.vue')),
    redirect: '/home',
    children: [
      {
        path: 'home',
        name: 'Home',
        component: lazyView(() => import('@/views/Home.vue')),
        meta: { title: '项目介绍', icon: 'HomeFilled', public: true },
      },
      {
        path: 'input',
        name: 'DataInput',
        component: lazyView(() => import('@/views/DataInput.vue')),
        meta: { title: '数据录入', icon: 'Edit', requiresAuth: true },
      },
      {
        path: 'result',
        name: 'Result',
        component: lazyView(() => import('@/views/Result.vue')),
        meta: { title: '评估结果', icon: 'DataAnalysis', requiresAuth: true },
      },
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: lazyView(() => import('@/views/Dashboard.vue')),
        meta: { title: '数据看板', icon: 'PieChart', requiresAuth: true },
      },
      {
        path: 'team',
        name: 'Team',
        component: lazyView(() => import('@/views/Team.vue')),
        meta: { title: '团队介绍', icon: 'UserFilled', public: true },
      },
    ],
  },
]

/** 主导航菜单项（侧边栏与移动端抽屉共用） */
export interface NavMenuItem {
  index: string
  icon: string
  label: string
}

/**
 * 主导航菜单：侧边栏 / 移动端抽屉共用，与上方路由 children 一一对应。
 * 新增页面时需同时在此与路由 meta 中维护（index 即路由路径）。
 */
export const NAV_MENUS: NavMenuItem[] = [
  { index: '/home', icon: 'HomeFilled', label: '项目介绍' },
  { index: '/input', icon: 'Edit', label: '数据录入' },
  { index: '/result', icon: 'DataAnalysis', label: '评估结果' },
  { index: '/dashboard', icon: 'PieChart', label: '数据看板' },
  { index: '/team', icon: 'UserFilled', label: '团队介绍' },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

// 登录守卫：数据录入 / 评估结果 / 数据看板 需登录后访问（邀约制，无注册入口）
router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.public) {
    // 已登录访问登录页 → 回首页
    if (to.path === '/login' && auth.isLoggedIn) {
      return '/home'
    }
    return true
  }
  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  return true
})

// 页面标题更新（统一以「页面 - 应用名」拼接）
router.afterEach((to) => {
  const title = to.meta.title as string
  if (title) {
    document.title = `${title} - ${APP_NAME}`
  }
})

export default router
