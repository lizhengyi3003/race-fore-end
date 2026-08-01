import type { RiskInput, RiskResult, FactorContribution, Deduction } from '@/api/types'

/**
 * 涉农信贷风险评分卡模型（前端模拟实现）
 *
 * 对齐商业计划书技术方案：
 * 1. 六大类 21 项替代数据指标体系
 * 2. 每项指标经分档（WOE 思想）映射为 0-100 子得分
 * 3. 加权汇总 × 10 得到 0-1000 分标准信用评分（评分卡刻度）
 * 4. 违约概率通过 Logistic sigmoid 映射
 * 5. 风险等级：≥700 低风险(绿) / 500-700 中风险(黄) / <500 高风险(红)
 * 6. 输出前三项扣分原因，支撑信贷员人工复核
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

// ================= 各指标评分函数 =================

/** 土地确权面积（亩） */
function scoreLandArea(area: number): number {
  return binScore(area, [
    [0, 50, 20],
    [50, 200, 55],
    [200, 500, 80],
    [500, Infinity, 95],
  ])
}

/** 土地流转年限（年） */
function scoreTransferYears(years: number): number {
  return binScore(years, [
    [0, 1, 20],
    [1, 3, 50],
    [3, 5, 75],
    [5, Infinity, 95],
  ])
}

/** 种植结构 */
function scorePlanting(structure: string): number {
  const map: Record<string, number> = {
    主粮种植: 70,
    经济作物: 85,
    混合经营: 92,
    设施农业: 82,
    '': 50,
  }
  return map[structure] ?? 50
}

/** 土地规模利用率（%） */
function scoreUtilization(rate: number): number {
  return binScore(rate, [
    [0, 50, 40],
    [50, 70, 60],
    [70, 90, 85],
    [90, Infinity, 98],
  ])
}

/** 补贴金额归一化（元） */
function scoreSubsidyAmount(amount: number, ceiling: number): number {
  if (amount <= 0) return 30
  return clamp(Math.round((amount / ceiling) * 90 + 10), 10, 100)
}

/** 农业保险覆盖率（%） */
function scoreInsuranceCoverage(rate: number): number {
  return binScore(rate, [
    [0, 30, 30],
    [30, 60, 60],
    [60, 80, 82],
    [80, Infinity, 98],
  ])
}

/** 历年理赔次数 */
function scoreClaimCount(count: number): number {
  if (count <= 0) return 100
  if (count <= 2) return 60
  if (count <= 5) return 35
  return 15
}

/** 理赔金额占比（%） */
function scoreClaimRatio(ratio: number): number {
  return binScore(ratio, [
    [0, 10, 90],
    [10, 30, 70],
    [30, 60, 45],
    [60, Infinity, 20],
  ])
}

/** 经营年限（年） */
function scoreOperatingYears(years: number): number {
  return binScore(years, [
    [0, 2, 30],
    [2, 5, 60],
    [5, 10, 85],
    [10, Infinity, 98],
  ])
}

/** 经营范围集中度（主营收入占比 %） */
function scoreConcentration(ratio: number): number {
  if (ratio >= 70 && ratio <= 90) return 95
  if (ratio >= 50 && ratio < 70) return 75
  if (ratio > 90) return 80
  if (ratio >= 30 && ratio < 50) return 55
  return 35
}

/** 年销售收入（万元） */
function scoreRevenue(revenue: number): number {
  return binScore(revenue, [
    [0, 20, 25],
    [20, 60, 55],
    [60, 150, 80],
    [150, Infinity, 95],
  ])
}

/** 销售收入稳定性 */
function scoreRevenueStability(stability: string): number {
  const map: Record<string, number> = {
    稳定: 98,
    基本稳定: 80,
    波动较大: 50,
    大幅波动: 25,
    '': 50,
  }
  return map[stability] ?? 50
}

/** 经营者征信状况 */
function scoreCreditStatus(status: string): number {
  const map: Record<string, number> = {
    无不良记录: 98,
    轻微逾期: 70,
    多次逾期: 35,
    严重失信: 10,
    '': 50,
  }
  return map[status] ?? 50
}

/** 年龄（岁）：25-55 岁青壮年为黄金还款期 */
function scoreAge(age: number): number {
  return binScore(age, [
    [0, 25, 60],
    [25, 35, 85],
    [35, 55, 95],
    [55, 65, 80],
    [65, Infinity, 55],
  ])
}

/** 受教育程度（金融素养代理变量） */
function scoreEducation(edu: string): number {
  const map: Record<string, number> = {
    小学及以下: 40,
    初中: 65,
    高中: 85,
    大专及以上: 95,
    '': 50,
  }
  return map[edu] ?? 50
}

/** 家庭成员数量（人）：3-5 人（劳动力充足且负担适中）最佳 */
function scoreFamilyMembers(count: number): number {
  return binScore(count, [
    [0, 1, 40],
    [1, 3, 75],
    [3, 5, 95],
    [5, 7, 80],
    [7, Infinity, 60],
  ])
}

