// Canvas で文字の幅を測る（レイアウト計算に渡す。プレビューも書き出しも同じ測り方にする）
import type { Measure } from '../core/text';

let ctx: CanvasRenderingContext2D | null = null;

export const canvasMeasure: Measure = (text, font) => {
  ctx ??= document.createElement('canvas').getContext('2d');
  if (!ctx) return 0;
  if (ctx.font !== font) ctx.font = font;
  return ctx.measureText(text).width;
};
