/**
 * gen_zh_top.js — 为 23.html 中文反查生成「前 2 万高频词」预置数组 zh_top.json
 *
 * 背景：中文反查原为全库 26 分片（21MB）渐进扫描，常见词查询也要等全量下载。
 * 本脚本从已生成的 26 分片提取全局词频 rank 前 20,000 词条，输出为单个裸数组
 * （与分片同格式 [word,phonetic,translation,tag,bnc,frq]），运行时用它在内存里
 * 直接跑 matchTrans，常见中文词反查免全库扫描（秒出）；未命中仍退回全库扫描，
 * 30 万词全覆盖不受影响。
 *
 * 用法：node 工具脚本/gen_zh_top.js
 * 依赖：仅 node 内置模块；先有 23data/{a-z}.json（gen_ecdict_shards.js 产物）
 */
'use strict';
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, '..', '23data');
const LETTERS = 'abcdefghijklmnopqrstuvwxyz';
const TOP = 20000; // 前 ~2 万高频词

/* 与页面 matchTrans 一致的频率键：bnc/frq 是 rank（1=最高频），9999999=无数据兜底 */
function freqScore(e) { return (e[4] || 9999999) + (e[5] || 9999999); }

const all = [];
for (const L of LETTERS) {
    const arr = JSON.parse(fs.readFileSync(path.join(DATA, L + '.json'), 'utf8'));
    if (!Array.isArray(arr)) throw new Error(L + '.json 非数组');
    for (const e of arr) all.push(e);
}
console.log('总词条:', all.length);

all.sort((a, b) => {
    const ka = freqScore(a), kb = freqScore(b);
    if (ka !== kb) return ka - kb;
    if (a[0].length !== b[0].length) return a[0].length - b[0].length; // 与 matchTrans 次级排序一致
    return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
});
const top = all.slice(0, TOP);
console.log('前 ' + TOP + ' 词首位:', top[0][0], '| 末位:', top[top.length - 1][0]);

const payload = JSON.stringify(top);
const fn = path.join(DATA, 'zh_top.json');
fs.writeFileSync(fn, payload, 'utf-8');
const bytes = Buffer.byteLength(payload, 'utf-8');
console.log('zh_top.json:', top.length + ' 词条, ' + (bytes / 1024 / 1024).toFixed(2) + ' MB');

/* 更新 index.json 元信息 */
const indexFn = path.join(DATA, 'index.json');
const index = JSON.parse(fs.readFileSync(indexFn, 'utf8'));
index.zh_top = { count: top.length, bytes };
fs.writeFileSync(indexFn, JSON.stringify(index, null, 2), 'utf-8');
console.log('index.json 已记录 zh_top');

/* 质量断言：高频词 must-have + 常用中文反查用例首词 */
for (const w of ['the', 'be', 'and', 'of', 'a', 'to', 'in']) {
    if (!top.some(r => r[0].toLowerCase() === w)) throw new Error('高频词缺失: ' + w);
}
const RANK_EXPECT = { '苹果': 'apple', '计算机': 'computer', '幸福': 'happy', '猫': 'cat', '学习': 'study' };
for (const kw of Object.keys(RANK_EXPECT)) {
    const hits = top.filter(e => (e[2] || '').toLowerCase().indexOf(kw) >= 0);
    const names = hits.slice(0, 5).map(e => e[0]);
    console.log('  「' + kw + '」索引命中 ' + hits.length + ' 条，前5: ' + names.join('/'));
    const exp = RANK_EXPECT[kw];
    if (hits.length === 0) throw new Error('「' + kw + '」索引零命中');
    if (hits.map(e => e[0]).indexOf(exp) < 0) throw new Error('「' + kw + '」期望首词 ' + exp + ' 不在索引');
}
console.log('zh_top 质量断言通过');
