/**
 * 网站混淆工具 - 批量给HTML文件添加防小白保护和JS混淆
 * 
 * 功能：
 * 1. 禁用右键菜单
 * 2. 禁用F12、Ctrl+Shift+I、Ctrl+U、Ctrl+S等快捷键
 * 3. 内联JS代码Base64编码混淆（eval解码执行）
 * 
 * 使用方法：
 *   node _混淆工具.js          # 从 _原始未混淆版 读取源码，混淆后输出到根目录
 *   node _混淆工具.js 恢复     # 将 _原始未混淆版 的源码复制回根目录（覆盖混淆文件）
 * 
 * 重要：修改网站时请【只修改】 _原始未混淆版 文件夹中的文件，千万不要手动修改根目录下的HTML！
 */

const fs = require('fs');
const path = require('path');

// 配置
const TARGET_FILES = ['index.html', ...Array.from({length: 29}, (_, i) => `${i + 1}.html`)];
const SOURCE_DIR = '_原始未混淆版'; // 源码存放目录

// 防小白保护代码（和原先保持一致，用于注入到每个JS的开头）
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
                try{_0x1.execCommand('selectAll');}catch(err){
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

/**
 * UTF-8字符串转Base64（Node.js端）
 */
function utf8ToBase64(str) {
    return Buffer.from(str, 'utf-8').toString('base64');
}

/**
 * 混淆单个HTML文件（从源目录读取，输出到目标目录）
 */
function obfuscateFile(sourcePath, targetPath) {
    const content = fs.readFileSync(sourcePath, 'utf-8');
    
    // 【新增】安全检查：如果文件已经被混淆过，跳过以防套娃
    if (content.includes('eval(function(_0x1){var _0x2=function(_0x3)')) {
        return { success: false, scripts: 0, reason: '文件已混淆，跳过以防重复混淆' };
    }

    // 匹配所有内联script标签（排除外部src引用）
    const scriptRegex = /(<script(?![^>]*\bsrc=)[^>]*>)([\s\S]*?)(<\/script>)/gi;
    
    let matchCount = 0;
    const newContent = content.replace(scriptRegex, (match, openTag, jsCode, closeTag) => {
        // 跳过空script
        if (!jsCode || jsCode.trim().length === 0) {
            return match;
        }
        
        matchCount++;
        
        // 合并防小白代码 + 原始JS
        const fullJS = ANTI_CHEAT_CODE + '\n' + jsCode;
        
        // Base64编码（UTF-8）
        const encoded = utf8ToBase64(fullJS);
        
        // 生成混淆后的代码：eval解码执行
        const obfuscatedJS = `eval(function(_0x1){var _0x2=function(_0x3){return _0x3};return eval(decodeURIComponent(escape(atob(_0x2(_0x1)))))})("${encoded}");`;
        
        return openTag + '\n' + obfuscatedJS + '\n' + closeTag;
    });
    
    if (matchCount > 0) {
        // 写入到目标路径（根目录），不覆盖源文件
        fs.writeFileSync(targetPath, newContent, 'utf-8');
        return { success: true, scripts: matchCount };
    }
    return { success: false, scripts: 0, reason: '未找到内联script标签' };
}

/**
 * 从备份恢复（将 _原始未混淆版 的文件复制回根目录，覆盖混淆文件）
 */
function restoreFromBackup() {
    const backupDir = path.join(__dirname, SOURCE_DIR);
    if (!fs.existsSync(backupDir)) {
        console.log('错误：未找到备份文件夹 ' + SOURCE_DIR);
        return;
    }
    
    let count = 0;
    for (const file of TARGET_FILES) {
        const src = path.join(backupDir, file);
        const dst = path.join(__dirname, file);
        if (fs.existsSync(src)) {
            fs.copyFileSync(src, dst);
            count++;
        }
    }
    console.log(`已从 ${SOURCE_DIR} 恢复 ${count} 个文件到根目录`);
}

/**
 * 主函数
 */
function main() {
    const args = process.argv.slice(2);
    
    if (args[0] === '恢复' || args[0] === 'restore') {
        restoreFromBackup();
        return;
    }
    
    console.log('========================================');
    console.log('  网站混淆工具 - 防小白 + JS混淆 (安全分离版)');
    console.log('========================================\n');
    
    // 【新增】确保源目录存在
    const sourceDirPath = path.join(__dirname, SOURCE_DIR);
    if (!fs.existsSync(sourceDirPath)) {
        fs.mkdirSync(sourceDirPath);
        console.log(`[提示] 未找到 ${SOURCE_DIR} 文件夹，已自动创建。`);
        console.log(`[重要] 请把你的纯源码文件（如 index.html）放入 ${SOURCE_DIR} 文件夹中，然后重新运行本脚本！\n`);
        return;
    }
    
    let success = 0;
    let failed = 0;
    const results = [];
    
    for (const file of TARGET_FILES) {
        const sourcePath = path.join(sourceDirPath, file); // 从备份读取
        const targetPath = path.join(__dirname, file);       // 输出到根目录
        
        if (!fs.existsSync(sourcePath)) {
            console.log(`[跳过] ${file} - 源文件不存在于 ${SOURCE_DIR}`);
            failed++;
            continue;
        }
        
        try {
            const result = obfuscateFile(sourcePath, targetPath);
            if (result.success) {
                const sizeKB = (fs.statSync(targetPath).size / 1024).toFixed(1);
                console.log(`[成功] ${file} - 混淆 ${result.scripts} 个script (输出至根目录, ${sizeKB}KB)`);
                success++;
                results.push({ file, scripts: result.scripts, size: sizeKB });
            } else {
                console.log(`[跳过] ${file} - ${result.reason}`);
                failed++;
            }
        } catch (err) {
            console.log(`[失败] ${file} - ${err.message}`);
            failed++;
        }
    }
    
    console.log('\n========================================');
    console.log(`  完成：成功 ${success} 个，失败/跳过 ${failed} 个`);
    console.log('========================================');
    console.log('\n提示：');
    console.log(`  1. 原始文件请务必修改 ${SOURCE_DIR} 文件夹中的文件！`);
    console.log(`  2. 修改完成后，运行 node _混淆工具.js 会自动将混淆结果输出到根目录。`);
    console.log(`  3. 如果需要本地测试未混淆版本，可以运行 node _混淆工具.js 恢复，将源码复制回根目录。`);
}

main();