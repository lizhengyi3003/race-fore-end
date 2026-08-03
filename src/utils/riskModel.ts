import type { RiskInput, RiskResult, FactorContribution, Deduction } from '@/api/types'

/**
 * 涉农信贷风险评分卡模型（前端兜底实现，对齐文档 3.3.2 四大维度 15 项）
 *
 * 1. 15 项指标分档（文档量化标准归一化 0-100）
 * 2. 加权汇总 × 10 得到 0-1000 分标准信用评分
 * 3. 违约概率通过 sigmoid 映射（评分中心 600，B=72.13）
 * 4. 风险等级：≥700 低风险 / 500-700 中风险 / <500 高风险
 * 5. 输出前三项扣分原因，支撑信贷员人工复核
 */

// --- 工具函数 ---
function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val))
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x))
}

/** 分档映射（WOE 思想）：根据区间返回子得分 */
function binScore(value: number, bins: [number, number, number][]): number {
  for (const [min, max, score] of bins) {
    if (value >= min && value < max) return score
  }
  return 10
}

/** 分类映射 */
function catScore(value: string, map: Record<string, number>, fallback: number): number {
  return map[value] ?? fallback
}

// ================= 各指标评分函数（对齐 indicators.py RULE_SCORERS）=================

/** 确权耕地总面积（亩）：>300 100 / 200-300 80 / 50-200 48 / <50 20 */
function scoreLandConfirmedArea(area: number): number {
  return binScore(area, [
    [0, 50, 20],
    [50, 200, 48],
    [200, 300, 80],
    [300, Infinity, 100],
  ])
}

/** 土地流转合同年限（年）：≥3 100 / 1-3 50 / <1 10 */
function scoreLandTransferYears(years: number): number {
  return binScore(years, [
    [0, 1, 10],
    [1, 3, 50],
    [3, Infinity, 100],
  ])
}

/** 土地流转稳定性 */
function scoreLandTransferStability(s: string): number {
  return catScore(s, { 稳定: 100, 小幅调整: 40, 频繁变更: 0, '': 40 }, 40)
}

/** 黑土地保护性耕作覆盖比例（%） */
function scoreBlackSoilProtection(p: number): number {
  return binScore(p, [
    [0, 40, 0],
    [40, 80, 40],
    [80, Infinity, 100],
  ])
}

/** 耕地地力保护补贴（元） */
function scoreGrainSubsidy(v: number): number {
  return binScore(v, [
    [0, 1000, 11],
    [1000, 5000, 33],
    [5000, 10000, 67],
    [10000, Infinity, 100],
  ])
}

/** 大型农机购置补贴（元） */
function scoreMachinerySubsidy(v: number): number {
  return binScore(v, [
    [0, 10000, 0],
    [10000, 50000, 40],
    [50000, Infinity, 100],
  ])
}

/** 粮食规模种植专项补贴（元） */
function scoreGrainScaleSubsidy(v: number): number {
  return binScore(v, [
    [0, 5000, 0],
    [5000, 20000, 42],
    [20000, Infinity, 100],
  ])
}

/** 特色经济作物补贴（元） */
function scoreSpecialtyCropSubsidy(v: number): number {
  return binScore(v, [
    [0, 1000, 0],
    [1000, Infinity, 100],
  ])
}

/** 农业保险连续投保年限（年） */
function scoreInsuranceYears(v: number): number {
  return binScore(v, [
    [0, 1, 0],
    [1, 3, 50],
    [3, Infinity, 100],
  ])
}

/** 历史保险理赔频次（次） */
function scoreClaimCount(v: number): number {
  if (v <= 0) return 100
  if (v <= 1) return 50
  return 8
}

/** 设施农业附加保险 */
function scoreFacilityInsurance(s: string): number {
  return catScore(s, { 完整投保: 100, 仅基础险: 37, 未投保: 0, '': 37 }, 37)
}

/** 主体持续经营年限（年） */
function scoreYearsOperating(v: number): number {
  return binScore(v, [
    [0, 2, 14],
    [2, 5, 50],
    [5, Infinity, 100],
  ])
}

