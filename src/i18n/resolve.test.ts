import { describe, expect, it } from 'vitest';
import { format, lookup, resolveLocale } from './resolve';

describe('resolveLocale', () => {
  const available = ['en', 'ja', 'zh-TW'];

  it('言語の部分で選ぶ', () => {
    expect(resolveLocale('ja_JP', available)).toBe('ja');
    expect(resolveLocale('ja-JP', available)).toBe('ja');
    expect(resolveLocale('ja', available)).toBe('ja');
  });

  it('完全に一致するものを先に選ぶ', () => {
    expect(resolveLocale('zh_TW', available)).toBe('zh-TW');
  });

  it('ファイルがなければ英語', () => {
    expect(resolveLocale('zh_CN', available)).toBe('en');
    expect(resolveLocale('fr', available)).toBe('en');
    expect(resolveLocale('', available)).toBe('en');
    expect(resolveLocale(undefined, available)).toBe('en');
  });
});

describe('format', () => {
  it('差し込みを埋める', () => {
    expect(format('{n} 枚', { n: 3 })).toBe('3 枚');
  });

  it('値がない差し込みはそのまま残す', () => {
    expect(format('{a} {b}', { a: 1 })).toBe('1 {b}');
  });
});

describe('lookup', () => {
  it('選んだ言語 → 英語 → キーの順', () => {
    const ja = { a: 'あ' };
    const en = { a: 'A', b: 'B' };
    expect(lookup('a', ja, en)).toBe('あ');
    expect(lookup('b', ja, en)).toBe('B');
    expect(lookup('c', ja, en)).toBe('c');
  });
});
