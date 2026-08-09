<!--
  混合经营占比选择器：勾选多个具体营业类型时按叶子分配占比，总和恒为 100%。
  调整采用「顺序补偿」算法：只改动当前项 + 优先补偿对象，其余项保持不变。
-->
<script setup lang="ts">
import { computed, ref, watch } from 'vue'

/**
 * 混合经营占比选择器：勾选几个大类就显示几个滑杆，总和恒为 100%。
 *
 * 调整规则（顺序补偿）：拖动第 i 个滑杆时，其余项按「从第 1 个开始」的固定顺序依次补偿，
 * 只改动最先命中的优先对象，不会所有项一起动：
 * - 当前项增大 → 按顺序（跳过自身）把其他项依次减到 0 来补足差值
 * - 当前项减小 → 按顺序（跳过自身）把其他项依次加到 100 来补足差值
 * 例：增大第 1 个 → 优先减第 2 个；第 2 个到 0 再减第 3 个。
 *     增大第 3 个 → 优先减第 1 个，其次第 2 个（跳过自身）。
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

/**
 * 顺序补偿：调整 items[idx] 后，其余项按「第 1 个优先」的固定顺序依次增减，保证总和 100。
 * 每次拖动只会移动「当前项 + 优先补偿对象」，其余项保持不变。
 */
function compensate(codes: string[], next: Record<string, number>, idx: number) {
  const cur = Math.max(0, Math.min(100, next[codes[idx]]))
  next[codes[idx]] = cur
  // diff = 当前总和 - 100：>0 表示超了需减小其他项；<0 表示不足需增大其他项
  let diff = codes.reduce((s, c) => s + (next[c] || 0), 0) - 100
  if (diff === 0) return
  const order = codes.filter((_, i) => i !== idx) // 固定顺序（第 1 个优先），跳过自身
  let remaining = Math.abs(diff)
  if (diff > 0) {
    // 当前项增大（总和超 100）：按顺序把其他项依次减到 0
    for (const c of order) {
      if (remaining <= 0) break
      const take = Math.min(remaining, next[c] || 0)
      next[c] = (next[c] || 0) - take
      remaining -= take
    }
    if (remaining > 0) next[codes[idx]] = cur - remaining
  } else {
    // 当前项减小（总和不足 100）：按顺序把其他项依次加到 100
    for (const c of order) {
      if (remaining <= 0) break
      const give = Math.min(remaining, 100 - (next[c] || 0))
      next[c] = (next[c] || 0) + give
      remaining -= give
    }
    if (remaining > 0) next[codes[idx]] = cur + remaining
  }
}

/** 归一化（大类集合变化时）：保留已有占比，差值按「第 1 个优先」顺序补/减，总和恒为 100 */
function normalize(codes: string[], r: Record<string, number>) {
  let diff = 100 - codes.reduce((s, c) => s + (r[c] || 0), 0)
  if (diff === 0) return
  if (diff > 0) {
    for (const c of codes) {
      if (diff <= 0) break
      const give = Math.min(diff, 100 - (r[c] || 0))
      r[c] = (r[c] || 0) + give
      diff -= give
    }
  } else {
    for (const c of codes) {
      if (diff >= 0) break
      const take = Math.min(-diff, r[c] || 0)
      r[c] = (r[c] || 0) - take
      diff += take
    }
  }
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
      normalize(codes, kept)
      ratios.value = kept
    }
    emit('update:ratios', to01(ratios.value))
  },
  { immediate: true }
)

/** 拖动滑杆：顺序补偿（只动当前项 + 优先补偿对象） */
function onRatio(code: string, val: number) {
  const n = Math.max(0, Math.min(100, val))
  const codes = props.items.map((i) => i.code)
  const idx = codes.indexOf(code)
  if (idx < 0) return
  const next: Record<string, number> = { ...ratios.value, [code]: n }
  compensate(codes, next, idx)
  ratios.value = next
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
