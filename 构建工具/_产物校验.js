#!/usr/bin/env node
/* 产物完整性校验（CI 闸门 · 零依赖 · 不需要 _原始未混淆版）
 *
 * 背景：源码目录 _原始未混淆版/ 被 .gitignore 排除（防止未混淆源码公开），
 *      因此 GitHub Actions 无法重建产物。CI 的职责改为「校验已提交产物自洽」：
 *      页面数量、公共脚本引用、SEO 头、跳转链、搜索索引、sitemap、本地资源可解析、
 *      Service Worker 预缓存清单。
 *
 * 用法：node 构建工具/_产物校验.js
 * 退出码：0 全绿 / 1 有失败项
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PAGES_DIR = path.join(ROOT, 'pages');
const SEARCH_INDEX = path.join(ROOT, 'assets', 'js', 'zl-search-index.js');
const SITEMAP = path.join(ROOT, 'sitemap.xml');
const SW = path.join(ROOT, 'service-worker.js');
const INDEX = path.join(ROOT, 'index.html');

const fails = [];
const warns = [];
const ok = [];
const fail = (m) => fails.push(m);
const warn = (m) => warns.push(m);
const pass = (m) => ok.push(m);

const readUtf8 = (p) => fs.readFileSync(p, 'utf-8');
const exists = (p) => fs.existsSync(p);

/* ---------- 1. 基础文件 ---------- */
for (const [label, p] of [['index.html', INDEX], ['sitemap.xml', SITEMAP], ['service-worker.js', SW], ['搜索索引', SEARCH_INDEX],
  ['manifest.json', path.join(ROOT, 'manifest.json')], ['og 分享图', path.join(ROOT, 'assets/images/og-default.png')]]) {
  exists(p) ? pass(`${label} 存在`) : fail(`${label} 缺失：${path.relative(ROOT, p)}`);
}

/* ---------- 2. 页面集合 ---------- */
const pages = exists(PAGES_DIR) ? fs.readdirSync(PAGES_DIR).filter((f) => f.endsWith('.html')) : [];
const srcPages = exists(path.join(ROOT, '_原始未混淆版')) ? null : null; // CI 无源区，仅记录
if (pages.length < 180) fail(`pages/ 页面数异常偏少：${pages.length}`);
else pass(`pages/ 页面数 ${pages.length}`);

