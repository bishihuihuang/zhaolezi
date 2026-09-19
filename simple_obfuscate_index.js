const fs = require('fs');
const path = require('path');

function utf8ToBase64(str) {
    return Buffer.from(str, 'utf-8').toString('base64');
}

/**
 * 简单混淆：只做Base64编码，不添加任何额外功能（防小白、全选等都不添加）
 * 完全保留用户自己的代码
 */
function simpleObfuscateFile(filePath) {
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
        
        // 只做Base64编码，不添加任何额外代码
        const encoded = utf8ToBase64(jsCode);
        
        // 生成混淆后的代码：eval解码执行
        const obfuscatedJS = `eval(function(_0x1){var _0x2=function(_0x3){return _0x3};return eval(decodeURIComponent(escape(atob(_0x2(_0x1)))))})("${encoded}");`;
        
        return openTag + '\n' + obfuscatedJS + '\n' + closeTag;
    });
    
    if (matchCount > 0) {
        fs.writeFileSync(filePath, newContent, 'utf-8');
        return { success: true, scripts: matchCount };
    }
    return { success: false, scripts: 0, reason: '未找到内联script标签' };
}

// 只处理index.html
console.log('========== 简单混淆index.html（不添加任何额外功能） ==========\n');

const indexPath = path.join(__dirname, '_原始未混淆版', 'index.html');
const destPath = path.join(__dirname, 'index.html');

// 先复制原始index.html到主目录
fs.copyFileSync(indexPath, destPath);
console.log('已复制原始index.html到主目录');

// 简单混淆（只做Base64，不添加防小白、全选等任何额外功能）
const result = simpleObfuscateFile(destPath);
if (result.success) {
    const sizeKB = (fs.statSync(destPath).size / 1024).toFixed(1);
    console.log(`index.html简单混淆成功: ${result.scripts} 个script (${sizeKB}KB)`);
} else {
    console.log(`index.html简单混淆失败: ${result.reason}`);
    process.exit(1);
}

console.log('\n========== 完成 ==========');
console.log('index.html已简单混淆（只做Base64编码，不添加任何额外功能）');
console.log('完全保留用户自己的代码，不新加任何改动');
