// 書き出しの前の判定（01 の 8.2）
// - error：書き出すと必ず失敗する、または保存できない状態。保存ボタンを押せなくする
// - warning：目安を超えている。警告だけ出して、保存はできる
import type { OutputFormat } from './settings';

// 形式ごとの幅・高さの上限（px）。null は上限なし
// WebP は検証で確かめた値（03 の 10 章）。JPEG は libjpeg の上限（段階 5 で確かめた。65,501 px で失敗する）
export const FORMAT_MAX_SIDE: Record<OutputFormat, number | null> = {
  jpeg: 65500,
  webp: 16383,
  png: null,
};

// 「重い」警告の目安：1ページを RGBA で持ったときの大きさ（仮の値。段階 5 で測って決める）
export const HEAVY_PAGE_BYTES = 400 * 1024 * 1024;

export type IssueCode = 'empty' | 'overflow' | 'formatLimit' | 'heavy';

export interface Issue {
  level: 'error' | 'warning';
  code: IssueCode;
  params?: Record<string, string | number>;
}

export interface OutputCheckInput {
  width: number; // 1ページの幅・高さ
  height: number;
  format: OutputFormat;
  total: number; // 画像の枚数
  overflow: number; // 32 ページに入りきらない枚数
}

// 1ページを RGBA で持ったときのバイト数
export function pageBytes(width: number, height: number): number {
  return width * height * 4;
}

export function checkOutput(o: OutputCheckInput): Issue[] {
  const issues: Issue[] = [];
  if (o.total === 0) issues.push({ level: 'error', code: 'empty' });
  if (o.overflow > 0) issues.push({ level: 'error', code: 'overflow', params: { count: o.overflow } });
  const max = FORMAT_MAX_SIDE[o.format];
  if (o.total > 0 && max != null && (o.width > max || o.height > max)) {
    issues.push({ level: 'error', code: 'formatLimit', params: { format: o.format, max, width: o.width, height: o.height } });
  } else if (o.total > 0 && pageBytes(o.width, o.height) > HEAVY_PAGE_BYTES) {
    issues.push({ level: 'warning', code: 'heavy', params: { mb: Math.round(pageBytes(o.width, o.height) / 1024 / 1024) } });
  }
  return issues;
}

export function canSave(issues: readonly Issue[]): boolean {
  return !issues.some((i) => i.level === 'error');
}
