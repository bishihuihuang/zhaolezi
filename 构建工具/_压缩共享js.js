/**
 * V2.9.7（1C）：共享 JS 构建期压缩（esbuild，keepNames 保留全局名供内联事件使用）
 * 用法：node _压缩共享js.js  （由 _混淆工具.js 在构建时自动调用；esbuild 缺失则跳过）
 * 压缩对象：assets/js/ 下的共享脚本（含 17-data.js 数据文件），原文件覆盖写回。
 */
const fs = require('fs');
const path = require('path');

let esbuild = null;
try { esbuild = require('esbuild'); } catch (e) { console.log('[压缩] 未安装 esbuild（npm i -D esbuild），跳过共享 JS 压缩'); process.exit(0); }

const DIR = path.join(__dirname, '..', 'assets', 'js');
const FILES = [
    'common.js', 'zl-features.js', 'zl-glass.js', 'theme.js',
    'xd-common.js', 'xd-features.js', 'xd-theme.js', 'xd-zoom-capture.js',
    'cy-common.js', 'cy-features.js', 'cy-dashboard.js', 'cy-theme.js', 'cy-theme-init.js',
    '17-data.js', 'zl-search-index.js',
];

let saved = 0, failed = 0, skipped = 0;
for (const f of FILES) {
    const p = path.join(DIR, f);
    if (!fs.existsSync(p)) { skipped++; continue; }
    const src = fs.readFileSync(p, 'utf8');
    if (src.startsWith('/*ZL-OBF-V2*/')) { skipped++; continue; } // 已混淆的不动
    try {
        const out = esbuild.transformSync(src, {
            minify: true,
            keepNames: true,          // 顶层函数名保留：内联 onclick / autoAttachGlobals 依赖
            legalComments: 'none',
            target: ['es2018'],
            charset: 'utf8',
        });
        const code = '/*ZL-MIN-V1*/\n' + out.code;
        if (code.length < src.length) {
            saved += src.length - code.length;
            fs.writeFileSync(p, code, 'utf8');
        } else { skipped++; }
    } catch (e) {
        failed++;
        console.log('[压缩] 失败 ' + f + ': ' + String(e.message).slice(0, 100));
    }
}
console.log(`[压缩] 共享 JS 完成：节省 ${(saved / 1024).toFixed(0)}KB，跳过 ${skipped}，失败 ${failed}`);
