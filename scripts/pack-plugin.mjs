// release/ を ZIP にして .eagleplugin を作る（Eagle の「Pack Plugin」と同じ中身）
// - ファイルは Deflate で圧縮し、フォルダは圧縮なしで入れる（Pack Plugin と同じ）
// - 名前が . で始まるファイル・フォルダは入れない（Pack Plugin と同じ）
// - ファイル名は eagle-grid-image-maker-<版>-<platform>-<arch>.eagleplugin
// 使い方：node scripts/pack-plugin.mjs [出力先フォルダ]（省略すると .cache/pack/）
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = path.join(root, 'release');
const outDir = path.resolve(process.argv[2] ?? path.join(root, '.cache', 'pack'));

// CRC-32（Node 18 には zlib.crc32 がないので自前で計算する）
const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// ZIP に書く日時（DOS 形式）
function dosTime(d) {
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { time, date };
}

// 入れるものを集める。フォルダは名前の最後に / を付ける。区切りは / にする
function collect(dir, rel = '') {
  const list = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    if (!rel && e.name.endsWith('.eagleplugin')) continue;
    const full = path.join(dir, e.name);
    const name = rel + e.name;
    if (e.isDirectory()) {
      list.push({ name: `${name}/`, full, dir: true });
      list.push(...collect(full, `${name}/`));
    } else if (e.isFile()) {
      list.push({ name, full, dir: false });
    }
  }
  return list;
}

function pack(entries, outFile) {
  const fd = fs.openSync(outFile, 'w');
  const central = [];
  let offset = 0;
  const write = (buf) => {
    fs.writeSync(fd, buf);
    offset += buf.length;
  };
  try {
    for (const e of entries) {
      const nameBuf = Buffer.from(e.name, 'utf8');
      const data = e.dir ? Buffer.alloc(0) : fs.readFileSync(e.full);
      const crc = crc32(data);
      // 8 は Deflate、0 は圧縮なし
      const method = e.dir ? 0 : 8;
      const body = e.dir ? data : zlib.deflateRawSync(data, { level: 9 });
      const ver = e.dir ? 10 : 20;
      const { time, date } = dosTime(fs.statSync(e.full).mtime);
      if (data.length >= 0xffffffff || body.length >= 0xffffffff || offset >= 0xffffffff) throw new Error('4GB を超えるファイルは扱えません');
      // ローカルファイルヘッダー。0x0800 はファイル名が UTF-8 である印
      const local = Buffer.alloc(30);
      local.writeUInt32LE(0x04034b50, 0);
      local.writeUInt16LE(ver, 4);
      local.writeUInt16LE(0x0800, 6);
      local.writeUInt16LE(method, 8);
      local.writeUInt16LE(time, 10);
      local.writeUInt16LE(date, 12);
      local.writeUInt32LE(crc, 14);
      local.writeUInt32LE(body.length, 18);
      local.writeUInt32LE(data.length, 22);
      local.writeUInt16LE(nameBuf.length, 26);
      local.writeUInt16LE(0, 28);
      const at = offset;
      write(local);
      write(nameBuf);
      write(body);
      // セントラルディレクトリの項目
      const c = Buffer.alloc(46);
      c.writeUInt32LE(0x02014b50, 0);
      c.writeUInt16LE(0x031e, 4); // 作った環境：Unix・3.0（属性を Unix の形で書く）
      c.writeUInt16LE(ver, 6);
      c.writeUInt16LE(0x0800, 8);
      c.writeUInt16LE(method, 10);
      c.writeUInt16LE(time, 12);
      c.writeUInt16LE(date, 14);
      c.writeUInt32LE(crc, 16);
      c.writeUInt32LE(body.length, 20);
      c.writeUInt32LE(data.length, 24);
      c.writeUInt16LE(nameBuf.length, 28);
      // 外部属性：上位 16 ビットが Unix の権限。下位はフォルダの印（MS-DOS）
      const mode = e.dir ? 0o40755 : 0o100644;
      c.writeUInt32LE(((mode << 16) | (e.dir ? 0x10 : 0)) >>> 0, 38);
      c.writeUInt32LE(at, 42);
      central.push(Buffer.concat([c, nameBuf]));
    }
    const cdStart = offset;
    for (const c of central) write(c);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(central.length, 8);
    end.writeUInt16LE(central.length, 10);
    end.writeUInt32LE(offset - cdStart, 12);
    end.writeUInt32LE(cdStart, 16);
    write(end);
  } finally {
    fs.closeSync(fd);
  }
}

const manifestFile = path.join(srcDir, 'manifest.json');
if (!fs.existsSync(manifestFile)) {
  console.error('release/manifest.json がありません。先に npm run build:release を実行してください');
  process.exit(1);
}
const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
if (manifest.platform === 'all' || manifest.devTools) {
  console.error('release/ が配布用のビルドではありません（platform か devTools が違います）');
  process.exit(1);
}
const name = `${manifest.id}-${manifest.version}-${manifest.platform}-${manifest.arch}.eagleplugin`;
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, name);
const entries = collect(srcDir);
pack(entries, outFile);
console.log(`${path.relative(root, outFile)}（${entries.length} 項目・${(fs.statSync(outFile).size / 1024 / 1024).toFixed(1)} MB）`);
