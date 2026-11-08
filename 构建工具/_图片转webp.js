/**
 * V2.9.7（4B）：大图转 WebP（保留原图）+ 同步 assets/css|js 内的引用
 * 用法：node _图片转webp.js （由 _混淆工具.js 自动调用；sharp 缺失则跳过）
 * 规则：
 *   - 仅处理 assets/{images,看看作业,af,cy,xd,ai} 下 >80KB 的 png/jpg
 *   - 生成同路径同名 .webp（quality 82）；已存在则跳过
 *   - 幂等：重复运行零副作用；页面/样式里的引用由构建期 swapWebp 完成
 */
const fs = require('fs');
const path = require('path');

let sharp = null;
try { sharp = require('sharp'); } catch (e) { console.log('[WebP] 未安装 sharp（npm i -D sharp），跳过图片转换'); process.exit(0); }

const ROOT = path.join(__dirname, '..');
const DIRS = ['assets/images', 'assets/看看作业', 'assets/af', 'assets/cy', 'assets/xd', 'assets/ai'];
const MIN_KB = 80;

let converted = 0, savedBytes = 0, skipped = 0;
function walk(dir, cb) {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p, cb);
        else cb(p);
    }
}
const jobs = [];
for (const d of DIRS) walk(path.join(ROOT, d), (p) => {
    const ext = path.extname(p).toLowerCase();
    if (!/^\.png$|^\.jpe?g$/.test(ext)) return;
    const size = fs.statSync(p).size;
    if (size < MIN_KB * 1024) return;
    const out = p.slice(0, p.length - ext.length) + '.webp';
    if (fs.existsSync(out)) { skipped++; return; }
    jobs.push({ p, out, size });
});

(async () => {
    for (const j of jobs) {
        try {
            const info = await sharp(j.p)
                .webp({ quality: 82, effort: 4, alphaQuality: 90, lossless: false })
                .toFile(j.out);
            if (info.size < j.size) { converted++; savedBytes += j.size - info.size; }
            else { fs.unlinkSync(j.out); skipped++; } // 转了反而更大（小图/已优图）→ 放弃
        } catch (e) {
            console.log('[WebP] 失败 ' + path.relative(ROOT, j.p) + ': ' + String(e.message).slice(0, 90));
            try { if (fs.existsSync(j.out)) fs.unlinkSync(j.out); } catch (_) {}
        }
    }
    console.log(`[WebP] 转换 ${converted} 张，放弃 ${skipped} 张（已存在/更小/失败），节省 ${(savedBytes / 1024 / 1024).toFixed(1)}MB`);

    /* 引用改写：assets/css/*.css 与 assets/js/*.js 里"已存在 .webp 对应文件"的引用
       （构建每次从源区重新复制，这里每构建都会重写一次） */
    const webpSet = new Set();   // 相对 assets/ 的路径
    const baseMap = new Map();   // 文件名 → 相对 assets/ 路径
    for (const d of DIRS) walk(path.join(ROOT, d), (p) => {
        if (!p.toLowerCase().endsWith('.webp')) return;
        const rel = path.relative(path.join(ROOT, 'assets'), p).replace(/\\/g, '/');
        webpSet.add(rel);
        baseMap.set(path.basename(p), rel);
    });
    let refs = 0;
    const swapText = (text) => {
        let out = text.replace(/(["'\(])((?:\.\.\/|\.\/|assets\/)?[^"'\)\s]*?\.(?:png|jpe?g))(["'\)])/gi, (m, q1, p, q2) => {
            const stem = p.slice(0, p.length - path.extname(p).length) + '.webp';
            const cands = new Set();
            const n1 = p.replace(/^\.\.\/|^\.\//, '');
            cands.add(n1); cands.add(n1.replace(/^assets\//, '')); cands.add('assets/' + n1);
            const n2 = stem.replace(/^\.\.\/|^\.\//, '');
            cands.add(n2); cands.add(n2.replace(/^assets\//, '')); cands.add('assets/' + n2);
            for (const c of cands) {
                if (webpSet.has(c.replace(/^assets\//, ''))) { refs++; return q1 + stem + q2; }
            }
            return m;
        });
        // 数据驱动的纯文件名引用（'看看作业/'+name+'.png' 这类拼不出来，这里按文件名匹配）
        out = out.replace(/(["'\(])((?:[^"'()\/\s]+)\.(?:png|jpe?g))(["'\)])/gi, (m, q1, p, q2) => {
            const rel = baseMap.get(p);
            if (!rel) return m;
            refs++;
            return q1 + p.slice(0, p.length - path.extname(p).length) + '.webp' + q2;
        });
        return out;
    };
    for (const sub of ['assets/css', 'assets/js']) {
        const dir = path.join(ROOT, sub);
        if (!fs.existsSync(dir)) continue;
        for (const f of fs.readdirSync(dir)) {
            if (!/\.(css|js)$/.test(f)) continue;
            const p = path.join(dir, f);
            const s = fs.readFileSync(p, 'utf8');
            const t = swapText(s);
            if (t !== s) fs.writeFileSync(p, t, 'utf8');
        }
    }
    console.log(`[WebP] CSS/JS 引用改写 ${refs} 处`);
})();
