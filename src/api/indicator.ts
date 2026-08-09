import http from './index'
import type { IndicatorTree } from './types'

/**
 * 指标类别树（基本项 + 大类→中类→小类）
 * 数据量较大（700+ 指标，约 1.7MB），后端组装耗时约 10-15s，
 * 单独放宽超时（30s），避免在 15s 全局超时边缘被中止导致表单加载失败。
 */
export async function getIndicatorTree(): Promise<IndicatorTree> {
  return http.get<IndicatorTree>('/indicators/tree', { timeout: 30000 })
}
