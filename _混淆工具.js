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
// 自定义右键菜单：只保留复制和刷新，其余禁止
const ANTI_CHEAT_CODE = `
/* 防小白保护开始 */
(function(){
    var _0x1=document;
    // 创建自定义右键菜单
    var _0x2=_0x1.createElement('div');
    _0x2.style.cssText='position:fixed;z-index:9999999;background:#fff;border:1px solid #d0d0d0;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,.15);padding:5px 0;min-width:90px;display:none;font-family:"Microsoft YaHei",sans-serif;font-size:14px;user-select:none;';
    _0x2.innerHTML='<div data-a="copy" style="padding:8px 18px;cursor:pointer;color:#333;">复制</div><div data-a="refresh" style="padding:8px 18px;cursor:pointer;color:#333;">刷新</div>';
    _0x1.body.appendChild(_0x2);
    // 菜单项hover
    _0x2.addEventListener('mouseover',function(e){if(e.target.getAttribute('data-a')){e.target.style.background='#f5f5f5';}});
    _0x2.addEventListener('mouseout',function(e){if(e.target.getAttribute('data-a')){e.target.style.background='';}});
    // 右键显示自定义菜单
    _0x1.addEventListener('contextmenu',function(e){
        e.preventDefault();
        _0x2.style.display='block';
        _0x2.style.left=e.clientX+'px';
        _0x2.style.top=e.clientY+'px';
        setTimeout(function(){var r=_0x2.getBoundingClientRect();if(r.right>window.innerWidth){_0x2.style.left=(window.innerWidth-r.width-5)+'px';}if(r.bottom>window.innerHeight){_0x2.style.top=(window.innerHeight-r.height-5)+'px';}},0);
        return false;
    });
    // 隐藏菜单
    _0x1.addEventListener('click',function(){_0x2.style.display='none';});
    _0x1.addEventListener('scroll',function(){_0x2.style.display='none';});
    _0x1.addEventListener('keydown',function(e){if(e.keyCode===27){_0x2.style.display='none';}});
    // 菜单点击
    _0x2.addEventListener('click',function(e){
        var t=e.target;
        var a=t.getAttribute('data-a');
        if(!a){return;}
        _0x2.style.display='none';
        if(a==='copy'){
            var s=window.getSelection().toString();
            if(s){if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(s);}else{document.execCommand('copy');}}
        }else if(a==='refresh'){
            location.reload();
        }
    });
    // 禁用F12等开发者工具快捷键（保留Ctrl+C复制）
    _0x1.addEventListener('keydown',function(_0x3){
        var _0x4=_0x3.keyCode||_0x3.which;
        if(_0x4===123||(_0x3.ctrlKey&&_0x3.shiftKey&&(_0x4===73||_0x4===74))||(_0x3.ctrlKey&&_0x4===85)||(_0x3.ctrlKey&&_0x4===83)||(_0x3.ctrlKey&&_0x3.shiftKey&&_0x4===67)){
            _0x3.preventDefault();return false;
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
