// 画像の並びと、読み込み・再読み込み・除外・クリア・並べ替え（01 の 2 章・3 章）
import { reactive, watch } from 'vue';
import { capacityOf } from '../core/grid';
import type { GridItem, LoadFailure } from '../core/item';
import { capItems, mergeReload, moveItem, shuffle, sortItems, type Random } from '../core/order';
import type { Settings, SortKey } from '../core/settings';
import type { SelectionResult } from '../eagle/adapter';

// セルごとの編集状態（位置調整・ズーム・回転）。初期版では使わないが、ID ごとに引き継げる形にしておく（01 の 2.2）
export type CellEdit = Record<string, never>;

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface ReloadSummary {
  kept: number;
  added: number;
  removed: number;
}

export interface GridState {
  items: GridItem[]; // 全画像の並び。各ページはここから切り出す
  status: LoadStatus;
  error: string | null;
  failures: LoadFailure[]; // 直前の読み込みで読み込めなかった画像
  skipped: number; // 直前の読み込みで、入力できる枚数を超えて取り込めなかった枚数
  lastReload: ReloadSummary | null;
}

export interface GridStoreDeps {
  fetchSelection: () => Promise<SelectionResult>;
  random?: Random;
}

export function createGridStore(settings: Settings, deps: GridStoreDeps) {
  const random = deps.random ?? Math.random;
  const state = reactive<GridState>({ items: [], status: 'idle', error: null, failures: [], skipped: 0, lastReload: null });
  // 除外した ID（再読み込みで再追加しない。「グリッドをクリア」で忘れる）
  const excluded = new Set<string>();
  const edits = new Map<string, CellEdit>();

  // 今の並び順の設定で並べる
  const arrange = (items: GridItem[], key: SortKey): GridItem[] => {
    if (key === 'random') return shuffle(items, random);
    if (key === 'manual') return sortItems(items, 'selection', 'asc');
    return sortItems(items, key, settings.sortDir);
  };

  const fetch = async (): Promise<SelectionResult | null> => {
    state.status = 'loading';
    state.error = null;
    try {
      return await deps.fetchSelection();
    } catch (e) {
      state.status = 'error';
      state.error = (e as Error).message;
      return null;
    }
  };

  // 起動したときの読み込み：Eagle で今選んでいる画像（01 の 2.1）
  async function load(): Promise<void> {
    const sel = await fetch();
    if (!sel) return;
    const { items, skipped } = capItems(sel.items, capacityOf(settings));
    state.items = arrange(items, settings.sortKey);
    state.failures = sel.failures;
    state.skipped = skipped;
    state.lastReload = null;
    edits.clear();
    state.status = 'ready';
  }

  // 再読み込み（01 の 2.2）。確認ダイアログは画面の側で出す
  async function reload(): Promise<void> {
    const sel = await fetch();
    if (!sel) return;
    const r = mergeReload(state.items, sel.items, excluded, settings.sortKey, settings.sortDir, random, capacityOf(settings));
    const ids = new Set(r.items.map((it) => it.id));
    for (const id of [...edits.keys()]) if (!ids.has(id)) edits.delete(id);
    state.items = r.items;
    state.failures = sel.failures;
    state.skipped = r.skipped;
    state.lastReload = { kept: r.kept, added: r.added, removed: r.removed };
    state.status = 'ready';
  }

  // グリッドから外す（Eagle の元ファイルは消さない。01 の 2.3）
  function exclude(id: string): void {
    excluded.add(id);
    edits.delete(id);
    state.items = state.items.filter((it) => it.id !== id);
  }

  // グリッドをクリア：すべて外し、除外した ID の記憶も消す
  function clear(): void {
    excluded.clear();
    edits.clear();
    state.items = [];
    state.failures = [];
    state.skipped = 0;
    state.lastReload = null;
  }

  // Ctrl / Cmd + ドラッグの挿入移動。移動したら手動順にする（01 の 3 章）
  function move(from: number, to: number): void {
    state.items = moveItem(state.items, from, to);
    settings.sortKey = 'manual';
  }

  // 並び順の設定が変わったら並べ直す
  // - ランダムは、選んだときに1度だけシャッフルする。同じ値の選び直し・ページ送りなどでは変えない
  // - 手動順を選んだときは、今の並びのまま
  watch(
    () => [settings.sortKey, settings.sortDir] as const,
    ([key, dir], [prevKey]) => {
      if (key === 'manual') return;
      if (key === 'random') {
        if (prevKey !== 'random') state.items = shuffle(state.items, random);
        return;
      }
      state.items = sortItems(state.items, key, dir);
    },
    { flush: 'sync' },
  );

  return {
    state,
    edits,
    load,
    reload,
    exclude,
    clear,
    move,
    isExcluded: (id: string) => excluded.has(id),
  };
}

export type GridStore = ReturnType<typeof createGridStore>;
