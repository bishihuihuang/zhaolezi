/* rebuild_23.js — 全新生成 23.html（30 万词词典增强版）
   读取原 23.html 的 CSS 头部（背景动画/网格/overlay 原样保留），
   追加词典功能样式，替换正文与脚本。
   用法：node 工具脚本/rebuild_23.js */
'use strict';
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', '_原始未混淆版', '23.html');
const IDIOMS = require(path.join(__dirname, '_idioms_seed.js'));

/* CSS 基线来自 工具脚本/23_base.css —— 由 restore_23_base.js 从 git 历史提取的 23 页原始 <style> 全文
   （BOM + <!DOCTYPE html>…<style> + 原全部 CSS，不含 </style>）。
   故意不从已生成的 23.html 反读 CSS：多次重建会把 CSS 截断或整段嵌套进 style 里。 */
const BASE = path.join(__dirname, '23_base.css');
if (!fs.existsSync(BASE)) throw new Error('缺少 CSS 基线 23_base.css，先运行 node 工具脚本/restore_23_base.js');
const cssHead = fs.readFileSync(BASE, 'utf8');
if (cssHead.indexOf('<!DOCTYPE html>') < 0 || cssHead.indexOf('<style>') < 0) {
    throw new Error('23_base.css 不完整（缺少 <!DOCTYPE html> / <style>），请重新运行 restore_23_base.js');
}

/* ============ 追加 CSS（插入到 </style> 之前） ============ */
const EXTRA_CSS = `
    /* ===== 词典增强 ===== */
    .tool-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
    .dict-stats { font-size: 13px; color: #888; line-height: 1.5; }
    .dict-stats b { color: #667eea; }
    .level-chips { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
    .chip { padding: 5px 12px; border: 1.5px solid #e0e0f0; border-radius: 16px; background: #fff; color: #667; font-size: 12px; font-weight: 600; cursor: pointer; transition: all .18s; min-height: 36px; }
    .chip:hover { border-color: #667eea; color: #667eea; }
    .chip.active { background: linear-gradient(135deg, #667eea, #764ba2); border-color: transparent; color: #fff; }
    .result-card .phonetic { font-size: 14px; color: #a06ad8; font-weight: 600; }
    .result-card .card-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .card-actions { margin-left: auto; display: flex; gap: 6px; align-items: center; }
    .icon-btn { width: 32px; height: 32px; border-radius: 50%; border: 1.5px solid #e0e0f0; background: #fff; font-size: 15px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: all .18s; color: #999; }
    .icon-btn:hover { transform: scale(1.12); border-color: #667eea; }
    .icon-btn.speak { color: #1565c0; }
    .icon-btn.speak:hover { background: #e3f2fd; }
    .icon-btn.fav { color: #d4af37; }
    .icon-btn.fav.active { background: #ffefd0; border-color: #d4af37; }
    .badges { display: flex; gap: 6px; flex-wrap: wrap; margin: 6px 0; }
    .badge { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 10px; background: #eef0ff; color: #5b6ad8; }
    .badge.freq { background: #fff3e6; color: #c97a15; }
    .result-card .meaning { white-space: pre-wrap; }
    .load-more-row { display: flex; justify-content: center; padding: 14px 0 4px; }
    .load-more-btn { padding: 10px 30px; border: 2px dashed #c9d2ff; border-radius: 24px; background: #fafafe; color: #667eea; font-size: 14px; font-weight: 700; cursor: pointer; transition: all .2s; }
    .load-more-btn:hover { background: #eef2ff; transform: translateY(-1px); }
    .history-bar { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
    .history-bar .label { font-size: 13px; color: #999; }
    .hist-chip { padding: 4px 12px; border-radius: 14px; background: #f0f2ff; color: #4b57b8; font-size: 12px; cursor: pointer; border: none; transition: all .18s; }
    .hist-chip:hover { background: #dfe4ff; }
    .home-intro { text-align: center; color: #888; font-size: 15px; padding: 8px 0 2px; }
    .home-intro b { color: #667eea; font-size: 18px; }
    .hot-title { font-size: 15px; font-weight: 800; color: #555; margin: 12px 0 8px; }
    .spin { display: inline-block; width: 18px; height: 18px; border: 2.5px solid #e0e0f0; border-top-color: #667eea; border-radius: 50%; animation: ringSpin .7s linear infinite; vertical-align: -3px; margin-right: 8px; }
    .loading-text { text-align: center; color: #aaa; padding: 20px 0; font-size: 14px; }
    .empty-state a { color: #667eea; cursor: pointer; text-decoration: underline; }
    .random-card-big { background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; border-radius: 14px; padding: 18px 22px; margin-bottom: 14px; box-shadow: 0 10px 28px rgba(102,126,234,.35); }
    .random-card-big .rw { font-size: 26px; font-weight: 900; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .random-card-big .rp { font-size: 14px; opacity: .9; margin: 2px 0 8px; }
    .random-card-big .rt { font-size: 15px; line-height: 1.7; white-space: pre-wrap; }
    .random-card-big .speak-btn { width: 34px; height: 34px; border-radius: 50%; border: none; background: rgba(255,255,255,.25); color: #fff; font-size: 16px; cursor: pointer; }
    .random-card-big .speak-btn:hover { background: rgba(255,255,255,.4); }
    .random-card-big .fav-btn { width: 34px; height: 34px; border-radius: 50%; border: none; background: rgba(255,255,255,.25); color: #fff; font-size: 16px; cursor: pointer; }
    .random-card-big .fav-btn.active { background: #ffd34d; color: #7a5c00; }
    .prog-wrap { display: flex; align-items: center; gap: 10px; justify-content: center; padding: 6px 0 2px; }
    .prog-bar { flex: 1; max-width: 260px; height: 8px; background: #ececf5; border-radius: 6px; overflow: hidden; }
    .prog-fill { height: 100%; width: 0%; background: linear-gradient(90deg, #667eea, #764ba2); transition: width .2s; }
    .prog-note { text-align: center; color: rgba(102,102,140,.85); font-size: 13px; margin: 4px 0 14px; }
`;

