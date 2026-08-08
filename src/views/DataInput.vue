<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useRiskStore } from '@/stores/risk'
import { getIndicatorTree } from '@/api/indicator'
import type { CategoryNode, IndicatorField } from '@/api/types'
import DynamicField from '@/components/DynamicField.vue'
import MixedRatioSlider from '@/components/MixedRatioSlider.vue'
import { validateIndicatorMap } from '@/utils/validateIndicator'

const router = useRouter()
const riskStore = useRiskStore()

const loading = ref(false)
const submitting = ref(false)
// 指标配置加载失败标志（提供页内重试，避免只能整页刷新）
const loadError = ref(false)
const treeData = ref<CategoryNode[]>([])
const basicFields = ref<IndicatorField[]>([])

// ---------- 基本信息 ----------
const enterpriseName = ref('')

// ---------- el-tree 搜索过滤 ----------
const filterText = ref('')
const treeRef = ref()

// ---------- 勾选叶子（具体营业类型）----------
const checkedLeaves = ref<string[]>([])

// ---------- 动态指标值 ----------
const values = reactive<Record<string, string>>({})

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

// ---------- 具体营业类型（国标 4+4 位叶子）列表：勾选后按叶子分配权重 ----------
const leafList = computed(() =>
  checkedLeaves.value.map((c) => {
    const node = treeRef.value?.getNode(c)
    const d = node?.data as CategoryNode | undefined
    return { code: c, label: d?.name || d?.display || c }
  })
)

// 勾选多个具体营业类型（含同一大类内多个）即按叶子分配占比
const isMixed = computed(() => leafList.value.length > 1)

const mixedRatios = ref<Record<string, number>>({})

const businessInfo = computed(() => {
  const leaves = leafList.value
  if (!leaves.length) return { businessType: '', mixedBusiness: {} as Record<string, number> }
  if (leaves.length === 1) {
    // 单叶子：按所属大类评估（占比 100% 无需分配）
    return { businessType: leaves[0].code.split('_')[0].slice(0, 2), mixedBusiness: {} }
  }
  // 多叶子（含同大类多叶子）：混合经营，按具体营业类型分配权重
  return { businessType: 'MIXED', mixedBusiness: { ...mixedRatios.value } }
})

// ---------- 树勾选事件（仅叶子「具体营业类型」可勾选）----------
function isLeaf(data: CategoryNode): boolean {
  return !data.children || data.children.length === 0
}

function onLeafToggle(node: any, val: boolean) {
  // 只允许勾选叶子（具体营业类型）；非叶子无复选框，此处为保险拦截
  if (!isLeaf(node.data as CategoryNode)) {
    ElMessage.warning('请勾选最后一级「具体营业类型」')
    return
  }
  treeRef.value?.setChecked(node.data.code, val)
  onTreeCheck()
}

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
    })
  )
}

// ---------- 初始化 ----------
async function init() {
  loading.value = true
  loadError.value = false
  try {
    const tree = await getIndicatorTree()
    treeData.value = tree.categories
    basicFields.value = tree.basic
    basicFields.value.forEach((f) => {
      if (!(f.code in values)) values[f.code] = ''
    })
  } catch {
    loadError.value = true
    ElMessage.error('指标配置加载失败，请检查网络后点击「重新加载」')
  } finally {
    loading.value = false
  }
}

