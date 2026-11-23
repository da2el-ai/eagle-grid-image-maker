<script setup lang="ts" generic="T extends string">
// いくつかの中から1つを選ぶボタンの組
defineProps<{ modelValue: T; options: { value: T; label: string }[]; label: string; disabled?: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: T] }>();
</script>

<template>
  <div class="seg" role="group" :aria-label="label" :class="{ disabled }">
    <button
      v-for="o in options"
      :key="o.value"
      type="button"
      :class="{ on: o.value === modelValue && !disabled }"
      :aria-pressed="o.value === modelValue"
      :disabled="disabled"
      @click="emit('update:modelValue', o.value)"
    >
      {{ o.label }}
    </button>
  </div>
</template>

<style scoped>
.seg {
  display: flex;
  gap: 2px;
  padding: 2px;
  background: var(--bg-input);
  border-radius: 5px;
}
.seg.disabled {
  opacity: 0.35;
}
button {
  height: 22px;
  padding: 0 10px;
  border: none;
  border-radius: 3px;
  font-size: 11.5px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
}
button.on {
  background: var(--bg-input-active);
  color: var(--text);
  font-weight: 500;
}
button:disabled {
  opacity: 1;
}
</style>
