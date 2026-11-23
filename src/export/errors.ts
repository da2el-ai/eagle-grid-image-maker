// 書き出しのエラーを、画面に出す文言のキーに直す（01 の 8.3）
// sharp のメッセージは Windows で文字化けするので、そのままは出さない。Node の fs のエラーの種類（code）で決める

export type ExportErrorKind = 'permission' | 'noSpace' | 'notFound' | 'readOnly' | 'tooLarge' | 'unknown';

export function classifyError(e: unknown): ExportErrorKind {
  const code = (e as { code?: string } | null)?.code;
  switch (code) {
    case 'EACCES':
    case 'EPERM':
      return 'permission';
    case 'ENOSPC':
    case 'EDQUOT':
      return 'noSpace';
    case 'ENOENT':
    case 'ENOTDIR':
      return 'notFound';
    case 'EROFS':
      return 'readOnly';
    case 'EFBIG':
      return 'tooLarge';
    default:
      return 'unknown';
  }
}

// 書き出しをやめたことを表すエラー
export class ExportCanceled extends Error {
  constructor() {
    super('canceled');
    this.name = 'ExportCanceled';
  }
}
