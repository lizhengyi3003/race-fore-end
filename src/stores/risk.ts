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
    // 土地经营类
    landConfirmedArea: undefined,
    landTransferYears: undefined,
    landTransferStability: '',
    blackSoilProtection: undefined,
    // 农业补贴类
    grainSubsidy: undefined,
    machinerySubsidy: undefined,
    grainScaleSubsidy: undefined,
    specialtyCropSubsidy: undefined,
    // 农业保险类
    insuranceYears: undefined,
    claimCount: undefined,
    facilityInsurance: '',
    // 产销经营类
    yearsOperating: undefined,
    purchaseOrder: '',
    annualRevenue: undefined,
    creditRecord: '',
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
      // 土地经营类
      landConfirmedArea: undefined,
      landTransferYears: undefined,
      landTransferStability: '',
      blackSoilProtection: undefined,
      // 农业补贴类
      grainSubsidy: undefined,
      machinerySubsidy: undefined,
      grainScaleSubsidy: undefined,
      specialtyCropSubsidy: undefined,
      // 农业保险类
      insuranceYears: undefined,
      claimCount: undefined,
      facilityInsurance: '',
      // 产销经营类
      yearsOperating: undefined,
      purchaseOrder: '',
      annualRevenue: undefined,
      creditRecord: '',
    }
    riskResult.value = null
  }

  async function assessRisk() {
    isCalculating.value = true
    try {
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
