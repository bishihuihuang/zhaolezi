/* test_23_runtime.js — 在 Node 里跑「已生成的 23.html 内联脚本 + 真实 23data 分片」，
   验证词典页真实运行链路：首页高频精选 / 前缀搜索 / 中文反查渐进渲染 / 等级筛选 /
   分类 tab / 收藏 / 随机词 / 历史。
   用法：node 工具脚本/test_23_runtime.js */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const HTML_PATH = path.join(ROOT, '_原始未混淆版', '23.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

let fail = 0;
const lines = [];
function ok(name, cond, extra) {
    lines.push((cond ? 'PASS  ' : 'FAIL  ') + name + (extra !== undefined ? '  -> ' + extra : ''));
    if (!cond) fail++;
}

/* ================= DOM stub ================= */
const byId = new Map();
const byClass = new Map();

/* 解析开标签的属性串（带引号的值 + 无值布尔属性） */
function parseAttrs(s) {
    const attrs = {};
    const ar = /([\w:-]+)=("[^"]*"|'[^']*')/g;
    let a;
    while ((a = ar.exec(s)) !== null) attrs[a[1].toLowerCase()] = a[2].slice(1, -1);
    /* 无值属性只补缺，不覆盖已解析到的键 */
    const ar2 = /\s([\w:-]+)(?!=)/g;
    while ((a = ar2.exec(s)) !== null) { if (!(a[1].toLowerCase() in attrs)) attrs[a[1].toLowerCase()] = ''; }
    return attrs;
}

/* 从 innerHTML 里取出所有开标签的「标签名 + 属性」，再按选择器筛 */
function scanTags(html) {
    const out = [];
    const re = /<([\w-]+)([^>]*?)>/g;
    let m;
    while ((m = re.exec(html)) !== null) out.push({ tag: m[1], attrs: parseAttrs(m[2]) });
    return out;
}

/* 在元素已渲染的 innerHTML 里查「[data-xxx]」「.类名」——这样卡片上的
   发音 / 收藏按钮才能被页面绑定。结果按「元素 + 选择器」缓存：真实 DOM 里节点
   存活到 innerHTML 被重写，缓存同样如此，于是页面绑定的和测试拿到的是同一节点。 */
function innerQuery(root, sel) {
    if (!root || !root.innerHTML) return [];
    if (!root._qcache) root._qcache = new Map();
    if (root._qcache.has(sel)) return root._qcache.get(sel);
    const tags = scanTags(root.innerHTML);
    let out;
    const am = String(sel).match(/^\[\s*([\w-]+)\s*\]$/);
    if (am) out = tags.filter(t => am[1] in t.attrs).map(t => mkEl(t.tag, t.attrs));
    else {
        const cm = String(sel).match(/\.([\w-]+)/);
        out = cm
            ? tags.filter(t => (t.attrs.class || '').split(/\s+/).indexOf(cm[1]) >= 0).map(t => mkEl(t.tag, t.attrs))
            : [];
    }
    root._qcache.set(sel, out);
    return out;
}

function mkEl(tag, attrs, text) {
    const classes = String(attrs && attrs.class || '').split(/\s+/).filter(Boolean);
    const el = {
        tagName: String(tag || 'div').toUpperCase(),
        nodeType: 1, children: [], childNodes: [], parentNode: null,
        style: {}, dataset: {}, value: '', textContent: '',
        _html: '', _qcache: null,
        get innerHTML() { return this._html; },
        set innerHTML(v) { this._html = v; this._qcache = null; },
        className: (attrs && attrs.class) || '', id: (attrs && attrs.id) || '',
        _attrs: attrs || {}, _handlers: {},
        classList: {
            _s: new Set(classes),
            add(c) { this._s.add(c); },
            remove(c) { this._s.delete(c); },
            toggle(c, f) { const on = f === undefined ? !this._s.has(c) : !!f; if (on) this._s.add(c); else this._s.delete(c); return on; },
            contains(c) { return this._s.has(c); },
            item(i) { return [...this._s][i] || null; }
        },
        addEventListener(type, fn) { (this._handlers[type] = this._handlers[type] || []).push(fn); },
        removeEventListener() {},
        appendChild(c) { if (c) { this.children.push(c); this.childNodes.push(c); c.parentNode = this; } return c; },
        insertBefore(c) { return c; }, removeChild(c) { return c; }, remove() {},
        setAttribute(k, v) { this._attrs[k] = v; if (k === 'id') this.id = v; },
        getAttribute(k) { const v = this._attrs[k]; return v === undefined ? null : v; },
        hasAttribute(k) { return k in this._attrs; },
        removeAttribute(k) { delete this._attrs[k]; },
        querySelector(sel) { const a = innerQuery(this, sel); return a.length ? a[0] : null; },
        querySelectorAll(sel) { return innerQuery(this, sel); },
        closest() { return this; }, matches() { return false; }, contains() { return false; },
        focus() {}, blur() {}, click() {}, scrollIntoView() {}, scrollTo() {},
        getBoundingClientRect() { return { left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0 }; },
        get outerHTML() { return this.innerHTML; },
        get firstChild() { return null; }
    };
    for (const k in (attrs || {})) {
        if (k.indexOf('data-') === 0) el.dataset[k.slice(5).replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); })] = attrs[k];
    }
    return el;
}
function register(el) {
    if (el.id && !byId.has(el.id)) byId.set(el.id, el);
    String(el.className).split(/\s+/).forEach(function (c) {
        if (!c) return;
        if (!byClass.has(c)) byClass.set(c, []);
        byClass.get(c).push(el);
    });
    return el;
}