// 页内重试加载（网络抖动/接口超时后无需整页刷新）
function retryLoad() {
  init()
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
  // 校验全部展示指标（基本项 + 勾选路径指标）
  const allFields: IndicatorField[] = [...basicFields.value]
  displayGroups.value.forEach((g) => allFields.push(...g.fields))
  const errors = validateIndicatorMap(allFields, values)
  if (errors.length) {
    const shown = errors
      .slice(0, 5)
      .map((e) => `· ${e}`)
      .join('\n')
    ElMessage.error(
      `存在 ${errors.length} 处输入错误，请修正后再提交：\n${shown}${errors.length > 5 ? `\n… 还有 ${errors.length - 5} 处` : ''}`
    )
    return
  }
  // 保存原始表单快照（结果页「查看原始表单」用）
  riskStore.setFormSnapshot(
    allFields
      .map((f) => ({ code: f.code, name: f.name, level: f.level, unit: f.unit, value: values[f.code] ?? '' }))
      .filter((s) => s.value !== '')
  )
  const { businessType, mixedBusiness } = businessInfo.value
  riskStore.setDynamicForm({
    enterpriseName: enterpriseName.value,
    businessType,
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
  checkedLeaves.value = []
  mixedRatios.value = {}
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
      <p class="sub">
        勾选实际经营的「具体营业类型」（可多选，支持搜索），系统自动加载对应指标体系；未填指标不参与计分
      </p>
    </div>

    <el-card v-loading="loading" shadow="never" class="input-card">
      <!-- 指标配置加载失败：页内重试（网络抖动/接口超时无需整页刷新） -->
      <div v-if="loadError" class="load-error">
        <el-empty description="指标配置加载失败，请检查网络后重试" :image-size="80">
          <el-button type="primary" @click="retryLoad">重新加载</el-button>
        </el-empty>
      </div>

      <template v-else>
        <!-- 基本信息 -->
        <div class="section-title">基本信息</div>
      <el-form label-width="110px" label-position="left" class="basic-form">
        <el-row :gutter="20">
          <el-col :xs="24" :md="24">
            <el-form-item label="企业名称" required>
              <el-input v-model="enterpriseName" placeholder="企业/合作社/家庭农场/个体户全称" maxlength="50" />
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
            :props="{ label: 'display', children: 'children' }"
            :filter-node-method="filterNode"
            @check="onTreeCheck"
          >
            <template #default="{ node, data }">
              <div class="custom-tree-node">
                <el-checkbox
                  v-if="isLeaf(data)"
                  :model-value="node.checked"
                  class="leaf-checkbox"
                  @click.stop
                  @change="(val: boolean | string | number) => onLeafToggle(node, !!val)"
                />
                <span class="node-label" :class="{ 'is-leaf': isLeaf(data) }">{{ data.display }}</span>
                <span v-if="!isLeaf(data) && data.indicator_count" class="node-count">
                  {{ data.indicator_count }} 项指标
                </span>
              </div>
            </template>
          </el-tree>
        </div>
        <div v-if="isMixed" class="mixed-wrap">
          <div class="mixed-title">
            <el-icon><Connection /></el-icon>
            混合经营占比（勾选 {{ leafList.length }} 个具体营业类型）
          </div>
          <MixedRatioSlider v-model:ratios="mixedRatios" :items="leafList" />
        </div>
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
                <DynamicField v-model="values[f.code]" :field="f" />
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
                <DynamicField v-model="values[f.code]" :field="f" />
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
      </template>
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
      height: 32px;
      font-size: 13px;
    }
    .custom-tree-node {
      display: flex;
      align-items: center;
      gap: 6px;
      width: 100%;
      min-width: 0;

      .leaf-checkbox {
        margin-right: 2px;
      }

      .node-label {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: #303133;

        &.is-leaf {
          color: #2c6e49;
        }
      }

      .node-count {
        margin-left: auto;
        padding-right: 8px;
        font-size: 11px;
        color: #c0c4cc;
        flex-shrink: 0;
      }
    }
  }
  .mixed-wrap {
    margin-top: 14px;
    padding: 12px 14px;
    border: 1px solid #dcdfe6;
    border-radius: 8px;
    background: #fafafa;

    .mixed-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 600;
      color: #2c6e49;
      margin-bottom: 10px;
    }
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
.load-error {
  padding: 40px 0;
}
.actions {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  gap: 12px;
}

// ===== 移动端适配 =====
@media (max-width: 768px) {
  .dynamic-input-page {
    padding: 12px;
  }
  .section-title {
    flex-wrap: wrap;
    gap: 6px;
  }
  // 基本信息 label 置顶
  .basic-form {
    :deep(.el-form-item__label) {
      display: block;
      width: auto !important;
      height: auto;
      text-align: left;
      justify-content: flex-start;
      line-height: 1.5;
      margin-bottom: 4px;
    }
    :deep(.el-form-item__content) {
      display: block;
      margin-left: 0 !important;
    }
  }
  .tree-wrap {
    .tree-scroll {
      max-height: 320px;
    }
  }
  // 操作按钮移动端全宽
  .actions {
    flex-direction: column;
    :deep(.el-button) {
      width: 100%;
      margin-left: 0;
    }
  }
}
</style>
