/* _serve.js — 本地静态服务（浏览器验收用）
   用法：node 工具脚本/_serve.js [目录] [端口] */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(process.argv[2] || '.');
const PORT = parseInt(process.argv[3] || '8811', 10);
const MIME = {
    '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.svg': 'image/svg+xml',
    '.woff': 'font/woff', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg',
    '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8'
};

http.createServer(function (req, res) {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/') p = '/index.html';
    const target = path.normalize(path.join(ROOT, p));
    if (target !== ROOT && target.indexOf(ROOT + path.sep) !== 0) { res.writeHead(403); res.end('forbidden'); return; }
    fs.stat(target, function (e, st) {
        if (e || !st.isFile()) { res.writeHead(404); res.end('404 ' + p); return; }
        res.writeHead(200, {
            'Content-Type': MIME[path.extname(target).toLowerCase()] || 'application/octet-stream',
            'Content-Length': st.size,
            'Cache-Control': 'no-cache'
        });
        fs.createReadStream(target).pipe(res);
    });
}).listen(PORT, '127.0.0.1', function () {
    console.log('serving ' + ROOT + ' on http://127.0.0.1:' + PORT);
});
