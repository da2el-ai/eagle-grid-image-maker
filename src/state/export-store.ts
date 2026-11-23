// 書き出しの進み具合（画面の下に出す）
import { reactive } from 'vue';

export type ExportPhase = 'idle' | 'exporting' | 'failed' | 'canceled' | 'done';

export interface ExportState {
  phase: ExportPhase;
  page: number; // 0 始まり
  pages: number;
  cellsDone: number;
  cells: number;
  failedPage: number; // 失敗したページ（0 始まり）
  written: number; // 書き終えたファイルの数
  cancelRequested: boolean;
}

export function createExportStore() {
  const state = reactive<ExportState>({ phase: 'idle', page: 0, pages: 0, cellsDone: 0, cells: 0, failedPage: -1, written: 0, cancelRequested: false });
  let timer: ReturnType<typeof setTimeout> | null = null;

  // 終わったことを、しばらく出してから消す
  function settle(phase: Exclude<ExportPhase, 'idle' | 'exporting'>, ms = 6000): void {
    state.phase = phase;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      if (state.phase === phase) state.phase = 'idle';
    }, ms);
  }

  function start(pages: number): void {
    if (timer) clearTimeout(timer);
    Object.assign(state, { phase: 'exporting', page: 0, pages, cellsDone: 0, cells: 0, failedPage: -1, written: 0, cancelRequested: false });
  }

  // 全体の進み具合（0〜1）
  function fraction(): number {
    if (state.pages === 0) return 0;
    const inPage = state.cells ? state.cellsDone / state.cells : 0;
    return Math.min(1, (state.page + inPage) / state.pages);
  }

  return { state, start, settle, fraction };
}

export type ExportStore = ReturnType<typeof createExportStore>;
