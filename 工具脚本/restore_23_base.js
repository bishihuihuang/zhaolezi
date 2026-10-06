/* restore_23_base.js — 从 git 历史取回 23.html 的原始 CSS 基线，导出为 工具脚本/23_base.css
   用途：23.html 被重建脚本误覆盖后，用历史版本里的 <style> 完整 CSS 恢复基线。
   23_base.css 内容 = BOM + <!DOCTYPE html>…<style> + 原全部 CSS（不含 </style>）
   用法：node 工具脚本/restore_23_base.js [git-ref] */
'use strict';
const fs = require('fs');
const cp = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const REF = process.argv[2] || '02d169a';
const OUT = path.join(__dirname, '23_base.css');

const old = cp.execSync('git show ' + REF + ':23.html', { cwd: ROOT, maxBuffer: 1 << 26 }).toString('utf8');
const a = old.indexOf('<style>');
const b = old.indexOf('</style>');
if (a < 0 || b < 0 || b < a) throw new Error('git 版本 ' + REF + ' 中找不到 <style> 区块');
const head = old.slice(0, b);
fs.writeFileSync(OUT, head, 'utf8');

const must = ['<!DOCTYPE html>', '<style>', '.bg-animation', '.orb-1', 'main {', '.container', '.grid',
    '.title-area', '.back-area', '.dictionary-area', '.search-box', '.search-input', '.search-btn',
    '.filter-tabs', '.tab-btn', '.result-list', '.result-card', '.empty-state', '.overlay', '.loader-ring',
    '@media (max-width: 900px)', '@media (max-width: 600px)', '@media (max-width: 480px)'];
const miss = must.filter(function (k) { return head.indexOf(k) < 0; });
console.log('git ref: ' + REF);
console.log('基线长度: ' + head.length + ' 字符 / ' + Buffer.byteLength(head) + ' 字节');
console.log(miss.length ? '缺失关键选择器: ' + miss.join(', ') : '关键选择器全部齐备');
console.log('已导出: ' + OUT);
process.exit(miss.length === 0 ? 0 : 1);
