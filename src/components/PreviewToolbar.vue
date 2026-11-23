<script setup lang="ts">
// 右上：サブ操作。並びは決まっていて変えない（01 の 9 章）
// [再読み込み] [ゴミ箱] | [Fit] [-] [+]
import { useApp } from '../app-context';
import { t } from '../i18n';
import AppIcon from './ui/AppIcon.vue';

defineEmits<{ fit: []; zoomOut: []; zoomIn: [] }>();
const { ui, actions, grid, view } = useApp();
</script>

<template>
  <div class="toolbar">
    <div class="trash-hint">{{ ui.state.trash ? t('toolbar.trashHint') : '' }}</div>
    <button type="button" class="icon-btn" :title="t('toolbar.reload')" :aria-label="t('toolbar.reloadLabel')" :disabled="grid.state.status === 'loading' || view.exporting.value" @click="actions.askReload">
      <AppIcon name="reload" />
    </button>
    <button
      type="button"
      class="icon-btn"
      :class="{ active: ui.state.trash }"
      :title="t('toolbar.trash')"
      :aria-label="t('toolbar.trash')"
      :aria-pressed="ui.state.trash"
      @click="ui.state.trash = !ui.state.trash"
    >
      <AppIcon name="trash" />
    </button>
    <div class="divider" aria-hidden="true" />
    <button type="button" class="icon-btn" title="Fit" :aria-label="t('toolbar.fit')" @click="$emit('fit')">
      <AppIcon name="fit" />
    </button>
    <button type="button" class="icon-btn" :title="t('toolbar.zoomOut')" :aria-label="t('toolbar.zoomOut')" @click="$emit('zoomOut')">
      <AppIcon name="minus" />
    </button>
    <button type="button" class="icon-btn" :title="t('toolbar.zoomIn')" :aria-label="t('toolbar.zoomIn')" @click="$emit('zoomIn')">
      <AppIcon name="plus" />
    </button>
  </div>
</template>

<style scoped>
.toolbar {
  height: 44px;
  flex: none;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 14px;
  border-bottom: 1px solid var(--border);
}
.trash-hint {
  flex: 1;
  min-width: 0;
  font-size: 11.5px;
  color: var(--danger);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.icon-btn.active {
  background: rgba(229, 113, 91, 0.18);
  color: var(--danger);
}
.divider {
  width: 1px;
  height: 16px;
  background: var(--border-strong);
  margin: 0 6px;
}
</style>
