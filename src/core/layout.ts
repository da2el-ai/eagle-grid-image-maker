// レイアウト計算（プレビューと書き出しで共有する。01 の 4 章・6 章）
// - 座標はすべて出力画像のピクセル単位
// - どのページも同じ大きさ（列数×行数）。ヘッダーの寸法も全ページで共通にする
import { headerCount, headerIndex, pageRange, resolveShape, slotRowCol, type GridShape } from './grid';
import type { Settings } from './settings';
import { LINE_HEIGHT, fontString, splitLines, wrapText, type Measure } from './text';

// 行ヘッダーの最大幅（em）
export const ROW_HEADER_MAX_EM = 50;

export type TextKind = 'title' | 'xAxis' | 'yAxis' | 'colHeader' | 'rowHeader';

export interface TextBox {
  kind: TextKind;
  index?: number; // ヘッダーの添字（全体の通し番号）
  lines: string[];
  font: string; // ctx.font に渡す文字列
  size: number;
  x: number;
  y: number;
  w: number;
  h: number;
  alignH: 'left' | 'center' | 'right';
  alignV: 'top' | 'middle' | 'bottom';
  // 90＝時計回りに 90° 回す（縦軸タイトル。上から下へ読む）。箱の中心で回す
  rotate: 0 | 90;
}

