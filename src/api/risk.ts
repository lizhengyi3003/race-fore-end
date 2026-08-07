import http from './index'
import type { DynamicRiskInput, RiskInput, RiskResult } from './types'

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
 * 动态指标体系评估（专家引擎）：POST /api/v1/risk/assess-dynamic
 */
export async function submitDynamicRiskAssessment(data: DynamicRiskInput): Promise<RiskResult> {
  const res = await http.post<RiskResult>('/risk/assess-dynamic', data)
  return res.data
}
