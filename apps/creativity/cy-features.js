/* 创意引擎 - 全局功能：成就系统 + 最近记录 + 通用组件 + 对比度兜底
 * 全文件按"一片只做一件事"拆成 ≤50 行的小片，共享能力放在私有袋 CY._f：
 * 存储读写、颜色解析、样式注入，各片不再重复实现。
 * 公共成员签名与旧版逐一保持兼容（各页面与构建脚本仍按原名调用）。
 * 说明（2026-10-17 全面整改）：
 *   · 事件总线（CY.on/CY.emit/跨 tab 同步）全链零订阅，整体移除；
 *   · 站内搜索已由 common.js 命令面板（⌘K / /）取代，CY.search/CY.openSearch 随之退役；
 *   · 新旧版本触达（CY.whatsNew/CY.markVersionSeen）零调用，一并移除；
 *     CY.VERSION_LOG 由 12.html「关于与更新」页读取渲染，属公共契约，保留。 */

/* ========== 基座：私有袋 + 存储/工具 ========== */
(function () {
    var CY = window.CY = window.CY || {};
    var bag = (CY._f = CY._f || {});

    bag.jGet = function (key) {
        try { return JSON.parse(localStorage.getItem(key)); } catch (err) { return null; }
    };
    bag.jSet = function (key, val) {
        try { localStorage.setItem(key, JSON.stringify(val)); } catch (err) {}
    };
    bag.esc = function (text) {
        return String(text == null ? '' : text).replace(/[&<>"]/g, function (ch) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch];
        });
    };

    CY.escapeHtml = bag.esc;
    CY.fmtDate = function (date) {
        date = date || new Date();
        return date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
    };
    CY.download = function (fileName, text, mime) {
        try {
            var blob = new Blob([text], { type: mime || 'text/plain;charset=utf-8' });
            var link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            setTimeout(function () { URL.revokeObjectURL(link.href); link.remove(); }, 800);
        } catch (err) {}
    };
})();

/* ========== 通用 Toast（样式走公共层 .cy-toast，随主题变量联动） ========== */
(function () {
    var CY = window.CY = window.CY || {};
    CY.showToast = function (msg, ms) {
        ms = ms || 2600;
        var el = document.getElementById('cyToast');
        if (!el) {
            el = document.createElement('div');
            el.id = 'cyToast';
            el.className = 'cy-toast';
            document.body.appendChild(el);
        }
        el.textContent = msg;
        el.classList.add('show');
        clearTimeout(el._tm);
        el._tm = setTimeout(function () { el.classList.remove('show'); }, ms);
    };
})();

/* ========== 活动数据层：存储（条目数组读写，容量封顶 500） ========== */
(function () {
    var CY = window.CY = window.CY || {};
    var bag = (CY._f = CY._f || {});

    var KEY = 'cy_activity_v1';
    var MAX = 500;
    bag.activity = {
        read: function () {
            try {
                var items = JSON.parse(localStorage.getItem(KEY));
                if (Object.prototype.toString.call(items) === '[object Array]') return items;
            } catch (err) {}
            return [];
        },
        write: function (items) {
            if (items.length > MAX) items = items.slice(items.length - MAX);
            try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (err) {}
            return items;
        }
    };
})();

/* ========== 活动数据层：对外 API（CY.activity，首页/关于页聚合） ==========
 *   add({type, itemId, page, extra}) -> 写日志
 *   recent(n)   最近 n 条
 *   todayCount() 今日活动数
 *   streakDays() 连续活跃天数（今天未活动则以今天为断点回退） */
