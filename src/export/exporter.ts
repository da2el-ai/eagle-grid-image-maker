// 書き出し（01 の 8 章）
// - 元画像を1枚ずつ sharp で変換して、レイアウトで決めたセルの位置に合成する
// - 置き方は placement()（プレビューと同じ計算）。プレビューの Canvas を拡大して書き出さない
// - 書き込みは一時ファイルに書いてから名前を変える。途中で失敗・中止しても、書き終えたページは残り、書きかけは残らない
import type { CellBox, GridLayout, PageLayout } from '../core/layout';
import type { GridItem } from '../core/item';
import { orientedSize, placement, type Placement } from '../core/placement';
import type { Settings } from '../core/settings';
import { nodeFs, nodePath } from '../platform/node';
import type { Sharp } from '../platform/sharp';
import { ExportCanceled } from './errors';
import { textBoxPng, type CompositeInput } from './text-image';

// 同時に変換するセルの数（メモリのピークを下げるため絞る。01 の 8.2）
const CELL_CONCURRENCY = 4;
// 書き出しの土台は、sharp の既定の画素数の制限（約 2.68 億）を超えることがあるので広げる
const DEFAULT_PIXEL_LIMIT = 268402689;

export interface ExportProgress {
  page: number; // 0 始まり
  pages: number;
  cellsDone: number;
  cells: number;
}

export interface CellFailure {
  item: GridItem;
  page: number;
}

export interface ExportJob {
  sharp: Sharp;
  layout: GridLayout;
  items: readonly GridItem[];
  settings: Readonly<Settings>;
  paths: string[]; // 各ページの保存先（フルパス）
  onProgress: (p: ExportProgress) => void;
  isCanceled: () => boolean;
}

export interface ExportResult {
  written: string[];
  cellFailures: CellFailure[];
  canceled: boolean;
  error: { page: number; cause: unknown } | null;
}

interface RawCell {
  input: Buffer;
  raw: { width: number; height: number; channels: 4 };
  left: number;
  top: number;
}

// 1セル分の画像を作る（RGBA の raw）
async function renderCell(sharp: Sharp, item: GridItem, cell: CellBox, s: Readonly<Settings>): Promise<RawCell> {
  // GIF は先頭のフレームだけ。壊れかけの画像も、読める範囲で使う
  const meta = await sharp(item.filePath, { pages: 1, failOn: 'none', limitInputPixels: false }).metadata();
  const src = orientedSize(meta.width ?? 0, meta.height ?? 0, meta.orientation);
  if (!src.width || !src.height) throw new Error('size');
  const place: Placement = placement(src.width, src.height, cell.w, cell.h, s);
  // 1段目：EXIF の向きに合わせて回し、回す前の大きさに縮小（拡大）する
  const w0 = place.rot ? place.dh : place.dw;
  const h0 = place.rot ? place.dw : place.dh;
  const first = await sharp(item.filePath, { pages: 1, failOn: 'none', limitInputPixels: false })
    .rotate()
    .resize(w0, h0, { fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  // 2段目：向き揃えの回転と、セルからはみ出す部分の切り抜き
  let img = sharp(first.data, { raw: { width: first.info.width, height: first.info.height, channels: 4 } });
  if (place.rot) img = img.rotate(place.rot);
  img = img.extract(place.crop);
  const out = await img.raw().toBuffer({ resolveWithObject: true });
  return {
    input: out.data,
    raw: { width: out.info.width, height: out.info.height, channels: 4 },
    left: cell.x + place.destX,
    top: cell.y + place.destY,
  };
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return { r: 255, g: 255, b: 255 };
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}

// 1ページを合成して、ファイルのバイト列にする
async function renderPage(job: ExportJob, page: PageLayout, onCell: () => void, failures: CellFailure[]): Promise<Buffer> {
  const { sharp, items, settings: s } = job;
  const inputs: (RawCell | CompositeInput)[] = [];
  // セルを CELL_CONCURRENCY 枚ずつ変換する。合成の順番はセルの順に揃える
  const results: (RawCell | null)[] = new Array(page.cells.length).fill(null);
  let next = 0;
  const worker = async () => {
    while (next < page.cells.length) {
      if (job.isCanceled()) throw new ExportCanceled();
      const k = next++;
      const cell = page.cells[k];
      const item = items[cell.index];
      try {
        results[k] = await renderCell(sharp, item, cell, s);
      } catch {
        // 開けない画像は、そのセルを背景色のまま空けて続ける（ユーザーの決定）
        failures.push({ item, page: page.pageIndex });
      }
      onCell();
    }
  };
  await Promise.all(Array.from({ length: Math.min(CELL_CONCURRENCY, page.cells.length) }, worker));
  for (const r of results) if (r) inputs.push(r);
  // 文字
  for (const t of page.texts) inputs.push(await textBoxPng(t, s.textColor));
  if (job.isCanceled()) throw new ExportCanceled();

  const base = sharp({
    create: { width: page.width, height: page.height, channels: 3, background: hexToRgb(s.bg) },
    limitInputPixels: Math.max(DEFAULT_PIXEL_LIMIT, page.width * page.height + 1),
  }).composite(inputs);
  const encoded = s.format === 'jpeg' ? base.jpeg({ quality: s.quality }) : s.format === 'webp' ? base.webp({ quality: s.quality }) : base.png({ compressionLevel: 6 });
  return encoded.toBuffer();
}

// 一時ファイルに書いてから名前を変える。失敗したら一時ファイルを消す
function writeFileSafely(target: string, data: Buffer): void {
  const fs = nodeFs();
  const path = nodePath();
  const tmp = path.join(path.dirname(target), `.${path.basename(target)}.egim-${process.pid}-${Date.now()}.tmp`);
  try {
    fs.writeFileSync(tmp, data);
    fs.renameSync(tmp, target);
  } catch (e) {
    try {
      fs.unlinkSync(tmp);
    } catch {
      // 一時ファイルがなければ何もしない
    }
    throw e;
  }
}

export async function runExport(job: ExportJob): Promise<ExportResult> {
  const pages = job.paths.length;
  const result: ExportResult = { written: [], cellFailures: [], canceled: false, error: null };
  for (let p = 0; p < pages; p++) {
    const page = job.layout.page(p);
    let done = 0;
    job.onProgress({ page: p, pages, cellsDone: 0, cells: page.cells.length });
    try {
      const data = await renderPage(job, page, () => job.onProgress({ page: p, pages, cellsDone: ++done, cells: page.cells.length }), result.cellFailures);
      if (job.isCanceled()) throw new ExportCanceled();
      writeFileSafely(job.paths[p], data);
      result.written.push(job.paths[p]);
    } catch (e) {
      if (e instanceof ExportCanceled) result.canceled = true;
      else result.error = { page: p, cause: e };
      break;
    }
  }
  return result;
}
