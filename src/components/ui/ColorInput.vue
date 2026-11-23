<script setup lang="ts">
// 色の欄：色見本（押すと OS の色選択が開く）と #RRGGBB の入力
import { ref, watch } from 'vue';

const props = defineProps<{ modelValue: string; id?: string }>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const text = ref(props.modelValue);
watch(
  () => props.modelValue,
  (v) => (text.value = v),
);

// #RGB と #RRGGBB を受け付けて、#RRGGBB（大文字）にする
function normalize(v: string): string | null {
  const s = v.trim().replace(/^#?/, '#');
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return s.toUpperCase();
  if (/^#[0-9a-fA-F]{3}$/.test(s)) return `#${s.slice(1).split('').map((c) => c + c).join('')}`.toUpperCase();
  return null;
}

function commit(): void {
  const v = normalize(text.value);
  if (v) {
    text.value = v;
    if (v !== props.modelValue) emit('update:modelValue', v);
  } else {
    text.value = props.modelValue;
  }
}

function pick(e: Event): void {
  const v = normalize((e.target as HTMLInputElement).value);
  if (v) emit('update:modelValue', v);
}
</script>

<template>
  <div class="color">
    <input class="swatch" type="color" :value="modelValue.toLowerCase()" tabindex="-1" aria-hidden="true" @input="pick" />
    <input :id="id" v-model="text" class="hex" type="text" maxlength="7" spellcheck="false" @change="commit" @keydown.enter="commit" />
  </div>
</template>

<style scoped>
.color {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 120px;
  height: 26px;
  padding: 0 8px;
  background: var(--bg-input);
  border-radius: 5px;
}
.swatch {
  width: 14px;
  height: 14px;
  flex: none;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 3px;
  background: none;
  cursor: pointer;
}
.swatch::-webkit-color-swatch-wrapper {
  padding: 0;
}
.swatch::-webkit-color-swatch {
  border: none;
  border-radius: 2px;
}
.hex {
  width: 72px;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text);
  font-family: var(--font-mono);
  font-size: 12px;
  padding: 0;
}
</style>