(function () {
    var CY = window.CY = window.CY || {};
    var bag = (CY._f = CY._f || {});

    CY.activity = {
        add: function (entry) {
            var items = bag.activity.read();
            items.push({
                type: entry.type || 'use',
                itemId: entry.itemId == null ? '' : String(entry.itemId),
                page: entry.page || '',
                at: entry.at || Date.now()
            });
            bag.activity.write(items);
            if (CY.activity.streakDays() >= 7) CY.unlock('checkin_7');
        },
        recent: function (limit) {
            var items = bag.activity.read();
            return limit ? items.slice(-limit) : items;
        },
        todayCount: function () {
            var items = bag.activity.read(), now = new Date(), count = 0;
            for (var idx = 0; idx < items.length; idx++) {
                var day = new Date(items[idx].at);
                if (day.getFullYear() === now.getFullYear() && day.getMonth() === now.getMonth() && day.getDate() === now.getDate()) count++;
            }
            return count;
        },
        streakDays: function () {
            var items = bag.activity.read(), days = {};
            for (var idx = 0; idx < items.length; idx++) {
                var day = new Date(items[idx].at);
                days[day.getFullYear() + '-' + (day.getMonth() + 1) + '-' + day.getDate()] = 1;
            }
            function keyOf(day) { return day.getFullYear() + '-' + (day.getMonth() + 1) + '-' + day.getDate(); }
            var now = new Date(), count = 0, cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            if (!days[keyOf(cursor)]) cursor.setDate(cursor.getDate() - 1); // 今天没活动，从昨天起算
            while (days[keyOf(cursor)]) { count++; cursor.setDate(cursor.getDate() - 1); }
            return count;
        }
    };
})();

/* ========== 版本与数据迁移框架 ==========
 * cy_app_version = {ver, at, read[]}：ver=数据已迁移到的版本，read=已读过的更新记录
 * 新功能发布流程：CY.APP_VER 升版 → VERSION_LOG 补一条 → 12.html 更新日志读取展示 */
(function () {
    var CY = window.CY = window.CY || {};

    CY.APP_VER = '1.0.0';

    /* 更新日志：12.html「关于与更新」页直接读取渲染，属公共契约，勿当死代码删除 */
    CY.VERSION_LOG = [
        { ver: '1.0.0', title: '创意引擎 · 初版发布', desc: '12 个创作工具 + 10 主题 + 离线可用；数据全部保存在本地' }
    ];

    function verState() {
        var stored = { ver: '', read: [] };
        try {
            var saved = JSON.parse(localStorage.getItem('cy_app_version') || '{}');
            if (saved && typeof saved.ver === 'string') stored.ver = saved.ver;
            if (Object.prototype.toString.call(saved && saved.read) === '[object Array]') stored.read = saved.read;
        } catch (err) {}
        return stored;
    }
    function verGte(left, right) {
        var partsA = String(left || '0').split('.').map(Number);
        var partsB = String(right || '0').split('.').map(Number);
        while (partsA.length < 3) partsA.push(0);
        while (partsB.length < 3) partsB.push(0);
        for (var idx = 0; idx < 3; idx++) { if (partsA[idx] > partsB[idx]) return true; if (partsA[idx] < partsB[idx]) return false; }
        return true;
    }
    CY.dataMigration = function (name, toVer, fn) {
        var state = verState();
        if (verGte(state.ver, toVer)) return;
        try { if (fn) fn(); } catch (err) {}
        state.ver = toVer;
        try { localStorage.setItem('cy_app_version', JSON.stringify({ ver: state.ver, at: Date.now(), read: state.read })); } catch (err2) {}
    };
    /* 内置迁移：v1.0.0 —— 初始化笔记数据结构（幂等无害） */
    CY.dataMigration('notes_norm', '1.0.0', function () {
        try {
            var notes = JSON.parse(localStorage.getItem('cy_notes_v1') || '[]');
            if (Object.prototype.toString.call(notes) !== '[object Array]') return;
            var changed = false;
            for (var idx = 0; idx < notes.length; idx++) {
                if (notes[idx] && notes[idx].tags == null) { notes[idx].tags = []; changed = true; }
                if (notes[idx] && notes[idx].fav == null) { notes[idx].fav = false; changed = true; }
            }
            if (changed) localStorage.setItem('cy_notes_v1', JSON.stringify(notes));
        } catch (err) {}
    });
})();

