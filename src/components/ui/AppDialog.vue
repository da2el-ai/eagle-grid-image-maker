<script setup lang="ts">
// 確認ダイアログ（ui-store の dialog を表示する）
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import type { DialogRequest } from '../../state/ui-store';
import AppIcon from './AppIcon.vue';

const props = defineProps<{ dialog: DialogRequest }>();
const emit = defineEmits<{ choose: [id: string] }>();

const root = ref<HTMLElement | null>(null);

function onKey(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    e.preventDefault();
    emit('choose', props.dialog.cancelId);
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKey);
  // 主ボタンに合わせる
  nextTick(() => root.value?.querySelector<HTMLButtonElement>('button.primary, button.danger, button')?.focus());
});
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <div class="overlay">
    <div ref="root" class="dialog" role="dialog" aria-modal="true" :aria-label="dialog.title">
      <div class="head">
        <AppIcon v-if="dialog.danger" name="warn" :size="18" :stroke-width="1.6" class="warn" />
        <div class="title">{{ dialog.title }}</div>
      </div>
      <div v-if="dialog.body" class="body">{{ dialog.body }}</div>
      <div v-if="dialog.list && dialog.list.length" class="list">
        <div v-for="(row, i) in dialog.list" :key="i" class="list-row">
          <span class="name">{{ row.name }}</span>
          <span class="reason">{{ row.reason }}</span>
        </div>
      </div>
      <div class="buttons">
        <button v-for="b in dialog.buttons" :key="b.id" type="button" class="btn" :class="b.kind" @click="emit('choose', b.id)">
          {{ b.label }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(10, 11, 14, 0.55);
}
.dialog {
  width: 460px;
  max-width: calc(100vw - 32px);
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 20px 20px 16px;
  background: var(--bg-panel);
  border: 1px solid var(--border-strong);
  border-radius: 10px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}
.head {
  display: flex;
  align-items: center;
  gap: 10px;
}
.warn {
  color: var(--danger);
  flex: none;
}
.title {
  font-size: 13px;
  font-weight: 600;
}
.body {
  color: var(--text-muted);
  line-height: 1.6;
}
.list {
  display: flex;
  flex-direction: column;
  max-height: 180px;
  overflow-y: auto;
  padding: 4px 0;
  background: var(--bg);
  border-radius: 6px;
}
.list-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 12px;
}
.name {
  font-family: var(--font-mono);
  font-size: 12px;
  overflow-wrap: anywhere;
}
.reason {
  flex: none;
  color: var(--danger);
  font-size: 11px;
}
.buttons {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
}
.btn.danger {
  background: var(--bg-input);
}
</style>
