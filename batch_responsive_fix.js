const fs = require('fs');
const path = require('path');

const rawDir = path.join(__dirname, '_原始未混淆版');
const files = fs.readdirSync(rawDir).filter(f => f.endsWith('.html'));

console.log(`找到 ${files.length} 个HTML文件\n`);

// 通用CSS改进（注入到每个文件的</head>前）
const commonCSS = `
<!-- 多设备适配改进 v1.0 -->
<style>
/* 6. 全局box-sizing reset */
*, *::before, *::after {
    box-sizing: border-box;
}

/* 3. 刘海屏安全区域适配 */
body {
    padding: env(safe-area-inset-top, 0) env(safe-area-inset-right, 0) 
             env(safe-area-inset-bottom, 0) env(safe-area-inset-left, 0);
}

/* 2. 触摸设备优化：禁用hover残留效果 */
@media (hover: none) {
    .tool-box:hover, .card:hover, .box:hover, button:hover, a:hover {
        transform: none !important;
        box-shadow: inherit !important;
    }
    .tooltip, [class*="tooltip"], [class*="tip"] {
        display: none !important;
    }
}

/* 4. 深色模式支持 */
@media (prefers-color-scheme: dark) {
    body {
        background-color: #121212 !important;
        color: #e0e0e0 !important;
    }
}
</style>
`;

// 文件搜索.html专用CSS
const searchCSS = `
<!-- 文件搜索.html 移动端适配 -->
<style>
/* 1. 文件搜索.html移动端断点 */
@media (max-width: 768px) {
    .container, .search-container, .main-container {
        width: 95% !important;
        padding: 10px !important;
    }
    .title-area, h1, .page-title {
        font-size: 32px !important;
        letter-spacing: 3px !important;
    }
    .grid {
        grid-template-columns: repeat(3, 1fr) !important;
        gap: 8px !important;
    }
}

@media (max-width: 480px) {
    .container, .search-container, .main-container {
        width: 100% !important;
        border-radius: 12px !important;
        padding: 8px !important;
    }
    .title-area, h1, .page-title {
        font-size: 24px !important;
        letter-spacing: 2px !important;
    }
    .grid {
        grid-template-columns: repeat(2, 1fr) !important;
        gap: 6px !important;
    }
    .tool-box, .search-item, .card {
        min-height: 60px !important;
        font-size: 12px !important;
        padding: 8px 4px !important;
    }
}

/* 5. 标题字体大小限制 */
h1, .page-title, .title-area h1, .title-area h2 {
    font-size: clamp(24px, 6vw, 64px) !important;
}

/* 7. 触摸目标最小44px */
button, .btn, .tool-box, a[href], input, select, .clickable {
    min-width: 44px;
    min-height: 44px;
}
</style>
`;

// 游戏页面专用CSS（触摸目标增大）
const gameCSS = `
<!-- 游戏页面触摸优化 -->
<style>
/* 7. 游戏按钮触摸目标增大到44px */
button, .btn, .game-btn, .cell, .key, [class*="button"], [class*="btn"] {
    min-width: 44px !important;
    min-height: 44px !important;
}

/* 小屏幕游戏页面优化 */
@media (max-width: 768px) {
    canvas, .game-container, .board, .grid-board {
        max-width: 100% !important;
        height: auto !important;
    }
}
</style>
`;

let modified = 0;

for (const file of files) {
    const filePath = path.join(rawDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // 检查是否已经注入过
    if (content.includes('多设备适配改进')) {
        console.log(`跳过(已处理): ${file}`);
        continue;
    }
    
    let injectCSS = commonCSS;
    
    // 文件搜索.html额外注入
    if (file === '文件搜索.html') {
        injectCSS += searchCSS;
    }
    
    // 游戏页面(1-29.html)额外注入触摸优化
    if (/^\d+\.html$/.test(file)) {
        injectCSS += gameCSS;
    }
    
    // 在</head>前注入CSS
    if (content.includes('</head>')) {
        content = content.replace('</head>', injectCSS + '\n</head>');
    } else if (content.includes('</body>')) {
        // 没有head标签的情况
        content = content.replace('</body>', injectCSS + '\n</body>');
    } else {
        content = injectCSS + '\n' + content;
    }
    
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`已处理: ${file} (${(content.length/1024).toFixed(1)}KB)`);
    modified++;
}

console.log(`\n========== 完成 ==========`);
console.log(`共处理 ${modified} 个文件`);
console.log(`\n改进项:`);
console.log(`  1. 文件搜索.html移动端断点(768px/480px)`);
console.log(`  2. 触摸设备优化(hover:none)`);
console.log(`  3. 刘海屏安全区域适配`);
console.log(`  4. 深色模式支持`);
console.log(`  5. 标题字体clamp限制`);
console.log(`  6. 全局box-sizing reset`);
console.log(`  7. 触摸目标最小44px`);
