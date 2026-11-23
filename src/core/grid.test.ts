import { describe, expect, it } from 'vitest';
import { capacityOf, headerCount, headerIndex, locate, pageRange, resolveShape, slotRowCol } from './grid';

describe('resolveShape：空欄の側は枚数から決める（01 の 4 章）', () => {
  it('右へ・4列・行は空欄・10枚 → 3行の1ページ', () => {
    const s = resolveShape({ flow: 'right', cols: 4, rows: null }, 10);
    expect([s.cols, s.rows, s.pageCount]).toEqual([4, 3, 1]);
  });

  it('右へ・4列・行は空欄・100枚 → どのページも16行の2ページ', () => {
    const s = resolveShape({ flow: 'right', cols: 4, rows: null }, 100);
    expect([s.cols, s.rows, s.pageCount]).toEqual([4, 16, 2]);
    // 2ページ目は36枚
    expect(pageRange(s, 1)).toEqual({ start: 64, end: 100 });
  });

  it('下へ・3行・列は空欄・10枚 → 4列', () => {
    const s = resolveShape({ flow: 'down', cols: null, rows: 3 }, 10);
    expect([s.cols, s.rows, s.pageCount]).toEqual([4, 3, 1]);
  });

  it('両方とも指定したら、その大きさのまま', () => {
    const s = resolveShape({ flow: 'right', cols: 4, rows: 2 }, 3);
    expect([s.cols, s.rows, s.perPage, s.pageCount]).toEqual([4, 2, 8, 1]);
  });

  it('0枚でも1ページで、空欄の側は1', () => {
    const s = resolveShape({ flow: 'right', cols: 4, rows: null }, 0);
    expect([s.cols, s.rows, s.pageCount]).toEqual([4, 1, 1]);
  });

  it('列数・行数は1〜16に収める', () => {
    const s = resolveShape({ flow: 'right', cols: 40, rows: 0 }, 1);
    expect([s.cols, s.rows]).toEqual([16, 1]);
  });

  it('8,192枚は16×16の32ページ', () => {
    const s = resolveShape({ flow: 'right', cols: 16, rows: null }, 8192);
    expect([s.rows, s.pageCount, s.overflow]).toEqual([16, 32, 0]);
  });

  it('列数・行数を減らして入りきらないときは、はみ出した枚数を数える。ページは32まで', () => {
    const s = resolveShape({ flow: 'right', cols: 2, rows: 2 }, 200);
    expect(s.pageCount).toBe(32);
    expect(s.overflow).toBe(200 - 128);
    expect(pageRange(s, 31)).toEqual({ start: 124, end: 128 });
  });
});

describe('capacityOf：空欄の側は16として計算する', () => {
  it('4列・行は空欄 → 4×16×32', () => {
    expect(capacityOf({ flow: 'right', cols: 4, rows: null })).toBe(2048);
  });
  it('4列・2行 → 4×2×32', () => {
    expect(capacityOf({ flow: 'right', cols: 4, rows: 2 })).toBe(256);
  });
  it('16×16 → 8,192', () => {
    expect(capacityOf({ flow: 'down', cols: null, rows: 16 })).toBe(8192);
  });
});

describe('slotRowCol', () => {
  it('右へ：行ごとに埋める', () => {
    const shape = { flow: 'right' as const, cols: 3, rows: 2 };
    expect([0, 1, 2, 3].map((i) => slotRowCol(i, shape))).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 1, col: 0 },
    ]);
  });

  it('下へ：列ごとに上から行数の分だけ埋める', () => {
    const shape = { flow: 'down' as const, cols: 3, rows: 2 };
    expect([0, 1, 2, 3].map((i) => slotRowCol(i, shape))).toEqual([
      { row: 0, col: 0 },
      { row: 1, col: 0 },
      { row: 0, col: 1 },
      { row: 1, col: 1 },
    ]);
  });
});

describe('locate', () => {
  it('全体の添字からページと位置を出す', () => {
    const s = resolveShape({ flow: 'right', cols: 4, rows: 4 }, 40);
    expect(locate(17, s)).toEqual({ page: 1, slot: 1 });
  });
});

describe('ヘッダー：並びが進む側はページをまたいで続く', () => {
  it('右へ：1ページ4行なら、2ページ目の1行目は5番目の行ヘッダー。列ヘッダーは同じ', () => {
    const shape = { flow: 'right' as const, cols: 3, rows: 4, pageCount: 2 };
    expect(headerIndex('row', 0, 1, shape)).toBe(4);
    expect(headerIndex('col', 0, 1, shape)).toBe(0);
    expect(headerCount('row', shape)).toBe(8);
    expect(headerCount('col', shape)).toBe(3);
  });

  it('下へ：1ページ4列なら、2ページ目の1列目は5番目の列ヘッダー。行ヘッダーは同じ', () => {
    const shape = { flow: 'down' as const, cols: 4, rows: 3, pageCount: 2 };
    expect(headerIndex('col', 0, 1, shape)).toBe(4);
    expect(headerIndex('row', 2, 1, shape)).toBe(2);
    expect(headerCount('col', shape)).toBe(8);
    expect(headerCount('row', shape)).toBe(3);
  });
});