/** 历年理赔金额（元）：越高风险越大 */
function scoreClaimAmount(amount: number): number {
  return binScore(amount, [
    [0, 1, 100],
    [1, 10000, 80],
    [10000, 50000, 60],
    [50000, 100000, 40],
    [100000, Infinity, 20],
  ])
}

/** 历史贷款记录（次）：1-5 次良好信用历史最佳，无记录中性 */
function scoreLoanHistory(count: number): number {
  return binScore(count, [
    [0, 1, 55],
    [1, 3, 80],
    [3, 5, 90],
    [5, Infinity, 75],
  ])
}

/** 历史逾期记录（次）：逾期越多信用越差 */
function scoreLoanOverdueHistory(count: number): number {
  if (count <= 0) return 98
  if (count <= 1) return 60
  if (count <= 3) return 35
  return 15
}

// ================= 主评估函数 =================

export function calculateRiskScore(input: RiskInput): RiskResult {
  const {
    age = 0,
    education = '',
    familyMembers = 0,
    landConfirmedArea = 0,
    landTransferYears = 0,
    plantingStructure = '',
    landUtilization = 0,
    grainSubsidy = 0,
    machinerySubsidy = 0,
    otherSubsidy = 0,
    insuranceCoverage = 0,
    claimCount = 0,
    claimAmount = 0,
    claimRatio = 0,
    yearsOperating = 0,
    businessConcentration = 0,
    annualRevenue = 0,
    revenueStability = '',
    creditStatus = '',
    loanHistory = 0,
    loanOverdueHistory = 0,
  } = input

  // --- 21 项指标子得分与权重 ---
  const indicators: { factor: string; category: string; weight: number; score: number }[] = [
    { factor: '年龄', category: '户主特征类', weight: 0.04, score: scoreAge(age) },
    { factor: '受教育程度', category: '户主特征类', weight: 0.05, score: scoreEducation(education) },
    { factor: '家庭成员数量', category: '户主特征类', weight: 0.03, score: scoreFamilyMembers(familyMembers) },
    { factor: '土地确权面积', category: '土地经营类', weight: 0.06, score: scoreLandArea(landConfirmedArea) },
    { factor: '土地流转年限', category: '土地经营类', weight: 0.04, score: scoreTransferYears(landTransferYears) },
    { factor: '种植结构', category: '土地经营类', weight: 0.04, score: scorePlanting(plantingStructure) },
    { factor: '土地规模利用率', category: '土地经营类', weight: 0.05, score: scoreUtilization(landUtilization) },
    { factor: '粮食直补金额', category: '农业补贴类', weight: 0.04, score: scoreSubsidyAmount(grainSubsidy, 5000) },
    {
      factor: '农机购置补贴',
      category: '农业补贴类',
      weight: 0.04,
      score: scoreSubsidyAmount(machinerySubsidy, 30000),
    },
    { factor: '其他涉农补贴', category: '农业补贴类', weight: 0.03, score: scoreSubsidyAmount(otherSubsidy, 5000) },
    {
      factor: '农业保险覆盖率',
      category: '农业保险类',
      weight: 0.08,
      score: scoreInsuranceCoverage(insuranceCoverage),
    },
    { factor: '历年理赔次数', category: '农业保险类', weight: 0.04, score: scoreClaimCount(claimCount) },
    { factor: '历年理赔金额', category: '农业保险类', weight: 0.05, score: scoreClaimAmount(claimAmount) },
    { factor: '理赔金额占比', category: '农业保险类', weight: 0.05, score: scoreClaimRatio(claimRatio) },
    { factor: '经营年限', category: '经营稳定性类', weight: 0.07, score: scoreOperatingYears(yearsOperating) },
    {
      factor: '经营范围集中度',
      category: '经营稳定性类',
      weight: 0.05,
      score: scoreConcentration(businessConcentration),
    },
    { factor: '年销售收入', category: '经营稳定性类', weight: 0.06, score: scoreRevenue(annualRevenue) },
    {
      factor: '销售收入稳定性',
      category: '经营稳定性类',
      weight: 0.05,
      score: scoreRevenueStability(revenueStability),
    },
    { factor: '经营者征信', category: '经营稳定性类', weight: 0.06, score: scoreCreditStatus(creditStatus) },
    { factor: '历史贷款记录', category: '贷款历史类', weight: 0.03, score: scoreLoanHistory(loanHistory) },
    {
      factor: '历史逾期记录',
      category: '贷款历史类',
      weight: 0.04,
      score: scoreLoanOverdueHistory(loanOverdueHistory),
    },
  ]

  // --- 加权汇总 → 0-1000 评分卡刻度 ---
  const rawTotal = indicators.reduce((sum, item) => sum + item.weight * item.score, 0)
  const score = clamp(Math.round(rawTotal * 10), 0, 1000)

  // --- Logistic 违约概率映射（评分 550 为中心）---
  const logitInput = -(score - 550) / 150
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
