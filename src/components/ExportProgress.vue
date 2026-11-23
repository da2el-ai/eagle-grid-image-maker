<script setup lang="ts">
// 書き出しの進み具合（右下の操作の上に出す）
import { computed } from 'vue';
import { useApp } from '../app-context';
import { t } from '../i18n';

const { exp } = useApp();
const st = exp.state;

const text = computed(() => {
  switch (st.phase) {
    case 'exporting':
      return t('export.progress', { page: st.page + 1, pages: st.pages });
    case 'failed':
      return st.written > 0 ? t('export.failedSaved', { page: st.failedPage + 1, saved: st.written }) : t('export.failed', { page: st.failedPage + 1 });
    case 'canceled':
      return t('export.canceled', { saved: st.written });
    case 'done':
      return t('export.done', { count: st.written });
    default:
      return '';
  }
});
const pct = computed(() => (st.phase === 'done' ? 100 : Math.round(exp.fraction() * 100)));
</script>

<template>
  <div v-if="st.phase !== 'idle'" class="progress" :class="st.phase" role="status">
    <span class="text">{{ text }}</span>
    <div class="bar"><div class="fill" :style="{ width: `${pct}%` }" /></div>
    <span class="pct">{{ pct }}%</span>
  </div>
</template>

<style scoped>
.progress {
  height: 28px;
  flex: none;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 14px;
  background: var(--bg);
  border-top: 1px solid var(--border);
  font-size: 11.5px;
}
.text {
  white-space: nowrap;
}
.failed .text {
  color: var(--danger);
}
.bar {
  flex: 1;
  height: 4px;
  background: #2d2e34;
  border-radius: 2px;
  overflow: hidden;
}
.fill {
  height: 100%;
  background: var(--accent);
  transition: width 0.15s;
}
.failed .fill {
  background: var(--danger);
}
.canceled .fill {
  background: var(--text-muted);
}
.pct {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-muted);
}
</style>
