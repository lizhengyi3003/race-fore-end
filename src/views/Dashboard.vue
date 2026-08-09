<!--
  数据看板：展示后端真实评估记录的统计概览（评分分布 / 行业分布 / 近 30 天趋势）。
  数据统一通过 src/api/dashboard.ts 拉取，图表用 ECharts 渲染并随窗口自适应。
-->
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import * as echarts from 'echarts'
import StatCard from '@/components/StatCard.vue'
import {
  getDashboardStats,
  getDashboardTrend,
  getIndustryDistribution,
  getScoreDistribution,
  type DashboardStats,
  type IndustryDistItem,
  type ScoreDistItem,
  type TrendItem,
} from '@/api/dashboard'

// --- 后端真实统计数据 ---
const statsData = ref<DashboardStats>({
  totalAssess: 0,
  avgScore: 0,
  highRiskRate: 0,
  passRate: 0,
})

const industryData = ref<IndustryDistItem[]>([])
const scoreDistData = ref<ScoreDistItem[]>([])
const trendData = ref<TrendItem[]>([])

// --- Chart refs ---
const pieChartRef = ref<HTMLElement>()
const barChartRef = ref<HTMLElement>()
const trendChartRef = ref<HTMLElement>()

// 图表实例注册表，用于窗口尺寸变化时统一 resize
const chartInstances: echarts.ECharts[] = []

function handleResize() {
  chartInstances.forEach((c) => c.resize())
}

async function loadDashboard() {
  try {
    // 四个看板接口并行拉取，任一失败由拦截器统一提示并保持空数据
    const [stats, industry, scoreDist, trend] = await Promise.all([
      getDashboardStats(),
      getIndustryDistribution(),
      getScoreDistribution(),
      getDashboardTrend(30),
    ])
    statsData.value = stats
    industryData.value = industry
    scoreDistData.value = scoreDist
    trendData.value = trend
    initPieChart()
    initBarChart()
    initTrendChart()
  } catch {
    // 后端未就绪时保持空数据
  }
}

function initPieChart() {
  if (!pieChartRef.value || !industryData.value.length) return
  const chart = echarts.init(pieChartRef.value)
  chartInstances.push(chart)
  chart.setOption({
    title: { text: '行业风险分布', left: 'center', textStyle: { fontSize: 15 } },
    tooltip: { trigger: 'item', formatter: '{b}: {c} 户 ({d}%)' },
    legend: { bottom: 0 },
    series: [
      {
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['50%', '48%'],
        roseType: 'area',
        itemStyle: { borderRadius: 8 },
        data: industryData.value.map((d) => ({ name: d.name, value: d.value })),
        label: { formatter: '{b}\n{d}%' },
      },
    ],
  })
}

function initBarChart() {
  if (!barChartRef.value || !scoreDistData.value.length) return
  const chart = echarts.init(barChartRef.value)
  chartInstances.push(chart)
  chart.setOption({
    title: { text: '信用评分分布', left: 'center', textStyle: { fontSize: 15 } },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: scoreDistData.value.map((d) => d.range),
      axisLabel: { fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      name: '企业数量',
    },
    series: [
      {
        type: 'bar',
        data: scoreDistData.value.map((d) => ({
          value: d.count,
          itemStyle: {
            color:
              d.range.includes('800') || d.range.includes('700')
                ? '#67c23a'
                : d.range.includes('600') || d.range.includes('500')
                  ? '#e6a23c'
                  : '#f56c6c',
            borderRadius: [6, 6, 0, 0],
          },
        })),
        barWidth: 32,
      },
    ],
    grid: { top: 50, right: 20, bottom: 30, left: 50 },
  })
}

function initTrendChart() {
  if (!trendChartRef.value || !trendData.value.length) return
  const chart = echarts.init(trendChartRef.value)
  chartInstances.push(chart)
  chart.setOption({
    title: { text: '近30天评估趋势', left: 'center', top: 8, textStyle: { fontSize: 15 } },
    tooltip: { trigger: 'axis' },
    // 图例与标题拉开间距，避免与两侧 Y 轴名称重叠
    legend: { top: 34, itemWidth: 14, itemHeight: 10, textStyle: { fontSize: 11 } },
    xAxis: {
      type: 'category',
      data: trendData.value.map((d) => d.date.slice(5)),
      axisLabel: { fontSize: 10 },
    },
    yAxis: [
      {
        type: 'value',
        name: '评估次数',
        minInterval: 1,
        nameGap: 18,
        nameTextStyle: { fontSize: 11 },
      },
      {
        type: 'value',
        name: '平均评分',
        min: 0,
        max: 1000,
        nameGap: 18,
        nameTextStyle: { fontSize: 11 },
      },
    ],
    series: [
      {
        name: '评估次数',
        type: 'line',
        smooth: true,
        data: trendData.value.map((d) => d.count),
        itemStyle: { color: '#4c956c' },
        areaStyle: { opacity: 0.15 },
      },
      {
        name: '平均评分',
        type: 'line',
        smooth: true,
        yAxisIndex: 1,
        data: trendData.value.map((d) => d.avgScore),
        itemStyle: { color: '#e6a23c' },
      },
    ],
    // 加大顶部留白：为标题、图例与两侧 Y 轴名称预留独立空间
    grid: { top: 92, right: 44, bottom: 34, left: 66 },
  })
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  loadDashboard()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  chartInstances.forEach((c) => c.dispose())
  chartInstances.length = 0
})
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1>数据看板</h1>
      <p>涉农信贷风险评估统计概览（数据来自后端真实评估记录）</p>
    </div>

    <!-- 统计概览卡片 -->
    <el-row :gutter="16" class="stat-row">
      <el-col :xs="12" :sm="12" :md="6">
        <StatCard title="评估总数" :value="statsData.totalAssess" unit="户" icon="DataLine" color="#2c6e49" />
      </el-col>
      <el-col :xs="12" :sm="12" :md="6">
        <StatCard title="平均信用分" :value="statsData.avgScore" unit="分" icon="TrendCharts" color="#4c956c" />
      </el-col>
      <el-col :xs="12" :sm="12" :md="6">
        <StatCard title="高风险占比" :value="statsData.highRiskRate" unit="%" icon="WarningFilled" color="#f56c6c" />
      </el-col>
      <el-col :xs="12" :sm="12" :md="6">
        <StatCard title="授信通过率" :value="statsData.passRate" unit="%" icon="CircleCheckFilled" color="#67c23a" />
      </el-col>
    </el-row>

    <!-- 图表区 -->
    <el-row :gutter="16" class="chart-row">
      <el-col :xs="24" :sm="24" :md="12">
        <div class="info-card chart-card">
          <div ref="pieChartRef" class="chart-body" />
        </div>
      </el-col>
      <el-col :xs="24" :sm="24" :md="12">
        <div class="info-card chart-card">
          <div ref="barChartRef" class="chart-body" />
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="chart-row" style="margin-top: 16px">
      <el-col :xs="24">
        <div class="info-card chart-card">
          <div ref="trendChartRef" class="chart-body" />
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped lang="scss">
.stat-row {
  margin-bottom: 20px;

  .el-col {
    margin-bottom: 16px;
  }
}

.chart-row {
  .el-col {
    margin-bottom: 16px;
  }
}

.chart-card {
  padding: 20px;

  .chart-body {
    width: 100%;
    height: 380px;
  }

  @media (max-width: 768px) {
    padding: 12px;

    .chart-body {
      height: 300px;
    }
  }
}
</style>