/* ============ 正文 HTML ============ */
const BODY = `    <main>
        <div class="container">
            <div class="grid">
                <div class="title-area">
                    <h2 id="pageTitle">在线词典</h2>
                </div>
                <a href="index.html" class="back-area" id="backHome" aria-label="返回主页">
                    <span style="font-size:32px;">🏠</span>
                    返回主页
                </a>

                <div class="dictionary-area">
                    <div class="search-box">
                        <input type="text" id="searchInput" class="search-input" placeholder="输入单词（英/中），如 apple / 苹果…" autocomplete="off" aria-label="搜索关键词">
                        <button id="searchBtn" class="search-btn" aria-label="搜索">搜索</button>
                        <button id="randomBtn" class="search-btn" style="background:linear-gradient(135deg,#ff8c42,#f5576c)" aria-label="随机单词">🎲 随机</button>
                    </div>

                    <div class="level-chips" id="levelChips" role="group" aria-label="等级筛选">
                        <button class="chip active" data-level="" aria-label="全部等级">全部</button>
                        <button class="chip" data-level="zk" aria-label="小学">小学</button>
                        <button class="chip" data-level="gk" aria-label="初中">初中</button>
                        <button class="chip" data-level="cet4" aria-label="四级">四级</button>
                        <button class="chip" data-level="cet6" aria-label="六级">六级</button>
                        <button class="chip" data-level="ky" aria-label="考研">考研</button>
                        <button class="chip" data-level="ielts" aria-label="雅思">雅思</button>
                        <button class="chip" data-level="toefl" aria-label="托福">托福</button>
                        <button class="chip" data-level="gre" aria-label="GRE">GRE</button>
                    </div>

                    <div class="filter-tabs" id="typeTabs">
                        <button class="tab-btn active" data-type="all" aria-label="显示全部">全部</button>
                        <button class="tab-btn" data-type="word" aria-label="显示单词">单词</button>
                        <button class="tab-btn" data-type="idiom" aria-label="显示成语">成语</button>
                        <button class="tab-btn" data-type="xiehou" aria-label="显示歇后语">歇后语</button>
                        <button class="tab-btn" data-type="fav" aria-label="我的收藏">⭐ 收藏</button>
                    </div>

                    <div class="tool-row">
                        <div class="dict-stats" id="dictStats">词库加载中…</div>
                        <div class="history-bar" id="historyBar"></div>
                    </div>

                    <div class="result-list" id="resultList" aria-live="polite">
                        <div class="empty-state">输入单词开始搜索，本库收录 <b id="totalWords">300,000</b>+ 词条</div>
                    </div>

                    <div class="load-more-row" id="loadMoreRow" style="display:none">
                        <button class="load-more-btn" id="loadMoreBtn">加载更多 ↓</button>
                    </div>
                </div>
            </div>
        </div>
    </main>
`;