/* ========== 页面索引（站内搜索 + sitemap 单一来源，构建脚本读取） ========== */
(function () {
    var CY = window.CY = window.CY || {};
    CY.PAGES = [
        { f: 'index.html', t: '创意引擎主站·灵感工坊', k: '首页 导航 灵感 创意 引擎 火花' },
        { f: '1.html', t: '灵感火花·创意点子生成器', k: '点子 灵感 创意 生成 脑暴 选题' },
        { f: '2.html', t: '文案工坊·标语金句生成', k: '文案 标语 标题 金句 广告 祝福' },
        { f: '3.html', t: '摘要萃取·智能摘要提炼', k: '摘要 关键词 提炼 文本 压缩' },
        { f: '4.html', t: '文本体检·深度文本分析', k: '字数 词频 词云 可读性 情感 分析' },
        { f: '5.html', t: '配色灵感·调色板与对比度', k: '配色 色板 颜色 对比度 WCAG 和谐' },
        { f: '6.html', t: '生成艺术·创意画布', k: '画布 艺术 生成 图片 导出 流场 分形' },
        { f: '7.html', t: '决策矩阵·加权决策辅助', k: '决策 选择 打分 权衡 权重 敏感性' },
        { f: '8.html', t: '目标拆解·SMART里程碑规划', k: '目标 拆解 SMART 计划 里程碑 甘特' },
        { f: '9.html', t: '灵感记录本·想法速记', k: '记录 笔记 想法 标签 速记 导出' },
        { f: '10.html', t: '创意连线·联想训练', k: '联想 词汇 训练 思维 连接 配对' },
        { f: '11.html', t: '创作方法库·方法论与引导', k: '方法论 创意 方法 SCAMPER 六顶思考帽 头脑风暴' },
        { f: '12.html', t: '关于与更新·签到统计', k: '关于 版本 更新 声明 签到 统计 反馈' },
        { f: 'verify.html', t: '全站自检', k: '自检 检测 状态 体检' }
    ];
})();

/* ========== 成就系统 + 工具使用统计 ========== */
(function () {
    var CY = window.CY = window.CY || {};
    var bag = (CY._f = CY._f || {});

    CY.ACHIEVEMENTS = [
        { id: 'idea_first', t: '初燃火花', d: '用灵感火花生成第一个点子', icon: '💡' },
        { id: 'copy_first', t: '妙笔生花', d: '生成第一句文案', icon: '✍️' },
        { id: 'digest_first', t: '提纲挈领', d: '完成一次文本摘要', icon: '📑' },
        { id: 'palette_10', t: '调色高手', d: '生成过 10 个配色方案', icon: '🎨' },
        { id: 'art_first', t: '艺术创想', d: '用生成艺术画出第一幅作品', icon: '🖼️' },
        { id: 'decide_5', t: '当机立断', d: '完成 5 次决策打分', icon: '⚖️' },
        { id: 'plan_first', t: '谋定后动', d: '完成一次目标拆解', icon: '🎯' },
        { id: 'note_10', t: '灵感收藏家', d: '记录 10 条灵感笔记', icon: '📓' },
        { id: 'link_10', t: '天马行空', d: '完成 10 次创意连线', icon: '🧩' },
        { id: 'method_first', t: '初窥门径', d: '完成一次创作方法引导', icon: '📚' },
        { id: 'tool_8', t: '工具达人', d: '使用过 8 个不同工具', icon: '🛠️' },
        { id: 'checkin_7', t: '七日之约', d: '连续活跃 7 天', icon: '📅' }
    ];

    CY.getUnlocked = function () { return bag.jGet('cy_ach') || []; };
    CY.unlock = function (id) {
        var unlocked = CY.getUnlocked();
        if (unlocked.indexOf(id) < 0) {
            unlocked.push(id);
            bag.jSet('cy_ach', unlocked);
            var meta = null;
            for (var idx = 0; idx < CY.ACHIEVEMENTS.length; idx++) {
                if (CY.ACHIEVEMENTS[idx].id === id) { meta = CY.ACHIEVEMENTS[idx]; break; }
            }
            CY.showToast('🏆 解锁成就：' + (meta ? meta.icon + ' ' + meta.t : id));
        }
    };

    /* 工具使用计数（跨页统计，去重） */
    CY.trackPage = function (pageKey) {
        if (!pageKey) return;
        var used = bag.jGet('cy_used') || [];
        if (used.indexOf(pageKey) < 0) {
            used.push(pageKey);
            bag.jSet('cy_used', used);
        }
        if (used.length >= 8) CY.unlock('tool_8');
    };
})();