/** 长期农产品收购订单 */
function scorePurchaseOrder(s: string): number {
  return catScore(s, { 年度订单: 100, 零散收购: 33, 无稳定渠道: 0, '': 33 }, 33)
}

/** 农产品年稳定营收（万元） */
function scoreAnnualRevenue(v: number): number {
  return binScore(v, [
    [0, 10, 10],
    [10, 50, 50],
    [50, Infinity, 100],
  ])
}

/** 历年涉农信贷履约记录 */
function scoreCreditRecord(s: string): number {
  return catScore(s, { 无逾期: 100, 有逾期: 0, '': 50 }, 50)
}

// 指标权重（对齐 INDICATOR_META：维度权重 × 维度内分值比例）
const WEIGHTS: Record<string, number> = {
  landConfirmedArea: 0.136,
  landTransferYears: 0.109,
  landTransferStability: 0.081,
  blackSoilProtection: 0.054,
  grainSubsidy: 0.088,
  machinerySubsidy: 0.074,
  grainScaleSubsidy: 0.059,
  specialtyCropSubsidy: 0.049,
  insuranceYears: 0.089,
  claimCount: 0.067,
  facilityInsurance: 0.044,
  yearsOperating: 0.044,
  purchaseOrder: 0.037,
  annualRevenue: 0.031,
  creditRecord: 0.037,
}

// ================= 主评估函数 =================

