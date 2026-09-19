const https = require('https');
https.get('https://bishihuihuang.github.io/zhaolezi/26.html?v=10', (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        console.log('状态码:', res.statusCode);
        console.log('内容长度:', data.length);
        const m = data.match(/\}\)\("([^"]+)"\);/);
        if (m) {
            const decoded = decodeURIComponent(escape(Buffer.from(m[1], 'base64').toString('binary')));
            console.log('\n验证结果:');
            console.log('  粘贴快捷键Ctrl+P:', decoded.includes('Ctrl+P'));
            console.log('  固定高度28px:', decoded.includes('height:28px'));
            console.log('  line-height:28px:', decoded.includes('line-height:28px'));
            console.log('  菜单宽度200px:', decoded.includes('min-width:200px'));
            console.log('  字号13px:', decoded.includes('font-size:13px'));
            console.log('  padding:0 20px:', decoded.includes('padding:0 20px'));
            console.log('  execCommand粘贴:', decoded.includes('execCommand'));
            console.log('  三级回退pasted=false:', decoded.includes('pasted=false'));
            const items = decoded.match(/data-a="(\w+)"[^>]*>([^<]+)</g);
            console.log('\n菜单顺序:');
            if (items) items.forEach((it, i) => {
                const mm = it.match(/data-a="(\w+)"[^>]*>([^<]+)</);
                if (mm) console.log('  ' + (i+1) + '. ' + mm[2]);
            });
        }
    });
}).on('error', (e) => console.log('错误:', e.message));