/* 从静态 HTML 里扫出真实存在的元素（button/input/div/a/span），这样等级 chip、
   分类 tab、搜索框等才能像浏览器一样被 querySelectorAll 拿到。 */
(function parseStatic() {
    /* 只扫第一个 <script> 之前的真实 HTML（脚本里的模板串也含 <button …>，
       全文件匹配会把模板当成页面元素）。 */
    const at = html.search(/<script[\s>]/i);
    let body = at > 0 ? html.slice(0, at) : html;
    body = body.replace(/<!--[\s\S]*?-->/g, '');
    const VOID = { input: 1, br: 1, img: 1, meta: 1, link: 1, hr: 1, col: 1 };
    const stack = [];
    const re = /<(\/?)([\w:-]+)([^>]*?)(\/?)>/g;
    let m;
    while ((m = re.exec(body)) !== null) {
        const tag = m[2].toLowerCase();
        if (m[1] === '/') {
            for (let i = stack.length - 1; i >= 0; i--) {
                if (stack[i].tagName === tag.toUpperCase()) { stack.length = i; break; }
            }
            continue;
        }
        const attrs = {};
        const ar = /([\w:-]+)=("[^"]*"|'[^']*')/g;
        let a;
        while ((a = ar.exec(m[3])) !== null) { attrs[a[1].toLowerCase()] = a[2].slice(1, -1); }
        const ar2 = /\s([\w:-]+)(?!=)/g;
        while ((a = ar2.exec(m[3])) !== null) { attrs[a[1].toLowerCase()] = ''; }
        const el = mkEl(tag, attrs, '');
        const end = body.indexOf('<', re.lastIndex);
        el.textContent = (end < 0 ? '' : body.slice(re.lastIndex, end)).replace(/<[^>]*>/g, '').trim();
        if (stack.length) el._parent = stack[stack.length - 1];
        if (attrs.id) byId.set(attrs.id, el);
        String(attrs.class || '').split(/\s+/).forEach(function (c) {
            if (!c) return;
            if (!byClass.has(c)) byClass.set(c, []);
            byClass.get(c).push(el);
        });
        if (!VOID[tag] && m[4] !== '/') stack.push(el);
    }
})();

