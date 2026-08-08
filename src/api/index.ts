import axios from 'axios'
import type { AxiosInstance, AxiosError } from 'axios'
import { ElMessage } from 'element-plus'

// API base：按部署环境自动分流（无需每次切分支改代码）
//   *.workers.dev 预览（dev 分支）→ dev 后端 /dev/api/v1
//   自定义域名 intellicoretech.cn（main 生产）→ main 后端 /api/v1
//   VITE_API_BASE_URL 显式配置时优先（如本地开发 /api/v1）
const isWorkersPreview =
  typeof window !== 'undefined' && window.location.hostname.endsWith('.workers.dev')
const baseURL =
  import.meta.env.VITE_API_BASE_URL ||
  (isWorkersPreview
    ? 'https://api.intellicoretech.cn/dev/api/v1'
    : 'https://api.intellicoretech.cn/api/v1')

const http: AxiosInstance = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器：携带 JWT token
http.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('race_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 响应拦截器
http.interceptors.response.use(
  (response) => {
    const { code, message } = response.data
    if (code !== undefined && code !== 200) {
      // 401：登录失效，清理凭证并提示后 3 秒跳转登录页（登录接口自身失败不延迟跳转）
      if (code === 401) {
        localStorage.removeItem('race_token')
        localStorage.removeItem('race_user')
        if (!window.location.hash.includes('/login')) {
          ElMessage.warning('登录已过期，请重新登录')
          setTimeout(() => {
            window.location.hash = '#/login'
          }, 3000)
        } else {
          ElMessage.error(message || '登录失败')
        }
        return Promise.reject(new Error(message))
      }
      ElMessage.error(message || '请求失败')
      return Promise.reject(new Error(message))
    }
    return response.data
  },
  (error: AxiosError) => {
    // HTTP 层 401（兜底）：清理凭证并提示后 3 秒跳转登录页
    if (error.response?.status === 401 && !window.location.hash.includes('/login')) {
      localStorage.removeItem('race_token')
      localStorage.removeItem('race_user')
      ElMessage.warning('登录已过期，请重新登录')
      setTimeout(() => {
        window.location.hash = '#/login'
      }, 3000)
    } else {
      ElMessage.error(error.message || '网络错误')
    }
    return Promise.reject(error)
  }
)

export default http
