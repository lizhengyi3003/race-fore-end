/** 涉农企业风险录入数据（六大类21项替代数据指标体系） */
export interface RiskInput {
  // 基本信息
  enterpriseName: string
  businessType: string // 经营类型：种植/养殖/加工/混合
  productType: string // 主营产品

  // === 户主特征类 ===
  age?: number // 年龄（岁）
  education: string // 受教育程度：小学及以下/初中/高中/大专及以上
  familyMembers?: number // 家庭成员数量（人）

  // === 第一类：土地经营类 ===
  landConfirmedArea?: number // 土地确权面积（亩）
  landTransferYears?: number // 土地流转年限（年）
  plantingStructure: string // 种植结构：主粮/经济作物/混合/设施农业
  landUtilization?: number // 土地规模利用率（%）

  // === 第二类：农业补贴类 ===
  grainSubsidy?: number // 粮食直补金额（元）
  machinerySubsidy?: number // 农机购置补贴（元）
  otherSubsidy?: number // 其他涉农补贴（元）

  // === 第三类：农业保险类 ===
  insuranceCoverage?: number // 农业保险覆盖率（%）
  claimCount?: number // 历年理赔次数（次）
  claimAmount?: number // 历年理赔金额（元）
  claimRatio?: number // 理赔金额占比（%）

  // === 第四类：经营稳定性类 ===
  yearsOperating?: number // 经营年限（年）
  businessConcentration?: number // 经营范围集中度（主营收入占比 %）
  annualRevenue?: number // 年销售收入（万元）
  revenueStability: string // 销售收入稳定性：稳定/基本稳定/波动较大/大幅波动
  creditStatus: string // 经营者征信状况：无不良/轻微逾期/多次逾期/严重失信

  // === 第五类：贷款历史类 ===
  loanHistory?: number // 历史贷款记录（次，0=无）
  loanOverdueHistory?: number // 历史逾期记录（次，0=无）
}

/** 各指标贡献权重 */
export interface FactorContribution {
  factor: string
  category: string
  weight: number
  score: number // 单项得分 0-100
}

/** 扣分原因（前三项负面指标） */
export interface Deduction {
  factor: string
  score: number
  reason: string
}

/** 风险评估结果（评分卡 0-1000 分） */
export interface RiskResult {
  score: number // 综合信用评分 (0-1000)
  probability: number // 违约概率 (0-1)
  level: '低风险' | '中等风险' | '高风险'
  suggestedAmount: number // 建议授信额度（万元）
  suggestedRate: number // 建议利率（%）
  contributions: FactorContribution[] // 各指标贡献度
  deductions: Deduction[] // 前三项扣分原因
  advice: string // 信贷建议文本
}

/** 六大类指标分类 */
export const CATEGORIES = {
  户主特征类: 'household',
  土地经营类: 'land',
  农业补贴类: 'subsidy',
  农业保险类: 'insurance',
  经营稳定性类: 'stability',
  贷款历史类: 'loan',
} as const

/** API 通用响应 */
export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}
