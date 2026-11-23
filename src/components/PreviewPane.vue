<script setup lang="ts">
// 右：グリッドのプレビュー（01 の 7 章）
// - Eagle のサムネイルで1ページを描く。拡大しても元画像に切り替えない
// - ドラッグ＝パン、ホイール＝ズーム、Ctrl / Cmd + ドラッグ＝挿入移動
// - 削除モードでは、セルを押すと確認してから外す
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { useApp } from '../app-context';
import { placement } from '../core/placement';
import { t } from '../i18n';
import { drawCellState, drawImageCell, drawPage } from '../preview/draw';
import { cellAt, dropTarget, type DropTarget } from '../preview/hit';
import { ThumbCache } from '../preview/thumb-cache';
import { ZOOM_STEP, fitViewport, panBy, scaleLimits, toPage, zoomAt, type Viewport } from '../preview/viewport';
import { fmtNumber, issueMessage } from '../state/format';
import AppIcon from './ui/AppIcon.vue';

const CLICK_SLOP = 4; // これ以上動いたら、クリックではなくパン
const PAGE_HOVER_MS = 500; // ドラッグ中にページ送りボタンの上で止まって、ページを移るまでの時間

const { settings, view, grid, ui, actions } = useApp();
const state = grid.state;

const stage = ref<HTMLDivElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);
const size = ref({ w: 0, h: 0 });
const vp = ref<Viewport>({ scale: 1, x: 0, y: 0 });
const adjusted = ref(false); // ユーザーがパン・ズームしたか（していなければ大きさが変わったら Fit し直す）
const hoverIndex = ref(-1);

// ドラッグの状態（パン・挿入移動）
type Drag =
  | { kind: 'pan'; id: number; sx: number; sy: number; v0: Viewport; moved: boolean; downIndex: number }
  | { kind: 'reorder'; id: number; from: number; url: string; cx: number; cy: number; target: DropTarget | null };

const drag = shallowRef<Drag | null>(null);

const page = computed(() => view.currentPage.value);
const isEmpty = computed(() => state.status !== 'loading' && view.total.value === 0);
const zoomPct = computed(() => `${Math.round(vp.value.scale * 100)}%`);
const overflow = computed(() => view.issues.value.find((i) => i.code === 'overflow'));
const formatLimit = computed(() => view.issues.value.find((i) => i.code === 'formatLimit'));
const skippedText = computed(() => {
  if (state.skipped <= 0) return '';
  return t('issue.skipped', { count: fmtNumber(state.skipped), capacity: fmtNumber(view.capacity.value), cols: settings.cols ?? 16, rows: settings.rows ?? 16 });
});

// ---------------------------------------------------------------
// 描画
// ---------------------------------------------------------------
const cache = new ThumbCache(() => schedule());

function draw(): void {
  const c = canvas.value;
  if (!c || !size.value.w) return;
  const dpr = window.devicePixelRatio || 1;
  const cw = Math.round(size.value.w * dpr);
  const ch = Math.round(size.value.h * dpr);
  if (c.width !== cw || c.height !== ch) {
    c.width = cw;
    c.height = ch;
  }
  const ctx = c.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, cw, ch);
  if (isEmpty.value) return;
  const p = page.value;
  const v = vp.value;
  ctx.setTransform(dpr * v.scale, 0, 0, dpr * v.scale, dpr * v.x, dpr * v.y);
  ctx.imageSmoothingQuality = 'high';
  const items = state.items;
  const brokenLabel = t('preview.broken');
  drawPage(ctx, p, settings.bg, settings.textColor, (cx, cell) => {
    const it = items[cell.index];
    if (!it) return;
    const e = cache.get(it.id, it.thumbnailURL);
    if (e.state !== 'ok' || !e.img) {
      drawCellState(cx, cell, e.state === 'broken' ? 'broken' : 'loading', brokenLabel);
      return;
    }
    // 置き方は Eagle の幅・高さ（見た目の向き）で決める。書き出しと同じ計算
    const srcW = it.width || e.img.naturalWidth;
    const srcH = it.height || e.img.naturalHeight;
    drawImageCell(cx, cell, placement(srcW, srcH, cell.w, cell.h, settings), e.img);
  });
  drawOverlays(ctx);
  cache.retainOnly(p.cells.map((cell) => items[cell.index]?.id).filter((x): x is string => !!x));
}

