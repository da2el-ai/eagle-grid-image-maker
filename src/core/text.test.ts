import { describe, expect, it } from 'vitest';
import { fakeMeasure } from './test-measure';
import { fontString, splitLines, wrapText } from './text';

describe('fontString', () => {
  it('総称フォント名は引用符で囲まない', () => {
    expect(fontString(20, 'sans-serif')).toBe('20px sans-serif');
  });
  it('フォント名は引用符で囲む', () => {
    expect(fontString(32, 'Hiragino Sans')).toBe('32px "Hiragino Sans"');
  });
  it('空なら sans-serif', () => {
    expect(fontString(10, ' ')).toBe('10px sans-serif');
  });
});

describe('splitLines', () => {
  it('改行で分ける。空なら0行', () => {
    expect(splitLines('a\nb\r\nc')).toEqual(['a', 'b', 'c']);
    expect(splitLines('')).toEqual([]);
    expect(splitLines('a\n')).toEqual(['a', '']);
  });
});

describe('wrapText（10px・英数字 5px・日本語 10px で測る）', () => {
  const font = '10px sans-serif';

  it('幅に収まるなら折り返さない', () => {
    expect(wrapText('abc def', 100, font, fakeMeasure)).toEqual(['abc def']);
  });

  it('英数字は単語の区切りで折り返す', () => {
    // "hello world" = 55px。幅 30px なら2行
    expect(wrapText('hello world', 30, font, fakeMeasure)).toEqual(['hello', 'world']);
  });

  it('日本語は1文字ずつ折り返す', () => {
    expect(wrapText('あいうえお', 30, font, fakeMeasure)).toEqual(['あいう', 'えお']);
  });

  it('句読点は行頭に置かず、前の行に残す', () => {
    expect(wrapText('あいう。え', 30, font, fakeMeasure)).toEqual(['あいう。', 'え']);
  });

  it('1単語だけで幅を超えるときは途中で分ける（先頭の単語も）', () => {
    expect(wrapText('abcdefgh', 20, font, fakeMeasure)).toEqual(['abcd', 'efgh']);
    expect(wrapText('ab abcdefgh', 20, font, fakeMeasure)).toEqual(['ab', 'abcd', 'efgh']);
  });

  it('空の文字は1行の空行', () => {
    expect(wrapText('', 20, font, fakeMeasure)).toEqual(['']);
  });
});
