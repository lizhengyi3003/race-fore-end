<script setup lang="ts">
import { ref, watch } from 'vue'
import type { PropType } from 'vue'
import type { IndicatorField } from '@/api/types'
import { validateIndicatorValue } from '@/utils/validateIndicator'

const props = defineProps({
  field: { type: Object as PropType<IndicatorField>, required: true },
  modelValue: { type: String, default: '' },
})
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()

const errorMsg = ref('')

function setVal(v: string | number | boolean | undefined | null) {
  emit('update:modelValue', v === undefined || v === null ? '' : String(v))
}

function validate() {
  errorMsg.value = validateIndicatorValue(props.field, props.modelValue)
}

// 值被清空（如重置）时同步清除错误
watch(
  () => props.modelValue,
  (nv) => {
    if ((nv ?? '') === '') errorMsg.value = ''
  }
)
</script>

<template>
  <el-form-item
    :label="field.name"
    :required="field.required && field.indicator_type !== '文本'"
    :error="errorMsg"
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
        @blur="validate"
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
      @change="validate"
    >
      <el-option v-for="o in field.options" :key="o" :label="o" :value="o" />
    </el-select>

    <!-- 布尔 -->
    <el-radio-group
      v-else-if="field.indicator_type === '布尔'"
      :model-value="modelValue"
      @update:model-value="setVal"
      @change="validate"
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
      @blur="validate"
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
  .unit {
    color: #909399;
    white-space: nowrap;
    font-size: 13px;
  }
}
</style>
