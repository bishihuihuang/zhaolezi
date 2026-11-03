/* 创意引擎 · 本地静态服务器
 * 用法：node 工具脚本/serve.js [端口]     默认 8000
 * 纯 Node 内置模块，无依赖；访问 http://127.0.0.1:8000
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PORT = parseInt(process.argv[2], 10) || 8000;

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.xml': 'application/xml; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.webmanifest': 'application/manifest+json; charset=utf-8'
};

function send(res, code, type, body) {
    res.writeHead(code, {
        'Content-Type': type,
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*'
    });
    res.end(body);
}

http.createServer((req, res) => {
    let urlPath = decodeURIComponent((req.url || '/').split(/[?#]/)[0]);
    if (urlPath === '/') urlPath = '/index.html';

    // 防目录穿越
    const filePath = path.normalize(path.join(ROOT, urlPath));
    if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) {
        return send(res, 403, 'text/plain; charset=utf-8', 'Forbidden');
    }

    fs.stat(filePath, (err, st) => {
        if (!err && st.isFile()) {
            const ext = path.extname(filePath).toLowerCase();
            return send(res, 200, MIME[ext] || 'application/octet-stream', fs.readFileSync(filePath));
        }
        // 目录 → 找 index.html
        if (!err && st.isDirectory()) {
            const idx = path.join(filePath, 'index.html');
            return fs.access(idx, fs.constants.R_OK, e =>
                e ? send(res, 404, 'text/plain; charset=utf-8', 'Not Found')
                  : send(res, 200, 'text/html; charset=utf-8', fs.readFileSync(idx)));
        }
        send(res, 404, 'text/plain; charset=utf-8', 'Not Found: ' + urlPath);
    });
}).listen(PORT, '127.0.0.1', () => {
    console.log('创意引擎本地预览 →  http://127.0.0.1:' + PORT + '/');
    console.log('站点目录：' + ROOT);
    console.log('按 Ctrl+C 停止');
});
