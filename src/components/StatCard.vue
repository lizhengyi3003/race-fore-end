<script setup lang="ts">
defineProps<{
  title: string
  value: string | number
  unit?: string
  icon?: string
  color?: string
}>()
</script>

<template>
  <div class="stat-card">
    <div v-if="icon" class="stat-icon" :style="{ background: (color || '#2c6e49') + '20' }">
      <el-icon :size="24" :color="color || '#2c6e49'">
        <component :is="icon" />
      </el-icon>
    </div>
    <div class="stat-info">
      <span class="stat-title">{{ title }}</span>
      <div class="stat-value">
        <span class="value-num" :style="{ color: color || '#333' }">{{ value }}</span>
        <span v-if="unit" class="value-unit">{{ unit }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);

  .stat-icon {
    width: 56px;
    height: 56px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .stat-info {
    .stat-title {
      font-size: 13px;
      color: #909399;
      margin-bottom: 6px;
      display: block;
    }

    .stat-value {
      .value-num {
        font-size: 28px;
        font-weight: 700;
      }
      .value-unit {
        font-size: 14px;
        color: #909399;
        margin-left: 4px;
      }
    }
  }
}
</style>
