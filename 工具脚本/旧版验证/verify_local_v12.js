const fs = require('fs');
const content = fs.readFileSync('26.html', 'utf-8');
const m = content.match(/\}\)\("([^"]+)"\);/);
if (m) {
    const decoded = decodeURIComponent(escape(Buffer.from(m[1], 'base64').toString('binary')));
    console.log('全选菜单项:', decoded.includes('全选'));
    console.log('全选data-a=selectall:', decoded.includes('data-a="selectall"'));
    console.log('Ctrl+A快捷键:', decoded.includes('Ctrl+A'));
    console.log('全选功能处理:', decoded.includes("a==='selectall'"));
    console.log('输入框全选el.select():', decoded.includes('el.select()'));
    console.log('setSelectionRange:', decoded.includes('setSelectionRange'));
    console.log('contenteditable全选:', decoded.includes('selectNodeContents'));
    console.log('页面全选execCommand:', decoded.includes("execCommand('selectAll')"));
    console.log('键盘白名单Ctrl+A(65):', decoded.includes('_0x9===65'));
    const items = decoded.match(/data-a="(\w+)"[^>]*>([^<]+)</g);
    console.log('\n菜单顺序:');
    if (items) items.forEach((it, i) => {
        const mm = it.match(/data-a="(\w+)"[^>]*>([^<]+)</);
        if (mm) console.log('  ' + (i+1) + '. ' + mm[2]);
    });
}
