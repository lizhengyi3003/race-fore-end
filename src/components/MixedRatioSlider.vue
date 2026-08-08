<script setup lang="ts">
import { computed, ref, watch } from 'vue'

/**
 * 混合经营占比选择器：勾选几个大类就显示几个滑杆，总和恒为 100%。
 * 拖动任一滑杆，其余滑杆按原比例联动缩放，保证合计 100%。
 * emits: update:ratios -> { 大类码: 0~1 }
 */
const props = defineProps<{
  items: { code: string; label: string }[]
}>()
const emit = defineEmits<{ (e: 'update:ratios', v: Record<string, number>): void }>()

const ratios = ref<Record<string, number>>({})

function to01(r: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {}
  for (const k of Object.keys(r)) out[k] = Math.max(0, Math.min(1, (r[k] || 0) / 100))
  return out
}

/** 等分填充（最后一项补差，保证和=100） */
function fillEven(codes: string[]): Record<string, number> {
  const n = codes.length
  const each = n ? 100 / n : 0
  const r: Record<string, number> = {}
  let acc = 0
  codes.forEach((c, idx) => {
    if (idx === n - 1) r[c] = 100 - acc
    else {
      r[c] = Math.round(each)
      acc += r[c]
    }
  })
  return r
}

/** 按比例缩放并整数化，总和恒为 100 */
function scaleTo(codes: string[], next: Record<string, number>, fixed: string): Record<string, number> {
  const others = codes.filter((c) => c !== fixed)
  const rest = 100 - next[fixed]
  const othersTotal = others.reduce((s, c) => s + (next[c] || 0), 0)
  if (othersTotal <= 0) {
    others.forEach((c, idx) => {
      next[c] =
        idx === others.length - 1
          ? rest - others.slice(0, -1).reduce((s, o) => s + (next[o] || 0), 0)
          : rest / Math.max(others.length, 1)
    })
  } else {
    others.forEach((c) => {
      next[c] = ((next[c] || 0) / othersTotal) * rest
    })
  }
  // 整数化（最后一项补差）
  const rounded: Record<string, number> = {}
  let acc = 0
  codes.forEach((c, idx) => {
    if (idx === codes.length - 1) rounded[c] = 100 - acc
    else {
      rounded[c] = Math.round(next[c])
      acc += rounded[c]
    }
  })
  return rounded
}

/** 大类集合变化：保留已有占比，新增/移除后归一化 */
watch(
  () => props.items.map((i) => i.code).join(','),
  () => {
    const codes = props.items.map((i) => i.code)
    if (!codes.length) {
      ratios.value = {}
      emit('update:ratios', {})
      return
    }
    const kept: Record<string, number> = {}
    codes.forEach((c) => {
      kept[c] = ratios.value[c] ?? 0
    })
    const total = codes.reduce((s, c) => s + kept[c], 0)
    if (total <= 0) {
      ratios.value = fillEven(codes)
    } else {
      ratios.value = scaleTo(codes, kept, codes[0])
    }
    emit('update:ratios', to01(ratios.value))
  },
  { immediate: true }
)

/** 拖动滑杆：固定当前值，其余按比例联动 */
function onRatio(code: string, val: number) {
  const n = Math.max(0, Math.min(100, val))
  const next: Record<string, number> = { ...ratios.value, [code]: n }
  ratios.value = scaleTo(
    props.items.map((i) => i.code),
    next,
    code
  )
  emit('update:ratios', to01(ratios.value))
}

// 合计（实时计算，保证始终显示真实总和）
const totalPct = computed(() => Math.round(Object.values(ratios.value).reduce((a, b) => a + (b || 0), 0)))
</script>

<template>
  <div class="mixed-ratio">
    <div v-for="it in items" :key="it.code" class="ratio-row">
      <span class="ratio-label">{{ it.label }}</span>
      <el-slider
        :model-value="ratios[it.code] ?? 0"
        :max="100"
        :step="1"
        class="ratio-slider"
        @input="(v: number | number[]) => onRatio(it.code, Array.isArray(v) ? v[0] : v)"
      />
      <span class="ratio-value">{{ Math.round(ratios[it.code] ?? 0) }}%</span>
    </div>
    <div class="ratio-total">
      合计 <b>{{ totalPct }}%</b>
      <span class="ratio-hint">拖动滑杆调整各大类经营占比，将按此比例加权评分</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
.mixed-ratio {
  margin-top: 4px;

  .ratio-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 6px;

    .ratio-label {
      flex-shrink: 0;
      width: 190px;
      font-size: 13px;
      color: #303133;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .ratio-slider {
      flex: 1;
      min-width: 0;
    }

    .ratio-value {
      flex-shrink: 0;
      width: 46px;
      text-align: right;
      font-weight: 600;
      font-size: 14px;
      color: #2c6e49;
    }
  }

  .ratio-total {
    font-size: 13px;
    color: #909399;
    margin-top: 8px;

    b {
      color: #2c6e49;
    }

    .ratio-hint {
      margin-left: 8px;
      font-size: 12px;
      color: #c0c4cc;
    }
  }
}
</style>