function getEl(id) {
    if (byId.has(id)) return byId.get(id);
    const el = register(mkEl('div', { id: id }));
    byId.set(id, el);
    return el;
}
function qsaSel(sel) {
    sel = String(sel).trim();
    /* 复合选择器「#容器Id .类名」必须先判——否则会被下面「# 开头」的分支吃掉 */
    const mm = sel.match(/^#([\w-]+)\s+\.([\w-]+)$/);
    if (mm) {
        const want = mm[2];
        return (byClass.get(want) || []).filter(function (e) {
            let n = e._parent;
            while (n) { if (n.id === mm[1]) return true; n = n._parent; }
            return false;
        });
    }
    if (sel.charAt(0) === '.') { const c = sel.slice(1).split(/[\s>+~]/)[0]; return byClass.get(c) || []; }
    if (sel.charAt(0) === '#') { const e = byId.get(sel.slice(1)); return e ? [e] : []; }
    return [];
}
function qsel(sel) { const a = qsaSel(sel); return a.length ? a[0] : null; }

/* ================= localStorage ================= */
const store = new Map();
const localStorage = {
    getItem(k) { return store.has(k) ? store.get(k) : null; },
    setItem(k, v) { store.set(String(k), String(v)); },
    removeItem(k) { store.delete(k); },
    clear() { store.clear(); }
};

/* ================= fetch：直接喂真实分片 ================= */
const fetched = [];
function serve(url) {
    const u = String(url);
    fetched.push(u);
    const z = u.match(/23data\/zh_top\.json/);
    if (z) return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(JSON.parse(fs.readFileSync(path.join(ROOT, '23data', 'zh_top.json'), 'utf8'))) });
    const m = u.match(/23data\/([a-z])\.json/);
    if (m) return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(JSON.parse(fs.readFileSync(path.join(ROOT, '23data', m[1] + '.json'), 'utf8'))) });
    return Promise.reject(new Error('未预期的请求: ' + url));
}

const sandbox = {
    console, setTimeout, clearTimeout, setInterval, clearInterval, Date, JSON, Math, RegExp,
    String, Number, Boolean, Array, Object, Function, Promise, Error, TypeError, ReferenceError,
    parseInt, parseFloat, isNaN, isFinite, encodeURIComponent, decodeURIComponent,
    Map, Set, Symbol, Proxy, Reflect, ArrayBuffer, Uint8Array, Uint16Array, Int32Array,
    Float32Array, Uint32Array, Uint8ClampedArray,
    localStorage, sessionStorage: localStorage,
    navigator: { userAgent: 'node-runtime-test', clipboard: { writeText: () => Promise.resolve() } },
    location: { href: 'http://localhost/23.html', protocol: 'http:', host: 'localhost',
        pathname: '/23.html', search: '', hash: '', reload() {}, assign() {}, replace() {} },
    history: { pushState() {}, replaceState() {} },
    performance: globalThis.performance || { now: () => Date.now() },
    addEventListener() {}, removeEventListener() {},
    innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1, scrollY: 0, scrollX: 0,
    open() { return null; }, print() {}, confirm() { return true; }, alert() {}, prompt() { return ''; },
    requestAnimationFrame: cb => setTimeout(cb, 0), cancelAnimationFrame: id => clearTimeout(id),
    getComputedStyle: () => ({ getPropertyValue: () => '', color: '', backgroundColor: '' }),
    matchMedia: () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }),
    MutationObserver: class { observe() {} disconnect() {} takeRecords() { return []; } },
    IntersectionObserver: class { observe() {} disconnect() {} },
    ResizeObserver: class { observe() {} disconnect() {} },
    indexedDB: { open() { return {}; }, deleteDatabase() { return {}; } },
    fetch: serve, WebSocket: undefined, XMLHttpRequest: undefined,
    Audio: class { play() { return Promise.resolve(); } pause() {} },
    Image: class { }, Worker: undefined,
    Blob: class { constructor(p) { this._p = p; } },
    URL: { createObjectURL: () => 'blob:mock', revokeObjectURL() {} },
    FormData: class { append() {} }, FileReader: class { readAsDataURL() {} },
    TextEncoder: class { encode(s) { return Buffer.from(String(s || ''), 'utf8'); } },
    TextDecoder: class { decode(b) { return Buffer.from(b).toString('utf8'); } },
    structuredClone: v => JSON.parse(JSON.stringify(v))
};
sandbox.document = {
    readyState: 'complete', title: '23.html',
    body: register(mkEl('body', {})), head: register(mkEl('head', {})), documentElement: mkEl('html'),
    createElement: t => mkEl(t), createTextNode: t => ({ nodeType: 3, textContent: String(t) }),
    getElementById: getEl, querySelector: qsel, querySelectorAll: qsaSel,
    getElementsByTagName: () => [], getElementsByClassName: () => [],
    addEventListener() {}, removeEventListener() {}, execCommand() { return false; }, hasFocus() { return true; },
    createEvent: () => ({ initEvent() {} }), cookie: ''
};
sandbox.globalThis = sandbox; sandbox.window = sandbox; sandbox.self = sandbox;
vm.createContext(sandbox);

