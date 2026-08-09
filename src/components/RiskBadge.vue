<!--
  风险等级徽标：将「低风险/中等风险/高风险」映射为 tag 颜色与图标。
-->
<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  level: '低风险' | '中等风险' | '高风险'
}>()

/** 风险等级 → tag 类型与图标（模块级常量，避免每次渲染重建） */
const LEVEL_MAP: Record<string, { type: 'success' | 'warning' | 'danger' | 'info'; icon: string }> = {
  低风险: { type: 'success', icon: 'CircleCheckFilled' },
  中等风险: { type: 'warning', icon: 'WarningFilled' },
  高风险: { type: 'danger', icon: 'CircleCloseFilled' },
}

const display = computed(() => LEVEL_MAP[props.level] || { type: 'info', icon: 'InfoFilled' })
</script>

<template>
  <el-tag :type="display.type" size="large" effect="dark" round>
    <el-icon style="margin-right: 4px">
      <component :is="display.icon" />
    </el-icon>
    {{ level }}
  </el-tag>
</template>
