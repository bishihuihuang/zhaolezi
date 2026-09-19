const https = require('https');
https.get('https://bishihuihuang.github.io/zhaolezi/26.html?v=18', (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        console.log('状态码:', res.statusCode);
        console.log('内容长度:', data.length);
        const m = data.match(/\}\)\("([^"]+)"\);/);
        if (m) {
            const decoded = decodeURIComponent(escape(Buffer.from(m[1], 'base64').toString('binary')));
            console.log('\n验证结果:');
            console.log('  简化粘贴(直接读取):', decoded.includes('navigator.clipboard.readText().then') && decoded.includes('if(txt){_0x7(el,txt);}'));
            console.log('  移除右键预读取:', !decoded.includes('预读取剪贴板'));
            console.log('  回退临时textarea:', decoded.includes("ta=_0x1.createElement('textarea')"));
            console.log('  回退execCommand粘贴:', decoded.includes("execCommand('paste')"));
            console.log('  粘贴Ctrl+V:', decoded.includes('Ctrl+V'));
            console.log('  剪切Ctrl+X:', decoded.includes('Ctrl+X'));
            console.log('  复制Ctrl+C:', decoded.includes('Ctrl+C'));
            console.log('  刷新F5:', decoded.includes('F5'));
            console.log('  阻止原生右键:', decoded.includes('oncontextmenu'));
            console.log('  键盘拦截保留:', decoded.includes('_allowed'));
        }
    });
}).on('error', (e) => console.log('错误:', e.message));