/* ========== 最近记录：数据定义 + 保存 ========== */
(function () {
    var CY = window.CY = window.CY || {};
    var bag = (CY._f = CY._f || {});

    CY.RECENT_MAP = {
        '1.html': { key: 'cy_recent_ideas', input: null, label: '点子' },
        '2.html': { key: 'cy_recent_copy', input: null, label: '文案' },
        '4.html': { key: 'cy_recent_text', input: '#ta', label: '文本' }
    };
    CY.saveRecent = function (key, text) {
        try {
            var list = bag.jGet(key) || [];
            list.unshift({ t: String(text).slice(0, 120), time: new Date().toLocaleString() });
            bag.jSet(key, list.slice(0, 10));
        } catch (err) {}
    };
})();

/* ========== 样式：最近面板/浮钮/回首页按钮（惰性注入，幂等） ========== */
(function () {
    var CY = window.CY = window.CY || {};
    var bag = (CY._f = CY._f || {});

    var STYLE_ID = 'cy-features-style';
    var Z_FLOAT = '2147483646';   /* 悬浮层：最近面板/浮钮，置于全站内容之上 */
    var Z_HOME = '2147483000';    /* 回首页按钮：略低于悬浮层，避免盖住浮钮 */

    bag.ensureStyle = function () {
        if (document.getElementById(STYLE_ID)) return;
        var styleNode = document.createElement('style');
        styleNode.id = STYLE_ID;
        styleNode.textContent =
            '.cy-recent-panel{position:fixed;bottom:76px;right:20px;width:min(300px,86vw);max-height:46vh;overflow-y:auto;z-index:' + Z_FLOAT + ';background:var(--card,#fff);color:var(--txt,#333);border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.4);padding:10px 0;}'
            + '.cy-recent-head{padding:8px 16px;font-size:14px;font-weight:bold;color:var(--blue,#667eea);border-bottom:1px solid var(--line,#eee);display:flex;justify-content:space-between;align-items:center;}'
            + '.cy-recent-close{cursor:pointer;color:var(--dim,#999);}'
            + '.cy-recent-empty{padding:20px;text-align:center;color:var(--dim,#999);font-size:13px;}'
            + '.cy-recent-row{padding:10px 16px;font-size:13px;color:var(--txt,#333);cursor:pointer;border-bottom:1px solid var(--line,#f3f3f3);word-break:break-all;}'
            + '.cy-recent-row:hover{background:var(--card-2,#f4f6ff);}'
            + '.cy-recent-time{color:var(--dim,#888);}'
            + '.cy-recent-fab{position:fixed;bottom:20px;right:74px;z-index:' + Z_FLOAT + ';width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#43a047,#2e7d32);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:18px;box-shadow:0 4px 16px rgba(0,0,0,.35);user-select:none;-webkit-user-select:none;}'
            + '.cy-home-btn{position:fixed;left:16px;bottom:76px;width:44px;height:44px;border-radius:50%;border:1px solid var(--line,#ddd);background:var(--card,#fff);color:var(--txt,#333);font-size:20px;line-height:1;cursor:pointer;z-index:' + Z_HOME + ';box-shadow:0 4px 14px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;padding:0;}';
        document.head.appendChild(styleNode);
    };
})();

