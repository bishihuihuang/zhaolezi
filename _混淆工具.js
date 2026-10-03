/**
 * 网站混淆工具
 *
 * 用法：
 *   node _混淆工具.js                  # 全量：从 _原始未混淆版 混淆所有文件到根目录
 *   node _混淆工具.js 1.html 5.html   # 只处理指定文件
 *
 * 功能：
 *   - 从 _原始未混淆版/ 读源文件，混淆后输出到根目录
 *   - 自动注入 PWA 块（manifest/theme-color/横屏CSS）到 </head> 前
 *   - 自动刷新公共防小白脚本 common.js，并在页面注入 <script src="common.js">
 *   - 30.html 和 文件搜索.html 不混淆，直接复制
 */

const fs = require('fs');
const path = require('path');

const SOURCE_DIR = '_原始未混淆版';
const ROOT = __dirname;
const NO_OBFUSCATE = ['30.html', '文件搜索.html'];

const PWA_BLOCK = `
<!-- PWA支持 -->
<link rel="manifest" href="manifest.json">
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
`;

// PWA：Service Worker 注册（全部页面经 common.js 统一注册）
const SW_REGISTER_CODE = `

/* Service Worker 注册（离线缓存支持） */
(function(){
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function() {
            navigator.serviceWorker.register('service-worker.js').catch(function(err){});
        });
    }
})();
`;

function utf8ToBase64(str) {
    return Buffer.from(str, 'utf-8').toString('base64');
}

/**
 * 自动全局挂载：扫描脚本内的 function 声明，在混淆载荷中追加 window.xxx 挂载。
 * 背景：混淆模板用 direct eval 执行，function 声明不会进入全局作用域，
 * 导致 HTML 内联事件属性（onclick="foo()"）按全局查找失败（ReferenceError）。
 * 该函数恢复未混淆时代的全局语义，且对 window 已存在的内置属性安全跳过。
 */
