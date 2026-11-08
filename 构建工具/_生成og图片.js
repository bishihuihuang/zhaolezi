/**
 * V2.9.7（6A）：生成品牌分享图 assets/images/og-default.png（1200×630，无文字避免字体依赖）
 * 用法：node _生成og图片.js （由 _混淆工具.js 自动调用；sharp 缺失或文件已存在则跳过）
 */
const fs = require('fs');
const path = require('path');

let sharp = null;
try { sharp = require('sharp'); } catch (e) { console.log('[OG] 未安装 sharp（npm i -D sharp），跳过 og-default 生成'); process.exit(0); }

const OUT = path.join(__dirname, '..', 'assets', 'images', 'og-default.png');
if (fs.existsSync(OUT)) { console.log('[OG] og-default.png 已存在，跳过'); process.exit(0); }

/* 找乐子品牌：暗底 + 金粉渐变光斑 + 大圆点（与站点视觉一致） */
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0a0e1f"/><stop offset="1" stop-color="#171d36"/>
    </linearGradient>
    <radialGradient id="a" cx="0.2" cy="0.15" r="0.5">
      <stop offset="0" stop-color="#ff6b6b" stop-opacity="0.55"/><stop offset="1" stop-color="#ff6b6b" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="b" cx="0.5" cy="0.1" r="0.55">
      <stop offset="0" stop-color="#f6d365" stop-opacity="0.6"/><stop offset="1" stop-color="#f6d365" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="c" cx="0.8" cy="0.85" r="0.6">
      <stop offset="0" stop-color="#7c5cff" stop-opacity="0.6"/><stop offset="1" stop-color="#7c5cff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="d" cx="0.15" cy="0.85" r="0.5">
      <stop offset="0" stop-color="#38ef7d" stop-opacity="0.45"/><stop offset="1" stop-color="#38ef7d" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <rect width="1200" height="630" fill="url(#a)"/>
  <rect width="1200" height="630" fill="url(#b)"/>
  <rect width="1200" height="630" fill="url(#c)"/>
  <rect width="1200" height="630" fill="url(#d)"/>
  <circle cx="600" cy="315" r="128" fill="#F6D365"/>
  <circle cx="600" cy="315" r="62" fill="#181818"/>
  <rect x="180" y="560" width="840" height="6" rx="3" fill="#f6d365" opacity="0.85"/>
</svg>`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
sharp(Buffer.from(SVG)).png({ compressionLevel: 9 }).toFile(OUT)
    .then(info => console.log(`[OG] og-default.png 生成完成（${Math.round(info.size / 1024)}KB）`))
    .catch(e => { console.log('[OG] 生成失败：' + e.message); process.exit(0); });
