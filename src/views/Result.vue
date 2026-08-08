<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRiskStore } from '@/stores/risk'
import * as echarts from 'echarts'
import ScoreGauge from '@/components/ScoreGauge.vue'
import RiskBadge from '@/components/RiskBadge.vue'
import { deleteRiskRecord, getRiskRecord, getRiskRecords } from '@/api/risk'
import type { AssessmentRecordDetail, AssessmentRecordItem } from '@/api/types'

const router = useRouter()
const riskStore = useRiskStore()

const barChartRef = ref<HTMLElement>()
let barChart: echarts.ECharts | null = null

function handleResize() {
  if (barChart) barChart.resize()
}

// 有数据时初始化图表
onMounted(() => {
  if (riskStore.hasResult) {
    initBarChart()
  }
  window.addEventListener('resize', handleResize)
  loadHistory()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  barChart?.dispose()
  barChart = null
})

const result = computed(() => riskStore.riskResult!)

// ---------- 历史评估记录（当前账号）----------
const historyRecords = ref<AssessmentRecordItem[]>([])
const historyTotal = ref(0)
const historyPage = ref(1)
const historySize = 8
const historyLoading = ref(false)
// 当前正在查看的历史记录（用于标题展示与删除联动）
const viewingHistoryId = ref(0)
const currentHistoryName = ref('')
// 当前历史详情（含原始指标明细，供「查看原始表单」）
const currentHistoryDetail = ref<AssessmentRecordDetail | null>(null)

// ---------- 原始表单查看 ----------
const formDrawerVisible = ref(false)
const formRows = ref<{ name: string; level: string; unit: string; value: string }[]>([])

function showForm() {
  if (viewingHistoryId.value && currentHistoryDetail.value) {
    const iv = currentHistoryDetail.value.indicatorValues || []
    formRows.value = iv.map((r) => ({ name: r.name, level: r.level, unit: r.unit, value: r.value ?? '' }))
  } else {
    formRows.value = riskStore.formSnapshot.map((s) => ({ name: s.name, level: s.level, unit: s.unit, value: s.value }))
  }
  formDrawerVisible.value = true
}

async function loadHistory(page = 1) {
  historyLoading.value = true
  try {
    const data = await getRiskRecords({ page, size: historySize })
    historyRecords.value = data.items
    historyTotal.value = data.total
    historyPage.value = page
  } catch {
    // 错误已由拦截器提示
  } finally {
    historyLoading.value = false
  }
}

