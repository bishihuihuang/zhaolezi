/**
 * test_ach_logic.js — 成就系统 V2.2 逻辑测试（Node，无依赖）
 *
 * 1) 目录健全性：94 条（基础≥40）/id 唯一/tier·cat·how 齐全/指标与目标配对/隐藏标记
 * 2) 功能链路：bump 解锁 / cond 条件解锁 / 级联 / 去重 / 积分 / 头衔 / 弹卡队列 / 迁移
 *
 * 用法：node 工具脚本/test_ach_logic.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let pass = 0, fail = 0;
function ok(cond, msg) {
    if (cond) { pass++; console.log('  ✅ ' + msg); }
    else { fail++; console.error('  ❌ ' + msg); }
}
function eq(a, b, msg) {
    if (a === b) { pass++; console.log('  ✅ ' + msg); }
    else { fail++; console.error('  ❌ ' + msg + '（期望 ' + JSON.stringify(b) + '，实际 ' + JSON.stringify(a) + '）'); }
}

/* ---------- 浏览器桩（Map 版 localStorage + 可挂 body 的 document） ---------- */
function makeLS() {
    const m = new Map();
    return {
        getItem: k => (m.has(k) ? m.get(k) : null),
        setItem: (k, v) => m.set(k, String(v)),
        removeItem: k => m.delete(k),
        clear: () => m.clear(),
        _dump: () => Object.fromEntries(m)
    };
}
const localStorage = makeLS();
const fakeBody = {
    textContent: '', style: {}, classList: { add() {}, remove() {} },
    appendChild() {}, remove() {}, querySelector: () => null
};
const documentStub = {
    readyState: 'complete',
    body: fakeBody,
    getElementById: () => null,
    querySelector: () => null,
    createElement: () => ({
        style: {}, innerHTML: '', textContent: '', id: '', className: '',
        classList: { add() {}, remove() {} }, href: '', download: '',
        appendChild() {}, remove() {}, setAttribute() {}, click() {}
    }),
    documentElement: { setAttribute() {}, getAttribute: () => null },
    addEventListener() {}
};
const windowStub = {
    location: { pathname: '/test.html' },
    localStorage,
    addEventListener() {},
    setInterval() {}, clearInterval() {}
};
const sandbox = {
    console, setTimeout, clearTimeout, Date, JSON, Math, Array, Object, String, Number, RegExp, parseInt, parseFloat, isNaN,
    window: windowStub, document: documentStub, localStorage,
    location: windowStub.location, navigator: { userAgent: 'node' },
    BroadcastChannel: class { constructor() {} postMessage() {} close() {} },
    MutationObserver: class { observe() {} disconnect() {} },
    getComputedStyle: () => ({}),
    Blob: class {}, URL: { createObjectURL: () => 'blob:test', revokeObjectURL() {} },
    Audio: class { play() {} }, SpeechRecognition: class {}
};
vm.createContext(sandbox);

const src = fs.readFileSync(path.join(__dirname, '..', 'zl-features.js'), 'utf8');
vm.runInContext(src, sandbox);
const ZL = windowStub.ZL;
sandbox.ZL = ZL; // 供后续 runInContext 直接引用

if (!ZL || !Array.isArray(ZL.ACHIEVEMENTS)) {
    console.error('❌ zl-features.js 未正确挂载 ZL.ACHIEVEMENTS');
    process.exit(1);
}

const A = ZL.ACHIEVEMENTS;
const ids = A.map(a => a.id);
const cats = ZL.CATS.map(c => c.id);
const tiers = [1, 2, 3, 'h'];