export interface CellBox {
  index: number; // 全体の並びの添字
  slot: number; // ページの中の位置
  row: number;
  col: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PageLayout {
  pageIndex: number;
  width: number;
  height: number;
  cells: CellBox[]; // 画像のある位置だけ。足りない位置は背景色のまま
  texts: TextBox[];
}

export interface GridLayout {
  shape: GridShape;
  width: number;
  height: number;
  cellW: number;
  cellH: number;
  gap: number;
  gridX: number;
  gridY: number;
  gridW: number;
  gridH: number;
  page(pageIndex: number): PageLayout;
}

type LayoutSettings = Pick<
  Settings,
  | 'cellW' | 'cellH' | 'cols' | 'rows' | 'flow' | 'gap' | 'padding'
  | 'title' | 'titleFont' | 'titleSize'
  | 'xy' | 'xAxis' | 'yAxis' | 'colHeaders' | 'rowHeaders' | 'headerFont' | 'headerSize'
>;

export function computeLayout(s: LayoutSettings, total: number, measure: Measure): GridLayout {
  const shape = resolveShape(s, total);
  const { cols, rows } = shape;
  const gap = s.gap;

  // --- ヘッダーの寸法（全ページで共通）
  const hSize = s.headerSize;
  const hFont = fontString(hSize, s.headerFont);
  const hLine = hSize * LINE_HEIGHT;
  const colTexts = splitLines(s.colHeaders);
  const rowTexts = splitLines(s.rowHeaders);
  const colNeed = headerCount('col', shape);
  const rowNeed = headerCount('row', shape);

  // 行ヘッダーの幅：min(全行で最も広いテキスト幅, 50em)
  // 下限は設けない（2026-11-23 に clamp(セル幅, …) から変更。短い見出しで余白が大きくなるため）
  // 最大は 50em（2026-11-23 に 100em から変更）
  let rowHeaderW = 0;
  const rowLines: string[][] = [];
  if (s.xy) {
    let maxW = 0;
    for (let i = 0; i < rowNeed; i++) maxW = Math.max(maxW, measure(rowTexts[i] ?? '', hFont));
    rowHeaderW = Math.ceil(Math.min(maxW, ROW_HEADER_MAX_EM * hSize));
    for (let i = 0; i < rowNeed; i++) rowLines.push(wrapText(rowTexts[i] ?? '', rowHeaderW, hFont, measure));
  }

  // 列ヘッダーの高さ：max(1em, 全列で最も高い折り返したテキストの高さ)
  let colHeaderH = 0;
  const colLines: string[][] = [];
  if (s.xy) {
    let maxLines = 0;
    for (let i = 0; i < colNeed; i++) {
      const t = colTexts[i] ?? '';
      const lines = wrapText(t, s.cellW, hFont, measure);
      colLines.push(lines);
      if (t !== '') maxLines = Math.max(maxLines, lines.length);
    }
    colHeaderH = Math.ceil(Math.max(hSize, maxLines * hLine));
  }

  // 軸タイトルは、文字があるときだけ場所を取る。ヘッダーとの間隔は 0.5em
  const hasX = s.xy && s.xAxis.trim() !== '';
  const hasY = s.xy && s.yAxis.trim() !== '';
  const axisBlock = Math.ceil(hLine) + Math.ceil(hSize * 0.5);

  // --- タイトル（1行。高さは文字の高さ、直下の余白は 0.5em）
  const hasTitle = s.title.trim() !== '';
  const titleFont = fontString(s.titleSize, s.titleFont);
  const titleH = hasTitle ? Math.ceil(s.titleSize * LINE_HEIGHT) : 0;
  const titleW = hasTitle ? Math.ceil(measure(s.title, titleFont)) : 0;

  // --- 横方向：余白｜縦軸タイトル｜行ヘッダー｜間隔｜グリッド｜余白
  const gridW = cols * s.cellW + (cols - 1) * gap;
  const contentW = (hasY ? axisBlock : 0) + (s.xy ? rowHeaderW + gap : 0) + gridW;
  // タイトルのほうが広いときは全体を広げ、中身を左右の中央に置く
  const innerW = Math.max(contentW, titleW);
  const offsetX = s.padding + Math.floor((innerW - contentW) / 2);
  const yAxisX = offsetX;
  const rowHeaderX = offsetX + (hasY ? axisBlock : 0);
  const gridX = rowHeaderX + (s.xy ? rowHeaderW + gap : 0);
  const width = s.padding * 2 + innerW;

  // --- 縦方向：余白｜タイトル｜横軸タイトル｜列ヘッダー｜間隔｜グリッド｜余白
  const titleY = s.padding;
  const xAxisY = titleY + (hasTitle ? titleH + Math.ceil(s.titleSize * 0.5) : 0);
  const colHeaderY = xAxisY + (hasX ? axisBlock : 0);
  const gridY = colHeaderY + (s.xy ? colHeaderH + gap : 0);
  const gridH = rows * s.cellH + (rows - 1) * gap;
  const height = gridY + gridH + s.padding;

  const page = (pageIndex: number): PageLayout => {
    const { start, end } = pageRange(shape, pageIndex);
    const cells: CellBox[] = [];
    for (let index = start; index < end; index++) {
      const slot = index - start;
      const { row, col } = slotRowCol(slot, shape);
      cells.push({ index, slot, row, col, x: gridX + col * (s.cellW + gap), y: gridY + row * (s.cellH + gap), w: s.cellW, h: s.cellH });
    }

    const texts: TextBox[] = [];
    if (hasTitle) {
      texts.push({ kind: 'title', lines: [s.title], font: titleFont, size: s.titleSize, x: s.padding, y: titleY, w: innerW, h: titleH, alignH: 'center', alignV: 'middle', rotate: 0 });
    }
    if (hasX) {
      // セルの範囲の左右中央
      texts.push({ kind: 'xAxis', lines: [s.xAxis], font: hFont, size: hSize, x: gridX, y: xAxisY, w: gridW, h: Math.ceil(hLine), alignH: 'center', alignV: 'middle', rotate: 0 });
    }
    if (hasY) {
      // セルの範囲の上下中央。時計回りに 90° 回す
      texts.push({ kind: 'yAxis', lines: [s.yAxis], font: hFont, size: hSize, x: yAxisX, y: gridY, w: Math.ceil(hLine), h: gridH, alignH: 'center', alignV: 'middle', rotate: 90 });
    }
    if (s.xy) {
      for (let c = 0; c < cols; c++) {
        const hi = headerIndex('col', c, pageIndex, shape);
        texts.push({ kind: 'colHeader', index: hi, lines: colLines[hi] ?? [''], font: hFont, size: hSize, x: gridX + c * (s.cellW + gap), y: colHeaderY, w: s.cellW, h: colHeaderH, alignH: 'center', alignV: 'bottom', rotate: 0 });
      }
      for (let r = 0; r < rows; r++) {
        const hi = headerIndex('row', r, pageIndex, shape);
        texts.push({ kind: 'rowHeader', index: hi, lines: rowLines[hi] ?? [''], font: hFont, size: hSize, x: rowHeaderX, y: gridY + r * (s.cellH + gap), w: rowHeaderW, h: s.cellH, alignH: 'right', alignV: 'middle', rotate: 0 });
      }
    }
    return { pageIndex, width, height, cells, texts };
  };

  return { shape, width, height, cellW: s.cellW, cellH: s.cellH, gap, gridX, gridY, gridW, gridH, page };
}
