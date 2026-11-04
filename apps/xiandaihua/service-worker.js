/* V2.7.0 四站并入找乐子：旧站独立 SW 已退役。
 * 行为：一次性清理本站历史缓存并注销自己（不刷新页面，避免与页面注册逻辑互扰）。
 * 并入后离线缓存由找乐子主站 SW 统一负责。 */
self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (event) {
    event.waitUntil(
        caches.keys()
            .then(function (keys) {
                return Promise.all(keys.map(function (k) { return caches.delete(k); }));
            })
            .then(function () { return self.registration.unregister(); })
    );
});
/* 页面若仍有旧版注册代码，重新注册本文件只会得到一个空壳（无 fetch 拦截），无害。 */
