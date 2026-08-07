<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useRiskStore } from '@/stores/risk'
import { getIndicatorConfig, getIndicatorTree } from '@/api/indicator'
import type { CategoryNode, IndicatorField } from '@/api/types'
import DynamicField from '@/components/DynamicField.vue'

const router = useRouter()
const riskStore = useRiskStore()

const loading = ref(false)
const submitting = ref(false)
const tree = ref<{ basic: IndicatorField[]; categories: CategoryNode[] } | null>(null)

// ---------- 基本信息 ----------
const enterpriseName = ref('')
const productType = ref('')
const businessType = ref('') // 大类编码 01~10 或 MIXED

// ---------- 混合经营 ----------
const mixedSelected = ref<string[]>([])
const mixedRatios = reactive<Record<string, number>>({})

// ---------- 动态指标值 ----------
const values = reactive<Record<string, string>>({})

// ---------- 渐进式勾选（中类/小类层级）----------
const checkedMiddle = ref<string[]>([])
const checkedSmall = reactive<Record<string, string[]>>({})
const basicFields = ref<IndicatorField[]>([])
// 按类别编码缓存指标（大类码 / 中类码 / 小类码）
const indicatorMap = reactive<Record<string, IndicatorField[]>>({})

const bigCategories = computed(() => tree.value?.categories ?? [])
const isMixed = computed(() => businessType.value === 'MIXED')

const currentCategory = computed(() => bigCategories.value.find((c) => c.code === businessType.value))

const middleList = computed(() => currentCategory.value?.children ?? [])

function smallList(middleCode: string): CategoryNode[] {
  const m = middleList.value.find((c) => c.code === middleCode)
  return m?.children ?? []
}

function fieldsOf(code: string): IndicatorField[] {
  return indicatorMap[code] ?? []
}

/** 确保 values 中每个已加载字段都有初始值（避免 undefined 警告） */
function ensureValues(fields: IndicatorField[]) {
  fields.forEach((f) => {
    if (!(f.code in values)) values[f.code] = ''
  })
}

function bigFields(): IndicatorField[] {
  return businessType.value && !isMixed.value ? fieldsOf(businessType.value) : []
}

function isMiddleChecked(code: string) {
  return checkedMiddle.value.includes(code)
}
function isSmallChecked(middleCode: string, smallCode: string) {
  return (checkedSmall[middleCode] ?? []).includes(smallCode)
}

async function init() {
  loading.value = true
  try {
    tree.value = await getIndicatorTree()
    // 基本项不依赖经营类型，初始化即加载，可先填写
    basicFields.value = tree.value.basic
    ensureValues(basicFields.value)
  } catch {
    ElMessage.error('指标配置加载失败，请确认后端已启动')
  } finally {
    loading.value = false
  }
}

async function onBusinessTypeChange() {
  // 清空旧状态（基本项已初始化加载，其填写值保留）
  checkedMiddle.value = []
  Object.keys(checkedSmall).forEach((k) => delete checkedSmall[k])
  Object.keys(indicatorMap).forEach((k) => delete indicatorMap[k])
  const basicCodes = new Set(basicFields.value.map((f) => f.code))
  Object.keys(values).forEach((k) => {
    if (!basicCodes.has(k)) delete values[k]
  })
  if (!businessType.value || isMixed.value) return
  const cfg = await getIndicatorConfig({ businessType: businessType.value })
  indicatorMap[businessType.value] = cfg.indicators.filter((f) => f.level === '大类')
  ensureValues(indicatorMap[businessType.value])
}

