// =====================================================================
// 開発用のリモート受付（開発用のビルドにだけ入る。配布用のビルドには入らない）
// - 127.0.0.1 だけで待ち受ける小さな HTTP サーバー
// - 起動するたびに合言葉（トークン）を作り、<リポジトリ>/.cache/remote.json に書き出す
// - POST /eval で送られた JavaScript をプラグインの中で実行し、結果を JSON で返す
// - 実行する前に、開いているライブラリが test-library であることを毎回確かめる
// =====================================================================
import type * as Http from 'http';
import type * as Crypto from 'crypto';
import { nodeFs, nodePath, nodeRequire } from '../platform/node';
import { pluginDir } from '../platform/plugin-dir';

// テストに使ってよいライブラリの名前
const TEST_LIBRARY = 'test-library';
const DEFAULT_PORT = 41700;

interface LogEntry {
  time: string;
  level: string;
  message: string;
}

const logBuffer: LogEntry[] = [];
let server: Http.Server | null = null;
let token = '';

// 書き出し先：dist/ の1つ上（リポジトリの直下）の .cache/。dist/ はビルドのたびに消えるため
function infoPath(): string {
  return nodePath().join(pluginDir(), '..', '.cache', 'remote.json');
}

// console の出力を取っておき、外から読めるようにする
function hookConsole(): void {
  for (const level of ['log', 'info', 'warn', 'error'] as const) {
    const orig = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      logBuffer.push({ time: new Date().toISOString(), level, message: args.map((a) => (a instanceof Error ? a.stack ?? a.message : typeof a === 'string' ? a : safeJson(a))).join(' ') });
      if (logBuffer.length > 500) logBuffer.shift();
      orig(...args);
    };
  }
  window.addEventListener('error', (e) => console.error(`window.error: ${e.message}`));
  window.addEventListener('unhandledrejection', (e) => console.error(`unhandledrejection: ${(e.reason as Error)?.stack ?? e.reason}`));
}

function safeJson(v: unknown): string {
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

// JSON にできない値（DOM・循環参照・関数など）を扱いやすい形にする
function serialize(value: unknown): unknown {
  const seen = new WeakSet<object>();
  const walk = (v: unknown, depth: number): unknown => {
    if (v === undefined) return null;
    if (v === null || typeof v !== 'object') return typeof v === 'function' ? '[function]' : v;
    if (v instanceof Error) return { error: v.message };
    if (v instanceof Node) return v instanceof Element ? v.outerHTML.slice(0, 2000) : v.textContent;
    if (seen.has(v)) return '[circular]';
    if (depth > 8) return '[too deep]';
    seen.add(v);
    if (Array.isArray(v)) return v.map((x) => walk(x, depth + 1));
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v)) out[k] = walk((v as Record<string, unknown>)[k], depth + 1);
    return out;
  };
  return walk(value, 0);
}

