const https = require('https');

console.log('========== 验证30html重定向文件 ==========');
https.get('https://bishihuihuang.github.io/zhaolezi/30html?v=33', (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        console.log('30html状态码:', res.statusCode);
        console.log('30html内容长度:', data.length);
        console.log('包含重定向meta标签:', data.includes('http-equiv="refresh"'));
        console.log('包含重定向JS:', data.includes('window.location.replace'));
        console.log('包含跳转到30.html:', data.includes('30.html'));
        console.log('包含加载动画:', data.includes('spinner'));
        console.log('\n结论: 30html重定向文件', res.statusCode === 200 ? '已生效' : '未生效');
    });
}).on('error', (e) => console.log('错误:', e.message));
