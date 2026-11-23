// プラグインのフォルダのパスを、ページの URL から求める
// - macOS：eagleplugin://<ID>/Users/…/index.html
// - Windows：eagleplugin://<ID>//D:/…/index.html（ドライブ名の前に / が2つ付く。03 の 11.2）
import { nodePath } from './node';

// URL のパス部分（デコード前）から、フォルダのパスを求める。区切りは / のまま返す
export function pluginDirFromUrlPath(urlPath: string): string {
  let p = decodeURIComponent(urlPath);
  // 最後のファイル名を取る
  p = p.replace(/[^/]*$/, '');
  // Windows：ドライブ名の前の / をすべて取る
  if (/^\/+[A-Za-z]:\//.test(p)) p = p.replace(/^\/+/, '');
  // 最後の / を取る（ルートの / と C:/ は残す）
  if (p.length > 1 && p.endsWith('/') && !/^[A-Za-z]:\/$/.test(p)) p = p.slice(0, -1);
  return p;
}

let cached: string | null = null;

// プラグインのフォルダ（OS の区切り文字に直したもの）
export function pluginDir(): string {
  if (!cached) cached = nodePath().normalize(pluginDirFromUrlPath(new URL(location.href).pathname));
  return cached;
}
