// 找乐子工具箱 - Service Worker（V4：V1.4.4 真实背景图片内嵌 common.css）
// V8：2026-09-30 33.html 体验重构（14类350条+心情筛选+详情卡+收藏+倒计时）修复 common.js 防小白 head 加载 appendChild 缺陷
// V12：2026-10-01 全站可读性兜底修复（对比度引擎11项修复+42页×10主题审计全部通过）
// V13：2026-10-02 防回归机制 b+c 落地（构建期 preCheck + 运行时 ZL.verifyAudit）
// V14：2026-10-02 全站修复推进（favicon/17-data.js/背景图外置/robots/sitemap）新增预缓存资源
// V15：2026-10-04 整站提升V2（全部页面+公共脚本入预缓存；音频/内容图仍走运行时缓存）
// V16：2026-10-04 43-46 学习工具箱四页（错题本/学习仪表盘/知识图谱/专注计时）入预缓存
// V17：2026-10-06 跨页打通（zl-features.js 新增事件总线 + 43 真实复习 + 44 待复习卡 + 45 错题反推 + 15/22 崩溃修复）
// V18：2026-10-06 自动构建（公共层/页面更新，缓存随构建递增）
// V19：2026-10-06 自动构建（公共层/页面更新，缓存随构建递增）
// V20：2026-10-06 自动构建（公共层/页面更新，缓存随构建递增）
// V21：2026-10-06 自动构建（公共层/页面更新，缓存随构建递增）
// V22：2026-10-06 自动构建（公共层/页面更新，缓存随构建递增）
// V23：2026-10-06 自动构建（公共层/页面更新，缓存随构建递增）
// V24：2026-10-06 自动构建（公共层/页面更新，缓存随构建递增）
// V25：2026-10-06 自动构建（公共层/页面更新，缓存随构建递增）
// V26：2026-10-06 自动构建（公共层/页面更新，缓存随构建递增）
// V27：2026-10-06 自动构建（公共层/页面更新，缓存随构建递增）
// V28：2026-10-06 自动构建（公共层/页面更新，缓存随构建递增）
// V29：2026-10-06 自动构建（公共层/页面更新，缓存随构建递增）
// V30：2026-10-06 自动构建（公共层/页面更新，缓存随构建递增）
// V31：2026-10-06 自动构建（公共层/页面更新，缓存随构建递增）
// V32：2026-10-06 自动构建（公共层/页面更新，缓存随构建递增）
// V33：2026-10-06 自动构建（公共层/页面更新，缓存随构建递增）
// V34：2026-10-06 自动构建（公共层/页面更新，缓存随构建递增）
// V35：2026-10-06 自动构建（公共层/页面更新，缓存随构建递增）
// V36：2026-10-06 自动构建（公共层/页面更新，缓存随构建递增）
// V37：2026-10-06 自动构建（公共层/页面更新，缓存随构建递增）
// V38：2026-10-06 自动构建（公共层/页面更新，缓存随构建递增）
// V39：2026-10-06 自动构建（公共层/页面更新，缓存随构建递增）
// V40：2026-10-06 自动构建（公共层/页面更新，缓存随构建递增）
// V41：2026-10-06 自动构建（公共层/页面更新，缓存随构建递增）
// V42：2026-10-06 自动构建（公共层/页面更新，缓存随构建递增）
// V43：2026-10-06 自动构建（公共层/页面更新，缓存随构建递增）
// V44：2026-10-06 自动构建（公共层/页面更新，缓存随构建递增）
// V45：2026-10-06 自动构建（公共层/页面更新，缓存随构建递增）
// V46：2026-10-06 自动构建（公共层/页面更新，缓存随构建递增）
// V47：2026-10-06 自动构建（公共层/页面更新，缓存随构建递增）
// V48：2026-10-06 自动构建（公共层/页面更新，缓存随构建递增）
// V49：2026-10-06 自动构建（公共层/页面更新，缓存随构建递增）
// V50：2026-10-06 自动构建（公共层/页面更新，缓存随构建递增）
// V51：2026-10-06 自动构建（公共层/页面更新，缓存随构建递增）
// V52：2026-10-06 自动构建（公共层/页面更新，缓存随构建递增）
// V53：2026-10-06 自动构建（公共层/页面更新，缓存随构建递增）
// V54：2026-10-06 自动构建（公共层/页面更新，缓存随构建递增）
// V55：2026-10-06 自动构建（公共层/页面更新，缓存随构建递增）
// V56：2026-10-06 自动构建（公共层/页面更新，缓存随构建递增）
// V57：2026-10-06 自动构建（公共层/页面更新，缓存随构建递增）
// V58：2026-10-06 自动构建（公共层/页面更新，缓存随构建递增）
// V59：2026-10-06 自动构建（公共层/页面更新，缓存随构建递增）
// V60：2026-10-06 自动构建（公共层/页面更新，缓存随构建递增）
// V61：2026-10-06 自动构建（公共层/页面更新，缓存随构建递增）
// V62：2026-10-06 自动构建（公共层/页面更新，缓存随构建递增）
// V63：2026-10-06 成就系统 V2.2（94 条成就 + 成就中心 + 跨页埋点与弹卡）
// V64：2026-10-06 自动构建（公共层/页面更新，缓存随构建递增）
// V65：2026-10-06 自动构建（公共层/页面更新，缓存随构建递增）
// V66：2026-10-06 自动构建（公共层/页面更新，缓存随构建递增）
// V67：2026-10-06 自动构建（公共层/页面更新，缓存随构建递增）
// V68：2026-10-06 自动构建（公共层/页面更新，缓存随构建递增）
// V69：2026-10-06 PWA 离线体验修复（静态资源失败回落 offline.html 兜底页 + 导航离线改走 offline.html 而非首页；ASSETS 追加 offline.html）
// V70：2026-10-06 自动构建（公共层/页面更新，缓存随构建递增）
// V71：2026-10-06 自动构建（公共层/页面更新，缓存随构建递增）
// V72：2026-10-06 自动构建（公共层/页面更新，缓存随构建递增）
// V73：2026-10-06 自动构建（公共层/页面更新，缓存随构建递增）
// V74：2026-10-06 自动构建（公共层/页面更新，缓存随构建递增）
// V75：2026-10-06 自动构建（公共层/页面更新，缓存随构建递增）
// V76：2026-10-06 自动构建（公共层/页面更新，缓存随构建递增）
// V77：2026-10-06 自动构建（公共层/页面更新，缓存随构建递增）
// V78：2026-10-06 自动构建（公共层/页面更新，缓存随构建递增）
// V79：2026-10-06 自动构建（公共层/页面更新，缓存随构建递增）
// V82：2026-10-07 液态玻璃层 V2.3.0（M3 修复：筛选胶囊初始文本 + 放大收起恢复背景滚动）
// V83：2026-10-07 自动构建（公共层/页面更新，缓存随构建递增）
// V84：2026-10-07 液态玻璃层 V2.3.1（四条增强：Dock 呼吸灯+长按二级入口 / Ctrl+K 最近访问+热词 / 放大态键盘切换 / 44 打卡即时刷新）
// V85：2026-10-07 液态玻璃层 V2.3.1（修复：Ctrl+K 被 common.js 键盘保护拦截，改 capture 阶段注册）
const CACHE_NAME = 'zhaolezi-v85';
const ASSETS = [
  './',
  './index.html',
  './1.html', './2.html', './3.html', './4.html', './5.html', './6.html',
  './7.html', './8.html', './9.html', './10.html', './11.html', './12.html',
  './13.html', './14.html', './15.html', './16.html', './17.html', './18.html',
  './19.html', './20.html', './21.html', './22.html', './23.html', './24.html',
  './25.html', './26.html', './27.html', './28.html', './29.html', './30.html',
  './31.html', './32.html', './33.html', './34.html', './35.html', './36.html',
  './37.html', './38.html', './39.html', './40.html', './41.html', './42.html',
  './43.html', './44.html', './45.html', './46.html',
  './文件搜索.html',
  './verify.html',
  './offline.html',
  './manifest.json',
  './17-data.js',
  './common.css',
  './common.js',
  './theme.js',
  './zl-features.js',
  './zl-glass.js',
  './favicon.ico',
  './favicon.svg',
  './favicon-48.png',
  './robots.txt',
  './sitemap.xml',
  './images/bg-blue.jpg',
  './images/bg-gold.jpg',
  './images/bg-light.jpg',
  './images/bg-milk.jpg',
  './images/bg-guofeng.jpg',
  './images/bg-snowsun.jpg',
  './images/bg-cyber.jpg',
  './images/bg-aurora.jpg',
  './images/bg-custom.jpg'
];