function autoAttachGlobals(jsCode) {
    const names = new Set();
    // 匹配 function 声明（行首或语句起始处，兼容缩进），跳过已显式挂载的
    const fnRe = /(?:^|[\n;])\s*function\s+([A-Za-z_$][\w$]*)\s*\(/g;
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
        // 运行时判断：window 已存在该属性（内置全局对象等）则不覆盖
        lines.push("if(!('" + n + "' in window))window." + n + "=" + n + ";");
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
    const colorRe = /color\s*:\s*(#[0-9a-fA-F]{3}|#[0-9a-fA-F]{6}|rgba?\([^)]*\))/g;
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

function ensurePwaBlock(html, fileName) {
    const COMMON_CSS = '<link rel="stylesheet" href="common.css">';
    const COMMON_JS = '<script src="common.js"></script>';
    const THEME_JS = '<script src="theme.js"></script>';
    const ZL_JS = '<script src="zl-features.js"></script>';
    if (html.includes('rel="manifest"') && html.includes('orientation: landscape') && html.includes('src="common.js"') && html.includes('src="zl-features.js"') && html.includes('href="common.css"')) {
        return html;
    }
    // 统一 head 元信息：SEO description + Open Graph（#7 优化）
    const titleMatch = /<title>([^<]*)<\/title>/i.exec(html);
    const pageTitle = titleMatch ? titleMatch[1].trim() : '找乐子';
    // V2：标题已含"找乐子"前缀时不再重复拼接，避免出现"找乐子——找乐子——"叠词
    const pageDesc = pageTitle.indexOf('找乐子') >= 0
        ? pageTitle + '｜趣味工具与小游戏合集'
        : '找乐子——' + pageTitle + '，趣味工具与小游戏合集';
    // V2：主题预执行，消除首帧闪色（FOUC）——在 CSS/JS 加载前先恢复用户主题
    const THEME_EARLY = '<script>try{var _zt=localStorage.getItem("zl_theme");var _zok=["dark","blue","gold","light","milk","guofeng","snowsun","cyber","aurora","custom"];if(_zt&&_zok.indexOf(_zt)>=0){document.documentElement.setAttribute("data-theme",_zt);}}catch(e){}</script>';
    const ogBlock = '\n<!-- SEO/分享元信息 -->\n' +
        '<meta name="description" content="' + pageDesc + '">\n' +
        '<meta property="og:title" content="' + pageTitle + '">\n' +
        '<meta property="og:description" content="' + pageDesc + '">\n' +
        '<meta property="og:type" content="website">\n' +
        '<meta property="og:site_name" content="找乐子">\n' +
        '<meta property="og:url" content="https://bishihuihuang.github.io/zhaolezi/' + (fileName || 'index.html') + '">\n';
    const inject = THEME_EARLY + '\n' + PWA_BLOCK + '\n' + ogBlock + '\n' + COMMON_CSS + '\n' + COMMON_JS + '\n' + THEME_JS + '\n' + ZL_JS;
    if (/<\/head>/i.test(html)) {
        return html.replace(/<\/head>/i, inject + '\n</head>');
    }
    if (/<body[^>]*>/i.test(html)) {
        return html.replace(/<body[^>]*>/i, '<head>' + inject + '</head>\n' + COMMON_JS + '\n$&');
    }
    return inject + '\n' + COMMON_JS + '\n' + html;
}

function obfuscateFile(fileName) {
    const src = path.join(ROOT, SOURCE_DIR, fileName);
    const dst = path.join(ROOT, fileName);

    if (!fs.existsSync(src)) {
        return { file: fileName, status: 'skip', reason: '源文件不存在' };
    }

    let content = fs.readFileSync(src, 'utf-8');

    // 1. 注入 PWA 块 + SEO/OG + 公共脚本引用
    content = ensurePwaBlock(content, fileName);

    // 2. 不混淆的文件直接写回
    if (NO_OBFUSCATE.includes(fileName)) {
        fs.writeFileSync(dst, content, 'utf-8');
        return { file: fileName, status: 'copy' };
    }

    // 3. 安全检查：已经混淆过的不再二次混淆
    if (content.includes('eval(function(_0x1){var _0x2=function(_0x3){return _0x3}')) {
        fs.writeFileSync(dst, content, 'utf-8');
        return { file: fileName, status: 'already-obfuscated' };
    }

    // 4. 内联 script 混淆（防小白已外置到 common.js，此处只混淆业务脚本）
    const scriptRegex = /(<script(?![^>]*\bsrc=)[^>]*>)([\s\S]*?)(<\/script>)/gi;
    let matchCount = 0;
    const newContent = content.replace(scriptRegex, (match, openTag, jsCode, closeTag) => {
        if (!jsCode || jsCode.trim().length === 0) return match;
        matchCount++;
        const encoded = utf8ToBase64(autoAttachGlobals(jsCode));
        const obfuscatedJS = `eval(function(_0x1){var _0x2=function(_0x3){return _0x3};return eval(decodeURIComponent(escape(atob(_0x2(_0x1)))))})("${encoded}");`;
        return openTag + '\n' + obfuscatedJS + '\n' + closeTag;
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
        const srcFiles = fs.existsSync(SOURCE_DIR) ? fs.readdirSync(SOURCE_DIR).filter(f => f.endsWith('.html')) : [];
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
        files = fs.readdirSync(SOURCE_DIR).filter(f => f.endsWith('.html'));
    }

    console.log('========================================');
    console.log(`  混淆工具 - 处理 ${files.length} 个文件`);
    console.log('========================================\n');

    // 公共脚本：每次混淆时刷新 common.js（防小白保护 + Service Worker 注册）
    fs.writeFileSync(path.join(ROOT, 'common.js'), ANTI_CHEAT_CODE + SW_REGISTER_CODE, 'utf-8');
    console.log('[公共] common.js 已刷新（防小白 + SW注册）\n');

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
    if (preCheckBlocked > 0) process.exitCode = 1;
}

main();
