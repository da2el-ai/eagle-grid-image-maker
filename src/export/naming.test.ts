import { describe, expect, it } from 'vitest';
import { extensionOf, pageFileNames, renumberedBase, splitChosenPath } from './naming';

describe('extensionOf', () => {
  it('JPEG は jpg', () => {
    expect([extensionOf('jpeg'), extensionOf('png'), extensionOf('webp')]).toEqual(['jpg', 'png', 'webp']);
  });
});

describe('splitChosenPath', () => {
  it('フォルダと名前に分け、画像の拡張子を外す', () => {
    expect(splitChosenPath('/a/b/grid.jpg')).toEqual({ dir: '/a/b', base: 'grid' });
    expect(splitChosenPath('/a/b/grid.PNG')).toEqual({ dir: '/a/b', base: 'grid' });
    expect(splitChosenPath('D:\\out\\比較.webp')).toEqual({ dir: 'D:\\out', base: '比較' });
  });

  it('画像の拡張子でなければ名前の一部として残す', () => {
    expect(splitChosenPath('/a/v1.2')).toEqual({ dir: '/a', base: 'v1.2' });
    expect(splitChosenPath('/a/grid')).toEqual({ dir: '/a', base: 'grid' });
  });

  it('名前が空なら grid', () => {
    expect(splitChosenPath('/a/.jpg')).toEqual({ dir: '/a', base: 'grid' });
  });
});

describe('pageFileNames', () => {
  it('1ページだけなら連番なし', () => {
    expect(pageFileNames('grid', 'png', 1)).toEqual(['grid.png']);
  });
  it('複数ページなら2桁の連番', () => {
    expect(pageFileNames('grid', 'jpg', 3)).toEqual(['grid_01.jpg', 'grid_02.jpg', 'grid_03.jpg']);
    expect(pageFileNames('grid', 'jpg', 32).at(-1)).toBe('grid_32.jpg');
  });
});

describe('renumberedBase', () => {
  it('どのページもぶつからない最小の番号', () => {
    const existing = new Set(['grid_01.png', 'grid-2_02.png']);
    expect(renumberedBase('grid', 'png', 2, (n) => existing.has(n))).toBe('grid-3');
  });
  it('1ページだけ', () => {
    expect(renumberedBase('grid', 'png', 1, (n) => n === 'grid.png')).toBe('grid-2');
  });
});
