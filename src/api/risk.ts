import http from './index'
import type { AssessmentRecordDetail, AssessmentRecordItem, DynamicRiskInput, PageData, RiskResult } from './types'

/**
 * 动态指标体系评估（专家引擎）：POST /api/v1/risk/assess-dynamic
 */
export async function submitDynamicRiskAssessment(data: DynamicRiskInput): Promise<RiskResult> {
  const res = await http.post<RiskResult>('/risk/assess-dynamic', data)
  return res.data
}

/** 历史评估记录分页（仅当前账号）：GET /risk/records */
export async function getRiskRecords(params: {
  page?: number
  size?: number
}): Promise<PageData<AssessmentRecordItem>> {
  const res = await http.get<PageData<AssessmentRecordItem>>('/risk/records', { params })
  return res.data
}

/** 历史评估记录详情：GET /risk/records/{id} */
export async function getRiskRecord(recordId: number): Promise<AssessmentRecordDetail> {
  const res = await http.get<AssessmentRecordDetail>(`/risk/records/${recordId}`)
  return res.data
}

/** 删除历史评估记录：DELETE /risk/records/{id} */
export async function deleteRiskRecord(recordId: number): Promise<void> {
  await http.delete(`/risk/records/${recordId}`)
}
