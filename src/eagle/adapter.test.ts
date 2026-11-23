import { describe, expect, it } from 'vitest';
import type { EagleItem } from '../types/eagle';
import { toGridItems } from './adapter';

const raw = (id: string, name: string, ext: string, over: Partial<EagleItem> = {}): EagleItem => ({
  id,
  name,
  ext,
  width: 100,
  height: 50,
  size: 1,
  importedAt: 10,
  modifiedAt: 10,
  filePath: `/lib/${id}/${name}.${ext}`,
  fileURL: `file:///lib/${id}/${name}.${ext}`,
  thumbnailPath: `/lib/${id}/${name}_thumbnail.png`,
  thumbnailURL: `file:///lib/${id}/${name}_thumbnail.png`,
  ...over,
});

describe('toGridItems', () => {
  it('対応する形式だけを、選択順を保って取り込む', () => {
    const r = toGridItems([raw('1', 'a', 'png'), raw('2', 'b', 'mp4'), raw('3', 'c', 'JPG'), raw('4', 'd', 'gif'), raw('5', 'e', 'webp')], () => true);
    expect(r.items.map((x) => [x.id, x.ext, x.selectionIndex])).toEqual([
      ['1', 'png', 0],
      ['3', 'jpg', 2],
      ['4', 'gif', 3],
      ['5', 'webp', 4],
    ]);
    expect(r.failures).toEqual([{ id: '2', name: 'b.mp4', reason: 'unsupported' }]);
  });

  it('元画像がない画像は飛ばして続ける', () => {
    const r = toGridItems([raw('1', 'a', 'png'), raw('2', 'b', 'png')], (p) => !p.includes('/2/'));
    expect(r.items.map((x) => x.id)).toEqual(['1']);
    expect(r.failures).toEqual([{ id: '2', name: 'b.png', reason: 'missing' }]);
  });

  it('サムネイルがない画像は、元画像を使う', () => {
    const r = toGridItems([raw('1', 'a', 'png', { thumbnailPath: '', thumbnailURL: '' })], () => true);
    expect(r.items[0].thumbnailPath).toBe('/lib/1/a.png');
    expect(r.items[0].thumbnailURL).toBe('file:///lib/1/a.png');
  });
});
