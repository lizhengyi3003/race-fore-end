import http from './index'
import type { DynamicRiskInput, IndicatorConfig, IndicatorTree } from './types'

/** 指标类别树（基本项 + 大类→中类→小类） */
export async function getIndicatorTree(): Promise<IndicatorTree> {
  const res = await http.get<IndicatorTree>('/indicators/tree')
  return res.data
}

/** 渐进式表单配置：按经营类型/中类/小类逐级返回字段 */
export async function getIndicatorConfig(params: {
  businessType: string
  middleType?: string
  smallType?: string
}): Promise<IndicatorConfig> {
  const res = await http.get<IndicatorConfig>('/indicators/config', { params })
  return res.data
}