async function onMiddleToggle(middle: CategoryNode, checked: boolean) {
  const idx = checkedMiddle.value.indexOf(middle.code)
  if (checked) {
    if (idx < 0) checkedMiddle.value.push(middle.code)
    if (!indicatorMap[middle.code]) {
      const cfg = await getIndicatorConfig({ businessType: businessType.value, middleType: middle.code })
      indicatorMap[middle.code] = cfg.indicators.filter((f) => f.level === '中类')
      ensureValues(indicatorMap[middle.code])
    }
  } else {
    if (idx >= 0) checkedMiddle.value.splice(idx, 1)
    delete indicatorMap[middle.code]
    // 级联取消其下小类及小类指标
    delete checkedSmall[middle.code]
    smallList(middle.code).forEach((s) => delete indicatorMap[s.code])
  }
}

async function onSmallToggle(middleCode: string, small: CategoryNode, checked: boolean) {
  const list = (checkedSmall[middleCode] ??= [])
  const idx = list.indexOf(small.code)
  if (checked) {
    if (idx < 0) list.push(small.code)
    if (!indicatorMap[small.code]) {
      const cfg = await getIndicatorConfig({
        businessType: businessType.value,
        middleType: middleCode,
        smallType: small.code,
      })
      indicatorMap[small.code] = cfg.indicators.filter((f) => f.level === '小类')
      ensureValues(indicatorMap[small.code])
    }
  } else {
    if (idx >= 0) list.splice(idx, 1)
    delete indicatorMap[small.code]
  }
}

// ---------- 混合经营比例 ----------
function onMixedToggle(code: string, checked: boolean) {
  if (checked) {
    if (!mixedSelected.value.includes(code)) mixedSelected.value.push(code)
    if (!mixedRatios[code]) mixedRatios[code] = 50
  } else {
    mixedSelected.value = mixedSelected.value.filter((c) => c !== code)
    delete mixedRatios[code]
  }
  normalizeRatios()
}

function normalizeRatios() {
  const total = Object.values(mixedRatios).reduce((a, b) => a + b, 0)
  if (total <= 0) return
  Object.keys(mixedRatios).forEach((k) => {
    mixedRatios[k] = Math.round((mixedRatios[k] / total) * 100)
  })
}

// ---------- 提交 ----------
async function handleSubmit() {
  if (!enterpriseName.value.trim()) {
    ElMessage.warning('请填写企业名称')
    return
  }
  if (!businessType.value) {
    ElMessage.warning('请选择经营类型')
    return
  }
  let finalBusinessType = businessType.value
  const mixed: Record<string, number> = {}
  if (isMixed.value) {
    if (mixedSelected.value.length < 2) {
      ElMessage.warning('混合经营请至少选择 2 种业务类型')
      return
    }
    normalizeRatios()
    mixedSelected.value.forEach((c) => {
      mixed[c] = Math.round((mixedRatios[c] / 100) * 100) / 100
    })
    finalBusinessType = 'MIXED'
  }
  riskStore.setDynamicForm({
    enterpriseName: enterpriseName.value,
    businessType: finalBusinessType,
    productType: productType.value,
    mixedBusiness: mixed,
    indicators: { ...values },
  })
  submitting.value = true
  try {
    await riskStore.assessDynamic()
    router.push('/result')
  } finally {
    submitting.value = false
  }
}

function handleReset() {
  enterpriseName.value = ''
  productType.value = ''
  businessType.value = ''
  mixedSelected.value = []
  Object.keys(mixedRatios).forEach((k) => delete mixedRatios[k])
  Object.keys(values).forEach((k) => delete values[k])
  Object.keys(indicatorMap).forEach((k) => delete indicatorMap[k])
  checkedMiddle.value = []
  Object.keys(checkedSmall).forEach((k) => delete checkedSmall[k])
}

onMounted(init)
</script>

