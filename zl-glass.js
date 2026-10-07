/* ============================================================
 * zl-glass.js —— 找乐子站“液态玻璃”交互层 V2.3.0 (GLASS-V2.3)
 * 全站生效（由 zl-features.js 尾部动态加载，无需改动各页面源码）
 *
 * 模块：
 *   1. 液态高亮块    —— 底部停靠栏激活项的玻璃胶囊，水滴滑移+弹性回弹
 *   2. 玻璃停靠栏    —— 屏幕底部居中浮动玻璃长条，悬停放大+相邻跟随
 *   5. 命令面板      —— Ctrl+K 唤起玻璃搜索框，背景压按模糊，实时过滤高亮
 * （鼠标光效 / 模块放大 / 水滴筛选在 M2、M3 里程碑注入）
 *
 * 规则：
 *   - 全部使用主题变量 var(--xx)，跟随 21 主题与明暗模式
 *   - 尊重 prefers-reduced-motion（系统减动画时退化为直接切换）
 *   - 门禁/授权页自动跳过，不注入任何 UI
 * ============================================================ */
(function () {
    'use strict';
    var ZL = window.ZL = window.ZL || {};

    /* ===================== 配置 ===================== */
    var CFG = {
        skipPages: ['1.html', '2.html', '3.html', '4.html', '28.html', '29.html', '30.html', '10.html', 'verify.html', 'offline.html'],
        pillKey: 'zl_glass_last',        // 记忆上一次激活项，供跨页水滴滑入
        dockIcons: [
            { f: 'index.html',  t: '首页',      ic: '🏠' },
            { f: '7.html',      t: '优质工具箱', ic: '🧰' },
            { f: '44.html',     t: '学习仪表盘', ic: '📚' },
            { f: '43.html',     t: '错题本',    ic: '✍️' },
            { f: '31.html',     t: '娱乐游戏',  ic: '🎮' },
            { f: '33.html',     t: '随机乐子',  ic: '🎲' },
            { f: '23.html',     t: '在线词典',  ic: '📖' },
            { f: '12.html',     t: '基础计算器', ic: '🧮' },
            { f: '35.html',     t: '番茄专注',  ic: '⏱️' },
            { f: '19.html',     t: '网页备忘录', ic: '📝' },
            { f: '38.html',     t: '成就中心',  ic: '🏅' },
            { f: '41.html',     t: '看看作业',  ic: '📷' }
        ]
    };

    /* ===================== 样式注入（全用主题变量，不动 common.css，主题断言零风险） ===================== */
    var CSS =
        '/* ---------- V2.3.0 液态玻璃层 ---------- */' +
        '.zl-dock{position:fixed;left:50%;bottom:calc(14px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:2147483001;display:flex;align-items:flex-end;gap:4px;padding:8px 10px 10px;border-radius:26px;' +
        'background:color-mix(in srgb,var(--card,#fff) 62%,transparent);-webkit-backdrop-filter:blur(22px) saturate(1.5);backdrop-filter:blur(22px) saturate(1.5);' +
        'border:1px solid color-mix(in srgb,var(--line,#eee) 45%,transparent);box-shadow:0 12px 40px rgba(0,0,0,.32);max-width:min(640px,calc(100vw - 20px));overflow-x:auto;overflow-y:visible;scrollbar-width:none;}' +
        '.zl-dock::-webkit-scrollbar{display:none}' +
        '.zl-dock-item{position:relative;flex:0 0 auto;width:52px;height:52px;border-radius:16px;display:flex;align-items:center;justify-content:center;text-decoration:none;font-size:24px;line-height:1;' +
        'transition:transform .2s cubic-bezier(.3,1.4,.5,1),background .2s;will-change:transform;-webkit-tap-highlight-color:transparent;}' +
        '.zl-dock-item:active{transform:scale(.92)}' +
        '@media (hover:hover) and (pointer:fine){' +
        '.zl-dock-item:hover{transform:scale(1.42);background:color-mix(in srgb,var(--card-2,#fff) 55%,transparent);z-index:2}' +
        '.zl-dock-item:hover~.zl-dock-item,.zl-dock-item:has(+ .zl-dock-item:hover){transform:scale(1.16)}' +
        '}' +
        '.zl-dock-item.on{transform:translateY(-3px)}' +
        '.zl-pill{position:absolute;bottom:6px;left:0;width:52px;height:11px;border-radius:6px;pointer-events:none;will-change:transform;' +
        'background:color-mix(in srgb,var(--glow,#667eea) 58%,transparent);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);' +
        'box-shadow:0 0 16px color-mix(in srgb,var(--glow,#667eea) 70%,transparent);border:1px solid color-mix(in srgb,var(--glow,#667eea) 45%,transparent);' +
        'transition:transform .58s cubic-bezier(.2,1.3,.36,1);}' +
        '.zl-dock-open{flex:0 0 auto;width:46px;height:46px;border-radius:14px;border:1px solid color-mix(in srgb,var(--line,#eee) 50%,transparent);background:color-mix(in srgb,var(--card-2,#fff) 40%,transparent);' +
        '-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);color:var(--txt,#333);font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;margin-left:6px;transition:transform .2s;}' +
        '.zl-dock-open:active{transform:scale(.9)}' +
        '@media (hover:hover) and (pointer:fine){.zl-dock-open:hover{transform:scale(1.15)}}' +
        '.zl-mask{position:fixed;inset:0;z-index:2147483646;background:rgba(6,8,24,.45);-webkit-backdrop-filter:blur(6px) saturate(1.2);backdrop-filter:blur(6px) saturate(1.2);display:flex;align-items:flex-start;justify-content:center;padding-top:13vh;opacity:0;visibility:hidden;transition:opacity .24s,visibility .24s;}' +
        '.zl-mask.show{opacity:1;visibility:visible}' +
        '.zl-palette{width:min(580px,92vw);border-radius:20px;overflow:hidden;background:color-mix(in srgb,var(--card,#fff) 78%,transparent);-webkit-backdrop-filter:blur(26px) saturate(1.6);backdrop-filter:blur(26px) saturate(1.6);' +
        'border:1px solid color-mix(in srgb,var(--line,#eee) 55%,transparent);box-shadow:0 28px 90px rgba(0,0,0,.45);transform:translateY(-14px) scale(.98);transition:transform .26s cubic-bezier(.2,1.25,.4,1);}' +
        '.zl-mask.show .zl-palette{transform:translateY(0) scale(1)}' +
        '.zl-palette-head{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid color-mix(in srgb,var(--line,#eee) 55%,transparent);}' +
        '.zl-palette-head span{font-size:18px;opacity:.9}' +
        '.zl-palette-input{flex:1;border:none;outline:none;background:transparent;font-size:16px;color:var(--txt,#333);}' +
        '.zl-palette-input::placeholder{color:var(--dim,#8b93a7)}' +
        '.zl-palette-hint{font-size:11px;color:var(--dim,#8b93a7);white-space:nowrap}' +
        '.zl-palette-list{max-height:46vh;overflow-y:auto;padding:6px;}' +
        '.zl-palette-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;text-decoration:none;color:var(--txt,#333);cursor:pointer;}' +
        '.zl-palette-item.active{background:color-mix(in srgb,var(--glow,#667eea) 20%,transparent);}' +
        '.zl-palette-item .pi-t{flex:1;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
        '.zl-palette-item .pi-k{font-size:11px;color:var(--dim,#8b93a7);max-width:38%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
        '.zl-palette-item mark{background:color-mix(in srgb,var(--gold,#ffd700) 55%,transparent);color:var(--txt,#333);border-radius:3px;padding:0 2px}' +
        '.zl-palette-empty{padding:22px;text-align:center;color:var(--dim,#8b93a7);font-size:13px}' +
        /* ---------- M2 鼠标跟随光（柔光 + 边框局部提亮 + 3D 倾斜） ---------- */
        '.zl-glow{position:relative}' +
        '.zl-glow::before,.zl-glow::after{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;z-index:0}' +
        '.zl-glow::after{background:radial-gradient(240px circle at var(--gx,50%) var(--gy,50%),color-mix(in srgb,var(--glow,#667eea) 24%,transparent),transparent 65%);opacity:0;transition:opacity .35s ease}' +
        '.zl-glow::before{padding:1px;background:radial-gradient(210px circle at var(--gx,50%) var(--gy,50%),color-mix(in srgb,var(--glow,#667eea) 92%,transparent),transparent 68%);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);mask-composite:exclude;opacity:0;transition:opacity .35s ease}' +
        '.zl-glow:hover::after,.zl-glow.zl-touch-on::after{opacity:1}' +
        '.zl-glow:hover::before,.zl-glow.zl-touch-on::before{opacity:1}' +
        '.zl-tilt{transform-style:preserve-3d;transition:transform .35s cubic-bezier(.22,1,.36,1);will-change:transform}' +
        '@media (hover:hover) and (pointer:fine){.zl-tilt:hover{transform:perspective(900px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg)) translateZ(0)}}' +
        '@media (hover:none),(pointer:coarse){.zl-tilt{transition:transform .18s ease-out}.zl-tilt.zl-touch-on{transform:perspective(900px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg)) translateZ(0)}}' +
        '@media (prefers-reduced-motion:reduce){.zl-tilt,.zl-glow::before,.zl-glow::after{transition:none !important}}' +
        '@media (hover:none),(pointer:coarse){.zl-dock{gap:2px;padding:6px 6px 8px;border-radius:22px;max-width:calc(100vw - 12px)}.zl-dock-item{width:48px;height:48px;font-size:22px}.zl-pill{width:48px;bottom:5px}}' +
        '@media (prefers-reduced-motion:reduce){.zl-pill,.zl-dock-item,.zl-mask,.zl-palette{transition:none !important}}' +
        /* ---------- M3 模块就地放大（44 仪表盘） ---------- */
        '.zl-zoom-btn{position:absolute;top:10px;right:10px;z-index:5;width:34px;height:34px;border-radius:11px;display:flex;align-items:center;justify-content:center;font-size:15px;line-height:1;cursor:pointer;color:var(--txt,#333);' +
        'border:1px solid color-mix(in srgb,var(--line,#eee) 55%,transparent);background:color-mix(in srgb,var(--card-2,#fff) 52%,transparent);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);' +
        'box-shadow:0 4px 14px rgba(0,0,0,.16);opacity:0;transition:opacity .22s,transform .2s,visibility .22s}' +
        '@media (hover:hover) and (pointer:fine){.zl-zoom-btn{visibility:hidden}.sec:hover .zl-zoom-btn{opacity:1;visibility:visible}}' +
        '@media (hover:none),(pointer:coarse){.zl-zoom-btn{opacity:.85}}' +
        '.zl-zoom-btn:active{transform:scale(.88)}' +
        '.zl-zoom-open{position:fixed !important;left:14px !important;right:14px !important;top:58px !important;bottom:14px !important;width:auto !important;max-width:none !important;height:auto !important;max-height:none !important;margin:0 !important;z-index:2147483002;overflow:auto !important;' +
        'transition:transform .4s cubic-bezier(.22,1.2,.36,1),opacity .28s;will-change:transform,opacity;box-shadow:0 26px 80px rgba(0,0,0,.5)}' +
        '.zl-zoom-away{opacity:0;visibility:hidden;pointer-events:none;transition:opacity .3s,visibility .3s}' +
        '.zl-dock-hide{opacity:0;transform:translateX(-50%) translateY(18px);pointer-events:none;transition:transform .24s,opacity .24s}' +
        '.zl-zoom-bar{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:2147483003;display:flex;align-items:center;gap:6px;padding:7px 9px;border-radius:20px;max-width:calc(100vw - 16px);overflow-x:auto;scrollbar-width:none;' +
        'background:color-mix(in srgb,var(--card,#fff) 68%,transparent);-webkit-backdrop-filter:blur(20px) saturate(1.5);backdrop-filter:blur(20px) saturate(1.5);' +
        'border:1px solid color-mix(in srgb,var(--line,#eee) 45%,transparent);box-shadow:0 12px 36px rgba(0,0,0,.3);opacity:0;visibility:hidden;transition:opacity .24s,visibility .24s}' +
        '.zl-zoom-bar.show{opacity:1;visibility:visible}' +
        '.zl-zoom-bar::-webkit-scrollbar{display:none}' +
        '.zl-zoom-thumb{flex:0 0 auto;display:flex;align-items:center;gap:5px;padding:8px 12px;border-radius:13px;font-size:12px;color:var(--txt,#333);cursor:pointer;white-space:nowrap;' +
        'border:1px solid color-mix(in srgb,var(--line,#eee) 55%,transparent);background:color-mix(in srgb,var(--card-2,#fff) 45%,transparent);transition:transform .18s,background .2s}' +
        '.zl-zoom-thumb.on{background:color-mix(in srgb,var(--glow,#667eea) 26%,transparent);border-color:color-mix(in srgb,var(--glow,#667eea) 65%,transparent)}' +
        '.zl-zoom-thumb:active{transform:scale(.92)}' +
        '.zl-zoom-close{flex:0 0 auto;width:34px;height:34px;border-radius:11px;border:1px solid color-mix(in srgb,var(--line,#eee) 55%,transparent);background:color-mix(in srgb,var(--card-2,#fff) 50%,transparent);' +
        'color:var(--txt,#333);font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center}' +
        '@media (prefers-reduced-motion:reduce){.zl-zoom-open,.zl-zoom-btn,.zl-zoom-thumb,.zl-zoom-bar{transition:none !important}}' +
        /* ---------- M3 水滴分裂筛选 + 汇总指标（44 仪表盘） ---------- */
        '.zl-drops{position:relative;width:max-content;margin:0 auto 14px;z-index:7}' +
        '.zl-drop-btn{display:flex;align-items:center;gap:7px;padding:9px 18px;border-radius:999px;font-size:14px;color:var(--txt,#333);cursor:pointer;' +
        'border:1px solid color-mix(in srgb,var(--glow,#667eea) 55%,transparent);background:color-mix(in srgb,var(--card,#fff) 70%,transparent);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);' +
        'box-shadow:0 6px 20px color-mix(in srgb,var(--glow,#667eea) 25%,transparent);transition:transform .2s}' +
        '.zl-drop-btn:active{transform:scale(.93)}' +
        '.zl-drop-a{font-size:10px;opacity:.7;transition:transform .28s}' +
        '.zl-drops.open .zl-drop-a{transform:rotate(180deg)}' +
        '.zl-drop-opts{position:absolute;top:0;left:calc(100% + 8px);display:flex;gap:7px;transform-origin:left center;opacity:0;transform:translateX(-12px) scale(.85);pointer-events:none;transition:opacity .2s,transform .28s}' +
        '.zl-drops.open .zl-drop-opts{opacity:1;transform:translateX(0) scale(1);pointer-events:auto}' +
        '.zl-drop-opt{white-space:nowrap;padding:9px 16px;border-radius:999px;font-size:13.5px;color:var(--txt,#333);cursor:pointer;opacity:0;transform:scale(.4);filter:blur(8px);' +
        'border:1px solid color-mix(in srgb,var(--line,#eee) 55%,transparent);background:color-mix(in srgb,var(--card-2,#fff) 74%,transparent);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);' +
        'transition:opacity .18s,transform .5s cubic-bezier(.3,1.5,.5,1),filter .42s}' +
        '.zl-drops.open .zl-drop-opt{opacity:1;transform:scale(1);filter:blur(0);transition-delay:calc(var(--i,0)*38ms)}' +
        '.zl-drop-opt.on{background:color-mix(in srgb,var(--glow,#667eea) 32%,transparent);border-color:color-mix(in srgb,var(--glow,#667eea) 72%,transparent)}' +
        '@media (prefers-reduced-motion:reduce){.zl-drop-opt,.zl-drop-opts{transition:none !important}}' +
        '.zl-sum{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin:2px auto 18px;max-width:min(680px,calc(100vw - 24px))}' +
        '.zl-sum-cell{flex:1 1 120px;min-width:108px;max-width:200px;padding:12px 10px 10px;border-radius:16px;text-align:center;' +
        'border:1px solid color-mix(in srgb,var(--line,#eee) 50%,transparent);background:color-mix(in srgb,var(--card,#fff) 64%,transparent);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px)}' +
        '.zl-sum-num{font-size:23px;font-weight:700;font-variant-numeric:tabular-nums;line-height:1.25;color:var(--txt,#333)}' +
        '.zl-sum-lbl{font-size:11px;color:var(--dim,#8b93a7);margin-top:3px}' +
        '@media (prefers-reduced-motion:reduce){.zl-sum-num{transition:none !important}}';

    function injectStyle() {
        try {
            var st = document.createElement('style');
            st.id = 'zlGlassStyle';
            st.textContent = CSS;
            document.head.appendChild(st);
        } catch (e) {}
    }

    /* ===================== 工具 ===================== */
    function curPage() {
        return (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
    }
    function isSkipPage() {
        var c = curPage();
        for (var i = 0; i < CFG.skipPages.length; i++) if (c === CFG.skipPages[i]) return true;
        return false;
    }
    function ls(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
    function ss(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
    function reduced() {
        try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
    }

    /* ===================== 1+2. 底部玻璃停靠栏 + 液态高亮胶囊 ===================== */
    function initDock() {
        var cur = curPage();
        var dock = document.createElement('nav');
        dock.className = 'zl-dock';
        dock.setAttribute('aria-label', '站点导航停靠栏');
        var itemsHtml = '';
        for (var i = 0; i < CFG.dockIcons.length; i++) {
            var it = CFG.dockIcons[i];
            var on = it.f === cur ? ' on' : '';
            itemsHtml += '<a class="zl-dock-item' + on + '" data-f="' + it.f + '" href="' + it.f + '" title="' + it.t + '" aria-label="' + it.t + '">' + it.ic + '</a>';
        }
        dock.innerHTML = itemsHtml + '<div class="zl-pill"></div>';
        var openBtn = document.createElement('button');
        openBtn.type = 'button';
        openBtn.className = 'zl-dock-open';
        openBtn.setAttribute('aria-label', '打开命令面板');
        openBtn.title = '命令面板 (Ctrl+K)';
        openBtn.textContent = '🔍';
        openBtn.addEventListener('click', function () { openPalette(); });
        dock.appendChild(openBtn);
        document.body.appendChild(dock);

        // 与既有悬浮“回首页”按钮协调：Dock 已含首页项，移除旧按钮
        var home = document.getElementById('zlHomeBtn');
        if (home && home.parentNode) home.parentNode.removeChild(home);

        var items = dock.querySelectorAll('.zl-dock-item');
        var pill = dock.querySelector('.zl-pill');

        /* 液态胶囊定位：只在 transform 上动，64fps 友好 */
        function placePill(idx, animate) {
            var el = items[idx];
            if (!el || !pill) return;
            var t = animate ? '' : 'none';
            pill.style.transition = reduced() ? 'none' : t;
            pill.style.transform = 'translateX(' + (el.offsetLeft + (el.offsetWidth - pill.offsetWidth) / 2) + 'px)';
        }

        // 跨页水滴滑入：从记忆中的上一项位置滑向当前项（弹回）
        var last = ls(CFG.pillKey);
        var curIdx = -1;
        for (var j = 0; j < items.length; j++) if (items[j].className.indexOf('on') >= 0) curIdx = j;
        ss(CFG.pillKey, cur > -1 ? cur : 'index.html');

        if (curIdx >= 0) {
            var lastIdx = -1;
            for (var k = 0; k < CFG.dockIcons.length; k++) if (CFG.dockIcons[k].f === last) lastIdx = k;
            if (lastIdx >= 0 && lastIdx !== curIdx) {
                // 先瞬移到旧位置，下一帧再水滴滴到新位置
                placePill(lastIdx, false);
                requestAnimationFrame(function () {
                    requestAnimationFrame(function () { placePill(curIdx, true); });
                });
            } else {
                placePill(curIdx, false);
            }
        }
    }

    /* ===================== 5. Ctrl+K 命令面板（玻璃搜索） ===================== */
    var paletteEl = null, paletteInput = null, paletteList = null, palIdx = -1, palItems = [];
    function openPalette() {
        if (!paletteEl) buildPalette();
        paletteEl.classList.add('show');
        setTimeout(function () { if (paletteInput) paletteInput.focus(); }, 60);
        renderPalette('');
    }
    function closePalette() {
        if (paletteEl) paletteEl.classList.remove('show');
        if (paletteInput) paletteInput.value = '';
    }
    function buildPalette() {
        paletteEl = document.createElement('div');
        paletteEl.className = 'zl-mask';
        paletteEl.innerHTML =
            '<div class="zl-palette" role="dialog" aria-modal="true" aria-label="命令面板">' +
            '<div class="zl-palette-head"><span>🔍</span><input class="zl-palette-input" placeholder="搜索页面/功能：五子棋、计算器、词典、学习…" autocomplete="off" spellcheck="false"><span class="zl-palette-hint">↑↓ 选择 · Enter 跳转 · Esc 关闭</span></div>' +
            '<div class="zl-palette-list"></div></div>';
        document.body.appendChild(paletteEl);
        paletteInput = paletteEl.querySelector('.zl-palette-input');
        paletteList = paletteEl.querySelector('.zl-palette-list');

        paletteEl.addEventListener('click', function (e) { if (e.target === paletteEl) closePalette(); });
        paletteInput.addEventListener('input', function () {
            if (window.ZL && ZL.bump) ZL.bump('search_use', 1); // 与站内搜索一致，触发寻宝成就
            renderPalette(paletteInput.value);
        });
        paletteInput.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowDown') { e.preventDefault(); moveSel(1); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); moveSel(-1); }
            else if (e.key === 'Enter') { e.preventDefault(); jumpSel(); }
            else if (e.key === 'Escape') { e.preventDefault(); closePalette(); }
        });
    }
    function renderPalette(q) {
        if (!paletteList) return;
        q = (q || '').trim();
        var list = window.ZL && ZL.search ? ZL.search(q) : [];
        palItems = list.slice(0, 12);
        palIdx = -1;
        if (!q) {
            paletteList.innerHTML = '<div class="zl-palette-empty">输入关键词，搜索全站 48 个功能</div>';
            return;
        }
        if (!palItems.length) {
            paletteList.innerHTML = '<div class="zl-palette-empty">未找到相关功能，换个词试试</div>';
            return;
        }
        var frag = document.createDocumentFragment();
        var ql = q.toLowerCase();
        for (var i = 0; i < palItems.length; i++) {
            var p = palItems[i];
            var t = p.t, k = p.k || '';
            var hl = t;
            var lo = t.toLowerCase();
            var idx = lo.indexOf(ql);
            if (idx >= 0) hl = t.slice(0, idx) + '<mark>' + t.slice(idx, idx + ql.length) + '</mark>' + t.slice(idx + ql.length);
            var a = document.createElement('a');
            a.className = 'zl-palette-item';
            a.href = p.f;
            a.setAttribute('data-i', String(i));
            a.innerHTML = '<span class="pi-t">' + hl + '</span><span class="pi-k">' + (k || '') + '</span>';
            a.addEventListener('mouseenter', function () { selTo(Number(this.getAttribute('data-i'))); });
            a.addEventListener('click', function (e) { e.preventDefault(); goTo(palItems[Number(this.getAttribute('data-i'))].f); });
            frag.appendChild(a);
        }
        paletteList.innerHTML = '';
        paletteList.appendChild(frag);
        selTo(0);
    }
    function moveSel(d) {
        if (!palItems.length) return;
        var n = palItems.length;
        palIdx = (palIdx + d + n) % n;
        paintSel();
    }
    function selTo(i) { palIdx = i; paintSel(); }
    function paintSel() {
        var els = paletteList.querySelectorAll('.zl-palette-item');
        for (var i = 0; i < els.length; i++) {
            els[i].classList.toggle('active', i === palIdx);
            if (i === palIdx) { try { els[i].scrollIntoView({ block: 'nearest' }); } catch (e) {} }
        }
    }
    function jumpSel() {
        if (palItems.length) goTo(palItems[Math.max(0, palIdx)].f);
    }
    function goTo(f) {
        closePalette();
        setTimeout(function () { window.location.href = f; }, 60);
    }
    function initPalette() {
        document.addEventListener('keydown', function (e) {
            if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === 'k' || e.key === 'K')) {
                e.preventDefault();
                e.stopPropagation();
                if (paletteEl && paletteEl.classList.contains('show')) closePalette();
                else openPalette();
            }
        });
    }

    /* ===================== M2. 鼠标跟随光（柔光 + 边框提亮 + 3D 倾斜，触控等效） ===================== */
    var GLOW_SEL = '.tool-box,.card,.box,.today-card,.goal,.chart,.sec,[data-zl-glass]';
    var glowRaf = null, glowEl = null;
    function glowReset(el) {
        if (!el) return;
        el.style.removeProperty('--rx');
        el.style.removeProperty('--ry');
    }
    function glowApply(x, y) {
        var el = document.elementFromPoint(x, y);
        el = el && el.closest ? el.closest(GLOW_SEL) : null;
        if (!el || !el.classList) { glowReset(glowEl); glowEl = null; return; }
        if (!el.classList.contains('zl-glow')) el.classList.add('zl-glow');
        if (!el.classList.contains('zl-tilt')) el.classList.add('zl-tilt');
        var r = el.getBoundingClientRect();
        if (!r.width || !r.height) return;
        var gx = x - r.left, gy = y - r.top;
        var rx = ((gy / r.height) - 0.5) * -8;   // ±4°
        var ry = ((gx / r.width) - 0.5) * 8;
        el.style.setProperty('--gx', gx.toFixed(1) + 'px');
        el.style.setProperty('--gy', gy.toFixed(1) + 'px');
        el.style.setProperty('--rx', rx.toFixed(2) + 'deg');
        el.style.setProperty('--ry', ry.toFixed(2) + 'deg');
        glowEl = el;
    }
    function initGlow() {
        var reducedMotion = reduced();
        document.addEventListener('mousemove', function (e) {
            if (reducedMotion) return;
            if (glowRaf) return;
            glowRaf = requestAnimationFrame(function () { glowRaf = null; glowApply(e.clientX, e.clientY); });
        }, { passive: true });
        document.addEventListener('mouseout', function (e) {
            if (!glowEl) return;
            var to = e.relatedTarget;
            if (!to || (to !== glowEl && !glowEl.contains(to))) glowReset(glowEl);
        });
        // 触控等效：按下/滑动位置即光效位置，短暂停留后消退
        document.addEventListener('touchstart', function (e) {
            var t = e.touches[0]; if (!t) return;
            glowApply(t.clientX, t.clientY);
            var el = glowEl;
            if (el && el.classList) {
                el.classList.add('zl-touch-on');
                clearTimeout(el.__zt);
                el.__zt = setTimeout(function () { el.classList.remove('zl-touch-on'); }, 900);
            }
        }, { passive: true });
        document.addEventListener('touchmove', function (e) {
            var t = e.touches[0]; if (!t) return;
            glowApply(t.clientX, t.clientY);
        }, { passive: true });
        document.addEventListener('touchend', function () {
            glowReset(glowEl);
        }, { passive: true });
    }

    /* ===================== M3a. 模块就地放大（仅 44 仪表盘） ===================== */
    function initFocus() {
        if (curPage() !== '44.html') return;
        var secs = document.querySelectorAll('.sec');
        if (secs.length < 2) return;
        var titles = [], i;
        for (i = 0; i < secs.length; i++) {
            var t = secs[i].querySelector('.sec-title');
            titles.push(t ? t.textContent.replace(/^\s+|\s+$/g, '') : ('模块 ' + (i + 1)));
            if (getComputedStyle(secs[i]).position === 'static') secs[i].style.position = 'relative';
        }
        var bar = null, zoomed = null, thumbs = [], bodyOver = null;
        function buildBar() {
            bar = document.createElement('div');
            bar.className = 'zl-zoom-bar';
            for (var b = 0; b < secs.length; b++) (function (idx) {
                var th = document.createElement('button');
                th.type = 'button';
                th.className = 'zl-zoom-thumb';
                th.textContent = titles[idx];
                th.addEventListener('click', function () { focusSec(secs[idx]); });
                thumbs.push(th);
                bar.appendChild(th);
            })(b);
            var x = document.createElement('button');
            x.type = 'button';
            x.className = 'zl-zoom-close';
            x.setAttribute('aria-label', '收回模块');
            x.textContent = '✕';
            x.addEventListener('click', closeZoom);
            bar.appendChild(x);
            document.body.appendChild(bar);
        }
        function hideOthers(keep) {
            for (var h = 0; h < secs.length; h++) {
                if (secs[h] !== keep) secs[h].classList.add('zl-zoom-away');
            }
        }
        function flipOpen(sec) {
            if (reduced()) { sec.classList.add('zl-zoom-open'); return; }
            var first = sec.getBoundingClientRect();
            sec.classList.add('zl-zoom-open');
            var last = sec.getBoundingClientRect();
            var dx = first.left - last.left, dy = first.top - last.top;
            var sx = last.width ? (first.width / last.width) : 1;
            var sy = last.height ? (first.height / last.height) : 1;
            sec.style.transformOrigin = '0 0';
            sec.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + sx + ',' + sy + ')';
            sec.style.opacity = '0.35';
            requestAnimationFrame(function () {
                requestAnimationFrame(function () {
                    sec.style.transform = '';
                    sec.style.opacity = '';
                    setTimeout(function () { sec.style.transformOrigin = ''; }, 460);
                });
            });
        }
        function flipClose(sec, autoAway) {
            if (!sec) return;
            if (reduced()) { sec.classList.remove('zl-zoom-open'); return; }
            var first = sec.getBoundingClientRect();
            sec.classList.remove('zl-zoom-open');
            var last = sec.getBoundingClientRect();
            var dx = first.left - last.left, dy = first.top - last.top;
            var sx = last.width ? (first.width / last.width) : 1;
            var sy = last.height ? (first.height / last.height) : 1;
            sec.style.transition = 'none';
            sec.style.transformOrigin = '0 0';
            sec.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + sx + ',' + sy + ')';
            void sec.offsetHeight;
            sec.style.transition = 'transform .38s cubic-bezier(.22,1.2,.36,1),opacity .3s';
            sec.style.transform = '';
            sec.style.opacity = '0';
            setTimeout(function () {
                sec.style.transition = ''; sec.style.transformOrigin = ''; sec.style.transform = ''; sec.style.opacity = '';
                if (autoAway) sec.classList.add('zl-zoom-away');
            }, 420);
        }
        function updateThumbs() {
            for (var u = 0; u < thumbs.length; u++) thumbs[u].classList.toggle('on', secs[u] === zoomed);
        }
        function focusSec(sec) {
            if (zoomed === sec) { closeZoom(); return; }
            if (!bar) buildBar();
            var prev = zoomed;
            zoomed = sec;
            if (prev) prev.classList.remove('zl-zoom-away');
            if (prev) flipClose(prev, true);
            flipOpen(sec);
            hideOthers(sec);
            updateThumbs();
            bar.classList.add('show');
            var dk = document.querySelector('.zl-dock');
            if (dk) dk.classList.add('zl-dock-hide'); // 放大态收起底部 Dock，避免与缩略条重叠
        }
        function closeZoom() {
            if (!zoomed) return;
            var cur = zoomed;
            zoomed = null;
            updateThumbs();
            for (var c = 0; c < secs.length; c++) secs[c].classList.remove('zl-zoom-away');
            flipClose(cur, false);
            if (bar) bar.classList.remove('show');
            var dk = document.querySelector('.zl-dock');
            if (dk) dk.classList.remove('zl-dock-hide');
        }
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && zoomed) closeZoom();
        });
        for (i = 0; i < secs.length; i++) (function (sec) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'zl-zoom-btn';
            b.setAttribute('aria-label', '放大此模块');
            b.textContent = '⛶';
            b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); focusSec(sec); });
            sec.appendChild(b);
        })(secs[i]);
        /* 放大态锁定背景滚动，收起恢复 */
        var obs = new MutationObserver(function () {
            if (document.querySelector('.zl-zoom-open')) {
                if (bodyOver === null) { bodyOver = document.body.style.overflow; document.body.style.overflow = 'hidden'; }
            } else if (bodyOver !== null) {
                document.body.style.overflow = bodyOver; bodyOver = null;
            }
        });
        try { obs.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] }); } catch (e) {}
    }

    /* ===================== M3b. 水滴分裂筛选 + 指标滚动（仅 44 仪表盘） ===================== */
    function initFilter() {
        if (curPage() !== '44.html') return;
        var container = document.querySelector('.container');
        if (!container) return;
        var topGrid = container.querySelector('.top-grid');
        if (!topGrid || document.querySelector('.zl-dash-ext')) return;
        var DIMS = [
            { k: 'today', t: '📅 今天' },
            { k: 'week',  t: '🗓️ 本周' },
            { k: 'month', t: '📆 本月' },
            { k: 'year',  t: '🌏 全年' }
        ];
        var wrap = document.createElement('div');
        wrap.className = 'zl-dash-ext';
        /* ---- 水滴筛选胶囊 ---- */
        var drops = document.createElement('div');
        drops.className = 'zl-drops';
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'zl-drop-btn';
        btn.setAttribute('aria-label', '切换统计维度');
        btn.innerHTML = '<span class="zl-drop-t"></span><span class="zl-drop-a">▾</span>';
        btn.querySelector('.zl-drop-t').textContent = DIMS[0].t;
        var cur = 'today', open = false;
        var optsBox = document.createElement('div');
        optsBox.className = 'zl-drop-opts';
        for (var i = 0; i < DIMS.length; i++) (function (dim, idx) {
            var o = document.createElement('button');
            o.type = 'button';
            o.className = 'zl-drop-opt' + (dim.k === cur ? ' on' : '');
            o.textContent = dim.t;
            o.style.setProperty('--i', idx);
            o.addEventListener('click', function (e) {
                e.stopPropagation();
                if (dim.k === cur) { setOpen(false); return; }
                cur = dim.k;
                for (var j = 0; j < optsBox.children.length; j++) optsBox.children[j].classList.toggle('on', DIMS[j].k === cur);
                btn.querySelector('.zl-drop-t').textContent = dim.t;
                setOpen(false);
                renderSum();
            });
            optsBox.appendChild(o);
        })(DIMS[i], i);
        function setOpen(v) {
            open = v;
            drops.classList.toggle('open', v);
            btn.setAttribute('aria-expanded', v ? 'true' : 'false');
        }
        btn.addEventListener('click', function (e) { e.stopPropagation(); setOpen(!open); });
        drops.appendChild(btn);
        drops.appendChild(optsBox);
        wrap.appendChild(drops);
        document.addEventListener('click', function (e) {
            if (open && !drops.contains(e.target)) setOpen(false);
        });
        /* ---- 汇总指标条 ---- */
        var sum = document.createElement('div');
        sum.className = 'zl-sum';
        var numEls = {};
        var CELLS = [
            { key: 'cnt', ic: '📆', lbl: '打卡次数' },
            { key: 'min', ic: '⏱️', lbl: '学习分钟' },
            { key: 'pct', ic: '🎯', lbl: '目标达成' }
        ];
        for (var c = 0; c < CELLS.length; c++) (function (cell) {
            var el = document.createElement('div');
            el.className = 'zl-sum-cell';
            var n = document.createElement('div');
            n.className = 'zl-sum-num';
            n.dataset.v = '0';
            n.textContent = '0';
            numEls[cell.key] = n;
            var l = document.createElement('div');
            l.className = 'zl-sum-lbl';
            l.textContent = cell.ic + ' ' + cell.lbl;
            el.appendChild(n); el.appendChild(l);
            sum.appendChild(el);
        })(CELLS[c]);
        wrap.appendChild(sum);
        topGrid.parentNode.insertBefore(wrap, topGrid.nextSibling);
        /* ---- 统计：自算 localStorage（44 闭包数据不可调用，口径与其一致） ---- */
        function dimRange(k) {
            var now = new Date();
            if (k === 'today') { var ts = new Date(now.getFullYear(), now.getMonth(), now.getDate()); return [ts.getTime(), ts.getTime() + 86400000]; }
            if (k === 'week') { var dow = (now.getDay() + 6) % 7; var ws = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow); return [ws.getTime(), ws.getTime() + 7 * 86400000]; }
            if (k === 'month') { return [new Date(now.getFullYear(), now.getMonth(), 1).getTime(), new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime()]; }
            return [new Date(now.getFullYear(), 0, 1).getTime(), new Date(now.getFullYear() + 1, 0, 1).getTime()];
        }
        function stats(k) {
            var r = dimRange(k), cnt = 0, min = 0, g = { week: 0, month: 0 };
            try {
                var st = JSON.parse(localStorage.getItem('zhaolezi_44_dashboard') || '{}');
                var logs = st && st.logs ? st.logs : [];
                g.week = +(st && st.goals && st.goals.week) || 0;
                g.month = +(st && st.goals && st.goals.month) || 0;
                for (var s2 = 0; s2 < logs.length; s2++) {
                    var t = new Date(logs[s2].d).getTime();
                    if (t >= r[0] && t < r[1]) { cnt++; min += (+logs[s2].m || 0); }
                }
            } catch (e) {}
            var gv = k === 'week' ? g.week : k === 'month' ? g.month : 0;
            return { cnt: cnt, min: min, pct: gv > 0 ? Math.min(100, Math.round(cnt / gv * 100)) : null };
        }
        function animateNum(el, to) {
            if (to == null) { el.textContent = '—'; el.dataset.v = '0'; return; }
            var from = +el.dataset.v || 0;
            if (from === to) { el.textContent = to; return; }
            var t0 = performance.now(), dur = 620;
            function frame(t) {
                var k = Math.min(1, (t - t0) / dur);
                el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3)));
                if (k < 1) requestAnimationFrame(frame);
            }
            requestAnimationFrame(frame);
            el.dataset.v = to;
        }
        function renderSum() {
            var s = stats(cur);
            animateNum(numEls.cnt, s.cnt);
            animateNum(numEls.min, s.min);
            animateNum(numEls.pct, s.pct);
        }
        renderSum();
        /* 数据联动：storage 事件 + 5s 轮询兜底（44 内部 save 不触发 storage） */
        var lastJson = '';
        try { lastJson = localStorage.getItem('zhaolezi_44_dashboard') || ''; } catch (e) {}
        window.addEventListener('storage', function () { renderSum(); });
        setInterval(function () {
            try {
                var j = localStorage.getItem('zhaolezi_44_dashboard') || '';
                if (j !== lastJson) { lastJson = j; renderSum(); }
            } catch (e) {}
        }, 5000);
    }

    /* ===================== 挂载器 ===================== */
    ZL.glass = {
        version: '2.3.0',
        init: function () {
            try {
                injectStyle();
                if (isSkipPage()) return; // 门禁/授权/离线页不注入 UI
                initDock();
                initPalette();
                initGlow();
                initFocus();
                initFilter();
            } catch (e) {}
        }
    };
})();
