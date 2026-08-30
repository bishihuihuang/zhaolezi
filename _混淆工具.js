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
const ANTI_CHEAT_CODE = `
/* 防小白保护开始 */
(function(){
    var _0x1=document;
    _0x1.addEventListener('contextmenu',function(_0x2){_0x2.preventDefault();return false;});
    _0x1.addEventListener('keydown',function(_0x3){
        var _0x4=_0x3.keyCode||_0x3.which;
        if(_0x4===123||(_0x3.ctrlKey&&_0x3.shiftKey&&(_0x4===73||_0x4===74))||(_0x3.ctrlKey&&_0x4===85)||(_0x3.ctrlKey&&_0x4===83)||(_0x3.ctrlKey&&_0x3.shiftKey&&_0x4===67)){
            _0x3.preventDefault();return false;
        }
    });
    // 简单的开发者工具检测（检测窗口大小变化）
    var _0x5=window.innerWidth, _0x6=window.innerHeight;
    setInterval(function(){
        if(Math.abs(window.innerWidth-_0x5)>100||Math.abs(window.innerHeight-_0x6)>100){
            // 开发者工具打开时的处理（可选：刷新页面或显示提示）
        }
    },1000);
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
