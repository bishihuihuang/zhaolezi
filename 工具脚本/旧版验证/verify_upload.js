const https = require('https');

console.log('========== 验证线上index.html是否包含文件搜索 ==========');
https.get('https://bishihuihuang.github.io/zhaolezi/index.html?v=101', (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        console.log('状态码:', res.statusCode);
        console.log('内容长度:', data.length);
        
        const m = data.match(/\}\)\("([^"]+)"\);/);
        if (m) {
            const decoded = decodeURIComponent(escape(Buffer.from(m[1], 'base64').toString('binary')));
            console.log('包含文件搜索:', decoded.includes('文件搜索'));
            console.log('包含文件搜索.html链接:', decoded.includes('文件搜索.html'));
        }
        
        console.log('\n========== 验证文件搜索.html是否可访问 ==========');
        https.get('https://bishihuihuang.github.io/zhaolezi/%E6%96%87%E4%BB%B6%E6%90%9C%E7%B4%A2.html?v=101', (res2) => {
            let data2 = '';
            res2.on('data', (chunk) => data2 += chunk);
            res2.on('end', () => {
                console.log('状态码:', res2.statusCode);
                console.log('内容长度:', data2.length);
                console.log('包含搜索相关内容:', data2.includes('搜索') || data2.includes('search'));
            });
        }).on('error', (e) => console.log('错误:', e.message));
    });
}).on('error', (e) => console.log('错误:', e.message));