export function calculateRiskScore(input: RiskInput): RiskResult {
  const {
    landConfirmedArea = 0,
    landTransferYears = 0,
    landTransferStability = '',
    blackSoilProtection = 0,
    grainSubsidy = 0,
    machinerySubsidy = 0,
    grainScaleSubsidy = 0,
    specialtyCropSubsidy = 0,
    insuranceYears = 0,
    claimCount = 0,
    facilityInsurance = '',
    yearsOperating = 0,
    purchaseOrder = '',
    annualRevenue = 0,
    creditRecord = '',
  } = input

  // --- 15 项指标子得分与权重 ---
  const indicators: { factor: string; category: string; weight: number; score: number }[] = [
    { factor: '确权耕地总面积', category: '土地经营类', weight: WEIGHTS.landConfirmedArea, score: scoreLandConfirmedArea(landConfirmedArea) },
    { factor: '土地流转合同年限', category: '土地经营类', weight: WEIGHTS.landTransferYears, score: scoreLandTransferYears(landTransferYears) },
    { factor: '土地流转稳定性', category: '土地经营类', weight: WEIGHTS.landTransferStability, score: scoreLandTransferStability(landTransferStability) },
    { factor: '黑土地保护性耕作面积', category: '土地经营类', weight: WEIGHTS.blackSoilProtection, score: scoreBlackSoilProtection(blackSoilProtection) },
    { factor: '耕地地力保护补贴', category: '农业补贴类', weight: WEIGHTS.grainSubsidy, score: scoreGrainSubsidy(grainSubsidy) },
    { factor: '大型农机购置补贴', category: '农业补贴类', weight: WEIGHTS.machinerySubsidy, score: scoreMachinerySubsidy(machinerySubsidy) },
    { factor: '粮食规模种植专项补贴', category: '农业补贴类', weight: WEIGHTS.grainScaleSubsidy, score: scoreGrainScaleSubsidy(grainScaleSubsidy) },
    { factor: '特色经济作物补贴', category: '农业补贴类', weight: WEIGHTS.specialtyCropSubsidy, score: scoreSpecialtyCropSubsidy(specialtyCropSubsidy) },
    { factor: '农业保险连续投保年限', category: '农业保险类', weight: WEIGHTS.insuranceYears, score: scoreInsuranceYears(insuranceYears) },
    { factor: '历史保险理赔频次', category: '农业保险类', weight: WEIGHTS.claimCount, score: scoreClaimCount(claimCount) },
    { factor: '设施农业附加保险', category: '农业保险类', weight: WEIGHTS.facilityInsurance, score: scoreFacilityInsurance(facilityInsurance) },
    { factor: '主体持续经营年限', category: '产销经营类', weight: WEIGHTS.yearsOperating, score: scoreYearsOperating(yearsOperating) },
    { factor: '长期农产品收购订单', category: '产销经营类', weight: WEIGHTS.purchaseOrder, score: scorePurchaseOrder(purchaseOrder) },
    { factor: '农产品年稳定营收', category: '产销经营类', weight: WEIGHTS.annualRevenue, score: scoreAnnualRevenue(annualRevenue) },
    { factor: '历年涉农信贷履约记录', category: '产销经营类', weight: WEIGHTS.creditRecord, score: scoreCreditRecord(creditRecord) },
  ]

  // --- 加权汇总 → 0-1000 评分卡刻度 ---
  const rawTotal = indicators.reduce((sum, item) => sum + item.weight * item.score, 0)
  const score = clamp(Math.round(rawTotal * 10), 0, 1000)

  // --- Logistic 违约概率映射（评分中心 600，B=72.13）---
  const logitInput = -(score - 600) / 72.13
  const probability = parseFloat(sigmoid(logitInput).toFixed(4))

  // --- 风险等级（业务阈值分级）---
  let level: '低风险' | '中等风险' | '高风险'
  if (score >= 700) level = '低风险'
  else if (score >= 500) level = '中等风险'
  else level = '高风险'

  // --- 授信建议（基于年销售收入 + 风险折扣）---
  const baseAmount = Math.max(annualRevenue * 0.8, 5)
  const discount = level === '低风险' ? 1.0 : level === '中等风险' ? 0.7 : 0.4
  const suggestedAmount = Math.round(baseAmount * discount)

  // --- 建议利率（基准 + 风险溢价）---
  const baseRate = 3.5
  const riskPremium = (1 - score / 1000) * 6
  const suggestedRate = parseFloat((baseRate + riskPremium).toFixed(2))

  // --- 前三项扣分原因（子得分最低的三项）---
  const sortedByScore = [...indicators].sort((a, b) => a.score - b.score)
  const deductions: Deduction[] = sortedByScore.slice(0, 3).map((item) => ({
    factor: item.factor,
    score: item.score,
    reason: generateDeductionReason(item.factor, item.score),
  }))

  // --- 贡献度列表 ---
  const contributions: FactorContribution[] = indicators.map((item) => ({
    factor: item.factor,
    category: item.category,
    weight: item.weight,
    score: item.score,
  }))

  // --- 建议文本 ---
  let advice: string
  if (level === '低风险') {
    advice = `该企业信用评分 ${score} 分，违约概率仅 ${(probability * 100).toFixed(1)}%，综合风险可控。建议优先审批，授信额度 ${suggestedAmount} 万元，执行优惠利率 ${suggestedRate}%。`
  } else if (level === '中等风险') {
    advice = `该企业信用评分 ${score} 分，违约概率 ${(probability * 100).toFixed(1)}%，信用状况一般。建议审慎授信，额度控制在 ${suggestedAmount} 万元以内，适当上浮利率至 ${suggestedRate}%，并要求补充担保措施。`
  } else {
    advice = `该企业信用评分 ${score} 分，违约概率 ${(probability * 100).toFixed(1)}%，存在较高信贷风险。建议暂缓放贷，或要求提供足额抵押物、引入第三方担保后酌情考虑小额授信。`
  }

  return {
    score,
    probability,
    level,
    suggestedAmount,
    suggestedRate,
    contributions,
    deductions,
    advice,
  }
}

/** 生成扣分原因文案 */
function generateDeductionReason(factor: string, score: number): string {
  if (score >= 80) return `${factor}表现良好`
  if (score >= 60) return `${factor}尚可，仍有提升空间`
  if (score >= 40) return `${factor}偏弱，对信用评分造成一定拖累`
  return `${factor}明显不足，是拉低信用评分的重要因素`
}
