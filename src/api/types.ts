/** 涉农企业风险录入数据（文档 3.3.2 四大维度 15 项替代数据指标体系） */
export interface RiskInput {
  // 基本信息
  enterpriseName: string
  businessType: string // 经营类型：种植/养殖/加工/混合
  productType: string // 主营产品

  // === 维度一：土地经营类 ===
  landConfirmedArea?: number // 确权耕地总面积（亩）
  landTransferYears?: number // 土地流转合同年限（年）
  landTransferStability: string // 稳定/小幅调整/频繁变更
  blackSoilProtection?: number // 黑土地保护性耕作面积（亩）

  // === 维度二：农业补贴类 ===
  grainSubsidy?: number // 耕地地力保护补贴（元）
  machinerySubsidy?: number // 大型农机购置补贴（元）
  grainScaleSubsidy?: number // 粮食规模种植专项补贴（元）
  specialtyCropSubsidy?: number // 特色经济作物补贴（元）

  // === 维度三：农业保险类 ===
  insuranceYears?: number // 农业保险连续投保年限（年）
  claimCount?: number // 历史保险理赔频次（次）
  facilityInsurance: string // 完整投保/仅基础险/未投保

  // === 维度四：产销经营类 ===
  yearsOperating?: number // 主体持续经营年限（年）
  purchaseOrder: string // 年度订单/零散收购/无稳定渠道
  annualRevenue?: number // 农产品年稳定营收（万元）
  creditRecord: string // 无逾期/有逾期
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
  veto?: string | null // 一票否决命中指标名（动态引擎）
  completeness?: number // 数据完整度 0~1
}

// ================= 动态指标体系（Phase 1/2）=================

/** 动态表单字段配置（对应 indicator_config） */
export interface IndicatorField {
  code: string
  name: string
  level: string // 基本项 / 大类 / 中类 / 小类
  category_code: string
  category_name: string
  indicator_type: '数值' | '枚举' | '布尔' | '文本'
  unit: string
  value_range: string
  options: string[] // 枚举选项
  data_source: string
  is_feature: boolean
  risk_meaning: string
  weight_star: number
  region: string
  is_veto: boolean
  cycle: string
  scoring_rule: string
  required: boolean
}

/** 指标类别树节点 */
export interface CategoryNode {
  code: string
  name: string
  level: string
  display: string
  indicator_count: number
  children: CategoryNode[]
}

/** 指标树：基本项 + 类别树 */
export interface IndicatorTree {
  basic: IndicatorField[]
  categories: CategoryNode[]
}

/** 渐进式表单配置 */
export interface IndicatorConfig {
  basic: IndicatorField[]
  indicators: IndicatorField[]
  selected: { businessType: string; middleType: string; smallType: string }
}

/** 动态评估请求（POST /risk/assess-dynamic） */
export interface DynamicRiskInput {
  enterpriseName: string
  businessType: string // 大类编码 01~10，混合=MIXED
  productType: string
  middleType?: string
  smallType?: string
  mixedBusiness: Record<string, number> // 混合经营比例 {大类: 0~1}
  indicators: Record<string, string> // 指标编码 -> 值
}