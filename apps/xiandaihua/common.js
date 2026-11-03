/* 现代化学习站 - 公共脚本
 * 仅负责 Service Worker 注册（离线缓存支持）。
 * 注意：本站是教学站，课程包含 F12 开发者工具与右键查看源码等操作，
 * 因此不做任何"禁右键/禁 F12"限制——以身作则。 */
(function () {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () {
            navigator.serviceWorker.register('service-worker.js').catch(function (err) {
                // 本地 file:// 打开时 SW 不可用，属正常情况，静默忽略
            });
        });
    }
})();

/* ========== 全站统一跳转动画（跨 5 站共享，2026-10-11） ==========
 * 用户点击"跳向本站任意 HTML"的按键时，统一显示 zhaolezi 圆环转圈动画。
 * 中心文字规则：
 *   - 跳 index.html → 按当前站点品牌显示（zhaolezi=找乐子 / creativity=创意引擎 /
 *                     xiandaihua=现代化 / all-file-saver=全能文件保存 / ai-prompts=AI 提示词库）
 *   - 其他跳转 → 目标 HTML 的 <title> 剥离品牌名后取最长段
 * 实现方式：全局 click 捕获阶段拦截 <a href="*.html"> 和 onclick="location.*='***.html'>"。
 * 不改 HTML、不删旧动画代码，纯增量 hook。启动屏自动跳转（setTimeout 内）不拦截。 */
(function(){
    if(window.__JUMP_ANIM_INIT__) return;
    window.__JUMP_ANIM_INIT__ = true;
    var STYLE_ID = 'zl-jump-anim-style';
    var OVERLAY_ID = 'zl-jump-overlay';
    var jumpLocked = false;

    function ensureStyle(){
        if(document.getElementById(STYLE_ID)) return;
        var s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = '#'+OVERLAY_ID+'{position:fixed;inset:0;z-index:2147483647;background:rgba(6,8,24,.72);display:flex;align-items:center;justify-content:center;opacity:0;visibility:hidden;transition:opacity .3s,visibility .3s;pointer-events:none;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif;}'
            +'#'+OVERLAY_ID+'.active{opacity:1;visibility:visible;pointer-events:auto;}'
            +'.zl-jump-wrap{position:relative;width:180px;height:180px;display:flex;align-items:center;justify-content:center;flex-direction:column;}'
            +'.zl-jump-ring{position:absolute;top:0;left:0;width:100%;height:100%;border-radius:50%;border:3px solid rgba(255,255,255,.14);border-top-color:#38ef7d;animation:zlJumpSpin .9s linear infinite;box-shadow:0 0 32px rgba(56,239,125,.25);}'
            +'@keyframes zlJumpSpin{to{transform:rotate(360deg)}}'
            +'.zl-jump-label{margin-top:26px;font-size:16px;color:#fff;letter-spacing:.05em;font-weight:500;text-align:center;max-width:280px;word-break:break-word;line-height:1.4;}'
            +'@media (prefers-reduced-motion:reduce){.zl-jump-ring{animation-duration:2s}}';
        document.head.appendChild(s);
    }
    function ensureOverlay(){
        var o = document.getElementById(OVERLAY_ID);
        if(!o){
            o = document.createElement('div');
            o.id = OVERLAY_ID;
            o.innerHTML = '<div class="zl-jump-wrap"><div class="zl-jump-ring"></div><div class="zl-jump-label">跳转中...</div></div>';
            (document.body||document.documentElement).appendChild(o);
        }
        return o;
    }
    function pickBrandForIndex(){
        var p = (window.location.pathname||'').toLowerCase();
        if(p.indexOf('zhaolezi') >= 0) return '找乐子';
        if(p.indexOf('creativity') >= 0) return '创意引擎';
        if(p.indexOf('xiandaihua') >= 0) return '现代化';
        if(p.indexOf('all-file-saver') >= 0) return '全能文件保存';
        if(p.indexOf('ai-prompts') >= 0) return 'AI 提示词库';
        return '找乐子';
    }
    function extractTitle(text){
        var m = text.match(/<title[^>]*>([^<]+)<\/title>/i);
        return m ? m[1].trim() : '';
    }
    function cleanTitleForLabel(title, fallback){
        var brands = ['找乐子','现代化·知识学习站','AI 提示词库','AI提示词库','创意引擎','全能文件保存','现代化','创意'];
        var t = title;
        for(var i=0;i<brands.length;i++){ t = t.split(brands[i]).join(' '); }
        var segs = t.split(/[\-|｜·•—–]+|\s{2,}/).map(function(s){return s.trim();}).filter(Boolean);
        segs.sort(function(a,b){return b.length - a.length;});
        return segs[0] || fallback;
    }
    function showJump(target){
        if(jumpLocked) return;
        jumpLocked = true;
        ensureStyle();
        var o = ensureOverlay();
        var labelEl = o.querySelector('.zl-jump-label');
        var fallback = target.replace(/\?.*$/,'').replace(/\.html$/,'');
        if(/(^|\/)index\.html(\?|$)/i.test(target)){
            labelEl.textContent = pickBrandForIndex();
        } else {
            labelEl.textContent = '跳转中...';
            fetch(target, {cache:'force-cache'}).then(function(r){ return r.text(); })
                .then(function(html){
                    var t = extractTitle(html);
                    if(t) labelEl.textContent = cleanTitleForLabel(t, fallback);
                })
                .catch(function(){ /* 保留"跳转中..." */ });
        }
        o.classList.add('active');
        setTimeout(function(){
            jumpLocked = false;
            window.location.href = target;
        }, 900);
    }
    document.addEventListener('click', function(e){
        if(jumpLocked) return;
        // 1. 拦截 <a href="*.html">
        var a = e.target.closest && e.target.closest('a[href]');
        if(a){
            var href = a.getAttribute('href') || '';
            if(/\.(html|htm)(\?|$)/i.test(href) && !/^https?:\/\//i.test(href) && !href.startsWith('/') && !href.startsWith('#') && !href.startsWith('mailto:')){
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                showJump(href);
                return;
            }
        }
        // 2. 拦截 onclick 里含 location.*= 或 location.replace()/assign() 的按钮
        var btn = e.target.closest && e.target.closest('[onclick]');
        if(btn){
            var oc = btn.getAttribute('onclick') || '';
            var m = oc.match(/(?:location\.href\s*=\s*["']([^"']+\.html[^"']*)["']|location\.replace\(\s*["']([^"']+\.html[^"']*)["']\s*\)|location\.assign\(\s*["']([^"']+\.html[^"']*)["']\s*\)|window\.location\s*=\s*["']([^"']+\.html[^"']*)["'])/i);
            if(m){
                var t = (m[1]||m[2]||m[3]||m[4]||'');
                if(t && !/^https?:\/\//i.test(t) && !t.startsWith('/')){
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    showJump(t);
                }
            }
        }
    }, true);
})();
/* ========== 全站统一跳转动画 结束 ========== */
