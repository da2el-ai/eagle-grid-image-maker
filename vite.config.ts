import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { pluginRuntime } from './scripts/plugin-runtime';

// dist/ がそのまま Eagle に読み込むプラグインのフォルダになる
export default defineConfig(({ mode }) => ({
  // eagleplugin:// から相対パスで読み込むため
  base: './',
  plugins: [vue(), pluginRuntime({ dev: mode === 'development' })],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Eagle 4.0 は Electron 22（Chromium 108）
    target: 'chrome108',
    // 開発用のビルドはデバッグしやすいように圧縮しない
    minify: mode !== 'development',
    sourcemap: mode === 'development' ? 'inline' : false,
  },
}));
