// 文字の扱い：フォント指定・改行での分割・折り返し
// 文字の幅は呼び出し側から measure(text, font) で渡す（プレビューも書き出しも Canvas で測る）

export type Measure = (text: string, font: string) => number;

export const LINE_HEIGHT = 1.2;

// CSS の総称フォント名（引用符で囲まない）
const GENERIC = new Set(['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-serif', 'ui-sans-serif', 'ui-monospace', 'ui-rounded']);

// Canvas の ctx.font に渡す文字列
export function fontString(size: number, family: string): string {
  const f = family.trim() || 'sans-serif';
  const quoted = GENERIC.has(f) || /^["'].*["']$/.test(f) ? f : `"${f.replace(/"/g, '\\"')}"`;
  return `${size}px ${quoted}`;
}

// テキストエリアの中身を1行ずつに分ける
export function splitLines(text: string): string[] {
  return text === '' ? [] : text.split(/\r\n|\r|\n/);
}

// 行頭に来てはいけない記号（簡易的な禁則処理。はみ出しを許して前の行に残す）
const NO_LINE_START = /^[、。，．,.)）」』】〕〉》！？!?ー～…・:：;；]$/u;

// 指定した幅で折り返す
// 英数字の連続は単語として扱い、それ以外（日本語など）は1文字ずつ折り返す
export function wrapText(text: string, maxWidth: number, font: string, measure: Measure): string[] {
  if (!text) return [''];
  const tokens = text.match(/[A-Za-z0-9_\-.,!?'"()]+|\s+|[\s\S]/gu) ?? [];
  const lines: string[] = [];
  let line = '';
  // 1単語だけで幅を超えるときは、文字の途中で分ける。残りを返す
  const breakLong = (s: string): string => {
    let rest = s;
    while (rest.length > 1 && measure(rest, font) > maxWidth) {
      let cut = rest.length - 1;
      while (cut > 1 && measure(rest.slice(0, cut), font) > maxWidth) cut--;
      lines.push(rest.slice(0, cut));
      rest = rest.slice(cut);
    }
    return rest;
  };
  for (const tok of tokens) {
    const next = line + tok;
    if (line && measure(next, font) > maxWidth && !NO_LINE_START.test(tok)) {
      lines.push(line.replace(/\s+$/, ''));
      line = breakLong(tok.replace(/^\s+/, ''));
    } else if (!line) {
      line = breakLong(next);
    } else {
      line = next;
    }
  }
  lines.push(line);
  return lines;
}
