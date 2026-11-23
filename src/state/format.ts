// 画面に出す数と、判定のメッセージ
import type { Issue } from '../core/limits';
import { currentLocale, t } from '../i18n';

const FORMAT_NAME: Record<string, string> = { jpeg: 'JPEG', png: 'PNG', webp: 'WebP' };

// 3桁ごとに区切る
export function fmtNumber(n: number): string {
  return new Intl.NumberFormat(currentLocale()).format(n);
}

// 判定のメッセージ。where は表示する場所（設定欄・プレビューの上の帯）
export function issueMessage(issue: Issue, where: 'panel' | 'banner'): string {
  const p = issue.params ?? {};
  const num = (k: string) => fmtNumber(Number(p[k] ?? 0));
  switch (issue.code) {
    case 'formatLimit': {
      const params = { format: FORMAT_NAME[String(p.format)] ?? String(p.format), max: num('max'), width: num('width'), height: num('height') };
      return where === 'panel' ? t('issue.formatLimit', params) : t('issue.formatLimitBanner', params);
    }
    case 'heavy':
      return t('issue.heavy');
    case 'overflow':
      return t('issue.overflow', { count: num('count') });
    default:
      return '';
  }
}
