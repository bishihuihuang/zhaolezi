/* 找乐子风格闸门：只拦"新增"代码债，存量只记不拦。
   判据：
   1. 单字母变量声明（var/let/const a = ...），豁免 i/j/k 循环变量与 x/y 坐标；
   2. 逗号列表续项（var a=1, b=2 中的续项 b）一并检查；
   3. catch(e) 单字母参数。
   用法：node _风格闸门.js          —— 比对基线，有新增即退出码 1
        node _风格闸门.js --拍基线 —— 把当前存量记为基线（_风格基线.json）
   设计原则：宁漏勿冤。漏报由人工 review 兜底，冤报会挡住发布。 */
const fs = require('fs');
const fsPath = require('path');

const ROOT = fsPath.resolve(__dirname, '..');
const SRC = fsPath.join(ROOT, '_原始未混淆版');
const BASELINE_FILE = fsPath.join(__dirname, '_风格基线.json');
const EXEMPT = new Set(['i', 'j', 'k', 'x', 'y', 'e', '_']);

/* 收集源码文件：html 提内联脚本，js 直读 */
function collectFiles(dir, out = []) {
    for (const name of fs.readdirSync(dir)) {
        const p = fsPath.join(dir, name);
        const st = fs.statSync(p);
        if (st.isDirectory()) collectFiles(p, out);
        else if (/\.(html|js)$/.test(name)) out.push(p);
    }
    return out;
}

function scriptsOf(file) {
    const text = fs.readFileSync(file, 'utf8');
    if (file.endsWith('.js')) return [text];
    const blocks = [];
    const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
    let m;
    while ((m = re.exec(text))) blocks.push(m[1]);
    return blocks;
}

/* 数单字母声明：声明语句切开逗号续项逐项看 */
function countViolations(code) {
    let count = 0;
    /* 基础声明：限定 [^;\n] 单行内匹配，修掉"上一行无分号、跨行吞掉下一行 var"的盲区（2026-10-19） */
    const declRe = /\b(?:var|let|const)\s+([^;\n]+)/g;
    let m;
    while ((m = declRe.exec(code))) {
        const items = m[1].split(',');
        for (const item of items) {
            const name = (item.split('=')[0] || '').trim();
            if (/^[a-z]$/.test(name) && !EXEMPT.has(name)) count++;
        }
    }
    /* for-in/of 与经典 for 头部的单字母循环变量（盲区补充：for (var p in x) 循环条件无分号，上面吞不到） */
    const forRe = /\bfor\s*\(\s*(?:var|let|const)\s+([a-z])(?=\s*[;,)](?![\w$])|\s+(?:in|of)\b)/g;
    while ((m = forRe.exec(code))) {
        if (!EXEMPT.has(m[1])) count++;
    }
    const catchRe = /\bcatch\s*\(\s*([a-z])\s*\)/g;
    while ((m = catchRe.exec(code))) {
        if (!EXEMPT.has(m[1])) count++;
    }
    return count;
}

function scanAll() {
    const result = {};
    for (const file of collectFiles(SRC)) {
        const rel = fsPath.relative(ROOT, file);
        let n = 0;
        for (const code of scriptsOf(file)) n += countViolations(code);
        if (n > 0) result[rel] = n;
    }
    return result;
}

if (process.argv.includes('--拍基线')) {
    const current = scanAll();
    fs.writeFileSync(BASELINE_FILE, JSON.stringify(current, null, 2), 'utf8');
    const total = Object.values(current).reduce((a, b) => a + b, 0);
    console.log(`基线已拍：${Object.keys(current).length} 个文件，存量 ${total} 处。`);
    process.exit(0);
}

if (!fs.existsSync(BASELINE_FILE)) {
    console.error('没有基线文件，请先跑：node _风格闸门.js --拍基线');
    process.exit(2);
}

const baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));
const current = scanAll();
let newDebt = 0;
for (const [file, n] of Object.entries(current)) {
    const old = baseline[file] || 0;
    if (n > old) {
        console.error(`新增违规 ${file}：${old} -> ${n}（+${n - old}）`);
        newDebt += n - old;
    }
}
const curTotal = Object.values(current).reduce((a, b) => a + b, 0);
const baseTotal = Object.values(baseline).reduce((a, b) => a + b, 0);
if (newDebt > 0) {
    console.error(`风格闸门：红。新增 ${newDebt} 处（存量 ${curTotal}，基线 ${baseTotal}）。`);
    process.exit(1);
}
console.log(`风格闸门：绿。新增 0 处（存量 ${curTotal}，较基线 ${baseTotal} ${curTotal <= baseTotal ? '下降 ' + (baseTotal - curTotal) : '持平'}）。`);
process.exit(0);
