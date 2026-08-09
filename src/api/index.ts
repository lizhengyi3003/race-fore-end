import axios from 'axios'
import type { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { ElMessage } from 'element-plus'
import { TOKEN_KEY, USER_KEY } from '@/constants'

/** 后端统一响应信封（FastAPI 业务接口统一包一层 { code, message, data }） */
interface ApiEnvelope<T = unknown> {
  code: number
  message: string
  data: T
}

// ------------------------------------------------------------------
// API base：按部署环境自动分流（无需每次切分支改代码）
//   *.workers.dev 预览（dev 分支）→ dev 后端 /dev/api/v1
//   自定义域名 intellicoretech.cn（main 生产）→ main 后端 /api/v1
//   VITE_API_BASE_URL 显式配置时优先（如本地开发 /api/v1）
// ------------------------------------------------------------------
const isWorkersPreview = typeof window !== 'undefined' && window.location.hostname.endsWith('.workers.dev')
const baseURL =
  import.meta.env.VITE_API_BASE_URL ||
  (isWorkersPreview ? 'https://api.intellicoretech.cn/dev/api/v1' : 'https://api.intellicoretech.cn/api/v1')

const http: AxiosInstance = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ------------------------------------------------------------------
// 请求拦截器：携带 JWT token
// ------------------------------------------------------------------
http.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ------------------------------------------------------------------
// 登录失效统一处理：清理本地凭证，提示后延迟跳转登录页
// （登录页自身失败不延迟跳转，直接提示）
// ------------------------------------------------------------------
function clearAuthCache() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

function handleAuthExpired(message: string) {
  clearAuthCache()
  if (!window.location.hash.includes('/login')) {
    ElMessage.warning('登录已过期，请重新登录')
    setTimeout(() => {
      window.location.hash = '#/login'
    }, 3000)
  } else {
    ElMessage.error(message || '登录失败')
  }
}

// ------------------------------------------------------------------
// 响应拦截器：统一处理业务信封错误（提示 + 401 登录失效）
// 注意：成功路径保持返回 AxiosResponse（满足 axios 拦截器类型签名），
// 信封解包（取 data 载荷）在下方 request 封装层完成。
// ------------------------------------------------------------------
http.interceptors.response.use(
  (response) => {
    const body = response.data as ApiEnvelope | undefined
    if (body && typeof body === 'object' && 'code' in body && body.code !== undefined) {
      if (body.code !== 200) {
        // 业务 401：登录失效（token 过期 / 被吊销）
        if (body.code === 401) {
          handleAuthExpired(body.message)
        } else {
          ElMessage.error(body.message || '请求失败')
        }
        // 附带 code 属性，供调用方区分「业务 401」与普通网络错误（如登录态恢复校验）
        return Promise.reject(Object.assign(new Error(body.message), { code: body.code }))
      }
    }
    return response
  },
  (error: AxiosError) => {
    // HTTP 层 401（兜底）：网关/后端直接返回 401 时同样清理凭证并跳转
    if (error.response?.status === 401) {
      handleAuthExpired('登录已过期，请重新登录')
    } else {
      ElMessage.error(error.message || '网络错误')
    }
    return Promise.reject(error)
  }
)

// ------------------------------------------------------------------
// 类型化请求封装
// 响应拦截器成功时返回完整 AxiosResponse（满足 axios 拦截器签名），
// 因此这里声明 R = AxiosResponse<ApiEnvelope<T>> 与运行时完全一致，
// 再解两层：res.data = 信封 {code,message,data}，res.data.data = 业务载荷 T。
// 因此 http.get<T> / http.post<T> 直接返回 Promise<T>，类型与运行时一致。
// ------------------------------------------------------------------
const request = {
  get: async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const res = await http.get<unknown, AxiosResponse<ApiEnvelope<T>>>(url, config)
    return res.data.data
  },
  post: async <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> => {
    const res = await http.post<unknown, AxiosResponse<ApiEnvelope<T>>>(url, data, config)
    return res.data.data
  },
  put: async <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> => {
    const res = await http.put<unknown, AxiosResponse<ApiEnvelope<T>>>(url, data, config)
    return res.data.data
  },
  delete: async <T = void>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const res = await http.delete<unknown, AxiosResponse<ApiEnvelope<T>>>(url, config)
    return res.data.data
  },
}

export default request
