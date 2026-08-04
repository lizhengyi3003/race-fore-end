<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import type { FormInstance, FormRules } from 'element-plus'
import { useRiskStore } from '@/stores/risk'

const router = useRouter()
const riskStore = useRiskStore()

// 移动端表单改为「标签在上、输入在下」的左对齐布局
const isMobile = ref(window.innerWidth <= 768)
function updateIsMobile() {
  isMobile.value = window.innerWidth <= 768
}
onMounted(() => window.addEventListener('resize', updateIsMobile))
onBeforeUnmount(() => window.removeEventListener('resize', updateIsMobile))

const formRef = ref<FormInstance>()
const submitting = ref(false)

const form = reactive({ ...riskStore.formData })

const businessTypeOptions = [
  { label: '种植业', value: '种植' },
  { label: '养殖业', value: '养殖' },
  { label: '农产品加工', value: '加工' },
  { label: '混合经营', value: '混合' },
]

const stabilityOptions = [
  { label: '稳定（近3年地块无变动）', value: '稳定' },
  { label: '小幅调整（1-2年有调整）', value: '小幅调整' },
  { label: '频繁变更（年度更换地块）', value: '频繁变更' },
]

const facilityOptions = [
  { label: '完整投保附加险', value: '完整投保' },
  { label: '仅基础种植险', value: '仅基础险' },
  { label: '未投保', value: '未投保' },
]

const orderOptions = [
  { label: '年度固定订单', value: '年度订单' },
  { label: '零散散户收购', value: '零散收购' },
  { label: '无稳定收购渠道', value: '无稳定渠道' },
]

const creditOptions = [
  { label: '无逾期（全额还款）', value: '无逾期' },
  { label: '存在逾期记录', value: '有逾期' },
]

const rules: FormRules = {
  enterpriseName: [{ required: true, message: '请输入企业名称', trigger: 'blur' }],
  businessType: [{ required: true, message: '请选择经营类型', trigger: 'change' }],
  // 土地经营类
  landConfirmedArea: [{ required: true, message: '请输入确权耕地总面积', trigger: 'blur' }],
  landTransferYears: [{ required: true, message: '请输入土地流转合同年限', trigger: 'blur' }],
  landTransferStability: [{ required: true, message: '请选择土地流转稳定性', trigger: 'change' }],
  // 农业补贴类
  grainSubsidy: [{ required: true, message: '请输入耕地地力保护补贴', trigger: 'blur' }],
  // 农业保险类
  insuranceYears: [{ required: true, message: '请输入农业保险连续投保年限', trigger: 'blur' }],
  facilityInsurance: [{ required: true, message: '请选择设施农业附加保险', trigger: 'change' }],
  // 产销经营类
  yearsOperating: [{ required: true, message: '请输入主体持续经营年限', trigger: 'blur' }],
  annualRevenue: [{ required: true, message: '请输入农产品年稳定营收', trigger: 'blur' }],
  purchaseOrder: [{ required: true, message: '请选择长期收购订单', trigger: 'change' }],
  creditRecord: [{ required: true, message: '请选择信贷履约记录', trigger: 'change' }],
}

async function handleSubmit() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    riskStore.setFormData(form)
    await riskStore.assessRisk()
    router.push('/result')
  } finally {
    submitting.value = false
  }
}