// 実行する JavaScript から使う補助関数（R.xxx）
const helpers = {
  sleep: (ms: number) => new Promise((r) => setTimeout(r, ms)),
  logs: (n = 30) => logBuffer.slice(-n),
  // 画面の文字
  text: (selector = '#app') => (document.querySelector(selector) as HTMLElement | null)?.innerText.slice(0, 20000) ?? null,
  // 文字が一致するボタンを押す
  click(label: string) {
    const list = [...document.querySelectorAll('button')];
    const b = list.find((x) => x.textContent?.trim() === label) ?? list.find((x) => x.textContent?.includes(label));
    if (!b) throw new Error(`ボタンが見つかりません：${label}`);
    b.click();
    return b.textContent;
  },
  // 画面全体を PNG で保存する（開発での確認用）
  // HTML と CSS を SVG の foreignObject に包んで Canvas に描く。canvas 要素は中身の画像に置き換える
  async snapDom(outPath: string, scale = 1) {
    const root = document.documentElement;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const clone = root.cloneNode(true) as HTMLElement;
    const src = [...root.querySelectorAll('canvas')];
    clone.querySelectorAll('canvas').forEach((c, i) => {
      const img = document.createElement('img');
      img.src = src[i].toDataURL('image/png');
      img.setAttribute('style', getComputedStyle(src[i]).cssText);
      img.style.width = `${src[i].clientWidth}px`;
      img.style.height = `${src[i].clientHeight}px`;
      c.replaceWith(img);
    });
    // 入力欄の今の値を写す
    const srcInputs = [...root.querySelectorAll('input, textarea, select')] as (HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement)[];
    clone.querySelectorAll('input, textarea, select').forEach((el, i) => {
      const s = srcInputs[i];
      if (s instanceof HTMLInputElement) {
        if (s.type === 'checkbox' || s.type === 'radio') (el as HTMLInputElement).toggleAttribute('checked', s.checked);
        else el.setAttribute('value', s.value);
      } else if (s instanceof HTMLTextAreaElement) el.textContent = s.value;
      else if (s instanceof HTMLSelectElement) (el as HTMLSelectElement).querySelectorAll('option').forEach((o, k) => o.toggleAttribute('selected', k === s.selectedIndex));
    });
    clone.querySelectorAll('script').forEach((s) => s.remove());
    const css = [...document.styleSheets].map((ss) => {
      try {
        return [...ss.cssRules].map((r) => r.cssText).join('\n');
      } catch {
        return '';
      }
    }).join('\n');
    const style = document.createElement('style');
    style.textContent = css;
    clone.querySelector('head')?.appendChild(style);
    clone.querySelectorAll('link[rel="stylesheet"]').forEach((l) => l.remove());
    const xhtml = new XMLSerializer().serializeToString(clone);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><foreignObject width="100%" height="100%">${xhtml}</foreignObject></svg>`;
    const img = new Image();
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = w * scale;
    c.height = h * scale;
    const ctx = c.getContext('2d') as CanvasRenderingContext2D;
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0);
    const b64 = c.toDataURL('image/png').split(',')[1];
    nodeFs().writeFileSync(outPath, Buffer.from(b64, 'base64'));
    return { path: outPath, width: c.width, height: c.height };
  },
  // canvas を PNG で保存する
  snapCanvas(selector: string, outPath: string, index = 0) {
    const c = document.querySelectorAll<HTMLCanvasElement>(selector)[index];
    if (!c) throw new Error(`canvas が見つかりません：${selector}`);
    const b64 = c.toDataURL('image/png').split(',')[1];
    nodeFs().writeFileSync(outPath, Buffer.from(b64, 'base64'));
    return { path: outPath, width: c.width, height: c.height };
  },
};

async function checkLibrary(): Promise<string | null> {
  if (!globalThis.eagle) return 'Eagle の中で動いていません';
  const info = await globalThis.eagle.library.info();
  if (info.name !== TEST_LIBRARY) return `開いているライブラリが ${TEST_LIBRARY} ではありません。命令は実行しません`;
  return null;
}

function handle(req: Http.IncomingMessage, res: Http.ServerResponse): void {
  const send = (code: number, obj: unknown) => {
    res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(obj));
  };
  if (req.headers['x-token'] !== token) return send(403, { ok: false, error: 'トークンが違います' });
  if (req.method === 'GET' && req.url === '/ping') return send(200, { ok: true });
  if (req.method !== 'POST' || req.url !== '/eval') return send(404, { ok: false, error: '不明な要求です' });
  let body = '';
  req.setEncoding('utf8');
  req.on('data', (c: string) => {
    body += c;
  });
  req.on('end', async () => {
    const t0 = performance.now();
    try {
      const refused = await checkLibrary();
      if (refused) return send(200, { ok: false, error: refused });
      const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor as new (...args: string[]) => (...a: unknown[]) => Promise<unknown>;
      const fn = new AsyncFunction('R', 'eagle', 'require', 'app', body);
      const value = await fn(helpers, globalThis.eagle, nodeRequire, (window as unknown as { __egim?: unknown }).__egim);
      send(200, { ok: true, ms: Math.round(performance.now() - t0), value: serialize(value) });
    } catch (e) {
      const err = e as Error;
      send(200, { ok: false, ms: Math.round(performance.now() - t0), error: err?.message, stack: err?.stack });
    }
  });
}

export function startRemote(): Promise<number> {
  hookConsole();
  const http = nodeRequire<typeof Http>('http');
  const crypto = nodeRequire<typeof Crypto>('crypto');
  token = crypto.randomBytes(16).toString('hex');
  const srv = http.createServer(handle);
  return new Promise((resolve, reject) => {
    const listen = (port: number) => {
      srv.once('error', (e: NodeJS.ErrnoException) => {
        // 決めた番号が使われていたら、空いている番号にする
        if (e.code === 'EADDRINUSE' && port !== 0) listen(0);
        else reject(e);
      });
      srv.listen(port, '127.0.0.1', () => {
        server = srv;
        const addr = srv.address() as { port: number };
        const file = infoPath();
        nodeFs().mkdirSync(nodePath().dirname(file), { recursive: true });
        nodeFs().writeFileSync(file, JSON.stringify({ port: addr.port, token, startedAt: new Date().toISOString() }, null, 2));
        console.info(`[remote] 127.0.0.1:${addr.port} で受付を開始しました`);
        resolve(addr.port);
      });
    };
    listen(DEFAULT_PORT);
  });
}

// ウィンドウを閉じるときに止める
window.addEventListener('beforeunload', () => {
  server?.close();
  server = null;
  try {
    nodeFs().unlinkSync(infoPath());
  } catch {
    // なければ何もしない
  }
});
