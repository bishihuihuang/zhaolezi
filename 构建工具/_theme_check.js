const fs = require('fs');
const css = fs.readFileSync('_原始未混淆版/common.css', 'utf8');
const themes = new Set([...css.matchAll(/:root\[data-theme="([^"]+)"/g)].map(m => m[1]));
console.log('common.css 主题块:', [...themes].join(','));
console.log('主题块数:', themes.size);
console.log('--blue 仍为 #667eea:', /--blue\s*:\s*#667eea/i.test(css));
console.log('--gold 存在(focus ring fallback):', /--gold\s*:/i.test(css));
console.log('--zl-accent 存在:', /--zl-accent\s*:/i.test(css));
