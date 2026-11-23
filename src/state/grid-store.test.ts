import { describe, expect, it } from 'vitest';
import { reactive } from 'vue';
import type { GridItem } from '../core/item';
import { defaultSettings, type Settings } from '../core/settings';
import type { SelectionResult } from '../eagle/adapter';
import { createGridStore } from './grid-store';

const item = (id: string, name = id, importedAt = 0): GridItem => ({
  id,
  name,
  ext: 'png',
  importedAt,
  selectionIndex: 0,
  width: 100,
  height: 100,
  filePath: `/x/${id}.png`,
  thumbnailPath: `/x/${id}.png`,
  thumbnailURL: `file:///x/${id}.png`,
});

// 選択中の画像を差し替えられる偽の Eagle
const fakeEagle = (initial: GridItem[]) => {
  let current = initial;
  return {
    select: (xs: GridItem[]) => void (current = xs),
    fetchSelection: async (): Promise<SelectionResult> => ({
      items: current.map((it, selectionIndex) => ({ ...it, selectionIndex })),
      failures: [{ id: 'bad', name: 'bad.mp4', reason: 'unsupported' }],
    }),
  };
};

const ids = (xs: GridItem[]) => xs.map((x) => x.id);
const setup = (over: Partial<Settings> = {}, items = ['c', 'a', 'b'].map((x) => item(x))) => {
  const settings = reactive({ ...defaultSettings(), ...over }) as Settings;
  const eagle = fakeEagle(items);
  // 決まった乱数：毎回 0（シャッフルは先頭と入れ替えていく）
  const store = createGridStore(settings, { fetchSelection: eagle.fetchSelection, random: () => 0 });
  return { settings, eagle, store };
};

describe('load：起動したときの読み込み', () => {
  it('選択順で取り込み、読み込めなかった画像を覚える', async () => {
    const { store } = setup();
    await store.load();
    expect(ids(store.state.items)).toEqual(['c', 'a', 'b']);
    expect(store.state.failures).toHaveLength(1);
    expect(store.state.status).toBe('ready');
  });

  it('保存してあった並び順で並べる（ファイル名順・降順）', async () => {
    const { store } = setup({ sortKey: 'name', sortDir: 'desc' });
    await store.load();
    expect(ids(store.state.items)).toEqual(['c', 'b', 'a']);
  });

  it('入力できる枚数を超えたら、先頭から入る分だけを取り込む', async () => {
    // 1列×1行×32ページ = 32枚
    const many = Array.from({ length: 40 }, (_, i) => item(`i${i}`));
    const { store } = setup({ cols: 1, rows: 1 }, many);
    await store.load();
    expect(store.state.items).toHaveLength(32);
    expect(store.state.skipped).toBe(8);
    expect(store.state.items[0].id).toBe('i0');
  });

  it('取得に失敗したら error にする', async () => {
    const settings = reactive(defaultSettings()) as Settings;
    const store = createGridStore(settings, { fetchSelection: async () => { throw new Error('boom'); } });
    await store.load();
    expect([store.state.status, store.state.error]).toEqual(['error', 'boom']);
  });
});

describe('並び順の切り替え', () => {
  it('ファイル名順・昇順と降順', async () => {
    const { store, settings } = setup();
    await store.load();
    settings.sortKey = 'name';
    expect(ids(store.state.items)).toEqual(['a', 'b', 'c']);
    settings.sortDir = 'desc';
    expect(ids(store.state.items)).toEqual(['c', 'b', 'a']);
  });

  it('ランダムは選んだときだけシャッフルし、昇順・降順の切り替えでは変わらない', async () => {
    const { store, settings } = setup();
    await store.load();
    settings.sortKey = 'random';
    const once = ids(store.state.items);
    expect(once).toEqual(['a', 'b', 'c']);
    settings.sortDir = 'desc';
    expect(ids(store.state.items)).toEqual(once);
    // 別の並び順を選んでからランダムを選び直すと、もう一度シャッフルする
    settings.sortKey = 'selection';
    settings.sortKey = 'random';
    expect(store.state.items).toHaveLength(3);
  });

  it('手動順を選んでも並びは変わらない', async () => {
    const { store, settings } = setup({ sortKey: 'name' });
    await store.load();
    settings.sortKey = 'manual';
    expect(ids(store.state.items)).toEqual(['a', 'b', 'c']);
  });
});

describe('move：挿入移動', () => {
  it('移動すると手動順になる', async () => {
    const { store, settings } = setup({ sortKey: 'name' });
    await store.load();
    store.move(0, 2);
    expect(ids(store.state.items)).toEqual(['b', 'c', 'a']);
    expect(settings.sortKey).toBe('manual');
  });
});

describe('reload・exclude・clear', () => {
  it('手動順なら、新しい画像を末尾に足す', async () => {
    const { store, eagle } = setup();
    await store.load();
    store.move(2, 0); // b, c, a
    eagle.select([item('a'), item('d'), item('b')]);
    await store.reload();
    expect(ids(store.state.items)).toEqual(['b', 'a', 'd']);
    expect(store.state.lastReload).toEqual({ kept: 2, added: 1, removed: 1 });
  });

  it('外した画像は、選ばれていても再追加しない。クリアすると忘れる', async () => {
    const { store } = setup();
    await store.load();
    store.exclude('a');
    expect(ids(store.state.items)).toEqual(['c', 'b']);
    expect(store.isExcluded('a')).toBe(true);
    await store.reload();
    expect(ids(store.state.items)).toEqual(['c', 'b']);
    store.clear();
    expect(store.state.items).toEqual([]);
    expect(store.isExcluded('a')).toBe(false);
    await store.reload();
    expect(ids(store.state.items)).toEqual(['c', 'a', 'b']);
  });

  it('再読み込みでも、入力できる枚数を超える分は足さない', async () => {
    const { store, eagle, settings } = setup({ cols: 1, rows: 1 });
    await store.load();
    settings.sortKey = 'manual';
    eagle.select(Array.from({ length: 40 }, (_, i) => item(`i${i}`)).concat([item('c'), item('a'), item('b')]));
    await store.reload();
    expect(store.state.items).toHaveLength(32);
    expect(ids(store.state.items).slice(0, 3)).toEqual(['c', 'a', 'b']);
    expect(store.state.skipped).toBe(11);
  });
});
