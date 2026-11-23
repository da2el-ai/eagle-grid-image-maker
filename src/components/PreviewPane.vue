<script setup lang="ts">
// 右：グリッドのプレビュー
// 段階 3 では、セルを灰色の四角、文字を Canvas で描くだけ。サムネイル・パン・並べ替えは段階 4
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useApp } from '../app-context';
import { t } from '../i18n';
import { drawPage } from '../preview/draw';
import { fmtNumber, issueMessage } from '../state/format';
import AppIcon from './ui/AppIcon.vue';

const MARGIN = 28; // Fit のときの周りの余白（画面の px）
const ZOOM_STEP = 1.25;

const { settings, view, grid, actions } = useApp();

const stage = ref<HTMLDivElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);
const size = ref({ w: 0, h: 0 });
const zoom = ref(1); // Fit に対する倍率

const fitScale = computed(() => {
  const L = view.layout.value;
  if (!size.value.w || !size.value.h) return 1;
  return Math.min((size.value.w - MARGIN * 2) / L.width, (size.value.h - MARGIN * 2) / L.height);
});
const scale = computed(() => fitScale.value * zoom.value);
const zoomPct = computed(() => `${Math.round(scale.value * 100)}%`);

const state = grid.state;
const isEmpty = computed(() => state.status !== 'loading' && view.total.value === 0);
const overflow = computed(() => view.issues.value.find((i) => i.code === 'overflow'));
const formatLimit = computed(() => view.issues.value.find((i) => i.code === 'formatLimit'));
const skippedText = computed(() => {
  if (state.skipped <= 0) return '';
  const capCols = settings.cols ?? 16;
  const capRows = settings.rows ?? 16;
  return t('issue.skipped', { count: fmtNumber(state.skipped), capacity: fmtNumber(view.capacity.value), cols: capCols, rows: capRows });
});

function draw(): void {
  const c = canvas.value;
  if (!c || !size.value.w) return;
  const dpr = window.devicePixelRatio || 1;
  c.width = Math.round(size.value.w * dpr);
  c.height = Math.round(size.value.h * dpr);
  const ctx = c.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, c.width, c.height);
  if (isEmpty.value) return;
  const page = view.currentPage.value;
  const s = scale.value;
  const ox = (size.value.w - page.width * s) / 2;
  const oy = (size.value.h - page.height * s) / 2;
  ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
  drawPage(ctx, page, settings.bg, settings.textColor, (cx, cell) => {
    cx.fillStyle = '#c9cad0';
    cx.fillRect(cell.x, cell.y, cell.w, cell.h);
  });
}

let raf = 0;
function schedule(): void {
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(draw);
}

watch([() => view.currentPage.value, scale, () => settings.bg, () => settings.textColor, isEmpty], schedule);

// ページを移ったら Fit に戻す（01 の 7 章）
watch(
  () => view.currentPage.value.pageIndex,
  () => (zoom.value = 1),
);

let ro: ResizeObserver | null = null;
onMounted(() => {
  ro = new ResizeObserver(([e]) => {
    size.value = { w: e.contentRect.width, h: e.contentRect.height };
    schedule();
  });
  if (stage.value) ro.observe(stage.value);
});
onBeforeUnmount(() => {
  ro?.disconnect();
  cancelAnimationFrame(raf);
});

defineExpose({
  fit: () => (zoom.value = 1),
  zoomIn: () => (zoom.value *= ZOOM_STEP),
  zoomOut: () => (zoom.value /= ZOOM_STEP),
});
</script>

<template>
  <div ref="stage" class="stage">
    <canvas ref="canvas" class="canvas" />

    <div v-if="isEmpty" class="empty">
      <div class="empty-icon"><AppIcon name="grid" :size="28" :stroke-width="1.3" /></div>
      <div class="empty-title">{{ t('preview.empty') }}</div>
      <div class="empty-hint">{{ t('preview.emptyHint') }}</div>
      <button type="button" class="btn with-icon" @click="actions.askReload">
        <AppIcon name="reload" :size="16" />
        <span>{{ t('preview.loadSelection') }}</span>
      </button>
    </div>

    <div class="banners">
      <div v-if="state.status === 'loading'" class="pill" role="status">
        <span class="spinner" aria-hidden="true" />
        <span>{{ t('preview.loading') }}</span>
      </div>
      <div v-if="state.status === 'error'" class="banner error" role="alert">
        <AppIcon name="warn" :size="15" :stroke-width="1.6" class="icon" />
        <span>{{ t('preview.error', { message: state.error ?? '' }) }}</span>
      </div>
      <div v-if="skippedText" class="banner warn" role="status">
        <AppIcon name="warn" :size="15" :stroke-width="1.6" class="icon" />
        <span>{{ skippedText }}</span>
      </div>
      <div v-if="overflow" class="banner error" role="alert">
        <AppIcon name="warn" :size="15" :stroke-width="1.6" class="icon" />
        <span>{{ issueMessage(overflow, 'banner') }}</span>
      </div>
      <div v-if="formatLimit" class="banner error" role="alert">
        <AppIcon name="warn" :size="15" :stroke-width="1.6" class="icon" />
        <span>{{ issueMessage(formatLimit, 'banner') }}</span>
      </div>
    </div>

    <div class="help">{{ t('preview.help') }}</div>
    <div v-if="!isEmpty" class="zoom">{{ zoomPct }}</div>
  </div>
</template>

<style scoped>
.stage {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  background: var(--bg);
}
.canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.empty {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--text-muted);
  text-align: center;
}
.empty-icon {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed #4a4b53;
  border-radius: 8px;
}
.empty-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}
.empty-hint {
  font-size: 11.5px;
  line-height: 1.6;
}
.with-icon {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
}
.banners {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  max-width: calc(100% - 24px);
  pointer-events: none;
}
.pill {
  height: 26px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-panel);
  border: 1px solid var(--border-strong);
  border-radius: 13px;
  font-size: 11.5px;
  white-space: nowrap;
}
.spinner {
  width: 12px;
  height: 12px;
  border: 2px solid #3b3c44;
  border-top-color: #6aa1ff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.banner {
  max-width: 100%;
  padding: 6px 12px;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 8px;
  border-radius: 6px;
  font-size: 11.5px;
}
.banner .icon {
  flex: none;
}
.banner span {
  overflow: hidden;
  text-overflow: ellipsis;
}
.banner.warn {
  background: #3a321f;
  border: 1px solid rgba(226, 176, 74, 0.55);
  color: #f3e2b8;
}
.banner.warn .icon {
  color: var(--warn);
}
.banner.error {
  background: #3a2421;
  border: 1px solid rgba(229, 113, 91, 0.55);
  color: #ffd7d2;
}
.banner.error .icon {
  color: var(--danger);
}
.help {
  position: absolute;
  left: 12px;
  bottom: 10px;
  font-size: 11px;
  color: var(--text-muted);
  pointer-events: none;
}
.zoom {
  position: absolute;
  right: 12px;
  bottom: 8px;
  height: 20px;
  padding: 0 8px;
  display: flex;
  align-items: center;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 10px;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-muted);
  pointer-events: none;
}
</style>
