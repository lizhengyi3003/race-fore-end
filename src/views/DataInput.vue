<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import type { FormInstance, FormRules } from 'element-plus'
import { useRiskStore } from '@/stores/risk'

const router = useRouter()
const riskStore = useRiskStore()

const formRef = ref<FormInstance>()
const submitting = ref(false)

const form = reactive({ ...riskStore.formData })

const businessTypeOptions = [
  { label: '种植业', value: '种植' },
  { label: '养殖业', value: '养殖' },
  { label: '农产品加工', value: '加工' },
  { label: '混合经营', value: '混合' },
]

const plantingOptions = [
  { label: '主粮种植（水稻/玉米/大豆）', value: '主粮种植' },
  { label: '经济作物', value: '经济作物' },
  { label: '混合经营', value: '混合经营' },
  { label: '设施农业', value: '设施农业' },
]

const stabilityOptions = [
  { label: '稳定', value: '稳定' },
  { label: '基本稳定', value: '基本稳定' },
  { label: '波动较大', value: '波动较大' },
  { label: '大幅波动', value: '大幅波动' },
]

const creditOptions = [
  { label: '无不良记录', value: '无不良记录' },
  { label: '轻微逾期', value: '轻微逾期' },
  { label: '多次逾期', value: '多次逾期' },
  { label: '严重失信', value: '严重失信' },
]

const educationOptions = [
  { label: '小学及以下', value: '小学及以下' },
  { label: '初中', value: '初中' },
  { label: '高中', value: '高中' },
  { label: '大专及以上', value: '大专及以上' },
]

