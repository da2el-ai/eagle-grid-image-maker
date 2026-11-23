import { describe, expect, it } from 'vitest';
import { orientedSize, placement, type PlacementOptions } from './placement';

const opts = (over: Partial<PlacementOptions> = {}): PlacementOptions => ({
  fit: 'contain',
  upscale: false,
  orient: 'none',
  rotDir: 'cw',
  ...over,
});

describe('placement：Contain', () => {
  it('全体をセルに収め、中央に置く', () => {
    const p = placement(800, 400, 320, 320, opts());
    expect([p.dw, p.dh, p.dx, p.dy]).toEqual([320, 160, 0, 80]);
    expect(p.crop).toEqual({ left: 0, top: 0, width: 320, height: 160 });
    expect([p.destX, p.destY]).toEqual([0, 80]);
  });

  it('小さい画像は拡大しない', () => {
    const p = placement(100, 50, 320, 320, opts());
    expect([p.dw, p.dh, p.scale]).toEqual([100, 50, 1]);
    expect([p.dx, p.dy]).toEqual([110, 135]);
  });

  it('拡大する設定なら、セルに合わせて拡大する', () => {
    const p = placement(100, 50, 320, 320, opts({ upscale: true }));
    expect([p.dw, p.dh]).toEqual([320, 160]);
  });
});

describe('placement：Cover', () => {
  it('セルを埋め、はみ出しを切り抜く', () => {
    const p = placement(800, 400, 320, 320, opts({ fit: 'cover' }));
    expect([p.dw, p.dh, p.dx, p.dy]).toEqual([640, 320, -160, 0]);
    expect(p.crop).toEqual({ left: 160, top: 0, width: 320, height: 320 });
    expect([p.destX, p.destY]).toEqual([0, 0]);
  });

  it('拡大しない設定の小さい画像は、セルを埋めない', () => {
    const p = placement(100, 50, 320, 320, opts({ fit: 'cover' }));
    expect([p.dw, p.dh]).toEqual([100, 50]);
    expect(p.crop).toEqual({ left: 0, top: 0, width: 100, height: 50 });
  });

  it('丸めの誤差があってもセルを埋める', () => {
    const p = placement(333, 1000, 100, 100, opts({ fit: 'cover' }));
    expect(p.crop.width).toBe(100);
    expect(p.crop.height).toBe(100);
  });
});

describe('placement：向き揃え', () => {
  it('縦長に合わせる：横長の画像を時計回りに回す', () => {
    const p = placement(800, 400, 320, 320, opts({ orient: 'portrait' }));
    expect(p.rot).toBe(90);
    expect([p.rw, p.rh]).toEqual([400, 800]);
    expect([p.dw, p.dh]).toEqual([160, 320]);
  });

  it('反時計回りも選べる', () => {
    expect(placement(800, 400, 320, 320, opts({ orient: 'portrait', rotDir: 'ccw' })).rot).toBe(-90);
  });

  it('縦長に合わせる：縦長と正方形の画像は回さない', () => {
    expect(placement(400, 800, 320, 320, opts({ orient: 'portrait' })).rot).toBe(0);
    expect(placement(500, 500, 320, 320, opts({ orient: 'portrait' })).rot).toBe(0);
  });

  it('横長に合わせる：縦長の画像を回す', () => {
    expect(placement(400, 800, 320, 320, opts({ orient: 'landscape' })).rot).toBe(90);
    expect(placement(800, 400, 320, 320, opts({ orient: 'landscape' })).rot).toBe(0);
  });
});

describe('orientedSize', () => {
  it('EXIF の Orientation 5〜8 は幅と高さを入れ替える', () => {
    expect(orientedSize(400, 300, 6)).toEqual({ width: 300, height: 400 });
    expect(orientedSize(400, 300, 3)).toEqual({ width: 400, height: 300 });
    expect(orientedSize(400, 300)).toEqual({ width: 400, height: 300 });
  });
});
