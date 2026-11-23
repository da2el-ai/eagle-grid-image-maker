// グリッドの形：列数・行数・ページ数・収容枚数（01 の 4 章）
import type { Flow, Settings } from './settings';

export const MAX_COLS = 16;
export const MAX_ROWS = 16;
export const MAX_PAGES = 32;
// 必須の側が空欄のときに使う値（設定画面では空欄にできないが、念のため）
const FALLBACK_REQUIRED = 4;

export interface GridShape {
  flow: Flow;
  cols: number; // 1ページの列数（空欄なら枚数から決めた値）
  rows: number; // 1ページの行数
  perPage: number; // cols × rows
  pageCount: number; // 1〜32（画像が 0 枚でも 1）
  total: number; // 画像の枚数
  capacity: number; // 入力できる枚数（空欄の側を 16 として計算。最大 8,192）
  overflow: number; // 32 ページに入りきらない枚数（列数・行数を減らしたとき）
}

const clamp16 = (v: number) => Math.min(16, Math.max(1, Math.floor(v)));

// 列数・行数の設定値（null＝空欄）を、必須の側を補って返す
function fixedSides(s: Pick<Settings, 'cols' | 'rows' | 'flow'>): { cols: number | null; rows: number | null } {
  if (s.flow === 'right') {
    return { cols: clamp16(s.cols ?? FALLBACK_REQUIRED), rows: s.rows == null ? null : clamp16(s.rows) };
  }
  return { cols: s.cols == null ? null : clamp16(s.cols), rows: clamp16(s.rows ?? FALLBACK_REQUIRED) };
}

// 入力できる枚数。空欄の側は 16 として計算する
export function capacityOf(s: Pick<Settings, 'cols' | 'rows' | 'flow'>): number {
  const f = fixedSides(s);
  return (f.cols ?? MAX_COLS) * (f.rows ?? MAX_ROWS) * MAX_PAGES;
}

export function resolveShape(s: Pick<Settings, 'cols' | 'rows' | 'flow'>, total: number): GridShape {
  const f = fixedSides(s);
  const n = Math.max(0, Math.floor(total));
  // 空欄の側は、全体の枚数から決めて全ページで同じ値にする：min(16, ceil(枚数 ÷ 必須の側))
  let cols: number;
  let rows: number;
  if (f.cols != null && f.rows != null) {
    cols = f.cols;
    rows = f.rows;
  } else if (f.cols != null) {
    cols = f.cols;
    rows = clamp16(Math.ceil(Math.max(n, 1) / cols));
  } else {
    rows = f.rows as number;
    cols = clamp16(Math.ceil(Math.max(n, 1) / rows));
  }
  const perPage = cols * rows;
  const pageCount = Math.max(1, Math.min(MAX_PAGES, Math.ceil(n / perPage)));
  const overflow = Math.max(0, n - perPage * MAX_PAGES);
  return { flow: s.flow, cols, rows, perPage, pageCount, total: n, capacity: capacityOf(s), overflow };
}

// ページの中の位置（0 始まり）から、行と列を出す
export function slotRowCol(slot: number, shape: Pick<GridShape, 'flow' | 'cols' | 'rows'>): { row: number; col: number } {
  if (shape.flow === 'down') return { row: slot % shape.rows, col: Math.floor(slot / shape.rows) };
  return { row: Math.floor(slot / shape.cols), col: slot % shape.cols };
}

// ページに載る画像の範囲（全体の並びの添字）。32 ページを超えた分は載せない
export function pageRange(shape: GridShape, pageIndex: number): { start: number; end: number } {
  const start = pageIndex * shape.perPage;
  const limit = Math.min(shape.total, shape.perPage * MAX_PAGES);
  return { start: Math.min(start, limit), end: Math.min(limit, start + shape.perPage) };
}

// 全体の並びの添字から、ページとページの中の位置を出す
export function locate(index: number, shape: GridShape): { page: number; slot: number } {
  return { page: Math.floor(index / shape.perPage), slot: index % shape.perPage };
}

// ヘッダーの添字。並びが進む側はページをまたいで続きの番号にする（01 の 6.2）
// - 左上→右へ：行ヘッダーが続く。列ヘッダーは全ページ同じ
// - 左上→下へ：列ヘッダーが続く。行ヘッダーは全ページ同じ
export function headerIndex(kind: 'col' | 'row', i: number, pageIndex: number, shape: Pick<GridShape, 'flow' | 'cols' | 'rows'>): number {
  if (kind === 'row' && shape.flow === 'right') return pageIndex * shape.rows + i;
  if (kind === 'col' && shape.flow === 'down') return pageIndex * shape.cols + i;
  return i;
}

// 全ページで使うヘッダーの数
export function headerCount(kind: 'col' | 'row', shape: Pick<GridShape, 'flow' | 'cols' | 'rows' | 'pageCount'>): number {
  if (kind === 'row') return shape.flow === 'right' ? shape.rows * shape.pageCount : shape.rows;
  return shape.flow === 'down' ? shape.cols * shape.pageCount : shape.cols;
}
