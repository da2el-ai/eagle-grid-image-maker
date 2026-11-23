// 起動処理
import { createApp, reactive } from 'vue';
import App from './App.vue';
import { fetchSelection } from './eagle/adapter';
import { initI18n } from './i18n';
import { loadSharp } from './platform/sharp';
import { createGridStore } from './state/grid-store';
import { createSettingsStore } from './state/settings-store';
import './style.css';

export interface BootInfo {
  eagleLocale: string | null;
  locale: string;
  eagleVersion: string | null;
  sharpVersion: string | null;
  sharpMs: number;
  sharpError: string | null;
}

async function boot(): Promise<void> {
  // 開発用のビルドだけ、外から操作するための受付を始める（配布用のビルドからは消える）
  if (import.meta.env.MODE === 'development') {
    const { startRemote } = await import('./dev/remote');
    await startRemote().catch((e) => console.error('[remote] 受付を開始できません', e));
  }

  const eagleLocale = globalThis.eagle?.app.locale ?? null;
  const locale = initI18n(eagleLocale ?? undefined);
  const sharp = loadSharp();

  const info = reactive<BootInfo>({
    eagleLocale,
    locale,
    eagleVersion: globalThis.eagle?.app.version ?? null,
    sharpVersion: sharp.version,
    sharpMs: Math.round(sharp.ms),
    sharpError: sharp.error ? sharp.error.message : null,
  });

  const settings = createSettingsStore();
  const grid = createGridStore(settings, { fetchSelection });

  // 開発用のリモート受付から状態を見られるようにする
  if (import.meta.env.MODE === 'development') {
    (window as unknown as { __egim: unknown }).__egim = { info, settings, grid };
  }

  createApp(App, { info, settings, grid }).mount('#app');
  // 起動したときに、Eagle で今選んでいる画像を読み込む
  await grid.load();
}

boot().catch((e) => {
  console.error(e);
  document.body.textContent = `起動できませんでした / Failed to start: ${(e as Error).message}`;
});