function formatTime(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

async function viewHistory(recordId: number) {
  try {
    const detail = await getRiskRecord(recordId)
    if (!detail.result) {
      ElMessage.warning('该记录缺少结果快照，无法查看')
      return
    }
    riskStore.setResult(detail.result)
    currentHistoryName.value = detail.enterpriseName || ''
    viewingHistoryId.value = recordId
    currentHistoryDetail.value = detail
    await nextTick()
    initBarChart()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch {
    // 错误已由拦截器提示
  }
}

async function removeHistory(row: AssessmentRecordItem) {
  try {
    await ElMessageBox.confirm(`确认删除「${row.enterpriseName}」的评估记录？删除后不可恢复。`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  try {
    await deleteRiskRecord(row.id)
    ElMessage.success('已删除')
    if (viewingHistoryId.value === row.id) {
      riskStore.setResult(null)
      currentHistoryName.value = ''
      viewingHistoryId.value = 0
      currentHistoryDetail.value = null
    }
    if (historyRecords.value.length === 1 && historyPage.value > 1) {
      loadHistory(historyPage.value - 1)
    } else {
      loadHistory(historyPage.value)
    }
  } catch {
    // 错误已由拦截器提示
  }
}

// 贡献图移动端最小宽度（每个指标约 96px），超出时容器横向滑动
const contributionMinWidth = computed(() => (result.value?.contributions?.length || 6) * 96)

const probabilityPercent = computed(() => (result.value ? (result.value.probability * 100).toFixed(2) : '0.00'))

// 打印报告
const printDate = computed(() => new Date().toLocaleString('zh-CN'))
const reportTitle = computed(
  () =>
    currentHistoryName.value ||
    riskStore.dynamicForm.enterpriseName ||
    '涉农经营主体'
)

// 报告编号（按时间生成）
const reportNo = computed(() => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `RACE-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
})

// 经营类型显示名（大类码 → 名称）
const BIG_TYPE_NAMES: Record<string, string> = {
  '01': '农林牧渔业',
  '02': '食用加工与制造',
  '03': '非食用加工与制造',
  '04': '生产资料制造和农田水利设施建设',
  '05': '流通服务',
  '06': '科研和技术服务',
  '07': '教育培训与人力资源服务',
  '08': '生态保护和环境治理',
  '09': '休闲观光与农业农村管理服务',
  '10': '其他支持服务',
}
const businessTypeText = computed(() => {
  const bt = riskStore.dynamicForm.businessType || ''
  if (!bt) return '—'
  if (bt === 'MIXED') return '混合经营'
  return BIG_TYPE_NAMES[bt] || bt
})

const sortedContribs = computed(() => [...(result.value?.contributions || [])].sort((a, b) => b.score - a.score))
const completenessText = computed(() =>
  result.value?.completeness != null ? `${(result.value.completeness * 100).toFixed(0)}%` : '—'
)

function handlePrint() {
  window.print()
}

function initBarChart() {
  if (!barChartRef.value || !result.value) return
  barChart?.dispose()
  const chart = echarts.init(barChartRef.value)
  barChart = chart

  const contribs = result.value.contributions.sort((a, b) => b.score - a.score)
  const factorCount = contribs.length

  chart.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: { name: string; value: number }[]) => {
        const p = params[0]
        return `${p.name}<br/>得分：${p.value.toFixed(1)} 分`
      },
    },
    // 纵向柱状图：指标名称在底部横轴，容器可横向滑动，避免左侧长名称占位过大
    grid: { top: 32, right: 20, bottom: 28, left: 46 },
    xAxis: {
      type: 'category',
      data: contribs.map((c) => c.factor),
      axisLabel: {
        fontSize: 10,
        interval: 0,
        // 指标较多时倾斜避免重叠
        rotate: factorCount >= 7 ? 25 : 0,
      },
    },
    yAxis: {
      type: 'value',
      max: 100,
      axisLabel: { formatter: '{value}分', fontSize: 10 },
    },
    series: [
      {
        type: 'bar',
        data: contribs.map((c) => ({
          value: c.score,
          itemStyle: {
            color: c.score >= 80 ? '#67c23a' : c.score >= 60 ? '#e6a23c' : '#f56c6c',
            borderRadius: [4, 4, 0, 0],
          },
        })),
        barWidth: 26,
        label: {
          show: true,
          position: 'top',
          formatter: '{c}',
          fontSize: 11,
        },
      },
    ],
  })
}

function goBack() {
  router.push('/input')
}
</script>

<template>
  <div class="result-page">
    <div class="page-container">
      <template v-if="result">
        <div class="page-header">
          <h1>风险评估结果</h1>
          <p>基于多元统计模型的综合信贷风险分析报告</p>
        </div>

        <!-- 打印报告页眉（仅打印时显示） -->
        <div class="print-header">
          <h2>涉农小微企业信贷风险评估报告</h2>
          <p>
            企业名称：{{ reportTitle }} ｜ 生成时间：{{ printDate }} ｜ 系统：涉农信贷风险智能评估系统（Logistic
            评分卡）
          </p>
        </div>

        <!-- 核心指标卡片 -->
        <el-row :gutter="20" class="result-cards">
          <!-- 信用评分仪表盘 -->
          <el-col :xs="24" :md="8">
            <div class="info-card gauge-card">
              <h3 class="card-title">信用评分（0-1000）</h3>
              <ScoreGauge :score="result.score" :size="320" :max="1000" />
            </div>
          </el-col>

          <!-- 风险等级 & 违约概率 -->
          <el-col :xs="24" :md="8">
            <div class="info-card risk-card">
              <h3 class="card-title">风险等级</h3>
              <div class="risk-level-display">
                <RiskBadge :level="result.level" />
                <p class="risk-desc">
                  {{
                    result.level === '低风险'
                      ? '企业经营稳健，违约风险较低'
                      : result.level === '中等风险'
                        ? '需关注部分指标，审慎授信'
                        : '存在较高风险，建议暂缓放贷'
                  }}
                </p>
              </div>

              <el-divider />

              <div class="prob-section">
                <span class="prob-label">违约概率</span>
                <div class="prob-bar-wrapper">
                  <el-progress
                    :percentage="parseFloat(probabilityPercent)"
                    :color="result.probability > 0.3 ? '#f56c6c' : result.probability > 0.15 ? '#e6a23c' : '#67c23a'"
                    :stroke-width="14"
                  >
                    <span class="prob-text">{{ probabilityPercent }}%</span>
                  </el-progress>
                </div>
              </div>
            </div>
          </el-col>

          <!-- 授信建议 -->
          <el-col :xs="24" :md="8">
            <div class="info-card advice-card">
              <h3 class="card-title">授信建议</h3>
              <div class="advice-item">
                <span class="advice-label">建议额度</span>
                <span class="advice-value highlight">{{ result.suggestedAmount }} <small>万元</small></span>
              </div>
              <div class="advice-item">
                <span class="advice-label">建议利率</span>
                <span class="advice-value">{{ result.suggestedRate }}<small>%</small></span>
              </div>
              <el-divider />
              <p class="advice-text">{{ result.advice }}</p>
            </div>
          </el-col>
        </el-row>

        <!-- 前三项扣分原因 -->
        <div class="info-card deduction-card">
          <h3 class="card-title">
            <el-icon style="vertical-align: middle; margin-right: 6px" color="#e6a23c"><WarningFilled /></el-icon>
            前三项扣分原因（人工复核提示）
          </h3>
          <el-row :gutter="16">
            <el-col v-for="(ded, idx) in result.deductions" :key="ded.factor" :xs="24" :sm="12" :md="8">
              <div class="deduction-item">
                <div class="deduction-rank">NO.{{ idx + 1 }}</div>
                <div class="deduction-body">
                  <div class="deduction-factor">{{ ded.factor }}</div>
                  <el-progress
                    :percentage="ded.score"
                    :stroke-width="10"
                    :color="ded.score >= 60 ? '#e6a23c' : '#f56c6c'"
                    :show-text="false"
                    style="margin: 8px 0"
                  />
                  <p class="deduction-reason">{{ ded.reason }}</p>
                </div>
              </div>
            </el-col>
          </el-row>
        </div>

        <!-- 因子贡献图 -->
        <div class="info-card chart-card">
          <h3 class="card-title">各指标得分贡献</h3>
          <div class="contribution-scroll">
            <div ref="barChartRef" class="contribution-chart" :style="{ minWidth: contributionMinWidth + 'px' }" />
          </div>
          <p class="scroll-hint">← 左右滑动查看全部指标 →</p>
        </div>

        <!-- 操作按钮 -->
        <div class="action-bar">
          <el-button @click="goBack">
            <el-icon><Back /></el-icon>
            重新评估
          </el-button>
          <el-button @click="showForm">
            <el-icon><Document /></el-icon>
            查看原始表单
          </el-button>
          <el-button type="primary" @click="handlePrint">
            <el-icon><Printer /></el-icon>
            打印报告
          </el-button>
        </div>
      </template>

      <!-- 无数据占位 -->
      <div v-if="!result" class="no-result-wrap">
        <el-empty description="暂无评估结果，请先录入数据">
          <el-button type="primary" @click="router.push('/input')">前往录入</el-button>
        </el-empty>
      </div>

      <!-- 历史评估记录（当前账号） -->
      <div class="info-card history-card">
        <h3 class="card-title">
          <el-icon style="vertical-align: middle; margin-right: 6px" color="#2c6e49"><Clock /></el-icon>
          历史评估记录
          <el-tag size="small" type="info" effect="plain" style="margin-left: 8px"
            >当前账号 · {{ historyTotal }} 条</el-tag
          >
        </h3>
        <el-table v-loading="historyLoading" :data="historyRecords" size="small" stripe empty-text="暂无历史评估记录">
          <el-table-column prop="enterpriseName" label="企业名称" min-width="160" show-overflow-tooltip />
          <el-table-column label="评分" width="76" align="center">
            <template #default="{ row }">
              <span
                class="history-score"
                :style="{ color: row.score >= 700 ? '#67c23a' : row.score >= 500 ? '#e6a23c' : '#f56c6c' }"
              >
                {{ row.score }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="风险等级" width="104" align="center">
            <template #default="{ row }">
              <RiskBadge :level="row.level" />
            </template>
          </el-table-column>
          <el-table-column label="评估时间" width="150">
            <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="120" align="center">
            <template #default="{ row }">
              <el-button link type="primary" @click="viewHistory(row.id)">查看</el-button>
              <el-button link type="danger" @click="removeHistory(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <div v-if="historyTotal > historySize" class="history-pager">
          <el-pagination
            layout="prev, pager, next"
            :total="historyTotal"
            :page-size="historySize"
            :current-page="historyPage"
            background
            size="small"
            @current-change="loadHistory"
          />
        </div>
      </div>
    </div>

    <!-- 原始表单抽屉 -->
    <el-drawer v-model="formDrawerVisible" title="评估原始表单" size="min(640px, 92%)">
      <el-table v-if="formRows.length" :data="formRows" size="small" border stripe>
        <el-table-column prop="level" label="层级" width="120" />
        <el-table-column prop="name" label="指标名称" min-width="200" />
        <el-table-column prop="unit" label="单位" width="80" />
        <el-table-column prop="value" label="填写值" min-width="120" />
      </el-table>
      <el-empty v-else description="该评估没有已填写的指标数据（可能为 15 项传统评估或未填指标）" :image-size="80" />
    </el-drawer>

    <!-- 正式打印报告（仅打印时显示） -->
    <div v-if="result" class="print-report">
      <div class="pr-header">
        <h1>涉农小微企业信贷风险评估报告</h1>
        <p class="pr-meta">
          报告编号：{{ reportNo }} ｜ 评估时间：{{ printDate }} ｜ 系统：涉农信贷风险智能评估系统 Demo v1.5
        </p>
      </div>

      <div class="pr-basic">
        <table>
          <tbody>
            <tr>
              <th>企业名称</th>
              <td>{{ reportTitle }}</td>
              <th>经营类型</th>
              <td>{{ businessTypeText }}</td>
            </tr>
            <tr>
              <th>综合信用评分</th>
              <td>{{ result.score }} 分（0-1000）</td>
              <th>风险等级</th>
              <td>{{ result.level }}</td>
            </tr>
            <tr>
              <th>违约概率</th>
              <td>{{ probabilityPercent }}%</td>
              <th>数据完整度</th>
              <td>{{ completenessText }}</td>
            </tr>
            <tr>
              <th>建议授信额度</th>
              <td>{{ result.suggestedAmount }} 万元</td>
              <th>建议利率</th>
              <td>{{ result.suggestedRate }}%</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>一、授信建议</h2>
      <p class="pr-advice">{{ result.advice }}</p>

      <h2>二、主要指标得分表现</h2>
      <table class="pr-table">
        <thead>
          <tr>
            <th>序号</th>
            <th>指标</th>
            <th>所属层级</th>
            <th>得分（0-100）</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(c, i) in sortedContribs" :key="i">
            <td class="pr-c">{{ i + 1 }}</td>
            <td>{{ c.factor }}</td>
            <td class="pr-c">{{ c.category }}</td>
            <td class="pr-c">{{ c.score.toFixed(1) }}</td>
          </tr>
        </tbody>
      </table>

      <h2>三、扣分原因（人工复核提示）</h2>
      <ol class="pr-deductions">
        <li v-for="d in result.deductions" :key="d.factor">{{ d.factor }}：{{ d.reason }}</li>
      </ol>

      <div class="pr-footer">
        <p>
          本报告由涉农信贷风险智能评估系统基于替代数据指标体系与专家引擎自动生成，仅供信贷审批参考，不构成授信承诺。
        </p>
        <div class="pr-sign">
          <span>信贷员签字：______________</span>
          <span>复核人签字：______________</span>
          <span>日期：____________________</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.result-cards {
  margin-bottom: 20px;

  // 移动端卡片堆叠时保留纵向间距
  .el-col {
    margin-bottom: 16px;
  }
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 16px;
  padding-bottom: 10px;
  border-bottom: 1px solid #f0f0f0;
}

.gauge-card {
  text-align: center;
}

.risk-card {
  .risk-level-display {
    text-align: center;
    padding: 16px 0;

    .risk-desc {
      margin-top: 12px;
      font-size: 13px;
      color: #909399;
    }
  }

  .prob-section {
    .prob-label {
      font-size: 13px;
      color: #606266;
      display: block;
      margin-bottom: 10px;
    }

    .prob-bar-wrapper {
      .prob-text {
        font-size: 14px;
        font-weight: 600;
      }
    }
  }
}

.advice-card {
  .advice-item {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 12px;

    .advice-label {
      font-size: 14px;
      color: #606266;
    }

    .advice-value {
      font-size: 22px;
      font-weight: 700;
      color: #303133;

      small {
        font-size: 13px;
        font-weight: 400;
        color: #909399;
      }

      &.highlight {
        color: #2c6e49;
      }
    }
  }

  .advice-text {
    font-size: 13px;
    color: #606266;
    line-height: 1.8;
  }
}

.chart-card {
  margin-bottom: 20px;
}

// 贡献图：移动端横向滑动，避免因子名称占满左侧
.contribution-scroll {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;

  .contribution-chart {
    width: 100%;
    height: 320px;
  }
}

.scroll-hint {
  display: none;
}

@media (max-width: 768px) {
  .scroll-hint {
    display: block;
    text-align: center;
    font-size: 12px;
    color: #909399;
    margin-top: 8px;
  }
}

.deduction-card {
  margin-bottom: 20px;

  .el-row .el-col {
    margin-bottom: 16px;
  }

  .deduction-item {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    padding: 16px;
    border-radius: 10px;
    background: #fafafa;
    height: 100%;

    .deduction-rank {
      flex-shrink: 0;
      width: 42px;
      height: 42px;
      border-radius: 50%;
      background: #f56c6c;
      color: #fff;
      font-size: 12px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .deduction-body {
      flex: 1;

      .deduction-factor {
        font-size: 14px;
        font-weight: 600;
        color: #303133;
      }

      .deduction-reason {
        font-size: 12px;
        color: #909399;
        line-height: 1.6;
      }
    }
  }
}

.action-bar {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 8px;
}

.no-result-wrap {
  padding: 40px 0;
}

.history-card {
  margin-top: 20px;

  .history-score {
    font-weight: 700;
    font-size: 15px;
  }

  .history-pager {
    display: flex;
    justify-content: flex-end;
    margin-top: 12px;
  }

  // 移动端表格横向滚动
  :deep(.el-table) {
    width: 100%;
  }
}

/* ---------- 打印报告样式 ---------- */
.print-report {
  display: none;
}

@media print {
  :global(.app-aside),
  :global(.app-header),
  :global(.app-footer) {
    display: none !important;
  }

  :global(.app-main) {
    padding: 0 !important;
    background: #fff !important;
    overflow: visible !important;
  }

  // 打印只输出正式报告，隐藏页面本体（含历史评估记录、操作栏）
  .page-container,
  .no-result-wrap,
  .history-card {
    display: none !important;
  }

  .print-report {
    display: block;
    font-family: 'Microsoft YaHei', 'PingFang SC', 'SimSun', sans-serif;
    color: #000;
    font-size: 13px;
    line-height: 1.8;

    .pr-header {
      text-align: center;
      border-bottom: 3px double #333;
      padding-bottom: 12px;
      margin-bottom: 16px;

      h1 {
        font-size: 24px;
        letter-spacing: 4px;
        margin: 0 0 8px;
        color: #000;
      }

      .pr-meta {
        font-size: 11px;
        color: #333;
        margin: 0;
      }
    }

    .pr-basic {
      margin-bottom: 16px;

      table {
        width: 100%;
        border-collapse: collapse;
      }

      th,
      td {
        border: 1px solid #999;
        padding: 7px 10px;
        font-size: 13px;
      }

      th {
        width: 92px;
        text-align: center;
        background: #f2f2f2;
        font-weight: 600;
      }
    }

    h2 {
      font-size: 15px;
      margin: 16px 0 8px;
      padding-left: 8px;
      border-left: 4px solid #2c6e49;
    }

    .pr-advice {
      padding: 8px 12px;
      border: 1px solid #ccc;
      border-radius: 4px;
    }

    .pr-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;

      th,
      td {
        border: 1px solid #999;
        padding: 5px 8px;
        text-align: left;
      }

      th {
        background: #f2f2f2;
      }

      .pr-c {
        text-align: center;
      }
    }

    .pr-deductions {
      margin: 0;
      padding-left: 24px;
    }

    .pr-footer {
      margin-top: 26px;
      font-size: 11px;
      color: #333;

      p {
        margin: 0 0 22px;
      }

      .pr-sign {
        display: flex;
        justify-content: space-between;
      }
    }
  }
}
</style>
