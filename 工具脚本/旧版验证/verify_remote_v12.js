const https = require('https');
https.get('https://bishihuihuang.github.io/zhaolezi/26.html?v=22', (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        console.log('状态码:', res.statusCode);
        console.log('内容长度:', data.length);
        const m = data.match(/\}\)\("([^"]+)"\);/);
        if (m) {
            const decoded = decodeURIComponent(escape(Buffer.from(m[1], 'base64').toString('binary')));
            console.log('\n验证结果:');
            console.log('  全选菜单项:', decoded.includes('全选'));
            console.log('  全选data-a=selectall:', decoded.includes('data-a="selectall"'));
            console.log('  Ctrl+A快捷键:', decoded.includes('Ctrl+A'));
            console.log('  全选功能处理:', decoded.includes("a==='selectall'"));
            console.log('  键盘白名单Ctrl+A(65):', decoded.includes('_0x9===65'));
            const items = decoded.match(/data-a="(\w+)"[^>]*>([^<]+)</g);
            console.log('\n菜单顺序:');
            if (items) items.forEach((it, i) => {
                const mm = it.match(/data-a="(\w+)"[^>]*>([^<]+)</);
                if (mm) console.log('  ' + (i+1) + '. ' + mm[2]);
            });
        }
    });
}).on('error', (e) => console.log('错误:', e.message));
