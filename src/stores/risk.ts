import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { RiskInput, RiskResult } from '@/api/types'
import { submitRiskAssessment } from '@/api/risk'

export const useRiskStore = defineStore('risk', () => {
  // --- State ---
  const formData = ref<RiskInput>({
    enterpriseName: '',
    businessType: '',
    productType: '',
    // 户主特征类
    age: undefined,
    education: '',
    familyMembers: undefined,
    // 土地经营类
    landConfirmedArea: undefined,
    landTransferYears: undefined,
    plantingStructure: '',
    landUtilization: undefined,
    // 农业补贴类
    grainSubsidy: undefined,
    machinerySubsidy: undefined,
    otherSubsidy: undefined,
    // 农业保险类
    insuranceCoverage: undefined,
    claimCount: undefined,
    claimAmount: undefined,
    claimRatio: undefined,
    // 经营稳定性类
    yearsOperating: undefined,
    businessConcentration: undefined,
    annualRevenue: undefined,
    revenueStability: '',
    creditStatus: '',
    // 贷款历史类
    loanHistory: undefined,
    loanOverdueHistory: undefined,
  })

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
  function setFormData(data: Partial<RiskInput>) {
    Object.assign(formData.value, data)
  }

  function resetForm() {
    formData.value = {
      enterpriseName: '',
      businessType: '',
      productType: '',
      // 户主特征类
      age: undefined,
      education: '',
      familyMembers: undefined,
      // 土地经营类
      landConfirmedArea: undefined,
      landTransferYears: undefined,
      plantingStructure: '',
      landUtilization: undefined,
      // 农业补贴类
      grainSubsidy: undefined,
      machinerySubsidy: undefined,
      otherSubsidy: undefined,
      // 农业保险类
      insuranceCoverage: undefined,
      claimCount: undefined,
      claimAmount: undefined,
      claimRatio: undefined,
      // 经营稳定性类
      yearsOperating: undefined,
      businessConcentration: undefined,
      annualRevenue: undefined,
      revenueStability: '',
      creditStatus: '',
      // 贷款历史类
      loanHistory: undefined,
      loanOverdueHistory: undefined,
    }
    riskResult.value = null
  }

  async function assessRisk() {
    isCalculating.value = true
    try {
      // 调用后端真实评分卡（多元统计模型）
      riskResult.value = await submitRiskAssessment(formData.value)
    } catch {
      // 请求失败时保留原结果
    } finally {
      isCalculating.value = false
    }
  }

  return {
    formData,
    riskResult,
    isCalculating,
    hasResult,
    scoreLevel,
    scoreColor,
    setFormData,
    resetForm,
    assessRisk,
  }
})
