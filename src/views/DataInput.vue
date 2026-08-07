<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useRiskStore } from '@/stores/risk'
import { getIndicatorTree } from '@/api/indicator'
import type { CategoryNode, IndicatorField } from '@/api/types'
import DynamicField from '@/components/DynamicField.vue'

const router = useRouter()
const riskStore = useRiskStore()

const loading = ref(false)
const submitting = ref(false)
const treeData = ref<CategoryNode[]>([])
const basicFields = ref<IndicatorField[]>([])

// ---------- 基本信息 ----------
const enterpriseName = ref('')
const productType = ref('')

// ---------- el-tree 搜索过滤 ----------
const filterText = ref('')
const treeRef = ref()

// ---------- 勾选叶子（具体营业类型）----------
const checkedLeaves = ref<string[]>([])

// ---------- 动态指标值 ----------
const values = reactive<Record<string, string>>({})

const bigCodes = computed(() => treeData.value.map((c) => c.code))
// 默认展开大类（第一级）
const expandedKeys = computed(() => bigCodes.value)

const basicCodeSet = computed(() => new Set(basicFields.value.map((f) => f.code)))

function filterNode(value: string, data: CategoryNode): boolean {
  if (!value) return true
  return data.display.includes(value)
}

watch(filterText, (v) => {
  treeRef.value?.filter(v)
})

// ---------- 勾选路径指标聚合（大类→中类→小类→具体营业类型，按 code 去重）----------
const displayGroups = computed(() => {
  const groups: { level: string; catDisplay: string; fields: IndicatorField[] }[] = []
  const seen = new Set<string>()
  const push = (level: string, catDisplay: string, fields: IndicatorField[] | undefined) => {
    if (!fields?.length) return
    const list = fields.filter((f) => {
      if (seen.has(f.code)) return false
      seen.add(f.code)
      return true
    })
    if (list.length) groups.push({ level, catDisplay, fields: list })
  }
  for (const leafCode of checkedLeaves.value) {
    const node = treeRef.value?.getNode(leafCode)
    if (!node) continue
    const path: CategoryNode[] = []
    let n = node
    while (n && n.data) {
      path.unshift(n.data as CategoryNode)
      n = n.parent
    }
    for (const d of path) push(d.level, d.display, d.indicators)
  }
  return groups
})

const totalDisplayFields = computed(() => displayGroups.value.reduce((a, g) => a + g.fields.length, 0))
const expandedGroupNames = computed(() => displayGroups.value.map((_, i) => `${i}`))

// ---------- 经营类型推导（单大类 / 混合）----------
const businessInfo = computed(() => {
  const leaves = checkedLeaves.value
  if (!leaves.length) return { businessType: '', mixedBusiness: {} as Record<string, number> }
  const bigCount: Record<string, number> = {}
  leaves.forEach((c) => {
    const big = c.split('_')[0].slice(0, 2)
    bigCount[big] = (bigCount[big] ?? 0) + 1
  })
  const bigs = Object.keys(bigCount)
  if (bigs.length === 1) return { businessType: bigs[0], mixedBusiness: {} }
  const total = leaves.length
  const mixed: Record<string, number> = {}
  bigs.forEach((b) => {
    mixed[b] = Math.round((bigCount[b] / total) * 100) / 100
  })
  return { businessType: 'MIXED', mixedBusiness: mixed }
})

const isMixed = computed(() => businessInfo.value.businessType === 'MIXED')

// ---------- 树勾选事件 ----------
function onTreeCheck() {
  const keys = (treeRef.value?.getCheckedKeys(true) ?? []) as string[]
  checkedLeaves.value = keys.filter((k) => String(k).includes('_'))
  // 移除未勾选字段的值（保留基本项）
  const valid = new Set<string>()
  displayGroups.value.forEach((g) => g.fields.forEach((f) => valid.add(f.code)))
  Object.keys(values).forEach((k) => {
    if (!basicCodeSet.value.has(k) && !valid.has(k)) delete values[k]
  })
  // 为新展示字段补初始值
  displayGroups.value.forEach((g) =>
    g.fields.forEach((f) => {
      if (!(f.code in values)) values[f.code] = ''
    }),
  )
}