/* ========== 最近记录：打开面板 ========== */
(function () {
    var CY = window.CY = window.CY || {};
    var bag = (CY._f = CY._f || {});

    CY.openRecent = function () {
        var page = (window.location.pathname.split('/').pop() || '').toLowerCase();
        var cfg = CY.RECENT_MAP[page];
        if (!cfg) { CY.showToast('本页无最近记录功能'); return; }
        var list = bag.jGet(cfg.key) || [];
        var panel = document.getElementById('cyRecentPanel');
        if (panel) panel.remove();
        bag.ensureStyle();
        panel = document.createElement('div');
        panel.id = 'cyRecentPanel';
        panel.className = 'cy-recent-panel';
        panel.innerHTML = '<div class="cy-recent-head">🕘 最近' + cfg.label + '<span class="cy-recent-close" id="cyRecentClose">✕</span></div>';
        if (!list.length) {
            var empty = document.createElement('div');
            empty.className = 'cy-recent-empty';
            empty.textContent = '暂无记录';
            panel.appendChild(empty);
        } else {
            list.forEach(function (it) {
                var row = document.createElement('div');
                row.className = 'cy-recent-row';
                row.innerHTML = '<span class="cy-recent-time"></span>';
                row.firstChild.textContent = it.time;
                row.appendChild(document.createTextNode(it.t));
                row.onclick = function () {
                    if (cfg.input) {
                        var input = document.querySelector(cfg.input);
                        if (input) {
                            input.value = it.t;
                            input.focus();
                            CY.showToast('已回填，可重新分析');
                        }
                    } else {
                        try { navigator.clipboard.writeText(it.t).then(function () { CY.showToast('已复制内容'); }).catch(function () {}); } catch (err) {}
                    }
                    panel.remove();
                };
                panel.appendChild(row);
            });
        }
        document.body.appendChild(panel);
        document.getElementById('cyRecentClose').onclick = function () { panel.remove(); };
    };
})();

/* ========== 最近记录浮钮（仅记录功能页显示） ========== */
(function () {
    var CY = window.CY = window.CY || {};
    var bag = (CY._f = CY._f || {});

    var page = (window.location.pathname.split('/').pop() || '').toLowerCase();
    if (!CY.RECENT_MAP[page]) return;

    function mountFab() {
        bag.ensureStyle();
        var btn = document.createElement('div');
        btn.textContent = '🕘';
        btn.title = '最近记录';
        btn.setAttribute('aria-label', '最近记录');
        btn.className = 'cy-recent-fab';
        btn.onclick = function () { CY.openRecent(); };
        document.body.appendChild(btn);
    }
    if (document.body) mountFab();
    else document.addEventListener('DOMContentLoaded', mountFab);
})();

