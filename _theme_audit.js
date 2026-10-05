/* ============================================================
 * 主题变量化审计：扫描各页面硬编码颜色，输出「已变量化/待迁移」清单
 * 用法：node _theme_audit.js
 * 原则：--zl-* 是产品级接口；本脚本给出治理依据而非自动改写
 * ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '_原始未混淆版');
const HEX = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;
// 主题块/公共样式引用 var(-- 的页面视为"已接入变量体系"（可能有少量遗留硬编码）
const files = fs.readdirSync(SRC).filter(f => /\.html$/i.test(f));

let total = 0;
const rows = [];
for (const f of files) {
    const full = path.join(SRC, f);
    const src = fs.readFileSync(full, 'utf8');
    const hexes = src.match(HEX) || [];
    const usesVar = /var\(--zl-|var\(--[a-z]/.test(src);
    const isObfuscated = /base64,.{20,}/.test(src); // 构建过的不审计源码层
    rows.push({ f, n: hexes.length, usesVar, obf: isObfuscated });
    total += hexes.length;
}

rows.sort((a, b) => b.n - a.n);
console.log('========== 主题变量化审计（源码层）==========');
console.log('页面数: ' + files.length + '  硬编码色总数: ' + total + '  已接入变量: ' + rows.filter(r => r.usesVar).length + ' 页');
console.log('\n--- 硬编码色 Top 10（按降序）---');
for (const r of rows.slice(0, 10)) {
    console.log((r.usesVar ? '[已变量化] ' : '[未接变量] ') + r.f + '  ' + r.n + ' 处');
}
console.log('\n--- 治理建议优先级：未接入变量体系的页面，新改动引用 --zl-*；已接入页可逐步清理遗留 ---');
module.exports = { rows, total };