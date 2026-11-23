// 文言ファイルの選び方と、文言の組み立て（Node・DOM に依存しない）

export const FALLBACK_LOCALE = 'en';

export type Messages = Record<string, string>;

// 比べるために、大文字・小文字と - / _ の違いをなくす
function normalize(tag: string): string {
  return tag.trim().replace(/_/g, '-').toLowerCase();
}

// Eagle の言語（例：ja_JP・zh-TW・en）に合う文言ファイルの名前を選ぶ
// 1. 完全に一致するもの（zh-TW → zh-TW）
// 2. 言語の部分が一致するもの（ja_JP → ja）
// 3. なければ英語
export function resolveLocale(eagleLocale: string | undefined | null, available: string[]): string {
  if (eagleLocale) {
    const want = normalize(eagleLocale);
    const exact = available.find((a) => normalize(a) === want);
    if (exact) return exact;
    const base = want.split('-')[0];
    const byBase = available.find((a) => normalize(a) === base);
    if (byBase) return byBase;
  }
  return FALLBACK_LOCALE;
}

// {name} の形の差し込みを埋める
export function format(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m));
}

// 選んだ言語 → 英語 → キーそのもの、の順に文言を探す
export function lookup(key: string, messages: Messages, fallback: Messages): string {
  return messages[key] ?? fallback[key] ?? key;
}
