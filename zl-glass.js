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
    /* V119 精简：停靠栏已移除，CFG 只保留 isSkipPage 消费的 skipPages */
    var CFG = {
        skipPages: ['1.html', '2.html', '3.html', '4.html', '28.html', '29.html', '30.html', '10.html', 'verify.html', 'offline.html']
    };

    /* ===================== 样式注入（全用主题变量，不动 common.css，主题断言零风险） ===================== */
    var CSS =
        '/* ---------- V2.3.0 液态玻璃层 ---------- */' +
        /* V119 精简：.zl-dock / .zl-dock-item / .zl-pill 已随 initDock() 一并删除 */
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
        /* V119 精简：hover:none dock 与 reduced-motion dock 规则已删 */
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
        '@media (prefers-reduced-motion:reduce){.zl-sum-num{transition:none !important}}' +
        /* V119 精简：zlBreathe 呼吸动画 + .zl-ctx 长按气泡 CSS 已随 initDock() 一并删除 */
        '.zl-chips{display:flex;flex-wrap:wrap;gap:8px}' +
        '.zl-chip{display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border-radius:999px;font-size:13px;cursor:pointer;color:var(--txt,#333);' +
        'border:1px solid color-mix(in srgb,var(--line,#eee) 55%,transparent);background:color-mix(in srgb,var(--card-2,#fff) 55%,transparent);' +
        'transition:transform .18s,background .2s;text-decoration:none}' +
        '.zl-chip:hover{background:color-mix(in srgb,var(--glow,#667eea) 18%,transparent)}' +
        '.zl-chip:active{transform:scale(.94)}' +
        '@media (prefers-reduced-motion:reduce){.zl-chip{transition:none !important}}' +
        /* ---------- V125 右上角刷新按键 + Toast ---------- */
        '.zl-refresh{position:fixed;top:14px;right:14px;z-index:2147483007;display:inline-flex;align-items:center;justify-content:center;' +
        'width:44px;height:44px;border-radius:14px;cursor:pointer;-webkit-tap-highlight-color:transparent;' +
        'background:color-mix(in srgb,var(--card,#fff) 62%,transparent);border:1px solid color-mix(in srgb,var(--line,#eee) 45%,transparent);' +
        'box-shadow:0 6px 20px rgba(0,0,0,.18);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);' +
        'transition:transform .2s cubic-bezier(.3,1.4,.5,1),background .2s}' +
        '.zl-refresh .zrf-ic{font-size:20px;line-height:1}' +
        '.zl-refresh.zrf-loading{pointer-events:none}' +
        '.zl-refresh.zrf-loading .zrf-ic{display:inline-block;animation:zrfSpin .8s linear infinite}' +
        '@keyframes zrfSpin{to{transform:rotate(360deg)}}' +
        '@media (hover:hover) and (pointer:fine){.zl-refresh:hover{transform:scale(1.12);background:color-mix(in srgb,var(--card-2,#fff) 70%,transparent)}}' +
        '.zl-refresh:active{transform:scale(.92)}' +
        '.zl-rf-toast{position:fixed;top:68px;right:14px;z-index:2147483008;padding:8px 14px;border-radius:12px;font-size:12px;line-height:1.4;' +
        'color:var(--txt,#333);background:color-mix(in srgb,var(--card,#fff) 78%,transparent);' +
        'border:1px solid color-mix(in srgb,var(--line,#eee) 50%,transparent);box-shadow:0 8px 24px rgba(0,0,0,.2);' +
        '-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);' +
        'opacity:0;transform:translateY(-8px);transition:opacity .28s,transform .28s;pointer-events:none;max-width:220px}' +
        '.zl-rf-toast.zrf-show{opacity:1;transform:translateY(0)}' +
        '@media (prefers-reduced-motion:reduce){.zl-refresh,.zl-refresh .zrf-ic,.zl-rf-toast{transition:none !important;animation:none !important}}';

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
    /* V119 精简：ls / ss 辅助函数已随 initDock/recordRecent 一并删除 */
    function reduced() {
        try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
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
            // V119：Dock 已删除，放大态不再需要收起停靠栏
        }
        function closeZoom() {
            if (!zoomed) return;
            var cur = zoomed;
            zoomed = null;
            updateThumbs();
            for (var c = 0; c < secs.length; c++) secs[c].classList.remove('zl-zoom-away');
            flipClose(cur, false);
            if (bar) bar.classList.remove('show');
        }
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && zoomed) closeZoom();
            else if (zoomed && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
                e.preventDefault();
                var idx = -1;
                for (var z = 0; z < secs.length; z++) if (secs[z] === zoomed) idx = z;
                if (idx < 0) return;
                var nxt = e.key === 'ArrowRight' ? (idx + 1) % secs.length : (idx - 1 + secs.length) % secs.length;
                focusSec(secs[nxt]);
                if (thumbs[nxt]) { try { thumbs[nxt].scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch {} }
            }
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
        /* 即时刷新：打卡后 44 会重渲染 #todayTotal/#tcMin 等输出节点，观察其文本变化即触发汇总（不必等 5s 轮询） */
        var liveEls = ['todayTotal', 'tcMin', 'tcHw', 'tcKp'];
        var obsEls = [];
        for (var L = 0; L < liveEls.length; L++) {
            var le = document.getElementById(liveEls[L]);
            if (le) obsEls.push(le);
        }
        var liveTimer = null;
        var mo2 = new MutationObserver(function () {
            if (liveTimer) return;
            liveTimer = setTimeout(function () { liveTimer = null; renderSum(); }, 120);
        });
        for (var m = 0; m < obsEls.length; m++) { try { mo2.observe(obsEls[m], { childList: true, characterData: true, subtree: true }); } catch (e) {} }
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

    /* ===================== V125 右上角刷新按键 ===================== */
    /* 节流：30 分钟一次（对应 CDN max-age=600 + 留余量） */
    var RF_KEY = 'zl_rf_ts';
    var RF_INTERVAL = 30 * 60 * 1000;
    /* 抽样比对的关键资源（覆盖 JS 链 + 全站样式） */
    var RF_ASSETS = ['common.css', 'common.js', 'theme.js', 'zl-features.js', 'zl-glass.js'];

    function rfToast(msg, ms) {
        var t = document.getElementById('zlRfToast');
        if (!t) {
            t = document.createElement('div');
            t.id = 'zlRfToast';
            t.className = 'zl-rf-toast';
            document.body.appendChild(t);
        }
        t.textContent = msg;
        t.classList.add('zrf-show');
        clearTimeout(t._t);
        t._t = setTimeout(function () { t.classList.remove('zrf-show'); }, ms || 2800);
    }

    /* 抽样比对关键资源：网络版 vs 缓存版，不同则覆盖缓存条目 */
    function rfCheckAssets() {
        if (!('caches' in window)) return Promise.resolve(0);
        var cb = Date.now();
        var pfx = (window.ZL && ZL.assetPrefix) || '';
        return caches.keys()
            .then(function (keys) {
                if (!keys.length) return Promise.resolve(0);
                var cn = keys[keys.length - 1];
                return caches.open(cn).then(function (cache) {
                    return Promise.all(RF_ASSETS.map(function (a) {
                        var url = pfx + a;
                        return cache.match(url)
                            .then(function (cached) {
                                if (!cached) return 0;
                                return fetch(url + '?cb=' + cb, { cache: 'no-store' })
                                    .then(function (net) {
                                        if (!net || net.status !== 200) return 0;
                                        return Promise.all([cached.arrayBuffer(), net.arrayBuffer()])
                                            .then(function (b) {
                                                var o = new Uint8Array(b[0]), n = new Uint8Array(b[1]);
                                                if (o.length === n.length) {
                                                    var same = true;
                                                    for (var i = 0; i < o.length; i++) if (o[i] !== n[i]) { same = false; break; }
                                                    if (same) return 0;
                                                }
                                                var fresh = new Response(b[1], { status: net.status, statusText: net.statusText, headers: net.headers });
                                                return cache.put(url, fresh)
                                                    .then(function () { return cache.delete(url + '?cb=' + cb); })
                                                    .then(function () { return 1; });
                                            });
                                    })
                                    .catch(function () { return 0; });
                            });
                    })).then(function (r) { return r.reduce(function (a, v) { return a + v; }, 0); });
                });
            })
            .catch(function () { return 0; });
    }

    /* 核心：检查 SW 新版本 → 抽样比对资源 → 报告 */
    function rfCheck(silent) {
        var btn = document.getElementById('zlRfBtn');
        if (btn) btn.classList.add('zrf-loading');
        var done = function () {
            if (btn) btn.classList.remove('zrf-loading');
            try { localStorage.setItem(RF_KEY, String(Date.now())); } catch (e) {}
        };

        if (!('serviceWorker' in navigator)) { if (!silent) rfToast('当前浏览器不支持 Service Worker'); done(); return Promise.resolve(); }

        var p = navigator.serviceWorker.ready
            .then(function (reg) {
                return reg.update().then(function () {
                    var inst = reg.installing;
                    if (inst && inst !== reg.waiting && inst !== reg.active) {
                        return new Promise(function (res) {
                            inst.addEventListener('statechange', function onS() {
                                if (inst.state === 'installed') {
                                    inst.removeEventListener('statechange', onS);
                                    if (navigator.serviceWorker.controller && inst !== reg.active) {
                                        inst.addEventListener('controlling', function () { res(true); });
                                    } else { res(true); }
                                }
                            });
                            setTimeout(function () { res(false); }, 5000);
                        });
                    }
                    return false;
                });
            });

        p.then(function (hasNewSW) {
            if (hasNewSW) { rfToast('发现新版本，正在更新…'); setTimeout(function () { location.reload(); }, 1200); done(); return; }
            rfCheckAssets().then(function (n) {
                if (n > 0) { rfToast('已更新 ' + n + ' 项'); if (!silent) setTimeout(function () { location.reload(); }, 1500); }
                else if (!silent) rfToast('已是最新');
                done();
            }).catch(function () { if (!silent) rfToast('检查失败'); done(); });
        }).catch(function () { if (!silent) rfToast('检查失败'); done(); });
        return p;
    }

    function initRefresh() {
        var btn = document.createElement('div');
        btn.id = 'zlRfBtn';
        btn.className = 'zl-refresh';
        btn.setAttribute('role', 'button');
        btn.setAttribute('tabindex', '0');
        btn.setAttribute('aria-label', '刷新缓存');
        btn.setAttribute('title', '全面比旧缓存，自动刷新有修改的地方');
        btn.innerHTML = '<span class="zrf-ic">🔄</span>';
        btn.addEventListener('click', function () { rfCheck(false); });
        btn.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); rfCheck(false); } });
        document.body.appendChild(btn);

        /* 进页默认跑一次（节流：30 分钟内不重复） */
        try {
            var last = parseInt(localStorage.getItem(RF_KEY) || '0', 10);
            if (Date.now() - last > RF_INTERVAL) {
                setTimeout(function () { rfCheck(true); }, 1500);
            }
        } catch (e) {}
    }

    /* ===================== 挂载器 ===================== */
    ZL.glass = {
        version: '2.3.3',
        init: function () {
            try {
                injectStyle();
                if (isSkipPage()) return; // 门禁/授权/离线页不注入 UI
                /* V119 精简：initDock()/initPalette() 已随停靠栏删除 */
                initGlow();
                initFocus();
                initFilter();
                initRefresh(); /* V125：右上角刷新按键 + 进页自动检查 */
            } catch (e) {}
        }
    };
})();
