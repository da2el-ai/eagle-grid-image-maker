<script setup lang="ts">
// 数を入れる欄。確定したとき（Enter・欄を離れたとき）に範囲に収めて反映する
// optional なら空欄（null）にできる
import { ref, watch } from 'vue';

const props = withDefaults(
  defineProps<{ modelValue: number | null; min: number; max: number; optional?: boolean; placeholder?: string; id?: string }>(),
  { optional: false, placeholder: '', id: undefined },
);
const emit = defineEmits<{ 'update:modelValue': [value: number | null] }>();

const text = ref(props.modelValue == null ? '' : String(props.modelValue));
watch(
  () => props.modelValue,
  (v) => (text.value = v == null ? '' : String(v)),
);

function commit(): void {
  const raw = text.value.trim();
  if (raw === '') {
    if (props.optional) emit('update:modelValue', null);
    else text.value = props.modelValue == null ? '' : String(props.modelValue);
    return;
  }
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    text.value = props.modelValue == null ? '' : String(props.modelValue);
    return;
  }
  const v = Math.min(props.max, Math.max(props.min, Math.round(n)));
  text.value = String(v);
  if (v !== props.modelValue) emit('update:modelValue', v);
}
</script>

<template>
  <input
    :id="id"
    v-model="text"
    class="input num"
    type="number"
    :min="min"
    :max="max"
    :placeholder="placeholder"
    @change="commit"
    @keydown.enter="commit"
  />
</template>
