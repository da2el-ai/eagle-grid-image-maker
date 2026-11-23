// Eagle とのやり取り
// 選択中の画像を受け取り、プラグインで使う形（GridItem）に直す
import { isSupportedExt, type GridItem, type LoadFailure } from '../core/item';
import type { EagleItem } from '../types/eagle';

export interface SelectionResult {
  items: GridItem[]; // 読み込めた画像（選択順）
  failures: LoadFailure[]; // 読み込めなかった画像
}

// ファイルがあるかを確かめる関数（テストで差し替えられるように外から渡す）
export type FileExists = (path: string) => boolean;

// Eagle のアイテムを GridItem に直す。読み込めないものは failures に入れて、続ける（01 の 2.1）
export function toGridItems(raw: readonly EagleItem[], exists: FileExists): SelectionResult {
  const items: GridItem[] = [];
  const failures: LoadFailure[] = [];
  raw.forEach((it, selectionIndex) => {
    const ext = String(it.ext ?? '').toLowerCase();
    const name = String(it.name ?? '');
    const fileName = ext ? `${name}.${ext}` : name;
    if (!isSupportedExt(ext)) {
      failures.push({ id: it.id, name: fileName, reason: 'unsupported' });
      return;
    }
    if (!it.filePath || !exists(it.filePath)) {
      failures.push({ id: it.id, name: fileName, reason: 'missing' });
      return;
    }
    items.push({
      id: it.id,
      name,
      ext,
      importedAt: Number(it.importedAt) || 0,
      selectionIndex,
      width: Number(it.width) || 0,
      height: Number(it.height) || 0,
      filePath: it.filePath,
      // サムネイルがない画像は、サムネイルの参照先が元画像になっている（TV-02）
      thumbnailPath: it.thumbnailPath || it.filePath,
      thumbnailURL: it.thumbnailURL || it.fileURL,
    });
  });
  return { items, failures };
}

// Eagle で今選んでいる画像を取る
export async function fetchSelection(): Promise<SelectionResult> {
  const eagle = globalThis.eagle;
  if (!eagle) return { items: [], failures: [] };
  const raw = await eagle.item.getSelected();
  const { nodeFs } = await import('../platform/node');
  const fs = nodeFs();
  return toGridItems(raw, (p) => fs.existsSync(p));
}