const rules: FormRules = {
  enterpriseName: [{ required: true, message: '请输入企业名称', trigger: 'blur' }],
  businessType: [{ required: true, message: '请选择经营类型', trigger: 'change' }],
  // 户主特征类
  age: [{ required: true, message: '请输入年龄', trigger: 'blur' }],
  education: [{ required: true, message: '请选择受教育程度', trigger: 'change' }],
  familyMembers: [{ required: true, message: '请输入家庭成员数量', trigger: 'blur' }],
  // 土地经营类
  landConfirmedArea: [{ required: true, message: '请输入土地确权面积', trigger: 'blur' }],
  landTransferYears: [{ required: true, message: '请输入土地流转年限', trigger: 'blur' }],
  plantingStructure: [{ required: true, message: '请选择种植结构', trigger: 'change' }],
  // 农业补贴类
  grainSubsidy: [{ required: true, message: '请输入粮食直补金额', trigger: 'blur' }],
  // 农业保险类
  insuranceCoverage: [{ required: true, message: '请输入农业保险覆盖率', trigger: 'blur' }],
  // 经营稳定性类
  yearsOperating: [{ required: true, message: '请输入经营年限', trigger: 'blur' }],
  annualRevenue: [{ required: true, message: '请输入年销售收入', trigger: 'blur' }],
  revenueStability: [{ required: true, message: '请选择销售收入稳定性', trigger: 'change' }],
  creditStatus: [{ required: true, message: '请选择征信状况', trigger: 'change' }],
  // 贷款历史类
  loanHistory: [{ required: true, message: '请输入历史贷款记录', trigger: 'blur' }],
  loanOverdueHistory: [{ required: true, message: '请输入历史逾期记录', trigger: 'blur' }],
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
      <p>六大类 21 项替代数据指标 · 信贷员 3 分钟完成录入 · 系统基于 Logistic 评分卡智能评估</p>
    </div>

    <div class="info-card form-wrapper">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="110px" label-position="right">
        <!-- 基础信息 -->
        <el-divider content-position="left">
          <el-icon><OfficeBuilding /></el-icon>
          <span style="margin-left: 6px">基础信息</span>
        </el-divider>

        <el-row :gutter="24">
          <el-col :span="12">
            <el-form-item label="企业名称" prop="enterpriseName">
              <el-input v-model="form.enterpriseName" placeholder="请输入企业名称" maxlength="50" show-word-limit />
            </el-form-item>
          </el-col>
          <el-col :span="12">
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
          <el-col :span="12">
            <el-form-item label="主营产品">
              <el-input v-model="form.productType" placeholder="如：水稻、生猪、菌菇" maxlength="30" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- ========== 户主特征类 ========== -->
        <el-divider content-position="left">
          <el-icon><User /></el-icon>
          <span style="margin-left: 6px">户主特征类（反映金融素养与家庭劳动力）</span>
        </el-divider>

        <el-row :gutter="24">
          <el-col :span="8">
            <el-form-item label="年龄" prop="age">
              <div class="unit-input">
                <el-input-number v-model="form.age" :min="18" :max="80" :precision="0" controls-position="right" />
                <span class="unit-label">岁</span>
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="受教育程度" prop="education">
              <el-select v-model="form.education" placeholder="请选择最高学历" style="width: 100%">
                <el-option v-for="item in educationOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="家庭成员数" prop="familyMembers">
              <div class="unit-input">
                <el-input-number
                  v-model="form.familyMembers"
                  :min="1"
                  :max="20"
                  :precision="0"
                  controls-position="right"
                />
                <span class="unit-label">人</span>
              </div>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- ========== 第一类：土地经营类 ========== -->
        <el-divider content-position="left">
          <el-icon><Sunny /></el-icon>
          <span style="margin-left: 6px">土地经营类（反映经营规模与稳定性）</span>
        </el-divider>

        <el-row :gutter="24">
          <el-col :span="8">
            <el-form-item label="确权面积" prop="landConfirmedArea">
              <div class="unit-input">
                <el-input-number v-model="form.landConfirmedArea" :min="0" :precision="1" controls-position="right" />
                <span class="unit-label">亩</span>
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="流转年限" prop="landTransferYears">
              <div class="unit-input">
                <el-input-number
                  v-model="form.landTransferYears"
                  :min="0"
                  :max="50"
                  :precision="1"
                  controls-position="right"
                />
                <span class="unit-label">年</span>
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="规模利用率">
              <div class="unit-input">
                <el-input-number
                  v-model="form.landUtilization"
                  :min="0"
                  :max="100"
                  :precision="1"
                  controls-position="right"
                />
                <span class="unit-label">%</span>
              </div>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="24">
          <el-col :span="12">
            <el-form-item label="种植结构" prop="plantingStructure">
              <el-select v-model="form.plantingStructure" placeholder="请选择种植结构" style="width: 100%">
                <el-option v-for="item in plantingOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- ========== 第二类：农业补贴类 ========== -->
        <el-divider content-position="left">
          <el-icon><Money /></el-icon>
          <span style="margin-left: 6px">农业补贴类（反映政策支持力度与收入底线）</span>
        </el-divider>

        <el-row :gutter="24">
          <el-col :span="8">
            <el-form-item label="粮食直补" prop="grainSubsidy">
              <div class="unit-input">
                <el-input-number v-model="form.grainSubsidy" :min="0" :precision="0" controls-position="right" />
                <span class="unit-label">元</span>
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="农机购置补贴">
              <div class="unit-input">
                <el-input-number v-model="form.machinerySubsidy" :min="0" :precision="0" controls-position="right" />
                <span class="unit-label">元</span>
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="其他涉农补贴">
              <div class="unit-input">
                <el-input-number v-model="form.otherSubsidy" :min="0" :precision="0" controls-position="right" />
                <span class="unit-label">元</span>
              </div>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- ========== 第三类：农业保险类 ========== -->
        <el-divider content-position="left">
          <el-icon><Umbrella /></el-icon>
          <span style="margin-left: 6px">农业保险类（反映风险管理意识与抗风险能力）</span>
        </el-divider>

        <el-row :gutter="24">
          <el-col :span="12">
            <el-form-item label="保险覆盖率" prop="insuranceCoverage">
              <div class="unit-input">
                <el-input-number
                  v-model="form.insuranceCoverage"
                  :min="0"
                  :max="100"
                  :precision="1"
                  controls-position="right"
                />
                <span class="unit-label">%</span>
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="理赔次数">
              <div class="unit-input">
                <el-input-number v-model="form.claimCount" :min="0" :max="50" controls-position="right" />
                <span class="unit-label">次</span>
              </div>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="24">
          <el-col :span="12">
            <el-form-item label="理赔金额">
              <div class="unit-input">
                <el-input-number v-model="form.claimAmount" :min="0" :precision="0" controls-position="right" />
                <span class="unit-label">元</span>
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="理赔占比">
              <div class="unit-input">
                <el-input-number
                  v-model="form.claimRatio"
                  :min="0"
                  :max="100"
                  :precision="1"
                  controls-position="right"
                />
                <span class="unit-label">%</span>
              </div>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- ========== 第四类：经营稳定性类 ========== -->
        <el-divider content-position="left">
          <el-icon><DataLine /></el-icon>
          <span style="margin-left: 6px">经营稳定性类（反映持续经营能力）</span>
        </el-divider>

        <el-row :gutter="24">
          <el-col :span="8">
            <el-form-item label="经营年限" prop="yearsOperating">
              <div class="unit-input">
                <el-input-number
                  v-model="form.yearsOperating"
                  :min="0"
                  :max="50"
                  :precision="1"
                  controls-position="right"
                />
                <span class="unit-label">年</span>
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="经营集中度">
              <div class="unit-input">
                <el-input-number
                  v-model="form.businessConcentration"
                  :min="0"
                  :max="100"
                  :precision="1"
                  controls-position="right"
                />
                <span class="unit-label">%</span>
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="年销售收入" prop="annualRevenue">
              <div class="unit-input">
                <el-input-number v-model="form.annualRevenue" :min="0" :precision="1" controls-position="right" />
                <span class="unit-label">万元</span>
              </div>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="24">
          <el-col :span="12">
            <el-form-item label="销售收入稳定性" prop="revenueStability">
              <el-select v-model="form.revenueStability" placeholder="请选择近三年收入波动" style="width: 100%">
                <el-option v-for="item in stabilityOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="经营者征信状况" prop="creditStatus">
              <el-select v-model="form.creditStatus" placeholder="请选择征信状况" style="width: 100%">
                <el-option v-for="item in creditOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- ========== 第六类：贷款历史类 ========== -->
        <el-divider content-position="left">
          <el-icon><Stamp /></el-icon>
          <span style="margin-left: 6px">贷款历史类（反映信用记录与履约能力）</span>
        </el-divider>

        <el-row :gutter="24">
          <el-col :span="12">
            <el-form-item label="历史贷款记录" prop="loanHistory">
              <div class="unit-input">
                <el-input-number
                  v-model="form.loanHistory"
                  :min="0"
                  :max="50"
                  :precision="0"
                  controls-position="right"
                />
                <span class="unit-label">次</span>
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="历史逾期记录" prop="loanOverdueHistory">
              <div class="unit-input">
                <el-input-number
                  v-model="form.loanOverdueHistory"
                  :min="0"
                  :max="50"
                  :precision="0"
                  controls-position="right"
                />
                <span class="unit-label">次</span>
              </div>
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
