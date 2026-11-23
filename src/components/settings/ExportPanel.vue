<script setup lang="ts">
// 設定：書き出し（形式・品質・出力サイズ・警告）
import { computed } from 'vue';
import { useApp } from '../../app-context';
import type { OutputFormat } from '../../core/settings';
import { t } from '../../i18n';
import { fmtNumber, issueMessage } from '../../state/format';
import AppIcon from '../ui/AppIcon.vue';
import FieldRow from '../ui/FieldRow.vue';
import SegmentedControl from '../ui/SegmentedControl.vue';

const { settings: s, view } = useApp();

const formatOptions: { value: OutputFormat; label: string }[] = [
  { value: 'jpeg', label: 'JPEG' },
  { value: 'png', label: 'PNG' },
  { value: 'webp', label: 'WebP' },
];
const isPng = computed(() => s.format === 'png');
const formatLimit = computed(() => view.issues.value.find((i) => i.code === 'formatLimit'));
const heavy = computed(() => view.issues.value.find((i) => i.code === 'heavy'));

function setQuality(e: Event): void {
  s.quality = Number((e.target as HTMLInputElement).value);
}
</script>

<template>
  <div class="panel">
    <FieldRow :label="t('export.format')">
      <SegmentedControl v-model="s.format" :options="formatOptions" :label="t('export.format')" />
    </FieldRow>
    <FieldRow :label="t('export.quality')" for="f-q" :class="{ dim: isPng }">
      <input id="f-q" class="range" type="range" min="1" max="100" :value="s.quality" :disabled="isPng" @input="setQuality" />
      <span class="qval">{{ s.quality }}</span>
    </FieldRow>
    <div v-if="isPng" class="hint indent">{{ t('export.pngNoQuality') }}</div>
    <div class="sep" />
    <div class="summary">
      <div class="sum-row">
        <span class="muted">{{ t('export.resolution') }}</span>
        <span class="mono">{{ t('export.resolutionValue', { w: fmtNumber(view.layout.value.width), h: fmtNumber(view.layout.value.height) }) }}</span>
      </div>
      <div class="sum-row">
        <span class="muted">{{ t('export.pages') }}</span>
        <span class="mono">{{ t('export.pagesValue', { n: view.total.value ? view.pageCount.value : 0 }) }}</span>
      </div>
      <div class="sum-row">
        <span class="muted">{{ t('export.memory') }}</span>
        <span class="mono">{{ t('export.memoryValue', { mb: fmtNumber(view.memoryMB.value) }) }}</span>
      </div>
    </div>
    <div v-if="formatLimit" class="alert error" role="alert">
      <AppIcon name="warn" :size="16" :stroke-width="1.6" class="icon" />
      <span>{{ issueMessage(formatLimit, 'panel') }}</span>
    </div>
    <div v-if="heavy" class="alert warn" role="status">
      <AppIcon name="warn" :size="16" :stroke-width="1.6" class="icon" />
      <span>{{ issueMessage(heavy, 'panel') }}</span>
    </div>
  </div>
</template>

<style scoped>
.dim {
  opacity: 0.35;
}
.range {
  flex: 1;
  min-width: 0;
  accent-color: var(--accent);
}
.qval {
  width: 40px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-input);
  border-radius: 5px;
  font-family: var(--font-mono);
  font-size: 12px;
}
.summary {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: var(--bg-panel);
  border-radius: 6px;
}
.sum-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}
.muted {
  color: var(--text-muted);
}
.mono {
  font-family: var(--font-mono);
  font-size: 12px;
}
.alert {
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 6px;
  font-size: 11.5px;
  line-height: 1.5;
}
.alert .icon {
  flex: none;
  margin-top: 1px;
}
.alert.error {
  background: rgba(229, 113, 91, 0.14);
  border: 1px solid rgba(229, 113, 91, 0.55);
  color: #ffd7d2;
}
.alert.error .icon {
  color: var(--danger);
}
.alert.warn {
  background: rgba(226, 176, 74, 0.12);
  border: 1px solid rgba(226, 176, 74, 0.45);
}
.alert.warn .icon {
  color: var(--warn);
}
</style>
