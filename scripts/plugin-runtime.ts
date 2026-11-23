// ビルドのあとに、プラグインとして動かすのに要るものを dist/ に入れる Vite のプラグイン
// - sharp（バンドルせず、実行時に require で読み込む）。実行時に使うパッケージ・ファイルだけを入れる
// - manifest.json の書き換え（配布用：ビルドした OS の platform と arch、開発用：名前に (dev)）
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

// 実行時に sharp が読み込むパッケージ（sharp/lib/*.js の require から調べた。段階 6）
// prebuild-install・tar-fs・tunnel-agent などはインストールのときにしか使わないので入れない
const RUNTIME_PACKAGES = ['sharp', 'color', 'color-convert', 'color-name', 'color-string', 'simple-swizzle', 'is-arrayish', 'detect-libc', 'semver'];
// sharp の中で実行時に使うもの（C++ のソースやインストール用のスクリプトは入れない）
const SHARP_FILES = ['package.json', 'LICENSE', 'lib', 'build/Release', 'vendor'];

// node_modules の中身の目印（OS・CPU・sharp の版）
const STAMP_FILE = '.egim-runtime';
function runtimeStamp(): string {
  return `${process.platform}-${process.arch}-sharp-${sharpVersion()}`;
}

function copyRuntimeModules(from: string, to: string): void {
  // 中身が同じならコピーし直さない
  // （Windows では Eagle がプラグインを開いている間、sharp の DLL が使用中で消せないため）
  const stamp = path.join(to, STAMP_FILE);
  if (fs.existsSync(stamp) && fs.readFileSync(stamp, 'utf8') === runtimeStamp()) return;
  fs.rmSync(to, { recursive: true, force: true });
  for (const name of RUNTIME_PACKAGES) {
    const src = path.join(from, name);
    if (!fs.existsSync(src)) throw new Error(`[plugin-runtime] ${name} がありません`);
    if (name === 'sharp') {
      for (const f of SHARP_FILES) {
        const p = path.join(src, f);
        if (fs.existsSync(p)) fs.cpSync(p, path.join(to, name, f), { recursive: true });
      }
    } else {
      fs.cpSync(src, path.join(to, name), { recursive: true });
    }
  }
  fs.writeFileSync(stamp, runtimeStamp());
}

// dist/ を、node_modules を残して空にする
function cleanOutDir(outDir: string): void {
  if (!fs.existsSync(outDir)) return;
  for (const name of fs.readdirSync(outDir)) {
    if (name !== 'node_modules') fs.rmSync(path.join(outDir, name), { recursive: true, force: true });
  }
}

// Eagle の manifest の platform・arch（01 の 11.1）
function eaglePlatform(): { platform: string; arch: string } {
  const platform = process.platform === 'darwin' ? 'mac' : process.platform === 'win32' ? 'win' : process.platform;
  const arch = process.arch === 'arm64' ? 'arm' : process.arch;
  return { platform, arch };
}

export function pluginRuntime(opts: { dev: boolean }): Plugin {
  let outDir = 'dist';
  return {
    name: 'egim-plugin-runtime',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    buildStart() {
      cleanOutDir(outDir);
    },
    closeBundle() {
      // sharp を dist/node_modules にコピーする
      copyRuntimeModules(ensureRuntimeModules(), path.join(outDir, 'node_modules'));

      const manifestPath = path.join(outDir, 'manifest.json');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      // 版は package.json に合わせる（書く場所を1つにする）
      manifest.version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
      if (opts.dev) {
        // 開発用：ID と名前を変えて、配布用と同時に Eagle に入れられるようにする
        // devTools は true にしない（開くたびに開発者ツールが開くため。F12 で開ける）
        manifest.id = `${manifest.id}-dev`;
        manifest.name = `${manifest.name} (dev)`;
      } else {
        // 配布用：ビルドした OS と CPU だけに入れられるようにする（OS ごとに .eagleplugin を作る）
        Object.assign(manifest, eaglePlatform());
      }
      fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    },
  };
}
