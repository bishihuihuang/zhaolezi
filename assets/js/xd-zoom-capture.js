/* ============================================================
 * 图文课卡就地放大 · 前置捕获拦截（v1.5 局部注入，2026-10-17）
 * 背景：common.js 全站统一跳转动画 hook（__JUMP_ANIM_INIT__，
 *       2026-10-11 加入，跨 5 站共享）在捕获阶段拦截相对 .html 链接，
 *       调用 preventDefault + stopImmediatePropagation 后走 900ms 动画
 *       整页跳转。因此 bubble 阶段的模块就地放大委托（xd-features.js
 *       Block3）永远收不到图文课卡点击——设计冲突，非重写回归。
 * 做法：本脚本在 common.js 之前加载（defer 按文档序执行），
 *       捕获阶段监听注册顺序先于 hook，命中图文课卡时"抢"点击，
 *       调用 XD.zoom.openCard 复用 Block3 放大流程完成就地预览；
 *       其余点击（测验/工具/目录卡、普通链接、按钮）原样放行，
 *       跳转动画行为不受影响。
 * 注入范围：目录页（renderDir 渲染图文课卡所在的 21 个页面）。
 * ============================================================ */
(function () {
    'use strict';
    if (window.__ZOOM_CAPTURE_INIT__) return;
    window.__ZOOM_CAPTURE_INIT__ = true;

    document.addEventListener('click', function (e) {
        var c = e.target && e.target.closest ? e.target.closest('.module-card') : null;
        if (!c) return; /* 非模块卡 → 放行给 hook 正常跳转动画 */
        var Z = window.XD && XD.zoom;
        if (!Z || !Z.isDoc(c)) return; /* 测验/工具/目录卡或接口缺失 → 放行 */
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation(); /* 抢在 hook 之前终结本次点击 */
        Z.openCard(c);
    }, true);
})();
