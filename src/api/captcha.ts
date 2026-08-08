import http from './index'

/** 行为验证码数据（后端 /api/v1/captcha 返回） */
export interface CaptchaData {
  captchaKey: string
  image: string // 主图 base64（含随机点/字符）
  thumb: string // 缩略图 base64（提示要点击的字符）
  width: number
  height: number
  thumbWidth: number
  thumbHeight: number
}

/** 获取点选验证码：GET /api/v1/captcha */
export async function getCaptcha(): Promise<CaptchaData> {
  const res = await http.get<CaptchaData>('/captcha')
  return res.data
}

/** 校验验证码点选坐标：POST /api/v1/captcha/check */
export async function checkCaptcha(captchaKey: string, dots: Array<[number, number]>): Promise<{ passed: boolean }> {
  const res = await http.post<{ passed: boolean }>('/captcha/check', { captchaKey, dots })
  return res.data
}
