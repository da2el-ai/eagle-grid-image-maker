// sharp を実行時に読み込む（バンドルしない。01 の 11.1）
import type SharpType from 'sharp';
import { nodePath, nodeRequire } from './node';
import { pluginDir } from './plugin-dir';

export type Sharp = typeof SharpType;

export interface SharpLoadResult {
  sharp: Sharp | null;
  version: string | null;
  ms: number;
  error: Error | null;
}

let result: SharpLoadResult | null = null;

export function loadSharp(): SharpLoadResult {
  if (result) return result;
  const t0 = performance.now();
  try {
    const dir = nodePath().join(pluginDir(), 'node_modules', 'sharp');
    const sharp = nodeRequire<Sharp>(dir);
    const pkg = nodeRequire<{ version: string }>(nodePath().join(dir, 'package.json'));
    // キャッシュは使わない。メモリのピークを下げるため（01 の 8.2）
    sharp.cache(false);
    result = { sharp, version: pkg.version, ms: performance.now() - t0, error: null };
  } catch (e) {
    result = { sharp: null, version: null, ms: performance.now() - t0, error: e as Error };
  }
  return result;
}
