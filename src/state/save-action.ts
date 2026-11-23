// 「グリッド保存」を押したときの流れ（01 の 8 章）
// 保存ダイアログ → 全ページのファイル名で同名を調べる → 書き出す → 結果を出す
import { toRaw } from 'vue';
import { fileNameOf } from '../core/item';
import { computeLayout } from '../core/layout';
import type { Settings } from '../core/settings';
import { classifyError } from '../export/errors';
import { runExport } from '../export/exporter';
import { DEFAULT_BASE_NAME, extensionOf, pageFileNames, renumberedBase, splitChosenPath } from '../export/naming';
import { t } from '../i18n';
import { canvasMeasure } from '../platform/measure';
import { nodeFs, nodePath } from '../platform/node';
import { loadSharp } from '../platform/sharp';
import type { ExportStore } from './export-store';
import type { GridStore } from './grid-store';
import type { UiStore } from './ui-store';

const LAST_DIR_KEY = 'egim.lastSaveDir';
const FORMAT_NAME = { jpeg: 'JPEG', png: 'PNG', webp: 'WebP' } as const;

function readLastDir(): string | null {
  try {
    return localStorage.getItem(LAST_DIR_KEY);
  } catch {
    return null;
  }
}

function writeLastDir(dir: string): void {
  try {
    localStorage.setItem(LAST_DIR_KEY, dir);
  } catch {
    // 覚えられなくても続ける
  }
}

// 保存ダイアログで最初に開くフォルダ：前回保存したフォルダ。なければダウンロード
async function initialDir(): Promise<string> {
  const last = readLastDir();
  if (last && nodeFs().existsSync(last)) return last;
  try {
    return String(await globalThis.eagle?.app.getPath('downloads'));
  } catch {
    return '';
  }
}

export function createSaveAction(settings: Settings, grid: GridStore, ui: UiStore, exp: ExportStore) {
  return async function save(): Promise<void> {
    if (exp.state.phase === 'exporting') return;
    const eagle = globalThis.eagle;
    const sharp = loadSharp().sharp;
    if (!eagle || !sharp) {
      await ui.ask({ title: t('error.noSharp'), danger: true, buttons: [{ id: 'close', label: t('dialog.close'), kind: 'primary' }], cancelId: 'close' });
      return;
    }

    // 始める時点の設定と並びを写し取る（書き出し中に変えても中身が変わらないように）
    const s: Settings = { ...toRaw(settings) };
    const items = [...grid.state.items];
    const layout = computeLayout(s, items.length, canvasMeasure);
    const pages = layout.shape.pageCount;
    const ext = extensionOf(s.format);
    const path = nodePath();
    const fs = nodeFs();

    // 保存先を選ぶ
    const dir0 = await initialDir();
    // 開発用のビルドだけ、外からの確認のために保存ダイアログを差し替えられる
    type SaveDialog = typeof eagle.dialog.showSaveDialog;
    const testDialog = import.meta.env.MODE === 'development' ? (window as unknown as { __egimTestSaveDialog?: SaveDialog }).__egimTestSaveDialog : undefined;
    const showSaveDialog: SaveDialog = testDialog ?? ((o) => eagle.dialog.showSaveDialog(o));
    const chosen = await showSaveDialog({
      title: t('export.dialogTitle'),
      defaultPath: dir0 ? path.join(dir0, `${DEFAULT_BASE_NAME}.${ext}`) : `${DEFAULT_BASE_NAME}.${ext}`,
      filters: [{ name: FORMAT_NAME[s.format], extensions: [ext] }],
      properties: ['createDirectory'],
    });
    if (chosen.canceled || !chosen.filePath) return;
    const { dir, base: base0 } = splitChosenPath(chosen.filePath);
    let base = base0;

    // 全ページのファイル名で、同じ名前のファイルを調べる
    // 1ページだけのときは、OS の保存ダイアログが置き換えるかを確かめているので聞かない
    const exists = (name: string) => fs.existsSync(path.join(dir, name));
    const conflicts = pageFileNames(base, ext, pages).filter(exists);
    if (pages > 1 && conflicts.length > 0) {
      const id = await ui.ask({
        title: t('dialog.sameNameTitle'),
        body: t('dialog.sameNameBody', { count: conflicts.length }),
        danger: true,
        list: conflicts.map((name) => ({ name, reason: '' })),
        buttons: [
          { id: 'cancel', label: t('dialog.sameNameCancel') },
          { id: 'renumber', label: t('dialog.sameNameRenumber'), kind: 'primary' },
          { id: 'overwrite', label: t('dialog.sameNameOverwrite'), kind: 'danger' },
        ],
        cancelId: 'cancel',
      });
      if (id === 'cancel') return;
      if (id === 'renumber') base = renumberedBase(base, ext, pages, exists);
    }
    writeLastDir(dir);
    const paths = pageFileNames(base, ext, pages).map((n) => path.join(dir, n));

    // 書き出す
    exp.start(pages);
    const result = await runExport({
      sharp,
      layout,
      items,
      settings: s,
      paths,
      onProgress: (p) => Object.assign(exp.state, { page: p.page, pages: p.pages, cellsDone: p.cellsDone, cells: p.cells }),
      isCanceled: () => exp.state.cancelRequested,
    });
    exp.state.written = result.written.length;

    // 結果
    if (result.error) {
      exp.state.failedPage = result.error.page;
      exp.settle('failed', 15000);
      const kind = classifyError(result.error.cause);
      const cause = result.error.cause as { code?: string; message?: string };
      const detail = cause?.code ?? cause?.message ?? '';
      const saved = result.written.length;
      await ui.ask({
        title: t('dialog.exportErrorTitle', { page: result.error.page + 1 }),
        body: [t(`error.${kind}`, { detail }), saved > 0 ? t('dialog.exportErrorSaved', { saved }) : ''].filter(Boolean).join('\n'),
        danger: true,
        buttons: [{ id: 'close', label: t('dialog.close'), kind: 'primary' }],
        cancelId: 'close',
      });
    } else if (result.canceled) {
      exp.settle('canceled');
    } else {
      exp.settle('done');
    }
    if (result.cellFailures.length > 0) {
      await ui.ask({
        title: t('dialog.cellFailTitle', { count: result.cellFailures.length }),
        body: t('dialog.cellFailBody'),
        danger: true,
        list: result.cellFailures.map((f) => ({ name: fileNameOf(f.item), reason: t('failure.cannotOpen') })),
        buttons: [{ id: 'close', label: t('dialog.close'), kind: 'primary' }],
        cancelId: 'close',
      });
    }
  };
}
