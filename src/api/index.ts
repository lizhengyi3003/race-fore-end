import axios from 'axios'
import type { AxiosInstance, AxiosError } from 'axios'
import { ElMessage } from 'element-plus'

const http: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
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
      // 401：登录失效，清理凭证并跳转登录页（排除登录接口自身失败的情况）
      if (code === 401) {
        localStorage.removeItem('race_token')
        localStorage.removeItem('race_user')
        if (!window.location.hash.includes('/login')) {
          window.location.hash = '#/login'
        }
      }
      ElMessage.error(message || '请求失败')
      return Promise.reject(new Error(message))
    }
    return response.data
  },
  (error: AxiosError) => {
    ElMessage.error(error.message || '网络错误')
    return Promise.reject(error)
  }
)

export default http
