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
import { createGridStore } from './state/grid-store';
import { createSettingsStore } from './state/settings-store';
import { createUiStore } from './state/ui-store';
import { createView } from './state/view';
import './style.css';

async function boot(): Promise<void> {
  // 開発用のビルドだけ、外から操作するための受付を始める（配布用のビルドからは消える）
  if (import.meta.env.MODE === 'development') {
    const { startRemote } = await import('./dev/remote');
    await startRemote().catch((e) => console.error('[remote] 受付を開始できません', e));
  }

  initI18n(globalThis.eagle?.app.locale);
  const sharp = loadSharp();
  if (sharp.error) console.error('[sharp]', sharp.error);

  const settings = createSettingsStore();
  const grid = createGridStore(settings, { fetchSelection });
  const ui = createUiStore();
  const view = createView(settings, grid, ui, canvasMeasure);
  const actions = createActions(grid, ui);
  const fonts = ref<string[] | null | 'loading'>('loading');
  const ctx: AppContext = { settings, grid, ui, view, actions, fonts };

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
