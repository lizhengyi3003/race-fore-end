import http from './index'
import type { IndicatorTree } from './types'

/** 指标类别树（基本项 + 大类→中类→小类） */
export async function getIndicatorTree(): Promise<IndicatorTree> {
  const res = await http.get<IndicatorTree>('/indicators/tree')
  return res.data
}
