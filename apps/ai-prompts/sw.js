/* V2.7.0 四站并入找乐子：旧站独立 SW 已退役——本文件自注销并清理旧缓存。
 * 背景：ai-prompts 并入找乐子仓库 apps/ai-prompts/ 后，不再需要独立离线缓存；
 *      子目录 SW 会拦截 apps 内请求走旧缓存，故部署此自注销版以清理历史注册。
 */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (event) {
    event.waitUntil(
        caches.keys()
            .then(function (keys) {
                return Promise.all(keys.map(function (k) { return caches.delete(k); }));
            })
            .then(function () { return self.registration.unregister(); })
            .then(function () { return self.clients.matchAll(); })
            .then(function (clients) {
                clients.forEach(function (client) {
                    if (client.navigate) client.navigate(client.url);
                });
            })
    );
});
