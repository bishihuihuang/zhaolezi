const fs = require('fs');
const path = require('path');

// 读取混淆工具中的ANTI_CHEAT_CODE
const obfuscateTool = fs.readFileSync(path.join(__dirname, '_混淆工具.js'), 'utf-8');
const antiCheatMatch = obfuscateTool.match(/const ANTI_CHEAT_CODE = ([\s\S]*?);/);
if (!antiCheatMatch) {
    console.error('未找到ANTI_CHEAT_CODE');
    process.exit(1);
}
const ANTI_CHEAT_CODE = antiCheatMatch[1];

function utf8ToBase64(str) {
    return Buffer.from(str, 'utf-8').toString('base64');
}

function obfuscateFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const scriptRegex = /(<script(?![^>]*\bsrc=)[^>]*>)([\s\S]*?)(<\/script>)/gi;
    let matchCount = 0;
    const newContent = content.replace(scriptRegex, (match, openTag, jsCode, closeTag) => {
        if (!jsCode || jsCode.trim().length === 0) {
            return match;
        }
        matchCount++;
        const fullJS = ANTI_CHEAT_CODE + '\n' + jsCode;
        const encoded = utf8ToBase64(fullJS);
        const obfuscatedJS = 'eval(function(_0x1){var _0x2=function(_0x3){return _0x3};return eval(decodeURIComponent(escape(atob(_0x2(_0x1)))))})("' + encoded + '");';
        return openTag + '\n' + obfuscatedJS + '\n' + closeTag;
    });
    if (matchCount > 0) {
        fs.writeFileSync(filePath, newContent, 'utf-8');
        return { success: true, scripts: matchCount };
    }
    return { success: false, scripts: 0 };
}

// 只混淆index.html
console.log('========== 只混淆index.html ==========');
const indexPath = path.join(__dirname, '_原始未混淆版', 'index.html');
const destPath = path.join(__dirname, 'index.html');

// 先复制原始index.html到主目录
fs.copyFileSync(indexPath, destPath);
console.log('已复制原始index.html到主目录');

// 混淆主目录中的index.html
const result = obfuscateFile(destPath);
if (result.success) {
    const sizeKB = (fs.statSync(destPath).size / 1024).toFixed(1);
    console.log('index.html混淆成功: ' + result.scripts + ' 个script (' + sizeKB + 'KB)');
} else {
    console.log('index.html混淆失败');
    process.exit(1);
}

console.log('\n========== 完成 ==========');
console.log('index.html已混淆');
console.log('30.html保持原始未混淆状态');
