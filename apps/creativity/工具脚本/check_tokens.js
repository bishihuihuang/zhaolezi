/* 创意引擎 · 设计令牌完整性校验
 *
 * 本站主题体系（common.css）：
 *   :root { ... }                       → 默认深色主题 dark 的基础变量（没有 :root[data-theme="dark"] 块）
 *   :root[data-theme="xxx"] { ... }     → 9 套命名主题，各覆盖一组基础变量（未覆盖者沿用 dark 的值）
 *   :root[data-theme] { --zl-*: ... }   → 令牌别名层，对"任意已设主题"生效，含 dark
 *                                          注意：CSS 里 :root[data-theme] { } 出现多次，需全部并入
 *
 * 最常踩的坑：
 *   1) 页面引用了没人定义的令牌，且调用处没有 fallback → 该条声明在计算期失效，样式静默跑掉；
 *      （关键：var(--x, 兜底) 里的兜底只在 --x "未定义"时生效；若 --x 有定义但取值非法，兜底不触发）
 *   2) 某套命名主题漏覆盖关键基础变量 → --zl-* 别名解析到 dark 的旧值，切主题后颜色对不上；
 *   3) 首屏预加载脚本的主题白名单与 CSS 定义不一致 → 白名单外的主题被丢弃，看着像"切主题没反应"。
 *
 * 用法：node 工具脚本/check_tokens.js     有问题时退出码为 1
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(ROOT, 'common.css'), 'utf8');
const htmlFiles = fs.readdirSync(ROOT).filter(f => /\.html$/.test(f));
const DEFAULT_THEME = 'dark';
const ESSENTIAL = ['--bg', '--card', '--txt', '--line', '--gold']; /* 主题必须覆盖的基础变量 */

/* 生成式输出豁免：5.html 的 exportCss() 把 --pal-1/--pal-2 拼进"给用户复制/下载的示例 CSS"字符串，
 * 从不会真正应用到本站 DOM，因此不算本站的令牌引用。豁免必须写明理由，避免这里变成垃圾桶。 */
const GENERATED = {
    '--pal-1': '5.html exportCss() 导出的示例 CSS 文本',
    '--pal-2': '5.html exportCss() 导出的示例 CSS 文本'
};

/* ---------- 1. 解析各层基础变量 ---------- */
function tokensOf(body) {
    const s = new Set();
    for (const m of body.matchAll(/(--[A-Za-z0-9_\-]+)\s*:/g)) s.add(m[1]);
    return s;
}

/* 裸 :root { ... } —— 默认主题（dark）的基础变量 */
const darkTokens = new Set();
{
    const m = css.match(/:root\s*\{([\s\S]*?)\n\}/);
    if (m) tokensOf(m[1]).forEach(t => darkTokens.add(t));
}
/* 所有 :root[data-theme] { ... } —— 令牌别名层 + 其它全局规则，全部并入 */
const aliasTokens = new Set();
{
    const re = /:root\[data-theme\]\s*\{([\s\S]*?)\n\}/g;
    let m;
    while ((m = re.exec(css)) !== null) tokensOf(m[1]).forEach(t => aliasTokens.add(t));
}
/* 所有 :root[data-theme="xxx"] { ... } —— 命名主题 */
const themeBlocks = {};
{
    const re = /:root\[data-theme\s*=\s*[\x22\x27]([^\x22\x27]+)[\x22\x27]\]\s*\{([\s\S]*?)\n\}/g;
    let m;
    while ((m = re.exec(css)) !== null) themeBlocks[m[1]] = tokensOf(m[2]);
}
const namedThemes = Object.keys(themeBlocks).sort();
const allThemes = [DEFAULT_THEME, ...namedThemes];
/* 任何来源都定义过的令牌（用于区分"运行时注入"与"彻底漏了"） */
const definedAny = new Set([...darkTokens, ...aliasTokens, ...Object.values(themeBlocks).flatMap(s => [...s])]);

/* ---------- 2. 被引用的令牌，以及哪些引用自带 fallback ---------- */
const used = new Set();
const withFallback = new Set();
function scan(text) {
    for (const m of text.matchAll(/var\(\s*(--[A-Za-z0-9_\-]+)\s*([^)]*)\)/g)) {
        used.add(m[1]);
        if (m[2].trim()) withFallback.add(m[1]);
    }
}
for (const f of htmlFiles) scan(fs.readFileSync(path.join(ROOT, f), 'utf8'));
scan(css);

/* 生成式输出不算本站令牌引用，先摘出单独说明 */
const generated = [...used].filter(t => GENERATED[t] !== undefined);
generated.forEach(t => used.delete(t));