<template>
  <div class="dynamic-input-page">
    <div class="page-header">
      <h2>数据录入（动态指标体系）</h2>
      <p class="sub">选择经营类型，逐级展开填报指标；指标体系共 775 项，未填指标不参与计分（权重自动再分配）</p>
    </div>

    <el-card v-loading="loading" shadow="never" class="input-card">
      <!-- 基本信息 -->
      <div class="section-title">基本信息</div>
      <el-form label-width="110px" label-position="left" class="basic-form">
        <el-row :gutter="20">
          <el-col :xs="24" :md="12">
            <el-form-item label="企业名称" required>
              <el-input v-model="enterpriseName" placeholder="企业/合作社/家庭农场/个体户全称" maxlength="50" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :md="12">
            <el-form-item label="主营产品">
              <el-input v-model="productType" placeholder="可选" maxlength="30" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :md="12">
            <el-form-item label="经营类型" required>
              <el-select v-model="businessType" placeholder="请选择经营类型" style="width: 100%" @change="onBusinessTypeChange">
                <el-option v-for="c in bigCategories" :key="c.code" :label="c.display" :value="c.code" />
                <el-option label="混合经营" value="MIXED" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <!-- 基本项（不依赖经营类型，初始化即加载，可先填写） -->
      <template v-if="basicFields.length">
        <div class="section-title">
          基本项（共 {{ basicFields.length }} 项）
          <span class="section-sub">所有主体必填的基础信息</span>
        </div>
        <el-collapse :model-value="['basic']" class="basic-collapse">
          <el-collapse-item name="basic" title="展开 / 收起基本项">
            <el-row :gutter="20">
              <el-col v-for="f in basicFields" :key="f.code" :xs="24" :md="12" :lg="8">
                <DynamicField :field="f" v-model="values[f.code]" />
              </el-col>
            </el-row>
          </el-collapse-item>
        </el-collapse>
      </template>

      <!-- 混合经营比例 -->
      <template v-if="isMixed">
        <div class="section-title">混合经营构成（拖动调整占比）</div>
        <div class="mixed-box">
          <el-checkbox-group :model-value="mixedSelected" @update:model-value="normalizeRatios">
            <el-checkbox
              v-for="c in bigCategories"
              :key="c.code"
              :value="c.code"
              :label="c.display"
              @change="(v: boolean | string | number) => onMixedToggle(c.code, Boolean(v))"
            />
          </el-checkbox-group>
          <div
            v-for="c in bigCategories.filter((x) => mixedSelected.includes(x.code))"
            :key="c.code"
            class="ratio-row"
          >
            <span class="ratio-name">{{ c.display }}</span>
            <el-slider v-model="mixedRatios[c.code]" :min="0" :max="100" :step="5" class="ratio-slider" @input="normalizeRatios" />
            <span class="ratio-val">{{ mixedRatios[c.code] }}%</span>
          </div>
          <el-alert
            v-if="mixedSelected.length && mixedSelected.length < 2"
            type="warning"
            :closable="false"
            show-icon
            title="混合经营请至少选择 2 种业务类型"
          />
        </div>
        <p class="tip">混合经营按所选业务比例加权评分，后续可叠加协同因子（如种养结合生态循环）。</p>
      </template>

      <!-- 单经营类型：大类指标 + 中类/小类层级勾选 -->
      <template v-if="!isMixed && businessType">
        <!-- 大类指标 -->
        <template v-if="bigFields().length">
          <div class="section-title">{{ currentCategory?.display }} · 大类指标（{{ bigFields().length }} 项）</div>
          <el-row :gutter="20">
            <el-col v-for="f in bigFields()" :key="f.code" :xs="24" :md="12" :lg="8">
              <DynamicField :field="f" v-model="values[f.code]" />
            </el-col>
          </el-row>
        </template>

        <!-- 中类：层级勾选，仅展示所选 -->
        <div class="section-title">中类（勾选实际经营的类别，共 {{ middleList.length }} 个）</div>
        <div class="level-list">
          <div v-for="m in middleList" :key="m.code" class="level-item">
            <div class="level-head" :class="{ active: isMiddleChecked(m.code) }">
              <el-checkbox
                :model-value="isMiddleChecked(m.code)"
                @change="(v: boolean | string | number) => onMiddleToggle(m, Boolean(v))"
              >
                <span class="level-name">{{ m.display }}</span>
                <el-tag size="small" type="info" effect="plain">{{ m.indicator_count }} 指标</el-tag>
              </el-checkbox>
            </div>
            <div v-if="isMiddleChecked(m.code)" class="level-body">
              <!-- 中类指标 -->
              <el-row v-if="fieldsOf(m.code).length" :gutter="20">
                <el-col v-for="f in fieldsOf(m.code)" :key="f.code" :xs="24" :md="12" :lg="8">
                  <DynamicField :field="f" v-model="values[f.code]" />
                </el-col>
              </el-row>
              <!-- 小类：层级勾选 -->
              <div v-if="smallList(m.code).length" class="level-list sub">
                <div v-for="s in smallList(m.code)" :key="s.code" class="level-item">
                  <div class="level-head" :class="{ active: isSmallChecked(m.code, s.code) }">
                    <el-checkbox
                      :model-value="isSmallChecked(m.code, s.code)"
                      @change="(v: boolean | string | number) => onSmallToggle(m.code, s, Boolean(v))"
                    >
                      <span class="level-name">{{ s.display }}</span>
                      <el-tag size="small" type="info" effect="plain">{{ s.indicator_count }} 指标</el-tag>
                    </el-checkbox>
                  </div>
                  <div v-if="isSmallChecked(m.code, s.code)" class="level-body">
                    <el-row v-if="fieldsOf(s.code).length" :gutter="20">
                      <el-col v-for="f in fieldsOf(s.code)" :key="f.code" :xs="24" :md="12" :lg="8">
                        <DynamicField :field="f" v-model="values[f.code]" />
                      </el-col>
                    </el-row>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <div v-if="!businessType" class="empty-tip">
        <el-empty description="请先选择经营类型，系统将动态加载对应指标体系" :image-size="80" />
      </div>

      <!-- 操作 -->
      <div class="actions">
        <el-button :loading="submitting" type="primary" size="large" @click="handleSubmit">提交评估</el-button>
        <el-button size="large" @click="handleReset">重置</el-button>
      </div>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.dynamic-input-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px;
}
.page-header {
  margin-bottom: 16px;
  h2 {
    margin: 0 0 6px;
  }
  .sub {
    color: #909399;
    font-size: 13px;
    margin: 0;
  }
}
.input-card {
  border-radius: 10px;
}
.section-title {
  font-weight: 600;
  font-size: 15px;
  margin: 20px 0 12px;
  padding-left: 8px;
  border-left: 3px solid #4c956c;
  display: flex;
  align-items: center;
  gap: 8px;
  .section-sub {
    font-weight: 400;
    font-size: 12px;
    color: #909399;
  }
}
.basic-collapse {
  border: none;
  :deep(.el-collapse-item__header) {
    font-size: 13px;
    color: #606266;
  }
}
.mixed-box {
  padding: 8px 0;
  .ratio-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 10px 0;
    .ratio-name {
      width: 180px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-size: 13px;
    }
    .ratio-slider {
      flex: 1;
    }
    .ratio-val {
      width: 48px;
      text-align: right;
      color: #4c956c;
      font-weight: 600;
    }
  }
}
.tip {
  color: #909399;
  font-size: 12px;
  margin: 8px 0 0;
}
.level-list {
  margin: 4px 0;
  &.sub {
    margin-left: 24px;
    border-left: 2px dashed #e4e7ed;
    padding-left: 12px;
  }
}
.level-item {
  margin-bottom: 8px;
}
.level-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid #e4e7ed;
  transition: all 0.2s;
  &:hover {
    background: #f5f7fa;
  }
  &.active {
    background: #f0f9eb;
    border-color: #a8dc9f;
  }
  .arrow {
    color: #909399;
  }
  .level-name {
    flex: 1;
    font-size: 14px;
  }
}
.level-body {
  padding: 12px 8px 4px 24px;
}
.empty-tip {
  padding: 40px 0;
}
.actions {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  gap: 12px;
}
</style>
