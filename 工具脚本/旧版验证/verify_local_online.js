const fs = require('fs');
const https = require('https');

console.log('========== 检查本地index.html是否已修复逗号 ==========');

// 检查原始未混淆版
const rawContent = fs.readFileSync('_原始未混淆版/index.html', 'utf-8');
console.log('原始未混淆版:');
console.log('  包含修复后的逗号:', rawContent.includes("开发者功能，用于作者开发网页',"));

// 检查主目录的混淆版
const mainContent = fs.readFileSync('index.html', 'utf-8');
const m = mainContent.match(/\}\)\("([^"]+)"\);/);
if (m) {
    const decoded = decodeURIComponent(escape(Buffer.from(m[1], 'base64').toString('binary')));
    console.log('主目录混淆版（解码后）:');
    console.log('  包含修复后的逗号:', decoded.includes("开发者功能，用于作者开发网页',"));
    try {
        new Function(decoded);
        console.log('  JS语法检查: 通过');
    } catch (e) {
        console.log('  JS语法错误:', e.message);
    }
}

console.log('\n========== 验证线上版本 ==========');
https.get('https://bishihuihuang.github.io/zhaolezi/index.html?v=29', (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        console.log('线上版本验证:');
        console.log('  状态码:', res.statusCode);
        console.log('  内容长度:', data.length);
        const m2 = data.match(/\}\)\("([^"]+)"\);/);
        if (m2) {
            const decoded = decodeURIComponent(escape(Buffer.from(m2[1], 'base64').toString('binary')));
            console.log('  包含修复后的逗号:', decoded.includes("开发者功能，用于作者开发网页',"));
            try {
                new Function(decoded);
                console.log('  JS语法检查: 通过');
            } catch (e) {
                console.log('  JS语法错误:', e.message);
            }
        }
    });
}).on('error', (e) => console.log('错误:', e.message));
