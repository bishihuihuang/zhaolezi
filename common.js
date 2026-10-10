
/* 防小白保护开始 */
(function(){
    var _0x1=document;
    var _0x2=null;
    var _0x6='';
    var _isFirefox = typeof InstallTrigger !== 'undefined' || (navigator.userAgent && navigator.userAgent.indexOf('Firefox') !== -1);
    if(_0x1.body){
        _0x1.body.setAttribute('oncontextmenu','return false');
    }
    function _0xBlockNative(){
        var els=_0x1.querySelectorAll('input,textarea,[contenteditable="true"],select');
        for(var i=0;i<els.length;i++){
            els[i].setAttribute('oncontextmenu','return false');
        }
    }
    _0xBlockNative();
    if(_0x1.addEventListener){
        _0x1.addEventListener('DOMNodeInserted',function(){setTimeout(_0xBlockNative,100);});
    }
    var _0x3=_0x1.createElement('div');
    _0x3.style.cssText='position:fixed;z-index:2147483647;background:#1e1e1e;border:1px solid #3a3a3a;border-radius:6px;box-shadow:0 6px 16px rgba(0,0,0,.5);padding:4px 0;min-width:200px;display:none;font-family:"Microsoft YaHei","Segoe UI",sans-serif;font-size:13px;user-select:none;';
    _0x3.innerHTML='<div data-a="paste" style="display:flex;justify-content:space-between;align-items:center;height:28px;padding:0 20px;cursor:pointer;color:#fff;line-height:28px;">粘贴<span style="color:#cfcfcf;font-size:12px;">Ctrl+V</span></div><div data-a="cut" style="display:flex;justify-content:space-between;align-items:center;height:28px;padding:0 20px;cursor:pointer;color:#fff;line-height:28px;">剪切<span style="color:#cfcfcf;font-size:12px;">Ctrl+X</span></div><div data-a="copy" style="display:flex;justify-content:space-between;align-items:center;height:28px;padding:0 20px;cursor:pointer;color:#fff;line-height:28px;">复制<span style="color:#cfcfcf;font-size:12px;">Ctrl+C</span></div><div data-a="selectall" style="display:flex;justify-content:space-between;align-items:center;height:28px;padding:0 20px;cursor:pointer;color:#fff;line-height:28px;">全选<span style="color:#cfcfcf;font-size:12px;">Ctrl+A</span></div><div data-a="refresh" style="display:flex;justify-content:space-between;align-items:center;height:28px;padding:0 20px;cursor:pointer;color:#fff;line-height:28px;">刷新<span style="color:#cfcfcf;font-size:12px;">F5</span></div>';
    function _0xMount(){
        if(_0x1.body){_0x1.body.appendChild(_0x3);}
        else{_0x1.addEventListener('DOMContentLoaded',function(){if(_0x1.body){_0x1.body.appendChild(_0x3);}});}
    }
    _0xMount();
    _0x3.addEventListener('mouseover',function(e){if(e.target.getAttribute('data-a')||e.target.closest('[data-a]')){var t=e.target.closest('[data-a]');if(t)t.style.background='#3a3a3a';}});
    _0x3.addEventListener('mouseout',function(e){if(e.target.getAttribute('data-a')||e.target.closest('[data-a]')){var t=e.target.closest('[data-a]');if(t)t.style.background='';}});
    function _0x4(text){
        if(!text){return false;}
        if(navigator.clipboard&&navigator.clipboard.writeText){
            navigator.clipboard.writeText(text).catch(function(){});
            return true;
        }
        var ta=_0x1.createElement('textarea');
        ta.value=text;
        ta.style.cssText='position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;';
        _0x1.body.appendChild(ta);
        ta.focus();ta.select();
        try{_0x1.execCommand('copy');}catch(e){}
        _0x1.body.removeChild(ta);
        return true;
    }
    function _0x5(el){
        if(el&&(el.tagName==='INPUT'||el.tagName==='TEXTAREA')){
            var s=el.selectionStart||0,e=el.selectionEnd||0;
            return el.value.substring(s,e);
        }
        return window.getSelection().toString();
    }
    function _0x7(el,txt){
        if(el.tagName==='INPUT'||el.tagName==='TEXTAREA'){
            var s=el.selectionStart||0,en=el.selectionEnd||0;
            el.value=el.value.substring(0,s)+txt+el.value.substring(en);
            el.selectionStart=el.selectionEnd=s+txt.length;
            el.dispatchEvent(new Event('input',{bubbles:true}));
        }else{
            try{_0x1.execCommand('insertText',false,txt);}catch(err){}
        }
    }
    function _0xContextHandler(e){
        e.preventDefault();
        e.stopPropagation();
        if(e.stopImmediatePropagation){e.stopImmediatePropagation();}
        var t=e.target;
        if(t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.isContentEditable)){
            t.focus();
            _0x2=t;
        }else{
            _0x2=_0x1.activeElement;
        }
        _0x3.style.display='block';
        _0x3.style.left=e.clientX+'px';
        _0x3.style.top=e.clientY+'px';
        setTimeout(function(){var r=_0x3.getBoundingClientRect();if(r.right>window.innerWidth){_0x3.style.left=(window.innerWidth-r.width-5)+'px';}if(r.bottom>window.innerHeight){_0x3.style.top=(window.innerHeight-r.height-5)+'px';}},0);
        return false;
    }
    _0x1.addEventListener('contextmenu',_0xContextHandler,true);
    _0x1.addEventListener('contextmenu',_0xContextHandler,false);
    if(window.addEventListener){
        window.addEventListener('contextmenu',_0xContextHandler,true);
        window.addEventListener('contextmenu',_0xContextHandler,false);
    }
    _0x1.addEventListener('click',function(){_0x3.style.display='none';});
    _0x1.addEventListener('scroll',function(){_0x3.style.display='none';});
    _0x1.addEventListener('keydown',function(e){if(e.keyCode===27){_0x3.style.display='none';}});
    _0x3.addEventListener('click',function(e){
        var t=e.target.closest('[data-a]');
        if(!t){return;}
        var a=t.getAttribute('data-a');
        _0x3.style.display='none';
        var el=_0x2||_0x1.activeElement;
        var isInput=el&&(el.tagName==='INPUT'||el.tagName==='TEXTAREA');
        var isEditable=el&&el.isContentEditable;
        if(a==='cut'){
            var txt=_0x5(el);
            if(txt){
                _0x4(txt);
                if(isInput){
                    var s=el.selectionStart||0,en=el.selectionEnd||0;
                    el.value=el.value.substring(0,s)+el.value.substring(en);
                    el.selectionStart=el.selectionEnd=s;
                    el.dispatchEvent(new Event('input',{bubbles:true}));
                }else if(isEditable){
                    try{_0x1.execCommand('delete');}catch(err){}
                }
            }
        }else if(a==='copy'){
            var txt=_0x5(el);
            if(txt){_0x4(txt);}
        }else if(a==='paste'){
            if(isInput||isEditable){
                el.focus();
                if(navigator.clipboard&&navigator.clipboard.readText){
                    navigator.clipboard.readText().then(function(txt){
                        if(txt){_0x7(el,txt);}
                    }).catch(function(){
                        var ta=_0x1.createElement('textarea');
                        ta.style.cssText='position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;';
                        _0x1.body.appendChild(ta);
                        ta.focus();
                        try{_0x1.execCommand('paste');}catch(e){}
                        if(ta.value){_0x7(el,ta.value);}
                        _0x1.body.removeChild(ta);
                        el.focus();
                    });
                }else{
                    try{_0x1.execCommand('paste');}catch(err){}
                }
            }
        }else if(a==='selectall'){
            if(isInput){
                el.focus();
                el.select();
                if(el.setSelectionRange){
                    el.setSelectionRange(0, el.value.length);
                }
            }else if(isEditable){
                el.focus();
                try{
                    var range=_0x1.createRange();
                    range.selectNodeContents(el);
                    var sel=window.getSelection();
                    sel.removeAllRanges();
                    sel.addRange(range);
                }catch(err){
                    try{_0x1.execCommand('selectAll');}catch(e){}
                }
            }else{
                try{_0x1.execCommand('selectAll');}catch(e){}
            }
        }else if(a==='refresh'){
            location.reload();
        }
    });
    _0x1.addEventListener('keydown',function(_0x8){
        var _0x9=_0x8.keyCode||_0x8.which;
        var _allowed = (_0x8.ctrlKey && (_0x9===86 || _0x9===67 || _0x9===88 || _0x9===65 || _0x9===70)) || _0x9===116;
        var _isFuncKey = _0x9>=112 && _0x9<=123;
        var _normal = !_0x8.ctrlKey && !_0x8.altKey && !_0x8.metaKey && !_isFuncKey;
        if(!_allowed && !_normal){
            _0x8.preventDefault();
            if(_0x8.stopPropagation){_0x8.stopPropagation();}
            if(_0x8.stopImmediatePropagation){_0x8.stopImmediatePropagation();}
            return false;
        }
    });
})();
/* 防小白保护结束 */


