import http from './index'

/** 行为验证码类型：四种交互模式随机 */
export type CaptchaType = 'click' | 'slide' | 'drag' | 'rotate'

/** 行为验证码数据（后端 /api/v1/captcha 返回） */
export interface CaptchaData {
  type: CaptchaType
  captchaKey: string
  image: string // 主图 base64
  thumb: string // 缩略图/滑块 base64
  width: number
  height: number
  thumbWidth: number
  thumbHeight: number
  thumbSize: number // rotate 专用：旋转图尺寸
  displayX: number // slide/drag 专用
  displayY: number // slide/drag 专用
}

/** 获取行为验证码：GET /api/v1/captcha（四种模式随机） */
export async function getCaptcha(): Promise<CaptchaData> {
  const res = await http.get<CaptchaData>('/captcha')
  return res.data
}

/** 校验验证码：POST /api/v1/captcha/check（value 由前端按类型拼接） */
export async function checkCaptcha(captchaKey: string, type: CaptchaType, value: string): Promise<{ passed: boolean }> {
  const res = await http.post<{ passed: boolean }>('/captcha/check', { captchaKey, type, value })
  return res.data
}
