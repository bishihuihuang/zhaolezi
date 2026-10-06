/* 成就接线审计：找出「指标无人写入」与「条件型成就的可达成性」
 * 运行：node 工具脚本/audit_ach_wiring.js
 * 说明：产物内联 JS 是 eval(atob(BASE64))，grep 产物必为 0 命中，故这里解码后再扫。 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

/* 解码页面内联脚本（含根目录独占页） */
function fullText(file) {
  const t = read(file);
  let dec = '';
  const re = /<script[^>]*>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(t))) {
    if (/src=/.test(m[0])) continue;
    const mm = m[1].match(/\("([A-Za-z0-9+/=]+")\)\s*;?\s*$/);
    if (mm) dec += Buffer.from(mm[1], 'base64').toString('utf8');
  }
  return t + '\n@@DECODED@@\n' + dec;
}

/* ---------- 解析成就目录 ---------- */
const zl = read('zl-features.js');
const block = zl.match(/ZL\.ACHIEVEMENTS = \[([\s\S]*?)\n    \];/)[1];
const lines = block.split('\n');
const defs = {};
let cur = null;
for (const ln of lines) {
  const m = ln.match(/^\s*\{\s*id: '([a-z0-9_]+)'/);
  if (m) { cur = m[1]; defs[cur] = ln; continue; }
  if (cur) defs[cur] += ln;
}
const byMetric = {}, byCond = {}, noTarget = [];
for (const [id, raw] of Object.entries(defs)) {
  const mm = raw.match(/metric: '([^']+)'/);
  const tm = raw.match(/target: (\d+)/);
  if (mm) {
    (byMetric[mm[1]] ||= []).push(id + (tm ? '(' + tm[1] + ')' : ''));
    if (!tm) noTarget.push(id);
  } else {
    const c = raw.match(/cond: function\s*[^{]*\{([^\}]*?)\}/);
    byCond[id] = c ? c[1].replace(/\s+/g, ' ').trim() : '(cond 未匹配，需人工看)';
  }
}

/* ---------- 扫描全站 bump 写入点 ---------- */
const wrote = {};
const mark = (metric, at) => { (wrote[metric] ||= []).push(at); };
const scan = (text, at) => { for (const m of text.matchAll(/ZL\.bump\(\s*'([^']+)'/g)) mark(m[1], at); };

for (const f of fs.readdirSync(path.join(ROOT, '_原始未混淆版')).filter(f => f.endsWith('.html'))) {
  scan(read('_原始未混淆版/' + f), '源/' + f);
}
for (const f of fs.readdirSync(ROOT).filter(f => f.endsWith('.html') && !fs.existsSync(path.join(ROOT, '_原始未混淆版', f)))) {
  scan(fullText(f), f + '(根独占·已解码)');
}
for (const f of ['zl-features.js', 'common.js', 'theme.js']) if (fs.existsSync(path.join(ROOT, f))) scan(read(f), f);

/* ---------- 输出 ---------- */
console.log('========================================');
console.log('  成就接线审计 V2.2.0');
console.log('========================================');
console.log('成就总数: ' + Object.keys(defs).length + '（指标型 ' + Object.keys(defs).length - Object.keys(byCond).length + ' / 条件型 ' + Object.keys(byCond).length + '）');
console.log('指标种类: ' + Object.keys(byMetric).length + '，有写入点的: ' + Object.keys(wrote).length);
console.log('\n【1】指标驱动成就');
const orphans = [];
for (const metric of Object.keys(byMetric).sort()) {
  const srcs = wrote[metric] || [];
  if (!srcs.length) orphans.push(metric);
  console.log('  [' + (srcs.length ? 'OK  ' : '孤儿') + '] ' + metric.padEnd(14) + ' → ' + byMetric[metric].join(', ') + (srcs.length ? '  ← ' + srcs.join(', ') : ''));
}
console.log('\n【2】孤儿指标（无人写入，成就永不可达）: ' + orphans.length);
for (const m of orphans) console.log('      ' + m + ' → ' + byMetric[m].join(', '));
console.log('\n【3】缺 target 的指标型成就: ' + (noTarget.length || '无'));
for (const id of noTarget) console.log('      ' + id);
console.log('\n【4】条件型成就判据（' + Object.keys(byCond).length + '）');
for (const [id, c] of Object.entries(byCond)) console.log('  ' + id.padEnd(20) + c);
