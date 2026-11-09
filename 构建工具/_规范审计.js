// 全量 Web规范审计器：扫描源文件夹所有页面，输出每项规范的命中数与样例
const fs = require('fs'); const path = require('path');
// 用法：node _规范审计.js [目录]  默认扫源区 _原始未混淆版；传 prod 扫产物区（pages/ + index.html，含构建注入的打磨层）
const TARGET = process.argv[2] === 'prod' ? 'prod' : 'src';
const SRC = TARGET === 'prod' ? 'pages' : '_原始未混淆版';
let files = fs.readdirSync(SRC).filter(f => f.endsWith('.html')).map(f => TARGET === 'prod' ? 'pages/' + f : f).concat(TARGET === 'prod' ? ['index.html'] : []);
const readBase = TARGET === 'prod' ? '.' : SRC;
const report = {}; const add = (k, f, extra='') => { (report[k] = report[k] || {n:0, files:[]}); report[k].n++; if(report[k].files.length<4) report[k].files.push(f+(extra?` [${extra}]`:'')); };
for (const f of files) {
  const h = fs.readFileSync(path.join(readBase, f), 'utf8');
  const lower = h.toLowerCase();
  // 可访问性
  if (!/skip[- ]?link|跳到主内容|跳转主内容|href="#main"/i.test(h)) add('缺skip-link', f);
  // icon-only button 无 aria-label：粗判 <button> 内无文本且无 aria-label
  const btns = [...h.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/gi)];
  for (const b of btns) { const tag=b[0], inner=b[1]; const hasLabel=/aria-label=/i.test(tag); const hasText=inner.replace(/<[^>]+>/g,'').trim().length>0; const iconOnly=/<[svg|i|span][^>]*class=["'][^"']*(icon|fa-|glyphicon)/i.test(inner)&&!hasText; if(iconOnly&&!hasLabel) add('icon按钮缺aria-label', f, tag.slice(0,40)); }
  // img 无 alt
  const imgs=[...h.matchAll(/<img\b[^>]*>/gi)];
  for(const im of imgs){ if(!/alt=/i.test(im[0])) add('img缺alt', f, im[0].slice(0,40)); if(!/\swidth=/i.test(im[0])||!/\sheight=/i.test(im[0])) add('img缺width/height', f, im[0].slice(0,40)); if(!/loading=["']lazy["']/i.test(im[0])) add('img缺loading=lazy', f); }
  // div/span onClick（伪按钮）
  const divClick=[...h.matchAll(/<(div|span)\b[^>]*onclick=/gi)]; if(divClick.length) add('div/span onclick伪按钮', f, `${divClick.length}处`);
  // 焦点
  if(!/focus-visible/i.test(h)&&!/:focus\b/i.test(h)) add('缺focus-visible/focus样式', f);
  if(/outline\s*:\s*(none|0)\b/i.test(h)&&!/focus-visible/i.test(h)) add('outline:none无替代', f);
  // 动效
  if(/transition\s*:\s*all\b/i.test(h)) add('transition:all', f);
  if(!/prefers-reduced-motion/i.test(h)&&/animation|transition|@keyframes/i.test(h)) add('有动效缺reduced-motion', f);
  // 缩放
  if(/user-scalable\s*=\s*no|maximum-scale\s*=\s*1/i.test(h)) add('禁缩放user-scalable=no', f);
  // 排版
  const threeDots=(h.match(/\.\.\./g)||[]).length; if(threeDots) add('...应为…', f, `${threeDots}处`);
  // color-scheme
  if(!/color-scheme/i.test(h)) add('缺color-scheme', f);
  // touch-action
  if(!/touch-action/i.test(h)) add('缺touch-action', f);
  // lang属性
  if(!/<html[^>]*lang=/i.test(h)) add('html缺lang', f);
  // viewport
  if(!/name=["']viewport["']/i.test(h)) add('缺viewport', f);
  // 表单 input 无 label/aria-label
  const inputs=[...h.matchAll(/<input\b[^>]*>/gi)];
  for(const inp of inputs){ if(!/aria-label=/i.test(inp[0])) { /* 可能用<label for>，粗略统计无aria的 */ add('input待核label', f); break; } }
}
const keys=Object.keys(report).sort((a,b)=>report[b].n-report[a].n);
console.log(`扫描页面数：${files.length}\n`);
console.log('=== 问题项（按命中页面数降序）===');
for(const k of keys){ console.log(`${report[k].n}\t${k}\t样例: ${report[k].files.join(' | ')}`); }
if(!keys.length) console.log('（无机械违规）');
