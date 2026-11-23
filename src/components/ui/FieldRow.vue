<script setup lang="ts">
// 設定欄の1行：左に見出し、右に入力欄
defineProps<{ label: string; for?: string }>();
</script>

<template>
  <div class="row">
    <label v-if="$props.for" class="label" :for="$props.for">{{ label }}</label>
    <span v-else class="label">{{ label }}</span>
    <slot />
  </div>
</template>

<style scoped>
.row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 26px;
}
.label {
  width: 128px;
  flex: none;
  color: var(--text-muted);
}
</style>
