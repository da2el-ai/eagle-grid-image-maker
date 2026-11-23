<script setup lang="ts">
// 左：カテゴリのアイコン
import { useApp } from '../app-context';
import { t } from '../i18n';
import { TABS } from '../state/ui-store';
import AppIcon from './ui/AppIcon.vue';

const { ui } = useApp();
</script>

<template>
  <nav class="rail" :aria-label="t('app.title')">
    <button
      v-for="tab in TABS"
      :key="tab"
      type="button"
      class="item"
      :class="{ on: ui.state.tab === tab }"
      :aria-pressed="ui.state.tab === tab"
      @click="ui.state.tab = tab"
    >
      <AppIcon :name="tab" :size="20" />
      <span class="label">{{ t(`tab.${tab}`) }}</span>
    </button>
  </nav>
</template>

<style scoped>
.rail {
  width: 78px;
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding-top: 10px;
  background: var(--bg-panel);
  border-right: 1px solid var(--border);
}
.item {
  width: 62px;
  padding: 10px 0 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
}
.item:hover {
  color: var(--text);
}
.item.on {
  background: var(--bg-input);
  color: var(--text);
  box-shadow: inset 2px 0 0 var(--accent);
}
.label {
  font-size: 10.5px;
}
</style>