/* ============ 脚本（注意：避免 insertAdjacentHTML，全部走 innerHTML） ============ */
const SCRIPT = `
    <script>
    (function () {
        'use strict';

        var searchInput = document.getElementById('searchInput');
        var searchBtn = document.getElementById('searchBtn');
        var randomBtn = document.getElementById('randomBtn');
        var resultList = document.getElementById('resultList');
        var typeTabs = document.querySelectorAll('#typeTabs .tab-btn');
        var levelChips = document.querySelectorAll('#levelChips .chip');
        var dictStats = document.getElementById('dictStats');
        var historyBar = document.getElementById('historyBar');
        var loadMoreRow = document.getElementById('loadMoreRow');
        var loadMoreBtn = document.getElementById('loadMoreBtn');
        var backHome = document.getElementById('backHome');
        var overlay = document.getElementById('overlay');
        var pageTitle = document.getElementById('pageTitle');

        var USER_KEY = { fav: 'zl_dict_fav_v1', hist: 'zl_dict_hist_v1', maxHist: 10 };
        var cache = {};      // letter -> 词条数组
        var loading = {};    // letter -> Promise
        var allLoaded = false;
        var currentLevel = '';
        var currentType = 'all';
        var lastKw = '';
        var pageSize = 20;
        var page = 0;

        var IDIOMS = ${JSON.stringify(IDIOMS).replace(/<\/?script/gi, '')};
        var XIEHOU = [
            { w: '八仙过海', m: '各显神通：比喻各自施展本领', e: '这届比赛高手如林，真是八仙过海，各显神通。' },
            { w: '十五个吊桶打水', m: '七上八下：形容心神不安', e: '考试前他紧张得像十五个吊桶打水，七上八下。' },
            { w: '哑巴吃黄连', m: '有苦说不出：形容有苦难言', e: '合同一签反悔不得，他是哑巴吃黄连，有苦说不出。' },
            { w: '外甥打灯笼', m: '照旧（舅）：一切照旧', e: '今年的运动会还是外甥打灯笼——照旧。' },
            { w: '竹篮打水', m: '一场空：白费力气', e: '蹲守了一晚上，结果竹篮打水一场空。' },
            { w: '小葱拌豆腐', m: '一清二白：清清楚楚', e: '账目交代得小葱拌豆腐，一清二白。' },
            { w: '肉包子打狗', m: '有去无回：借出去收不回', e: '借钱给他就是肉包子打狗，有去无回。' },
            { w: '黄鼠狼给鸡拜年', m: '没安好心：心怀不轨', e: '他突然献殷勤，准是黄鼠狼给鸡拜年。' },
            { w: '兔子不吃窝边草', m: '好自为之：不便对身边人下手', e: '他向来兔子不吃窝边草，这次却破了例。' },
            { w: '老虎屁股摸不得', m: '谁都惹不起：十分强势', e: '他官架子大，老虎屁股摸不得。' },
            { w: '黑瞎子掰苞米', m: '掰一个丢一个：顾此失彼', e: '学东西别像黑瞎子掰苞米，学一个丢一个。' },
            { w: '一口吃个胖子', m: '急于求成：想一步到位', e: '学英语不能一口吃个胖子，要循序渐进。' },
            { w: '火烧眉毛', m: '迫在眉睫：情况紧急', e: '交稿日期火烧眉毛，得加班了。' },
            { w: '王婆卖瓜', m: '自卖自夸：自己夸自己', e: '他介绍产品时王婆卖瓜，自卖自夸。' },
            { w: '公鸡下蛋', m: '不可能的事：绝无可能', e: '想让他认错，除非公鸡下蛋。' }
        ];
        var MINI = [];
        IDIOMS.forEach(function (x) { MINI.push({ word: x.w, type: 'idiom', meaning: x.m, example: x.e }); });
        XIEHOU.forEach(function (x) { MINI.push({ word: x.w, type: 'xiehou', meaning: x.m, example: x.e }); });

        function lsGet(key) { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; } }
        function lsSet(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }
        function getFav() { var f = lsGet(USER_KEY.fav); return Array.isArray(f) ? f : []; }
        function setFav(f) { lsSet(USER_KEY.fav, f); }
        function getHist() { var h = lsGet(USER_KEY.hist); return Array.isArray(h) ? h : []; }
        function setHist(h) { lsSet(USER_KEY.hist, h.slice(0, USER_KEY.maxHist)); }

        function letterOf(w) { var c = String(w || '').charAt(0).toLowerCase(); return /^[a-z]$/.test(c) ? c : ''; }
        function baseDir() {
            try {
                var p = (location && location.pathname) || '/';
                var i = p.lastIndexOf('/');
                return p.slice(0, i + 1);
            } catch (e) { return ''; }
        }
        function loadLetter(l) {
            l = l.toLowerCase();
            if (cache[l]) return Promise.resolve(cache[l]);
            if (loading[l]) return loading[l];
            if (!/^[a-z]$/.test(l)) return Promise.resolve([]);
            loading[l] = fetch(baseDir() + '23data/' + l + '.json')
                .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
                .then(function (arr) { cache[l] = Array.isArray(arr) ? arr : []; return cache[l]; })
                .catch(function () { cache[l] = []; return cache[l]; })
                .then(function (v) { delete loading[l]; return v; });
            return loading[l];
        }
        function loadAll(progress) {
            var letters = 'abcdefghijklmnopqrstuvwxyz';
            var done = 0, ok = 0;
            var tasks = [];
            for (var i = 0; i < letters.length; i++) {
                (function (L) {
                    tasks.push(loadLetter(L).then(function () {
                        if (cache[L] && cache[L].length) ok++;
                        done++;
                        if (progress) progress(done, 26);
                    }));
                })(letters[i]);
            }
            return Promise.all(tasks).then(function () { if (ok > 0) allLoaded = true; });
        }

        function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
        function tagNames() { return { zk: '小学', gk: '初中', cet4: '四级', cet6: '六级', ky: '考研', ielts: '雅思', toefl: '托福', gre: 'GRE' }; }
        function levelMatch(tag) {
            if (!currentLevel) return true;
            var want = currentLevel.split(' ');
            var has = (tag || '').split(' ');
            return want.some(function (w) { return has.indexOf(w) >= 0; });
        }
        function freqRank(e) {
            var b = +(e[4] || 0), f = +(e[5] || 0), k = b + f;
            if (k <= 0 || k >= 19999998) return '';
            if (k <= 20) return '⚡ 高频';
            if (k <= 2000) return '🔥 常用';
            if (k <= 30000) return '常见';
            return '拓展';
        }
        function speakWord(word) {
            try {
                if (!('speechSynthesis' in window) || !window.speechSynthesis) return;
                var u = new SpeechSynthesisUtterance(String(word));
                u.lang = 'en-US'; u.rate = 0.9;
                window.speechSynthesis.cancel();
                window.speechSynthesis.speak(u);
            } catch (e) {}
        }
        function isFavWord(w) { return getFav().indexOf(w) >= 0; }
        function toggleFav(word, btn) {
            var fav = getFav();
            var i = fav.indexOf(word);
            var on;
            if (i >= 0) { fav.splice(i, 1); on = false; }
            else { fav.push(word); on = true; }
            setFav(fav);
            if (btn) btn.classList.toggle('active', on);
            if (currentType === 'fav') favView();
        }
        function badgeHtml(tag, fr) {
            var tn = tagNames();
            var h = '';
            (tag || '').split(' ').filter(Boolean).forEach(function (t) {
                if (tn[t]) h += '<span class="badge">' + tn[t] + '</span>';
            });
            if (fr) h += '<span class="badge freq">' + fr + '</span>';
            return h;
        }
        function wordCardHtml(e) {
            var word = e[0] || '', phone = e[1] || '', trans = e[2] || '', tag = e[3] || '';
            return '<div class="result-card" tabindex="0">' +
                '<div class="card-head"><span class="word">' + esc(word) + '</span>' +
                (phone ? '<span class="phonetic">/' + esc(phone) + '/</span>' : '') +
                '<div class="card-actions">' +
                '<button class="icon-btn speak" data-speak="' + esc(word) + '" title="发音">🔊</button>' +
                '<button class="icon-btn fav' + (isFavWord(word) ? ' active' : '') + '" data-fav="' + esc(word) + '" title="收藏">⭐</button>' +
                '</div></div>' +
                (badgeHtml(tag, freqRank(e)) ? '<div class="badges">' + badgeHtml(tag, freqRank(e)) + '</div>' : '') +
                '<div class="meaning">' + esc(trans) + '</div></div>';
        }
        function miniCardHtml(x) {
            var tag = x.type === 'idiom' ? '成语' : '歇后语';
            return '<div class="result-card" tabindex="0"><div class="card-head"><span class="word">' + esc(x.word) + ' <span class="type-tag">' + tag + '</span></span>' +
                '<div class="card-actions"><button class="icon-btn fav' + (isFavWord(x.word) ? ' active' : '') + '" data-fav="' + esc(x.word) + '" title="收藏">⭐</button></div></div>' +
                '<div class="meaning">' + esc(x.meaning) + '</div>' +
                (x.example ? '<div class="example">例句：<em>' + esc(x.example) + '</em></div>' : '') + '</div>';
        }
        function setList(html) { if (resultList) resultList.innerHTML = html; }
        function loadingUi(text) {
            return '<div class="loading-text"><span class="spin"></span>' + esc(text) + '</div>';
        }
        function bindCardActions() {
            if (!resultList) return;
            var speaks = resultList.querySelectorAll('[data-speak]');
            for (var i = 0; i < speaks.length; i++) {
                speaks[i].addEventListener('click', function (ev) {
                    ev.stopPropagation();
                    speakWord(this.getAttribute('data-speak'));
                });
            }
            var favs = resultList.querySelectorAll('[data-fav]');
            for (var j = 0; j < favs.length; j++) {
                favs[j].addEventListener('click', function (ev) {
                    ev.stopPropagation();
                    toggleFav(this.getAttribute('data-fav'), this);
                });
            }
        }

        function miniMatch(kw, type) {
            var out = [];
            MINI.forEach(function (x) {
                if (currentLevel && type === 'word') return;
                if (type === 'word') return;
                if (type === 'fav') return;
                if (type !== 'all' && x.type !== type) return;
                if (kw === '' || x.word.indexOf(kw) >= 0 || x.meaning.indexOf(kw) >= 0 || (x.example || '').indexOf(kw) >= 0) {
                    out.push({ item: x, score: kw ? 60 : 5, from: 'mini' });
                }
            });
            return out;
        }

        /* 英文分片搜索 */
        function matchShard(arr, kw) {
            var pre = [], sub = [];
            var n = arr.length;
            for (var i = 0; i < n; i++) {
                var e = arr[i];
                if (!levelMatch(e[3])) continue;
                var lw = (e[0] || '').toLowerCase();
                if (lw === kw) { pre.unshift({ item: e, score: 1000 }); continue; }
                if (lw.indexOf(kw) === 0) { pre.push({ item: e, score: 500 - Math.min(lw.length, 100) / 3 }); continue; }
                if (lw.indexOf(kw) > 0) { sub.push({ item: e, score: 200 - Math.min(lw.length, 100) / 2 }); continue; }
            }
            var out = pre.concat(sub);
            out.sort(function (a, b) {
                if (b.score !== a.score) return b.score - a.score;
                var ka = (a.item[4] || 9999999) + (a.item[5] || 9999999);
                var kb = (b.item[4] || 9999999) + (b.item[5] || 9999999);
                return ka - kb;
            });
            return out.slice(0, 300);
        }
        function allEntries() {
            var all = [];
            for (var k in cache) all = all.concat(cache[k] || []);
            return all;
        }
        function matchTrans(arr, kw) {
            var out = [];
            for (var i = 0; i < arr.length; i++) {
                var e = arr[i];
                if (!levelMatch(e[3])) continue;
                if ((e[2] || '').toLowerCase().indexOf(kw) >= 0) out.push({ item: e, score: 100 });
            }
            /* 按词频升序排（bnc/frq 是 rank，1 最高），让"猫"先出 cat 而不是 Angora */
            out.sort(function (a, b) {
                var ka = (a.item[4] || 9999999) + (a.item[5] || 9999999);
                var kb = (b.item[4] || 9999999) + (b.item[5] || 9999999);
                if (ka !== kb) return ka - kb;
                return (a.item[0] || '').length - (b.item[0] || '').length;
            });
            return out.slice(0, 200);
        }

        function mergeAndDedupe(kw, found, type) {
            var merged = miniMatch(kw, type).concat(found);
            var seen = {}, uniq = [];
            merged.forEach(function (r) {
                var key = r.from === 'mini' ? 'mini:' + r.item.word : r.item[0];
                if (seen[key]) return;
                seen[key] = 1;
                uniq.push(r);
            });
            return uniq;
        }

        function showPage(uniq, total, kw) {
            var slice = uniq.slice(0, page * pageSize);
            var html = '';
            for (var i = 0; i < slice.length; i++) {
                var r = slice[i];
                html += r.from === 'mini' ? miniCardHtml(r.item) : wordCardHtml(r.item);
            }
            setList(html);
            if (dictStats) dictStats.innerHTML = statLabel(total) + (currentLevel ? ' · 筛选：' + levelText() : '');
            if (uniq.length > slice.length) loadMoreRow.style.display = 'flex';
            else loadMoreRow.style.display = 'none';
            bindCardActions();
        }
        function levelText() {
            for (var i = 0; i < levelChips.length; i++) {
                if (levelChips[i].classList.contains('active')) return levelChips[i].textContent.trim();
            }
            return '';
        }
        /* 统计条文案随当前 tab 变化：收藏页说「收藏 N 条」，其余说「共 N 条结果」 */
        function statLabel(total) {
            if (currentType === 'fav') return '⭐ 收藏 <b>' + fmt(total) + '</b> 条';
            return '共 <b>' + fmt(total) + '</b> 条结果';
        }
        function fmt(n) { return String(n).replace(/\\B(?=(\\d{3})+(?!\\d))/g, ','); }

        function finishSearch(found, kw, type, resetPage) {
            if (resetPage !== false) page = 1;
            var uniq = mergeAndDedupe(kw, found, type);
            if (!uniq.length) {
                setList('<div class="empty-state">没有找到「' + esc(kw) + '」相关词条<br><a id="retryRandom" style="cursor:pointer">点击试试随机单词</a></div>');
                loadMoreRow.style.display = 'none';
                return;
            }
            showPage(uniq, uniq.length, kw);
        }

        function searchWord(kw, type, resetPage) {
            var letter = letterOf(kw);
            var first = letter ? loadLetter(letter) : Promise.resolve([]);
            first.then(function (shard) {
                var found = matchShard(shard, kw);
                finishSearch(found, kw, type, resetPage);
                if (found.length < 5 && !allLoaded) {
                    setList(loadingUi('深度搜索全库…') + progBlockHtml(0, 26));
                    loadAll(function (d, n) {
                        var bar = document.getElementById('progFill');
                        var txt = document.getElementById('progText');
                        if (bar) bar.style.width = Math.round(d / n * 100) + '%';
                        if (txt) txt.textContent = d + ' / ' + n;
                    }).then(function () {
                        finishSearch(matchShard(allEntries(), kw), kw, type, false);
                    }).catch(function () {
                        setList('<div class="empty-state">深度搜索未完成，请重试或换关键词</div>');
                    });
                }
            }).catch(function () {
                setList('<div class="empty-state">词库分片加载失败，请检查网络后重试</div>');
            });
        }
        /* 中文反查要扫全库 26 片（约 20MB），一次性等完会长时间只显示进度条。
           这里改为边加载边反查：每到位 4 片就渲染一次已有结果，用户立刻能看到命中词条。 */
        function progBlockHtml(d, n) {
            var pct = Math.round(d / n * 100);
            return '<div class="prog-wrap"><div class="prog-bar"><div class="prog-fill" id="progFill" style="width:' + pct + '%"></div></div><span id="progText">' + d + ' / ' + n + '</span></div>';
        }
        function searchChinese(kw, type, resetPage) {
            if (allLoaded) { finishSearch(matchTrans(allEntries(), kw), kw, type, resetPage); return; }
            var letters = 'abcdefghijklmnopqrstuvwxyz';
            var n = letters.length;
            var done = 0;
            setList(progBlockHtml(0, n) + '<div class="prog-note">正在扫描全库 30 万词…</div>');
            var tick = function () {
                var part = matchTrans(allEntries(), kw);
                var html = progBlockHtml(done, n);
                if (part.length) {
                    html += '<div class="prog-note">已命中 <b>' + fmt(part.length) + '</b> 条，继续扫描剩余分片…</div>';
                    for (var i = 0; i < Math.min(part.length, 12); i++) html += wordCardHtml(part[i].item);
                } else {
                    html += '<div class="prog-note">正在扫描全库 30 万词…</div>';
                }
                setList(html);
                bindCardActions();
            };
            var tasks = [];
            for (var i = 0; i < n; i++) {
                (function (L) {
                    tasks.push(loadLetter(L).then(function () {
                        done++;
                        if (done % 4 === 0 || done === n) tick();
                    }));
                })(letters.charAt(i));
            }
            Promise.all(tasks).then(function () {
                var ok = 0;
                for (var L in cache) { if (cache[L] && cache[L].length) ok++; }
                if (ok > 0) allLoaded = true;
                finishSearch(matchTrans(allEntries(), kw), kw, type, resetPage);
            });
        }

        function doSearch(resetPage) {
            var kw = searchInput.value.trim().toLowerCase();
            if (!kw) { renderHome(); return; }
            lastKw = kw;
            if (resetPage !== false) page = 0;
            var hist = getHist().filter(function (h) { return h.toLowerCase() !== kw; });
            hist.unshift(kw);
            setHist(hist);
            renderHistory();
            var type = currentType === 'all' ? 'all' : currentType;
            setList(loadingUi('搜索中…'));
            loadMoreRow.style.display = 'none';
            if (/^[a-z]+$/.test(kw)) searchWord(kw, type, resetPage);
            else searchChinese(kw, type, resetPage);
        }

        function favView() {
            var fav = getFav();
            if (!fav.length) {
                setList('<div class="empty-state">还没有收藏词条，点击卡片上的 ⭐ 即可收藏</div>');
                loadMoreRow.style.display = 'none';
                if (dictStats) dictStats.innerHTML = statLabel(0);
                return;
            }
            var entries = [];
            fav.forEach(function (w) {
                if (w.indexOf(' ') >= 0 || /[\\u4e00-\\u9fff]/.test(w)) {
                    // 成语/歇后语：从迷你库查
                    var mini = MINI.filter(function (x) { return x.word === w; })[0];
                    if (mini) entries.push({ item: mini, score: -1, from: 'mini' });
                    return;
                }
                var L = letterOf(w);
                var found = null;
                if (L && cache[L]) {
                    for (var i = 0; i < cache[L].length; i++) {
                        if (cache[L][i][0] === w) { found = cache[L][i]; break; }
                    }
                }
                if (found) entries.push({ item: found, score: -1 });
                else entries.push({ item: [w, '', '（未加载，搜索该词后可查看详情）', '', '', ''], score: -1 });
            });
            page = 1;
            showPage(entries, entries.length, 'fav');
        }

        function renderHome() {
            lastKw = '';
            loadMoreRow.style.display = 'none';
            setList('<div class="home-intro">欢迎使用 <b>30 万词在线词典</b>！支持发音、收藏、等级筛选与中文反查。</div>');
            bindCardActions();
            var hist = getHist();
            if (historyBar) {
                if (hist.length) {
                    var html = '<span class="label">最近搜索：</span>';
                    hist.forEach(function (h) { html += '<button class="hist-chip" data-hist="' + esc(h) + '">' + esc(h) + '</button> '; });
                    html += '<button class="hist-chip" data-clear="1">✕ 清空</button>';
                    historyBar.innerHTML = html;
                } else historyBar.innerHTML = '';
            }
            /* 高频词精选：并发加载 a/b/t 分片 */
            var subs = ['a', 'b', 't'];
            Promise.all(subs.map(function (l) { return loadLetter(l); })).then(function (shards) {
                var all = [];
                shards.forEach(function (s) { all = all.concat(s); });
                all.sort(function (x, y) { return ((x[4] || 9999999) + (x[5] || 9999999)) - ((y[4] || 9999999) + (y[5] || 9999999)); });
                var hot = all.slice(0, 12);
                var html = '<div class="hot-title">🔥 高频词精选</div>';
                hot.forEach(function (e) { html += wordCardHtml(e); });
                setList('<div class="home-intro">欢迎使用 <b>30 万词在线词典</b>！支持发音、收藏、等级筛选与中文反查。</div>' + html);
                bindCardActions();
            }).catch(function () { /* 离线降级：仅显示欢迎语 */ });
        }

        function randomWord() {
            var letters = 'abcdefghijklmnopqrstuvwxyz';
            var L = letters[Math.floor(Math.random() * letters.length)];
            setList(loadingUi('随机抽取中…'));
            loadLetter(L).then(function (shard) {
                if (!shard || !shard.length) { setList('<div class="empty-state">该分片为空，再试一次</div>'); return; }
                var e = shard[Math.floor(Math.random() * shard.length)];
                lastKw = '';
                loadMoreRow.style.display = 'none';
                if (pageTitle) pageTitle.textContent = '🎲 随机单词';
                var fr = freqRank(e);
                setList('<div class="random-card-big" tabindex="0">' +
                    '<div class="rw">' + esc(e[0] || '') +
                    (e[1] ? '<span style="font-size:15px;opacity:.9">/' + esc(e[1]) + '/</span>' : '') +
                    '<button class="speak-btn" data-speak="' + esc(e[0] || '') + '">🔊</button>' +
                    '<button class="fav-btn' + (isFavWord(e[0]) ? ' active' : '') + '" data-fav="' + esc(e[0] || '') + '">⭐</button>' +
                    '</div>' +
                    (badgeHtml(e[3], fr) ? '<div class="badges">' + badgeHtml(e[3], fr) + '</div>' : '') +
                    '<div class="rt">' + esc(e[2] || '') + '</div></div>');
                bindCardActions();
                setTimeout(function () { if (pageTitle) pageTitle.textContent = '在线词典'; }, 6000);
            });
        }

        function renderHistory() {
            var hist = getHist();
            if (!historyBar) return;
            if (!hist.length) { historyBar.innerHTML = ''; return; }
            var html = '<span class="label">最近搜索：</span>';
            hist.forEach(function (h) { html += '<button class="hist-chip" data-hist="' + esc(h) + '">' + esc(h) + '</button> '; });
            html += '<button class="hist-chip" data-clear="1">✕ 清空</button>';
            historyBar.innerHTML = html;
        }

        function searchAndRender(resetPage) {
            if (currentType === 'fav') { favView(); return; }
            var kw = searchInput.value.trim().toLowerCase();
            if (!kw && currentType !== 'all') {
                // 单词/成语/歇后语 tab 无关键词：展示该分类全部（迷你库）
                lastKw = '';
                page = 1;
                var entries = miniMatch('', currentType);
                showPage(entries, entries.length, '');
                return;
            }
            doSearch(resetPage);
        }

        /* ===== 事件 ===== */
        if (searchBtn) searchBtn.addEventListener('click', function () { searchAndRender(true); });
        if (searchInput) {
            searchInput.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') searchAndRender(true);
            });
            searchInput.addEventListener('input', function () {
                searchAndRender(true);
            });
        }
        if (randomBtn) randomBtn.addEventListener('click', randomWord);
        for (var ti = 0; ti < typeTabs.length; ti++) {
            typeTabs[ti].addEventListener('click', function () {
                for (var k = 0; k < typeTabs.length; k++) typeTabs[k].classList.remove('active');
                this.classList.add('active');
                currentType = this.dataset.type;
                searchAndRender(true);
            });
        }
        for (var ci = 0; ci < levelChips.length; ci++) {
            levelChips[ci].addEventListener('click', function () {
                for (var k = 0; k < levelChips.length; k++) levelChips[k].classList.remove('active');
                this.classList.add('active');
                currentLevel = this.dataset.level || '';
                if (currentType === 'fav') favView();
                else if (searchInput.value.trim()) doSearch(true);
                else searchAndRender(true);
            });
        }
        if (loadMoreBtn) loadMoreBtn.addEventListener('click', function () {
            page++;
            searchAndRender(false);
        });
        if (historyBar) historyBar.addEventListener('click', function (e) {
            var t = e.target;
            if (t && t.dataset) {
                if (t.dataset.clear === '1') { setHist([]); renderHistory(); return; }
                if (t.dataset.hist) {
                    searchInput.value = t.dataset.hist;
                    searchAndRender(true);
                }
            }
        });

        var isTransitioning = false;
        if (backHome) backHome.addEventListener('click', function (e) {
            e.preventDefault();
            if (isTransitioning) return;
            isTransitioning = true;
            overlay.classList.add('active');
            setTimeout(function () {
                window.location.href = 'index.html';
            }, 1000);
        });

        /* ===== 初始化 ===== */
        renderHome();
        renderHistory();
        (function warmFav() {
            var fav = getFav();
            var toLoad = {};
            fav.forEach(function (w) {
                var L = letterOf(w);
                if (L) toLoad[L] = 1;
            });
            var t = [];
            for (var L in toLoad) t.push(loadLetter(L));
            Promise.all(t).then(function () { /* 缓存就绪，收藏详情可随时补全 */ });
        })();
    })();
    </script>
</body>
</html>
`;

/* ============ 组装 ============
   cssHead = BOM + <!DOCTYPE html>…<style> + 原全部 CSS（不含 </style>）
   因此：cssHead + EXTRA_CSS + </style> + head/body 尾巴 + BODY + overlay + SCRIPT */
const MID = `\n    </style>

    <link rel="stylesheet" href="common.css">
</head>
<body>
    <div class="bg-animation" aria-hidden="true">
        <div class="bg-flow-1"></div>
        <div class="bg-flow-2"></div>
        <div class="bg-flow-3"></div>
        <div class="orb orb-1"></div>
        <div class="orb orb-2"></div>
        <div class="orb orb-3"></div>
        <div class="orb orb-4"></div>
        <div class="orb orb-5"></div>
    </div>
    <!-- 转场遮罩 -->
    <div class="overlay" id="overlay">
        <div class="loader-wrap">
            <div class="loader-ring"></div>
            <div class="loader-text">找乐子～</div>
        </div>
    </div>
`;

const finalHtml = cssHead + '\n' + EXTRA_CSS + MID + '\n' + BODY + '\n' + SCRIPT;
fs.writeFileSync(SRC, finalHtml, 'utf8');
console.log('已生成', SRC, 'bytes=' + finalHtml.length);