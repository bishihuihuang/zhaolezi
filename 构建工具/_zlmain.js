const fs = require('fs'), path = require('path');
const SRC = '_原始未混淆版';
const files = fs.readdirSync(SRC).filter(f => f.endsWith('.html'));
let hasZlMain = 0, noZlMain = [];
for (const f of files) {
  const h = fs.readFileSync(path.join(SRC, f), 'utf8');
  if (/id=["']zl-main["']/.test(h)) hasZlMain++; else noZlMain.push(f);
}
console.log('源页有 id=zl-main:', hasZlMain, '/', files.length);
console.log('无 zl-main（构建时不会注入skip-link）:', noZlMain.length, '→', noZlMain.slice(0, 10).join(', '));
// 看 COMMON_CSS 注入是无条件的吗：重看 L925-1015 关键判断
