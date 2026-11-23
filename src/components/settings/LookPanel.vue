<script setup lang="ts">
// 設定：外観（背景色・文字の色・ギャップ・外周余白）
import { useApp } from '../../app-context';
import { t } from '../../i18n';
import ColorInput from '../ui/ColorInput.vue';
import FieldRow from '../ui/FieldRow.vue';
import NumberInput from '../ui/NumberInput.vue';

const { settings: s } = useApp();
</script>

<template>
  <div class="panel">
    <FieldRow :label="t('look.bg')" for="f-bg">
      <ColorInput id="f-bg" v-model="s.bg" />
    </FieldRow>
    <FieldRow :label="t('look.textColor')" for="f-fg">
      <ColorInput id="f-fg" v-model="s.textColor" />
    </FieldRow>
    <div class="hint indent">{{ t('look.textColorHint') }}</div>
    <div class="sep" />
    <FieldRow :label="t('look.gap')" for="f-gap">
      <NumberInput id="f-gap" v-model="s.gap" :min="0" :max="10000" />
      <span class="hint">{{ t('unit.px') }}</span>
    </FieldRow>
    <FieldRow :label="t('look.padding')" for="f-pad">
      <NumberInput id="f-pad" v-model="s.padding" :min="0" :max="10000" />
      <span class="hint">{{ t('unit.px') }}</span>
    </FieldRow>
  </div>
</template>
