import { describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { defaultSettings } from '../core/settings';
import { createSettingsStore, loadSettings, sanitizeSettings, type KeyValueStorage } from './settings-store';

const memoryStorage = (init: Record<string, string> = {}): KeyValueStorage & { data: Record<string, string> } => {
  const data = { ...init };
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => void (data[k] = v) };
};

describe('sanitizeSettings', () => {
  it('何もなければ初期値', () => {
    expect(sanitizeSettings(null)).toEqual(defaultSettings());
    expect(sanitizeSettings('x')).toEqual(defaultSettings());
  });

  it('正しい値はそのまま使う', () => {
    const s = sanitizeSettings({ cellW: 500, cols: null, rows: 3, flow: 'down', title: 'T', xy: true, bg: '#112233' });
    expect([s.cellW, s.cols, s.rows, s.flow, s.title, s.xy, s.bg]).toEqual([500, null, 3, 'down', 'T', true, '#112233']);
  });

  it('範囲の外の数は端に収め、小数は丸める', () => {
    const s = sanitizeSettings({ cols: 40, rows: 0, quality: 120, gap: -5, cellW: 99.6 });
    expect([s.cols, s.rows, s.quality, s.gap, s.cellW]).toEqual([16, 1, 100, 0, 100]);
  });

  it('型が違う値・知らない選択肢・おかしな色は初期値に戻す', () => {
    const d = defaultSettings();
    const s = sanitizeSettings({ cellW: '500', flow: 'diagonal', bg: 'red', xy: 'yes', title: 3, cellH: Number.NaN });
    expect([s.cellW, s.flow, s.bg, s.xy, s.title, s.cellH]).toEqual([d.cellW, d.flow, d.bg, d.xy, d.title, d.cellH]);
  });

  it('空欄にできない項目の null は初期値に戻す', () => {
    expect(sanitizeSettings({ cellW: null }).cellW).toBe(defaultSettings().cellW);
  });

  it('知らない項目は捨てる', () => {
    expect('extra' in sanitizeSettings({ extra: 1 })).toBe(false);
  });
});

describe('loadSettings', () => {
  it('壊れた JSON なら初期値', () => {
    expect(loadSettings(memoryStorage({ 'egim.settings.v1': '{' }))).toEqual(defaultSettings());
  });
});

describe('createSettingsStore', () => {
  it('変えた設定を少し待ってから保存し、次に読み込める', async () => {
    vi.useFakeTimers();
    const storage = memoryStorage();
    const s = createSettingsStore(storage, 100);
    s.cellW = 640;
    s.title = 'abc';
    await nextTick();
    expect(storage.data['egim.settings.v1']).toBeUndefined();
    vi.advanceTimersByTime(100);
    const again = loadSettings(storage);
    expect([again.cellW, again.title]).toEqual([640, 'abc']);
    vi.useRealTimers();
  });
});
