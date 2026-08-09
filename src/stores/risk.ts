import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { DynamicRiskInput, FormSnapshotItem, RiskResult } from '@/api/types'
import { submitDynamicRiskAssessment } from '@/api/risk'

export const useRiskStore = defineStore('risk', () => {
  // --- State ---
  const riskResult = ref<RiskResult | null>(null)

  // --- Getters ---
  const hasResult = computed(() => riskResult.value !== null)

  // ================= 动态指标体系 =================
  const dynamicForm = ref<DynamicRiskInput>({
    enterpriseName: '',
    businessType: '',
    selectedCategories: [],
    mixedBusiness: {},
    indicators: {},
  })

  function setDynamicForm(data: Partial<DynamicRiskInput>) {
    Object.assign(dynamicForm.value, data)
  }

  /**
   * 提交动态评估：成功返回 true（结果已写入 riskResult）；失败返回 false（保留原结果）。
   * 错误提示已由响应拦截器统一弹出，调用方据此决定是否跳转结果页。
   */
  async function assessDynamic(): Promise<boolean> {
    try {
      riskResult.value = await submitDynamicRiskAssessment(dynamicForm.value)
      return true
    } catch {
      return false
    }
  }

  /** 直接设置结果（用于加载历史评估记录详情） */
  function setResult(result: RiskResult | null) {
    riskResult.value = result
  }

  // 本次评估提交时的原始表单快照（供结果页查看）
  const formSnapshot = ref<FormSnapshotItem[]>([])
  function setFormSnapshot(items: FormSnapshotItem[]) {
    formSnapshot.value = items
  }

  return {
    riskResult,
    hasResult,
    dynamicForm,
    setDynamicForm,
    assessDynamic,
    setResult,
    formSnapshot,
    setFormSnapshot,
  }
})
