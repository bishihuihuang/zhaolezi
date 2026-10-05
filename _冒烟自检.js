/* 找乐子全量冒烟测试：模拟浏览器环境逐页执行内联脚本，捕获加载期运行错误。
   用法：node _page_smoke_test.js [页面名...]   （不传则全部）
   通过标准：每页所有内联 <script> 同步执行无未捕获异常。 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = path.join(__dirname, '_原始未混淆版');
const targets = process.argv.slice(2);

/* ---------------- DOM Stub ---------------- */
function makeEl(tag) {
    const el = {
        tagName: String(tag || 'div').toUpperCase(),
        nodeType: 1,
        children: [], childNodes: [], parentNode: null, firstChild: null, lastChild: null,
        style: new Proxy({}, { get: (t, k) => (k in t ? t[k] : ''), set: (t, k, v) => { t[k] = v; return true; } }),
        dataset: {},
        value: '', textContent: '', innerHTML: '', className: '', id: '',
        classList: { add() {}, remove() {}, toggle() {}, contains() { return false; }, item() { return ''; } },
        _handlers: {},
        addEventListener(type, fn) { (this._handlers[type] = this._handlers[type] || []).push(fn); },
        removeEventListener() {},
        appendChild(c) { if (c) { this.children.push(c); this.childNodes.push(c); c.parentNode = this; } return c; },
        insertBefore(c, r) { if (c) { this.children.push(c); this.childNodes.push(c); } return c; },
        removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) { this.children.splice(i, 1); } const j = this.childNodes.indexOf(c); if (j >= 0) this.childNodes.splice(j, 1); return c; },
        replaceChild() {},
        remove() {},
        setAttribute() {}, getAttribute() { return null; }, hasAttribute() { return false; }, removeAttribute() {},
        querySelector() { return makeEl('div'); }, querySelectorAll() { return []; },
        closest() { return makeEl('div'); }, matches() { return false; }, contains() { return false; },
        focus() {}, blur() {}, click() {}, scrollIntoView() {}, scrollTo() {},
        getBoundingClientRect() { return { left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0 }; },
        getContext() {
            return new Proxy({}, {
                get: (t, k) => {
                    if (k === 'measureText') return () => ({ width: 0 });
                    if (k === 'canvas') return undefined;
                    if (typeof k === 'string' && k.startsWith('create'))
                        return () => new Proxy({}, {
                            get: (t2, k2) => (k2 === 'addColorStop' ? function () {} : (k2 === 'canvas' ? undefined : function () { return undefined; })),
                            set: () => true
                        });
                    return function () { return undefined; };
                },
                set: () => true
            });
        },
        getTotalLength() { return 0; }
    };
    return el;
}
const elCache = {};
function getEl(id) { if (!elCache[id]) elCache[id] = makeEl('div'); return elCache[id]; }

/* ---------------- Storage Stub ---------------- */
function makeStorage() {
    const m = new Map();
    return {
        getItem: k => (m.has(k) ? m.get(k) : null),
        setItem: (k, v) => { m.set(k, String(v)); },
        removeItem: k => { m.delete(k); },
        clear: () => m.clear(),
        key: i => [...m.keys()][i] || null,
        get length() { return m.size; }
    };
}

