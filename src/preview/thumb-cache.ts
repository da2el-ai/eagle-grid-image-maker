// プレビュー用のサムネイルの読み込みとキャッシュ（01 の 7 章）
// - Eagle のサムネイルだけを使い、拡大しても元画像に切り替えない
// - 表示しているページの分だけを残す（ページを移ったら、ほかは捨てる）

export type ThumbState = 'loading' | 'ok' | 'broken';

export interface ThumbEntry {
  state: ThumbState;
  img: HTMLImageElement | null;
}

export class ThumbCache {
  private map = new Map<string, ThumbEntry>();

  // 1枚読み終わるたびに呼ぶ（描き直しの合図）
  constructor(private onChange: () => void) {}

  // key は アイテム ID。url が変わったら読み直す
  get(key: string, url: string): ThumbEntry {
    const cacheKey = `${key}\n${url}`;
    let e = this.map.get(cacheKey);
    if (e) return e;
    e = { state: 'loading', img: null };
    this.map.set(cacheKey, e);
    const entry = e;
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    img
      .decode()
      .then(() => {
        entry.state = 'ok';
        entry.img = img;
      })
      .catch(() => {
        entry.state = 'broken';
      })
      .finally(() => {
        // 捨てたあとに読み終わったものは知らせない
        if (this.map.get(cacheKey) === entry) this.onChange();
      });
    return entry;
  }

  // 指定したもの以外を捨てる
  retainOnly(keys: Iterable<string>): void {
    const keep = new Set(keys);
    for (const k of [...this.map.keys()]) {
      if (!keep.has(k.split('\n')[0])) {
        const e = this.map.get(k);
        if (e?.img) e.img.src = '';
        this.map.delete(k);
      }
    }
  }

  get size(): number {
    return this.map.size;
  }

  // 読み込み中の枚数
  get loading(): number {
    let n = 0;
    for (const e of this.map.values()) if (e.state === 'loading') n++;
    return n;
  }

  // 読めなかったサムネイルのキー
  brokenKeys(): string[] {
    return [...this.map.entries()].filter(([, e]) => e.state === 'broken').map(([k]) => k.split('\n')[0]);
  }
}
