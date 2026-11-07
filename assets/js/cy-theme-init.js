/* 主题预初始化 —— 同步加载，防 FOUC（Flash of Unstyled Content）
 * 必须在 <head> 中 <link rel="stylesheet"> 之前加载，不能用 defer。
 * 每个页面原本内联这段 6 行代码，现提取为本文件统一管理。 */
try {
    var _ct = localStorage.getItem('cy_theme');
    var _ok = ['zhaolezi','blue','gold','light','snowsun','aurora'];
    if (_ct && _ok.indexOf(_ct) >= 0) { document.documentElement.setAttribute('data-theme', _ct); }
} catch (e) {}
