import http from './index'

/** 看板统计概览：GET /dashboard/stats */
export interface DashboardStats {
  totalAssess: number
  avgScore: number
  highRiskRate: number
  passRate: number
}

/** 行业风险分布项：GET /dashboard/industry-distribution */
export interface IndustryDistItem {
  name: string
  value: number
  risk: string
}

/** 评分分布项：GET /dashboard/score-distribution */
export interface ScoreDistItem {
  range: string
  count: number
}

/** 评估趋势项：GET /dashboard/trend */
export interface TrendItem {
  date: string
  count: number
  avgScore: number
}

/** 数据看板统计概览 */
export async function getDashboardStats(): Promise<DashboardStats> {
  return http.get<DashboardStats>('/dashboard/stats')
}

/** 行业风险分布 */
export async function getIndustryDistribution(): Promise<IndustryDistItem[]> {
  return http.get<IndustryDistItem[]>('/dashboard/industry-distribution')
}

/** 信用评分分布 */
export async function getScoreDistribution(): Promise<ScoreDistItem[]> {
  return http.get<ScoreDistItem[]>('/dashboard/score-distribution')
}

/** 近 N 天评估趋势（默认 30 天） */
export async function getDashboardTrend(days = 30): Promise<TrendItem[]> {
  return http.get<TrendItem[]>('/dashboard/trend', { params: { days } })
}
