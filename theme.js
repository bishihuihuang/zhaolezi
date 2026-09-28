/* 找乐子 - 全局主题切换（浅色/深色/霓虹） */
(function () {
    var KEY = 'zl_theme';
    var themes = ['dark', 'light', 'neon'];
    var labels = { dark: '🌙', light: '☀️', neon: '🌈' };
    var current = localStorage.getItem(KEY) || 'dark';
    if (themes.indexOf(current) < 0) current = 'dark';

    function apply(t) {
        document.documentElement.setAttribute('data-theme', t);
        localStorage.setItem(KEY, t);
        var btn = document.getElementById('zlThemeBtn');
        if (btn) btn.textContent = labels[t] || '🌙';
    }

    function init() {
        apply(current);
        var btn = document.createElement('div');
        btn.id = 'zlThemeBtn';
        btn.title = '切换主题（浅色/深色/霓虹）';
        btn.setAttribute('aria-label', '切换主题');
        btn.textContent = labels[current] || '🌙';
        btn.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:2147483646;width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:20px;box-shadow:0 4px 16px rgba(0,0,0,.35);user-select:none;-webkit-user-select:none;';
        btn.onclick = function () {
            var i = themes.indexOf(current);
            current = themes[(i + 1) % themes.length];
            apply(current);
        };
        if (document.body) {
            document.body.appendChild(btn);
        } else {
            document.addEventListener('DOMContentLoaded', function () { document.body.appendChild(btn); });
        }
    }

    if (document.body) {
        init();
    } else {
        document.addEventListener('DOMContentLoaded', init);
    }
})();
