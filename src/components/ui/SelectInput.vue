<script setup lang="ts" generic="T extends string">
// 選択欄（右に ∨ の印）
import AppIcon from './AppIcon.vue';

defineProps<{ modelValue: T; options: { value: T; label: string }[]; id?: string; disabled?: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: T] }>();
</script>

<template>
  <div class="select">
    <select
      :id="id"
      class="input"
      :value="modelValue"
      :disabled="disabled"
      @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value as T)"
    >
      <option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option>
    </select>
    <AppIcon class="mark" name="chevron" :size="14" :stroke-width="1.6" />
  </div>
</template>

<style scoped>
.select {
  position: relative;
  flex: 1;
  min-width: 0;
}
select {
  appearance: none;
  width: 100%;
  padding-right: 28px;
  text-overflow: ellipsis;
}
.mark {
  position: absolute;
  right: 8px;
  top: 6px;
  pointer-events: none;
  color: var(--text-muted);
}
</style>