/* ========== 对比度兜底：颜色工具（亮度/解析/灰判/混合） ========== */
(function () {
    var CY = window.CY = window.CY || {};
    var bag = (CY._f = CY._f || {});

    bag.clr = {
        luma: function (rgb) { return (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255; },
        parse: function (color) {
            if (!color) return null;
            var match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
            if (match) { return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10), match[4] === undefined ? 1 : parseFloat(match[4])]; }
            var hex6 = color.match(/^#([0-9a-f]{6})$/i);
            if (hex6) { var value = parseInt(hex6[1], 16); return [(value >> 16) & 255, (value >> 8) & 255, value & 255, 1]; }
            var hex3 = color.match(/^#([0-9a-f]{3})$/i);
            if (hex3) { var triple = hex3[1]; return [parseInt(triple[0] + triple[0], 16), parseInt(triple[1] + triple[1], 16), parseInt(triple[2] + triple[2], 16), 1]; }
            return null;
        },
        isGray: function (rgb) { return (Math.max(rgb[0], rgb[1], rgb[2]) - Math.min(rgb[0], rgb[1], rgb[2])) < 24; },
        blend: function (top, bottom) {
            var alpha = top[3];
            return [bottom[0] * (1 - alpha) + top[0] * alpha, bottom[1] * (1 - alpha) + top[1] * alpha, bottom[2] * (1 - alpha) + top[2] * alpha, 1];
        }
    };
})();

/* ========== 对比度兜底：背景亮度推导（含渐变） ========== */
(function () {
    var CY = window.CY = window.CY || {};
    var bag = (CY._f = CY._f || {});

    bag.light = false;
    bag.gradLuma = function (background) {
        if (!background || background.indexOf('gradient') < 0) return null;
        var matches = background.match(/gradient\([^)]*\)/g);
        if (!matches) return null;
        var sum = 0, count = 0;
        for (var idx = 0; idx < matches.length; idx++) {
            var cols = matches[idx].match(/#[0-9a-f]{6}|#[0-9a-f]{3}|rgba?\([^)]*\)/gi);
            if (!cols) continue;
            for (var colIdx = 0; colIdx < cols.length; colIdx++) {
                var parsed = bag.clr.parse(cols[colIdx]);
                if (parsed) { sum += bag.clr.luma(parsed); count++; }
            }
        }
        return count ? sum / count : null;
    };
    bag.bgOf = function (el) {
        var node = el, acc = null;
        while (node) {
            var cs = getComputedStyle(node);
            var grad = bag.gradLuma(cs.backgroundImage);
            if (grad !== null) { return (acc && acc[3] >= 0.95) ? bag.clr.luma(acc) : grad; }
            var bg = bag.clr.parse(cs.backgroundColor);
            if (bg && bg[3] > 0) {
                if (bg[3] >= 0.95) { return acc ? bag.clr.luma(bag.clr.blend(acc, bg)) : bag.clr.luma(bg); }
                acc = acc ? bag.clr.blend(bg, acc) : bg;
            }
            if (node === document.body) break;
            node = node.parentElement;
        }
        if (acc) {
            var bodyBg = bag.clr.parse(getComputedStyle(document.body).backgroundColor);
            if (bodyBg && bodyBg[3] > 0) { return bag.clr.luma(bag.clr.blend(acc, bodyBg)); }
            return bag.clr.luma(bag.clr.blend(acc, bag.light ? [244, 246, 251, 1] : [10, 14, 31, 1]));
        }
        var bodyBg2 = bag.clr.parse(getComputedStyle(document.body).backgroundColor);
        if (bodyBg2 && bodyBg2[3] > 0) { return bag.clr.luma(bodyBg2); }
        return 0.1;
    };
})();

/* ========== 对比度兜底：单元素修正（测算与重写收进一处；bg/cl 为亮度 0-1） ========== */
(function () {
    var CY = window.CY = window.CY || {};
    var bag = (CY._f = CY._f || {});

    bag.fixElement = function (el, theme, dim, txt, blue) {
        var tag = el.tagName;
        if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'CANVAS' || tag === 'IMG' || tag === 'VIDEO' || tag === 'SVG' || tag === 'BR' || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        if (el.children.length > 0 && el.childNodes.length === el.children.length) return;
        if (!el.textContent || !el.textContent.trim()) return;
        var cs = getComputedStyle(el);
        var color = bag.clr.parse(cs.color);
        if (!color) return;
        if (color[3] === 0) return;
        var bg = bag.bgOf(el);
        var cl = bag.clr.luma(color);
        var isHeading = /^(H1|H2|H3|H4|H5|H6)$/.test(tag) || /title|heading/i.test(el.className || '');
        var dimColor = bag.clr.parse(dim);
        var dimLuma = dimColor ? bag.clr.luma(dimColor) : 0.5;
        var rep = '';
        if (bag.clr.isGray(color)) {
            if (bg < 0.4 && cl < 0.45) { rep = dimLuma > 0.5 ? dim : 'rgb(219,227,245)'; }
            else if (bg > 0.82 && cl > 0.82) { rep = isHeading ? 'rgb(30,39,51)' : 'rgb(30,39,51)'; }
        } else if (bg < 0.4 && cl < 0.45) { rep = theme ? 'rgb(219,227,245)' : blue; }
        else if (bg > 0.82 && cl > 0.82) { rep = 'rgb(30,39,51)'; }
        if (rep) {
            el.style.transition = 'none';
            el.style.setProperty('color', rep, 'important');
            try { el.style.setProperty('-webkit-text-fill-color', rep, 'important'); } catch (err) {}
        }
    };
})();

/* ========== 对比度兜底：主入口 + 启动（遍历全页元素修正可读性） ========== */
(function () {
    var CY = window.CY = window.CY || {};
    var bag = (CY._f = CY._f || {});

    bag.fixRan = false;
    CY.contrastFix = function (force) {
        if (bag.fixRan && !force) return;
        bag.fixRan = true;
        try {
            var rootStyle = getComputedStyle(document.documentElement);
            var bgValue = bag.clr.parse(rootStyle.getPropertyValue('--bg'));
            var lightTheme = bgValue ? bag.clr.luma(bgValue) > 0.5 : false;
            bag.light = lightTheme;
            var dim = (rootStyle.getPropertyValue('--dim') || '#8b93a7').trim();
            var txt = (rootStyle.getPropertyValue('--txt') || '#e8ecf5').trim();
            var blue = (rootStyle.getPropertyValue('--blue') || '#7aa8ff').trim();
            if (dim.indexOf('#') === 0) dim = 'rgb(' + parseInt(dim.slice(1, 3), 16) + ',' + parseInt(dim.slice(3, 5), 16) + ',' + parseInt(dim.slice(5, 7), 16) + ')';
            if (txt.indexOf('#') === 0) txt = 'rgb(' + parseInt(txt.slice(1, 3), 16) + ',' + parseInt(txt.slice(3, 5), 16) + ',' + parseInt(txt.slice(5, 7), 16) + ')';
            if (blue.indexOf('#') === 0) blue = 'rgb(' + parseInt(blue.slice(1, 3), 16) + ',' + parseInt(blue.slice(3, 5), 16) + ',' + parseInt(blue.slice(5, 7), 16) + ')';
            var elements = document.querySelectorAll('body *');
            for (var idx = 0; idx < elements.length; idx++) {
                bag.fixElement(elements[idx], lightTheme, dim, txt, blue);
            }
        } catch (err) {}
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(CY.contrastFix, 200); });
    } else {
        setTimeout(CY.contrastFix, 200);
    }
})();