/* 真窟窿 = 无人定义 且 任何调用处都没有 fallback。其余"未静态定义"者由 3.4 单独说明。 */
const unsafe = () => [...used].filter(t => !definedAny.has(t) && !withFallback.has(t));

/* ---------- 3. 报告 ---------- */
let bad = 0;
console.log('═══ 主题清单（' + allThemes.length + ' 套）═══');
console.log('  ' + allThemes.join(', ') + '   ← dark 由裸 :root{} 定义，其余 ' + namedThemes.length + ' 套有独立选择器');
console.log('  别名层 :root[data-theme] 共 ' + aliasTokens.size + ' 个令牌，作用于全部主题');

/* 3.1 每个主题单独校验：该主题下每一个被引用令牌都有来源 */
console.log('\n═══ 逐主题令牌覆盖（被引用令牌共 ' + used.size + ' 个）═══');
for (const theme of allThemes) {
    const base = theme === DEFAULT_THEME ? darkTokens : new Set([...darkTokens, ...themeBlocks[theme]]);
    const covered = new Set([...base, ...aliasTokens]);
    const missing = unsafe().filter(t => !covered.has(t));
    if (missing.length) { bad++; console.log('  ✗ 主题 ' + theme + '：' + missing.length + ' 个令牌无来源且无兜底 ' + missing.join(', ')); }
    else console.log('  ✓ 主题 ' + theme + '：全部可解析');
}

/* 3.2 --zl-* 别名层完整性 */
const zlUsed = [...used].filter(t => t.startsWith('--zl-'));
const zlMissing = zlUsed.filter(t => !definedAny.has(t));
console.log('\n═══ --zl-* 别名层完整性（被引用 ' + zlUsed.length + ' 个）═══');
if (zlMissing.length) { bad++; console.log('  ✗ 无人定义：' + zlMissing.join(', ')); }
else console.log('  ✓ ' + zlUsed.length + ' 个 --zl-* 全部有定义');

/* 3.3 命名主题的基础变量覆盖度 */
console.log('\n═══ 命名主题基础变量覆盖（dark 基准 ' + darkTokens.size + ' 个）═══');
for (const theme of namedThemes) {
    const missEssential = ESSENTIAL.filter(t => !themeBlocks[theme].has(t));
    const notOverridden = [...darkTokens].filter(t => !themeBlocks[theme].has(t));
    if (missEssential.length) { bad++; console.log('  ✗ 主题 ' + theme + ' 缺关键变量 ' + missEssential.join(', ')); }
    else console.log('  ✓ 主题 ' + theme + ' 覆盖 ' + themeBlocks[theme].size + ' 个（沿用 dark ' + notOverridden.length + ' 个）');
}

/* 3.4 运行时注入令牌：有 fallback 的安全，没 fallback 的是真窟窿 */
const runtime = [...used].filter(t => !definedAny.has(t));
console.log('\n═══ 未静态定义的令牌（JS 运行时注入）═══');
if (!runtime.length) console.log('  无');
for (const t of runtime) {
    if (withFallback.has(t)) console.log('  · ' + t + '   调用处自带兜底，安全');
    else { bad++; console.log('  ✗ ' + t + '   调用处无兜底 → 该声明会失效'); }
}

/* 3.5 生成式输出豁免名单 */
console.log('\n═══ 生成式输出豁免（不应用到本站 DOM）═══');
if (!generated.length) console.log('  无');
generated.forEach(t => console.log('  · ' + t + '   ← ' + GENERATED[t]));

/* ---------- 4. 预加载白名单 vs CSS 定义 ---------- */
console.log('\n═══ 首屏主题白名单一致性 ═══');
let wlBad = 0;
for (const f of htmlFiles) {
    const m = fs.readFileSync(path.join(ROOT, f), 'utf8').match(/var _ok = \[([^\]]*)\]/);
    if (!m) continue;
    const list = (m[1].match(/['"]([^'"]+)['"]/g) || []).map(s => s.slice(1, -1));
    const unknown = list.filter(t => allThemes.indexOf(t) < 0);
    const absent = allThemes.filter(t => list.indexOf(t) < 0);
    if (unknown.length || absent.length) {
        bad++; wlBad++;
        console.log('  ✗ ' + f + (unknown.length ? ' 含未定义主题 ' + unknown.join(',') : '') +
                    (absent.length ? ' 漏登 ' + absent.join(',') : ''));
    }
}
if (!wlBad) console.log('  ✓ ' + htmlFiles.length + ' 个页面白名单与 CSS 定义完全一致');

console.log('\n' + (bad ? '⚠ 发现 ' + bad + ' 处问题'
    : '✅ 令牌体系完整：' + allThemes.length + ' 套主题 × ' + used.size + ' 个引用令牌，无缺口'));
process.exitCode = bad ? 1 : 0;
