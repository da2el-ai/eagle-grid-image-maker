// ビルドのあとに、プラグインとして動かすのに要るものを dist/ に入れる Vite のプラグイン
// - sharp（バンドルせず、実行時に require で読み込む）
// - manifest.json の開発用の書き換え
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

const root = path.resolve(import.meta.dirname, '..');

// sharp の版は package.json の devDependencies に合わせる
function sharpVersion(): string {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  return pkg.devDependencies.sharp;
}

// 実行時に使う node_modules を .cache/ に用意する（OS と CPU ごと。一度入れたら使い回す）
function ensureRuntimeModules(): string {
  const version = sharpVersion();
  const dir = path.join(root, '.cache', 'runtime', `${process.platform}-${process.arch}`, `sharp-${version}`);
  const marker = path.join(dir, 'node_modules', 'sharp', 'package.json');
  if (!fs.existsSync(marker)) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ name: 'egim-runtime', private: true, dependencies: { sharp: version } }, null, 2),
    );
    console.log(`[plugin-runtime] sharp ${version} を入れています…`);
    execSync('npm install --omit=dev --no-package-lock --no-audit --no-fund', { cwd: dir, stdio: 'inherit' });
  }
  return path.join(dir, 'node_modules');
}

export function pluginRuntime(opts: { dev: boolean }): Plugin {
  let outDir = 'dist';
  return {
    name: 'egim-plugin-runtime',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      // sharp を dist/node_modules にコピーする
      const modules = ensureRuntimeModules();
      fs.cpSync(modules, path.join(outDir, 'node_modules'), { recursive: true });

      // 開発用のビルドでは、開発者ツールを開けるようにする
      const manifestPath = path.join(outDir, 'manifest.json');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      if (opts.dev) {
        manifest.devTools = true;
        manifest.name = `${manifest.name} (dev)`;
      }
      fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    },
  };
}
