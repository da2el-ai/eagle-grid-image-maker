// OS に入っているフォントの一覧（01 の 6.4）
// queryLocalFonts() は許可を待ったまま止まることがある（TV-12）ので、一定時間で打ち切る

interface LocalFontData {
  family: string;
}

type QueryLocalFonts = () => Promise<LocalFontData[]>;

const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });

// フォントのファミリー名を重ねずに並べる。取れなければ null
export async function listLocalFonts(timeoutMs = 2000): Promise<string[] | null> {
  const query = (globalThis as { queryLocalFonts?: QueryLocalFonts }).queryLocalFonts;
  if (typeof query !== 'function') return null;
  try {
    const fonts = await Promise.race([
      query(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);
    if (!fonts) return null;
    const families = [...new Set(fonts.map((f) => f.family).filter((f) => f && !f.startsWith('.')))];
    return families.sort(collator.compare);
  } catch {
    return null;
  }
}
