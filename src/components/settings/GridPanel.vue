<script setup lang="ts">
// 設定：グリッド（列数・行数・配置方向・セルの大きさ）
import { computed } from 'vue';
import { useApp } from '../../app-context';
import type { Flow } from '../../core/settings';
import { t } from '../../i18n';
import FieldRow from '../ui/FieldRow.vue';
import NumberInput from '../ui/NumberInput.vue';
import SelectInput from '../ui/SelectInput.vue';

const { settings: s } = useApp();
const flowOptions = computed<{ value: Flow; label: string }[]>(() => [
  { value: 'right', label: t('grid.flowRight') },
  { value: 'down', label: t('grid.flowDown') },
]);
// 「右へ」では行数、「下へ」では列数を空欄にできる
const colsOptional = computed(() => s.flow === 'down');
const rowsOptional = computed(() => s.flow === 'right');
</script>

<template>
  <div class="panel">
    <FieldRow :label="t('grid.cols')" for="f-cols">
      <NumberInput id="f-cols" v-model="s.cols" :min="1" :max="16" :optional="colsOptional" :placeholder="colsOptional ? t('grid.auto') : ''" />
      <span class="hint">{{ colsOptional ? t('grid.rangeOptional') : t('grid.range') }}</span>
    </FieldRow>
    <FieldRow :label="t('grid.rows')" for="f-rows">
      <NumberInput id="f-rows" v-model="s.rows" :min="1" :max="16" :optional="rowsOptional" :placeholder="rowsOptional ? t('grid.auto') : ''" />
      <span class="hint">{{ rowsOptional ? t('grid.rangeOptional') : t('grid.range') }}</span>
    </FieldRow>
    <FieldRow :label="t('grid.flow')" for="f-flow">
      <SelectInput id="f-flow" v-model="s.flow" :options="flowOptions" />
    </FieldRow>
    <div class="hint indent">{{ s.flow === 'down' ? t('grid.flowHintDown') : t('grid.flowHintRight') }}</div>
    <div class="sep" />
    <FieldRow :label="t('grid.cellW')" for="f-cw">
      <NumberInput id="f-cw" v-model="s.cellW" :min="1" :max="65535" />
      <span class="hint">{{ t('unit.px') }}</span>
    </FieldRow>
    <FieldRow :label="t('grid.cellH')" for="f-ch">
      <NumberInput id="f-ch" v-model="s.cellH" :min="1" :max="65535" />
      <span class="hint">{{ t('unit.px') }}</span>
    </FieldRow>
  </div>
</template>
