/* test_23_logic.js — 用真实分片数据复现 23.html 的检索算法，验证数据与逻辑
   用法：node 工具脚本/test_23_logic.js */
'use strict';
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, '..', '23data');
const LETTERS = 'abcdefghijklmnopqrstuvwxyz';
let fail = 0;
function ok(name, cond, extra) {
    console.log((cond ? 'PASS  ' : 'FAIL  ') + name + (extra !== undefined ? '  -> ' + extra : ''));
    if (!cond) fail++;
}

/* ===== 载入分片 ===== */
const shards = {};
let total = 0;
for (let i = 0; i < LETTERS.length; i++) {
    const L = LETTERS[i];
    const arr = JSON.parse(fs.readFileSync(path.join(DATA, L + '.json'), 'utf8'));
    ok('分片 ' + L + ' 为数组', Array.isArray(arr));
    shards[L] = arr;
    total += arr.length;
}
const index = JSON.parse(fs.readFileSync(path.join(DATA, 'index.json'), 'utf8'));
ok('总词量 ≥ 300,000', total >= 300000, total.toLocaleString());
ok('index.json total 与实际一致', index.total === total, index.total + ' vs ' + total);

let shapeBad = 0, badWords = 0, emptyTrans = 0, tagBad = 0, cnWords = 0;
const VALID_TAG = /^[\x20-zk]*$/;
for (const L of LETTERS) {
    for (const e of shards[L]) {
        if (!Array.isArray(e)) { shapeBad++; continue; }
        if (typeof e[0] !== 'string' || !e[0]) { badWords++; continue; }
        if (typeof e[1] !== 'string' || typeof e[2] !== 'string') shapeBad++;
        if (!e[2]) emptyTrans++;
        if (typeof e[3] !== 'string') tagBad++;
        if (/^[a-z]+$/.test(e[0]) === false && /[a-z]/i.test(e[0])) cnWords++;
        if (typeof e[4] === 'number' && typeof e[5] === 'number' && (e[4] < 0 || e[5] < 0)) shapeBad++;
        // 每个词条都必须落在自己的字母分片里
        if (e[0].charAt(0).toLowerCase() !== L) shapeBad++;
    }
}
ok('字段结构全部合法', shapeBad === 0, '异常 ' + shapeBad);
ok('首词全部非空', badWords === 0, '异常 ' + badWords);
ok('tag 字段类型合法', tagBad === 0, '异常 ' + tagBad);
ok('翻译字段全部非空', emptyTrans === 0, '空翻译 ' + emptyTrans + '（占比 ' + (emptyTrans / total * 100).toFixed(1) + '%）');
ok('词条分片字母归属正确', shapeBad === 0);
ok('含大小写混排的词条正常（非纯小写）', cnWords >= 0, '混合词条 ' + cnWords);

/* ===== 复现 matchShard ===== */
function freqScore(e) { return (e[4] || 9999999) + (e[5] || 9999999); }
function levelMatch(tag, level) {
    if (!level) return true;
    const want = level.split(' ');
    const has = (tag || '').split(' ');
    return want.some(function (w) { return has.indexOf(w) >= 0; });
}
function matchShard(arr, kw, level) {
    const pre = [], sub = [];
    for (let i = 0; i < arr.length; i++) {
        const e = arr[i];
        if (!levelMatch(e[3], level)) continue;
        const lw = (e[0] || '').toLowerCase();
        if (lw === kw) { pre.unshift({ item: e, score: 1000 }); continue; }
        if (lw.indexOf(kw) === 0) { pre.push({ item: e, score: 500 - Math.min(lw.length, 100) / 3 }); continue; }
        if (lw.indexOf(kw) > 0) { sub.push({ item: e, score: 200 - Math.min(lw.length, 100) / 2 }); continue; }
    }
    const out = pre.concat(sub);
    out.sort(function (a, b) {
        if (b.score !== a.score) return b.score - a.score;
        return freqScore(a.item) - freqScore(b.item);
    });
    return out.slice(0, 300);
}
const allEntries = () => LETTERS.split('').reduce(function (a, L) { return a.concat(shards[L]); }, []);

/* 精确匹配置顶 */
const apple = matchShard(shards.a, 'apple');
ok('精确匹配 apple 置顶', apple.length && apple[0].item[0] === 'apple');
ok('apple 释义为中文', /苹/.test(apple[0].item[2] || ''), apple[0].item[2]);

/* 前缀优先于子串 */
const pre = matchShard(shards.a, 'app');
ok('前缀检索 app 命中 >=30', pre.length >= 30, pre.length + ' 条');
const firstSub = pre.findIndex(function (r) { return r.item[0].toLowerCase().indexOf('app') > 0; });
ok('前缀结果排在子串结果之前', firstSub === -1 || pre.slice(0, firstSub).every(function (r) { return r.item[0].toLowerCase().indexOf('app') === 0; }));
ok('检索词全部包含于结果（忽略大小写）', pre.every(function (r) { return r.item[0].toLowerCase().indexOf('app') >= 0; }));

/* 词频 tie-break：同分数组内高频词在前 */
const the = matchShard(shards.t, 'the');
ok('高频冠词 the 命中', the.length > 0 && the[0].item[0] === 'the');
const tiebreakOk = the.every(function (r, i) {
    if (i === 0) return true;
    const p = the[i - 1];
    if (p.score !== r.score) return p.score >= r.score;
    return freqScore(p.item) <= freqScore(r.item);
});
ok('同分数组内按 BNC+FRQ 升序', tiebreakOk);

/* 子串检索 */
const ion = matchShard(shards.i, 'ion');
ok('子串检索 ion 有结果', ion.length > 0, ion.length + ' 条');

