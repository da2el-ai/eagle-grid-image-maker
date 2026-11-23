import { describe, expect, it } from 'vitest';
import { computeLayout } from './layout';
import { defaultSettings, type Settings } from './settings';
import { fakeMeasure } from './test-measure';

const base = (over: Partial<Settings> = {}): Settings => ({
  ...defaultSettings(),
  cellW: 100,
  cellH: 80,
  gap: 10,
  padding: 20,
  ...over,
});

describe('computeLayout：テキストなし', () => {
  it('4列・3行（10枚）の大きさとセルの位置', () => {
    const L = computeLayout(base(), 10, fakeMeasure);
    // 幅：20 + 4×100 + 3×10 + 20、高さ：20 + 3×80 + 2×10 + 20
    expect([L.width, L.height]).toEqual([470, 300]);
    const p = L.page(0);
    expect(p.cells).toHaveLength(10);
    expect(p.cells[5]).toMatchObject({ index: 5, row: 1, col: 1, x: 130, y: 110, w: 100, h: 80 });
    expect(p.texts).toEqual([]);
  });

  it('画像が足りなくても、どのページも列数×行数の大きさ', () => {
    // 4列・2行・10枚 → 2ページ。2ページ目は2枚だけ
    const L = computeLayout(base({ rows: 2 }), 10, fakeMeasure);
    expect(L.shape.pageCount).toBe(2);
    expect([L.width, L.height]).toEqual([470, 20 + 2 * 80 + 10 + 20]);
    const p2 = L.page(1);
    expect(p2.cells.map((c) => c.index)).toEqual([8, 9]);
    expect([p2.width, p2.height]).toEqual([L.width, L.height]);
  });

  it('画像が列数より少なくても、設定した列数の幅を保つ', () => {
    const L = computeLayout(base(), 2, fakeMeasure);
    expect(L.gridW).toBe(4 * 100 + 3 * 10);
  });

  it('左上→下へ：列ごとに埋める', () => {
    const L = computeLayout(base({ flow: 'down', cols: null, rows: 2 }), 5, fakeMeasure);
    expect([L.shape.cols, L.shape.rows]).toEqual([3, 2]);
    expect(L.page(0).cells.map((c) => [c.row, c.col])).toEqual([[0, 0], [1, 0], [0, 1], [1, 1], [0, 2]]);
  });
});

describe('computeLayout：タイトル', () => {
  it('高さは文字の高さ（1.2em）、直下の余白は 0.5em。中央揃え', () => {
    const L = computeLayout(base({ title: 'Title', titleSize: 30 }), 4, fakeMeasure);
    // タイトル 36 + 余白 15
    expect(L.gridY).toBe(20 + 36 + 15);
    const t = L.page(0).texts[0];
    expect(t).toMatchObject({ kind: 'title', y: 20, h: 36, alignH: 'center', x: 20, w: L.width - 40 });
  });

  it('タイトルのほうが広いときは全体を広げ、中身を中央に置く', () => {
    // 1列：中身の幅 100。タイトルは 30px × 0.5 × 20文字 = 300
    const L = computeLayout(base({ cols: 1, title: 'a'.repeat(20), titleSize: 30 }), 1, fakeMeasure);
    expect(L.width).toBe(20 + 300 + 20);
    expect(L.gridX).toBe(20 + 100);
  });

  it('空白だけのタイトルは表示しない', () => {
    const L = computeLayout(base({ title: '  ' }), 4, fakeMeasure);
    expect(L.gridY).toBe(20);
  });
});

