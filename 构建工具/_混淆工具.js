/**
 * 网站混淆工具
 *
 * 用法：
 *   node _混淆工具.js                  # 全量：从 _原始未混淆版 混淆所有页面
 *   node _混淆工具.js 1.html 5.html   # 只处理指定文件
 *
 * 目录结构（V2.3.3）：
 *   - 业务页 → pages/，首页 index.html 留根（PWA start_url 与站点根 URL 均不变）
 *   - 公共层留根：common.css/js、theme.js、zl-*.js、manifest.json、service-worker.js
 *   - 页面专属资源随页面入 pages/：images/、audio/、23data/、看看作业/、17-data.js
 *   - 相对引用前缀一律由"输出位置"决定（refPrefix），模板内不写死
 *
 * 功能：
 *   - 从 _原始未混淆版/ 读源文件，混淆后输出到根（全站同层）
 *   - 自动注入 PWA 块（manifest/theme-color/横屏CSS）到 </head> 前
 *     注入前先剥除历史注入块，保证幂等且公共引用路径与输出位置一致
 *   - 自动刷新公共防小白脚本 common.js，并在页面注入 <script src=".../common.js">（前缀随输出位置）
 *   - NO_OBFUSCATE 名单（更新公告/文件搜索/离线页）不混淆，直接复制
 *   - V2.8 阶段2：内联脚本改 javascript-obfuscator 强混淆（字符串数组+控制流+selfDefending，
 *     禁用 debugProtection 防控制台死循环；renameGlobals 必须关，内联 onclick 依赖全局原名）
 *   - 构建末尾：主题三方断言 + service-worker 缓存自动升版 + 全量冒烟自检（_冒烟自检.js）
 */

const fs = require('fs');
const cp = require('child_process');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

const SOURCE_DIR = '_原始未混淆版';
const ROOT = path.resolve(__dirname, '..');
const PAGES_DIR = 'pages';
// V2.3.3 顶层精简：业务页输出到 pages/，首页留根（PWA start_url 与站点根 URL 均不变）。
// 相对引用前缀一律由"文件的输出位置"决定，不写死在模板里。
const ROOT_PAGES = ['index.html'];
const NO_OBFUSCATE = ['更新公告.html', '文件搜索.html', '离线页.html'];

/** 页面引用根级公共文件的前缀；V2.9.3 分层：首页留根 ''，pages/ 页用 '../' */
function refPrefix(fileName) {
    return ROOT_PAGES.includes(fileName) ? '' : '../';
}
/** 该文件构建后的输出目录；V2.9.3 分层：首页输出 ROOT，业务页输出 ROOT/pages */
function outDir(fileName) {
    return ROOT_PAGES.includes(fileName) ? ROOT : path.join(ROOT, 'pages');
}
/** 该文件的站点访问路径（sitemap / og:url 用） */
function webPath(fileName) {
    return ROOT_PAGES.includes(fileName) ? fileName : 'pages/' + fileName;
}

