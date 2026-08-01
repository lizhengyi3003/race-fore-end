import http from './index'
import type { RiskInput, RiskResult } from './types'

/**
 * 提交风险评估
 * 已对接后端真实 API：POST /api/v1/risk/assess（多元统计评分卡）
 * 说明：axios 泛型 T 与响应拦截器解包后 data 字段对应
 */
export async function submitRiskAssessment(data: RiskInput): Promise<RiskResult> {
  const res = await http.post<RiskResult>('/risk/assess', data)
  return res.data
}

/**
 * 获取评估历史（预留接口）
 */
export async function getAssessmentHistory(): Promise<RiskResult[]> {
  try {
    const res = await http.get<{ items: RiskResult[] }>('/risk/records', {
      params: { page: 1, size: 20 },
    })
    return res.data?.items ?? []
  } catch {
    return []
  }
}
