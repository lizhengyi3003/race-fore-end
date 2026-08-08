import type { IndicatorField } from '@/api/types'

/**
 * 校验单个指标值，返回错误信息；合法返回空字符串。
 * 规则：必填非空；数值需为数字并落在取值区间；枚举/布尔由控件限定选项。
 */
export function validateIndicatorValue(field: IndicatorField, value: string | undefined): string {
  const v = (value ?? '').trim()
  // 必填校验（文本备注类默认非必填）
  if (field.indicator_type !== '文本' && field.required && v === '') {
    return `请填写「${field.name}」`
  }
  if (v === '') return ''
  if (field.indicator_type === '数值') {
    const n = Number(v)
    if (v.trim() === '' || Number.isNaN(n)) {
      return `「${field.name}」需为有效数字`
    }
    // 数值指标默认非负（面积/金额/年限/次数等），有明确下限时用下限
    const min = field.min_value ?? 0
    if (n < min) {
      return `「${field.name}」不能小于 ${min}${field.unit || ''}`
    }
    if (field.max_value != null && n > field.max_value) {
      return `「${field.name}」不能大于 ${field.max_value}${field.unit || ''}`
    }
  }
  return ''
}

/** 校验一组指标，返回错误信息列表（仅含非空错误） */
export function validateIndicatorMap(
  fields: IndicatorField[],
  values: Record<string, string | undefined>
): string[] {
  const errors: string[] = []
  for (const f of fields) {
    const err = validateIndicatorValue(f, values[f.code])
    if (err) errors.push(err)
  }
  return errors
}
