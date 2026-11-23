<script setup lang="ts">
// 設定：画像（表示方式・小さい画像の拡大・向き揃え・並び順）
import { computed } from 'vue';
import { useApp } from '../../app-context';
import type { FitMode, Orient, RotDir, SortDir, SortKey } from '../../core/settings';
import { t } from '../../i18n';
import FieldRow from '../ui/FieldRow.vue';
import SegmentedControl from '../ui/SegmentedControl.vue';
import SelectInput from '../ui/SelectInput.vue';
import ToggleSwitch from '../ui/ToggleSwitch.vue';

const { settings: s } = useApp();

const fitOptions: { value: FitMode; label: string }[] = [
  { value: 'cover', label: 'Cover' },
  { value: 'contain', label: 'Contain' },
];
const orientOptions = computed<{ value: Orient; label: string }[]>(() => [
  { value: 'none', label: t('image.orientNone') },
  { value: 'portrait', label: t('image.orientPortrait') },
  { value: 'landscape', label: t('image.orientLandscape') },
]);
const rotOptions = computed<{ value: RotDir; label: string }[]>(() => [
  { value: 'cw', label: t('image.rotCw') },
  { value: 'ccw', label: t('image.rotCcw') },
]);
const sortOptions = computed<{ value: SortKey; label: string }[]>(() =>
  (['selection', 'name', 'imported', 'manual', 'random'] as SortKey[]).map((k) => ({ value: k, label: t(`sort.${k}`) })),
);
const dirOptions = computed<{ value: SortDir; label: string }[]>(() => [
  { value: 'asc', label: t('image.asc') },
  { value: 'desc', label: t('image.desc') },
]);
const sortHint = computed(() => (s.sortKey === 'random' ? t('image.sortHintRandom') : s.sortKey === 'manual' ? t('image.sortHintManual') : ''));
</script>

<template>
  <div class="panel">
    <FieldRow :label="t('image.fit')">
      <SegmentedControl v-model="s.fit" :options="fitOptions" :label="t('image.fit')" />
    </FieldRow>
    <FieldRow :label="t('image.upscale')">
      <ToggleSwitch v-model="s.upscale" />
    </FieldRow>
    <FieldRow :label="t('image.orient')" for="f-orient">
      <SelectInput id="f-orient" v-model="s.orient" :options="orientOptions" />
    </FieldRow>
    <FieldRow :label="t('image.rotDir')" for="f-rotdir" :class="{ dim: s.orient === 'none' }">
      <SelectInput id="f-rotdir" v-model="s.rotDir" :options="rotOptions" :disabled="s.orient === 'none'" />
    </FieldRow>
    <div class="sep" />
    <FieldRow :label="t('image.sort')" for="f-sort">
      <SelectInput id="f-sort" v-model="s.sortKey" :options="sortOptions" />
    </FieldRow>
    <FieldRow :label="t('image.sortDir')">
      <!-- ランダムでは昇順・降順を選べない -->
      <SegmentedControl v-model="s.sortDir" :options="dirOptions" :label="t('image.sortDir')" :disabled="s.sortKey === 'random'" />
    </FieldRow>
    <div v-if="sortHint" class="hint indent">{{ sortHint }}</div>
  </div>
</template>

<style scoped>
.dim {
  opacity: 0.5;
}
</style>
