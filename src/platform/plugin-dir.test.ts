import { describe, expect, it } from 'vitest';
import { pluginDirFromUrlPath } from './plugin-dir';

describe('pluginDirFromUrlPath', () => {
  it('macOS のパス', () => {
    expect(pluginDirFromUrlPath('/Users/someone/plugins/egim/index.html')).toBe('/Users/someone/plugins/egim');
  });

  it('日本語などはデコードする', () => {
    expect(pluginDirFromUrlPath('/Users/someone/%E4%BD%9C%E6%A5%AD/egim/index.html')).toBe('/Users/someone/作業/egim');
  });

  it('Windows：ドライブ名の前の / を2つとも取る', () => {
    expect(pluginDirFromUrlPath('//D:/works/egim/dist/index.html')).toBe('D:/works/egim/dist');
  });

  it('Windows：/ が1つでも取る', () => {
    expect(pluginDirFromUrlPath('/C:/plugins/egim/index.html')).toBe('C:/plugins/egim');
  });

  it('ドライブの直下', () => {
    expect(pluginDirFromUrlPath('//D:/index.html')).toBe('D:/');
  });
});
