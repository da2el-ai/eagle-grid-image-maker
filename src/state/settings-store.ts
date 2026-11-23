// 設定の自動保存と復元（01 の 1.1 の 7）
// 保存先は localStorage（04 の 3.2）。前回の画像リストは保存しない
import { reactive, watch } from 'vue';
import { defaultSettings, type Settings } from '../core/settings';

const STORAGE_KEY = 'egim.settings.v1';
const SAVE_DELAY_MS = 300;

// 保存しておく場所（テストで差し替えられるように）
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

// 選べる値
const ENUMS: { [K in keyof Settings]?: readonly string[] } = {
  flow: ['right', 'down'],
  fit: ['cover', 'contain'],
  orient: ['none', 'portrait', 'landscape'],
  rotDir: ['cw', 'ccw'],
  sortKey: ['selection', 'name', 'imported', 'manual', 'random'],
  sortDir: ['asc', 'desc'],
  format: ['jpeg', 'png', 'webp'],
};

// 数の範囲
const RANGES: { [K in keyof Settings]?: [number, number] } = {
  cellW: [1, 65535],
  cellH: [1, 65535],
  cols: [1, 16],
  rows: [1, 16],
  titleSize: [1, 1000],
  headerSize: [1, 1000],
  gap: [0, 10000],
  padding: [0, 10000],
  quality: [1, 100],
};

// 空欄（null）にできる項目
const NULLABLE = new Set<keyof Settings>(['cols', 'rows']);

const isHexColor = (v: string) => /^#[0-9a-fA-F]{6}$/.test(v);

// 保存してあった値を確かめて、使えない値は初期値に戻す
export function sanitizeSettings(raw: unknown): Settings {
  const d = defaultSettings();
  if (!raw || typeof raw !== 'object') return d;
  const src = raw as Record<string, unknown>;
  const out = { ...d } as Record<string, unknown>;
  for (const key of Object.keys(d) as (keyof Settings)[]) {
    const v = src[key];
    const def = d[key];
    if (v === undefined) continue;
    if (v === null) {
      if (NULLABLE.has(key)) out[key] = null;
      continue;
    }
    const range = RANGES[key];
    if (range) {
      if (typeof v === 'number' && Number.isFinite(v)) out[key] = Math.min(range[1], Math.max(range[0], Math.round(v)));
      continue;
    }
    const allowed = ENUMS[key];
    if (allowed) {
      if (typeof v === 'string' && allowed.includes(v)) out[key] = v;
      continue;
    }
    if (key === 'bg' || key === 'textColor') {
      if (typeof v === 'string' && isHexColor(v)) out[key] = v.toUpperCase();
      continue;
    }
    if (typeof v === typeof def) out[key] = v;
  }
  return out as unknown as Settings;
}

export function loadSettings(storage: KeyValueStorage | null): Settings {
  if (!storage) return defaultSettings();
  try {
    const text = storage.getItem(STORAGE_KEY);
    return text ? sanitizeSettings(JSON.parse(text)) : defaultSettings();
  } catch {
    // 読めなければ初期値で始める
    return defaultSettings();
  }
}

export function saveSettings(storage: KeyValueStorage | null, s: Settings): void {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // 保存できなくても動きは止めない
  }
}

function defaultStorage(): KeyValueStorage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

// 設定を読み込み、変わるたびに少し待ってから保存する
export function createSettingsStore(storage: KeyValueStorage | null = defaultStorage(), delayMs = SAVE_DELAY_MS): Settings {
  const settings = reactive(loadSettings(storage)) as Settings;
  let timer: ReturnType<typeof setTimeout> | null = null;
  watch(
    () => ({ ...settings }),
    () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => saveSettings(storage, settings), delayMs);
    },
  );
  // ウィンドウを閉じるときは待たずに保存する
  globalThis.addEventListener?.('beforeunload', () => saveSettings(storage, settings));
  return settings;
}
