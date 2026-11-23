// 設定と画像の並びから、画面に出す値を計算する（レイアウト・ページ数・保存できるか）
import { computed, watch } from 'vue';
import { capacityOf } from '../core/grid';
import { computeLayout } from '../core/layout';
import { canSave, checkOutput, pageBytes } from '../core/limits';
import type { Settings } from '../core/settings';
import type { Measure } from '../core/text';
import type { ExportStore } from './export-store';
import type { GridStore } from './grid-store';
import type { UiStore } from './ui-store';

export function createView(settings: Settings, grid: GridStore, ui: UiStore, measure: Measure, exp: ExportStore) {
  const total = computed(() => grid.state.items.length);
  const layout = computed(() => computeLayout(settings, total.value, measure));
  const shape = computed(() => layout.value.shape);
  const pageCount = computed(() => shape.value.pageCount);
  const capacity = computed(() => capacityOf(settings));
  const issues = computed(() =>
    checkOutput({ width: layout.value.width, height: layout.value.height, format: settings.format, total: total.value, overflow: shape.value.overflow }),
  );
  const exporting = computed(() => exp.state.phase === 'exporting');
  const saveEnabled = computed(() => canSave(issues.value) && grid.state.status !== 'loading' && !exporting.value);
  const memoryMB = computed(() => Math.round(pageBytes(layout.value.width, layout.value.height) / 1024 / 1024));
  const currentPage = computed(() => layout.value.page(ui.state.page));

  // ページ数が減って、表示していたページがなくなったら最後のページへ移る（01 の 4 章）
  watch(
    pageCount,
    (n) => {
      if (ui.state.page > n - 1) ui.state.page = Math.max(0, n - 1);
    },
    { immediate: true },
  );

  // 配置方向を切り替えて、必須になった側が空欄なら 4 を入れる（モックアップと同じ）
  watch(
    () => settings.flow,
    (flow) => {
      if (flow === 'right' && settings.cols == null) settings.cols = 4;
      if (flow === 'down' && settings.rows == null) settings.rows = 4;
    },
    { immediate: true },
  );

  return { total, layout, shape, pageCount, capacity, issues, saveEnabled, exporting, memoryMB, currentPage };
}

export type View = ReturnType<typeof createView>;
