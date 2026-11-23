// 文言ファイル（プラグインのフォルダの locales/*.json）を実行時に読み込む
// 言語を足すときは、locales/ にファイルを1つ置けばよい（ビルドし直さなくてよい）
import { nodeFs, nodePath } from '../platform/node';
import { pluginDir } from '../platform/plugin-dir';
import { FALLBACK_LOCALE, format, lookup, resolveLocale, type Messages } from './resolve';

let messages: Messages = {};
let fallback: Messages = {};
let current = FALLBACK_LOCALE;

function localesDir(): string {
  return nodePath().join(pluginDir(), 'locales');
}

function readMessages(name: string): Messages {
  const file = nodePath().join(localesDir(), `${name}.json`);
  return JSON.parse(nodeFs().readFileSync(file, 'utf8')) as Messages;
}

// 置いてある文言ファイルの名前（拡張子なし）
export function availableLocales(): string[] {
  return nodeFs()
    .readdirSync(localesDir())
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.slice(0, -'.json'.length));
}

// Eagle の言語に合わせて文言を読み込む
export function initI18n(eagleLocale: string | undefined): string {
  fallback = readMessages(FALLBACK_LOCALE);
  current = resolveLocale(eagleLocale, availableLocales());
  messages = current === FALLBACK_LOCALE ? fallback : readMessages(current);
  document.documentElement.lang = current;
  return current;
}

export function currentLocale(): string {
  return current;
}

// 文言を引く。{name} の形の差し込みを params で埋める
export function t(key: string, params?: Record<string, string | number>): string {
  return format(lookup(key, messages, fallback), params);
}