/* ---------- 3. 每页必备结构 ---------- */
// 跳转桩页（body 只有 location.replace）不需要跳转链/面包屑
const SKIP_PAGES = new Set(['全能-首页.html']);
const REQUIRED = [
  ['公共脚本', /assets\/js\/common\.js/],
  ['主题预执行', /data-theme/],
  ['canonical', /rel=["']canonical["']/],
  ['og:image', /property=["']og:image["']/],
  ['跳转链', /zl-skip-link[\s\S]{0,200}?#zl-main|href=["']#zl-main["']|class=["']skip-link["']/],
];
const badPages = [];
for (const f of pages) {
  const p = path.join(PAGES_DIR, f);
  const html = readUtf8(p);
  const req = SKIP_PAGES.has(f) ? REQUIRED.filter(([n]) => n !== '跳转链' && n !== 'canonical') : REQUIRED;
  const missing = req.filter(([, re]) => !re.test(html)).map(([n]) => n);
  if (missing.length) badPages.push(`${f} 缺 ${missing.join('/')}`);
}
if (badPages.length) fail(`${badPages.length} 页结构缺失：${badPages.slice(0, 8).join('；')}`);
else pass(`${pages.length} 页结构完整（公共脚本/主题预执行/canonical/og/跳转链）`);

/* 首页：自带 skip-link + <main id="main">（构建脚本尊重既有 id，不注入 zl-main） */
if (exists(INDEX)) {
  const h = readUtf8(INDEX);
  if (!/class=["']skip-link["'][^>]*href=["']#main["']/.test(h)) fail('首页 skip link 缺失或目标不是 #main');
  else pass('首页 skip link → #main');
  if (!/id=["']main["']/.test(h)) fail('首页缺少 id="main" 落点');
  if (!/assets\/js\/zl-search-index\.js/.test(h)) fail('首页未引用搜索索引');
}

/* ---------- 4. 搜索索引条数 ---------- */
if (exists(SEARCH_INDEX)) {
  const js = readUtf8(SEARCH_INDEX);
  const n = (js.match(/"t":/g) || []).length;
  const expect = pages.length + 1; // pages + 首页
  if (n < expect - 2) fail(`搜索索引条数 ${n}，预期约 ${expect}`);
  else pass(`搜索索引 ${n} 条（预期约 ${expect}）`);
}

/* ---------- 5. sitemap ---------- */
if (exists(SITEMAP)) {
  const xml = readUtf8(SITEMAP);
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  if (urls.length < pages.length) fail(`sitemap URL 数 ${urls.length} < 页面数 ${pages.length}`);
  else pass(`sitemap URL ${urls.length} 条`);
  const broken = [];
  for (const u of urls) {
    const m = u.match(/^https?:\/\/[^/]+\/zhaolezi\/(.*)$/);
    if (!m) { broken.push(u + '（非本站 URL）'); continue; }
    let rel = decodeURIComponent(m[1]);
    if (!rel || rel.endsWith('/')) rel += 'index.html';
    if (!exists(path.join(ROOT, rel))) broken.push(u);
  }
  if (broken.length) fail(`sitemap 指向不存在的文件 ${broken.length} 条：${broken.slice(0, 5).join(' , ')}`);
  else pass('sitemap 全部 URL 可解析');
}

/* ---------- 6. Service Worker 预缓存清单 ---------- */
if (exists(SW)) {
  const sw = readUtf8(SW);
  const ver = sw.match(/CACHE[^=]*=\s*['"]([^'"]+)['"]/) || sw.match(/['"](zhaolezi[^'"]*v[\d.]+[^'"]*)['"]/i);
  ver ? pass(`SW 缓存版本 ${ver[1]}`) : warn('SW 未识别到缓存版本常量');
  const list = sw.match(/(?:PRECACHE|ASSETS)[^=]*=\s*\[([\s\S]*?)\]/);
  if (list) {
    const urls = [...list[1].matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]).filter((u) => !/^https?:/.test(u));
    const miss = urls.filter((u) => { const rel = u.replace(/^\.?\//, ''); return rel && !exists(path.join(ROOT, rel)); });
    if (miss.length) fail(`SW 预缓存清单有 ${miss.length} 个文件不存在：${miss.slice(0, 5).join(' , ')}`);
    else pass(`SW 预缓存清单 ${urls.length} 项全部存在`);
  } else warn('SW 未识别到预缓存数组');
  if (!/addEventListener\(\s*['"]message['"]/.test(sw)) warn('SW 未见 message 监听（SKIP_WAITING 更新提示链路）');
  else pass('SW message 监听在位（SKIP_WAITING）');
}

/* ---------- 6.5 分站 manifest 的 start_url 可解析性（警告级，不阻塞） ---------- */
for (const rel of ['assets/af/af-manifest.json', 'assets/cy/cy-manifest.json', 'assets/xd/xd-manifest.json', 'assets/ai/ai-manifest.json']) {
  const p = path.join(ROOT, rel);
  if (!exists(p)) continue;
  let j;
  try { j = JSON.parse(readUtf8(p)); } catch { warn(`${rel} JSON 解析失败`); continue; }
  const su = j.start_url || './';
  const resolved = path.resolve(path.dirname(p), su);
  if (!exists(resolved)) warn(`${rel} start_url=${su} 解析为不存在：${path.relative(ROOT, resolved)}（PWA 安装入口会 404，属历史遗留）`);
  else pass(`${rel} start_url 可解析`);
}

/* ---------- 7. 本地静态资源可解析 ---------- */
const missingAssets = new Map();
function checkRefs(htmlFile) {
  // 教程页的示例代码块里会有 a.png / style.css 这类假路径，先剥掉 pre/code 再校验
  const html = readUtf8(htmlFile).replace(/<pre[\s\S]*?<\/pre>/gi, '').replace(/<code[\s\S]*?<\/code>/gi, '');
  const dir = path.dirname(htmlFile);
  const refs = [...html.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/g)].map((m) => m[1]);
  for (let ref of refs) {
    if (/^(?:https?:|mailto:|tel:|javascript:|data:|#|\/\/)/i.test(ref)) continue;
    ref = ref.split('#')[0].split('?')[0];
    if (!ref || !/\.(?:html|css|js|json|png|jpe?g|webp|gif|svg|ico|mp3|wav|xml|txt)$/i.test(ref)) continue;
    const abs = path.resolve(dir, decodeURIComponent(ref));
    if (!abs.startsWith(ROOT)) continue;
    if (!exists(abs)) {
      const rel = path.relative(ROOT, htmlFile).replace(/\\/g, '/');
      if (!missingAssets.has(rel)) missingAssets.set(rel, []);
      missingAssets.get(rel).push(ref);
    }
  }
}
const scanTargets = [INDEX, ...pages.map((f) => path.join(PAGES_DIR, f))].filter(exists);
for (const f of scanTargets) checkRefs(f);
if (missingAssets.size) {
  const detail = [...missingAssets.entries()].slice(0, 6).map(([p, rs]) => `${p} → ${rs.slice(0, 3).join(',')}`);
  fail(`${missingAssets.size} 个页面存在断链：${detail.join('；')}`);
} else pass(`${scanTargets.length} 页本地资源引用全部可解析`);

/* ---------- 输出 ---------- */
console.log('\n=== 产物完整性校验 ===');
for (const m of ok) console.log('  ✓ ' + m);
for (const m of warns) console.log('  ! ' + m);
for (const m of fails) console.log('  ✗ ' + m);
console.log(`\n结果：${fails.length ? 'FAIL' : 'PASS'}（通过 ${ok.length} / 警告 ${warns.length} / 失败 ${fails.length}）`);
process.exit(fails.length ? 1 : 0);
