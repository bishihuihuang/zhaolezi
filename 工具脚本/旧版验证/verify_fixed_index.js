const https = require('https');
https.get('https://bishihuihuang.github.io/zhaolezi/index.html?v=25', (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        console.log('状态码:', res.statusCode);
        console.log('内容长度:', data.length);
        console.log('已混淆（包含eval）:', data.includes('eval(function'));
        console.log('不包含防小白（无oncontextmenu）:', !data.includes('oncontextmenu'));
        console.log('不包含全选（无全选）:', !data.includes('全选'));
        
        // 解码混淆代码，验证是否包含用户的toolsConfig
        const m = data.match(/\}\)\("([^"]+)"\);/);
        if (m) {
            const decoded = decodeURIComponent(escape(Buffer.from(m[1], 'base64').toString('binary')));
            console.log('\n解码后验证:');
            console.log('  包含toolsConfig:', decoded.includes('toolsConfig'));
            console.log('  包含工具配置（17.html）:', decoded.includes('17.html'));
            console.log('  包含工具配置（20.html）:', decoded.includes('20.html'));
            console.log('  包含五子棋:', decoded.includes('五子棋'));
            console.log('  包含暗号大全:', decoded.includes('暗号大全'));
            console.log('  不包含防小白代码（无防小白）:', !decoded.includes('防小白'));
            console.log('  不包含全选功能（无selectall）:', !decoded.includes('selectall'));
        }
    });
}).on('error', (e) => console.log('错误:', e.message));