// 挿入移動・削除モードの目印
function drawOverlays(ctx: CanvasRenderingContext2D): void {
  const p = page.value;
  const px = 1 / vp.value.scale; // 画面の 1px
  const d = drag.value;
  if (d?.kind === 'reorder') {
    const src = p.cells.find((c) => c.index === d.from);
    if (src) {
      ctx.fillStyle = 'rgba(31,32,36,.62)';
      ctx.fillRect(src.x, src.y, src.w, src.h);
      ctx.strokeStyle = '#4a8bff';
      ctx.lineWidth = 2 * px;
      ctx.strokeRect(src.x + px, src.y + px, src.w - 2 * px, src.h - 2 * px);
    }
    const tgt = d.target ? p.cells.find((c) => c.slot === d.target?.slot) : null;
    if (d.target && tgt) {
      ctx.fillStyle = '#4a8bff';
      const w = 4 * px;
      ctx.fillRect(d.target.side === 'left' ? tgt.x : tgt.x + tgt.w - w, tgt.y, w, tgt.h);
    }
    return;
  }
  if (ui.state.trash && hoverIndex.value >= 0) {
    const cell = p.cells.find((c) => c.index === hoverIndex.value);
    if (cell) {
      ctx.fillStyle = 'rgba(229,113,91,.28)';
      ctx.fillRect(cell.x, cell.y, cell.w, cell.h);
      ctx.strokeStyle = '#e5715b';
      ctx.lineWidth = 3 * px;
      ctx.strokeRect(cell.x + 1.5 * px, cell.y + 1.5 * px, cell.w - 3 * px, cell.h - 3 * px);
    }
  }
}

let raf = 0;
function schedule(): void {
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(draw);
}

// ---------------------------------------------------------------
// Fit・ズーム
// ---------------------------------------------------------------
function fit(): void {
  adjusted.value = false;
  if (!size.value.w) return;
  vp.value = fitViewport({ w: page.value.width, h: page.value.height }, size.value);
}

function limits() {
  return scaleLimits(fitViewport({ w: page.value.width, h: page.value.height }, size.value).scale);
}

function zoomBy(factor: number, px = size.value.w / 2, py = size.value.h / 2): void {
  adjusted.value = true;
  vp.value = zoomAt(vp.value, factor, px, py, limits());
}

// ページを移ったら Fit に戻す。ページの大きさが変わったときも、パン・ズームしていなければ Fit し直す
watch(
  () => page.value.pageIndex,
  () => fit(),
);
watch(
  () => [page.value.width, page.value.height, size.value.w, size.value.h],
  () => {
    if (!adjusted.value) fit();
  },
);
// 画像の並び（並べ替え・除外・再読み込みで新しい配列になる）が変わったときも描き直す
watch([page, vp, () => state.items, () => settings.bg, () => settings.textColor, () => settings.fit, () => settings.upscale, () => settings.orient, () => settings.rotDir, isEmpty, () => ui.state.trash, hoverIndex, drag], schedule);

// ---------------------------------------------------------------
// マウスの操作
// ---------------------------------------------------------------
let navTimer: ReturnType<typeof setTimeout> | null = null;
let navOver: 'prev' | 'next' | null = null;

function local(e: PointerEvent | WheelEvent): { x: number; y: number } {
  const r = stage.value?.getBoundingClientRect();
  return { x: e.clientX - (r?.left ?? 0), y: e.clientY - (r?.top ?? 0) };
}

function indexAt(sx: number, sy: number): number {
  const p = toPage(vp.value, sx, sy);
  return cellAt(page.value.cells, p.x, p.y)?.index ?? -1;
}

function onPointerDown(e: PointerEvent): void {
  if (e.button !== 0 || isEmpty.value || ui.state.dialog) return;
  const { x, y } = local(e);
  const index = indexAt(x, y);
  try {
    stage.value?.setPointerCapture(e.pointerId);
  } catch {
    // 捕まえられなくても操作は続ける
  }
  // Ctrl / Cmd + ドラッグは挿入移動（削除モードのときはしない）
  if ((e.ctrlKey || e.metaKey) && index >= 0 && !ui.state.trash && !view.exporting.value) {
    const it = state.items[index];
    drag.value = { kind: 'reorder', id: e.pointerId, from: index, url: it.thumbnailURL, cx: x, cy: y, target: null };
    ui.state.reordering = true;
    return;
  }
  drag.value = { kind: 'pan', id: e.pointerId, sx: x, sy: y, v0: vp.value, moved: false, downIndex: index };
}

function onPointerMove(e: PointerEvent): void {
  const { x, y } = local(e);
  const d = drag.value;
  if (!d) {
    if (ui.state.trash) hoverIndex.value = indexAt(x, y);
    return;
  }
  if (d.kind === 'pan') {
    const dx = x - d.sx;
    const dy = y - d.sy;
    if (!d.moved && Math.hypot(dx, dy) < CLICK_SLOP) return;
    d.moved = true;
    adjusted.value = true;
    vp.value = panBy(d.v0, dx, dy);
    return;
  }
  // 挿入移動：落とす位置と、ページ送りボタンの上で止まっているか
  const p = toPage(vp.value, x, y);
  drag.value = { ...d, cx: x, cy: y, target: dropTarget(view.layout.value, page.value.pageIndex, d.from, p.x, p.y) };
  watchPageNav(e.clientX, e.clientY);
}

