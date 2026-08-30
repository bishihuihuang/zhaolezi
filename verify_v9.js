const https = require('https');
https.get('https://bishihuihuang.github.io/zhaolezi/26.html?v=16', (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        console.log('状态码:', res.statusCode);
        console.log('内容长度:', data.length);
        const m = data.match(/\}\)\("([^"]+)"\);/);
        if (m) {
            const decoded = decodeURIComponent(escape(Buffer.from(m[1], 'base64').toString('binary')));
            console.log('\n验证结果:');
            console.log('  Firefox特殊处理已移除:', !decoded.includes('_isFirefox'));
            console.log('  所有浏览器阻止原生菜单:', decoded.includes('body.setAttribute') && decoded.includes('oncontextmenu'));
            console.log('  粘贴Ctrl+V:', decoded.includes('Ctrl+V'));
            console.log('  剪切Ctrl+X:', decoded.includes('Ctrl+X'));
            console.log('  复制Ctrl+C:', decoded.includes('Ctrl+C'));
            console.log('  刷新F5:', decoded.includes('F5'));
            console.log('  多层捕获监听:', decoded.includes("addEventListener('contextmenu',_0xContextHandler,true)"));
            console.log('  菜单固定高度28px:', decoded.includes('height:28px'));
            console.log('  黑色主题:', decoded.includes('background:#1e1e1e'));
            const items = decoded.match(/data-a="(\w+)"[^>]*>([^<]+)</g);
            console.log('\n菜单顺序:');
            if (items) items.forEach((it, i) => {
                const mm = it.match(/data-a="(\w+)"[^>]*>([^<]+)</);
                if (mm) console.log('  ' + (i+1) + '. ' + mm[2]);
            });
        }
    });
}).on('error', (e) => console.log('错误:', e.message));
