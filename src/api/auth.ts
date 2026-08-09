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

/** 登录（邀约制：账号由管理端后台开通，无注册入口；captchaKey 为已完成的行为验证码） */
export async function login(username: string, password: string, captchaKey = ''): Promise<LoginResult> {
  return http.post<LoginResult>('/auth/login', { username, password, captchaKey })
}

/** 获取当前登录用户信息 */
export async function getMe(): Promise<LoginUser> {
  return http.get<LoginUser>('/auth/me')
}
