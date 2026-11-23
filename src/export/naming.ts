// 書き出すファイルの名前（01 の 8.1）
// - 1ページだけなら <名前>.<拡張子>、複数ページなら <名前>_01.<拡張子> の形（2桁の連番）
// - 同じ名前のファイルがあるときの「別の番号にする」は <名前>-2_01.<拡張子> の形
import type { OutputFormat } from '../core/settings';

export const DEFAULT_BASE_NAME = 'grid';

const EXT: Record<OutputFormat, string> = { jpeg: 'jpg', png: 'png', webp: 'webp' };
const KNOWN_EXTS = ['jpg', 'jpeg', 'png', 'webp'];

export function extensionOf(format: OutputFormat): string {
  return EXT[format];
}

// 保存ダイアログで選んだパスを、フォルダと名前に分ける。画像の拡張子が付いていたら外す
// 区切りは / と \ の両方を見る（Windows のパスもあるため）
export function splitChosenPath(filePath: string): { dir: string; base: string } {
  const i = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
  const dir = i >= 0 ? filePath.slice(0, i) : '';
  let base = i >= 0 ? filePath.slice(i + 1) : filePath;
  const m = base.match(/\.([^.]+)$/);
  if (m && KNOWN_EXTS.includes(m[1].toLowerCase())) base = base.slice(0, -m[0].length);
  return { dir, base: base || DEFAULT_BASE_NAME };
}

// 各ページのファイル名（フォルダは含まない）
export function pageFileNames(base: string, ext: string, pages: number): string[] {
  if (pages <= 1) return [`${base}.${ext}`];
  return Array.from({ length: pages }, (_, i) => `${base}_${String(i + 1).padStart(2, '0')}.${ext}`);
}

// 「別の番号にする」：どのページの名前もぶつからない最小の番号（2 から）を探す
export function renumberedBase(base: string, ext: string, pages: number, exists: (name: string) => boolean): string {
  for (let k = 2; k < 10000; k++) {
    const b = `${base}-${k}`;
    if (!pageFileNames(b, ext, pages).some(exists)) return b;
  }
  throw new Error('別の番号を付けられませんでした');
}
