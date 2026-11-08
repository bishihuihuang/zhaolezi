/* 找乐子 V2.9.2 - 全局主题系统（收敛为单一「找乐子」主题；切换按钮与面板结构保留，便于以后新增主题）
 * 主题面板：点右下角按钮弹出色块列表，点击应用，localStorage zl_theme 记忆
 * V2.9.2：主题收敛——仅保留 zhaolezi（彩虹亮彩），其余主题定义已归档冷区
 *         （E:\AI永久记忆\80_长期档案\找乐子主题收敛归档-20261107）；
 *         欣赏模式 👁 按钮已按需求移除。
 * 新增主题方法：向 THEMES/LABELS 追加条目 + common.css 补对应 [data-theme] 变量块即可。 */
(function () {
    var KEY = 'zl_theme';
    var THEMES = ['zhaolezi'];
    var LABELS = { zhaolezi: '找乐子' };
    // 兼容旧主题：所有历史主题值统一回落找乐子（其余主题已下架，定义见冷区归档）
    var LEGACY = { neon: 'zhaolezi', dark: 'zhaolezi', custom: 'zhaolezi', blue: 'zhaolezi', gold: 'zhaolezi', light: 'zhaolezi', milk: 'zhaolezi', guofeng: 'zhaolezi', snowsun: 'zhaolezi', cyber: 'zhaolezi', aurora: 'zhaolezi' };
    var current = localStorage.getItem(KEY) || 'zhaolezi';
    if (LEGACY[current]) current = LEGACY[current];
    if (THEMES.indexOf(current) < 0) current = 'zhaolezi';

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
        if (t === 'zhaolezi') return 'linear-gradient(135deg,#ff6b6b,#f6d365,#38ef7d,#7c5cff)';
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
        /* V2.9.4：站内已有主题入口时不重复注入按钮与面板
           （现代化 #xdThemeBtn / 创意 #cyThemeBtn / 提示词与全能 #themeOpen），
           否则两个主题按钮在同一角落完全重叠。 */
        if (document.getElementById('xdThemeBtn') || document.getElementById('cyThemeBtn')
            || document.getElementById('themeSwitcher') || document.getElementById('themeOpen')
            || document.querySelector('.theme-btns')) {
            return;
        }
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
        /* V2.9.2：欣赏模式 👁 按钮已按需求移除（原 zlAdmireBtn 段归档于冷区） */
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