/* ========== 对比度兜底：主题切换监听（改 data-theme 后重算） ========== */
(function () {
    var CY = window.CY = window.CY || {};
    try {
        var themeObserver = new MutationObserver(function (muts) {
            for (var idx = 0; idx < muts.length; idx++) {
                if (muts[idx].attributeName === 'data-theme') {
                    setTimeout(function () { CY.contrastFix(true); }, 120);
                    setTimeout(function () { CY.contrastFix(true); }, 700);
                    return;
                }
            }
        });
        themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    } catch (err) {}
})();

/* ========== 自动统计当前页使用（排除自检页） ========== */
(function () {
    var CY = window.CY = window.CY || {};
    var cur = (window.location.pathname.split('/').pop() || '').toLowerCase();
    var skipPages = ['verify.html'];
    if (cur && skipPages.indexOf(cur) < 0 && cur.indexOf('.html') > 0) {
        CY.trackPage(cur);
    }
})();

/* ========== 悬浮回首页按钮：仅当页面没有任何指向首页的链接时注入 ========== */
(function () {
    var CY = window.CY = window.CY || {};
    var bag = (CY._f = CY._f || {});

    function mountHomeBtn() {
        var cur = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
        if (cur === 'index.html' || cur === '') return;
        if (document.querySelector('a[href="index.html"], a[href="./index.html"], a[href="./"]')) return;
        bag.ensureStyle();
        var btn = document.createElement('button');
        btn.id = 'cyHomeBtn';
        btn.type = 'button';
        btn.setAttribute('aria-label', '返回首页');
        btn.title = '返回首页';
        btn.className = 'cy-home-btn';
        btn.textContent = '🏠';
        btn.onclick = function () { location.href = 'index.html'; };
        document.body.appendChild(btn);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountHomeBtn);
    else mountHomeBtn();
})();
