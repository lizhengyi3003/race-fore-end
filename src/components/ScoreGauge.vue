<script setup lang="ts">
import { computed } from 'vue'
import * as echarts from 'echarts'
import { onMounted, ref, watch } from 'vue'

const props = defineProps<{
  score: number
  size?: number
  max?: number // 评分上限，默认 1000（评分卡刻度）
}>()

const gaugeRef = ref<HTMLElement>()

const maxScore = computed(() => props.max ?? 1000)

const colorStops = computed(() => {
  const s = props.score / maxScore.value
  if (s >= 0.7)
    return [
      [0.6, '#67c23a'],
      [0.8, '#b3e19d'],
      [1, '#e1f3d8'],
    ]
  if (s >= 0.5)
    return [
      [0.6, '#e6a23c'],
      [0.8, '#f3d19e'],
      [1, '#faecd8'],
    ]
  return [
    [0.6, '#f56c6c'],
    [0.8, '#fab6b6'],
    [1, '#fde2e2'],
  ]
})

function initChart() {
  if (!gaugeRef.value) return
  const chart = echarts.init(gaugeRef.value)
  chart.setOption({
    series: [
      {
        type: 'gauge',
        startAngle: 210,
        endAngle: -30,
        center: ['50%', '55%'],
        radius: '90%',
        min: 0,
        max: maxScore.value,
        splitNumber: 10,
        axisLine: {
          show: true,
          lineStyle: {
            width: 18,
            color: colorStops.value,
          },
        },
        pointer: {
          icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z',
          length: '65%',
          width: 8,
          itemStyle: {
            color: 'inherit',
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
          distance: 18,
          color: '#909399',
          fontSize: 12,
        },
        anchor: {
          show: true,
          size: 20,
        },
        title: {
          show: true,
          offsetCenter: [0, '82%'],
          fontSize: 16,
          color: '#606266',
          fontWeight: 600,
        },
        detail: {
          valueAnimation: true,
          fontSize: 36,
          offsetCenter: [0, '58%'],
          formatter: '{value}',
          color: 'inherit',
          fontWeight: 700,
        },
        data: [{ value: props.score, name: '信用评分' }],
      },
    ],
  })
  return chart
}

onMounted(() => {
  const chart = initChart()
  watch(
    () => props.score,
    () => {
      if (chart) {
        chart.setOption({
          series: [
            {
              axisLine: { lineStyle: { color: colorStops.value } },
              data: [{ value: props.score, name: '信用评分' }],
            },
          ],
        })
      }
    }
  )
})
</script>

<template>
  <div ref="gaugeRef" :style="{ width: size ? size + 'px' : '100%', height: size ? size + 'px' : '240px' }" />
</template>
