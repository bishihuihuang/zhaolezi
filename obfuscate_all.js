const fs = require('fs');
const path = require('path');

const rawDir = path.join(__dirname, '_原始未混淆版');
const destDir = __dirname;

// 需要混淆的文件（1-29.html, index.html）
// 不需要混淆的文件：30.html, 文件搜索.html
const NO_OBFUSCATE = ['30.html', '文件搜索.html'];

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
        const encoded = utf8ToBase64(jsCode);
        const obfuscatedJS = `eval(function(_0x1){var _0x2=function(_0x3){return _0x3};return eval(decodeURIComponent(escape(atob(_0x2(_0x1)))))})("${encoded}");`;
        return openTag + '\n' + obfuscatedJS + '\n' + closeTag;
    });
    
    return { content: newContent, scripts: matchCount };
}

const files = fs.readdirSync(rawDir).filter(f => f.endsWith('.html'));
let obfuscated = 0, copied = 0;

console.log('========== 混淆并复制文件 ==========\n');

for (const file of files) {
    const rawPath = path.join(rawDir, file);
    const destPath = path.join(destDir, file);
    
    if (NO_OBFUSCATE.includes(file)) {
        // 不需要混淆，直接复制
        fs.copyFileSync(rawPath, destPath);
        const size = (fs.statSync(destPath).size / 1024).toFixed(1);
        console.log(`复制(不混淆): ${file} (${size}KB)`);
        copied++;
    } else {
        // 需要混淆
        const result = obfuscateFile(rawPath);
        fs.writeFileSync(destPath, result.content, 'utf-8');
        const size = (fs.statSync(destPath).size / 1024).toFixed(1);
        console.log(`混淆: ${file} (${result.scripts}个script, ${size}KB)`);
        obfuscated++;
    }
}

console.log(`\n========== 完成 ==========`);
console.log(`混淆: ${obfuscated} 个文件`);
console.log(`直接复制: ${copied} 个文件 (30.html, 文件搜索.html)`);
console.log(`总计: ${files.length} 个文件`);
