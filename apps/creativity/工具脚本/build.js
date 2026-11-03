/* 创意引擎 Muse — 构建与自检脚本
 * 用法：
 *   node 工具脚本/build.js         完整构建：生成 sitemap + 刷新 SW 缓存清单 + 全量自检
 *   node 工具脚本/build.js --check 只跑自检（不改动任何文件）
 *
 * 职责：
 *   1. 从 cy-features.js 读取 CY.PAGES（单一数据源），生成 sitemap.xml
 *   2. 依据 CY.PAGES 重写 service-worker.js 的 PRECACHE 清单；清单变化时递增 CACHE_VERSION
 *   3. 文件存在性链接检查：HTML 中所有 href/src（本地相对路径）必须存在
 *   4. 冒烟语法检查：每个 HTML 的 inline <script> 与全部 .js 文件用 new Function 编译
 *   5. robots.txt 占位域名检查提醒
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PLACEHOLDER_ORIGIN = 'https://your-name.github.io/creativity';
const THEME_NAMES = ['dark', 'blue', 'gold', 'light', 'milk', 'guofeng', 'snowsun', 'cyber', 'aurora', 'custom'];
/* 不参与导航的页面：index.html 与 404.html 由 GitHub Pages 直接处理，不登记进 CY.PAGES */
const NAV_EXEMPT = ['index.html', '404.html'];
const CHECK = process.argv.indexOf('--check') >= 0;

/* 部署地址：node 工具脚本/build.js --deploy https://用户名.github.io/仓库名
 * 它决定 canonical / og:url / sitemap.xml / robots.txt 四处地址，一条命令统一改写，
 * 不用手工去改 13 个 HTML。不传则保留占位地址，构建时会提醒。 */
const _d = process.argv.indexOf('--deploy');
const DEPLOY = _d > 0 ? (process.argv[_d + 1] || '').replace(/\/+$/, '').trim() : '';
const ORIGIN = DEPLOY || PLACEHOLDER_ORIGIN;
const CANONICAL = ORIGIN + '/';

let errors = 0, warnings = 0;
function fail(msg) { errors++; console.error('  ✗ ' + msg); }
function warn(msg) { warnings++; console.warn('  ⚠ ' + msg); }
function ok(msg) { console.log('  ✓ ' + msg); }

/* ---------- 读取 CY.PAGES ---------- */
function readPages() {
    const src = fs.readFileSync(path.join(ROOT, 'cy-features.js'), 'utf8');
    const m = src.match(/CY\.PAGES\s*=\s*(\[[\s\S]*?\]);/);
    if (!m) { fail('cy-features.js 中找不到 CY.PAGES 定义'); return []; }
    let list = null;
    try {
        // 用 Function 求值取数组（值全部是字符串字面量，安全）
        list = new Function('return (' + m[1] + ')')();
    } catch (e) {
        fail('CY.PAGES 解析失败：' + e.message);
        return [];
    }
    if (!Array.isArray(list)) { fail('CY.PAGES 不是数组'); return []; }
    return list;
}

/* ---------- 1. sitemap.xml ---------- */
function buildSitemap(pages) {
    const lines = [];
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    lines.push('  <url><loc>' + CANONICAL + '</loc><priority>1.0</priority></url>');
    pages.forEach(p => {
        lines.push('  <url><loc>' + CANONICAL + p.f + '</loc><priority>0.8</priority></url>');
    });
    lines.push('</urlset>');
    const out = lines.join('\n') + '\n';
    fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), out);
    ok('sitemap.xml 已生成（' + (pages.length + 1) + ' 个 URL）');
}

