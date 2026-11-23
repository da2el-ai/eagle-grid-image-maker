// 並び順（01 の 2 章・3 章）
// 全画像を1つの配列で持ち、各ページはそこから切り出す
import type { SortDir, SortKey } from './settings';

// 並べ替えに使う項目
export interface Orderable {
  id: string; // Eagle のアイテム ID
  name: string;
  ext: string;
  importedAt: number;
  selectionIndex: number; // Eagle の選択順（getSelected() の順番）
}

export type Random = () => number; // 0 以上 1 未満

// ファイル名順：日本語・数字の大きさ・全角英字に対応（TV-15）
const collator = new Intl.Collator('ja', { numeric: true });

function compare<T extends Orderable>(key: SortKey, a: T, b: T): number {
  switch (key) {
    case 'name':
      return collator.compare(a.name, b.name) || collator.compare(a.ext, b.ext);
    case 'imported':
      return a.importedAt - b.importedAt;
    default:
      return a.selectionIndex - b.selectionIndex;
  }
}

// 並べ替えた新しい配列を返す。手動順・ランダムは並べ替えない（今の並びのまま）
// 同じ値どうしは選択順にする
export function sortItems<T extends Orderable>(items: readonly T[], key: SortKey, dir: SortDir): T[] {
  if (key === 'manual' || key === 'random') return [...items];
  const sign = dir === 'desc' ? -1 : 1;
  return [...items].sort((a, b) => sign * compare(key, a, b) || a.selectionIndex - b.selectionIndex);
}

// 全体を1度シャッフルする（ランダムを選んだときだけ呼ぶ）
export function shuffle<T>(items: readonly T[], random: Random = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 挿入移動：from の画像を、移動したあとに to の位置に来るように差し込む
// to は「落とした位置」の添字。ページの先頭の前に落としたときは、そのページの先頭の添字を渡す。
// こうすると、落とした位置に画像が表示され、あふれた画像は後ろへ押し出される（01 の 3 章）
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const a = [...items];
  if (from < 0 || from >= a.length) return a;
  const [it] = a.splice(from, 1);
  const dest = Math.max(0, Math.min(a.length, to));
  a.splice(dest, 0, it);
  return a;
}

// 先頭から入る分だけを取り込む（01 の 2.1）
export function capItems<T>(items: readonly T[], capacity: number): { items: T[]; skipped: number } {
  const n = Math.max(0, capacity);
  return { items: items.slice(0, n), skipped: Math.max(0, items.length - n) };
}

export interface ReloadResult<T> {
  items: T[];
  kept: number;
  added: number;
  removed: number;
}

// 再読み込み（01 の 2.2）
// - current：今の並び
// - incoming：Eagle で今選んでいる画像（選択順。selectionIndex は新しい値）
// - excluded：グリッドから除外した ID（再追加しない）
// 今もある画像は今の並びを保ち、中身（selectionIndex など）は新しいものにする
export function mergeReload<T extends Orderable>(
  current: readonly T[],
  incoming: readonly T[],
  excluded: ReadonlySet<string>,
  key: SortKey,
  dir: SortDir,
  random: Random = Math.random,
): ReloadResult<T> {
  const byId = new Map(incoming.map((it) => [it.id, it]));
  const currentIds = new Set(current.map((it) => it.id));
  const kept = current.filter((it) => byId.has(it.id)).map((it) => byId.get(it.id) as T);
  const added = incoming.filter((it) => !currentIds.has(it.id) && !excluded.has(it.id));
  const removed = current.length - kept.length;

  let items: T[];
  if (key === 'manual') {
    // 手動順：末尾に足す
    items = [...kept, ...added];
  } else if (key === 'random') {
    // ランダム：今の並びはそのままにして、新しい画像だけをランダムな位置に入れる
    items = [...kept];
    for (const it of added) items.splice(Math.floor(random() * (items.length + 1)), 0, it);
  } else {
    // そのほか：今の並び順に従う
    items = sortItems([...kept, ...added], key, dir);
  }
  return { items, kept: kept.length, added: added.length, removed };
}
