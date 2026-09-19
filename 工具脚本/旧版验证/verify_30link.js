const https = require('https');

console.log('========== 验证index.html中的30.html链接 ==========');
https.get('https://bishihuihuang.github.io/zhaolezi/index.html?v=31', (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        console.log('index.html状态码:', res.statusCode);
        const m = data.match(/\}\)\("([^"]+)"\);/);
        if (m) {
            const decoded = decodeURIComponent(escape(Buffer.from(m[1], 'base64').toString('binary')));
            console.log('包含正确的30.html链接:', decoded.includes("link: '30.html',"));
            console.log('不包含错误的30html链接:', !decoded.includes("link: '30html',"));
        }
        
        console.log('\n========== 验证30.html是否可以正常访问 ==========');
        https.get('https://bishihuihuang.github.io/zhaolezi/30.html?v=31', (res2) => {
            let data2 = '';
            res2.on('data', (chunk) => data2 += chunk);
            res2.on('end', () => {
                console.log('30.html状态码:', res2.statusCode);
                console.log('30.html内容长度:', data2.length);
                console.log('包含更新公告标题:', data2.includes('找乐子——更新公告'));
                console.log('包含响应式断点:', (data2.match(/@media/g) || []).length, '个');
                console.log('包含返回主页:', data2.includes('index.html'));
            });
        }).on('error', (e) => console.log('30.html错误:', e.message));
    });
}).on('error', (e) => console.log('index.html错误:', e.message));