// ---------- 初始化 ----------
async function init() {
  loading.value = true
  try {
    const tree = await getIndicatorTree()
    treeData.value = tree.categories
    basicFields.value = tree.basic
    basicFields.value.forEach((f) => {
      if (!(f.code in values)) values[f.code] = ''
    })
  } catch {
    ElMessage.error('指标配置加载失败，请确认后端已启动')
  } finally {
    loading.value = false
  }
}

// ---------- 提交 ----------
async function handleSubmit() {
  if (!enterpriseName.value.trim()) {
    ElMessage.warning('请填写企业名称')
    return
  }
  if (!checkedLeaves.value.length) {
    ElMessage.warning('请至少勾选 1 个具体营业类型')
    return
  }
  const { businessType, mixedBusiness } = businessInfo.value
  riskStore.setDynamicForm({
    enterpriseName: enterpriseName.value,
    businessType,
    productType: productType.value,
    selectedCategories: [...checkedLeaves.value],
    mixedBusiness,
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
  checkedLeaves.value = []
  treeRef.value?.setCheckedKeys([])
  Object.keys(values).forEach((k) => delete values[k])
  basicFields.value.forEach((f) => {
    values[f.code] = ''
  })
}

onMounted(init)
</script>

<template>
  <div class="dynamic-input-page">
    <div class="page-header">
      <h2>数据录入（动态指标体系）</h2>
      <p class="sub">勾选实际经营的「具体营业类型」（可多选，支持搜索），系统自动加载对应指标体系；未填指标不参与计分</p>
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
        </el-row>
      </el-form>

      <!-- 经营类别：el-tree 4级多选 -->
      <div class="section-title">
        经营类别（勾选具体营业类型，可多选）
        <el-tag v-if="checkedLeaves.length" size="small" type="success" effect="plain">
          已选 {{ checkedLeaves.length }} 个
        </el-tag>
      </div>
      <div class="tree-wrap">
        <el-input
          v-model="filterText"
          placeholder="搜索经营类别，如：稻谷、玉米、加工、服务…"
          clearable
          class="tree-filter"
        />
        <div class="tree-scroll">
          <el-tree
            ref="treeRef"
            :data="treeData"
            node-key="code"
            show-checkbox
            :props="{ label: 'display', children: 'children' }"
            :filter-node-method="filterNode"
            :default-expanded-keys="expandedKeys"
            @check="onTreeCheck"
          />
        </div>
        <el-alert
          v-if="isMixed"
          type="info"
          :closable="false"
          show-icon
          class="mixed-tip"
          title="已勾选多个大类，按混合经营加权评分"
          :description="Object.entries(businessInfo.mixedBusiness).map(([c, r]) => `${c} ${Math.round(r * 100)}%`).join(' · ')"
        />
      </div>

      <!-- 基本项（所有主体必填，可先填写） -->
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

      <!-- 勾选路径指标（大类→中类→小类→具体营业类型） -->
      <template v-if="displayGroups.length">
        <div class="section-title">
          勾选经营类型的指标（共 {{ totalDisplayFields }} 项）
          <span class="section-sub">按 大类 → 中类 → 小类 → 具体营业类型 依次展示</span>
        </div>
        <el-collapse class="group-collapse" :model-value="expandedGroupNames">
          <el-collapse-item
            v-for="(g, i) in displayGroups"
            :key="i"
            :name="`${i}`"
            :title="`${g.level} · ${g.catDisplay}（${g.fields.length} 项）`"
          >
            <el-row :gutter="20">
              <el-col v-for="f in g.fields" :key="f.code" :xs="24" :md="12" :lg="8">
                <DynamicField :field="f" v-model="values[f.code]" />
              </el-col>
            </el-row>
          </el-collapse-item>
        </el-collapse>
      </template>

      <div v-if="!checkedLeaves.length" class="empty-tip">
        <el-empty description="请先在经营类别中勾选具体营业类型，系统将自动加载对应指标" :image-size="80" />
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
.tree-wrap {
  .tree-filter {
    margin-bottom: 12px;
  }
  .tree-scroll {
    max-height: 420px;
    overflow: auto;
    border: 1px solid #e4e7ed;
    border-radius: 8px;
    padding: 8px 12px;
    :deep(.el-tree-node__content) {
      height: 30px;
      font-size: 13px;
    }
  }
  .mixed-tip {
    margin-top: 12px;
  }
}
.group-collapse {
  border: none;
  :deep(.el-collapse-item__header) {
    font-size: 13px;
    font-weight: 600;
    color: #4c956c;
  }
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
