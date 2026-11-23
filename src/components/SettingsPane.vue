<script setup lang="ts">
// 中央：選んだカテゴリの設定
import { useApp } from '../app-context';
import { t } from '../i18n';
import ExportPanel from './settings/ExportPanel.vue';
import GridPanel from './settings/GridPanel.vue';
import ImagePanel from './settings/ImagePanel.vue';
import LookPanel from './settings/LookPanel.vue';
import TextPanel from './settings/TextPanel.vue';

const { ui } = useApp();
</script>

<template>
  <section class="pane" :aria-label="t(`tab.${ui.state.tab}`)">
    <div class="head">{{ t(`tab.${ui.state.tab}`) }}</div>
    <div class="body">
      <GridPanel v-if="ui.state.tab === 'grid'" />
      <ImagePanel v-else-if="ui.state.tab === 'image'" />
      <TextPanel v-else-if="ui.state.tab === 'text'" />
      <LookPanel v-else-if="ui.state.tab === 'look'" />
      <ExportPanel v-else />
    </div>
  </section>
</template>

<style scoped>
.pane {
  width: 344px;
  flex: none;
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-right: 1px solid var(--border);
}
.head {
  height: 44px;
  flex: none;
  display: flex;
  align-items: center;
  padding: 0 16px;
  border-bottom: 1px solid var(--border);
  font-size: 13px;
  font-weight: 600;
}
.body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 14px 16px 20px;
}
</style>
