import http from './index'

/** 登录用户信息（后端 UserOut，snake_case） */
export interface LoginUser {
  id: number
  username: string
  real_name: string
  role: string
  status: number
  last_login_at?: string
  created_at?: string
}

/** 登录响应 */
export interface LoginResult {
  token: string
  user: LoginUser
}

/** 登录（邀约制：账号由管理端后台开通，无注册入口） */
export async function login(username: string, password: string): Promise<LoginResult> {
  const res = await http.post<LoginResult>('/auth/login', { username, password })
  return res.data
}

/** 获取当前登录用户信息 */
export async function getMe(): Promise<LoginUser> {
  const res = await http.get<LoginUser>('/auth/me')
  return res.data
}
