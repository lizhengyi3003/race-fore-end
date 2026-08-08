import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

/**
 * 懒加载包装：当路由组件 chunk 加载失败时（通常因部署更新后旧 chunk 已从线上移除，
 * 而当前页面仍运行旧版入口），自动刷新页面加载最新版本，避免页面卡在旧路由。
 */
const MAX_AUTO_RELOAD = 2

function lazyView(loader: () => Promise<unknown>): () => Promise<unknown> {
  return () =>
    loader().catch((err: unknown) => {
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

// 页面标题更新
router.afterEach((to) => {
  const title = to.meta.title as string
  if (title) {
    document.title = `${title} - 涉农信贷风控系统`
  }
})

export default router
