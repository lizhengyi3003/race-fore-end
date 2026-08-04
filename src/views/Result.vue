<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useRiskStore } from '@/stores/risk'
import * as echarts from 'echarts'
import ScoreGauge from '@/components/ScoreGauge.vue'
import RiskBadge from '@/components/RiskBadge.vue'

const router = useRouter()
const riskStore = useRiskStore()

const barChartRef = ref<HTMLElement>()

// 有数据时初始化图表
onMounted(() => {
  if (riskStore.hasResult) {
    initBarChart()
  }
})

const result = computed(() => riskStore.riskResult!)

const probabilityPercent = computed(() => (result.value ? (result.value.probability * 100).toFixed(2) : '0.00'))

// 打印报告
const printDate = computed(() => new Date().toLocaleString('zh-CN'))
const reportTitle = computed(() => riskStore.formData.enterpriseName || '涉农经营主体')

function handlePrint() {
  window.print()
}

function initBarChart() {
  if (!barChartRef.value || !result.value) return
  const chart = echarts.init(barChartRef.value)

  const contribs = result.value.contributions.sort((a, b) => b.score - a.score)

  chart.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: { name: string; value: number }[]) => {
        const p = params[0]
        return `${p.name}<br/>得分：${p.value.toFixed(1)} 分`
      },
    },
    grid: { top: 20, right: 30, bottom: 40, left: 80 },
    xAxis: {
      type: 'value',
      max: 100,
      axisLabel: { formatter: '{value}分' },
    },
    yAxis: {
      type: 'category',
      data: contribs.map((c) => c.factor),
      axisLabel: { fontSize: 12 },
    },
    series: [
      {
        type: 'bar',
        data: contribs.map((c) => ({
          value: c.score,
          itemStyle: {
            color: c.score >= 80 ? '#67c23a' : c.score >= 60 ? '#e6a23c' : '#f56c6c',
            borderRadius: [0, 4, 4, 0],
          },
        })),
        barWidth: 20,
        label: {
          show: true,
          position: 'right',
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
  <div v-if="result" class="page-container">
    <div class="page-header">
      <h1>风险评估结果</h1>
      <p>基于多元统计模型的综合信贷风险分析报告</p>
    </div>

    <!-- 打印报告页眉（仅打印时显示） -->
    <div class="print-header">
      <h2>涉农小微企业信贷风险评估报告</h2>
      <p>
        企业名称：{{ reportTitle }} ｜ 生成时间：{{ printDate }} ｜ 系统：涉农信贷风险智能评估系统（Logistic 评分卡）
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
      <div ref="barChartRef" style="width: 100%; height: 360px" />
    </div>

    <!-- 操作按钮 -->
    <div class="action-bar">
      <el-button @click="goBack">
        <el-icon><Back /></el-icon>
        重新评估
      </el-button>
      <el-button type="primary" @click="handlePrint">
        <el-icon><Printer /></el-icon>
        打印报告
      </el-button>
    </div>
  </div>

  <!-- 无数据占位 -->
  <div v-else class="page-container">
    <el-empty description="暂无评估结果，请先录入数据">
      <el-button type="primary" @click="router.push('/input')">前往录入</el-button>
    </el-empty>
  </div>
</template>

<style scoped lang="scss">
.result-cards {
  margin-bottom: 20px;
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

.deduction-card {
  margin-bottom: 20px;

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

/* ---------- 打印报告样式 ---------- */
.print-header {
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

  .action-bar {
    display: none !important;
  }

  .page-header {
    display: none;
  }

  .print-header {
    display: block;
    margin-bottom: 18px;
    padding-bottom: 12px;
    border-bottom: 3px solid #2c6e49;

    h2 {
      margin: 0 0 8px;
      font-size: 20px;
      color: #2c6e49;
    }

    p {
      margin: 0;
      font-size: 12px;
      color: #606266;
    }
  }

  .info-card {
    box-shadow: none !important;
    break-inside: avoid;
    page-break-inside: avoid;
  }
}
</style>
