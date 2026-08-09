import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login as apiLogin, getMe, type LoginUser } from '@/api/auth'
import { TOKEN_KEY, USER_KEY } from '@/constants'

/** 判断错误是否为「登录失效」：业务 401（信封 code）或 HTTP 401 */
function isAuthError(err: unknown): boolean {
  const e = err as { response?: { status?: number }; code?: number } | null
  return e?.response?.status === 401 || e?.code === 401
}

function loadUser(): LoginUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as LoginUser) : null
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string>(localStorage.getItem(TOKEN_KEY) || '')
  const user = ref<LoginUser | null>(loadUser())

  const isLoggedIn = computed(() => !!token.value)
  const displayName = computed(() => user.value?.real_name || user.value?.username || '')

  async function login(username: string, password: string, captchaKey = '') {
    const res = await apiLogin(username, password, captchaKey)
    token.value = res.token
    user.value = res.user
    localStorage.setItem(TOKEN_KEY, res.token)
    localStorage.setItem(USER_KEY, JSON.stringify(res.user))
  }

  /** 应用启动时校验本地 token 是否仍有效（失效则清理） */
  async function restoreSession(): Promise<boolean> {
    if (!token.value) return false
    try {
      user.value = await getMe()
      localStorage.setItem(USER_KEY, JSON.stringify(user.value))
      return true
    } catch (err) {
      // 仅当 token 确已失效（业务 401 / HTTP 401）才清除登录态；
      // 瞬时网络错误不登出，避免用户被误踢下线
      if (isAuthError(err)) {
        logout()
      }
      return false
    }
  }

  function logout() {
    token.value = ''
    user.value = null
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }

  return { token, user, isLoggedIn, displayName, login, logout, restoreSession }
})
