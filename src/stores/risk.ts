import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { DynamicRiskInput, FormSnapshotItem, RiskResult } from '@/api/types'
import { submitDynamicRiskAssessment } from '@/api/risk'

export const useRiskStore = defineStore('risk', () => {
  // --- State ---
  const riskResult = ref<RiskResult | null>(null)
  const isCalculating = ref(false)

  // --- Getters ---
  const hasResult = computed(() => riskResult.value !== null)

  const scoreLevel = computed(() => {
    if (!riskResult.value) return ''
    const s = riskResult.value.score
    if (s >= 700) return '低风险'
    if (s >= 500) return '中等风险'
    return '高风险'
  })

  const scoreColor = computed(() => {
    if (!riskResult.value) return '#909399'
    const s = riskResult.value.score
    if (s >= 700) return '#67c23a'
    if (s >= 500) return '#e6a23c'
    return '#f56c6c'
  })

  // --- Actions ---
  // ================= 动态指标体系（Phase 2）=================
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

  function resetDynamicForm() {
    dynamicForm.value = {
      enterpriseName: '',
      businessType: '',
      selectedCategories: [],
      mixedBusiness: {},
      indicators: {},
    }
    riskResult.value = null
  }

  async function assessDynamic() {
    isCalculating.value = true
    try {
      riskResult.value = await submitDynamicRiskAssessment(dynamicForm.value)
    } catch {
      // 请求失败时保留原结果
    } finally {
      isCalculating.value = false
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
    isCalculating,
    hasResult,
    scoreLevel,
    scoreColor,
    dynamicForm,
    setDynamicForm,
    resetDynamicForm,
    assessDynamic,
    setResult,
    formSnapshot,
    setFormSnapshot,
  }
})
