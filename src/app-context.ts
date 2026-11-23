// 画面の部品どうしで、状態と操作を受け渡す
import { inject, type InjectionKey, type Ref } from 'vue';
import type { Settings } from './core/settings';
import type { Actions } from './state/actions';
import type { GridStore } from './state/grid-store';
import type { UiStore } from './state/ui-store';
import type { View } from './state/view';

export interface AppContext {
  settings: Settings;
  grid: GridStore;
  ui: UiStore;
  view: View;
  actions: Actions;
  fonts: Ref<string[] | null | 'loading'>; // OS のフォント（取れなければ null）
}

export const APP_KEY: InjectionKey<AppContext> = Symbol('egim-app');

export function useApp(): AppContext {
  const ctx = inject(APP_KEY);
  if (!ctx) throw new Error('AppContext がありません');
  return ctx;
}
