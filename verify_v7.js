const https = require('https');
https.get('https://bishihuihuang.github.io/zhaolezi/26.html?v=12', (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        console.log('状态码:', res.statusCode);
        console.log('内容长度:', data.length);
        const m = data.match(/\}\)\("([^"]+)"\);/);
        if (m) {
            const decoded = decodeURIComponent(escape(Buffer.from(m[1], 'base64').toString('binary')));
            console.log('\n验证结果:');
            console.log('  Firefox检测变量:', decoded.includes('_isFirefox'));
            console.log('  InstallTrigger检测:', decoded.includes('InstallTrigger'));
            console.log('  Firefox条件判断:', decoded.includes('if(_isFirefox)'));
            console.log('  Firefox不阻止原生菜单:', decoded.includes('if(!_isFirefox){'));
            console.log('  Firefox菜单偏移120px:', decoded.includes('offsetY = _isFirefox ? 120 : 0'));
            console.log('  粘贴选项(Ctrl+P):', decoded.includes('Ctrl+P'));
            console.log('  剪切选项:', decoded.includes('剪切'));
            console.log('  复制选项:', decoded.includes('复制'));
            console.log('  刷新选项:', decoded.includes('刷新'));
        }
    });
}).on('error', (e) => console.log('错误:', e.message));
