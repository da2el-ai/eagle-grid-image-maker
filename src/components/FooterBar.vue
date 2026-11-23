<script setup lang="ts">
// 右下：情報とメイン操作。並びは決まっていて変えない（01 の 9 章）
// [◀][▶] Page n / N | 枚数 | 並び順 | 出力解像度 | 推定メモリ |   [グリッドをクリア] [キャンセル] [グリッド保存]
// 出力解像度と推定メモリは、書き出しの設定欄と同じ値（見出しは付けない）
import { computed } from 'vue';
import { useApp } from '../app-context';
import { t } from '../i18n';
import { fmtNumber } from '../state/format';
import AppIcon from './ui/AppIcon.vue';

const { ui, view, settings, actions } = useApp();
const hasItems = computed(() => view.total.value > 0);
const pageLabel = computed(() => (hasItems.value ? t('footer.page', { n: ui.state.page + 1, total: view.pageCount.value }) : t('footer.pageNone')));
const resolution = computed(() =>
  hasItems.value ? t('export.resolutionValue', { w: fmtNumber(view.layout.value.width), h: fmtNumber(view.layout.value.height) }) : '–',
);
const memory = computed(() => (hasItems.value ? t('export.memoryValue', { mb: fmtNumber(view.memoryMB.value) }) : '–'));
// 形式の上限を超えたら解像度を赤、「重い」ときは推定メモリを黄色にする
const overLimit = computed(() => view.issues.value.some((i) => i.code === 'formatLimit'));
const heavy = computed(() => view.issues.value.some((i) => i.code === 'heavy'));
</script>

<template>
  <footer class="footer">
    <div class="info">
      <div class="pager">
        <button type="button" class="nav" data-page-nav="prev" :aria-label="t('footer.prev')" :disabled="ui.state.page <= 0" @click="ui.state.page--">
          <AppIcon name="prev" :size="16" :stroke-width="1.6" />
        </button>
        <button type="button" class="nav" data-page-nav="next" :aria-label="t('footer.next')" :disabled="ui.state.page >= view.pageCount.value - 1" @click="ui.state.page++">
          <AppIcon name="next" :size="16" :stroke-width="1.6" />
        </button>
      </div>
      <span class="mono">{{ pageLabel }}</span>
      <div class="divider" aria-hidden="true" />
      <span>{{ t('footer.count', { n: fmtNumber(view.total.value) }) }}</span>
      <div class="divider" aria-hidden="true" />
      <span class="muted">{{ t(`sort.${settings.sortKey}`) }}</span>
      <div class="divider" aria-hidden="true" />
      <span class="mono" :class="{ error: overLimit }">{{ resolution }}</span>
      <div class="divider" aria-hidden="true" />
      <span class="mono muted clip" :class="{ warn: heavy }">{{ memory }}</span>
    </div>
    <div class="actions">
      <button type="button" class="btn danger" :disabled="!hasItems || view.exporting.value" @click="actions.askClear">{{ t('footer.clear') }}</button>
      <button type="button" class="btn" @click="actions.cancel">{{ t('footer.cancel') }}</button>
      <button type="button" class="btn primary" :disabled="!view.saveEnabled.value" @click="actions.save">{{ t('footer.save') }}</button>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  height: 48px;
  flex: none;
  display: flex;
  align-items: center;
  padding: 0 14px;
  background: var(--bg-panel);
  border-top: 1px solid var(--border);
}
.info {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  white-space: nowrap;
  overflow: hidden;
  margin-right: 12px;
}
.info > * {
  flex: none;
}
/* 狭いときは、末尾の推定メモリを「…」で切る */
.info > .clip {
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
.error {
  color: var(--danger);
}
.warn {
  color: var(--warn);
}
.pager {
  display: flex;
  gap: 4px;
}
.nav {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-input);
  border: none;
  border-radius: 5px;
  cursor: pointer;
}
.mono {
  font-family: var(--font-mono);
  font-size: 12px;
}
.muted {
  color: var(--text-muted);
}
.divider {
  width: 1px;
  height: 14px;
  background: var(--border-strong);
}
.actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
</style>
