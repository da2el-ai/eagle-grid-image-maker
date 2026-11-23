// 書き出しの文字：プレビューと同じ描き方で Canvas に描き、PNG にして sharp で合成する
// （sharp の Pango とは文字の幅が合わないため。TV-12）
import type { TextBox } from '../core/layout';
import { drawTextBox } from '../preview/draw';

export interface CompositeInput {
  input: Buffer;
  left: number;
  top: number;
}

export async function textBoxPng(t: TextBox, color: string): Promise<CompositeInput> {
  // 文字のはみ出し（アクセント・下に伸びる文字など）を切らないための余白
  const pad = Math.ceil(t.size * 0.5);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(t.w) + pad * 2);
  canvas.height = Math.max(1, Math.ceil(t.h) + pad * 2);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas を使えません');
  ctx.translate(pad - t.x, pad - t.y);
  drawTextBox(ctx, t, color);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('文字を画像にできませんでした');
  const input = Buffer.from(await blob.arrayBuffer());
  return { input, left: Math.round(t.x) - pad, top: Math.round(t.y) - pad };
}