function handleReset() {
  formRef.value?.resetFields()
  riskStore.resetForm()
}
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1>涉农企业数据录入</h1>
      <p>四大维度 15 项替代数据指标 · 信贷员 3 分钟完成录入 · 系统基于 Logistic 评分卡智能评估</p>
    </div>

    <div class="info-card form-wrapper">
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        :label-position="isMobile ? 'top' : 'right'"
        :label-width="isMobile ? 'auto' : '150px'"
      >
        <!-- 基础信息 -->
        <el-divider content-position="left">
          <el-icon><OfficeBuilding /></el-icon>
          <span style="margin-left: 6px">基础信息</span>
        </el-divider>

        <el-row :gutter="24">
          <el-col :xs="24" :md="12">
            <el-form-item label="企业名称" prop="enterpriseName">
              <el-input v-model="form.enterpriseName" placeholder="请输入企业名称" maxlength="50" show-word-limit />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :md="12">
            <el-form-item label="经营类型" prop="businessType">
              <el-select v-model="form.businessType" placeholder="请选择经营类型" style="width: 100%">
                <el-option
                  v-for="item in businessTypeOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="24">
          <el-col :xs="24" :md="12">
            <el-form-item label="主营产品">
              <el-input v-model="form.productType" placeholder="如：水稻、玉米、大豆" maxlength="30" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- ========== 维度一：土地经营类 ========== -->
        <el-divider content-position="left">
          <el-icon><Sunny /></el-icon>
          <span style="margin-left: 6px">土地经营类（权重 38%，核心资产维度）</span>
        </el-divider>

        <el-row :gutter="24">
          <el-col :xs="24" :sm="12" :md="8">
            <el-form-item label="确权耕地总面积" prop="landConfirmedArea">
              <div class="unit-input">
                <el-input-number v-model="form.landConfirmedArea" :min="0" :precision="1" controls-position="right" />
                <span class="unit-label">亩</span>
              </div>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8">
            <el-form-item label="土地流转合同年限" prop="landTransferYears">
              <div class="unit-input">
                <el-input-number
                  v-model="form.landTransferYears"
                  :min="0"
                  :max="50"
                  :precision="0"
                  controls-position="right"
                />
                <span class="unit-label">年</span>
              </div>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8">
            <el-form-item label="黑土地保护耕作">
              <div class="unit-input">
                <el-input-number v-model="form.blackSoilProtection" :min="0" :precision="1" controls-position="right" />
                <span class="unit-label">亩</span>
              </div>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="24">
          <el-col :xs="24" :md="12">
            <el-form-item label="土地流转稳定性" prop="landTransferStability">
              <el-select v-model="form.landTransferStability" placeholder="近 3 年地块变更情况" style="width: 100%">
                <el-option v-for="item in stabilityOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- ========== 维度二：农业补贴类 ========== -->
        <el-divider content-position="left">
          <el-icon><Money /></el-icon>
          <span style="margin-left: 6px">农业补贴类（权重 27%，稳定现金流维度）</span>
        </el-divider>

        <el-row :gutter="24">
          <el-col :xs="24" :md="12">
            <el-form-item label="耕地地力保护补贴" prop="grainSubsidy">
              <div class="unit-input">
                <el-input-number v-model="form.grainSubsidy" :min="0" :precision="0" controls-position="right" />
                <span class="unit-label">元</span>
              </div>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :md="12">
            <el-form-item label="大型农机购置补贴">
              <div class="unit-input">
                <el-input-number v-model="form.machinerySubsidy" :min="0" :precision="0" controls-position="right" />
                <span class="unit-label">元</span>
              </div>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="24">
          <el-col :xs="24" :md="12">
            <el-form-item label="粮食规模种植补贴">
              <div class="unit-input">
                <el-input-number v-model="form.grainScaleSubsidy" :min="0" :precision="0" controls-position="right" />
                <span class="unit-label">元</span>
              </div>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :md="12">
            <el-form-item label="特色经济作物补贴">
              <div class="unit-input">
                <el-input-number
                  v-model="form.specialtyCropSubsidy"
                  :min="0"
                  :precision="0"
                  controls-position="right"
                />
                <span class="unit-label">元</span>
              </div>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- ========== 维度三：农业保险类 ========== -->
        <el-divider content-position="left">
          <el-icon><Umbrella /></el-icon>
          <span style="margin-left: 6px">农业保险类（权重 20%，风险抵御维度）</span>
        </el-divider>

        <el-row :gutter="24">
          <el-col :xs="24" :sm="12" :md="8">
            <el-form-item label="连续投保年限" prop="insuranceYears">
              <div class="unit-input">
                <el-input-number
                  v-model="form.insuranceYears"
                  :min="0"
                  :max="30"
                  :precision="0"
                  controls-position="right"
                />
                <span class="unit-label">年</span>
              </div>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8">
            <el-form-item label="历史理赔频次">
              <div class="unit-input">
                <el-input-number
                  v-model="form.claimCount"
                  :min="0"
                  :max="50"
                  :precision="0"
                  controls-position="right"
                />
                <span class="unit-label">次</span>
              </div>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8">
            <el-form-item label="设施农业附加险" prop="facilityInsurance">
              <el-select v-model="form.facilityInsurance" placeholder="请选择" style="width: 100%">
                <el-option v-for="item in facilityOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- ========== 维度四：产销经营类 ========== -->
        <el-divider content-position="left">
          <el-icon><DataLine /></el-icon>
          <span style="margin-left: 6px">产销经营类（权重 15%，长期经营还款意愿维度）</span>
        </el-divider>

        <el-row :gutter="24">
          <el-col :xs="24" :sm="12" :md="8">
            <el-form-item label="持续经营年限" prop="yearsOperating">
              <div class="unit-input">
                <el-input-number
                  v-model="form.yearsOperating"
                  :min="0"
                  :max="50"
                  :precision="0"
                  controls-position="right"
                />
                <span class="unit-label">年</span>
              </div>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8">
            <el-form-item label="年稳定营收" prop="annualRevenue">
              <div class="unit-input">
                <el-input-number v-model="form.annualRevenue" :min="0" :precision="1" controls-position="right" />
                <span class="unit-label">万元</span>
              </div>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8">
            <el-form-item label="长期收购订单" prop="purchaseOrder">
              <el-select v-model="form.purchaseOrder" placeholder="请选择" style="width: 100%">
                <el-option v-for="item in orderOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="24">
          <el-col :xs="24" :md="12">
            <el-form-item label="历年信贷履约" prop="creditRecord">
              <el-select v-model="form.creditRecord" placeholder="请选择" style="width: 100%">
                <el-option v-for="item in creditOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 操作按钮 -->
        <el-divider />
        <div class="form-actions">
          <el-button @click="handleReset">重置</el-button>
          <el-button type="primary" :loading="submitting" @click="handleSubmit">
            <el-icon><Check /></el-icon>
            提交评估
          </el-button>
        </div>
      </el-form>
    </div>
  </div>
</template>

<style scoped lang="scss">
.form-wrapper {
  max-width: 1020px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

// 单位输入框：flex 自适应，防止遮挡与错位
.unit-input {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-width: 0;

  .el-input-number {
    flex: 1;
    min-width: 0;
    width: auto;
  }

  .unit-label {
    flex-shrink: 0;
    font-size: 13px;
    color: #606266;
    white-space: nowrap;
    line-height: 1;
  }
}
</style>
