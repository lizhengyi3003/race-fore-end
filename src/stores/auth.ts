import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login as apiLogin, getMe, type LoginUser } from '@/api/auth'

const TOKEN_KEY = 'race_token'
const USER_KEY = 'race_user'

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

  async function login(username: string, password: string) {
    const res = await apiLogin(username, password)
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
    } catch {
      logout()
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