/* Service Worker 注册（离线缓存支持） */
(function(){
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function() {
            navigator.serviceWorker.register(location.origin + '/service-worker.js').catch(function(err){});
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
        var m = text.match(/<title[^>]*>([^<]+)</title>/i);
        return m ? m[1].trim() : '';
    }
    function cleanTitleForLabel(title, fallback){
        var brands = ['找乐子','现代化·知识学习站','AI 提示词库','AI提示词库','创意引擎','全能文件保存','现代化','创意'];
        var t = title;
        for(var i=0;i<brands.length;i++){ t = t.split(brands[i]).join(' '); }
        var segs = t.split(/[-|｜·•—–]+|s{2,}/).map(function(s){return s.trim();}).filter(Boolean);
        segs.sort(function(a,b){return b.length - a.length;});
        return segs[0] || fallback;
    }
    function showJump(target){
        if(jumpLocked) return;
        jumpLocked = true;
        ensureStyle();
        var o = ensureOverlay();
        var labelEl = o.querySelector('.zl-jump-label');
        var fallback = target.replace(/?.*$/,'').replace(/.html$/,'');
        if(/(^|/)index.html(?|$)/i.test(target)){
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
            if(/.(html|htm)(?|$)/i.test(href) && !/^https?:///i.test(href) && !href.startsWith('/') && !href.startsWith('#') && !href.startsWith('mailto:')){
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
            var m = oc.match(/(?:location.hrefs*=s*["']([^"']+.html[^"']*)["']|location.replace(s*["']([^"']+.html[^"']*)["']s*)|location.assign(s*["']([^"']+.html[^"']*)["']s*)|window.locations*=s*["']([^"']+.html[^"']*)["'])/i);
            if(m){
                var t = (m[1]||m[2]||m[3]||m[4]||'');
                if(t && !/^https?:///i.test(t) && !t.startsWith('/')){
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