/** V2.9.3 分层资产映射：源区相对路径 → 线上 assets 相对路径（相对站点根） */
const ASSET_MAP = [
    [/^(common|cy-common|xd-common)\.css$/, 'assets/css/'],
    [/^(common|theme|zl-features|zl-glass|17-data|cy-common|cy-theme|cy-features|cy-dashboard|cy-theme-init|xd-common|xd-theme|xd-features|xd-zoom-capture)\.js$/, 'assets/js/'],
    [/^images\//, 'assets/images/'],
    [/^audio\//, 'assets/audio/'],
    [/^23data\//, 'assets/23data/'],
    [/^看看作业\//, 'assets/看看作业/'],
    [/^af-assets\//, 'assets/af/af-assets/'],
    [/^(af-favicon\.svg|af-manifest\.json)$/, 'assets/af/'],
    [/^(cy-favicon[^/]*|cy-icon[^/]*|cy-manifest\.json)$/, 'assets/cy/'],
    [/^(xd-favicon\.svg|xd-manifest\.json)$/, 'assets/xd/'],
    [/^(ai-default-prompts\.json|ai-favicon\.svg|ai-manifest\.json)$/, 'assets/ai/'],
];
/** 根级 PWA 文件（始终在站点根，pages 页用 ../ 引用） */
const ROOT_ASSETS = ['manifest.json', 'service-worker.js', 'favicon.ico', 'favicon.svg', 'favicon-48.png', 'robots.txt', 'sitemap.xml'];

/**
 * V2.9.3：分层改造——重写 HTML 静态资源引用为 assets/ 结构。
 * - pages/ 页：资源前缀 '../assets/…'，回首页 '../index.html'；首页：'assets/…'
 * - 站内页引用（xxx.html）在 pages 内保持同目录裸名；首页引用业务页加 'pages/'
 * - 根级 PWA 文件（manifest/favicon/robots/sitemap）pages 页用 '../'
 * - 只处理静态属性 href/src（JS 动态路径由运行时 ZL.resolve/路径判断处理）
 */
function fixHomePath(html, fileName) {
    const isHome = ROOT_PAGES.includes(fileName);
    const prefix = isHome ? '' : '../';                 // 指向站点根
    const assetPfx = prefix;                            // 指向站点根（assets 由 dir 携带，避免双重 assets/）
    html = html.replace(/\b(href|src)\s*=\s*"([^"]*)"/g, (m, attr, val) => {
        const u = val.trim();
        if (!u || /^(https?:|\/\/|#|mailto:|tel:|data:|blob:|javascript:)/i.test(u)) return m;
        if (u.startsWith('../')) return m; // 已是构建注入的层级路径（../assets/... 等），不重复处理
        if (/\.html($|[?#])/.test(u)) {
            const clean = u.split(/[?#]/)[0];
            if (clean === 'index.html') return `${attr}="${prefix}index.html"`;
            // V2.9.7（下一棒修复）：构建自身注入的静态链接已带 pages/ 前缀，二次加前缀会产出 pages/pages/ 断链
            if (clean.startsWith('pages/')) return m;
            return isHome ? `${attr}="pages/${u}"` : m; // 首页引用业务页加 pages/；pages 内同目录不动
        }
        for (const [re, dir] of ASSET_MAP) {
            if (re.test(u)) {
                const rel = u.replace(re, ''); // 目录类剥前缀；文件类为空
                const file = rel || u;          // 文件类用原文件名
                return `${attr}="${assetPfx}${dir}${file}"`;
            }
        }
        if (ROOT_ASSETS.includes(u)) return `${attr}="${prefix}${u}"`;
        return m;
    });
    // 单引号属性同样处理（少量页面风格差异）
    html = html.replace(/\b(href|src)\s*=\s*'([^']*)'/g, (m, attr, val) => {
        const u = val.trim();
        if (!u || /^(https?:|\/\/|#|mailto:|tel:|data:|blob:|javascript:)/i.test(u)) return m;
        if (u.startsWith('../')) return m;
        if (/\.html($|[?#])/.test(u)) {
            const clean = u.split(/[?#]/)[0];
            if (clean === 'index.html') return `${attr}='${prefix}index.html'`;
            if (clean.startsWith('pages/')) return m; // 同上：已带 pages/ 前缀不重复
            return isHome ? `${attr}='pages/${u}'` : m;
        }
        for (const [re, dir] of ASSET_MAP) {
            if (re.test(u)) {
                const rel = u.replace(re, '');
                const file = rel || u;
                return `${attr}='${assetPfx}${dir}${file}'`;
            }
        }
        if (ROOT_ASSETS.includes(u)) return `${attr}='${prefix}${u}'`;
        return m;
    });
    // V2.9.3：JS 字符串内的资源路径（数据驱动图片/音频，如 '看看作业/xxx.jpg'、'images/xxx.png'）
    // 只匹配明确的资源目录前缀，避免误伤普通文案
    html = html.replace(/'((?:images|audio|23data|看看作业)\/[^'\n]*)'/g, (m, p) => {
        return `'${assetPfx}assets/${p}'`;
    });
    // V2.9.3：首页内联 JS 数据里的业务页链接（如 l:'成就中心.html'）→ 加 pages/ 前缀
    // （pages 页内的同目录链接不动）
    if (isHome) {
        html = html.replace(/'([^'/\\]+\.html)'/g, (m, f) => (f === 'index.html' ? m : `'pages/${f}'`));
    } else {
        // pages 页内联 JS 的 'index.html'（数据/跳转目标）→ '../index.html'
        // 安全：ZL.resolve 对非 'index.html' 原样返回；页面级 === 比较极少
        html = html.replace(/'index\.html'/g, "'../index.html'");
    }
    return html;
}

const PWA_BLOCK = `
<!-- PWA支持 -->
<link rel="manifest" href="@@PREFIX@@manifest.json">
<meta name="theme-color" content="#667eea">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="找乐子">
<meta name="mobile-web-app-capable" content="yes">

<!-- 横屏模式优化 -->
<style>
/* 横屏模式：游戏页面优化 */
@media (max-height: 500px) and (orientation: landscape) {
    .game-container, .board, .grid-board, canvas {
        max-height: 90vh !important;
        width: auto !important;
    }
    .toolbar, .nav, .header {
        padding: 4px 8px !important;
        font-size: 12px !important;
    }
}
</style>
`;

const ANTI_CHEAT_CODE = `
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
        /* V2.9.7：放行 Ctrl/Cmd+K（全站搜索快捷键），否则防小白兜底会 stopImmediatePropagation 拦掉 */
        var _allowed = (_0x8.ctrlKey && (_0x9===86 || _0x9===67 || _0x9===88 || _0x9===65 || _0x9===70 || _0x9===75)) || _0x9===116;
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
`;

// PWA：Service Worker 注册（全部页面经 common.js 统一注册）
// V2.9.3 分层：common.js 位于 assets/js/，页面在 pages/，register() 相对路径基准是文档 URL，
// 直接 register('service-worker.js') 会解析到 /pages/service-worker.js → 404。
// 改为用 document.currentScript 反推站点根（/zhaolezi/），再注册根级 service-worker.js（scope=/zhaolezi/）。
const SW_REGISTER_CODE = `

/* Service Worker 注册（离线缓存支持） */
(function(){
    /* V2.9.3：document.currentScript 仅在脚本执行期间有效，必须在 load 回调外捕获根路径 */
    var _swSrc = (document.currentScript && document.currentScript.src) || '';
    var _swRoot = _swSrc ? _swSrc.replace(/assets\\/js\\/common\\.js.*$/, '') : '';
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function() {
            try {
                var root = _swRoot || location.pathname.replace(/\\/[^/]*$/, '/');
                navigator.serviceWorker.register(root + 'service-worker.js').catch(function(err){});
            } catch (e) {}
        });
    }
})();
`;


const JUMP_ANIM_CODE = `
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
        s.textContent = '#'+OVERLAY_ID+'{position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.72);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);display:flex;align-items:center;justify-content:center;opacity:0;visibility:hidden;transition:opacity .3s,visibility .3s;pointer-events:none;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif;}'
            +'#'+OVERLAY_ID+'.active{opacity:1;visibility:visible;pointer-events:auto;}'
            +'.zl-jump-wrap{position:relative;width:180px;height:180px;display:flex;align-items:center;justify-content:center;}'
            +'.zl-jump-ring{position:absolute;inset:0;border-radius:50%;border:3px solid rgba(255,255,255,.12);border-top-color:#F6D365;border-right-color:#FDA085;animation:zlJumpSpin .8s linear infinite;}'
            +'.zl-jump-ring::before{content:"";position:absolute;inset:14px;border-radius:50%;border:2px solid transparent;border-bottom-color:#A78BFA;border-left-color:#667EEA;animation:zlJumpSpin 1.4s linear infinite reverse;}'
            +'.zl-jump-label{position:relative;z-index:2;font-size:22px;font-weight:700;letter-spacing:.1em;color:#F6D365;text-align:center;max-width:280px;word-break:break-word;line-height:1.4;}'
            +'@keyframes zlJumpSpin{to{transform:rotate(360deg)}}'
            +'@media (prefers-reduced-motion:reduce){.zl-jump-ring,.zl-jump-ring::before{animation-duration:2s}}';
        document.head.appendChild(s);
    }
    function ensureOverlay(){
        var o = document.getElementById(OVERLAY_ID);
        if(!o){
            o = document.createElement('div');
            o.id = OVERLAY_ID;
            o.innerHTML = '<div class="zl-jump-wrap"><div class="zl-jump-ring"></div><div class="zl-jump-label">跳转中...</div></div>';
            /* V126 视觉：复刻原生三层 loader-ring 设计（外环 accent 顺时针 + 内环反旋 + 居中品牌文字），替换 V1 单层绿圆环 */
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
        var m = text.match(/<title[^>]*>([^<]+)<\\/title>/i);
        return m ? m[1].trim() : '';
    }
    function cleanTitleForLabel(title, fallback){
        var brands = ['找乐子','现代化·知识学习站','AI 提示词库','AI提示词库','创意引擎','全能文件保存','现代化','创意'];
        var t = title;
        for(var i=0;i<brands.length;i++){ t = t.split(brands[i]).join(' '); }
        var segs = t.split(/[\-|｜·•—–]+|\\s{2,}/).map(function(s){return s.trim();}).filter(Boolean);
        segs.sort(function(a,b){return b.length - a.length;});
        return segs[0] || fallback;
    }
    function showJump(target){
        if(jumpLocked) return;
        jumpLocked = true;
        ensureStyle();
        var o = ensureOverlay();
        var labelEl = o.querySelector('.zl-jump-label');
        var fallback = target.replace(/\\?.*$/,'').replace(/\\.html$/,'');
        if(/(^|\\/)index\\.html(\\?|$)/i.test(target)){
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
            if(/\\.(html|htm)(\\?|$)/i.test(href) && !/^https?:\\/\\//i.test(href) && !href.startsWith('/') && !href.startsWith('#') && !href.startsWith('mailto:')){
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
            var m = oc.match(/(?:location\\.href\\s*=\\s*["']([^"']+\\.html[^"']*)["']|location\\.replace\\(\\s*["']([^"']+\\.html[^"']*)["']\\s*\\)|location\\.assign\\(\\s*["']([^"']+\\.html[^"']*)["']\\s*\\)|window\\.location\\s*=\\s*["']([^"']+\\.html[^"']*)["'])/i);
            if(m){
                var t = (m[1]||m[2]||m[3]||m[4]||'');
                if(t && !/^https?:\\/\\//i.test(t) && !t.startsWith('/')){
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

`;

function utf8ToBase64(str) {
    return Buffer.from(str, 'utf-8').toString('base64');
}

/**
 * P1-10：ZL.PAGES 作为 sitemap 单一来源，构建时生成 sitemap.xml
 * 从 zl-features.js 正则提取 PAGES 中的文件名，生成 GitHub Pages 域名下的 URL 列表
 */
/* V2.9.7：调用同目录辅助脚本（缺失/失败仅告警，不阻断构建） */
function runHelper(scriptName) {
    const p = path.join(__dirname, scriptName);
    if (!fs.existsSync(p)) { console.log('[辅助] 跳过 ' + scriptName + '（文件不存在）'); return; }
    try {
        const r = cp.execSync('node ' + JSON.stringify(p), { stdio: 'pipe', encoding: 'utf-8', timeout: 600000, cwd: __dirname });
        process.stdout.write(r.trim().split('\n').slice(-4).join('\n') + '\n');
    } catch (e) {
        const out = ((e.stdout || '') + (e.stderr || '')).trim().split('\n').slice(-4).join('\n');
        console.log('[辅助] ' + scriptName + ' 失败（不阻断）：\n' + out);
    }
}

/* V2.9.7（7B）：从构建产物生成全站搜索索引 assets/js/zl-search-index.js */
function genSearchIndex() {
    const entries = [];
    const collect = (file, url) => {
        let s;
        try { s = fs.readFileSync(file, 'utf-8'); } catch (e) { return; }
        const title = (s.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [, ''])[1].trim();
        const desc = (s.match(/name=["']description["'][^>]*content=["']([^"']*)/i) || [, ''])[1];
        const body = s
            .replace(/<script[\s\S]*?<\/script>/gi, ' ')
            .replace(/<style[\s\S]*?<\/style>/gi, ' ')
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/找乐子——|，趣味工具与小游戏合集/g, '')
            .trim();
        entries.push({ u: url, t: title || url, d: (desc || body.slice(0, 90)).slice(0, 120), k: body.slice(0, 260) });
    };
    const idx = path.join(ROOT, 'index.html');
    if (fs.existsSync(idx)) collect(idx, 'index.html');
    const pagesDir = path.join(ROOT, 'pages');
    if (fs.existsSync(pagesDir)) {
        fs.readdirSync(pagesDir).filter(f => f.endsWith('.html')).sort().forEach(f => collect(path.join(pagesDir, f), 'pages/' + f));
    }
    if (!entries.length) return;
    const js = '/* V2.9.7 自动生成：全站搜索索引（构建产物，勿手改） */\nwindow.ZL_SEARCH=' + JSON.stringify(entries) + ';';
    const dst = path.join(ROOT, 'assets', 'js', 'zl-search-index.js');
    fs.writeFileSync(dst, js, 'utf-8');
    console.log('[公共] assets/js/zl-search-index.js 已生成（' + entries.length + ' 页，' + Math.round(js.length / 1024) + 'KB）');
}

function genSitemap() {
    /* V2.9.7（6A）：sitemap 覆盖全站 —— 旧逻辑只在仓库根找 zl-features.js（实际在源区），
       长期静默失败停在 42 条。现在取"ZL.PAGES ∪ 源区全部 HTML"，去重排序。 */
    const zlSrc = path.join(ROOT, SOURCE_DIR, 'zl-features.js');
    const set = new Set();
    if (fs.existsSync(zlSrc)) {
        const code = fs.readFileSync(zlSrc, 'utf-8');
        const re = /f:\s*'([^']+\.html)'/g;
        let m;
        while ((m = re.exec(code)) !== null) set.add(m[1]);
    }
    const srcDir = path.join(ROOT, SOURCE_DIR);
    if (fs.existsSync(srcDir)) {
        fs.readdirSync(srcDir).filter(f => f.endsWith('.html')).forEach(f => set.add(f));
    }
    set.add('index.html');
    const files = [...set].sort();
    if (!files.length) return;
    const base = 'https://bishihuihuang.github.io/zhaolezi/';
    const urls = files.map(f => '  <url><loc>' + base + webPath(f) + '</loc></url>').join('\n');
    const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + '\n</urlset>\n';
    fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml, 'utf-8');
    console.log('[公共] sitemap.xml 已生成（' + files.length + ' 页，全站覆盖）');
}

/**
 * P1-9：主题三方对齐断言（THEMES / LABELS / common.css 主题块数量一致）
 * 不一致时打印 ✗ 但不拦截构建（不影响页面可用性，仅提示修复）
 */
function checkThemeConsistency() {
    const themeSrc = path.join(ROOT, 'theme.js');
    if (!fs.existsSync(themeSrc)) return true;
    const code = fs.readFileSync(themeSrc, 'utf-8');
    const tm = code.match(/var THEMES = \[([^\]]+)\]/);
    const lm = code.match(/var LABELS = \{([^}]+)\}/);
    if (!tm || !lm) {
        console.log('[断言] theme.js 结构无法解析，跳过主题对齐检查');
        return true;
    }
    const themes = (tm[1].match(/'([^']+)'/g) || []).map(x => x.slice(1, -1));
    const labels = (lm[1].match(/([A-Za-z_$][\w$]*):/g) || []).map(x => x.slice(0, -1));
    let cssCount = 0;
    const cssPath = path.join(ROOT, 'common.css');
    if (fs.existsSync(cssPath)) {
        const css = fs.readFileSync(cssPath, 'utf-8');
        // V2.9.2 主题收敛：只统计 :root[data-theme="X"] 顶层定义（排除 :not(...) 中的引用）
        cssCount = new Set([...css.matchAll(/:root\[data-theme="([^"]+)"/g)].map(m => m[1])).size;
    }
    const ok = themes.length === labels.length && themes.length === cssCount;
    console.log('[断言] 主题三方对齐：THEMES ' + themes.length + ' / LABELS ' + labels.length + ' / CSS 块 ' + cssCount + (ok ? ' ✓' : ' ✗ 不一致，请检查 theme.js 与 common.css'));
    return ok;
}

/**
 * V2.0 主题变量化审计：构建后提示各页硬编码色规模（治理依据，不拦截）。
 * 页面新改动一律引用 --zl-* 产品级 token，见 _theme_audit.js。
 */
function checkThemeAudit() {
    try {
        const audit = require(path.join(__dirname, '_theme_audit.js'));
        const notV = audit.rows.filter(r => !r.usesVar).length;
        console.log('[审计] 硬编码色 ' + audit.total + ' 处 / ' + audit.rows.length + ' 页，已接入变量 ' + audit.rows.filter(r => r.usesVar).length + ' 页，未接变量 ' + notV + ' 页（治理清单见 node _theme_audit.js）');
    } catch (e) {
        console.log('[审计] _theme_audit.js 执行失败：' + e.message);
    }
}

/**
 * 自动全局挂载：扫描脚本内的 function 声明，在混淆载荷中追加 window.xxx 挂载。
 * 背景：混淆模板用 direct eval 执行，function 声明不会进入全局作用域，
 * 导致 HTML 内联事件属性（onclick="foo()"）按全局查找失败（ReferenceError）。
 * 该函数恢复未混淆时代的全局语义，且对 window 已存在的内置属性安全跳过。
 */
function autoAttachGlobals(jsCode) {
    const names = new Set();
    // V2.9 修复：只收集真顶层（行首无缩进）function 声明。
    // 旧正则 (?:^|[\n;])\s*function 会扫到 IIFE 内函数（如 nowTag/closeDlg/ensureStyle），
    // 混淆器对 IIFE 内函数做局部改名后，全局作用域的挂载语句 RHS 仍保原名 → ReferenceError，
    // 且链式挂载无 try/catch，一处炸全链断（内联事件依赖的全局函数全部丢失）。
    const fnRe = /^function\s+([A-Za-z_$][\w$]*)\s*\(/gm;
    let m;
    while ((m = fnRe.exec(jsCode)) !== null) {
        names.add(m[1]);
    }
    const lines = [];
    for (const n of names) {
        // 已在源码中显式挂载的跳过，避免重复输出
        if (jsCode.includes('window.' + n + ' = ' + n) || jsCode.includes('window.' + n + '=' + n)) {
            continue;
        }
        // 运行时判断 + try/catch 兜底：window 已存在该属性则不覆盖；任何异常不得中断挂载链
        lines.push("try{if(!('" + n + "' in window))window." + n + "=" + n + ";}catch(e){}");
    }
    if (lines.length === 0) return jsCode;
    return jsCode + '\n\n/* 自动全局挂载（供内联事件属性调用） */\n' + lines.join('\n');
}

/**
 * V1.9.5 防回归 b 方案：构建期可读性预检（pre-check）
 * 扫描目标页面：① 是否接入主题变量/对比度兜底体系（FAIL 拦截）；
 * ② 硬编码灰阶文字色（深灰/亮灰）生成审计报告（HIGH/WARN 不拦截）。
 * 用法：node _混淆工具.js --check   → 全量静态预检（不构建，有 FAIL 则退出码 1）
 */
function preCheck(fileName, content) {
    const issues = [];
    if (!content || typeof content !== 'string') {
        issues.push({ level: 'FAIL', msg: '内容为空，无法预检' });
        return issues;
    }
    // ① 体系接入检查：必须引用主题变量或加载 zl-features.js 对比度兜底
    const hasVarRef = /var\(\s*--/.test(content);
    const hasZL = /zl-features\.js/.test(content);
    if (!hasVarRef && !hasZL) {
        issues.push({ level: 'FAIL', msg: '页面未引用任何主题变量(var(--xx))且未加载 zl-features.js，新增内容将无法跟随主题，深底暗字/浅底亮字风险高' });
    }
    // ② 硬编码灰阶文字色扫描（color:#rgb 或 color:rgb(a)），按亮度分级
    const colorRe = /color\s*:\s*(#[0-9a-fA-F]{3}(?![0-9a-fA-F])|#[0-9a-fA-F]{6}(?![0-9a-fA-F])|rgba?\([^)]*\))/g;
    let m;
    const seen = {};
    while ((m = colorRe.exec(content)) !== null) {
        const raw = m[1].trim();
        let rgb = null;
        if (/^#/.test(raw)) {
            const h = raw.slice(1);
            if (h.length === 3) { rgb = [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16)]; }
            else if (h.length === 6) { rgb = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
        } else {
            const p = raw.match(/\((\d+)[,\s]+(\d+)[,\s]+(\d+)/);
            if (p) rgb = [parseInt(p[1], 10), parseInt(p[2], 10), parseInt(p[3], 10)];
        }
        if (!rgb) continue;
        // 灰阶判定：三通道差 < 24（与 zl-features _zlIsGray 一致）
        if (Math.max(rgb[0], rgb[1], rgb[2]) - Math.min(rgb[0], rgb[1], rgb[2]) >= 24) continue;
        const lum = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
        const key = raw;
        if (seen[key]) continue; // 同类只报一次，避免刷屏
        seen[key] = true;
        if (lum < 0.45) {
            issues.push({ level: 'HIGH', msg: '硬编码深灰文字 ' + raw + '（亮度 ' + lum.toFixed(2) + '）：在默认深色流光主题(--bg #0a0e27)下可能深底深字，应改用 var(--txt)/var(--dim)' });
        } else if (lum > 0.82) {
            issues.push({ level: 'WARN', msg: '硬编码亮灰/白字 ' + raw + '（亮度 ' + lum.toFixed(2) + '）：在 light/milk 浅色主题下可能浅底亮字，应改用 var(--txt)/var(--dim)' });
        }
    }
    return issues;
}

/* ========== 12B：本地错误日志（零外传；控制台 ZL.errors() 查看 / ZL.errorsClear() 清空） ========== */
const ERROR_LOG_CODE = `

/* 本地错误日志：window.onerror/unhandledrejection → localStorage（zl_errlog，最近 20 条） */
(function(){
    var KEY='zl_errlog', MAX=20;
    function read(){ try{ return JSON.parse(localStorage.getItem(KEY)||'[]'); }catch(e){ return []; } }
    function push(rec){ try{ var a=read(); a.push(rec); if(a.length>MAX)a=a.slice(a.length-MAX); localStorage.setItem(KEY,JSON.stringify(a)); }catch(e){} }
    function rec(type,msg,src,line,col,stack){
        push({ t:Date.now(), type:type, msg:String(msg||'').slice(0,300),
               src:String(src||'').replace(location.origin,'').slice(0,160),
               line:line||0, col:col||0, stack:String(stack||'').slice(0,400),
               page:(location.pathname.split('/').pop()||'index') });
    }
    window.addEventListener('error',function(e){
        try{
            if(e&&e.target&&e.target.tagName){ if(/^(SCRIPT|LINK|IMG)$/.test(e.target.tagName)) rec('resource',e.target.tagName+' '+(e.target.src||e.target.href||'')); return; }
            rec('error',e&&e.message,e&&e.filename,e&&e.lineno,e&&e.colno,e&&e.error&&e.error.stack);
        }catch(_){}
    },true);
    window.addEventListener('unhandledrejection',function(e){
        try{ var r=e&&e.reason; rec('promise',r&&(r.message||r),'',0,0,r&&r.stack); }catch(_){}
    });
    window.ZL=window.ZL||{};
    window.ZL.errors=function(){ return read(); };
    window.ZL.errorsClear=function(){ try{ localStorage.removeItem(KEY); }catch(e){} return true; };
})();
`;

/* ========== 10B：SW 新版本提示（检测到 waiting worker → 底部提示点击刷新） ========== */
const SW_UPDATE_CODE = `

/* 新版本提示：SW updatefound → installed(且有旧 controller) → 显示"立即刷新" */
(function(){
    if(!('serviceWorker' in navigator)) return;
    function showUpdate(reg){
        try{
            if(document.getElementById('zl-update-toast')) return;
            var d=document.createElement('div'); d.id='zl-update-toast'; d.setAttribute('role','status');
            d.style.cssText='position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483647;display:flex;align-items:center;gap:12px;max-width:min(92vw,420px);padding:12px 16px;border-radius:14px;background:#1f1f1f;color:#fff;font-size:14px;line-height:1.4;box-shadow:0 12px 34px rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.18);font-family:inherit;';
            var t=document.createElement('span'); t.textContent='页面有新版本，刷新后生效';
            var b=document.createElement('button'); b.type='button'; b.textContent='立即刷新';
            b.style.cssText='flex:none;border:0;border-radius:10px;padding:8px 14px;font-size:14px;font-weight:700;background:#f6d365;color:#181818;cursor:pointer;font-family:inherit;';
            b.addEventListener('click',function(){
                try{ if(reg&&reg.waiting) reg.waiting.postMessage({type:'SKIP_WAITING'}); }catch(e){}
                var done=false, reload=function(){ if(done)return; done=true; location.reload(); };
                navigator.serviceWorker.addEventListener('controllerchange',reload);
                setTimeout(reload,800);
            });
            var x=document.createElement('button'); x.type='button'; x.setAttribute('aria-label','关闭提示'); x.textContent='×';
            x.style.cssText='flex:none;border:0;background:transparent;color:#9b9b9b;font-size:18px;cursor:pointer;padding:0 2px;';
            x.addEventListener('click',function(){ d.remove(); });
            d.appendChild(t); d.appendChild(b); d.appendChild(x);
            document.body.appendChild(d);
        }catch(e){}
    }
    navigator.serviceWorker.ready.then(function(reg){
        if(reg.waiting && navigator.serviceWorker.controller) showUpdate(reg);
        reg.addEventListener('updatefound',function(){
            var nw=reg.installing; if(!nw) return;
            nw.addEventListener('statechange',function(){
                if(nw.state==='installed' && navigator.serviceWorker.controller) showUpdate(reg);
            });
        });
    }).catch(function(){});
})();
`;

/* ========== 7B：全站搜索浮层（Ctrl+K 或左下 🔍，数据来自 zl-search-index.js） ========== */
const SEARCH_CODE = `

/* 全站搜索：索引 window.ZL_SEARCH=[{u,t,d}]；Ctrl+K / 左下搜索球打开 */
(function(){
    if(window.__ZL_SEARCH_INIT__) return; window.__ZL_SEARCH_INIT__=true;
    var DATA=null;
    function loadData(){ if(DATA) return DATA; try{ DATA=(window.ZL_SEARCH&&window.ZL_SEARCH.length)?window.ZL_SEARCH:[]; }catch(e){ DATA=[]; } return DATA; }
    var box=null,input=null,list=null;
    function build(){
        if(box) return;
        box=document.createElement('div'); box.id='zl-search'; box.setAttribute('role','dialog'); box.setAttribute('aria-label','全站搜索');
        box.style.cssText='position:fixed;inset:0;z-index:2147483645;display:none;align-items:flex-start;justify-content:center;background:rgba(0,0,0,.55);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);padding:12vh 16px 16px;';
        var panel=document.createElement('div');
        panel.style.cssText='width:min(640px,94vw);background:var(--card,#fff);color:var(--txt,#23263a);border-radius:16px;border:1px solid var(--line,rgba(0,0,0,.12));box-shadow:0 24px 70px rgba(0,0,0,.45);overflow:hidden;font-family:inherit;';
        input=document.createElement('input');
        input.type='search'; input.placeholder='搜索全站（标题 / 简介）…'; input.setAttribute('aria-label','搜索全站');
        input.style.cssText='width:100%;box-sizing:border-box;border:0;outline:0;background:transparent;color:inherit;font-size:16px;padding:14px 16px;font-family:inherit;';
        list=document.createElement('div'); list.setAttribute('role','listbox');
        list.style.cssText='max-height:min(52vh,420px);overflow:auto;border-top:1px solid var(--line,rgba(0,0,0,.10));';
        panel.appendChild(input); panel.appendChild(list); box.appendChild(panel);
        box.addEventListener('click',function(e){ if(e.target===box) close(); });
        document.body.appendChild(box);
        input.addEventListener('input',render);
        input.addEventListener('keydown',function(e){
            var items=[].slice.call(list.querySelectorAll('a'));
            var cur=list.querySelector('a.active');
            if(e.key==='ArrowDown'||e.key==='ArrowUp'){
                e.preventDefault();
                if(!items.length) return;
                var i=items.indexOf(cur);
                i=e.key==='ArrowDown'?(i+1)%items.length:(i-1+items.length)%items.length;
                items.forEach(function(a){a.classList.remove('active')});
                items[i].classList.add('active'); items[i].scrollIntoView({block:'nearest'});
            } else if(e.key==='Enter'){
                if(cur){ e.preventDefault(); location.href=cur.getAttribute('href'); }
                else if(items[0]){ e.preventDefault(); location.href=items[0].getAttribute('href'); }
            } else if(e.key==='Escape'){ close(); }
        });
    }
    function render(){
        var q=(input.value||'').trim().toLowerCase();
        var data=loadData();
        var hits=q? data.filter(function(x){ return (x.t+' '+(x.d||'')).toLowerCase().indexOf(q)>=0; }).slice(0,20) : data.slice(0,12);
        list.innerHTML=hits.map(function(x,i){
            var root=location.pathname.replace(/\\\\?[^/]*$/,'');
            var href=x.u.indexOf('/')===0? x.u : root+x.u;
            return '<a role="option" class="'+(i===0?'active':'')+'" href="'+href+'" style="display:block;padding:10px 14px;text-decoration:none;color:inherit;border-bottom:1px solid var(--line,rgba(0,0,0,.06));">'
                +'<b style="display:block;font-size:14px;">'+x.t+'</b>'
                +(x.d?'<span style="display:block;font-size:12px;opacity:.72;margin-top:2px;">'+x.d+'</span>':'')
                +'</a>';
        }).join('') || '<div style="padding:16px;font-size:13px;opacity:.7;">没有匹配的页面</div>';
    }
    function open(){ build(); box.style.display='flex'; input.value=''; render(); setTimeout(function(){ input.focus(); },30); }
    function close(){ if(box) box.style.display='none'; }
    document.addEventListener('keydown',function(e){
        if((e.ctrlKey||e.metaKey)&&String(e.key).toLowerCase()==='k'){ e.preventDefault(); open(); }
        else if(e.key==='/'&&!/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)){ e.preventDefault(); open(); }
    });
    function fab(){
        try{
            if(document.getElementById('zl-search-fab')) return;
            var b=document.createElement('button'); b.id='zl-search-fab'; b.type='button'; b.title='全站搜索（Ctrl+K）'; b.setAttribute('aria-label','全站搜索');
            b.textContent='🔍';
            b.style.cssText='position:fixed;left:16px;bottom:132px;z-index:2147483000;width:40px;height:40px;border-radius:50%;border:1px solid rgba(255,255,255,.25);background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;font-size:17px;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.35);font-family:inherit;';
            b.addEventListener('click',open);
            document.body.appendChild(b);
        }catch(e){}
    }
    if(document.body) fab(); else document.addEventListener('DOMContentLoaded',fab);
})();
`;

/* ========== V2.9.7 治理后处理（1C/4B/6B/7A/8A/8B） ========== */
const SITE_BASE = 'https://bishihuihuang.github.io/zhaolezi/';
const SEARCH_INDEX_TAG = (P) => '<script defer src="' + P + 'assets/js/zl-search-index.js"></script>';
const EMOJI_ONLY_RE = /^(?:[\u{1F000}-\u{1FAFF}\u{2190}-\u{21FF}\u{2300}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\s])+$/u;
let WEBP_SET = new Set();

function stripTagsForAudit(html) { return String(html).replace(/<[^>]*>/g, ''); }

/* 8A：表单控件补 aria-label（已有 aria/显式 label 关联的跳过；优先用 placeholder 文案） */
function ensureFormLabels(html) {
    const labelFor = new Set();
    for (const m of html.matchAll(/<label[^>]*\bfor=["']([^"']+)["'][^>]*>/gi)) labelFor.add(m[1]);
    return html.replace(/<(input|textarea|select)\b([^>]*)>/gi, (m, tag, attrs) => {
        if (/aria-label|aria-labelledby/i.test(attrs)) return m;
        const typeM = attrs.match(/type=["']([^"']+)["']/i);
        const type = (typeM ? typeM[1] : '').toLowerCase();
        if (type === 'hidden') return m;
        const idM = attrs.match(/\bid=["']([^"']+)["']/i);
        if (idM && labelFor.has(idM[1])) return m;
        let label = '';
        const ph = attrs.match(/placeholder=["']([^"']+)["']/i);
        if (ph) label = ph[1];
        if (!label && idM) label = idM[1].replace(/[-_]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
        if (!label) return m;
        return '<' + tag + attrs + ' aria-label="' + label.replace(/"/g, '&quot;') + '">';
    });
}

/* 8B：纯 emoji 的按钮/链接补 aria-label（title 优先，兜底"按钮/链接"） */
function ensureIconAria(html) {
    return html.replace(/<(button|a)\b([^>]*)>([\s\S]*?)<\/\1>/gi, (m, tag, attrs, inner) => {
        if (/aria-label=/i.test(attrs)) return m;
        const text = stripTagsForAudit(inner).trim();
        if (!text || !EMOJI_ONLY_RE.test(text)) return m;
        const t = attrs.match(/\btitle=["']([^"']+)["']/i);
        const label = t ? t[1] : (tag.toLowerCase() === 'a' ? '链接' : '按钮');
        return '<' + tag + attrs + ' aria-label="' + label.replace(/"/g, '&quot;') + '">' + inner + '</' + tag + '>';
    });
}

/* 4B：图片默认懒加载（data URI 与已声明的不动） */
function ensureImgLazy(html) {
    return html.replace(/<img\b([^>]*)>/gi, (m, attrs) => {
        if (/src=["']data:/i.test(attrs)) return m;
        if (/\bloading=|\bfetchpriority=/i.test(attrs)) return m;
        return '<img' + attrs + ' loading="lazy" decoding="async">';
    });
}

/* 4B：把"已存在 .webp 对应文件"的图片引用改写为 .webp（无对应文件的保持原样） */
function loadWebpSet() {
    WEBP_SET = new Set();
    const roots = ['assets/images', 'assets/看看作业', 'assets/af', 'assets/cy', 'assets/xd', 'assets/ai'];
    roots.forEach(r => {
        const d = path.join(ROOT, r);
        if (!fs.existsSync(d)) return;
        const walk = (dir) => {
            for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
                const p = path.join(dir, e.name);
                if (e.isDirectory()) walk(p);
                else if (e.name.toLowerCase().endsWith('.webp')) WEBP_SET.add(path.relative(ROOT, p).replace(/\\/g, '/'));
            }
        };
        walk(d);
    });
}
function swapWebp(text) {
    if (!WEBP_SET.size) return text;
    const baseMap = new Map();
    for (const rel of WEBP_SET) baseMap.set(path.basename(rel), rel);
    let out = text.replace(/(["'\(])((?:\.\.\/|\.\/|assets\/|images\/|看看作业\/|cy\/|xd\/|af\/|ai\/)?[^"'\)\s]*?\.(?:png|jpe?g))(["'\)])/gi, (m, q1, p, q2) => {
        const low = p.toLowerCase();
        if (low.endsWith('.webp')) return m;
        const stem = p.slice(0, p.length - path.extname(p).length) + '.webp';
        const cands = new Set();
        const n1 = p.replace(/^\.\.\/|^\.\//, '');
        cands.add(n1); cands.add(n1.replace(/^assets\//, '')); cands.add('assets/' + n1);
        const n2 = stem.replace(/^\.\.\/|^\.\//, '');
        cands.add(n2); cands.add(n2.replace(/^assets\//, '')); cands.add('assets/' + n2);
        for (const c of cands) { if (WEBP_SET.has(c.replace(/\\/g, '/'))) return q1 + stem + q2; }
        // 数据驱动的纯文件名引用（'目录/'+name+'.png' 拼接场景）
        const byBase = baseMap.get(path.basename(p));
        if (byBase) return q1 + p.slice(0, p.length - path.extname(p).length) + '.webp' + q2;
        return m;
    });
    return out;
}

/* 8A：保证 #zl-main 跳转目标存在（main / role=main / .wrap 依次兜底） */
function ensureMainTarget(html) {
    if (/<main\b[^>]*\bid=/i.test(html)) return html;
    if (/<main\b/i.test(html)) return html.replace(/<main\b/i, '<main id="zl-main"');
    if (/role=["']main["']/i.test(html)) return html.replace(/(\srole=["']main["'])/i, '$1 id="zl-main"');
    const m = html.match(/<div\b[^>]*\bclass=["'][^"']*\bwrap\b[^"']*["'][^>]*>/i);
    if (m && !/\bid=/.test(m[0])) return html.replace(m[0], m[0].replace(/>$/, ' id="zl-main">'));
    return html;
}

/* 汇总：页面级后处理（在注入与路径修正之后执行） */
function postProcessPage(content, fileName) {
    let s = content;
    s = ensureFormLabels(s);
    s = ensureIconAria(s);
    s = ensureImgLazy(s);
    s = swapWebp(s);
    return s;
}

function ensurePwaBlock(html, fileName) {
    const P = refPrefix(fileName);
    const isHome = (!fileName || fileName === 'index.html');
    // V2.9.3 分层：公共层位于 assets/css|js
    const COMMON_CSS = '<link rel="stylesheet" href="' + P + 'assets/css/common.css">';
    const COMMON_JS = '<script defer src="' + P + 'assets/js/common.js"></script>';
    const THEME_JS = '<script defer src="' + P + 'assets/js/theme.js"></script>';
    const ZL_JS = '<script defer src="' + P + 'assets/js/zl-features.js"></script>';
    /* V2.9.8（修复A）：页面自带 rel="manifest"（如全能页的 af-manifest）时不再注入根 manifest */
    const PWA = (/rel=["']manifest["']/i.test(html) ? PWA_BLOCK.replace(/<link rel="manifest"[^>]*>\n?/, '') : PWA_BLOCK).split('@@PREFIX@@').join(P);

    // V2.3.3：先剥除历史注入块。部分源文件残留早期裸相对引用的注入块
    // （30.html、45.html 及 11 个业务页），页面迁入 pages/ 后这些裸引用会直接 404。
    // 统一剥除再重新注入，结果幂等且路径一致，不会重复累积。
    const THEME_EARLY_RE = /<script[^>]*>try\{var _zt=localStorage\.getItem\("zl_theme"\);[\s\S]*?<script\s+defer\s+src=["'][^"']*zl-features\.js["']><\/script>\s*/g;
    html = html.replace(THEME_EARLY_RE, '');
    // 另有一批源文件在注入块之外自带裸相对公共引用（多数紧贴 </head>），
    // 搬迁到 pages/ 后会解析成 /pages/common.css 而 404。注入块必然提供这些引用，
    // 故残留一律删除。已核实这些引用只出现在 HTML 标签中，无 JS 字符串误伤。
    html = html.replace(/<link\s[^>]*href="(?:common\.css|manifest\.json)"[^>]*>/g, '');
    html = html.replace(/<script\s[^>]*src="(?:common|theme|zl-features)\.js"[^>]*>\s*<\/script>/g, '');

    // 统一 head 元信息：SEO description + Open Graph（#7 优化）
    const titleMatch = /<title>([^<]*)<\/title>/i.exec(html);
    const pageTitle = titleMatch ? titleMatch[1].trim() : '找乐子';
    // V2：标题已含"找乐子"前缀时不再重复拼接，避免出现"找乐子——找乐子——"叠词
    const pageDesc = pageTitle.indexOf('找乐子') >= 0
        ? pageTitle + '｜趣味工具与小游戏合集'
        : '找乐子——' + pageTitle + '，趣味工具与小游戏合集';
    // V2：主题预执行，消除首帧闪色（FOUC）——在 CSS/JS 加载前先恢复用户主题
    // V2.9 修复：THEME_EARLY（主题预执行）必须跳过混淆。
    // 它是 6 行极小脚本，被逐页独立混淆后 stringArray 轮转循环（while(!![]){if(校验和===目标)break;else 轮转}）
    // 存在概率性不收敛 → 死循环 → HTML 解析卡在 head（页面 rs=loading、body 空、无异常）。
    // 构建随机化导致每次全站可能随机若干页踩雷（实测创意-首页/现代化多页/赞赏支持等）。
    // data-no-obf 属性 + 跳过标记双保险。
    // V2.9.4：必须无条件写入 data-theme —— 主题块与 --zl-* 别名层都挂在 :root[data-theme] 上，
    // 首访（localStorage 无 zl_theme）时属性缺失会导致变量全部解析为空（实测：现代/创意站
    // 正文文字变白不可见）。旧主题值（blue/gold/light…）一并归一为唯一主题 zhaolezi。
    const THEME_EARLY = '<script data-no-obf>try{var _zt=localStorage.getItem("zl_theme");if(_zt!=="zhaolezi")_zt="zhaolezi";document.documentElement.setAttribute("data-theme",_zt);}catch(e){try{document.documentElement.setAttribute("data-theme","zhaolezi");}catch(_){}}</script>';
    const ogBlock = '\n<!-- SEO/分享元信息 -->\n' +
        '<meta name="description" content="' + pageDesc + '">\n' +
        '<meta property="og:title" content="' + pageTitle + '">\n' +
        '<meta property="og:description" content="' + pageDesc + '">\n' +
        '<meta property="og:type" content="website">\n' +
        '<meta property="og:site_name" content="找乐子">\n' +
        '<meta property="og:url" content="https://bishihuihuang.github.io/zhaolezi/' + webPath(fileName || 'index.html') + '">\n' +
        /* V2.9.7（6A）：canonical 全站补齐（已有则不重复）；og:image 统一品牌分享图 */
        (/rel=["']canonical["']/i.test(html) ? '' : '<link rel="canonical" href="https://bishihuihuang.github.io/zhaolezi/' + webPath(fileName || 'index.html') + '">\n') +
        (/property=["']og:image["']/i.test(html) ? '' : '<meta property="og:image" content="https://bishihuihuang.github.io/zhaolezi/assets/images/og-default.png">\n');
    // V2.9：无 favicon 声明的页面补一条，防浏览器自动请求站点根 /favicon.ico（子路径站点 404）
    const faviconLine = /rel=["'](?:shortcut )?icon["']/i.test(html)
        ? ''
        : '<link rel="icon" href="' + P + 'favicon.svg" type="image/svg+xml">\n';
    // V2.9.4：站内已有主题入口（现代化/创意站注入式按钮、提示词/全能自带切换面板）时
    // 不再注入通用 theme.js —— 否则 #zlThemeBtn 与站内 #xdThemeBtn/#cyThemeBtn 同位置
    // 44×44 完全重叠（实测 130+ 页双按钮叠加，DOM 冗余且无障碍重复朗读）。
    // 主题变量由 THEME_EARLY 预执行 + :root 默认值兜底，不受影响。
    /* V2.9.8（修复A）：页面自带 rel="manifest"（如全能页的 af-manifest）时不再注入根 manifest，
       避免"装成 PWA 后打开哪个入口"取决于文档顺序的历史混乱。 */
    const hasOwnTheme = /(?:xd|cy)-theme\.js/i.test(html) || /id=["'](?:themeSwitcher|themeOpen)["']/i.test(html);
    // V2.9.4：无 h1 的页面补一个仅供屏幕阅读器/搜索引擎识别的 h1（视觉零影响），
    // 修复 33 页缺失主标题的语义问题。先剥除历史注入以保证幂等。
    html = html.replace(/<h1[^>]*class="sr-only"[^>]*data-auto[^>]*>[\s\S]*?<\/h1>\s*/gi, '');
    const srH1 = /<h1[\s>]/i.test(html) ? '' : '<h1 class="sr-only" data-auto>' + pageTitle.replace(/[<>]/g, '') + '</h1>\n';
    if (srH1) html = html.replace(/<body([^>]*)>/i, (m) => m + '\n' + srH1);
    // V2.9.7（8A/7A）：跳转正文链接 + 面包屑（都挂在 body 开头；目标由 ensureMainTarget 保证）
    html = ensureMainTarget(html);
    let bodyTop = '';
    if (/id=["']zl-main["']/.test(html)) bodyTop += '<a class="zl-skip-link" href="#zl-main">跳到主要内容</a>';
    if (!isHome) bodyTop += '<nav class="zl-crumb sr-only" aria-label="面包屑"><a href="' + P + 'index.html">找乐子</a> <span aria-hidden="true">›</span> <span aria-current="page">' + pageTitle.replace(/[<>]/g, '') + '</span></nav>';
    if (bodyTop) html = html.replace(/<body([^>]*)>/i, (m) => m + '\n' + bodyTop);
    // V2.9.7（6B）：首页注入可爬取的静态页面链接（sr-only，不影响视觉；无 JS 也可达）
    if (isHome) {
        const srcDir = path.join(ROOT, SOURCE_DIR);
        if (fs.existsSync(srcDir)) {
            const list = fs.readdirSync(srcDir).filter(f => f.endsWith('.html') && f !== 'index.html').sort()
                .map(f => '<a href="' + P + 'pages/' + f + '">' + f.replace(/\.html$/, '') + '</a>').join('');
            if (list) html = html.replace(/<\/body>/i, '<nav class="zl-static-links sr-only" aria-label="全站页面列表">' + list + '</nav>\n</body>');
        }
    }
    const inject = faviconLine + THEME_EARLY + '\n' + PWA + '\n' + ogBlock + '\n' + COMMON_CSS + '\n' + COMMON_JS + '\n' + (hasOwnTheme ? '' : THEME_JS + '\n') + ZL_JS + '\n' + SEARCH_INDEX_TAG(P);
    if (/<\/head>/i.test(html)) {
        return html.replace(/<\/head>/i, inject + '\n</head>');
    }
    if (/<body[^>]*>/i.test(html)) {
        return html.replace(/<body[^>]*>/i, '<head>' + inject + '</head>\n' + COMMON_JS + '\n$&');
    }
    return inject + '\n' + COMMON_JS + '\n' + html;
}

/**
 * V2.8 阶段2：javascript-obfuscator 强混淆核心。
 * 约定（均为踩坑结论，勿动）：
 *   - renameGlobals: false——内联事件属性（onclick="foo()"）依赖全局原名，改名即 ReferenceError；
 *     顶层 function 声明保持顶层，配合 autoAttachGlobals 的 window 挂载语义不变。
 *   - debugProtection: false——开啟后控制台循环锁死，卡死页排查曾付出整晚代价。
 *   - 大脚本（>100KB）控制流压平阈值减半，防止全能-文件保存这类重页启动明显变慢。
 * 单脚本混淆失败回退 base64+escape 老方案并告警，构建不中断。
 */
const OBF_COMMENT = '/*ZL-OBF-V2*/';
function strongObfuscate(jsCode) {
    const prepared = autoAttachGlobals(jsCode);
    const heavy = prepared.length > 100 * 1024;
    /* V2.9.7（2B 混淆分级）：小脚本（<8KB）跳过控制流压平/数字表达式变换/selfDefending，
       字符串数组阈值降到 0.35 —— 解析与执行开销大幅下降（此前小脚本也吃全套强混淆，
       是全站 TBT 偏高与偶发卡顿的主因之一）。大脚本阈值维持 0.25。 */
    const tiny = prepared.length < 8 * 1024;
    try {
        const result = JavaScriptObfuscator.obfuscate(prepared, {
            compact: true,
            selfDefending: !tiny,
            stringArray: true,
            stringArrayRotate: !tiny,
            stringArrayShuffle: true,
            stringArrayEncoding: tiny ? [] : ['base64'],
            stringArrayThreshold: tiny ? 0.35 : 1,
            controlFlowFlattening: !tiny,
            controlFlowFlatteningThreshold: tiny ? 0 : (heavy ? 0.25 : 0.5),
            identifierNamesGenerator: 'hexadecimal',
            numbersToExpressions: !tiny,
            renameGlobals: false,
            target: 'browser',
            debugProtection: false,
            disableConsoleOutput: false,
            unicodeEscapeSequence: false
        }).getObfuscatedCode();
        return OBF_COMMENT + '\n' + result;
    } catch (err) {
        console.warn(`[混淆] 强混淆失败，回退 base64 方案：${String(err.message).slice(0, 120)}`);
        const encoded = utf8ToBase64(prepared);
        return OBF_COMMENT + '\n' +
            `eval(function(_0x1){var _0x2=function(_0x3){return _0x3};return eval(decodeURIComponent(escape(atob(_0x2(_0x1)))))})("${encoded}");`;
    }
}

function obfuscateFile(fileName) {
    const src = path.join(ROOT, SOURCE_DIR, fileName);
    const dir = outDir(fileName);
    const dst = path.join(dir, fileName);

    if (!fs.existsSync(src)) {
        return { file: fileName, status: 'skip', reason: '源文件不存在' };
    }
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    let content = fs.readFileSync(src, 'utf-8');

    // 1. 注入 PWA 块 + SEO/OG + 公共脚本引用（相对前缀按输出位置决定）
    content = ensurePwaBlock(content, fileName);
    // 2. 首页留根、业务页在 pages/：统一修正 index.html 引用层级
    content = fixHomePath(content, fileName);
    // 2.5 V2.9.7 治理后处理：表单标签 / 图标 aria / 懒加载 / webp 引用
    content = postProcessPage(content, fileName);

    // 3. 不混淆的文件直接写回
    if (NO_OBFUSCATE.includes(fileName)) {
        fs.writeFileSync(dst, content, 'utf-8');
        return { file: fileName, status: 'copy' };
    }

    // 4. P0-2：不再整页跳过——含已混淆标记的脚本仅跳过该脚本本身，其余业务脚本照常混淆
    // V2.9：带 data-no-obf 属性的同步小脚本（THEME_EARLY）跳过混淆，防概率性死循环
    const scriptRegex = /(<script(?![^>]*\bsrc=)[^>]*>)([\s\S]*?)(<\/script>)/gi;
    let matchCount = 0;
    const newContent = content.replace(scriptRegex, (match, openTag, jsCode, closeTag) => {
        if (!jsCode || jsCode.trim().length === 0) return match;
        if (jsCode.includes(OBF_COMMENT)) return match; // 已混淆脚本跳过，避免二次混淆
        if (/\bdata-no-obf\b/i.test(openTag)) return match; // V2.9：显式声明不混淆
        matchCount++;
        return openTag + '\n' + strongObfuscate(jsCode) + '\n' + closeTag;
    });

    if (matchCount > 0) {
        fs.writeFileSync(dst, newContent, 'utf-8');
        return { file: fileName, status: 'obfuscated', scripts: matchCount };
    }

    fs.writeFileSync(dst, newContent, 'utf-8');
    return { file: fileName, status: 'no-script' };
}

function runPreCheck(fileName, content, isNoObfuscate) {
    const issues = preCheck(fileName, content);
    if (issues.length === 0) {
        console.log(`[预检] ${fileName} ✓ 通过（无硬编码灰阶/未接入体系问题）`);
        return true;
    }
    let fail = false;
    for (const it of issues) {
        const mark = it.level === 'FAIL' ? '✗' : (it.level === 'HIGH' ? '!' : '·');
        console.log(`[预检] ${fileName} ${mark} [${it.level}] ${it.msg}`);
        if (it.level === 'FAIL') fail = true;
    }
    if (!fail) console.log(`[预检] ${fileName} 存在 ${issues.length} 条告警（HIGH/WARN 不拦截，需人工确认）`);
    else console.log(`[预检] ${fileName} ✗ 存在 FAIL，构建已拦截`);
    return !fail;
}

function main() {
    const args = process.argv.slice(2);

    // V1.9.5：--check 全量静态预检模式（不构建，仅读源文件扫描）
    if (args.length === 1 && args[0] === '--check') {
        console.log('========================================');
        console.log('  混淆工具 - 全量可读性静态预检（b 方案）');
        console.log('========================================\n');
        const srcDir = path.join(ROOT, SOURCE_DIR);
        const srcFiles = fs.existsSync(srcDir) ? fs.readdirSync(srcDir).filter(f => f.endsWith('.html')) : [];
        if (srcFiles.length === 0) {
            console.error('源目录为空，无文件可预检');
            process.exit(1);
        }
        let failCount = 0, warnCount = 0;
        for (const f of srcFiles) {
            const src = path.join(ROOT, SOURCE_DIR, f);
            try {
                let content = fs.readFileSync(src, 'utf-8');
                content = ensurePwaBlock(content, f); // 模拟构建后内容（注入公共脚本引用）
                const ok = runPreCheck(f, content, NO_OBFUSCATE.includes(f));
                if (!ok) failCount++;
                else if (preCheck(f, content).length > 0) warnCount++;
            } catch (e) {
                console.error(`[预检失败] ${f} - ${e.message}`);
                failCount++;
            }
        }
        console.log('\n========================================');
        console.log(`  预检完成：FAIL ${failCount} 个文件，告警 ${warnCount} 个文件（其余通过）`);
        console.log('========================================');
        process.exit(failCount > 0 ? 1 : 0);
    }

    let files;
    if (args.length > 0) {
        files = args.filter(a => a.endsWith('.html'));
        if (files.length === 0) {
            console.error('参数错误：请指定 .html 文件名');
            process.exit(1);
        }
    } else {
        files = fs.readdirSync(path.join(ROOT, SOURCE_DIR)).filter(f => f.endsWith('.html'));
    }

    console.log('========================================');
    console.log(`  混淆工具 - 处理 ${files.length} 个文件`);
    console.log('========================================\n');

    // V2.9.3 分层：公共脚本输出到 assets/js/
    const ASSETS = { js: path.join(ROOT, 'assets', 'js'), css: path.join(ROOT, 'assets', 'css') };
    fs.mkdirSync(ASSETS.js, { recursive: true });
    fs.mkdirSync(ASSETS.css, { recursive: true });
    fs.writeFileSync(path.join(ASSETS.js, 'common.js'), ANTI_CHEAT_CODE + SW_REGISTER_CODE + SW_UPDATE_CODE + JUMP_ANIM_CODE + ERROR_LOG_CODE + SEARCH_CODE, 'utf-8');
    console.log('[公共] assets/js/common.js 已刷新（防小白 + SW注册 + 更新提示 + 错误日志 + 全站搜索）\n');

    // P0-4：17-data.js 随构建同步（防"改源不发布"）
    const dataSrc = path.join(ROOT, SOURCE_DIR, '17-data.js');
    if (fs.existsSync(dataSrc)) {
        fs.copyFileSync(dataSrc, path.join(ASSETS.js, '17-data.js'));
        console.log('[公共] assets/js/17-data.js 已同步');
    }
    // V2.9.3 分层：页面专属资源目录随构建复制到 assets/
    [['images', 'assets/images'], ['23data', 'assets/23data'], ['audio', 'assets/audio'], ['看看作业', 'assets/看看作业']].forEach(function (pair) {
        const srcDir = path.join(ROOT, SOURCE_DIR, pair[0]);
        const dstDir = path.join(ROOT, pair[1]);
        if (fs.existsSync(srcDir)) {
            fs.cpSync(srcDir, dstDir, { recursive: true });
            console.log('[公共] ' + pair[1] + '/ 已同步');
        }
    });
    // V2.9.3 分层：四站资源复制到 assets/{af,cy,xd,ai}/ 与 assets/js|css/
    const STATION_DIR = function (f) {
        if (f.startsWith('af-')) return 'af';
        if (f.startsWith('cy-')) return 'cy';
        if (f.startsWith('xd-')) return 'xd';
        if (f.startsWith('ai-')) return 'ai';
        return '';
    };
    const STATION_FILE_DIR = function (f) {
        if (/\.css$/.test(f)) return 'css';
        if (/\.js$/.test(f)) return 'js';
        return STATION_DIR(f);
    };
    fs.readdirSync(path.join(ROOT, SOURCE_DIR)).filter(function (f) {
        return /^(xd-|cy-|ai-|af-)/.test(f);
    }).forEach(function (f) {
        const src = path.join(ROOT, SOURCE_DIR, f);
        const sub = STATION_FILE_DIR(f);
        const dstDir = path.join(ROOT, 'assets', sub);
        fs.mkdirSync(dstDir, { recursive: true });
        const dst = path.join(dstDir, f);
        if (fs.statSync(src).isDirectory()) {
            fs.cpSync(src, dst, { recursive: true });
        } else {
            fs.copyFileSync(src, dst);
        }
    });
    console.log('[公共] 四站资源已同步到 assets/');
    // V2.9.3 分层：源区根级公共 js/css（theme/zl-*/cy-*/xd-common/17-data 等）统一同步到 assets/js|css
    fs.readdirSync(path.join(ROOT, SOURCE_DIR)).filter(function (f) { return /\.js$/i.test(f); }).forEach(function (f) {
        fs.copyFileSync(path.join(ROOT, SOURCE_DIR, f), path.join(ASSETS.js, f));
    });
    fs.readdirSync(path.join(ROOT, SOURCE_DIR)).filter(function (f) { return /\.css$/i.test(f); }).forEach(function (f) {
        fs.copyFileSync(path.join(ROOT, SOURCE_DIR, f), path.join(ASSETS.css, f));
    });
    console.log('[公共] 源区根级 js/css 已同步到 assets/');

    // V2.9.7（1C/4B/6A）：共享 JS 压缩 → OG 分享图 → 图片转 WebP → 载入 webp 集合（供页面引用改写）
    runHelper('_压缩共享js.js');
    runHelper('_生成og图片.js');
    runHelper('_图片转webp.js');
    loadWebpSet();

    // P1-10：构建时从 ZL.PAGES 生成 sitemap.xml
    genSitemap();

    let obf = 0, copy = 0, skip = 0;
    let preCheckBlocked = 0;
    for (const f of files) {
        try {
            // V1.9.5：构建前可读性预检（b 方案）——FAIL 拦截构建
            const srcPath = path.join(ROOT, SOURCE_DIR, f);
            if (fs.existsSync(srcPath)) {
                let srcContent = fs.readFileSync(srcPath, 'utf-8');
                srcContent = ensurePwaBlock(srcContent, f);
                if (!runPreCheck(f, srcContent, NO_OBFUSCATE.includes(f))) {
                    preCheckBlocked++;
                    console.error(`[拦截] 跳过 ${f}：可读性预检 FAIL，修复后重新构建\n`);
                    continue;
                }
            }
            const r = obfuscateFile(f);
            if (r.status === 'obfuscated') {
                console.log(`[混淆] ${f} (${r.scripts} 个 script)`);
                obf++;
            } else if (r.status === 'copy') {
                console.log(`[复制] ${f} (不混淆)`);
                copy++;
            } else if (r.status === 'no-script') {
                console.log(`[写入] ${f} (无内联script)`);
                copy++;
            } else if (r.status === 'already-obfuscated') {
                console.log(`[已混淆] ${f} (跳过)`);
                copy++;
            } else {
                console.log(`[跳过] ${f} - ${r.reason}`);
                skip++;
            }
        } catch (e) {
            console.error(`[失败] ${f} - ${e.message}`);
            skip++;
        }
    }

    console.log('\n========================================');
    console.log(`  完成：混淆 ${obf}，复制/写入 ${copy}，跳过/失败 ${skip}`);
    if (preCheckBlocked > 0) console.log(`  预检拦截：${preCheckBlocked} 个文件（需修复后重新构建）`);
    console.log('========================================');
    // V2.9.7（7B）：全站搜索索引（基于构建产物，pages/*.html + index）
    genSearchIndex();
    // P1-9：主题三方对齐断言（不拦截，仅提示）
    checkThemeConsistency();
    // M4：Service Worker 缓存版本随构建自动递增——公共层/页面更新后构建即发布，
    // 防"改了文件但 SW 缓存优先导致用户一直拿旧版"回归
    bumpServiceWorker();
    // M4：全量冒烟自检（源码级模拟浏览器执行全部内联脚本，捕捉加载期崩溃；失败置 exitCode）
    runSmokeTest();
    // V2.0：主题变量化审计提示（治理依据，不拦截）
    checkThemeAudit();
    if (preCheckBlocked > 0) process.exitCode = 1;
}

/* M4：冒烟自检——逐页执行内联脚本，任何页崩溃即提示（不阻断产物生成） */
function runSmokeTest() {
    const smokePath = path.join(__dirname, '_冒烟自检.js');
    if (!fs.existsSync(smokePath)) return;
    try {
        const r = cp.execSync('node ' + JSON.stringify(smokePath), { stdio: 'pipe', encoding: 'utf-8', timeout: 120000 });
        process.stdout.write(r);
    } catch (e) {
        const out = (e.stdout || '') + (e.stderr || '');
        process.stdout.write(out);
        console.log('[冒烟] 有页面自检失败（见上），请修复后重新构建！');
        process.exitCode = 1;
    }
}

/* M4：SW 缓存版本自动 bump（CACHE_NAME zhaolezi-vN → vN+1，顶部补注释行） */
function bumpServiceWorker() {
    const swPath = path.join(ROOT, 'service-worker.js');
    if (!fs.existsSync(swPath)) return;
    let sw;
    try { sw = fs.readFileSync(swPath, 'utf-8'); } catch (e) { return; }
    const m = sw.match(/zhaolezi-v(\d+)/);
    if (!m) return;
    const nv = +m[1] + 1;
    const d = new Date();
    const date = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    sw = sw.replace(/zhaolezi-v\d+/, 'zhaolezi-v' + nv);
    sw = sw.replace(/(const CACHE_NAME = 'zhaolezi-v\d+';)/, '// V' + nv + '：' + date + ' 自动构建（公共层/页面更新，缓存随构建递增）\n$1');
    try { fs.writeFileSync(swPath, sw); console.log('[缓存] service-worker.js 已自动升版 V' + nv + '（构建即发布）'); }
    catch (e) { console.log('[缓存] service-worker.js 升版失败：' + e.message); }
}

main();
