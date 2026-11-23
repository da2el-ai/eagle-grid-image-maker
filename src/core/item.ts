// グリッドに並べる画像1枚分の情報（01 の 2.1）
import type { Orderable } from './order';

export interface GridItem extends Orderable {
  id: string; // Eagle のアイテム ID（同じ画像かどうかの判断に使う）
  name: string; // 拡張子を除いたファイル名
  ext: string; // 小文字
  importedAt: number; // Eagle への登録時刻
  selectionIndex: number; // Eagle の選択順
  width: number; // 見た目の向きの幅・高さ（Eagle の値。EXIF の向きを反映済み。TV-01）
  height: number;
  filePath: string; // 元画像
  thumbnailPath: string; // サムネイル（サムネイルがない画像は元画像を指す。TV-02）
  thumbnailURL: string;
}

// 読み込めなかった画像
export type LoadFailureReason = 'unsupported' | 'missing' | 'broken';

export interface LoadFailure {
  id: string;
  name: string; // 拡張子つきのファイル名
  reason: LoadFailureReason;
}

// 入力できる形式（01 の 1.1）
export const SUPPORTED_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);

export function isSupportedExt(ext: string): boolean {
  return SUPPORTED_EXTS.has(ext.toLowerCase());
}

export function fileNameOf(it: Pick<GridItem, 'name' | 'ext'>): string {
  return it.ext ? `${it.name}.${it.ext}` : it.name;
}
