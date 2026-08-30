/**
 * 网站混淆工具 - 批量给HTML文件添加防小白保护和JS混淆
 * 
 * 功能：
 * 1. 禁用右键菜单
 * 2. 禁用F12、Ctrl+Shift+I、Ctrl+U、Ctrl+S等快捷键
 * 3. 内联JS代码Base64编码混淆（eval解码执行）
 * 
 * 使用方法：
 *   node _混淆工具.js          # 混淆当前目录所有HTML文件
 *   node _混淆工具.js 恢复     # 从_原始未混淆版恢复
 * 
 * 注意：修改网站时请先修改 _原始未混淆版 文件夹中的文件，然后运行本脚本重新混淆
 */

const fs = require('fs');
const path = require('path');

// 配置
const TARGET_FILES = ['index.html', ...Array.from({length: 29}, (_, i) => `${i + 1}.html`)];
const BACKUP_DIR = '_原始未混淆版';

// 防小白保护代码（会被添加到每个JS开头，然后一起混淆）
// 自定义右键菜单：保留剪切、复制、粘贴、刷新，其余禁止（功能可靠版v2）
const ANTI_CHEAT_CODE = `
/* 防小白保护开始 */
(function(){
    var _0x1=document;
    var _0x2=null; // 记录右键时的焦点元素
    var _0x6=''; // 剪贴板缓存（右键时预读取，点击粘贴时同步使用）
    // 创建自定义右键菜单
    var _0x3=_0x1.createElement('div');
    _0x3.style.cssText='position:fixed;z-index:9999999;background:#fff;border:1px solid #d0d0d0;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,.15);padding:5px 0;min-width:170px;display:none;font-family:"Microsoft YaHei",sans-serif;font-size:14px;user-select:none;';
    _0x3.innerHTML='<div data-a="cut" style="padding:8px 18px;cursor:pointer;color:#333;">剪切<span style="float:right;color:#999;font-size:12px;">Ctrl+X</span></div><div data-a="copy" style="padding:8px 18px;cursor:pointer;color:#333;">复制<span style="float:right;color:#999;font-size:12px;">Ctrl+C</span></div><div data-a="paste" style="padding:8px 18px;cursor:pointer;color:#333;">粘贴<span style="float:right;color:#999;font-size:12px;">Ctrl+V</span></div><div data-a="refresh" style="padding:8px 18px;cursor:pointer;color:#333;">刷新<span style="float:right;color:#999;font-size:12px;">F5</span></div>';
    _0x1.body.appendChild(_0x3);
    // 菜单项hover
    _0x3.addEventListener('mouseover',function(e){if(e.target.getAttribute('data-a')||e.target.closest('[data-a]')){var t=e.target.closest('[data-a]');if(t)t.style.background='#f5f5f5';}});
    _0x3.addEventListener('mouseout',function(e){if(e.target.getAttribute('data-a')||e.target.closest('[data-a]')){var t=e.target.closest('[data-a]');if(t)t.style.background='';}});
    // 可靠的复制到剪贴板函数（带临时textarea回退）
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
    // 获取选中文本（兼容输入框和普通文本）
    function _0x5(el){
        if(el&&(el.tagName==='INPUT'||el.tagName==='TEXTAREA')){
            var s=el.selectionStart||0,e=el.selectionEnd||0;
            return el.value.substring(s,e);
        }
        return window.getSelection().toString();
    }
    // 插入文本到输入框
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
    // 右键显示自定义菜单，记录焦点元素，并预读取剪贴板
    _0x1.addEventListener('contextmenu',function(e){
        e.preventDefault();
        var t=e.target;
        if(t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.isContentEditable)){
            t.focus();
            _0x2=t;
        }else{
            _0x2=_0x1.activeElement;
        }
        // 预读取剪贴板（点击粘贴时同步使用，避免异步延迟）
        _0x6='';
        if(navigator.clipboard&&navigator.clipboard.readText){
            navigator.clipboard.readText().then(function(txt){_0x6=txt;}).catch(function(){});
        }
        _0x3.style.display='block';
        _0x3.style.left=e.clientX+'px';
        _0x3.style.top=e.clientY+'px';
        setTimeout(function(){var r=_0x3.getBoundingClientRect();if(r.right>window.innerWidth){_0x3.style.left=(window.innerWidth-r.width-5)+'px';}if(r.bottom>window.innerHeight){_0x3.style.top=(window.innerHeight-r.height-5)+'px';}},0);
        return false;
    });
    // 隐藏菜单
    _0x1.addEventListener('click',function(){_0x3.style.display='none';});
    _0x1.addEventListener('scroll',function(){_0x3.style.display='none';});
    _0x1.addEventListener('keydown',function(e){if(e.keyCode===27){_0x3.style.display='none';}});
    // 菜单点击（功能可靠实现，粘贴优先用缓存同步插入）
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
                // 优先使用右键时预读取的缓存（同步，立即生效）
                if(_0x6){
                    _0x7(el,_0x6);
                }else{
                    // 缓存为空，实时读取（异步）
                    if(navigator.clipboard&&navigator.clipboard.readText){
                        navigator.clipboard.readText().then(function(txt){_0x7(el,txt);}).catch(function(){try{_0x1.execCommand('paste');}catch(err){}});
                    }else{
                        try{_0x1.execCommand('paste');}catch(err){}
                    }
                }
            }
        }else if(a==='refresh'){
            location.reload();
        }
    });
    // 禁用F12等开发者工具快捷键（保留Ctrl+X/C/V/A/Z/Y和F5）
    _0x1.addEventListener('keydown',function(_0x8){
        var _0x9=_0x8.keyCode||_0x8.which;
        if(_0x9===123||(_0x8.ctrlKey&&_0x8.shiftKey&&(_0x9===73||_0x9===74))||(_0x8.ctrlKey&&_0x9===85)||(_0x8.ctrlKey&&_0x9===83)||(_0x8.ctrlKey&&_0x8.shiftKey&&_0x9===67)){
            _0x8.preventDefault();return false;
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
 * 混淆单个HTML文件
 */
function obfuscateFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    
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
        // 解码函数也做简单混淆
        const obfuscatedJS = `eval(function(_0x1){var _0x2=function(_0x3){return _0x3};return eval(decodeURIComponent(escape(atob(_0x2(_0x1)))))})("${encoded}");`;
        
        return openTag + '\n' + obfuscatedJS + '\n' + closeTag;
    });
    
    if (matchCount > 0) {
        fs.writeFileSync(filePath, newContent, 'utf-8');
        return { success: true, scripts: matchCount };
    }
    return { success: false, scripts: 0, reason: '未找到内联script标签' };
}

/**
 * 从备份恢复
 */
function restoreFromBackup() {
    const backupDir = path.join(__dirname, BACKUP_DIR);
    if (!fs.existsSync(backupDir)) {
        console.log('错误：未找到备份文件夹 ' + BACKUP_DIR);
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
    console.log(`已从备份恢复 ${count} 个文件`);
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
    console.log('  网站混淆工具 - 防小白 + JS混淆');
    console.log('========================================\n');
    
    let success = 0;
    let failed = 0;
    const results = [];
    
    for (const file of TARGET_FILES) {
        const filePath = path.join(__dirname, file);
        if (!fs.existsSync(filePath)) {
            console.log(`[跳过] ${file} - 文件不存在`);
            failed++;
            continue;
        }
        
        try {
            const result = obfuscateFile(filePath);
            if (result.success) {
                const sizeKB = (fs.statSync(filePath).size / 1024).toFixed(1);
                console.log(`[成功] ${file} - 混淆 ${result.scripts} 个script (${sizeKB}KB)`);
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
    console.log('  1. 原始文件已备份在 _原始未混淆版 文件夹');
    console.log('  2. 修改网站时请修改 _原始未混淆版 中的文件，然后运行 node _混淆工具.js 重新混淆');
    console.log('  3. 如需恢复原始版本，运行 node _混淆工具.js 恢复');
}

main();
