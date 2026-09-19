const https = require('https');
https.get('https://bishihuihuang.github.io/zhaolezi/26.html?v=14', (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        console.log('状态码:', res.statusCode);
        console.log('内容长度:', data.length);
        const m = data.match(/\}\)\("([^"]+)"\);/);
        if (m) {
            const decoded = decodeURIComponent(escape(Buffer.from(m[1], 'base64').toString('binary')));
            console.log('\n验证结果:');
            console.log('  只允许粘贴/复制/剪切/刷新:', decoded.includes('_allowed'));
            console.log('  粘贴Ctrl+V(86):', decoded.includes('_0x9===86'));
            console.log('  复制Ctrl+C(67):', decoded.includes('_0x9===67'));
            console.log('  剪切Ctrl+X(88):', decoded.includes('_0x9===88'));
            console.log('  刷新F5(116):', decoded.includes('_0x9===116'));
            console.log('  正常文字输入允许:', decoded.includes('_normal'));
            console.log('  阻止Ctrl/Alt/Meta组合:', decoded.includes('!_0x8.ctrlKey && !_0x8.altKey && !_0x8.metaKey'));
            console.log('  阻止其他按键:', decoded.includes('if(!_allowed && !_normal)'));
            console.log('  stopImmediatePropagation:', decoded.includes('stopImmediatePropagation'));
        }
    });
}).on('error', (e) => console.log('错误:', e.message));
