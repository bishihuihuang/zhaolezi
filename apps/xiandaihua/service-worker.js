// 现代化·知识学习站 - Service Worker
// 策略：导航请求（页面）网络优先保证新版本；静态资源缓存优先加快加载。
// 警告：ASSETS 清单与 CACHE_VERSION 由 _构建.js 自动生成/升版，请勿手改版本号。
// BUILD:CACHE_VERSION_START
const CACHE_VERSION = 'xd-v72';
// BUILD:CACHE_VERSION_END
// BUILD:ASSETS_START
const ASSETS = [
  './',
  './1.html',
  './A.html',
  './A1.html',
  './A2.html',
  './A2-1.html',
  './A2-2.html',
  './A2-3.html',
  './A2-4.html',
  './A2-5.html',
  './A3.html',
  './A4.html',
  './A4-1.html',
  './A4-2.html',
  './A4-3.html',
  './A6.html',
  './A5.html',
  './B.html',
  './B1.html',
  './B2.html',
  './B3.html',
  './B4.html',
  './B5.html',
  './B6.html',
  './B7.html',
  './C.html',
  './C1.html',
  './C2.html',
  './C3.html',
  './C4.html',
  './C5.html',
  './C6.html',
  './D.html',
  './D1.html',
  './D2.html',
  './D2-1.html',
  './D2-2.html',
  './D2-3.html',
  './D3.html',
  './D4.html',
  './E.html',
  './E1.html',
  './E2.html',
  './E3.html',
  './E4.html',
  './E6.html',
  './E7.html',
  './E5.html',
  './F.html',
  './F1.html',
  './F2.html',
  './F3.html',
  './F4.html',
  './F5.html',
  './F6.html',
  './F7.html',
  './G.html',
  './G1.html',
  './G2.html',
  './G3.html',
  './G4.html',
  './G5.html',
  './G6.html',
  './G7.html',
  './H.html',
  './H1.html',
  './H2.html',
  './H3.html',
  './H4.html',
  './H5.html',
  './H6.html',
  './I.html',
  './I1.html',
  './I2.html',
  './I3.html',
  './I4.html',
  './I5.html',
  './I6.html',
  './J.html',
  './J1.html',
  './J2.html',
  './J3.html',
  './J4.html',
  './J5.html',
  './J6.html',
  './J7.html',
  './K.html',
  './K1.html',
  './K2.html',
  './K3.html',
  './K4.html',
  './K5.html',
  './K6.html',
  './L.html',
  './L1.html',
  './L2.html',
  './L3.html',
  './L4.html',
  './L5.html',
  './L6.html',
  './M.html',
  './M1.html',
  './M2.html',
  './M3.html',
  './M4.html',
  './M5.html',
  './M6.html',
  './M7.html',
  './N.html',
  './N1.html',
  './N2.html',
  './N3.html',
  './N4.html',
  './N5.html',
  './N6.html',
  './N7.html',
  './SYS.html',
  './41.html',
  './42.html',
  './43.html',
  './SYS4.html',
  './SYS5.html',
  './SYS6.html',
  './SITE.html',
  './44.html',
  './45.html',
  './46.html',
  './manifest.json',
  './common.css',
  './common.js',
  './theme.js',
  './xd-features.js',
  './favicon.svg'
];
// BUILD:ASSETS_END

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE_VERSION).then(function (cache) {
      return Promise.all(ASSETS.map(function (u) {
        return cache.add(u).catch(function () { /* 单项失败不阻塞安装 */ });
      }));
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) {
        return k !== CACHE_VERSION;
      }).map(function (k) {
        return caches.delete(k);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;

  if (req.mode === 'navigate' || (req.destination === 'document')) {
    // 页面：网络优先，失败回退缓存
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE_VERSION).then(function (c) { c.put(req, copy); });
        return res;
      }).catch(function () {
        // 离线回退：'./' 在 ASSETS 首位必然已缓存（'./index.html' 未被预缓存，勿改回）
        return caches.match(req).then(function (r) {
          return r || caches.match('./');
        });
      })
    );
    return;
  }

  // 静态资源：缓存优先
  e.respondWith(
    caches.match(req).then(function (r) {
      if (r) return r;
      return fetch(req).then(function (res) {
        if (res && res.status === 200) {
          var copy = res.clone();
          caches.open(CACHE_VERSION).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () { return res; });
    })
  );
});