// 安装：预缓存核心资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// 激活：清理旧缓存（v1 -> v2 升级时自动清空）
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// 请求：HTML 导航走网络优先（保证新版本及时生效），静态资源走缓存优先（提速）
self.addEventListener('fetch', (event) => {
  // 只处理GET请求
  if (event.request.method !== 'GET') return;

  // 跳过跨域请求
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  // 导航请求（页面文档）：网络优先，失败回退缓存 → offline.html → 首页
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => cache.put(event.request, responseToCache));
          }
          return response;
        })
        .catch(() => {
          // 网络失败：先看当前页面缓存，再回落到离线提示页，最后首页
          return caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return caches.match('./offline.html').then((off) => off || caches.match('./index.html'));
          });
        })
    );
    return;
  }

  // 静态资源：缓存优先，网络回退并写缓存
  event.respondWith(
    caches.match(event.request)
      .then((cached) => {
        if (cached) return cached;

        return fetch(event.request)
          .then((response) => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => cache.put(event.request, responseToCache));
            return response;
          })
          .catch(() => {
            // 离线且无缓存：先回退到 offline.html 兜底页，miss 再走首页
            // 此前此处返回 undefined 会让 respondWith 无响应，导致 23 页分片离线时静默失败
            return caches.match('./offline.html').then((off) => off || caches.match('./index.html'));
          });
      })
  );
});