/* ---------- 2. service-worker.js 缓存清单 ---------- */
function buildSw(pages, allFiles, jsFiles) {
    const swPath = path.join(ROOT, 'service-worker.js');
    const src = fs.readFileSync(swPath, 'utf8');
    const assets = ['common.css', 'common.js', 'theme.js', 'cy-features.js', 'manifest.json',
        '404.html', 'favicon.svg', 'favicon-48.png', 'favicon.ico', 'icon-192.png', 'icon-512.png', 'robots.txt', 'sitemap.xml'];
    const want = ['./'];
    pages.forEach(p => want.push('./' + p.f));
    assets.concat(jsFiles.filter(f => f !== 'service-worker.js')).forEach(f => {
        if (allFiles.indexOf(f) >= 0) want.push('./' + f);
    });
    // 去重（assets 与 jsFiles 有交集）：用 basename 做键，保住根目录 './' 条目
    const seen = {};
    const target = want.filter(entry => {
        const key = entry === './' ? './' : entry.replace(/^\.\//, '');
        if (seen[key]) return false;
        seen[key] = true;
        return true;
    });

    const listStr = target.map(s => s === './' ? "'./'" : "'" + s.replace(/^\.\//, '') + "'").join(',\n  ');
    const mList = src.match(/\b(?:var|let|const)\s+PRECACHE\s*=\s*\[([\s\S]*?)\];/);
    if (!mList) { fail('service-worker.js 中找不到 PRECACHE 定义'); return; }
    let curList = null;
    try { curList = new Function('return [' + mList[1] + ']')(); } catch (e) { fail('PRECACHE 解析失败：' + e.message); return; }
    const norm = list => list.map(s => String(s).replace(/^\.\//, ''));
    const same = norm(curList).join('|') === norm(target).join('|');

    let out = src;
    if (!same) {
        out = out.replace(/\b(?:var|let|const)\s+PRECACHE\s*=\s*\[[\s\S]*?\];/,
            'const PRECACHE = [\n  ' + listStr + '\n];');
        // 递增缓存版本：把 CACHE_VERSION 的 patch 号 +1
        const mV = out.match(/CACHE_VERSION\s*=\s*'v([\d.]+)'/);
        if (mV) {
            const parts = mV[1].split('.').map(Number);
            parts[2] = (parts[2] || 0) + 1;
            const nv = 'v' + parts.join('.');
            out = out.replace(/CACHE_VERSION\s*=\s*'v[\d.]+'/, "CACHE_VERSION = '" + nv + "'");
            ok('PRECACHE 清单变化，CACHE_VERSION 升为 ' + nv);
        } else {
            warn('service-worker.js 无 CACHE_VERSION 定义，仅更新清单');
        }
        ok('service-worker.js 缓存清单已刷新（' + target.length + ' 项）');
    } else {
        ok('service-worker.js 缓存清单无变化（' + target.length + ' 项）');
    }
    fs.writeFileSync(swPath, out);
}

/* ---------- 3. canonical / og:url / robots.txt ---------- */
/* 判断一个绝对 URL 是不是"本页的规范地址"（换个域名也算），用于只改写属于本页的地址、不碰外链。
 * 两种合法形态：
 *   普通页  → 末段就是文件名，如 /repo/1.html
 *   首页    → 目录形态 /repo/ 或 /repo/index.html，末段不是 .html 文件名 */
function samePageUrl(url, f) {
    try {
        const u = new URL(url);
        if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
        const seg = u.pathname.split('/').filter(Boolean);
        const last = seg.length ? seg[seg.length - 1] : '';
        if (last === f) return true;
        return f === 'index.html' && (last === 'index.html' || !/\.(html?|php)$/.test(last));
    } catch (e) { return false; }
}

/* 把每个页面的 canonical 与 og:url 统一写成 ORIGIN + 文件名。
 * 只改写"指向本页"的绝对地址：外链、锚点、相对路径一律不动。 */
function buildCanonicals() {
    let changed = 0;
    htmlFiles.forEach(f => {
        const p = path.join(ROOT, f);
        const before = fs.readFileSync(p, 'utf8');
        const target = ORIGIN + '/' + f;
        const out = before
            .replace(/(<link[^>]*rel=["']canonical["'][^>]*href=["'])([^"']*)(["'])/gi,
                (m, head, url, q) => samePageUrl(url, f) ? head + target + q : m)
            .replace(/(<meta[^>]*property=["']og:url["'][^>]*content=["'])([^"']*)(["'])/gi,
                (m, head, url, q) => samePageUrl(url, f) ? head + target + q : m);
        if (out !== before) { fs.writeFileSync(p, out); changed++; }
    });
    return changed;
}

function buildRobots() {
    fs.writeFileSync(path.join(ROOT, 'robots.txt'),
        'User-agent: *\nAllow: /\n\nSitemap: ' + ORIGIN + '/sitemap.xml\n');
}

/* --check 模式：核对四处地址是否全部指向同一个 ORIGIN，并揪出残留的占位域名。
 * 404 页不参与 canonical（搜索引擎对 404 不采集权重），但必须带 noindex。 */
function verifyUrls() {
    let bad = 0;
    const origins = {};
    htmlFiles.forEach(f => {
        const html = fs.readFileSync(path.join(ROOT, f), 'utf8');
        const want = ORIGIN + '/' + f;
        if (f === '404.html') {
            if (!/name=["']robots["'][^>]*content=["'][^"']*noindex/.test(html)) { fail('404.html 缺少 noindex'); bad++; }
            return;
        }
        const cs = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);
        if (!cs) { fail(f + ' 缺少 canonical'); bad++; return; }
        origins[cs[1].replace(/\/$/, '')] = 1;
        if (cs[1].replace(/\/$/, '') !== want.replace(/\/$/, '')) { fail(f + ' 的 canonical 与部署地址不一致'); bad++; }
        const og = html.match(/<meta[^>]*property=["']og:url["'][^>]*content=["']([^"']+)["']/i);
        if (og && og[1] !== want) { fail(f + ' 的 og:url 与部署地址不一致'); bad++; }
    });
    const rob = fs.readFileSync(path.join(ROOT, 'robots.txt'), 'utf8');
    const sm = rob.match(/Sitemap:\s*(\S+)/);
    if (!sm || sm[1] !== ORIGIN + '/sitemap.xml') { fail('robots.txt 的 Sitemap 地址不一致'); bad++; }
    const smap = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
    if (smap.indexOf(ORIGIN + '/') < 0) { fail('sitemap.xml 的域名与部署地址不一致'); bad++; }
    ok('URL 地址一致性检查完成（' + Object.keys(origins).length + ' 个 canonical，指向 ' + ORIGIN + '）');
    return bad;
}

/* ---------- 4+5. 页面级检查 ---------- */
function extractInlineScripts(html) {
    const out = [];
    const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
        if (!/\bsrc\s*=/i.test(m[1])) out.push(m[2]);
    }
    return out;
}
function checkSyntax(code, label) {
    try { new Function(code); return true; } catch (e) { fail(label + '：语法错误 → ' + e.message); return false; }
}
function collectLocalRefs(html) {
    const refs = [];
    const re = /(?:href|src)\s*=\s*["']([^"']+)["']/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
        const v = m[1];
        if (!v) continue;
        if (/^(https?:|data:|mailto:|#|javascript:)/i.test(v)) continue;
        refs.push(v.split(/[?#]/)[0]);
    }
    return refs.filter((v, i) => refs.indexOf(v) === i);
}

/* ---------- 主流程 ---------- */
const pages = readPages();
const htmlFiles = [];
fs.readdirSync(ROOT).forEach(f => { if (/\.html$/.test(f)) htmlFiles.push(f); });

if (CHECK) console.log('创意引擎构建 · 自检模式（不写文件）');
else console.log('创意引擎构建 · 完整模式');

console.log('── 页面清单（CY.PAGES · ' + pages.length + ' 页） ──');
const allRefs = ['common.css', 'common.js', 'theme.js', 'cy-features.js', 'manifest.json',
    'favicon.svg', 'favicon-48.png', 'icon-192.png', 'icon-512.png', 'favicon.ico', 'service-worker.js', 'robots.txt', 'sitemap.xml'];
htmlFiles.forEach(f => { if (allRefs.indexOf(f) < 0) allRefs.push(f); });

pages.forEach(p => {
    const exists = fs.existsSync(path.join(ROOT, p.f));
    if (exists) ok('页面 ' + p.f + ' 存在');
    else fail('页面 ' + p.f + ' 缺失（CY.PAGES 登记了但文件不存在）');
});
htmlFiles.forEach(f => {
    const inPages = pages.some(p => p.f === f);
    if (!inPages && NAV_EXEMPT.indexOf(f) < 0) warn('文件 ' + f + ' 未登记进 CY.PAGES');
});

const jsFiles = [];
fs.readdirSync(ROOT).forEach(f => { if (/\.js$/.test(f)) jsFiles.push(f); });
jsFiles.forEach(f => { if (allRefs.indexOf(f) < 0) allRefs.push(f); });

if (!CHECK) {
    buildSitemap(pages);
    buildSw(pages, allRefs, jsFiles);
    const nC = buildCanonicals();
    buildRobots();
    console.log('── 生成式文件完成（canonical 改写 ' + nC + ' 个页面）──');
}
else {
    console.log('── URL 地址一致性检查（部署地址 ' + ORIGIN + '）──');
    verifyUrls();
}

console.log('── 语法冒烟测试 ──');
jsFiles.forEach(f => {
    const code = fs.readFileSync(path.join(ROOT, f), 'utf8');
    checkSyntax(code, f);
});

let inlineTotal = 0, inlineFail = 0;
htmlFiles.forEach(f => {
    const html = fs.readFileSync(path.join(ROOT, f), 'utf8');
    const scripts = extractInlineScripts(html);
    inlineTotal += scripts.length;
    scripts.forEach((s, i) => {
        if (!checkSyntax(s, f + ' inline script #' + (i + 1))) inlineFail++;
    });
});
ok(inlineTotal + ' 个 inline script 检查完毕' + (inlineFail ? '（' + inlineFail + ' 个失败）' : ''));

console.log('── 引用文件存在性检查 ──');
htmlFiles.forEach(f => {
    const html = fs.readFileSync(path.join(ROOT, f), 'utf8');
    collectLocalRefs(html).forEach(ref => {
        if (ref === './') return;
        const p = path.join(ROOT, ref.replace(/^\.\//, ''));
        if (!fs.existsSync(p)) fail(f + ' 引用了不存在的文件：' + ref);
    });
});

console.log('── 静态资源存在性 ──');
allRefs.forEach(f => {
    if (fs.existsSync(path.join(ROOT, f))) ok(f);
    else fail('缺失资源：' + f);
});

/* 占位域名提醒：canonical / og:url / sitemap / robots 四处的地址全由 --deploy 统一改写 */
if (!DEPLOY) {
    warn('未配置部署地址，全部 URL 仍是占位域名 your-name.github.io\n' +
         '      上传前执行一条命令即可全部替换：\n' +
         '      node 工具脚本/build.js --deploy https://你的用户名.github.io/仓库名');
}

console.log('');
console.log(errors === 0 ? '✅ 构建自检全部通过（' + warnings + ' 条提醒）' :
    '❌ 发现 ' + errors + ' 个错误、' + warnings + ' 条提醒');
process.exit(errors === 0 ? 0 : 1);
