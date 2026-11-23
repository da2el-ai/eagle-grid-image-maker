import { describe, expect, it } from 'vitest';
import { canSave, checkOutput } from './limits';

const ok = { width: 1000, height: 1000, format: 'jpeg' as const, total: 4, overflow: 0 };

describe('checkOutput', () => {
  it('問題がなければ空で、保存できる', () => {
    const issues = checkOutput(ok);
    expect(issues).toEqual([]);
    expect(canSave(issues)).toBe(true);
  });

  it('画像が0枚なら保存できない', () => {
    const issues = checkOutput({ ...ok, total: 0 });
    expect(issues.map((i) => i.code)).toEqual(['empty']);
    expect(canSave(issues)).toBe(false);
  });

  it('32ページに入りきらないなら保存できない', () => {
    const issues = checkOutput({ ...ok, overflow: 5 });
    expect(issues).toEqual([{ level: 'error', code: 'overflow', params: { count: 5 } }]);
  });

  it('WebP は 16383 px まで', () => {
    expect(checkOutput({ ...ok, format: 'webp', width: 16383, height: 100 })).toEqual([]);
    const issues = checkOutput({ ...ok, format: 'webp', width: 16384, height: 100 });
    expect(issues[0]).toMatchObject({ level: 'error', code: 'formatLimit', params: { max: 16383 } });
    expect(canSave(issues)).toBe(false);
  });

  it('JPEG は 65535 px まで', () => {
    expect(checkOutput({ ...ok, width: 65536, height: 10 })[0]?.code).toBe('formatLimit');
  });

  it('PNG は寸法の上限なし。大きければ「重い」警告だけで、保存はできる', () => {
    const issues = checkOutput({ ...ok, format: 'png', width: 70000, height: 2000 });
    expect(issues.map((i) => [i.level, i.code])).toEqual([['warning', 'heavy']]);
    expect(canSave(issues)).toBe(true);
  });

  it('1ページが 400MB を超えたら「重い」警告', () => {
    // 10240 × 10240 × 4 = 400MB ちょうどは警告しない
    expect(checkOutput({ ...ok, width: 10240, height: 10240 })).toEqual([]);
    expect(checkOutput({ ...ok, width: 10241, height: 10240 })[0]?.code).toBe('heavy');
  });
});
