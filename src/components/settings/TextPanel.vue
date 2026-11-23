<script setup lang="ts">
// 設定：テキスト（タイトル・XY プロットのヘッダーと軸タイトル）
import { computed } from 'vue';
import { useApp } from '../../app-context';
import { headerCount } from '../../core/grid';
import { t } from '../../i18n';
import FieldRow from '../ui/FieldRow.vue';
import HeaderTextarea from '../ui/HeaderTextarea.vue';
import NumberInput from '../ui/NumberInput.vue';
import ToggleSwitch from '../ui/ToggleSwitch.vue';
import FontSelect from './FontSelect.vue';

const { settings: s, view } = useApp();

// 使うヘッダーの数。並びが進む側は全ページ分（01 の 6.2）
const colNeed = computed(() => headerCount('col', view.shape.value));
const rowNeed = computed(() => headerCount('row', view.shape.value));
const colCont = computed(() => s.flow === 'down');
const rowCont = computed(() => s.flow === 'right');

// タイトルは1行（改行は入れない）
function setTitle(e: Event): void {
  s.title = (e.target as HTMLInputElement).value.replace(/[\r\n]/g, '');
}
</script>

<template>
  <div class="panel">
    <div class="section">{{ t('text.titleSection') }}</div>
    <FieldRow :label="t('text.title')" for="f-title">
      <input id="f-title" class="input grow" type="text" :value="s.title" :placeholder="t('text.none')" @input="setTitle" />
    </FieldRow>
    <FieldRow :label="t('text.font')" for="f-tfont">
      <FontSelect id="f-tfont" v-model="s.titleFont" />
    </FieldRow>
    <FieldRow :label="t('text.size')" for="f-tsize">
      <NumberInput id="f-tsize" v-model="s.titleSize" :min="1" :max="1000" />
      <span class="hint">{{ t('unit.px') }}</span>
    </FieldRow>
    <div class="hint indent">{{ t('text.titleHint') }}</div>

    <div class="sep" />
    <div class="section-row">
      <span id="l-xy" class="section">{{ t('text.xy') }}</span>
      <ToggleSwitch v-model="s.xy" labelledby="l-xy" />
    </div>
    <div class="xy" :class="{ off: !s.xy }">
      <FieldRow :label="t('text.xAxis')" for="f-xt">
        <input id="f-xt" v-model="s.xAxis" class="input grow" type="text" :placeholder="t('text.none')" />
      </FieldRow>
      <FieldRow :label="t('text.yAxis')" for="f-yt">
        <input id="f-yt" v-model="s.yAxis" class="input grow" type="text" :placeholder="t('text.none')" />
      </FieldRow>
      <div class="block">
        <label for="f-colh" class="block-label">{{ t('text.colHeaders') }}</label>
        <HeaderTextarea id="f-colh" v-model="s.colHeaders" :min-lines="colNeed" />
        <div class="hint">{{ colCont ? t('text.headerHintCont', { count: colNeed }) : t('text.headerHint', { count: colNeed }) }}</div>
      </div>
      <div class="block">
        <label for="f-rowh" class="block-label">{{ t('text.rowHeaders') }}</label>
        <HeaderTextarea id="f-rowh" v-model="s.rowHeaders" :min-lines="rowNeed" />
        <div class="hint">{{ rowCont ? t('text.headerHintCont', { count: rowNeed }) : t('text.headerHint', { count: rowNeed }) }}</div>
      </div>
      <FieldRow :label="t('text.font')" for="f-hfont">
        <FontSelect id="f-hfont" v-model="s.headerFont" />
      </FieldRow>
      <FieldRow :label="t('text.size')" for="f-hsize">
        <NumberInput id="f-hsize" v-model="s.headerSize" :min="1" :max="1000" />
        <span class="hint">{{ t('unit.px') }}</span>
      </FieldRow>
      <div class="hint indent">{{ t('text.headerFontHint') }}</div>
    </div>
  </div>
</template>

<style scoped>
.section {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--text-muted);
}
.section-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.xy {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
/* XY プロットが OFF のときは触れないようにする */
.xy.off {
  opacity: 0.35;
  pointer-events: none;
}
.block {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.block-label {
  color: var(--text-muted);
}
.grow {
  flex: 1;
  min-width: 0;
}
</style>
