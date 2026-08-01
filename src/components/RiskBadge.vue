<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  level: '低风险' | '中等风险' | '高风险'
}>()

const typeMap = computed(() => {
  const map: Record<string, { type: 'success' | 'warning' | 'danger'; icon: string }> = {
    低风险: { type: 'success', icon: 'CircleCheckFilled' },
    中等风险: { type: 'warning', icon: 'WarningFilled' },
    高风险: { type: 'danger', icon: 'CircleCloseFilled' },
  }
  return map[props.level] || { type: 'info' as const, icon: 'InfoFilled' }
})
</script>

<template>
  <el-tag :type="typeMap.type" size="large" effect="dark" round>
    <el-icon style="margin-right: 4px">
      <component :is="typeMap.icon" />
    </el-icon>
    {{ level }}
  </el-tag>
</template>
