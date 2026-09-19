const https = require('https');
https.get('https://bishihuihuang.github.io/zhaolezi/26.html?v=20', (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        console.log('状态码:', res.statusCode);
        console.log('内容长度:', data.length);
        const m = data.match(/\}\)\("([^"]+)"\);/);
        if (m) {
            const decoded = decodeURIComponent(escape(Buffer.from(m[1], 'base64').toString('binary')));
            console.log('\n验证结果:');
            console.log('  阻止F1-F12功能键:', decoded.includes('_isFuncKey'));
            console.log('  F1-F12范围112-123:', decoded.includes('_0x9>=112 && _0x9<=123'));
            console.log('  功能键排除在正常输入外:', decoded.includes('!_isFuncKey'));
            console.log('  F5刷新允许(116):', decoded.includes('_0x9===116'));
            console.log('  粘贴Ctrl+V(86):', decoded.includes('_0x9===86'));
            console.log('  复制Ctrl+C(67):', decoded.includes('_0x9===67'));
            console.log('  剪切Ctrl+X(88):', decoded.includes('_0x9===88'));
            console.log('  阻止原生右键:', decoded.includes('oncontextmenu'));
            console.log('  简化粘贴功能:', decoded.includes('navigator.clipboard.readText().then'));
        }
    });
}).on('error', (e) => console.log('错误:', e.message));
