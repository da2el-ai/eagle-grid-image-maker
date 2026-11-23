// 画面の状態：選んでいるカテゴリ・表示しているページ・削除モード・ダイアログ
import { reactive } from 'vue';

export type Tab = 'grid' | 'image' | 'text' | 'look' | 'export';
export const TABS: Tab[] = ['grid', 'image', 'text', 'look', 'export'];

export interface DialogButton {
  id: string;
  label: string;
  kind?: 'primary' | 'danger';
}

export interface DialogRequest {
  title: string;
  body?: string;
  danger?: boolean;
  list?: { name: string; reason: string }[];
  buttons: DialogButton[];
  cancelId: string; // Esc で閉じたときに返す id
}

interface OpenDialog extends DialogRequest {
  resolve: (id: string) => void;
}

export interface UiState {
  tab: Tab;
  page: number; // 0 始まり
  trash: boolean; // 削除モード
  reordering: boolean; // 挿入移動のドラッグ中
  dialog: OpenDialog | null;
}

export function createUiStore() {
  const state = reactive<UiState>({ tab: 'grid', page: 0, trash: false, reordering: false, dialog: null });

  // ダイアログを出して、押されたボタンの id を返す
  function ask(req: DialogRequest): Promise<string> {
    // 前のダイアログが残っていたら、キャンセルとして閉じる
    state.dialog?.resolve(state.dialog.cancelId);
    return new Promise((resolve) => {
      state.dialog = { ...req, resolve };
    });
  }

  function choose(id: string): void {
    const d = state.dialog;
    state.dialog = null;
    d?.resolve(id);
  }

  return { state, ask, choose };
}

export type UiStore = ReturnType<typeof createUiStore>;
