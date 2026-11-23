// Node の機能を使うための入口
// Eagle のプラグインの画面では、グローバルの require で Node のモジュールを読み込める。
// バンドルに含めないように、import ではなく実行時の require を使う。
import type * as Fs from 'fs';
import type * as Path from 'path';

type NodeRequire = (id: string) => unknown;

function getRequire(): NodeRequire {
  const r = (globalThis as { require?: NodeRequire }).require;
  if (!r) throw new Error('Node の require を使えません（Eagle の外で動いています）');
  return r;
}

export function nodeRequire<T>(id: string): T {
  return getRequire()(id) as T;
}

export function hasNode(): boolean {
  return typeof (globalThis as { require?: unknown }).require === 'function';
}

export const nodeFs = (): typeof Fs => nodeRequire<typeof Fs>('fs');
export const nodePath = (): typeof Path => nodeRequire<typeof Path>('path');