console.log('\n【1】目录健全性');
eq(A.length, 94, '成就总数 = 94（实际 ' + A.length + '）');
const base = A.filter(a => a.tier === 1).length;
const mid = A.filter(a => a.tier === 2).length;
const high = A.filter(a => a.tier === 3).length;
const hid = A.filter(a => a.tier === 'h').length;
console.log('  基础 ' + base + ' / 中级 ' + mid + ' / 高级 ' + high + ' / 隐藏 ' + hid);
ok(base >= 40, '基础成就 ≥ 40（实际 ' + base + '）');
ok(mid >= 10, '中级成就 ≥ 10（实际 ' + mid + '）');
ok(high >= 8, '高级成就 ≥ 8（实际 ' + high + '）');
ok(hid >= 4, '隐藏成就 ≥ 4（实际 ' + hid + '）');
ok(new Set(ids).size === ids.length, 'id 全部唯一');
let bad = [];
for (const a of A) {
    if (!a.t || !a.d || !a.icon || !a.how) bad.push(a.id + ' 缺 t/d/icon/how');
    if (tiers.indexOf(a.tier) < 0) bad.push(a.id + ' tier 非法:' + a.tier);
    if (cats.indexOf(a.cat) < 0) bad.push(a.id + ' cat 非法:' + a.cat);
    if (a.metric && a.target == null) bad.push(a.id + ' 有 metric 缺 target');
    if (a.metric && a.mode && a.mode !== 'max') bad.push(a.id + ' mode 非法:' + a.mode);
    if (a.hide && a.tier !== 'h') bad.push(a.id + ' hide 但非隐藏 tier');
    if (a.tier === 'h' && !a.hide && a.id !== 'keyboard_easter') bad.push(a.id + ' 隐藏 tier 未标记 hide');
}
eq(bad.length, 0, '字段完整性与合法性（' + (bad.length ? bad.join('; ') : '全部通过') + '）');
const old10 = ['first_login', 'game_first', 'gobang_win', 'mines_clear', 'memory_pair', 'tool_10', 'checkin_7', 'daily_quiz', 'typing_50', 'tictac_win', 'focus_25'];
const missing = old10.filter(id => ids.indexOf(id) < 0);
eq(missing.length, 0, '旧 11 条成就 id 全部保留（' + (missing.length ? missing.join(',') : '兼容无损') + '）');

/* ---------- 独立状态：功能链路 ---------- */
localStorage.clear();
vm.runInContext('ZL.dataMigration("ach_v2","2.2.0",function(){}); ZL.checkAll(true);', sandbox);

console.log('\n【2】bump 指标解锁 + 级联');
let n = vm.runInContext('ZL.bump("gobang_win", 1).length', sandbox);
ok(n > 0, 'bump(gobang_win) 返回新解锁数 > 0（' + n + '）');
ok(vm.runInContext('ZL.getUnlocked().indexOf("gobang_win") >= 0', sandbox), 'gobang_win 已解锁');
ok(vm.runInContext('ZL.getUnlocked().indexOf("first_ach") >= 0', sandbox), '级联解锁 first_ach');
ok(vm.runInContext('ZL.bump("gobang_win", 1).length === 0', sandbox), '重复 bump 不重复解锁');

console.log('\n【3】max 模式');
vm.runInContext('ZL.bump("typing_best", 60, "max")', sandbox);
ok(vm.runInContext('ZL.getUnlocked().indexOf("typing_30") >= 0', sandbox), 'typing_30 解锁');
ok(vm.runInContext('ZL.getUnlocked().indexOf("typing_50") >= 0', sandbox), 'typing_50 解锁（旧成就保留）');
ok(vm.runInContext('ZL.getUnlocked().indexOf("typing_100") < 0', sandbox), 'typing_100 未越级解锁');
ok(vm.runInContext('ZL.bump("typing_best", 50, "max").length === 0', sandbox), 'max 低值不覆盖');

console.log('\n【4】cond 条件解锁（读真实页面数据）');
localStorage.setItem('zl_checkin', JSON.stringify({ last: '2026-10-06', streak: 7, total: 9 }));
localStorage.setItem('zl_used', JSON.stringify(['a.html', 'b.html', 'c.html', 'd.html', 'e.html', 'f.html', 'g.html', 'h.html', 'i.html', 'j.html', 'k.html']));
vm.runInContext('ZL.checkAll(true)', sandbox);
ok(vm.runInContext('ZL.getUnlocked().indexOf("checkin_7") >= 0', sandbox), 'checkin_7 由 zl_checkin.streak=7 解锁');
ok(vm.runInContext('ZL.getUnlocked().indexOf("visit_10") >= 0', sandbox), 'visit_10 由 zl_used 解锁');
ok(vm.runInContext('ZL.getUnlocked().indexOf("tool_10") >= 0', sandbox), 'tool_10 同源解锁');
ok(vm.runInContext('ZL.getUnlocked().indexOf("checkin_14") < 0', sandbox), 'checkin_14 未越级');

console.log('\n【5】trackPage 统计');
localStorage.clear();
vm.runInContext('ZL.trackPage("20.html")', sandbox);
vm.runInContext('ZL.trackPage("20.html")', sandbox);
vm.runInContext('ZL.trackPage("21.html")', sandbox);
eq(JSON.parse(localStorage.getItem('zl_used')).length, 2, 'zl_used 去重（同页两次只记一）');
const dd = JSON.parse(localStorage.getItem('zl_daily_days'));
ok(Array.isArray(dd) && dd.length >= 1, '活跃日 zl_daily_days 已记（' + dd.length + ' 天）');
const pd = JSON.parse(localStorage.getItem('zl_page_days'));
ok(pd['20.html'] && pd['20.html'].length === 1, '每页使用日去重');
vm.runInContext('ZL.trackPage("30.html")', sandbox);
eq(JSON.parse(localStorage.getItem('zl_used')).length, 3, 'trackPage 不做页面黑名单（skip 在页面自动调用处）');

