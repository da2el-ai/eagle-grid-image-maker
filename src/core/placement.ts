// セルの中の画像の置き方（01 の 5 章）。プレビューと書き出しで同じ計算を使う
import type { FitMode, Orient, RotDir } from './settings';

export interface PlacementOptions {
  fit: FitMode;
  upscale: boolean;
  orient: Orient;
  rotDir: RotDir;
}

export interface Placement {
  rot: 0 | 90 | -90; // 向き揃えの回転（90＝時計回り）
  rw: number; // 回転したあとの元画像の幅・高さ
  rh: number;
  scale: number;
  dw: number; // セルに描く大きさ（回転したあと）
  dh: number;
  dx: number; // セルの左上からの位置（はみ出すときは負）
  dy: number;
  // セルの中に見える範囲（描いた画像の座標。Cover で切り抜く範囲）
  crop: { left: number; top: number; width: number; height: number };
  destX: number; // 見える範囲を置く位置（セルの左上から）
  destY: number;
}

// EXIF の Orientation を見て、見た目の幅・高さを返す
export function orientedSize(width: number, height: number, orientation?: number): { width: number; height: number } {
  if (orientation && orientation >= 5) return { width: height, height: width };
  return { width, height };
}

// srcW / srcH は「見た目の向き」に直した元画像の幅・高さ
export function placement(srcW: number, srcH: number, cellW: number, cellH: number, o: PlacementOptions): Placement {
  let rot: Placement['rot'] = 0;
  const angle = o.rotDir === 'ccw' ? -90 : 90;
  if (o.orient === 'portrait' && srcW > srcH) rot = angle;
  if (o.orient === 'landscape' && srcH > srcW) rot = angle;

  const rw = rot ? srcH : srcW;
  const rh = rot ? srcW : srcH;
  const rawScale = o.fit === 'contain' ? Math.min(cellW / rw, cellH / rh) : Math.max(cellW / rw, cellH / rh);
  const scale = o.upscale ? rawScale : Math.min(rawScale, 1);

  let dw = Math.max(1, Math.round(rw * scale));
  let dh = Math.max(1, Math.round(rh * scale));
  // Cover で丸めの誤差のためにセルが埋まらないのを防ぐ（拡大しない設定の小さい画像は除く）
  if (o.fit === 'cover' && scale === rawScale) {
    if (rw * scale >= cellW - 0.5) dw = Math.max(dw, cellW);
    if (rh * scale >= cellH - 0.5) dh = Math.max(dh, cellH);
  }
  const dx = Math.round((cellW - dw) / 2);
  const dy = Math.round((cellH - dh) / 2);

  const left = Math.max(0, -dx);
  const top = Math.max(0, -dy);
  const crop = { left, top, width: Math.min(dw, cellW - dx) - left, height: Math.min(dh, cellH - dy) - top };
  return { rot, rw, rh, scale, dw, dh, dx, dy, crop, destX: Math.max(0, dx), destY: Math.max(0, dy) };
}
