<script setup lang="ts">
import { onMounted, ref } from 'vue'
import * as echarts from 'echarts'
import StatCard from '@/components/StatCard.vue'
import http from '@/api/index'

// --- 后端真实统计数据 ---
const statsData = ref({
  totalAssess: 0,
  avgScore: 0,
  highRiskRate: 0,
  passRate: 0,
})

const industryData = ref<{ name: string; value: number; risk: string }[]>([])
const scoreDistData = ref<{ range: string; count: number }[]>([])
const trendData = ref<{ date: string; count: number; avgScore: number }[]>([])

// --- Chart refs ---
const pieChartRef = ref<HTMLElement>()
const barChartRef = ref<HTMLElement>()
const trendChartRef = ref<HTMLElement>()

async function loadDashboard() {
  try {
    const [stats, industry, scoreDist, trend] = await Promise.all([
      http.get('/dashboard/stats'),
      http.get('/dashboard/industry-distribution'),
      http.get('/dashboard/score-distribution'),
      http.get('/dashboard/trend', { params: { days: 30 } }),
    ])
    statsData.value = stats.data
    industryData.value = industry.data
    scoreDistData.value = scoreDist.data
    trendData.value = trend.data
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
  chart.setOption({
    title: { text: '近30天评估趋势', left: 'center', textStyle: { fontSize: 15 } },
    tooltip: { trigger: 'axis' },
    legend: { top: 28 },
    xAxis: {
      type: 'category',
      data: trendData.value.map((d) => d.date.slice(5)),
      axisLabel: { fontSize: 10 },
    },
    yAxis: [
      { type: 'value', name: '评估次数', minInterval: 1 },
      { type: 'value', name: '平均评分', min: 0, max: 1000 },
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
    grid: { top: 60, right: 30, bottom: 30, left: 60 },
  })
}

onMounted(loadDashboard)
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1>数据看板</h1>
      <p>涉农信贷风险评估统计概览（数据来自后端真实评估记录）</p>
    </div>

    <!-- 统计概览卡片 -->
    <el-row :gutter="16" class="stat-row">
      <el-col :span="6">
        <StatCard title="评估总数" :value="statsData.totalAssess" unit="户" icon="DataLine" color="#2c6e49" />
      </el-col>
      <el-col :span="6">
        <StatCard title="平均信用分" :value="statsData.avgScore" unit="分" icon="TrendCharts" color="#4c956c" />
      </el-col>
      <el-col :span="6">
        <StatCard title="高风险占比" :value="statsData.highRiskRate" unit="%" icon="WarningFilled" color="#f56c6c" />
      </el-col>
      <el-col :span="6">
        <StatCard title="授信通过率" :value="statsData.passRate" unit="%" icon="CircleCheckFilled" color="#67c23a" />
      </el-col>
    </el-row>

    <!-- 图表区 -->
    <el-row :gutter="16">
      <el-col :span="12">
        <div class="info-card chart-card">
          <div ref="pieChartRef" style="width: 100%; height: 380px" />
        </div>
      </el-col>
      <el-col :span="12">
        <div class="info-card chart-card">
          <div ref="barChartRef" style="width: 100%; height: 380px" />
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-top: 16px">
      <el-col :span="24">
        <div class="info-card chart-card">
          <div ref="trendChartRef" style="width: 100%; height: 380px" />
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped lang="scss">
.stat-row {
  margin-bottom: 20px;
}

.chart-card {
  padding: 20px;
}
</style>
