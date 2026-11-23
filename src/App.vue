<script setup lang="ts">
// 画面の骨組み（段階 2 の仮のもの）。左：カテゴリ／中央：設定／右：プレビュー
import { computed } from 'vue';
import { capacityOf } from './core/grid';
import type { Settings } from './core/settings';
import { t } from './i18n';
import type { BootInfo } from './main';
import type { GridStore } from './state/grid-store';

const props = defineProps<{ info: BootInfo; settings: Settings; grid: GridStore }>();
const state = props.grid.state;
const capacity = computed(() => capacityOf(props.settings));
</script>

<template>
  <div class="app">
    <header class="app-header">{{ t('app.title') }}</header>
    <div class="app-body">
      <nav class="col-nav" />
      <section class="col-settings" />
      <main class="col-preview">
        <div class="boot-info">
          <p v-if="info.sharpVersion">{{ t('boot.sharpOk', { version: info.sharpVersion, ms: info.sharpMs }) }}</p>
          <p v-else class="error">{{ t('boot.sharpError', { message: info.sharpError ?? '' }) }}</p>
          <p>{{ t('boot.locale', { locale: info.locale, eagleLocale: info.eagleLocale ?? '-' }) }}</p>
          <p class="status">{{ t('boot.status', { count: state.items.length, status: state.status }) }}</p>
          <p v-if="state.skipped > 0" class="error">{{ t('boot.skipped', { count: state.skipped, capacity }) }}</p>
          <template v-if="state.failures.length > 0">
            <p class="error">{{ t('boot.failures', { count: state.failures.length }) }}</p>
            <ul>
              <li v-for="f in state.failures.slice(0, 10)" :key="f.id">{{ f.name }}：{{ t(`failure.${f.reason}`) }}</li>
            </ul>
          </template>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
}
.app-header {
  padding: 10px 16px;
  font-weight: 600;
  border-bottom: 1px solid var(--border);
}
.app-body {
  display: flex;
  flex: 1;
  min-height: 0;
}
.col-nav {
  width: 80px;
  border-right: 1px solid var(--border);
}
.col-settings {
  width: 320px;
  border-right: 1px solid var(--border);
}
.col-preview {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.boot-info {
  color: var(--text-muted);
  line-height: 1.8;
}
.error {
  color: var(--danger);
}
</style>
