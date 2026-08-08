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
  min_value?: number | null // 数值型：取值下限（后端解析）
  max_value?: number | null // 数值型：取值上限（后端解析）
}

/** 指标类别树节点 */
export interface CategoryNode {
  code: string
  name: string
  level: string
  display: string
  indicator_count: number
  indicators?: IndicatorField[] // 该节点自身层级的指标字段
  children: CategoryNode[]
}

/** 指标树：基本项 + 类别树 */
export interface IndicatorTree {
  basic: IndicatorField[]
  categories: CategoryNode[]
}

/** 评估原始表单快照项（本次评估提交时的指标填写值） */
export interface FormSnapshotItem {
  code: string
  name: string
  level: string
  unit: string
  value: string
}

/** 分页响应（后端 PageData） */
export interface PageData<T> {
  total: number
  page: number
  size: number
  items: T[]
}

/** 历史评估记录（列表项，GET /risk/records） */
export interface AssessmentRecordItem {
  id: number
  enterpriseName: string
  businessType: string
  score: number
  probability: number
  level: string
  suggestedAmount: number
  suggestedRate: number
  assessorName?: string | null
  createdAt?: string
  completeness?: number | null
  veto?: string | null
}

/** 历史评估记录详情（GET /risk/records/{id}） */
export interface AssessmentRecordDetail extends AssessmentRecordItem {
  mixedBusiness?: Record<string, number> | null
  indicatorValues?: Array<{
    code: string
    name: string
    level: string
    unit: string
    value: string | null
    quality: string
  }> | null
  input?: Record<string, unknown> | null
  result?: RiskResult | null
}

/** 动态评估请求（POST /risk/assess-dynamic） */
export interface DynamicRiskInput {
  enterpriseName: string
  businessType: string // 大类编码 01~10，混合=MIXED
  middleType?: string
  smallType?: string
  specificType?: string
  selectedCategories: string[] // el-tree 勾选的具体营业类型叶子编码
  mixedBusiness: Record<string, number> // 混合经营比例 {大类: 0~1}
  indicators: Record<string, string> // 指标编码 -> 值
}