/* 找乐子 V1.5 - 全局主题系统（默认深色流光 + 6 主题，源自 AI提示词/全能文件保存）
 * 主题面板：点右下角按钮弹出色块列表，点击应用，localStorage zl_theme 记忆
 * V1.5：左下角 👁 欣赏模式按钮（与右下角主题按钮对称同大小，点击隐藏界面只看背景）
 * V1.6：主题精简为 6 个（深色流光/经典蓝/鎏金/明亮/雪阳/极光）；custom 上传背景、
 *       milk/guofeng/cyber 已下架，旧值自动回退 dark */
(function () {
    var KEY = 'zl_theme';
    var THEMES = ['dark', 'blue', 'gold', 'light', 'snowsun', 'aurora'];
    var LABELS = { dark: '深色流光', blue: '经典蓝', gold: '鎏金', light: '明亮',
        snowsun: '雪阳', aurora: '极光' };
    // 兼容旧主题：neon → aurora（最接近），已下架主题自动回退 dark
    var LEGACY = { neon: 'aurora' };
    var current = localStorage.getItem(KEY) || 'dark';
    if (LEGACY[current]) current = LEGACY[current];
    if (THEMES.indexOf(current) < 0) current = 'dark';

    var panel = null;

    function apply(t) {
        document.documentElement.setAttribute('data-theme', t);
        localStorage.setItem(KEY, t);
        current = t;
        if (panel) {
            var items = panel.querySelectorAll('.zl-theme-item');
            for (var i = 0; i < items.length; i++) {
                items[i].className = items[i].getAttribute('data-t') === t ? 'zl-theme-item active' : 'zl-theme-item';
            }
        }
        var btn = document.getElementById('zlThemeBtn');
        if (btn) btn.setAttribute('data-t', t);
    }

    function dotBg(t) {
        if (t === 'dark') return 'linear-gradient(135deg,#0a0e27,#331d6e)';
        var prev = document.documentElement.getAttribute('data-theme');
        document.documentElement.setAttribute('data-theme', t);
        var s = getComputedStyle(document.documentElement);
        var a = s.getPropertyValue('--gold').trim();
        var b = s.getPropertyValue('--gold-2').trim();
        document.documentElement.setAttribute('data-theme', prev || 'dark');
        return 'linear-gradient(135deg,' + (a || '#888') + ',' + (b || '#888') + ')';
    }

    function buildPanel() {
        panel = document.createElement('div');
        panel.className = 'zl-theme-panel';
        var title = document.createElement('div');
        title.className = 'zl-theme-title';
        title.textContent = '🎨 主题切换';
        panel.appendChild(title);
        var grid = document.createElement('div');
        grid.className = 'zl-theme-grid';
        for (var i = 0; i < THEMES.length; i++) {
            var t = THEMES[i];
            var it = document.createElement('div');
            it.className = 'zl-theme-item' + (t === current ? ' active' : '');
            it.setAttribute('data-t', t);
            it.setAttribute('role', 'button');
            it.title = '切换为' + (LABELS[t] || t);
            var dot = document.createElement('div');
            dot.className = 'zl-theme-dot';
            dot.style.background = dotBg(t);
            var nm = document.createElement('span');
            nm.textContent = LABELS[t] || t;
            it.appendChild(dot);
            it.appendChild(nm);
            it.onclick = function () { apply(this.getAttribute('data-t')); };
            grid.appendChild(it);
        }
        panel.appendChild(grid);
        document.body.appendChild(panel);
    }

    function init() {
        apply(current);
        var btn = document.createElement('div');
        btn.id = 'zlThemeBtn';
        btn.title = '切换主题';
        btn.setAttribute('aria-label', '切换主题');
        btn.innerHTML = '🎨';
        btn.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:2147483646;width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:20px;box-shadow:0 4px 16px rgba(0,0,0,.35);user-select:none;-webkit-user-select:none;';
        btn.onclick = function () {
            if (panel) {
                var open = panel.classList.toggle('open');
                if (open) apply(current);
            }
        };
        document.body.appendChild(btn);
        buildPanel();
        // V1.5 左下角欣赏模式按钮（与主题按钮对称、同大小；隐藏界面只看背景，再点恢复）
        var admire = document.createElement('div');
        admire.id = 'zlAdmireBtn';
        admire.title = '欣赏模式：隐藏界面只看背景';
        admire.setAttribute('aria-label', '欣赏模式');
        admire.innerHTML = '👁';
        admire.style.cssText = 'position:fixed;bottom:20px;left:20px;z-index:2147483646;width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#11998e,#38ef7d);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:20px;box-shadow:0 4px 16px rgba(0,0,0,.35);user-select:none;-webkit-user-select:none;transition:opacity .3s;';
        admire.onclick = function () {
            var on = document.body.classList.toggle('zl-admire');
            this.style.opacity = on ? '0.6' : '1';
            this.title = on ? '退出欣赏模式' : '欣赏模式：隐藏界面只看背景';
        };
        document.body.appendChild(admire);
        document.addEventListener('click', function (e) {
            if (panel && panel.classList.contains('open') && !panel.contains(e.target) && e.target !== btn) {
                panel.classList.remove('open');
            }
        });
    }

    if (document.body) {
        init();
    } else {
        document.addEventListener('DOMContentLoaded', init);
    }
})();
