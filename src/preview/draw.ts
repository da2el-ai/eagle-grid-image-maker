// Canvas に1ページを描く（プレビュー用。書き出しの文字もこの描き方を使う）
import type { CellBox, PageLayout, TextBox } from '../core/layout';
import type { Placement } from '../core/placement';
import { LINE_HEIGHT } from '../core/text';

// 文字の箱を1つ描く。rotate が 90 なら、箱の中心で時計回りに 90° 回す（上から下へ読む）
export function drawTextBox(ctx: CanvasRenderingContext2D, t: TextBox, color: string): void {
  const lineH = t.size * LINE_HEIGHT;
  ctx.save();
  ctx.font = t.font;
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  let bx = t.x;
  let by = t.y;
  let bw = t.w;
  let bh = t.h;
  if (t.rotate) {
    ctx.translate(t.x + t.w / 2, t.y + t.h / 2);
    ctx.rotate((t.rotate * Math.PI) / 180);
    bw = t.h;
    bh = t.w;
    bx = -bw / 2;
    by = -bh / 2;
  }
  const blockH = t.lines.length * lineH;
  let startY = by;
  if (t.alignV === 'middle') startY = by + (bh - blockH) / 2;
  if (t.alignV === 'bottom') startY = by + bh - blockH;
  ctx.textAlign = t.alignH;
  const tx = t.alignH === 'right' ? bx + bw : t.alignH === 'left' ? bx : bx + bw / 2;
  t.lines.forEach((line, k) => ctx.fillText(line, tx, startY + lineH * (k + 0.5)));
  ctx.restore();
}

export type CellPainter = (ctx: CanvasRenderingContext2D, cell: CellBox) => void;

// 背景・セル・文字の順に描く。セルの中身は painter に任せる
export function drawPage(ctx: CanvasRenderingContext2D, page: PageLayout, bg: string, textColor: string, painter: CellPainter): void {
  ctx.save();
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, page.width, page.height);
  for (const cell of page.cells) painter(ctx, cell);
  for (const t of page.texts) drawTextBox(ctx, t, textColor);
  ctx.restore();
}

// セルに画像を描く。置き方は placement() の結果に従う（書き出しと同じ計算）
// 回転するときは、描く範囲の中心で回す。セルの外にはみ出す部分は切り抜く
export function drawImageCell(ctx: CanvasRenderingContext2D, cell: CellBox, place: Placement, img: CanvasImageSource): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(cell.x, cell.y, cell.w, cell.h);
  ctx.clip();
  ctx.translate(cell.x + place.dx + place.dw / 2, cell.y + place.dy + place.dh / 2);
  if (place.rot) ctx.rotate((place.rot * Math.PI) / 180);
  // 回す前の大きさ
  const w0 = place.rot ? place.dh : place.dw;
  const h0 = place.rot ? place.dw : place.dh;
  ctx.drawImage(img, -w0 / 2, -h0 / 2, w0, h0);
  ctx.restore();
}

// 読み込み中・読めなかったセル
export function drawCellState(ctx: CanvasRenderingContext2D, cell: CellBox, state: 'loading' | 'broken', label: string): void {
  ctx.save();
  ctx.fillStyle = state === 'broken' ? '#fbe9e5' : '#e9e9ec';
  ctx.fillRect(cell.x, cell.y, cell.w, cell.h);
  if (state === 'broken') {
    ctx.fillStyle = '#a3361f';
    ctx.font = `${Math.max(10, Math.round(Math.min(cell.w, cell.h) / 14))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cell.x + cell.w / 2, cell.y + cell.h / 2, cell.w * 0.9);
  }
  ctx.restore();
}
