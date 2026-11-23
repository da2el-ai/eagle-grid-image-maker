import { describe, expect, it } from 'vitest';
import { capItems, mergeReload, moveItem, shuffle, sortItems, type Orderable } from './order';

const item = (id: string, name: string, importedAt: number, selectionIndex: number): Orderable => ({ id, name, ext: 'png', importedAt, selectionIndex });
const ids = (xs: Orderable[]) => xs.map((x) => x.id);

// 決まった順に値を返す乱数（テスト用）
const seq = (...vals: number[]) => {
  let i = 0;
  return () => vals[i++ % vals.length];
};

describe('sortItems', () => {
  const items = [item('a', 'img10', 3, 0), item('b', 'img2', 1, 1), item('c', 'IMG3', 2, 2)];

  it('選択順', () => {
    expect(ids(sortItems([items[2], items[0], items[1]], 'selection', 'asc'))).toEqual(['a', 'b', 'c']);
  });

  it('ファイル名順は数字の大きさで並べ、大文字と小文字を区別しない（TV-15）', () => {
    expect(ids(sortItems(items, 'name', 'asc'))).toEqual(['b', 'c', 'a']);
    expect(ids(sortItems(items, 'name', 'desc'))).toEqual(['a', 'c', 'b']);
  });

  it('ファイル名順：TV-15 と同じ並び', () => {
    // 「画像あ」と「画像ア」は同じとみなされる（Node 22 と Eagle の Chrome 108 の両方で確かめた）ので、選択順になる
    const names = ['img1', 'img2', 'img10', 'IMG3', 'img_02', '画像ア', '画像あ', '画像亜', 'Ａ全角'];
    const list = names.map((n, i) => item(String(i), n, 0, i));
    expect(sortItems(list, 'name', 'asc').map((x) => x.name)).toEqual(['Ａ全角', 'img_02', 'img1', 'img2', 'IMG3', 'img10', '画像ア', '画像あ', '画像亜']);
  });

  it('登録時刻順', () => {
    expect(ids(sortItems(items, 'imported', 'asc'))).toEqual(['b', 'c', 'a']);
    expect(ids(sortItems(items, 'imported', 'desc'))).toEqual(['a', 'c', 'b']);
  });

  it('同じ名前は選択順', () => {
    const same = [item('x', '同名', 0, 1), item('y', '同名', 0, 0)];
    expect(ids(sortItems(same, 'name', 'asc'))).toEqual(['y', 'x']);
    expect(ids(sortItems(same, 'name', 'desc'))).toEqual(['y', 'x']);
  });

  it('手動順・ランダムは並べ替えない', () => {
    const list = [items[2], items[0], items[1]];
    expect(ids(sortItems(list, 'manual', 'asc'))).toEqual(['c', 'a', 'b']);
    expect(ids(sortItems(list, 'random', 'desc'))).toEqual(['c', 'a', 'b']);
  });

  it('元の配列は変えない', () => {
    const list = [items[2], items[0]];
    sortItems(list, 'selection', 'asc');
    expect(ids(list)).toEqual(['c', 'a']);
  });
});

describe('shuffle', () => {
  it('すべての要素が1つずつ残る', () => {
    const list = Array.from({ length: 100 }, (_, i) => i);
    const out = shuffle(list);
    expect([...out].sort((a, b) => a - b)).toEqual(list);
  });

  it('乱数に従って並べ替える', () => {
    // random() = 0 なら毎回先頭と入れ替える
    expect(shuffle([1, 2, 3], () => 0)).toEqual([2, 3, 1]);
  });
});

describe('moveItem：挿入移動', () => {
  const list = ['a', 'b', 'c', 'd', 'e', 'f'];

  it('後ろへ：移動したあとに指定の位置に来る', () => {
    expect(moveItem(list, 1, 4)).toEqual(['a', 'c', 'd', 'e', 'b', 'f']);
  });

  it('前へ：移動先より後ろを押し出す', () => {
    expect(moveItem(list, 4, 1)).toEqual(['a', 'e', 'b', 'c', 'd', 'f']);
  });

  it('ページの先頭（1ページ3枚で2ページ目の先頭＝3）に落とすと、そのページの先頭に表示される', () => {
    // 1ページ目の a を2ページ目の先頭へ
    const out = moveItem(list, 0, 3);
    expect(out.indexOf('a')).toBe(3);
    // 2ページ目の e を2ページ目の先頭へ（前のページの末尾には入れない）
    expect(moveItem(list, 4, 3).indexOf('e')).toBe(3);
  });

  it('範囲の外は端に収める', () => {
    expect(moveItem(list, 0, 99)).toEqual(['b', 'c', 'd', 'e', 'f', 'a']);
    expect(moveItem(list, 5, -1)).toEqual(['f', 'a', 'b', 'c', 'd', 'e']);
  });
});

describe('capItems', () => {
  it('先頭から入る分だけを取り込み、取り込めなかった枚数を返す', () => {
    expect(capItems([1, 2, 3, 4], 3)).toEqual({ items: [1, 2, 3], skipped: 1 });
    expect(capItems([1, 2], 3)).toEqual({ items: [1, 2], skipped: 0 });
  });
});

describe('mergeReload：再読み込み', () => {
  // 今の並び：c, a, b（手動で並べ替えたとする）
  const current = [item('c', 'c', 3, 2), item('a', 'a', 1, 0), item('b', 'b', 2, 1)];
  // 新しい選択：b を外し、d と e を足した。選択順も変わった
  const incoming = [item('e', 'e', 5, 0), item('a', 'a', 1, 1), item('c', 'c', 3, 2), item('d', 'd', 4, 3)];

  it('手動順：今の並びを保ち、新しい画像を末尾に足す', () => {
    const r = mergeReload(current, incoming, new Set(), 'manual', 'asc');
    expect(ids(r.items)).toEqual(['c', 'a', 'e', 'd']);
    expect([r.kept, r.added, r.removed]).toEqual([2, 2, 1]);
  });

  it('ランダム：今の並びはそのままにして、新しい画像だけをランダムな位置に入れる', () => {
    // e は位置 0、d は位置 3 に入る
    const r = mergeReload(current, incoming, new Set(), 'random', 'asc', seq(0, 0.99));
    expect(ids(r.items)).toEqual(['e', 'c', 'a', 'd']);
    // 元からある画像の順番は変わらない
    expect(ids(r.items).filter((x) => x === 'c' || x === 'a')).toEqual(['c', 'a']);
  });

  it('そのほか：今の並び順に従う（選択順は新しい選択順）', () => {
    const r = mergeReload(current, incoming, new Set(), 'selection', 'asc');
    expect(ids(r.items)).toEqual(['e', 'a', 'c', 'd']);
    const byName = mergeReload(current, incoming, new Set(), 'name', 'desc');
    expect(ids(byName.items)).toEqual(['e', 'd', 'c', 'a']);
  });

  it('除外した画像は、選ばれていても再追加しない', () => {
    const r = mergeReload(current, incoming, new Set(['d']), 'manual', 'asc');
    expect(ids(r.items)).toEqual(['c', 'a', 'e']);
  });

  it('今もある画像は、新しい中身に置き換える', () => {
    const r = mergeReload(current, incoming, new Set(), 'manual', 'asc');
    expect(r.items.find((x) => x.id === 'a')?.selectionIndex).toBe(1);
  });
});
