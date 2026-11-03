/* 灵感引擎 Muse — 图标生成器
 * 零依赖：手写 PNG 编码器（zlib deflateRaw）+ ICO（PNG-in-ICO）封装
 * 输出：favicon.svg / favicon-48.png / icon-192.png / icon-512.png / favicon.ico
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..');

/* ---------- 最小 PNG 编码器 ---------- */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePNG(size, pixelFn) {
  const w = size, h = size;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  let o = 0;
  for (let y = 0; y < h; y++) {
    raw[o++] = 0; // filter: none
    for (let x = 0; x < w; x++) {
      const [r, g, b, a] = pixelFn(x, y, w, h);
      raw[o++] = r; raw[o++] = g; raw[o++] = b; raw[o++] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type: RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateRawSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

/* ---------- 设计：圆角胶囊底 + 火花（灵感）几何 ---------- */
function inRoundedRect(x, y, x0, y0, x1, y1, r) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const rx = Math.min(Math.max(x, x0 + r), x1 - r);
  const ry = Math.min(Math.max(y, y0 + r), y1 - r);
  const dx = x - rx, dy = y - ry;
  return dx * dx + dy * dy <= r * r;
}
function lerp(a, b, t) { return a + (b - a) * t; }
function hex(c) {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const C1 = hex('#6366f1'), C2 = hex('#a855f7'), C3 = hex('#22d3ee');
function grad(t) {
  // 三段渐变：indigo -> purple -> cyan
  if (t < 0.5) { const u = t / 0.5; return [lerp(C1[0], C2[0], u), lerp(C1[1], C2[1], u), lerp(C1[2], C2[2], u)]; }
  const u = (t - 0.5) / 0.5;
  return [lerp(C2[0], C3[0], u), lerp(C2[1], C3[1], u), lerp(C2[2], C3[2], u)];
}

// 火花：4 角星（灵感迸发），参数化到 0..1 归一化坐标
function inSpark(nx, ny) {
  // nx,ny ∈ [-1,1]
  const ax = Math.abs(nx), ay = Math.abs(ny);
  return ax + ay <= 1.02 && !(ax + ay <= 0.30 && (ax * 0.6 + ay) <= 0.30);
}

function makeIcon(size) {
  return encodePNG(size, (x, y, w, h) => {
    const px = (x + 0.5) / size, py = (y + 0.5) / size;
    let r = 0, g = 0, b = 0, a = 0;

    // 圆角矩形底板
    if (inRoundedRect(x + 0.5, y + 0.5, 0, 0, size - 1, size - 1, size * 0.22)) {
      const c = grad((px + py) / 2);
      r = c[0]; g = c[1]; b = c[2]; a = 255;
    }
    // 火花（白色，带柔光）
    const nx = (px - 0.5) * 2.0, ny = (py - 0.5) * 2.0;
    const sp = inSpark(nx, ny);
    const dist = Math.sqrt(nx * nx + ny * ny);
    if (sp && dist < 0.92) {
      const glow = Math.min(1, (0.92 - dist) / 0.22);
      r = lerp(r, 255, 0.88 + glow * 0.12);
      g = lerp(g, 255, 0.90);
      b = lerp(b, 255, 0.92);
    } else if (dist < 0.75 && a > 0) {
      // 火花外柔光环
      const halo = Math.max(0, 1 - (dist - 0.5) / 0.25) * 0.16;
      r = Math.min(255, r + 60 * halo);
      g = Math.min(255, g + 60 * halo);
      b = Math.min(255, b + 60 * halo);
    }
    // 左上高光（玻璃质感）
    if (a > 0) {
      const hl = Math.max(0, 1 - Math.hypot((px - 0.28) / 0.42, (py - 0.22) / 0.34));
      r = Math.min(255, r + 42 * hl);
      g = Math.min(255, g + 42 * hl);
      b = Math.min(255, b + 42 * hl);
    }
    // 右下阴影
    if (a > 0) {
      const sh = Math.max(0, 1 - Math.hypot((px - 0.78) / 0.46, (py - 0.8) / 0.4)) * 0.28;
      r *= 1 - sh; g *= 1 - sh; b *= 1 - sh;
    }
    return [r | 0, g | 0, b | 0, a | 0];
  });
}

/* ---------- SVG（网页 favicon 主用，体积小、任意缩放） ---------- */
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#6366f1"/>
      <stop offset="0.52" stop-color="#a855f7"/>
      <stop offset="1" stop-color="#22d3ee"/>
    </linearGradient>
    <linearGradient id="s" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#dbe7ff"/>
    </linearGradient>
  </defs>
  <rect width="100" height="100" rx="22" fill="url(#g)"/>
  <ellipse cx="28" cy="22" rx="34" ry="24" fill="#ffffff" opacity="0.16"/>
  <path d="M50 12 L57 43 L88 50 L57 57 L50 88 L43 57 L12 50 L43 43 Z" fill="url(#s)"/>
  <circle cx="50" cy="50" r="6.5" fill="#a855f7" opacity="0.55"/>
</svg>
`;

/* ---------- ICO：ICONDIR + 目录项 + 内嵌 PNG ---------- */
function makeICO(sizes) {
  const pngs = sizes.map(s => makeIcon(s));
  const head = Buffer.alloc(6);
  head.writeUInt16LE(0, 0);          // reserved
  head.writeUInt16LE(1, 2);          // type: icon
  head.writeUInt16LE(sizes.length, 4);
  const entries = Buffer.alloc(16 * sizes.length);
  let off = 22;
  for (let i = 0; i < sizes.length; i++) {
    const s = sizes[i], d = pngs[i];
    entries[i * 16 + 0] = s >= 256 ? 0 : s;      // width
    entries[i * 16 + 1] = s >= 256 ? 0 : s;      // height
    entries[i * 16 + 2] = 0;                      // palette
    entries[i * 16 + 3] = 0;                      // reserved
    entries.writeUInt16LE(1, i * 16 + 4);         // color planes
    entries.writeUInt16LE(32, i * 16 + 6);        // bpp
    entries.writeUInt32LE(d.length, i * 16 + 8);  // size
    entries.writeUInt32LE(off, i * 16 + 12);      // offset
    off += d.length;
  }
  return Buffer.concat([head, entries, ...pngs]);
}

/* ---------- 输出 ---------- */
fs.writeFileSync(path.join(ROOT, 'favicon.svg'), SVG);
fs.writeFileSync(path.join(ROOT, 'favicon-48.png'), makeIcon(48));
fs.writeFileSync(path.join(ROOT, 'icon-192.png'), makeIcon(192));
fs.writeFileSync(path.join(ROOT, 'icon-512.png'), makeIcon(512));
fs.writeFileSync(path.join(ROOT, 'favicon.ico'), makeICO([48, 192, 512]));

const report = ['favicon.svg', 'favicon-48.png', 'icon-192.png', 'icon-512.png', 'favicon.ico']
  .map(f => f + ' ' + (fs.statSync(path.join(ROOT, f)).size / 1024).toFixed(1) + ' KB');
console.log('图标生成完成：');
report.forEach(l => console.log('  ' + l));
