<script setup lang="ts">
// 画面全体：左＝カテゴリ／中央＝設定／右＝プレビュー（01 の 9 章）
import { provide, ref } from 'vue';
import { APP_KEY, type AppContext } from './app-context';
import CategoryRail from './components/CategoryRail.vue';
import FooterBar from './components/FooterBar.vue';
import PreviewPane from './components/PreviewPane.vue';
import PreviewToolbar from './components/PreviewToolbar.vue';
import SettingsPane from './components/SettingsPane.vue';
import AppDialog from './components/ui/AppDialog.vue';
import { t } from './i18n';

const props = defineProps<{ ctx: AppContext; sharpError: string | null }>();
provide(APP_KEY, props.ctx);

const ui = props.ctx.ui;
const preview = ref<InstanceType<typeof PreviewPane> | null>(null);
</script>

<template>
  <div class="app">
    <div class="body">
      <CategoryRail />
      <SettingsPane />
      <section class="right">
        <PreviewToolbar @fit="preview?.fit()" @zoom-out="preview?.zoomOut()" @zoom-in="preview?.zoomIn()" />
        <div v-if="sharpError" class="fatal" role="alert">{{ t('boot.sharpError', { message: sharpError }) }}</div>
        <PreviewPane ref="preview" />
      </section>
    </div>
    <FooterBar />
    <AppDialog v-if="ui.state.dialog" :key="ui.state.dialog.title" :dialog="ui.state.dialog" @choose="ui.choose" />
  </div>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.body {
  flex: 1;
  min-height: 0;
  display: flex;
}
.right {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.fatal {
  padding: 8px 14px;
  background: #3a2421;
  color: #ffd7d2;
  font-size: 11.5px;
}
</style>
