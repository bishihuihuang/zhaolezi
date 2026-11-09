const fs = require('fs'), path = require('path');
const SRC = '_原始未混淆版';
const files = fs.readdirSync(SRC).filter(f => f.endsWith('.html'));
const cssRef = {}; let noCss = [];
for (const f of files) {
  const h = fs.readFileSync(path.join(SRC, f), 'utf8');
  const m = [...h.matchAll(/<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/gi)].map(x => x[1]);
  m.forEach(c => cssRef[c] = (cssRef[c] || 0) + 1);
  if (!m.length) noCss.push(f);
}
console.log('CSS引用统计（源页 → link stylesheet href）:');
Object.entries(cssRef).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log('  ' + v + '\t' + k));
console.log('无外部css页数:', noCss.length, noCss.slice(0, 8).join(','));
// 同时看 index.html 的样式来源
const idx = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');
console.log('\nindex.html link:', [...idx.matchAll(/<link[^>]*href=["']([^"']+)["']/gi)].map(x => x[1]).join(', '));
console.log('index.html 内联<style>块数:', (idx.match(/<style/gi) || []).length);
