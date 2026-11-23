// 起動処理
import { createApp, ref } from 'vue';
import App from './App.vue';
import type { AppContext } from './app-context';
import { fetchSelection } from './eagle/adapter';
import { initI18n } from './i18n';
import { listLocalFonts } from './platform/fonts';
import { canvasMeasure } from './platform/measure';
import { loadSharp } from './platform/sharp';
import { createActions } from './state/actions';
import { createExportStore } from './state/export-store';
import { createGridStore } from './state/grid-store';
import { createSaveAction } from './state/save-action';
import { createSettingsStore } from './state/settings-store';
import { createUiStore } from './state/ui-store';
import { createView } from './state/view';
import './style.css';

// Eagle の API は plugin-create の後でないと使えない。来る前に呼ぶとエラーで止まる
// 呼ばれ損ねないように、読み込んだらすぐに登録しておく
const pluginReady = new Promise<void>((resolve) => {
  const eagle = globalThis.eagle;
  // Eagle の外（ブラウザでの確認など）では待たない
  if (!eagle?.onPluginCreate) resolve();
  else eagle.onPluginCreate(() => resolve());
});

// Eagle の言語。取れないときは、ページの URL に付いている locale= を使う
function eagleLocale(): string | undefined {
  return globalThis.eagle?.app.locale || new URLSearchParams(location.search).get('locale') || undefined;
}

async function boot(): Promise<void> {
  // 開発用のビルドだけ、外から操作するための受付を始める（配布用のビルドからは消える）
  if (import.meta.env.MODE === 'development') {
    const { startRemote } = await import('./dev/remote');
    await startRemote().catch((e) => console.error('[remote] 受付を開始できません', e));
  }

  await pluginReady;
  initI18n(eagleLocale());
  const sharp = loadSharp();
  if (sharp.error) console.error('[sharp]', sharp.error);

  const settings = createSettingsStore();
  const grid = createGridStore(settings, { fetchSelection });
  const ui = createUiStore();
  const exp = createExportStore();
  const view = createView(settings, grid, ui, canvasMeasure, exp);
  const actions = createActions(grid, ui, exp, createSaveAction(settings, grid, ui, exp));
  const fonts = ref<string[] | null | 'loading'>('loading');
  const ctx: AppContext = { settings, grid, ui, view, actions, exp, fonts };

  // 開発用のリモート受付から状態を見られるようにする
  if (import.meta.env.MODE === 'development') {
    (window as unknown as { __egim: unknown }).__egim = { ...ctx, sharp };
  }

  createApp(App, { ctx, sharpError: sharp.error ? sharp.error.message : null }).mount('#app');

  // OS のフォントの一覧は、後ろで取っておく
  void listLocalFonts().then((list) => (fonts.value = list));
  // 起動したときに、Eagle で今選んでいる画像を読み込む
  await actions.load();
}

boot().catch((e) => {
  console.error(e);
  document.body.textContent = `起動できませんでした / Failed to start: ${(e as Error).message}`;
});
