<script setup lang="ts">
// ON / OFF のスイッチ
defineProps<{ modelValue: boolean; labelledby?: string }>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();
</script>

<template>
  <button
    type="button"
    role="switch"
    class="switch"
    :class="{ on: modelValue }"
    :aria-checked="modelValue"
    :aria-labelledby="labelledby"
    @click="emit('update:modelValue', !modelValue)"
  >
    <span class="knob" />
  </button>
</template>

<style scoped>
.switch {
  position: relative;
  width: 30px;
  height: 18px;
  flex: none;
  padding: 0;
  border: none;
  border-radius: 9px;
  background: #4a4b53;
  cursor: pointer;
}
.switch.on {
  background: var(--accent);
}
.knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 7px;
  background: #fff;
  transition: left 0.12s;
}
.switch.on .knob {
  left: 14px;
}
</style>
