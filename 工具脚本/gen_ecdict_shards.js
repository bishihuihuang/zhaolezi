/**
 * gen_ecdict_shards.js — 从 ECDICT(ecdict.csv) 生成 23.html 词典分片数据
 *
 * 数据源：ECDICT (github.com/skywind3000/ECDICT) MIT License
 *   https://github.com/skywind3000/ECDICT
 * 列：word,phonetic,definition,translation,pos,collins,oxford,tag,bnc,frq,exchange,detail,audio
 *
 * 输出：E:\上传网页\zhaolezi\23data\d.json 等 26 个分片 + index.json
 * 每片格式：{"a":[[word,phonetic,translation,pos,tag,bnc,frq],...],...} 紧凑数组省体积
 *
 * 用法：node 工具脚本/gen_ecdict_shards.js <ecdict.csv路径>
 * 依赖：仅 node 内置模块
 */
'use strict';
const fs = require('fs');
const path = require('path');

const csvPath = process.argv[2];
if (!csvPath) { console.error('用法: node gen_ecdict_shards.js <ecdict.csv>'); process.exit(1); }
const OUT_DIR = path.join(__dirname, '..', '23data');
const TARGET = 300000; // 至少 30 万词

/* ---------- 引号感知智能分行（字段内换行不切断） ---------- */
function splitCsvSmart(text) {
    const rows = [];
    let cur = '', inQ = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (inQ) {
            if (c === '"') {
                if (text[i + 1] === '"') { cur += '""'; i++; }
                else inQ = false;
            }
            cur += c;
        } else if (c === '"') { inQ = true; cur += c; }
        else if (c === '\n') { rows.push(cur); cur = ''; }
        else cur += c;
    }
    if (cur.trim()) rows.push(cur);
    return rows;
}

/* ---------- CSV 解析（正确处理引号内逗号/换行） ---------- */
function parseCsvLine(line) {
    const out = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (inQ) {
            if (c === '"') {
                if (line[i + 1] === '"') { cur += '"'; i++; }
                else inQ = false;
            } else cur += c;
        } else if (c === '"') inQ = true;
        else if (c === ',') { out.push(cur); cur = ''; }
        else cur += c;
    }
    out.push(cur);
    return out;
}

/* 只保留纯英文字母单词（a-z，长度 1-45），排除带连字符/撇号/空格/数字的条目 */
const PURE = /^[a-z]+$/i;
/* 释义清洗：删除 [网络] 段落后再判断有效性 */
function cleanTrans(t) {
    if (!t) return '';
    let s = t;
    const ni = s.indexOf('\n[网络]');
    if (ni >= 0) s = s.slice(0, ni);
    const niB = s.indexOf('[网络]');
    if (niB >= 0) s = s.slice(0, niB);
    s = s.replace(/\s+/g, ' ').trim();
    return s;
}

/* ---------- 畸形行容错恢复（源 CSV 部分行引号嵌套异常，标准解析列数≠13） ----------
   优先级：先捞 word/phonetic；翻译取「含中文的完整引号对」，退而取首个引号对；
   bnc/frq 用 tag 定位其后的两个相邻数字（rank，1=最高频），找不到给低频兜底 */