/* ================= 工具 ================= */
const flush = ms => new Promise(r => setTimeout(r, ms));
function fire(el, type, evt) {
    const h = el && el._handlers && el._handlers[type] || [];
    const e = Object.assign({ target: el, currentTarget: el, preventDefault() {}, stopPropagation() {}, stopImmediatePropagation() {}, key: '', which: 0 }, evt || {});
    h.forEach(fn => { try { fn.call(el, e); } catch (err) { lines.push('  !! handler ' + type + ' 抛错: ' + err.message); fail++; } });
    return h.length;
}
const listEl = () => byId.get('resultList') || getEl('resultList');
const statsEl = () => byId.get('dictStats') || getEl('dictStats');
const listHtml = () => listEl().innerHTML || '';
const cardCount = () => (listHtml().match(/class="result-card"/g) || []).length;
function setInput(v) { listEl(); const s = byId.get('searchInput') || getEl('searchInput'); s.value = v; return s; }
async function search(v) {
    const s = setInput(v);
    fire(s, 'input');
    await flush(600);
}
const chip = lvl => (byClass.get('chip') || []).filter(e => (e.dataset.level || '') === lvl)[0];
const tabBtn = t => (byClass.get('tab-btn') || []).filter(e => e.dataset.type === t)[0];

/* ================= 执行页面脚本 ================= */
const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
let m, scripts = [];
while ((m = re.exec(html)) !== null) { if (m[1].trim()) scripts.push(m[1]); }
lines.push('抓到内联脚本 ' + scripts.length + ' 块');
for (const s of scripts) {
    try { vm.runInContext(s, sandbox, { filename: '23.html', timeout: 30000 }); }
    catch (e) {
        ok('脚本同步执行无异常', false, e.message + '\n    ' + (e.stack || '').split('\n').slice(1, 4).join(' | '));
        console.log('\n' + lines.join('\n'));
        process.exit(1);
    }
}
process.on('uncaughtException', function (e) {
    console.log('\n' + lines.join('\n'));
    console.log('\n未捕获异常: ' + (e && e.stack || e));
    process.exit(1);
});
ok('脚本同步执行无异常', true, scripts.length + ' 块');

