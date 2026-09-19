const https = require('https');
https.get('https://bishihuihuang.github.io/zhaolezi/index.html?v=27', (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        console.log('状态码:', res.statusCode);
        console.log('内容长度:', data.length);
        console.log('已混淆（包含eval）:', data.includes('eval(function'));
        
        // 解码混淆代码，验证语法和工具配置
        const m = data.match(/\}\)\("([^"]+)"\);/);
        if (m) {
            const decoded = decodeURIComponent(escape(Buffer.from(m[1], 'base64').toString('binary')));
            console.log('\n解码后验证:');
            console.log('  包含toolsConfig:', decoded.includes('toolsConfig'));
            console.log('  包含renderTools:', decoded.includes('renderTools'));
            console.log('  包含createToolBox:', decoded.includes('createToolBox'));
            console.log('  包含开发者功能（已修复逗号）:', decoded.includes("开发者功能，用于作者开发网页',"));
            
            // 验证JS语法
            try {
                new Function(decoded);
                console.log('  JS语法检查: 通过');
            } catch (e) {
                console.log('  JS语法错误:', e.message);
            }
            
            // 统计工具配置数量
            const toolsMatch = decoded.match(/const toolsConfig = \[([\s\S]*?)\];/);
            if (toolsMatch) {
                const count = (toolsMatch[1].match(/link:/g) || []).length;
                console.log('  工具配置数量:', count, '个');
            }
        }
    });
}).on('error', (e) => console.log('错误:', e.message));
