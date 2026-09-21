/**
 * 网站混淆工具 v2 - 防小白保护 + JS混淆 + PWA块自动同步
 *
 * 用法：
 *   node _混淆工具.js                  # 全量：从 _原始未混淆版 混淆/复制所有文件到根目录
 *   node _混淆工具.js index.html 5.html # 只处理指定文件（参数为相对 _原始未混淆版 的文件名）
 *   node _混淆工具.js 恢复             # 将 _原始未混淆版 的文件复制回根目录（不混淆，用于本地调试源码）
 *
 * 设计：
 *   - 源文件在 _原始未混淆版/，产物在根目录
 *   - 每次混淆前自动确保 <head> 里有标准 PWA 块（manifest/theme-color/横屏CSS），没有就注入
 *   - 输出确定性：同一源文件永远产出同一字节，不会产生无意义 diff
 *   - 30.html 和 文件搜索.html 不混淆，直接复制
 *
 * 重要：改网站请只改 _原始未混淆版/ 里的文件，不要手改根目录的 HTML！
 */

const fs = require('fs');
const path = require('path');

const SOURCE_DIR = '_原始未混淆版';
const ROOT = __dirname;
// 不混淆、直接复制的文件
const NO_OBFUSCATE = ['30.html', '文件搜索.html'];
// 需要处理的全部 HTML（index + 1..30 + 文件搜索）
const ALL_FILES = ['index.html', '文件搜索.html', ...Array.from({ length: 30 }, (_, i) => `${i + 1}.html`)];

// 标准 PWA 块：注入到 </head> 之前
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