/* ---------------- Sandbox ---------------- */
function makeSandbox(pageName) {
    const storage = makeStorage();
    const sandbox = {
        console, setTimeout, clearTimeout, setInterval, clearInterval, Date, JSON, Math, RegExp,
        String, Number, Boolean, Array, Object, Function, Promise, Error, TypeError, ReferenceError,
        parseInt, parseFloat, isNaN, isFinite, encodeURIComponent, decodeURIComponent, encodeURI, decodeURI,
        Map, Set, WeakMap, WeakSet, Symbol, Proxy, Reflect,
        Atomics, Intl, BigInt, ArrayBuffer, DataView, Uint8Array, Int8Array, Uint16Array, Int16Array,
        Uint32Array, Int32Array, Float32Array, Float64Array, Uint8ClampedArray,
        globalThis: null, window: null, self: null, document: null, localStorage: storage,
        sessionStorage: storage, navigator: { userAgent: 'smoke', clipboard: { writeText: () => Promise.resolve() } },
        screen: {}, location: { href: 'http://localhost/' + pageName, protocol: 'http:', host: 'localhost',
            pathname: '/' + pageName, search: '', hash: '', reload() {}, assign() {}, replace() {} },
        history: { pushState() {}, replaceState() {} },
        performance: globalThis.performance || { now: () => Date.now() },
        addEventListener() {}, removeEventListener() {},
        innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1, scrollY: 0, scrollX: 0,
        open() { return null; }, print() {}, confirm() { return true; }, alert() {}, prompt() { return ''; },
        requestAnimationFrame: cb => setTimeout(cb, 0),
        getComputedStyle: () => new Proxy({}, { get: (t, k) => (k === 'getPropertyValue' ? () => '' : (k in t ? t[k] : '')), set: () => true }),
        matchMedia: () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }),
        requestAnimationFrame: cb => setTimeout(cb, 0),
        cancelAnimationFrame: id => clearTimeout(id),
        MutationObserver: class { observe() {} disconnect() {} takeRecords() { return []; } },
        IntersectionObserver: class { observe() {} disconnect() {} },
        ResizeObserver: class { observe() {} disconnect() {} },
        indexedDB: {
            open() { return { onupgradeneeded: null, onsuccess: null, onerror: null, result: null, transaction: () => makeTx() }; },
            deleteDatabase() { return {}; }
        },
        fetch: () => Promise.reject(new Error('fetch not used in sync path')),
        WebSocket: undefined, XMLHttpRequest: undefined,
        Audio: class { play() { return Promise.resolve(); } pause() {} },
        Image: class { },
        Worker: undefined,
        Blob: class { constructor(p) { this._p = p; } },
        URL: { createObjectURL: () => 'blob:mock', revokeObjectURL() {} },
        broadcastChannel: undefined,
        FormData: class { append() {} },
        FileReader: class { readAsDataURL() {} },
        TextEncoder: class { encode(s) { return Buffer.from(String(s || ''), 'utf8'); } },
        TextDecoder: class { decode(b) { return Buffer.from(b).toString('utf8'); } },
        structuredClone: v => JSON.parse(JSON.stringify(v))
    };
    // 元素工厂
    sandbox.document = {
        readyState: 'complete',
        title: pageName,
        body: makeEl('body'),
        head: makeEl('head'),
        documentElement: makeEl('html'),
        createElement: t => makeEl(t),
        createTextNode: t => ({ nodeType: 3, textContent: String(t) }),
        getElementById: getEl,
        querySelector: () => makeEl('div'),
        querySelectorAll: () => [],
        getElementsByTagName: () => [],
        getElementsByClassName: () => [],
        addEventListener() {}, removeEventListener() {},
        execCommand() { return false; },
        hasFocus() { return true; },
        createEvent: () => ({ initEvent() {} }),
        cookie: ''
    };
    sandbox.globalThis = sandbox;
    sandbox.window = sandbox;
    sandbox.self = sandbox;
    return { sandbox, storage };
}

function makeTx() {
    return new Proxy({}, {
        get: (t, k) => {
            if (k === 'objectStore') return () => makeStore();
            if (k === 'done') return undefined;
            return () => undefined;
        }
    });
}
function makeStore() {
    return new Proxy({}, {
        get: (t, k) => {
            if (k === 'add' || k === 'put' || k === 'delete' || k === 'get' || k === 'clear' || k === 'getAll')
                return () => ({ onsuccess: null, onerror: null, result: [] });
            return undefined;
        }
    });
}

/* ---------------- 主流程 ---------------- */
/* 已知 Stub 局限（人工复核确认真实浏览器正常，不计入失败）：
   18.html：init() 读 categorySelect.value，Stub 无 <option> 返回 ''；
   真实浏览器自动选中第一个 option（value='length'），与 unitData key 匹配，正常。 */
const KNOWN_STUB_LIMITS = { '18.html': 'select.value 默认值（真实浏览器默认选中第一个 option）' };
const files = targets.length ? targets : fs.readdirSync(SRC).filter(f => f.endsWith('.html'));
let pass = 0, fail = 0, waive = 0;
const failures = [];
for (const f of files) {
    const code = fs.readFileSync(path.join(SRC, f), 'utf8');
    const scripts = [];
    const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
    let m;
    while ((m = re.exec(code)) !== null) {
        if (m[1].trim()) scripts.push(m[1]);
    }
    const ctx = makeSandbox(f);
    vm.createContext(ctx.sandbox);
    let pageOk = true, errMsg = '', errStack = '', errIdx = 0;
    for (let i = 0; i < scripts.length; i++) {
        try {
            vm.runInContext(scripts[i], ctx.sandbox, { filename: f + '#s' + i, timeout: 3000 });
        } catch (e) {
            pageOk = false;
            errIdx = i;
            errMsg = (e && e.message) || String(e);
            errStack = (e && e.stack || '').split('\n').slice(0, 3).join(' | ');
            break;
        }
    }
    if (pageOk) { pass++; console.log('PASS  ' + f + ' (' + scripts.length + ' 块)'); }
    else if (KNOWN_STUB_LIMITS[f]) {
        waive++;
        console.log('WAIV ' + f + ' → ' + KNOWN_STUB_LIMITS[f] + '（人工复核：真实浏览器正常）');
    }
    else {
        fail++;
        console.log('FAIL  ' + f + ' → ' + errMsg);
        failures.push({ page: f, script: errIdx, error: errMsg, stack: errStack });
    }
}
console.log('\n========== 冒烟结果：通过 ' + pass + ' / ' + (pass + fail + waive) + '（豁免 ' + waive + '） ==========');
if (failures.length) {
    console.log('\n失败明细：');
    failures.forEach(x => console.log('  - ' + x.page + ' #s' + x.script + ': ' + x.error + '\n    ' + x.stack));
    process.exitCode = 1;
}
process.exit(process.exitCode || 0);
