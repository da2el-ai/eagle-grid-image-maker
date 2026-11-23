// プレビューの当たり判定：どのセルの上か、挿入移動でどこに落とすか
import { MAX_PAGES } from '../core/grid';
import type { CellBox, GridLayout } from '../core/layout';

// ページの座標 (x, y) にある画像のセル。なければ null
export function cellAt(cells: readonly CellBox[], x: number, y: number): CellBox | null {
  for (const c of cells) if (x >= c.x && x < c.x + c.w && y >= c.y && y < c.y + c.h) return c;
  return null;
}

export interface DropTarget {
  to: number; // 移したあとの添字（落とした位置に画像が表示される）
  slot: number; // 目印を出すページの中の位置
  side: 'left' | 'right'; // 目印をセルのどちら側に出すか
}

// 挿入移動で落とす位置（01 の 3 章）
// - グリッドの範囲（セルの間の隙間も含む）に落としたら、そのセルの位置に入れる
// - そのページの画像がない位置（最後のページの空き）に落としたら、全体の末尾に入れる
// - グリッドの外なら null（やめる）
export function dropTarget(layout: GridLayout, pageIndex: number, from: number, x: number, y: number): DropTarget | null {
  const { cols, rows, perPage, total, flow } = layout.shape;
  if (total === 0) return null;
  const { cellW, cellH, gap, gridX, gridY, gridW, gridH } = layout;
  const half = gap / 2;
  if (x < gridX - half || x >= gridX + gridW + half) return null;
  if (y < gridY - half || y >= gridY + gridH + half) return null;
  const col = Math.min(cols - 1, Math.max(0, Math.floor((x - gridX + half) / (cellW + gap))));
  const row = Math.min(rows - 1, Math.max(0, Math.floor((y - gridY + half) / (cellH + gap))));
  const slot = flow === 'down' ? col * rows + row : row * cols + col;
  const index = pageIndex * perPage + slot;
  const last = Math.min(total, perPage * MAX_PAGES) - 1;
  if (index > last) {
    // 空きに落とした：末尾へ。目印は最後の画像の右（最後の画像がこのページにあるとき）
    const lastSlot = last - pageIndex * perPage;
    return { to: last, slot: lastSlot >= 0 ? lastSlot : slot, side: 'right' };
  }
  return { to: index, slot, side: from < index ? 'right' : 'left' };
}