// 防小白保护代码（注入到每个内联 script 的开头）
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
    _0x3.innerHTML='<div data-a="paste" style="display:flex;justify-content:space-between;align-items:center;height:28px;padding:0 20px;cursor:pointer;color:#fff;line-height:28px;">粘贴<span style="color:#888;font-size:12px;">Ctrl+V</span></div><div data-a="cut" style="display:flex;justify-content:space-between;align-items:center;height:28px;padding:0 20px;cursor:pointer;color:#fff;line-height:28px;">剪切<span style="color:#888;font-size:12px;">Ctrl+X</span></div><div data-a="copy" style="display:flex;justify-content:space-between;align-items:center;height:28px;padding:0 20px;cursor:pointer;color:#fff;line-height:28px;">复制<span style="color:#888;font-size:12px;">Ctrl+C</span></div><div data-a="selectall" style="display:flex;justify-content:space-between;align-items:center;height:28px;padding:0 20px;cursor:pointer;color:#fff;line-height:28px;">全选<span style="color:#888;font-size:12px;">Ctrl+A</span></div><div data-a="refresh" style="display:flex;justify-content:space-between;align-items:center;height:28px;padding:0 20px;cursor:pointer;color:#fff;line-height:28px;">刷新<span style="color:#888;font-size:12px;">F5</span></div>';
    _0x1.body.appendChild(_0x3);
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
        _0x1.focus();ta.select();
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
                try{_0x1.execCommand('selectAll');}catch(e){
                    var range=_0x1.createRange();
                    range.selectNodeContents(_0x1.body);
                    var sel=window.getSelection();
                    sel.removeAllRanges();
                    sel.addRange(range);
                }
            }
        }else if(a==='refresh'){
            location.reload();
        }
    });
    _0x1.addEventListener('keydown',function(_0x8){
        var _0x9=_0x8.keyCode||_0x8.which;
        var _allowed = (_0x8.ctrlKey && (_0x9===86 || _0x9===67 || _0x9===88 || _0x9===65)) || _0x9===116;
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

function utf8ToBase64(str) {
    return Buffer.from(str, 'utf-8').toString('base64');
}

/**
 * 确保 HTML 内容里有 PWA 块。如果没有，插到 </head> 前。
 * 直接返回新内容；如果已有则原样返回。
 */
function ensurePwaBlock(html) {
    if (html.includes('rel="manifest"') && html.includes('orientation: landscape')) {
        return html; // 已有完整 PWA 块
    }
    if (/<\/head>/i.test(html)) {
        return html.replace(/<\/head>/i, PWA_BLOCK + '\n</head>');
    }
    // 没有 </head>，硬加在 <body 之前
    if (/<body[^>]*>/i.test(html)) {
        return html.replace(/<body[^>]*>/i, '<head>' + PWA_BLOCK + '</head>\n$&');
    }
    return PWA_BLOCK + '\n' + html;
}

/**
 * 混淆单个 HTML 文件：从源目录读，输出到根目录。
 */
function obfuscateFile(fileName) {
    const src = path.join(ROOT, SOURCE_DIR, fileName);
    const dst = path.join(ROOT, fileName);

    if (!fs.existsSync(src)) {
        return { file: fileName, status: 'skip', reason: '源文件不存在' };
    }

    let content = fs.readFileSync(src, 'utf-8');

    // 1. 注入 PWA 块（如果缺）
    content = ensurePwaBlock(content);

    // 2. 不混淆的文件直接写回
    if (NO_OBFUSCATE.includes(fileName)) {
        fs.writeFileSync(dst, content, 'utf-8');
        return { file: fileName, status: 'copy' };
    }

    // 3. 安全检查：已经混淆过的不再二次混淆
    if (content.includes('eval(function(_0x1){var _0x2=function(_0x3)')) {
        fs.writeFileSync(dst, content, 'utf-8');
        return { file: fileName, status: 'already-obfuscated' };
    }

    // 4. 内联 script 混淆
    const scriptRegex = /(<script(?![^>]*\bsrc=)[^>]*>)([\s\S]*?)(<\/script>)/gi;
    let matchCount = 0;
    const newContent = content.replace(scriptRegex, (match, openTag, jsCode, closeTag) => {
        if (!jsCode || jsCode.trim().length === 0) return match;
        matchCount++;
        const fullJS = ANTI_CHEAT_CODE + '\n' + jsCode;
        const encoded = utf8ToBase64(fullJS);
        const obfuscatedJS = `eval(function(_0x1){var _0x2=function(_0x3){return _0x3};return eval(decodeURIComponent(escape(atob(_0x2(_0x1)))))})("${encoded}");`;
        return openTag + '\n' + obfuscatedJS + '\n' + closeTag;
    });

    if (matchCount > 0) {
        fs.writeFileSync(dst, newContent, 'utf-8');
        return { file: fileName, status: 'obfuscated', scripts: matchCount };
    }
    // 没有内联 script，原样写回（但已注入 PWA 块）
    fs.writeFileSync(dst, content, 'utf-8');
    return { file: fileName, status: 'no-script' };
}

/**
 * 从备份恢复：把 _原始未混淆版 的文件原样复制回根目录（不混淆）。
 */
function restoreFromBackup() {
    const srcDir = path.join(ROOT, SOURCE_DIR);
    if (!fs.existsSync(srcDir)) {
        console.error('错误：未找到 ' + SOURCE_DIR);
        process.exit(1);
    }
    let count = 0;
    for (const f of fs.readdirSync(srcDir)) {
        if (!f.endsWith('.html')) continue;
        const s = path.join(srcDir, f);
        const d = path.join(ROOT, f);
        fs.copyFileSync(s, d);
        count++;
    }
    console.log(`已从 ${SOURCE_DIR} 恢复 ${count} 个未混淆文件到根目录（本地调试用）`);
}

function main() {
    const args = process.argv.slice(2);

    if (args[0] === '恢复' || args[0] === 'restore') {
        restoreFromBackup();
        return;
    }

    // 确定要处理的文件列表
    let files;
    if (args.length > 0) {
        files = args.filter(a => a.endsWith('.html'));
        if (files.length === 0) {
            console.error('参数错误：请指定 .html 文件名，例如 node _混淆工具.js index.html 5.html');
            process.exit(1);
        }
    } else {
        files = ALL_FILES;
    }

    console.log('========================================');
    console.log(`  混淆工具 v2 - 处理 ${files.length} 个文件`);
    console.log('========================================\n');

    let obf = 0, copy = 0, skip = 0;
    for (const f of files) {
        try {
            const r = obfuscateFile(f);
            if (r.status === 'obfuscated') {
                console.log(`[混淆] ${f} (${r.scripts} 个 script)`);
                obf++;
            } else if (r.status === 'copy') {
                console.log(`[复制] ${f} (不混淆)`);
                copy++;
            } else if (r.status === 'no-script') {
                console.log(`[写入] ${f} (无内联script，仅同步PWA块)`);
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
    console.log('========================================');
}

main();