describe('computeLayout：XY プロット', () => {
  const xy = (over: Partial<Settings> = {}) =>
    base({ xy: true, headerSize: 10, colHeaders: 'A\nB\nC\nD', rowHeaders: 'r1\nr2', ...over });

  it('行ヘッダーの幅は最低でもセル幅。列ヘッダーの高さは 1em 以上', () => {
    const L = computeLayout(xy(), 8, fakeMeasure);
    // 行ヘッダー 100 + 間隔 10
    expect(L.gridX).toBe(20 + 100 + 10);
    // 列ヘッダー：1行 = 12px（1.2em）+ 間隔 10
    expect(L.gridY).toBe(20 + 12 + 10);
  });

  it('行ヘッダーは全行で共通の幅（右寄せ）。長い見出しに合わせる', () => {
    // 'x'×30 = 150px > セル幅 100
    const L = computeLayout(xy({ rowHeaders: `r1\n${'x'.repeat(30)}` }), 8, fakeMeasure);
    const rows = L.page(0).texts.filter((t) => t.kind === 'rowHeader');
    expect(rows.map((t) => t.w)).toEqual([150, 150]);
    expect(rows[0]).toMatchObject({ alignH: 'right', alignV: 'middle', h: 80 });
  });

  it('行ヘッダーの幅は 50em まで。超えたら折り返す', () => {
    // 10px × 50 = 500px。'x'×300 = 1500px なので3行
    const L = computeLayout(xy({ rowHeaders: 'x'.repeat(300) }), 4, fakeMeasure);
    const r = L.page(0).texts.find((t) => t.kind === 'rowHeader');
    expect(r?.w).toBe(500);
    expect(r?.lines).toHaveLength(3);
  });

  it('列ヘッダーは全列で共通の高さ（下揃え）。折り返した行の多い見出しに合わせる', () => {
    // 'aaaa '×8 は幅 100 で折り返して複数行になる
    const L = computeLayout(xy({ colHeaders: `A\n${'aaaa '.repeat(8).trim()}` }), 4, fakeMeasure);
    const cols = L.page(0).texts.filter((t) => t.kind === 'colHeader');
    const lines = cols[1].lines.length;
    expect(lines).toBeGreaterThan(1);
    expect(cols.every((t) => t.h === Math.ceil(lines * 12))).toBe(true);
    expect(cols[0]).toMatchObject({ alignH: 'center', alignV: 'bottom', w: 100 });
  });

  it('軸タイトル：横軸は列ヘッダーの上、縦軸は行ヘッダーの左で時計回りに 90°', () => {
    const L = computeLayout(xy({ xAxis: 'X', yAxis: 'Y' }), 8, fakeMeasure);
    const p = L.page(0);
    const x = p.texts.find((t) => t.kind === 'xAxis');
    const y = p.texts.find((t) => t.kind === 'yAxis');
    const col = p.texts.find((t) => t.kind === 'colHeader');
    const row = p.texts.find((t) => t.kind === 'rowHeader');
    // 軸タイトルの場所：1.2em（12）＋ 0.5em（5）
    expect(x).toMatchObject({ y: 20, h: 12, x: L.gridX, w: L.gridW, alignH: 'center' });
    expect(col?.y).toBe(20 + 17);
    expect(y).toMatchObject({ x: 20, w: 12, y: L.gridY, h: L.gridH, rotate: 90 });
    expect(row?.x).toBe(20 + 17);
  });

  it('軸タイトルが空なら場所を取らない', () => {
    const a = computeLayout(xy(), 8, fakeMeasure);
    const b = computeLayout(xy({ xAxis: ' ', yAxis: '' }), 8, fakeMeasure);
    expect([b.gridX, b.gridY]).toEqual([a.gridX, a.gridY]);
  });

  it('右へ：2ページ目の行ヘッダーは続きの番号、列ヘッダーは同じ', () => {
    const L = computeLayout(xy({ rows: 2, rowHeaders: 'r1\nr2\nr3\nr4' }), 16, fakeMeasure);
    const p2 = L.page(1).texts;
    expect(p2.filter((t) => t.kind === 'rowHeader').map((t) => t.lines[0])).toEqual(['r3', 'r4']);
    expect(p2.filter((t) => t.kind === 'colHeader').map((t) => t.lines[0])).toEqual(['A', 'B', 'C', 'D']);
  });

  it('下へ：2ページ目の列ヘッダーは続きの番号、行ヘッダーは同じ', () => {
    const L = computeLayout(xy({ flow: 'down', cols: 2, rows: 2, colHeaders: 'A\nB\nC\nD' }), 8, fakeMeasure);
    const p2 = L.page(1).texts;
    expect(p2.filter((t) => t.kind === 'colHeader').map((t) => t.lines[0])).toEqual(['C', 'D']);
    expect(p2.filter((t) => t.kind === 'rowHeader').map((t) => t.lines[0])).toEqual(['r1', 'r2']);
  });

  it('見出しが足りない行・列は空にする', () => {
    const L = computeLayout(xy({ colHeaders: 'A' }), 4, fakeMeasure);
    const cols = L.page(0).texts.filter((t) => t.kind === 'colHeader');
    expect(cols.map((t) => t.lines[0])).toEqual(['A', '', '', '']);
  });

  it('XY プロットが OFF なら、ヘッダーも軸タイトルも出さない', () => {
    const L = computeLayout(xy({ xy: false, xAxis: 'X' }), 8, fakeMeasure);
    expect(L.page(0).texts).toEqual([]);
    expect([L.gridX, L.gridY]).toEqual([20, 20]);
  });

  it('ページの大きさは、続く側のヘッダーを全ページ分見て決める', () => {
    // 2ページ目の行ヘッダーだけ長い。1ページ目も同じ幅になる
    const L = computeLayout(xy({ rows: 1, rowHeaders: `r1\n${'x'.repeat(30)}` }), 8, fakeMeasure);
    expect(L.page(0).texts.find((t) => t.kind === 'rowHeader')?.w).toBe(150);
  });
});
