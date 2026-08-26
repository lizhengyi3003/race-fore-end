<!--
  动态指标字段组件：按 indicator_type 渲染数值 / 枚举 / 布尔 / 文本控件，
  带「特色」「一票否决」标签。
  校验交互：错误提示仅在提交后由父组件传入（error），用户填写即清除（clear-error）。
-->
<script setup lang="ts">
import type { PropType } from 'vue'
import type { IndicatorField } from '@/api/types'

const props = defineProps({
  field: { type: Object as PropType<IndicatorField>, required: true },
  modelValue: { type: String, default: '' },
  // 提交后由父组件传入的校验错误：仅点击提交后显示，填写后即清除
  error: { type: String, default: '' },
})
const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void
  (e: 'clear-error'): void
}>()

function setVal(v: string | number | boolean | undefined | null) {
  const str = v === undefined || v === null ? '' : String(v)
  emit('update:modelValue', str)
  // 填写即清除该字段的提交错误提示（实现“填写完成后提示消失”）
  emit('clear-error')
}
</script>

<template>
  <el-form-item
    :label="field.name"
    :required="field.required && field.indicator_type !== '文本'"
    :error="error"
    class="dynamic-field"
  >
    <template #label>
      <span class="field-label">
        {{ field.name }}
        <el-tag v-if="field.is_feature" size="small" type="warning" effect="plain">特色</el-tag>
        <el-tag v-if="field.is_veto" size="small" type="danger" effect="plain">一票否决</el-tag>
      </span>
    </template>

    <!-- 数值 -->
    <div v-if="field.indicator_type === '数值'" class="unit-wrap">
      <el-input-number
        :model-value="modelValue === '' ? undefined : Number(modelValue)"
        :min="field.min_value ?? 0"
        :max="field.max_value ?? undefined"
        :controls="false"
        :placeholder="field.value_range"
        style="width: 100%"
        @update:model-value="setVal"
      />
      <span v-if="field.unit && field.unit !== '—'" class="unit">{{ field.unit }}</span>
    </div>

    <!-- 枚举 -->
    <el-select
      v-else-if="field.indicator_type === '枚举'"
      :model-value="modelValue || undefined"
      :placeholder="field.value_range"
      style="width: 100%"
      @update:model-value="setVal"
    >
      <el-option v-for="o in field.options" :key="o" :label="o" :value="o" />
    </el-select>

    <!-- 布尔 -->
    <el-radio-group
      v-else-if="field.indicator_type === '布尔'"
      :model-value="modelValue"
      @update:model-value="setVal"
    >
      <el-radio value="是">是</el-radio>
      <el-radio value="否">否</el-radio>
    </el-radio-group>

    <!-- 文本 -->
    <el-input
      v-else
      :model-value="modelValue"
      :placeholder="field.value_range"
      @update:model-value="setVal"
    />
  </el-form-item>
</template>

<style scoped lang="scss">
.dynamic-field {
  margin-bottom: 18px;
}
.field-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  .el-tag {
    margin-left: 2px;
  }
}
.unit-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-width: 0;

  .el-input-number {
    flex: 1;
    min-width: 0;
  }

  .unit {
    color: #909399;
    white-space: nowrap;
    font-size: 13px;
    flex-shrink: 0;
  }
}

// 移动端：label 置顶，避免 label 与控件互相挤压导致显示不全
@media (max-width: 768px) {
  .dynamic-field {
    display: block;

    :deep(.el-form-item__label) {
      display: block;
      width: auto !important;
      height: auto;
      text-align: left;
      justify-content: flex-start;
      line-height: 1.5;
      margin-bottom: 4px;
    }
    :deep(.el-form-item__content) {
      display: block;
      margin-left: 0 !important;
    }
  }
}
</style>