// ドラッグ中にページ送りボタンの上で止まったら、ページを移る（TV-10 と同じ）
function watchPageNav(clientX: number, clientY: number): void {
  const el = document.elementFromPoint(clientX, clientY)?.closest<HTMLButtonElement>('[data-page-nav]');
  const dir = el && !el.disabled ? (el.dataset.pageNav as 'prev' | 'next') : null;
  if (dir === navOver) return;
  navOver = dir;
  if (navTimer) clearTimeout(navTimer);
  navTimer = null;
  if (!dir) return;
  const step = () => {
    const n = ui.state.page + (dir === 'next' ? 1 : -1);
    if (n < 0 || n >= view.pageCount.value) return;
    ui.state.page = n;
    navTimer = setTimeout(step, PAGE_HOVER_MS + 200);
  };
  navTimer = setTimeout(step, PAGE_HOVER_MS);
}

function endDrag(e: PointerEvent, commit: boolean): void {
  const d = drag.value;
  drag.value = null;
  ui.state.reordering = false;
  if (navTimer) clearTimeout(navTimer);
  navTimer = null;
  navOver = null;
  try {
    if (stage.value?.hasPointerCapture(e.pointerId)) stage.value.releasePointerCapture(e.pointerId);
  } catch {
    // 何もしない
  }
  if (!d || !commit) {
    schedule();
    return;
  }
  if (d.kind === 'pan') {
    // 動かさずに離した：削除モードならセルを外す（確認してから）
    if (!d.moved && ui.state.trash && d.downIndex >= 0) void actions.askExclude(d.downIndex);
    return;
  }
  if (d.target && d.target.to !== d.from) grid.move(d.from, d.target.to);
  schedule();
}

function onWheel(e: WheelEvent): void {
  if (isEmpty.value) return;
  e.preventDefault();
  const { x, y } = local(e);
  // トラックパッドのピンチ（ctrlKey つき）は小さな値で来るので、少し大きく効かせる
  const k = e.ctrlKey ? 0.01 : 0.0015;
  zoomBy(Math.exp(-e.deltaY * k), x, y);
}

function onLeave(): void {
  if (!drag.value) hoverIndex.value = -1;
}

const cursor = computed(() => {
  const d = drag.value;
  if (d?.kind === 'reorder') return 'grabbing';
  if (d?.kind === 'pan' && d.moved) return 'grabbing';
  if (ui.state.trash && hoverIndex.value >= 0) return 'pointer';
  return 'grab';
});

// 並べ替え中の画像（ポインターについてくる半透明の画像）
const ghost = computed(() => {
  const d = drag.value;
  if (d?.kind !== 'reorder') return null;
  const size = 96;
  return { url: d.url, style: { left: `${d.cx - size / 2}px`, top: `${d.cy + 10}px`, width: `${size}px`, height: `${size}px` } };
});

// 削除モードを切ったら、目印を消す
watch(
  () => ui.state.trash,
  (on) => {
    if (!on) hoverIndex.value = -1;
  },
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
  if (navTimer) clearTimeout(navTimer);
});

defineExpose({
  fit,
  zoomIn: () => zoomBy(ZOOM_STEP),
  zoomOut: () => zoomBy(1 / ZOOM_STEP),
  // 開発用の確認に使う
  debug: () => ({ viewport: vp.value, cacheSize: cache.size, loading: cache.loading, broken: cache.brokenKeys(), size: size.value }),
});
</script>

<template>
  <div
    ref="stage"
    class="stage"
    :style="{ cursor }"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="endDrag($event, true)"
    @pointercancel="endDrag($event, false)"
    @pointerleave="onLeave"
    @wheel="onWheel"
  >
    <canvas ref="canvas" class="canvas" />

    <div v-if="isEmpty" class="empty">
      <div class="empty-icon"><AppIcon name="grid" :size="28" :stroke-width="1.3" /></div>
      <div class="empty-title">{{ t('preview.empty') }}</div>
      <div class="empty-hint">{{ t('preview.emptyHint') }}</div>
      <button type="button" class="btn with-icon" @pointerdown.stop @click="actions.askReload">
        <AppIcon name="reload" :size="16" />
        <span>{{ t('preview.loadSelection') }}</span>
      </button>
    </div>

    <div class="banners">
      <div v-if="drag?.kind === 'reorder'" class="pill reorder" role="status">{{ t('preview.reordering') }}</div>
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

    <img v-if="ghost" class="ghost" :src="ghost.url" :style="ghost.style" alt="" />

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
  touch-action: none;
  user-select: none;
}
.canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  /* 画面全体の 'palt'（文字詰め）を Canvas の文字に効かせない
     文字の幅を測る Canvas・書き出しの Canvas は画面に置かないので、詰めない。プレビューもそれに合わせる */
  font-feature-settings: normal;
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
  cursor: default;
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
.pill.reorder {
  background: #1f3a6e;
  border-color: var(--accent);
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
  display: flex;
  align-items: center;
  gap: 8px;
  border-radius: 6px;
  font-size: 11.5px;
  white-space: nowrap;
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
.ghost {
  position: absolute;
  object-fit: cover;
  opacity: 0.5;
  pointer-events: none;
  border-radius: 3px;
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