function recoverMalformed(line) {
    const m = line.match(/^([^,]*),([^,]*),(.*)$/s);
    if (!m) return null;
    const word = m[1].replace(/"/g, '').trim();
    const phonetic = m[2].replace(/"/g, '').trim();
    const rest = m[3];
    // 翻译：全文本找含中文的对称引号对（无视嵌套异常，取中文含量最高者）
    let tr = '';
    const cnRe = /"([^"\n]*[\u4e00-\u9fff][^"\n]*)"/g;
    let mm;
    while ((mm = cnRe.exec(rest))) {
        const v = mm[1].replace(/^[\s,]*/, '').trim();
        if (v.length > tr.length) tr = v;
    }
    // 无中文引号对则退回首个引号对
    if (!tr) {
        const re = /"([^"]*)"/g;
        while ((mm = re.exec(rest))) { const v = mm[1].replace(/""/g, '"').trim(); if (v.length >= 2) { tr = v; break; } }
    }
    if (!tr) tr = (rest.split(',')[0] || '').replace(/"/g, '');
    // tag
    const tagRe = rest.match(/\b(zk|gk|cet4|cet6|ky|ielts|toefl|gre)\b/g);
    const tag = tagRe ? tagRe.join(' ') : '';
    // bnc/frq：紧跟 tag 之后的一对数字；无 tag 时取 rest 倒数第二对数字
    let bnc = 9999999, frq = 9999999;
    if (tag) {
        const afterTag = rest.split(tag)[1];
        const pair = afterTag && afterTag.match(/,\s*(\d+)\s*,\s*(\d+)\s*(?:,|$)/);
        if (pair) { bnc = +pair[1]; frq = +pair[2]; }
    } else {
        const allPairs = rest.match(/,\s*(\d+)\s*,\s*(\d+)\s*(?:,|$)/g);
        if (allPairs && allPairs.length > 0) {
            const last = allPairs[allPairs.length - 1].match(/,\s*(\d+)\s*,\s*(\d+)/);
            if (last) { bnc = +last[1]; frq = +last[2]; }
        }
    }
    return { word, phonetic, translation: tr, tag, bnc, frq };
}

console.log('读取 CSV（引号感知智能分行）…');
const raw = fs.readFileSync(csvPath, 'utf-8');
const lines = splitCsvSmart(raw);
console.log('词条总数（含无释义）:', lines.length);

const rows = [];
let malformed = 0, recovered = 0;
for (let i = 1; i < lines.length; i++) {
    const L = lines[i].trim();
    if (!L) continue;
    const wordRaw = L.split(',')[0].replace(/"/g, '');
    if (!PURE.test(wordRaw)) continue;             // 只留纯字母词
    if (wordRaw.length > 45) continue;
    let cols;
    try { cols = parseCsvLine(L); } catch (e) { continue; }

    let rec = null;
    if (cols.length !== 13) {                        // 源数据畸形行 → 容错恢复
        malformed++;
        rec = recoverMalformed(L);
        if (!rec) continue;
        recovered++;
    }

    const word = rec ? rec.word : cols[0];
    if (!PURE.test(word) || word !== wordRaw) continue;  // 恢复后的 word 必须仍纯字母且一致
    const phonetic = rec ? rec.phonetic : (cols[1] || '');
    const translation = cleanTrans(rec ? rec.translation : cols[3]);
    if (!translation || translation === 'vt.' || translation.length < 2) continue;
    const tag = rec ? rec.tag : (cols[7] || '');     // 等级标签 cet4/cet6/ky/ielts/toefl/gre/zk/gk
    const bnc = rec ? rec.bnc : +(cols[8] || 0);     // BNC 英频（col8，rank 1=最高频）
    const frq = rec ? rec.frq : +(cols[9] || 0);     // 当代语料频（col9）
    rows.push([word, phonetic, translation, tag, bnc, frq]);
}
console.log('畸形行:', malformed, '恢复成功:', recovered);
console.log('纯字母且有释义的词条:', rows.length);

/* 词频排序：bnc/frq 是「语料库词频顺序」（rank，1=最高频），升序取小 → 常用词优先；
   ECDICT 约定：rank 为 0 或空 = 未收录（低频），末尾兜底 */
rows.sort((a, b) => {
    const ka = (a[4] || 9999999) + (a[5] || 9999999);
    const kb = (b[4] || 9999999) + (b[5] || 9999999);
    return ka - kb;
});

const pick = rows.slice(0, TARGET);
console.log('选取:', pick.length);

/* 质量断言：高频词 must-have */
for (const w of ['the', 'be', 'of', 'and', 'to', 'a', 'in', 'that', 'is', 'for']) {
    console.log('  contains "' + w + '":', pick.some(r => r[0].toLowerCase() === w));
}

/* 按首字母分片 */
const shards = {};
for (const r of pick) {
    const k = r[0].charAt(0).toLowerCase();
    if (!shards[k]) shards[k] = [];
    shards[k].push(r);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const index = { source: 'ECDICT(MIT)', generated: new Date().toISOString().slice(0, 10), total: pick.length, shards: {} };
let bytes = 0;
for (const k of Object.keys(shards).sort()) {
    const payload = JSON.stringify(shards[k]);
    const fn = path.join(OUT_DIR, k + '.json');
    fs.writeFileSync(fn, payload, 'utf-8');
    const b = Buffer.byteLength(payload, 'utf-8');
    index.shards[k] = { count: shards[k].length, bytes: b };
    bytes += b;
    console.log(`  ${k}.json  ${shards[k].length} 词  ${(b / 1024).toFixed(0)} KB`);
}
fs.writeFileSync(path.join(OUT_DIR, 'index.json'), JSON.stringify(index, null, 2), 'utf-8');
console.log('====================================');
console.log('分片: 26'); 
console.log('总词数:', pick.length);
console.log('总字节: ' + (bytes / 1024 / 1024).toFixed(2) + ' MB');
console.log('输出目录:', OUT_DIR);