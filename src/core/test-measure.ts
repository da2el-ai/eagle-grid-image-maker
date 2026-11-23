// テスト用の文字幅の測り方：英数字は 0.5em、それ以外（日本語など）は 1em
import type { Measure } from './text';

export const fakeMeasure: Measure = (text, font) => {
  const size = parseFloat(font);
  let w = 0;
  for (const ch of text) w += ch.charCodeAt(0) < 0x80 ? 0.5 : 1;
  return w * size;
};
