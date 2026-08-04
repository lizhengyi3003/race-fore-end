<script setup lang="ts">
import { computed } from 'vue'
import * as echarts from 'echarts'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps<{
  score: number
  size?: number
  max?: number // 评分上限，默认 1000（评分卡刻度）
}>()

const gaugeRef = ref<HTMLElement>()

const maxScore = computed(() => props.max ?? 1000)

// 弧线按风险等级固定三段分区（对齐业务阈值：<500 红 / 500-700 橙 / ≥700 绿）
// offset 0 对应 0 分、1 对应 1000 分；用近似 offset 实现硬边界（ECharts 要求 offset 严格升序）
const colorStops: [number, string][] = [
  [0, '#f56c6c'],
  [0.4999, '#f56c6c'],
  [0.5, '#e6a23c'],
  [0.6999, '#e6a23c'],
  [0.7, '#67c23a'],
  [1, '#67c23a'],
]

function buildOption() {
  return {
    series: [
      {
        type: 'gauge',
        startAngle: 210,
        endAngle: -30,
        center: ['50%', '50%'],
        radius: '82%',
        min: 0,
        max: maxScore.value,
        // 0~1000 每 100 一个刻度，配合 320 容器保证标签不重叠
        splitNumber: 10,
        axisLine: {
          show: true,
          lineStyle: {
            width: 18,
            color: colorStops,
          },
        },
        pointer: {
          icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z',
          length: '65%',
          width: 8,
          itemStyle: {
            color: '#1f2d3d',
          },
        },
        axisTick: {
          length: 10,
          lineStyle: { color: 'inherit', width: 2 },
        },
        splitLine: {
          length: 22,
          lineStyle: { color: 'inherit', width: 4 },
        },
        axisLabel: {
          distance: 20,
          color: '#909399',
          fontSize: 12,
        },
        anchor: {
          show: true,
          size: 20,
        },
        title: {
          show: true,
          offsetCenter: [0, '80%'],
          fontSize: 14,
          color: '#606266',
          fontWeight: 600,
        },
        detail: {
          valueAnimation: true,
          fontSize: 32,
          offsetCenter: [0, '55%'],
          formatter: '{value}',
          color: 'inherit',
          fontWeight: 700,
        },
        data: [{ value: props.score, name: '信用评分' }],
      },
    ],
  }
}

let chart: echarts.ECharts | null = null

function handleResize() {
  if (chart) chart.resize()
}

function initChart() {
  if (!gaugeRef.value) return
  chart = echarts.init(gaugeRef.value)
  chart.setOption(buildOption())
}

watch(
  () => props.score,
  () => {
    if (chart) {
      // 完整重建配置，确保指针 / 刻度 / 数值随新评分同步更新
      chart.setOption(buildOption())
    }
  }
)

onMounted(() => {
  initChart()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  chart?.dispose()
  chart = null
})
</script>

<template>
  <div ref="gaugeRef" class="gauge-container" :style="{ maxWidth: (size || 320) + 'px' }" />
</template>

<style scoped lang="scss">
.gauge-container {
  width: 100%;
  aspect-ratio: 1 / 1;
  margin: 0 auto;
}
</style>
