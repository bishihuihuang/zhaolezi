/* check_artifact_23.js — 解码根目录产物 23.html 的混淆脚本，确认新词典逻辑已进产物
   用法：node 工具脚本/check_artifact_23.js */
'use strict';
const fs = require('fs');
const path = require('path');
const h = fs.readFileSync(path.join(__dirname, '..', '23.html'), 'utf8');

const MARKS = ['23data/', 'dictStats', 'zl_dict_fav', 'zl_dict_hist', 'speechSynthesis',
    'matchTrans', 'matchShard', 'loadAll', 'loadLetter', 'levelChips', 'randomWord',
    'searchChinese', 'historyBar', 'wordCardHtml', 'freqRank', '八仙过海'];

// 找出所有长 base64 字面量（不依赖引号成对），逐个解码
const re = /([A-Za-z0-9+/]{200,}={0,2})/g;
let m, blocks = [];
while ((m = re.exec(h))) blocks.push(m[1]);
console.log('长 base64 字面量数: ' + blocks.length);
console.log('原始长度: ' + blocks.map(function (b) { return b.length; }).join(', '));

const plain = [];
blocks.forEach(function (b, i) {
    let s;
    try { s = Buffer.from(b, 'base64').toString('utf8'); } catch (e) { return; }
    const like = s.length > 4000;
    console.log('块' + i + ' 原始 ' + b.length + ' -> 明文 ' + s.length + (like ? '' : '  [不像脚本]'));
    if (like) plain.push(s);
});

const joined = plain.join('\n');
console.log('\n可解码脚本总明文: ' + joined.length + ' 字符');
const found = MARKS.filter(function (k) { return joined.indexOf(k) >= 0; });
const missing = MARKS.filter(function (k) { return joined.indexOf(k) < 0; });
console.log('命中新词典标记: ' + found.length + ' / ' + MARKS.length + '  ->  ' + found.join(', '));
console.log(missing.length ? '缺失: ' + missing.join(', ') : '全部命中');

const c = function (s) { return h.split(s).length - 1; };
console.log('\n结构: DOCTYPE=' + c('<!DOCTYPE html>') + ' style=' + c('<style>') + '/' + c('</style>') +
    ' script=' + c('<script>') + '/' + c('</script>') + ' head=' + c('<head>') + '/' + c('</head>') +
    ' body=' + c('<body>') + '/' + c('</body>'));
console.log('PWA 块: ' + (h.indexOf('rel="manifest"') >= 0 ? '已注入' : '缺失') +
    '  common.js: ' + (h.indexOf('src="common.js"') >= 0 ? '已引用' : '缺失'));

const okAll = missing.length === 0 && joined.length > 5000;
console.log(okAll ? '\n结论: 产物已包含新版词典逻辑' : '\n结论: 产物校验未通过');
process.exit(okAll ? 0 : 1);
