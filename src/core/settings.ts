// 設定の型と初期値（01 の 12 章）

export type Flow = 'right' | 'down'; // 左上→右へ／左上→下へ
export type FitMode = 'cover' | 'contain';
export type Orient = 'none' | 'portrait' | 'landscape'; // 回転しない／縦長に合わせる／横長に合わせる
export type RotDir = 'cw' | 'ccw'; // 時計回り／反時計回り
export type SortKey = 'selection' | 'name' | 'imported' | 'manual' | 'random';
export type SortDir = 'asc' | 'desc';
export type OutputFormat = 'jpeg' | 'png' | 'webp';

export interface Settings {
  // グリッド
  cellW: number;
  cellH: number;
  cols: number | null; // null＝空欄（枚数に合わせて増える）
  rows: number | null;
  flow: Flow;
  // 画像
  fit: FitMode;
  upscale: boolean;
  orient: Orient;
  rotDir: RotDir;
  sortKey: SortKey;
  sortDir: SortDir;
  // テキスト
  title: string;
  titleFont: string;
  titleSize: number;
  xy: boolean;
  xAxis: string;
  yAxis: string;
  colHeaders: string; // 1行1見出し
  rowHeaders: string;
  headerFont: string;
  headerSize: number;
  // 外観
  bg: string;
  textColor: string;
  gap: number;
  padding: number;
  // 書き出し
  format: OutputFormat;
  quality: number; // JPEG と WebP で共通
}

export function defaultSettings(): Settings {
  return {
    cellW: 320,
    cellH: 320,
    cols: 4,
    rows: null,
    flow: 'right',
    fit: 'contain',
    upscale: false,
    orient: 'none',
    rotDir: 'cw',
    sortKey: 'selection',
    sortDir: 'asc',
    title: '',
    titleFont: 'sans-serif',
    titleSize: 32,
    xy: false,
    xAxis: '',
    yAxis: '',
    colHeaders: '',
    rowHeaders: '',
    headerFont: 'sans-serif',
    headerSize: 20,
    bg: '#FFFFFF',
    textColor: '#000000',
    gap: 8,
    padding: 16,
    format: 'jpeg',
    quality: 90,
  };
}
