/* 创意引擎 · 静态调用点校验（没有浏览器时也能做的运行时安全检查）
 *
 * 思路：把每页内联 <script> 与三个公共脚本放在一起，扫描所有 identifier( 调用点，
 * 确认目标要么是关键字、浏览器内建、本页面已定义（含函数参数），要么是公共脚本 / CY 成员。
 * 大多数"点开工具页白屏"都是这类问题，比语法检查更能抓到真实故障。
 *
 * 用法：node 工具脚本/check_calls.js     有待确认项时退出码为 1
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const DEF_RES = [
    /function\s+([A-Za-z_$][\w$]*)\s*\(/g,
    /(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=/g,
    /([A-Za-z_$][\w$]*)\s*:\s*function/g
];

function defs(code) {
    const s = new Set();
    for (const re of DEF_RES) for (const m of code.matchAll(re)) s.add(m[1]);
    return s;
}
function params(code) {
    const s = new Set();
    // 同时覆盖具名函数 function foo(a, b) 与匿名函数 / 箭头函数
    for (const re of [/function\s*(?:[A-Za-z_$][\w$]*\s*)?\(([^)]*)\)/g, /\(([^)(=]*)\)\s*=>/g]) {
        let m;
        while ((m = re.exec(code)) !== null) {
            m[1].split(',').forEach(p => {
                const n = p.trim().split(/[:=]/)[0].trim();
                if (/^[A-Za-z_$][\w$]*$/.test(n)) s.add(n);
            });
        }
    }
    return s;
}

const globals = new Set();
['common.js', 'theme.js', 'cy-features.js'].forEach(f => {
    const code = fs.readFileSync(path.join(ROOT, f), 'utf8');
    defs(code).forEach(n => globals.add(n));
    params(code).forEach(n => globals.add(n));
});
const cyCode = fs.readFileSync(path.join(ROOT, 'cy-features.js'), 'utf8');
for (const m of cyCode.matchAll(/CY\.([A-Za-z_$][\w$]*)\s*=/g)) globals.add(m[1]);

const KW = (
    'if for while switch return function catch do else try finally new delete void typeof ' +
    'instanceof in of this arguments super class extends yield await async with'
).split(/\s+/);

const BUILTIN = (
    'Math Date JSON Array Object String Number Boolean RegExp Error Promise console window document ' +
    'localStorage navigator location alert confirm prompt fetch setTimeout setInterval clearTimeout ' +
    'clearInterval requestAnimationFrame cancelAnimationFrame getComputedStyle URL Blob FileReader ' +
    'URLSearchParams Image MutationObserver ResizeObserver IntersectionObserver structuredClone atob btoa ' +
    'isNaN isFinite parseInt parseFloat encodeURIComponent decodeURIComponent escape unescape self ' +
    'setImmediate clearImmediate history performance screen ' +
    'addEventListener removeEventListener createElement appendChild append prepend innerHTML innerText ' +
    'textContent style classList value checked focus blur click scroll scrollIntoView setAttribute ' +
    'getAttribute hasAttribute removeAttribute querySelector querySelectorAll getElementById children ' +
    'parentNode parentElement firstChild nextSibling append remove removeChild splice push pop shift ' +
    'unshift slice concat indexOf includes find findIndex filter map reduce join sort fill from values ' +
    'keys entries freeze isObject assign parse stringify log error warn info padStart padEnd toFixed ' +
    'toLocaleString toISOString now random sign abs round floor ceil pow min max sqrt hypot trunc ' +
    'startsWith endsWith charAt codeAt charCodeAt fromCharCode repeat replace replaceAll search ' +
    'substring substr trim toLowerCase toUpperCase split match matchAll matches closest dataset target ' +
    'currentTarget preventDefault stopPropagation width height getContext toDataURL getBoundingClientRect ' +
    'dataset requestFullscreen webkitRequestFullscreen fullscreenElement exitFullscreen'
).split(/\s+/);

/* 颜色/CSS 函数：只出现在字符串或 canvas 代码里，不是我们的函数 */
const LITERAL_FN = ('rgba rgb hsl hsla var color color-mix env calc').split(/\s+/);

const kw = new Set(KW);
const builtins = new Set(BUILTIN);
const literal = new Set(LITERAL_FN);

let scanned = 0;
const report = [];

for (const f of fs.readdirSync(ROOT).filter(f => /\.html$/.test(f)).sort()) {
    const html = fs.readFileSync(path.join(ROOT, f), 'utf8');
    let js = '';
    for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
        if (!/\bsrc\s*=/i.test(m[1])) js += '\n' + m[2];
    }
    const known = new Set([...defs(js), ...params(js)]);
    const missing = new Set();
    const re = /([A-Za-z_$][\w$]*)\s*\(/g;
    let m;
    while ((m = re.exec(js)) !== null) {
        scanned++;
        const name = m[1];
        const before = js.slice(0, m.index);
        if (kw.has(name)) continue;
        if (builtins.has(name)) continue;
        if (literal.has(name)) continue;
        const ch = before[before.length - 1];
        if (ch === '.' || ch === '(' || ch === '[') continue;  // 成员调用 / 正则 / 嵌套
        if (/function\s*$/.test(before)) continue;              // function foo( 定义
        if (known.has(name)) continue;
        if (globals.has(name)) continue;
        missing.add(name);
    }
    if (missing.size) report.push('[' + f + '] ' + [...missing].join(', '));
}

console.log('扫描 ' + scanned + ' 个调用点，' + report.length + ' 个页面有待确认项：');
report.forEach(r => console.log('  ⚠ ' + r));
if (!report.length) console.log('  无');
console.log(report.length ? '\n⚠ 有 ' + report.length + ' 个页面需要人工确认' : '\n✅ 全部调用点均有定义');
process.exitCode = report.length ? 1 : 0;
