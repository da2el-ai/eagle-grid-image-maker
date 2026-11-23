import { describe, expect, it } from 'vitest';
import { computeLayout } from '../core/layout';
import { defaultSettings, type Settings } from '../core/settings';
import { fakeMeasure } from '../core/test-measure';
import { cellAt, dropTarget } from './hit';
import { fitViewport, panBy, scaleLimits, toPage, zoomAt } from './viewport';

describe('viewport', () => {
  it('Fit：ページ全体が余白の内側に収まり、中央に来る', () => {
    const v = fitViewport({ w: 1000, h: 500 }, { w: 600, h: 600 }, 50);
    expect(v.scale).toBeCloseTo(0.5);
    expect([v.x, v.y]).toEqual([50, 175]);
  });

  it('zoomAt：ポインターの下のページの位置は動かない', () => {
    const v = { scale: 0.5, x: 50, y: 20 };
    const before = toPage(v, 300, 200);
    const z = zoomAt(v, 2, 300, 200, { min: 0.1, max: 10 });
    expect(z.scale).toBe(1);
    const after = toPage(z, 300, 200);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });

  it('zoomAt：倍率は範囲に収める', () => {
    const z = zoomAt({ scale: 1, x: 0, y: 0 }, 100, 0, 0, scaleLimits(1));
    expect(z.scale).toBe(16);
    expect(zoomAt({ scale: 1, x: 0, y: 0 }, 0.01, 0, 0, scaleLimits(1)).scale).toBe(0.5);
  });

  it('panBy', () => {
    expect(panBy({ scale: 1, x: 1, y: 2 }, 10, -5)).toEqual({ scale: 1, x: 11, y: -3 });
  });
});

// 4列・2行、セル 100×100、間隔 10、余白 0
const layoutOf = (total: number, over: Partial<Settings> = {}) =>
  computeLayout({ ...defaultSettings(), cellW: 100, cellH: 100, gap: 10, padding: 0, rows: 2, ...over }, total, fakeMeasure);

describe('cellAt', () => {
  it('画像のあるセルだけを返す', () => {
    const p = layoutOf(6).page(0);
    expect(cellAt(p.cells, 150, 50)?.index).toBe(1);
    expect(cellAt(p.cells, 105, 50)).toBeNull(); // 隙間
    expect(cellAt(p.cells, 250, 150)).toBeNull(); // 画像のない位置
  });
});

describe('dropTarget', () => {
  it('後ろへ移す：落としたセルの位置に入り、目印は右', () => {
    expect(dropTarget(layoutOf(8), 0, 0, 250, 50)).toEqual({ to: 2, slot: 2, side: 'right' });
  });

  it('前へ移す：目印は左', () => {
    expect(dropTarget(layoutOf(8), 0, 5, 50, 50)).toEqual({ to: 0, slot: 0, side: 'left' });
  });

  it('セルの間の隙間は、近いほうのセルにする', () => {
    expect(dropTarget(layoutOf(8), 0, 0, 107, 50)?.slot).toBe(1);
    expect(dropTarget(layoutOf(8), 0, 0, 103, 50)?.slot).toBe(0);
  });

  it('2ページ目の先頭に落とすと、そのページの先頭（前のページの末尾ではない）', () => {
    // 1ページ 8枚。1ページ目の 0 番を2ページ目の先頭へ
    expect(dropTarget(layoutOf(12), 1, 0, 50, 50)).toEqual({ to: 8, slot: 0, side: 'right' });
  });

  it('最後のページの空きに落とすと、末尾', () => {
    // 12枚：2ページ目は 4 枚。空きの位置（2行目）に落とす
    expect(dropTarget(layoutOf(12), 1, 0, 50, 150)).toEqual({ to: 11, slot: 3, side: 'right' });
  });

  it('グリッドの外は null', () => {
    expect(dropTarget(layoutOf(8), 0, 0, 500, 50)).toBeNull();
    expect(dropTarget(layoutOf(8), 0, 0, 50, -20)).toBeNull();
  });

  it('左上→下へ：列ごとの位置になる', () => {
    const L = layoutOf(8, { flow: 'down', cols: 4, rows: 2 });
    expect(dropTarget(L, 0, 0, 150, 150)?.slot).toBe(3);
  });
});
