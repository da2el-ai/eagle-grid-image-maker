// 文言ファイルどうしで、キーと差し込み（{name}）がそろっているかを確かめる
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const dir = path.resolve(__dirname, '../../public/locales');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
const read = (f: string) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) as Record<string, string>;
const en = read('en.json');
const params = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('locales', () => {
  for (const f of files.filter((x) => x !== 'en.json')) {
    it(`${f} は en.json と同じキーを持つ`, () => {
      expect(Object.keys(read(f)).sort()).toEqual(Object.keys(en).sort());
    });
    it(`${f} の差し込みは en.json と同じ`, () => {
      const m = read(f);
      for (const k of Object.keys(en)) expect([k, params(m[k] ?? '')]).toEqual([k, params(en[k])]);
    });
  }
});
