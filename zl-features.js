/* 找乐子 - 全局功能：成就系统 + 站内搜索 + 通用组件 */
(function () {
    var ZL = window.ZL = window.ZL || {};

    function LS(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
    function SS(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

    /* ========== 通用 Toast ========== */
    ZL.showToast = function (msg, ms) {
        ms = ms || 2600;
        var t = document.getElementById('zlToast');
        if (!t) {
            t = document.createElement('div');
            t.id = 'zlToast';
            t.style.cssText = 'position:fixed;top:18px;left:50%;transform:translateX(-50%);z-index:2147483647;background:rgba(20,22,45,.92);color:#fff;padding:10px 22px;border-radius:24px;font-size:14px;box-shadow:0 6px 24px rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.15);pointer-events:none;opacity:0;transition:opacity .3s;max-width:86%;text-align:center;';
            document.body.appendChild(t);
        }
        t.textContent = msg;
        t.style.opacity = '1';
        clearTimeout(t._tm);
        t._tm = setTimeout(function () { t.style.opacity = '0'; }, ms);
    };

    /* ========== 页面索引（站内搜索） ========== */
    ZL.PAGES = [
        { f: 'index.html', t: '找乐子主站·优质工具库', k: '首页 工具库 导航 主程序' },
        { f: '1.html', t: '密码登录', k: '密码 登录 门禁' },
        { f: '2.html', t: '第三方信息授权协议', k: '协议 授权' },
        { f: '3.html', t: '授权确认', k: '协议 勾选 确认' },
        { f: '4.html', t: '选择IP登录', k: 'IP 登录 选择' },
        { f: '5.html', t: '找乐子·媒体池', k: '图片 音频 媒体 相册' },
        { f: '6.html', t: '作者介绍', k: '作者 碧世辉煌 介绍' },
        { f: '7.html', t: '优质工具箱', k: '工具 工具箱' },
        { f: '8.html', t: '背包', k: '背包 物品' },
        { f: '9.html', t: '纯文本一键生成txt', k: 'txt 文本 生成' },
        { f: '10.html', t: '后台修改办法', k: '后台 修改 维护' },
        { f: '11.html', t: '优质工具库', k: '工具 工具库' },
        { f: '12.html', t: '基础计算器', k: '计算器 计算' },
        { f: '13.html', t: '日期计算器', k: '日期 计算 时间' },
        { f: '14.html', t: '虚拟消费系统', k: '购物 商品 购物车 优惠券 消费' },
        { f: '15.html', t: '强密码生成器', k: '密码 生成 安全' },
        { f: '16.html', t: '黑客模拟器', k: '黑客 终端 模拟' },
        { f: '17.html', t: '古今中外暗号大全', k: '暗号 密码 加密 语言' },
        { f: '18.html', t: '单位换算', k: '单位 换算 长度 重量' },
        { f: '19.html', t: '网页备忘录', k: '备忘录 笔记 链接 收藏' },
        { f: '20.html', t: '五子棋·人机对弈', k: '五子棋 棋 游戏 对战' },
        { f: '21.html', t: '记忆配对游戏', k: '记忆 配对 游戏 翻牌' },
        { f: '22.html', t: '扫雷', k: '扫雷 游戏 炸弹' },
        { f: '23.html', t: '在线词典', k: '词典 单词 翻译' },
        { f: '24.html', t: '词频统计', k: '词频 统计 文本' },
        { f: '25.html', t: '字数统计', k: '字数 统计 字符' },
        { f: '26.html', t: '二维码生成器', k: '二维码 生成 扫码' },
        { f: '27.html', t: '摩斯密码转换', k: '摩斯 密码 电报 转换' },
        { f: '28.html', t: '免责声明', k: '声明 免责' },
        { f: '29.html', t: '反馈渠道', k: '反馈 意见 联系' },
        { f: '30.html', t: '更新公告', k: '更新 公告 版本' },
        { f: '31.html', t: '娱乐游戏', k: '游戏 娱乐 导航' },
        { f: '32.html', t: '找乐子工具', k: '工具 导航' },
        { f: '文件搜索.html', t: '文件搜索', k: '文件 搜索 查找' },
        { f: '33.html', t: '今天玩什么·随机乐子', k: '随机 乐子 推荐 今天玩什么' },
        { f: '34.html', t: '打字速度测试', k: '打字 速度 WPM 练习' },
        { f: '35.html', t: '番茄专注·白噪音', k: '番茄 专注 计时 白噪音' },
        { f: '36.html', t: '双人井字棋', k: '井字棋 双人 对战 游戏' },
        { f: '37.html', t: '每日一题', k: '每日 答题 谜题 挑战' },
        { f: '38.html', t: '签到·成就徽章墙', k: '签到 成就 徽章 打卡' },
        { f: '39.html', t: '分享卡片生成', k: '分享 卡片 海报 生成' },
        { f: '40.html', t: '语音控制', k: '语音 声控 命令' }
    ];

    /* ========== 成就系统 ========== */
    ZL.ACHIEVEMENTS = [
        { id: 'first_login', t: '初来乍到', d: '完成第一次密码登录', icon: '🎯' },
        { id: 'game_first', t: '小试身手', d: '任一游戏获胜一次', icon: '🎮' },
        { id: 'gobang_win', t: '棋逢对手', d: '五子棋战胜AI', icon: '♟️' },
        { id: 'mines_clear', t: '拆弹专家', d: '扫雷通关', icon: '💣' },
        { id: 'memory_pair', t: '记忆大师', d: '记忆配对通关', icon: '🧠' },
        { id: 'tool_10', t: '工具达人', d: '使用过10个不同工具', icon: '🛠️' },
        { id: 'checkin_7', t: '持之以恒', d: '连续签到7天', icon: '📅' },
        { id: 'daily_quiz', t: '每日一题', d: '完成今日答题', icon: '🧩' },
        { id: 'typing_50', t: '快手', d: '打字测试达50WPM', icon: '⌨️' },
        { id: 'tictac_win', t: '纵横四方', d: '井字棋获胜一局', icon: '⭕' },
        { id: 'focus_25', t: '心流大师', d: '完成一次番茄专注', icon: '⏱️' }
    ];

    ZL.getUnlocked = function () { return LS('zl_ach') || []; };
    ZL.unlock = function (id) {
        var u = ZL.getUnlocked();
        if (u.indexOf(id) < 0) {
            u.push(id);
            SS('zl_ach', u);
            var meta = null;
            for (var i = 0; i < ZL.ACHIEVEMENTS.length; i++) { if (ZL.ACHIEVEMENTS[i].id === id) { meta = ZL.ACHIEVEMENTS[i]; break; } }
            ZL.showToast('🏆 解锁成就：' + (meta ? meta.icon + ' ' + meta.t : id));
        }
    };

    /* 工具使用计数（跨页统计，去重） */
    ZL.trackPage = function (pageKey) {
        if (!pageKey) return;
        var used = LS('zl_used') || [];
        if (used.indexOf(pageKey) < 0) {
            used.push(pageKey);
            SS('zl_used', used);
        }
        if (used.length >= 10) ZL.unlock('tool_10');
    };

    /* ========== 站内搜索 ========== */
    ZL.search = function (q) {
        q = (q || '').trim().toLowerCase();
        if (!q) return [];
        var out = [];
        for (var i = 0; i < ZL.PAGES.length; i++) {
            var p = ZL.PAGES[i];
            if ((p.t + ' ' + p.k).toLowerCase().indexOf(q) >= 0) {
                out.push(p);
            }
        }
        return out;
    };

    ZL.openSearch = function () {
        if (document.getElementById('zlSearchBox')) { document.getElementById('zlSearchBox').focus(); return; }
        var box = document.createElement('div');
        box.id = 'zlSearchBox';
        box.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:2147483646;background:rgba(8,10,30,.55);display:flex;align-items:flex-start;justify-content:center;padding-top:12vh;';
        box.innerHTML = '<div style="width:min(560px,92%);background:#fff;border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.5);overflow:hidden;">' +
            '<div style="display:flex;align-items:center;padding:14px 18px;border-bottom:1px solid #eee;">' +
            '<span style="font-size:18px;margin-right:10px;">🔍</span>' +
            '<input id="zlSearchInput" placeholder="搜索页面/功能，如：五子棋、计算器、购物…" style="flex:1;border:none;outline:none;font-size:16px;background:transparent;color:#222;">' +
            '<button id="zlSearchClose" style="border:none;background:none;font-size:20px;cursor:pointer;color:#888;padding:2px 6px;">✕</button></div>' +
            '<div id="zlSearchResults" style="max-height:52vh;overflow-y:auto;padding:6px 0;"></div></div>';
        document.body.appendChild(box);
        var input = document.getElementById('zlSearchInput');
        var results = document.getElementById('zlSearchResults');
        function render() {
            var q = input.value;
            var list = ZL.search(q);
            if (!q) { results.innerHTML = '<div style="padding:20px;text-align:center;color:#999;font-size:13px;">输入关键词开始搜索全站功能</div>'; return; }
            if (!list.length) { results.innerHTML = '<div style="padding:20px;text-align:center;color:#999;">未找到相关功能</div>'; return; }
            results.innerHTML = '';
            for (var i = 0; i < list.length; i++) {
                var a = document.createElement('a');
                a.href = list[i].f;
                a.style.cssText = 'display:block;padding:12px 18px;text-decoration:none;color:#333;font-size:15px;';
                a.innerHTML = '<span style="color:#667eea;font-weight:bold;">' + list[i].t + '</span>';
                a.onmouseenter = function () { this.style.background = '#f4f6ff'; };
                a.onmouseleave = function () { this.style.background = ''; };
                results.appendChild(a);
            }
        }
        input.addEventListener('input', render);
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                var list = ZL.search(input.value);
                if (list.length) { window.location.href = list[0].f; }
            } else if (e.key === 'Escape') { box.remove(); }
        });
        document.getElementById('zlSearchClose').onclick = function () { box.remove(); };
        box.onclick = function (e) { if (e.target === box) box.remove(); };
        input.focus();
    };

    /* 快捷键 "/" 呼出搜索（输入框内不拦截） */
    document.addEventListener('keydown', function (e) {
        if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
            var tag = (document.activeElement && document.activeElement.tagName) || '';
            if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
                e.preventDefault();
                e.stopPropagation();
                ZL.openSearch();
            }
        }
    });

    /* ========== 最近记录面板（#8 优化：二维码/摩斯/暗号等） ========== */
    ZL.RECENT_MAP = {
        '26.html': { key: 'zl_recent_qr', input: '#qrText', label: '二维码' },
        '27.html': { key: 'zl_recent_morse', input: '#inputBox', label: '摩斯密码' },
        '17.html': { key: 'zl_recent_cipher', input: null, label: '暗号' }
    };
    ZL.saveRecent = function (key, text) {
        try {
            var list = LS(key) || [];
            list.unshift({ t: String(text).slice(0, 120), time: new Date().toLocaleString() });
            SS(key, list.slice(0, 10));
        } catch (e) {}
    };
    ZL.openRecent = function () {
        var page = (window.location.pathname.split('/').pop() || '').toLowerCase();
        var cfg = ZL.RECENT_MAP[page];
        if (!cfg) { ZL.showToast('本页无最近记录功能'); return; }
        var list = LS(cfg.key) || [];
        if (document.getElementById('zlRecentPanel')) document.getElementById('zlRecentPanel').remove();
        var panel = document.createElement('div');
        panel.id = 'zlRecentPanel';
        panel.style.cssText = 'position:fixed;bottom:76px;right:20px;width:min(300px,86vw);max-height:46vh;overflow-y:auto;z-index:2147483646;background:#fff;border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.4);padding:10px 0;';
        var head = document.createElement('div');
        head.style.cssText = 'padding:8px 16px;font-size:14px;font-weight:bold;color:#667eea;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center;';
        head.innerHTML = '🕘 最近' + cfg.label + '<span style="cursor:pointer;color:#999;" id="zlRecentClose">✕</span>';
        panel.appendChild(head);
        if (!list.length) {
            var empty = document.createElement('div');
            empty.style.cssText = 'padding:20px;text-align:center;color:#999;font-size:13px;';
            empty.textContent = '暂无记录';
            panel.appendChild(empty);
        } else {
            list.forEach(function (it) {
                var row = document.createElement('div');
                row.style.cssText = 'padding:10px 16px;font-size:13px;color:#333;cursor:pointer;border-bottom:1px solid #f3f3f3;word-break:break-all;';
                row.innerHTML = '<span style="color:#888;">' + it.time + '</span><br>' + it.t;
                row.onmouseenter = function () { this.style.background = '#f4f6ff'; };
                row.onmouseleave = function () { this.style.background = ''; };
                row.onclick = function () {
                    if (cfg.input) {
                        var inp = document.querySelector(cfg.input);
                        if (inp) {
                            inp.value = it.t;
                            inp.focus();
                            ZL.showToast('已回填，可重新生成');
                        }
                    } else {
                        try { navigator.clipboard.writeText(it.t).then(function () { ZL.showToast('已复制内容'); }).catch(function () {}); } catch (e) {}
                    }
                    panel.remove();
                };
                panel.appendChild(row);
            });
        }
        document.body.appendChild(panel);
        document.getElementById('zlRecentClose').onclick = function () { panel.remove(); };
    };

    /* 主题按钮左侧：最近记录浮钮（仅记录功能页显示） */
    var _page = (window.location.pathname.split('/').pop() || '').toLowerCase();
    if (ZL.RECENT_MAP[_page]) {
        (function () {
            var btn = document.createElement('div');
            btn.textContent = '🕘';
            btn.title = '最近记录';
            btn.setAttribute('aria-label', '最近记录');
            btn.style.cssText = 'position:fixed;bottom:20px;right:74px;z-index:2147483646;width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#43a047,#2e7d32);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:18px;box-shadow:0 4px 16px rgba(0,0,0,.35);user-select:none;-webkit-user-select:none;';
            btn.onclick = function () { ZL.openRecent(); };
            if (document.body) { document.body.appendChild(btn); }
            else { document.addEventListener('DOMContentLoaded', function () { document.body.appendChild(btn); }); }
        })();
    }

    /* ========== V1.9.2 对比度兜底：深底暗字/浅底亮字自动换主题色 ========== */
    function _zlLuma(rgb) { return (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255; }
    function _zlParse(c) {
        var m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (m) { return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10), m[4] === undefined ? 1 : parseFloat(m[4])]; }
        return null;
    }
    function _zlIsGray(rgb) { return (Math.max(rgb[0], rgb[1], rgb[2]) - Math.min(rgb[0], rgb[1], rgb[2])) < 24; }
    function _zlBgOf(el) {
        var n = el;
        while (n) {
            var bg = getComputedStyle(n).backgroundColor;
            var p = _zlParse(bg);
            if (p && p[3] > 0) { return _zlLuma(p); }
            if (n === document.body) break;
            n = n.parentElement;
        }
        var b2 = _zlParse(getComputedStyle(document.body).backgroundColor);
        if (b2 && b2[3] > 0) { return _zlLuma(b2); }
        return 0.1;
    }
    var _zlFixRan = false;
    ZL.contrastFix = function (force) {
        if (_zlFixRan && !force) return;
        _zlFixRan = true;
        try {
            var dim = 'var(--dim)', txt = 'var(--txt)', blue = 'var(--blue)';
            var els = document.querySelectorAll('body *');
            for (var i = 0; i < els.length; i++) {
                var el = els[i];
                var tag = el.tagName;
                if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'CANVAS' || tag === 'IMG' || tag === 'VIDEO' || tag === 'SVG' || tag === 'BR' || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') continue;
                if (el.children.length > 0) continue;
                if (!el.textContent || !el.textContent.trim()) continue;
                var cs = getComputedStyle(el);
                var c = _zlParse(cs.color);
                if (!c) continue;
                var bg = _zlBgOf(el);
                var cl = _zlLuma(c);
                var isHeading = /^(H1|H2|H3|H4|H5|H6)$/.test(tag) || /title|heading/i.test(el.className || '');
                var rep = '';
                if (_zlIsGray(c)) {
                    if (bg < 0.4 && cl < 0.45) { rep = isHeading ? txt : dim; }
                    else if (bg > 0.82 && cl > 0.82) { rep = isHeading ? txt : txt; }
                } else if (bg < 0.4 && cl < 0.35) { rep = blue; }
                if (rep) { el.style.color = rep; }
            }
        } catch (e) {}
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(ZL.contrastFix, 200); });
    } else {
        setTimeout(ZL.contrastFix, 200);
    }
    try {
        var _zlThemeObs = new MutationObserver(function (muts) {
            for (var i = 0; i < muts.length; i++) {
                if (muts[i].attributeName === 'data-theme') {
                    setTimeout(function () { ZL.contrastFix(true); }, 120);
                    return;
                }
            }
        });
        _zlThemeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    } catch (e2) {}

    /* 自动统计当前页使用（排除门禁/导航页） */
    var cur = (window.location.pathname.split('/').pop() || '').toLowerCase();
    var skipPages = ['1.html', '2.html', '3.html', '4.html', '28.html', '29.html', '30.html', '10.html'];
    if (cur && skipPages.indexOf(cur) < 0 && cur.indexOf('.html') > 0) {
        ZL.trackPage(cur);
    }
})();
