// ボタンを押したときの操作（確認ダイアログを出してから実行する）
import { fileNameOf } from '../core/item';
import { t } from '../i18n';
import type { ExportStore } from './export-store';
import type { GridStore } from './grid-store';
import type { UiStore } from './ui-store';

export function createActions(grid: GridStore, ui: UiStore, exp: ExportStore, save: () => Promise<void>) {
  const exporting = () => exp.state.phase === 'exporting';

  // 読み込めなかった画像の一覧を出す（01 の 2.1）
  async function showLoadFailures(): Promise<void> {
    const f = grid.state.failures;
    if (f.length === 0) return;
    await ui.ask({
      title: t('dialog.loadFailTitle', { count: f.length }),
      body: t('dialog.loadFailBody', { n: grid.state.items.length }),
      danger: true,
      list: f.map((x) => ({ name: x.name, reason: t(`failure.${x.reason}`) })),
      buttons: [{ id: 'close', label: t('dialog.close'), kind: 'primary' }],
      cancelId: 'close',
    });
  }

  // 起動したときの読み込み
  async function load(): Promise<void> {
    await grid.load();
    await showLoadFailures();
  }

  // 再読み込み：確認してから（01 の 2.2）
  async function askReload(): Promise<void> {
    if (exporting()) return;
    const id = await ui.ask({
      title: t('dialog.reloadTitle'),
      body: t('dialog.reloadBody'),
      buttons: [
        { id: 'cancel', label: t('dialog.cancel') },
        { id: 'ok', label: t('dialog.reloadOk'), kind: 'primary' },
      ],
      cancelId: 'cancel',
    });
    if (id !== 'ok') return;
    await grid.reload();
    await showLoadFailures();
  }

  // 削除モードでセルを押したとき：確認してから外す（01 の 2.3）
  async function askExclude(index: number): Promise<void> {
    const it = grid.state.items[index];
    if (!it || exporting()) return;
    const id = await ui.ask({
      title: t('dialog.excludeTitle'),
      body: t('dialog.excludeBody'),
      danger: true,
      list: [{ name: fileNameOf(it), reason: '' }],
      buttons: [
        { id: 'cancel', label: t('dialog.cancel') },
        { id: 'ok', label: t('dialog.excludeOk'), kind: 'danger' },
      ],
      cancelId: 'cancel',
    });
    if (id === 'ok') grid.exclude(it.id);
  }

  // グリッドをクリア：確認してから（01 の 2.3）
  async function askClear(): Promise<void> {
    if (exporting()) return;
    const id = await ui.ask({
      title: t('dialog.clearTitle'),
      body: t('dialog.clearBody', { n: grid.state.items.length }),
      danger: true,
      buttons: [
        { id: 'cancel', label: t('dialog.cancel') },
        { id: 'ok', label: t('dialog.clearOk'), kind: 'danger' },
      ],
      cancelId: 'cancel',
    });
    if (id !== 'ok') return;
    grid.clear();
    ui.state.page = 0;
  }

  // キャンセル：ウィンドウを閉じる。設定は自動で保存しているので確認しない（01 の 9 章）
  // 書き出し中は「書き出しをやめる」として働く（段階 5）
  function cancel(): void {
    if (exporting()) {
      exp.state.cancelRequested = true;
      return;
    }
    window.close();
    // 閉じられなかったときは隠す
    setTimeout(() => void globalThis.eagle?.window?.hide(), 300);
  }

  return { load, askReload, askExclude, askClear, cancel, save, showLoadFailures };
}

export type Actions = ReturnType<typeof createActions>;
