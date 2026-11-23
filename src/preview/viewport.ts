// プレビューの表示倍率と位置（パン・ズーム）
// 画面の座標 = ページの座標 × scale + (x, y)

export interface Viewport {
  scale: number;
  x: number; // ページの左上が来る画面の位置
  y: number;
}

export interface Size {
  w: number;
  h: number;
}

export const FIT_MARGIN = 28; // Fit のときの周りの余白（画面の px）
export const ZOOM_STEP = 1.25;

// ページ全体が表示領域に収まる倍率と位置
export function fitViewport(page: Size, view: Size, margin = FIT_MARGIN): Viewport {
  const scale = Math.max(1e-4, Math.min((view.w - margin * 2) / page.w, (view.h - margin * 2) / page.h));
  return { scale, x: (view.w - page.w * scale) / 2, y: (view.h - page.h * scale) / 2 };
}

// 倍率の範囲：Fit の半分から、Fit の 16 倍か等倍の 8 倍の大きいほうまで
export function scaleLimits(fitScale: number): { min: number; max: number } {
  return { min: fitScale * 0.5, max: Math.max(fitScale * 16, 8) };
}

// 画面の点 (px, py) を中心にして倍率を factor 倍にする（その点の下のページの位置は動かない）
export function zoomAt(v: Viewport, factor: number, px: number, py: number, limits: { min: number; max: number }): Viewport {
  const scale = Math.min(limits.max, Math.max(limits.min, v.scale * factor));
  const k = scale / v.scale;
  return { scale, x: px - (px - v.x) * k, y: py - (py - v.y) * k };
}

export function panBy(v: Viewport, dx: number, dy: number): Viewport {
  return { ...v, x: v.x + dx, y: v.y + dy };
}

// 画面の座標 → ページの座標
export function toPage(v: Viewport, sx: number, sy: number): { x: number; y: number } {
  return { x: (sx - v.x) / v.scale, y: (sy - v.y) / v.scale };
}