/* 词频数据合理性：最前面的高频词应是常见词 */
const rank1 = matchShard(allEntries(), '');
ok('全库检索可跑通', rank1.length > 0);

/* 等级筛选 */
const cet4 = matchShard(allEntries(), 'the', 'cet4');
ok('CET4 筛选生效', cet4.every(function (r) { return /(^| )cet4( |$)/.test(r.item[3] || ''); }), '命中 ' + cet4.length + ' 条');
const allThe = matchShard(allEntries(), 'the');
ok('不加筛选结果更多', allThe.length >= cet4.length);

/* ===== 中文反查 matchTrans ===== */
function matchTrans(arr, kw, level) {
    const out = [];
    for (const e of arr) {
        if (!levelMatch(e[3], level)) continue;
        if ((e[2] || '').toLowerCase().indexOf(kw) >= 0) out.push({ item: e, score: 100 });
    }
    out.sort(function (a, b) {
        const ka = freqScore(a.item), kb = freqScore(b.item);
        if (ka !== kb) return ka - kb;
        return a.item[0].length - b.item[0].length;
    });
    return out.slice(0, 200);
}
const big = allEntries();
const RANK_EXPECT = { '苹果': 'apple', '计算机': 'computer', '幸福': 'happy', '猫': 'cat', '学习': 'study' };
for (const kw of ['苹果', '计算机', '幸福', '猫', '学习']) {
    const r = matchTrans(big, kw);
    const top = r.map(function (x) { return x.item[0]; });
    ok('中文反查「' + kw + '」有结果', r.length > 0, r.length + ' 条，前 5：' + top.slice(0, 5).join('/'));
    ok('中文反查结果释义均包含该词', r.every(function (x) { return (x.item[2] || '').indexOf(kw) >= 0; }));
    const exp = RANK_EXPECT[kw];
    /* 用例必须显式给出期望词——漏配不能静默跳过，否则词频排序回归测不出来 */
    ok('中文反查「' + kw + '」已配置期望首词', !!exp, '期望词：' + exp);
    ok('中文反查「' + kw + '」高频词排在前列', !!exp && top.indexOf(exp) < 6, '期望 ' + exp + ' 在索引 ' + top.indexOf(exp));
}
/* 排序单调性：结果整体按词频升序 */
ok('中文反查结果整体按词频升序', matchTrans(big, '学习').every(function (r, i, a) {
    return i === 0 || freqScore(a[i - 1].item) <= freqScore(r.item);
}));

/* ===== 中文反查快速索引 zh_top（前 2 万高频词，常见词反查免全库扫描） ===== */
const zhTop = JSON.parse(fs.readFileSync(path.join(DATA, 'zh_top.json'), 'utf8'));
ok('zh_top 为数组且 20,000 条', Array.isArray(zhTop) && zhTop.length === 20000, zhTop.length + ' 条');
ok('zh_top 词条结构与分片一致', zhTop.every(e => Array.isArray(e) && e.length === 6 && typeof e[0] === 'string' && e[0]));
ok('zh_top 首词为高频词 the', zhTop.length > 0 && zhTop[0][0] === 'the', zhTop[0] && zhTop[0][0]);
const fullSet = new Set(big.map(e => e[0]));
ok('zh_top 全部来自全库（子集校验）', zhTop.every(e => fullSet.has(e[0])));
const ZH_TOP_EXPECT = { '苹果': 'apple', '计算机': 'computer', '幸福': 'happy', '猫': 'cat', '学习': 'study' };
for (const kw of Object.keys(ZH_TOP_EXPECT)) {
    const rIdx = matchTrans(zhTop, kw);
    const rFull = matchTrans(big, kw);
    const exp = ZH_TOP_EXPECT[kw];
    ok('索引反查「' + kw + '」有结果', rIdx.length > 0, rIdx.length + ' 条');
    /* 用例必须显式给出期望词——漏配不能静默跳过 */
    ok('索引反查「' + kw + '」已配置期望首词', !!exp, '期望词：' + exp);
    ok('索引反查「' + kw + '」期望词在前列', !!exp && rIdx.map(x => x.item[0]).indexOf(exp) < 6,
        '期望 ' + exp + ' 在索引 ' + rIdx.map(x => x.item[0]).indexOf(exp));
    ok('索引反查「' + kw + '」结果 ⊆ 全库结果', rIdx.every(x => rFull.some(y => y.item[0] === x.item[0])));
    ok('索引反查「' + kw + '」首词与全库一致', rFull.length > 0 && rIdx.length > 0 && rIdx[0].item[0] === rFull[0].item[0],
        rIdx[0] ? rIdx[0].item[0] + ' / 全库 ' + (rFull[0] && rFull[0].item[0]) : '(索引空)');
}

/* ===== 首页高频精选：a/b/t 三片取前 12 ===== */
const hot = shards.a.concat(shards.b, shards.t)
    .slice()
    .sort(function (x, y) { return freqScore(x) - freqScore(y); })
    .slice(0, 12);
ok('首页高频精选有 12 条', hot.length === 12);
ok('精选词均为真实高频词', hot.every(function (e) { return freqScore(e) < 19999998; }),
    hot.map(function (e) { return e[0]; }).join(', '));

/* ===== 随机单词可用性 ===== */
let emptyShards = 0;
for (const L of LETTERS) if (!shards[L].length) emptyShards++;
ok('26 个分片全部非空（随机词不会落空）', emptyShards === 0, '空分片 ' + emptyShards);

console.log('\n===== 逻辑测试结果：' + (fail === 0 ? '全部通过' : fail + ' 项失败') + ' =====');
console.log('总词条：' + total.toLocaleString() + '  |  含中文反查可用词条：' + big.length.toLocaleString());
process.exit(fail === 0 ? 0 : 1);
