<script setup lang="ts">
// フォントの選択欄。総称フォント（ゴシック・明朝・等幅）のあとに、OS のフォントを並べる（01 の 6.4）
import { computed } from 'vue';
import { useApp } from '../../app-context';
import { t } from '../../i18n';
import SelectInput from '../ui/SelectInput.vue';

const props = defineProps<{ modelValue: string; id?: string }>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
const { fonts } = useApp();

const options = computed(() => {
  const list = [
    { value: 'sans-serif', label: t('font.sansSerif') },
    { value: 'serif', label: t('font.serif') },
    { value: 'monospace', label: t('font.monospace') },
  ];
  const local = Array.isArray(fonts.value) ? fonts.value : [];
  for (const f of local) list.push({ value: f, label: f });
  // 保存してあったフォントが今は一覧にないときも、選んだまま表示する
  if (!list.some((o) => o.value === props.modelValue)) list.push({ value: props.modelValue, label: props.modelValue });
  if (fonts.value === 'loading') list.push({ value: '__loading', label: t('font.loading') });
  return list;
});

function update(v: string): void {
  if (v !== '__loading') emit('update:modelValue', v);
}
</script>

<template>
  <SelectInput :id="id" :model-value="modelValue" :options="options" @update:model-value="update" />
</template>