(async function main() {
    await flush(400);

    /* 1. 首页：高频精选 + 词库规模 */
    ok('首页显示欢迎语', /欢迎使用/.test(listHtml()));
    ok('首页高频精选渲染出 12 张卡', cardCount() === 12, cardCount() + ' 张');
    ok('首页高频精选含 the/be/and', ['the', 'be', 'and'].every(w => new RegExp('>' + w + '<').test(listHtml())));
    ok('首页标称词条规模 30 万词', /30 万词在线词典/.test(listHtml()));
    ok('词条卡带发音与收藏按钮', /data-speak="the"/.test(listHtml()) && /data-fav="the"/.test(listHtml()));

    /* 2. 前缀搜索 */
    await search('apple');
    ok('搜索 apple 有结果', cardCount() > 0, cardCount() + ' 张');
    ok('apple 释义含「苹果」', /苹果/.test(listHtml()));
    ok('首个结果就是 apple', /class="result-card"[^>]*>[\s\S]{0,120}word">apple</.test(listHtml()));
    ok('结果显示条数统计', /共 <b>/.test(statsEl().innerHTML) || /共/.test(statsEl().textContent), statsEl().innerHTML.slice(0, 60));
    ok('拼音标注保留', /æpl/.test(listHtml()));
    ok('历史已记录 apple', /apple/.test((byId.get('historyBar') || getEl('historyBar')).innerHTML));

    /* 3. 子串检索（模糊） */
    await search('pple');
    ok('子串检索 pple 有结果', cardCount() > 0, cardCount() + ' 张');
    ok('子串检索结果均含 pple', [...listHtml().matchAll(/word">([^<]+)</g)].slice(0, 50).every(x => x[1].toLowerCase().indexOf('pple') >= 0));

    /* 4. 中文反查（V2.1.1 快速路径：zh_top 索引秒出；未命中退回全库渐进扫描） */
    const beforeZh = fetched.length;
    await search('猫');
    ok('中文反查快速路径只拉 zh_top 索引（免全库扫描）',
        fetched.length - beforeZh === 1 && /zh_top\.json$/.test(fetched[fetched.length - 1] || ''),
        '新增请求 ' + fetched.slice(beforeZh).join(',') || '(无新请求)');
    ok('中文反查「猫」出结果', cardCount() > 0, cardCount() + ' 张');
    ok('中文反查「猫」首词是 cat', /class="result-card"[^>]*>[\s\S]{0,120}word">cat</.test(listHtml()));
    ok('中文反查释义均含「猫」', [...listHtml().matchAll(/meaning">([^<]*)</g)].slice(0, 40).every(x => /猫/.test(x[1])));

    /* 4b. 索引未命中 → 退回全库渐进扫描（30 万词全覆盖） */
    const beforeFull = fetched.length;
    await search('计算机科学');
    await flush(600);
    ok('索引未命中触发全库扫描（多分片请求）', fetched.length - beforeFull > 3,
        '新增请求 ' + (fetched.length - beforeFull) + ' 个');
    ok('全库扫描兜底出结果', cardCount() > 0, cardCount() + ' 张');

    /* 5. 等级筛选 */
    const all = (await (async () => { await search('govern'); return cardCount(); })());
    ok('搜索 govern 有结果', all > 0, all + ' 张');
    const cet6 = chip('cet6');
    ok('六级 chip 存在', !!cet6);
    if (cet6) {
        setInput('govern');
        fire(cet6, 'click');
        await flush(600);
        const n = cardCount();
        ok('六级筛选后结果变少', n < all, '六级 ' + n + ' 张 / 不限 ' + all + ' 张 | 统计: ' + statsEl().innerHTML);
        ok('六级筛选结果每张卡都带「六级」标',
            [...listHtml().matchAll(/class="result-card"[\s\S]*?(?=class="result-card"|$)/g)].every(h => /六级/.test(h[0])),
            listHtml().slice(0, 320));
        ok('六级筛选统计文案正确', /筛选：六级/.test(statsEl().innerHTML + statsEl().textContent), statsEl().innerHTML + ' || ' + statsEl().textContent);
        ok('六级结果含 government', /word">government</.test(listHtml()));
        setInput('');
        fire(chip('') || chip('zk'), 'click');   // 复位到「全部」
        await flush(200);
    }

    /* 6. 分类 tab：成语 / 歇后语 / 单词 */
    setInput('');
    const idiomTab = tabBtn('idiom');
    ok('成语 tab 存在', !!idiomTab);
    if (idiomTab) {
        fire(idiomTab, 'click');
        await flush(300);
        ok('成语 tab 出结果', cardCount() > 0, cardCount() + ' 条');
        ok('成语卡标「成语」', /class="type-tag">成语</.test(listHtml()), listHtml().slice(0, 320));
    }
    const xiehouTab = tabBtn('xiehou');
    if (xiehouTab) {
        fire(xiehouTab, 'click');
        await flush(300);
        ok('歇后语 tab 出结果', cardCount() > 0, cardCount() + ' 条');
        ok('歇后语卡标「歇后语」', /class="type-tag">歇后语</.test(listHtml()), listHtml().slice(0, 320));
    }
    setInput('apple');
    const wordTab = tabBtn('word');
    if (wordTab) { fire(wordTab, 'click'); await flush(500); }
    const allTab = tabBtn('all');
    if (allTab) { fire(allTab, 'click'); await flush(500); }

    /* 7. 收藏：卡片上的 ⭐ 真的能点 */
    setInput('apple');
    if (allTab) { fire(allTab, 'click'); await flush(500); }
    store.clear();
    const favBtns = listEl().querySelectorAll('[data-fav]').filter(b => b.getAttribute('data-fav') === 'apple');
    ok('苹果卡带收藏按钮', favBtns.length > 0, favBtns.length + ' 个');
    if (favBtns.length) {
        fire(favBtns[0], 'click');
        await flush(120);
        ok('点击 ⭐ 写入收藏', JSON.parse(store.get('zl_dict_fav_v1') || '[]').indexOf('apple') >= 0,
            store.get('zl_dict_fav_v1') || '(空)');
        ok('点击后按钮变为已收藏态', favBtns[0].classList.contains('active'), favBtns[0].className);
        fire(favBtns[0], 'click');
        await flush(120);
        ok('再次点击取消收藏', JSON.parse(store.get('zl_dict_fav_v1') || '[]').indexOf('apple') < 0);
    }

    /* 收藏：预置数据后查看收藏页 */
    store.set('zl_dict_fav_v1', JSON.stringify(['apple', 'government', '卧薪尝胆']));
    const favTab = tabBtn('fav');
    ok('收藏 tab 存在', !!favTab);
    if (favTab) {
        fire(favTab, 'click');
        await flush(400);
        ok('收藏页显示收藏词条', cardCount() > 0, cardCount() + ' 条');
        ok('收藏页含 apple', /word">apple</.test(listHtml()), listHtml().slice(0, 400));
        ok('收藏页含政府相关词', /government/.test(listHtml()));
        ok('收藏页含成语条目', /卧薪尝胆/.test(listHtml()));
        ok('收藏页统计「收藏 N」', /收藏/.test(statsEl().innerHTML + statsEl().textContent), statsEl().innerHTML + ' || 卡数 ' + cardCount());
        fire(allTab, 'click');
        await flush(300);
    }
    ok('收藏数据持久化在 localStorage', JSON.parse(store.get('zl_dict_fav_v1') || '[]').length === 3);

    /* 8. 随机单词 */
    const rnd = byId.get('randomBtn') || getEl('randomBtn');
    ok('随机按钮存在', !!rnd);
    if (rnd) {
        fire(rnd, 'click');
        await flush(600);
        ok('随机词以大字卡展示', /random-card-big/.test(listHtml()));
        ok('随机词带释义', /class="rt"/.test(listHtml()));
        const w1 = (listHtml().match(/class="rw">([^<]+)/) || [])[1];
        fire(rnd, 'click');
        await flush(500);
        const w2 = (listHtml().match(/class="rw">([^<]+)/) || [])[1];
        ok('两次随机取词都是合法单词', !!w1 && !!w2, (w1 || '') + ' / ' + (w2 || ''));
    }

    /* 9. 历史 */
    ok('搜索历史上限 10 条', JSON.parse(store.get('zl_dict_hist_v1') || '[]').length <= 10,
        JSON.parse(store.get('zl_dict_hist_v1') || '[]').length + ' 条');
    const histBar = byId.get('historyBar') || getEl('historyBar');
    const clearBtn = (histBar.innerHTML || '').match(/data-clear="1"/);
    ok('历史条可点击且带清空按钮', clearBtn !== null && /data-hist=/.test(histBar.innerHTML));
    setInput('');
    const allTab2 = tabBtn('all');
    if (allTab2) { fire(allTab2, 'click'); await flush(200); }
    ok('清空搜索回到首页', /欢迎使用/.test(listHtml()), listHtml().slice(0, 160));

    /* 10. 空库与边界 */
    await search('zzzzzzzzzz');
    ok('生僻词返回空态提示', /没有找到|related|条结果/.test(listHtml()) || cardCount() === 0, listHtml().slice(0, 80));
    setInput('');
    if (allTab) { fire(allTab, 'click'); await flush(200); }
    ok('清空输入回到首页高频精选', /欢迎使用/.test(listHtml()), listHtml().slice(0, 160));

    console.log('\n' + lines.join('\n'));
    console.log('\n===== 运行测试：' + (fail === 0 ? '全部通过' : fail + ' 项失败') + ' =====');
    process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.log(lines.join('\n')); console.log('\n运行测试崩溃: ' + (e && e.stack || e)); process.exit(1); });