console.log('\n【6】同页连续 7 天（隐藏 same_tool_7d）');
localStorage.clear();
const pd7 = {};
pd7['43.html'] = ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05', '2026-09-06', '2026-09-07'];
localStorage.setItem('zl_page_days', JSON.stringify(pd7));
vm.runInContext('ZL.checkAll(true)', sandbox);
ok(vm.runInContext('ZL.getUnlocked().indexOf("same_tool_7d") >= 0', sandbox), 'same_tool_7d 由连续 7 天解锁');
localStorage.clear();
pd7['43.html'] = ['2026-09-01', '2026-09-03', '2026-09-05', '2026-09-07'];
localStorage.setItem('zl_page_days', JSON.stringify(pd7));
vm.runInContext('ZL.checkAll(true)', sandbox);
ok(vm.runInContext('ZL.getUnlocked().indexOf("same_tool_7d") < 0', sandbox), '隔日访问不解锁（fresh 状态校验）');

console.log('\n【7】unlock 幂等 + 元数据 + 队列');
localStorage.clear();
eq(vm.runInContext('ZL.unlock("focus_25")', sandbox), true, '首次 unlock 返回 true');
eq(vm.runInContext('ZL.unlock("focus_25")', sandbox), false, '重复 unlock 返回 false');
const meta = JSON.parse(localStorage.getItem('zl_ach_meta'));
ok(meta.focus_25 > 0, 'zl_ach_meta 记录时间戳');
vm.runInContext('ZL.unlock("focus_first", true)', sandbox); // silent：只入队不弹卡
let q = JSON.parse(localStorage.getItem('zl_ach_new'));
ok(Array.isArray(q) && q.indexOf('focus_first') >= 0, 'silent 解锁入队 zl_ach_new');
vm.runInContext('ZL.drainNew()', sandbox);
q = JSON.parse(localStorage.getItem('zl_ach_new'));
eq(q.length, 0, 'drainNew 后队列清空');

console.log('\n【8】积分与头衔');
const unlocked = vm.runInContext('ZL.getUnlocked()', sandbox);
const expectPts = unlocked.reduce((p, id) => { const a = ZL.byId(id); return p + (a ? ZL.TIER_PTS[a.tier] : 0); }, 0);
eq(vm.runInContext('ZL.getPoints()', sandbox), expectPts, '积分 = 各 tier 点数之和（' + expectPts + '）');
const tl = vm.runInContext('ZL.getTitle()', sandbox);
ok(tl.cur && tl.cur.nm, '当前头衔存在：' + tl.cur.ic + tl.cur.nm);
eq(tl.count, unlocked.length, '头衔 count 同步');
/* 88 条 → 全站大师 */
localStorage.clear();
const all88 = A.filter(a => a.id !== 'ach_90' && a.id !== 'all_pages').map(a => a.id);
localStorage.setItem('zl_ach', JSON.stringify(all88));
eq(vm.runInContext('ZL.getTitle().cur.nm', sandbox), '全站大师', '88 条解锁 → 头衔「全站大师」');

console.log('\n【9】achInfo 与隐藏态');
localStorage.clear();
localStorage.setItem('zl_ach_stats', JSON.stringify({ typing_best: 60 }));
const info = vm.runInContext('ZL.achInfo("typing_100")', sandbox);
ok(info && !info.unlocked && info.cur === 60 && info.target === 100, '未解锁进度 cur=60 / target=100');
ok(info.hide === false, '非隐藏成就 hide=false（墙统一渲染）');
ok(vm.runInContext('ZL.achInfo("keyboard_easter").hide', sandbox) === true, '隐藏成就 hide=true');
eq(vm.runInContext('ZL.achInfo("nonexistent")', sandbox), null, '未知 id 返回 null');

console.log('\n【10】迁移幂等');
localStorage.setItem('zl_app_version', JSON.stringify({ ver: '2.2.0', read: [] }));
localStorage.setItem('mig_count', '0');
vm.runInContext('ZL.dataMigration("ach_v2","2.2.0",function(){ var c = +(localStorage.getItem("mig_count")||0); localStorage.setItem("mig_count", String(c+1)); })', sandbox);
eq(localStorage.getItem('mig_count'), '0', 'dataMigration 幂等不重跑');

console.log('\n结果：通过 ' + pass + ' / 失败 ' + fail);
process.exit(fail ? 1 : 0);
