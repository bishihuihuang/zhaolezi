/* 创意引擎 V1.5 - 全局主题系统（默认深色流光 + 10 主题 + 自定义上传背景）
 * 主题面板：点右下角按钮弹出色块列表，点击应用，localStorage cy_theme 记忆
 * V1.5 新增：custom 主题支持上传本地图片作背景（压缩后存 localStorage cy_custom_bg）；
 *          左下角 👁 欣赏模式按钮（与右下角主题按钮对称同大小，点击隐藏界面只看背景）
 *
 * 2026-10-17 诗化重构：原 172 行单体 IIFE 拆成 10 个 ≤50 行小节，共享私有袋 CY._theme；
 *          单字母变量/形参全部换成真名字。DOM id、类名、localStorage 键、交互行为一字不动。
 */

/* ============ 1 · 常量与状态袋 ============ */
(function () {
    var bag = (window.CY = window.CY || {});
    var th = (bag._theme = bag._theme || {});
    th.KEY = 'cy_theme';
    th.BGB_KEY = 'cy_custom_bg';
    th.THEMES = ['zhaolezi'];
    th.LABELS = { zhaolezi: '找乐子' };
    /* 旧主题名迁移表：V2.9.2 主题收敛后所有历史主题值统一回落找乐子（其余主题定义归档冷区） */
    th.LEGACY = { neon: 'zhaolezi', dark: 'zhaolezi', milk: 'zhaolezi', guofeng: 'zhaolezi', cyber: 'zhaolezi', custom: 'zhaolezi', blue: 'zhaolezi', gold: 'zhaolezi', light: 'zhaolezi', snowsun: 'zhaolezi', aurora: 'zhaolezi' };
    var saved = localStorage.getItem(th.KEY) || 'zhaolezi';
    var wanted = th.LEGACY[saved] || saved;
    th.current = (th.THEMES.indexOf(wanted) >= 0) ? wanted : 'zhaolezi';
    th.panel = null;
})();

/* ============ 2 · 应用主题：写属性、记忆、同步面板高亮 ============ */
(function () {
    var bag = (window.CY && window.CY._theme);
    if (!bag) return;

    function applyCustomBg() {
        var bg = localStorage.getItem(bag.BGB_KEY);
        if (bg) {
            document.documentElement.style.setProperty('--custom-bg', 'url(' + bg + ')');
        }
    }

    function apply(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(bag.KEY, theme);
        bag.current = theme;
        if (theme === 'custom') applyCustomBg();
        if (bag.panel) {
            var items = bag.panel.querySelectorAll('.cy-theme-item');
            for (var idx = 0; idx < items.length; idx++) {
                items[idx].className = items[idx].getAttribute('data-t') === theme
                    ? 'cy-theme-item active' : 'cy-theme-item';
            }
        }
        var btn = document.getElementById('cyThemeBtn');
        if (btn) btn.setAttribute('data-t', theme);
    }

    bag.applyCustomBg = applyCustomBg;
    bag.apply = apply;
})();

/* ============ 3 · 色块背景：临时切主题读 --gold 再还原 ============ */
(function () {
    var bag = (window.CY && window.CY._theme);
    if (!bag) return;

    function dotBg(theme) {
        if (theme === 'zhaolezi') return 'conic-gradient(from 0deg,#ff6b6b,#f6d365,#38ef7d,#7c5cff,#ff6b6b)';
        var prev = document.documentElement.getAttribute('data-theme');
        document.documentElement.setAttribute('data-theme', theme);
        var style = getComputedStyle(document.documentElement);
        var gold1 = style.getPropertyValue('--gold').trim();
        var gold2 = style.getPropertyValue('--gold-2').trim();
        document.documentElement.setAttribute('data-theme', prev || 'zhaolezi');
        return 'linear-gradient(135deg,' + (gold1 || '#888') + ',' + (gold2 || '#888') + ')';
    }

    bag.dotBg = dotBg;
})();

/* ============ 4 · 上传自定义背景：读图 → 压缩 → dataURL → 存 → 应用 ============ */
(function () {
    var bag = (window.CY && window.CY._theme);
    if (!bag) return;

    var MAX_SIDE = 1600;   /* 最长边上限，避免撑爆 localStorage */
    var JPEG_Q = 0.85;     /* 压缩质量 */

    function uploadCustomBg(file) {
        if (!file || file.type.indexOf('image/') !== 0) { alert('请选择图片文件'); return; }
        var reader = new FileReader();
        reader.onload = function () {
            var img = new Image();
            img.onload = function () {
                var width = img.width, height = img.height;
                var scale = 1;
                if (Math.max(width, height) > MAX_SIDE) scale = MAX_SIDE / Math.max(width, height);
                width = Math.round(width * scale); height = Math.round(height * scale);
                var canvas = document.createElement('canvas');
                canvas.width = width; canvas.height = height;
                var ctx = canvas.getContext('2d');
                ctx.fillStyle = '#000';
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);
                var data = canvas.toDataURL('image/jpeg', JPEG_Q);
                try {
                    localStorage.setItem(bag.BGB_KEY, data);
                    bag.applyCustomBg();
                    alert('自定义背景已保存并应用（切换其他主题后选「自定义」可恢复）');
                } catch (err) {
                    alert('图片太大无法保存（本地存储容量有限），请换更小的图');
                }
            };
            img.onerror = function () { alert('图片读取失败，请换一张试试'); };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    }

    bag.uploadCustomBg = uploadCustomBg;
})();

/* ============ 5 · 面板构建：标题 + 网格 + 逐项挂载 ============ */
(function () {
    var bag = (window.CY && window.CY._theme);
    if (!bag) return;

    function buildPanel() {
        bag.panel = document.createElement('div');
        bag.panel.className = 'cy-theme-panel';
        var title = document.createElement('div');
        title.className = 'cy-theme-title';
        title.textContent = '🎨 主题切换';
        bag.panel.appendChild(title);
        var grid = document.createElement('div');
        grid.className = 'cy-theme-grid';
        bag.THEMES.forEach(function (theme) { grid.appendChild(bag.buildItem(theme)); });
        bag.panel.appendChild(grid);
        document.body.appendChild(bag.panel);
    }

    bag.buildPanel = buildPanel;
})();

/* ============ 6 · 主题项：色块 + 名称 + 点击应用 ============ */
(function () {
    var bag = (window.CY && window.CY._theme);
    if (!bag) return;

    function buildItem(theme) {
        var item = document.createElement('div');
        item.className = 'cy-theme-item' + (theme === bag.current ? ' active' : '');
        item.setAttribute('data-t', theme);
        item.setAttribute('role', 'button');
        item.title = '切换为' + (bag.LABELS[theme] || theme);
        var dot = document.createElement('div');
        dot.className = 'cy-theme-dot';
        dot.style.background = bag.dotBg(theme);
        var name = document.createElement('span');
        name.textContent = bag.LABELS[theme] || theme;
        item.appendChild(dot);
        item.appendChild(name);
        item.onclick = function () { bag.apply(this.getAttribute('data-t')); };
        if (theme === 'custom') bag.attachUpload(item);
        return item;
    }

    bag.buildItem = buildItem;
})();

/* ============ 7 · 自定义背景的上传入口 ============ */
(function () {
    var bag = (window.CY && window.CY._theme);
    if (!bag) return;

    function attachUpload(item) {
        var up = document.createElement('span');
        up.className = 'cy-custom-up';
        up.textContent = '📤';
        up.title = '上传本地图片作自定义背景';
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.style.display = 'none';
        input.onchange = function () {
            if (this.files && this.files[0]) bag.uploadCustomBg(this.files[0]);
            this.value = '';
        };
        up.onclick = function (evt) { evt.stopPropagation(); input.click(); };
        item.appendChild(up);
        item.appendChild(input);
    }

    bag.attachUpload = attachUpload;
})();

/* ============ 8 · 两个固定按钮：主题（右下）+ 欣赏模式（左下） ============ */
(function () {
    var bag = (window.CY && window.CY._theme);
    if (!bag) return;

    var BTN_BASE = 'position:fixed;bottom:20px;z-index:2147483646;width:44px;height:44px;' +
        'border-radius:50%;color:#fff;display:flex;align-items:center;justify-content:center;' +
        'cursor:pointer;font-size:20px;box-shadow:0 4px 16px rgba(0,0,0,.35);' +
        'user-select:none;-webkit-user-select:none;';

    function buildThemeBtn() {
        var btn = document.createElement('div');
        btn.id = 'cyThemeBtn';
        btn.title = '切换主题';
        btn.setAttribute('aria-label', '切换主题');
        btn.innerHTML = '🎨';
        btn.style.cssText = BTN_BASE + 'right:20px;background:linear-gradient(135deg,#6366f1,#a855f7);';
        btn.onclick = function () {
            if (bag.panel) {
                var open = bag.panel.classList.toggle('open');
                if (open) bag.apply(bag.current);
            }
        };
        document.body.appendChild(btn);
    }

    bag.buildThemeBtn = buildThemeBtn;
})();

/* ============ 9 · 欣赏模式按钮（V2.9.2 已按需求移除，原实现归档冷区） ============ */

/* ============ 10 · 点击外部收起面板 + 启动 ============ */
(function () {
    var bag = (window.CY && window.CY._theme);
    if (!bag) return;


    /* ---- 右上角导航双键（sticky 顶栏下方、滚动跟随）：返回上一页 + 返回找乐子导航站 ---- */
    function buildNavKeys() {
        if (document.getElementById('cyNavKeys')) return;
        var wrap = document.createElement('div');
        wrap.id = 'cyNavKeys';
        wrap.style.cssText = 'position:fixed;top:74px;right:16px;z-index:2147483000;display:flex;flex-direction:column;gap:10px;';
        var back = document.createElement('button');
        back.id = 'cyBackBtn';
        back.title = '返回上一页';
        back.setAttribute('aria-label', '返回上一页');
        back.textContent = '←';
        back.style.cssText = 'width:44px;height:44px;border-radius:50%;border:1px solid rgba(110,110,180,.25);background:rgba(255,255,255,.92);color:#23263a;font-size:20px;font-weight:700;cursor:pointer;box-shadow:0 6px 18px rgba(20,26,46,.22);user-select:none;-webkit-user-select:none;';
        back.onclick = function () { if (history.length > 1) history.back(); else location.href = 'index.html'; };
        var home = document.createElement('a');
        home.id = 'cyHomeBtn';
        home.title = '返回找乐子导航站';
        home.setAttribute('aria-label', '返回找乐子导航站');
        home.textContent = '🏠';
        home.href = 'index.html'; /* V2.9 修复：并入找乐子同层化后 '../../index.html' 已 404 */
        home.style.cssText = 'width:44px;height:44px;border-radius:50%;border:1px solid rgba(110,110,180,.25);background:rgba(255,255,255,.92);color:#23263a;font-size:20px;display:flex;align-items:center;justify-content:center;text-decoration:none;box-shadow:0 6px 18px rgba(20,26,46,.22);user-select:none;-webkit-user-select:none;';
        wrap.appendChild(back);
        wrap.appendChild(home);
        document.body.appendChild(wrap);
    }
    function init() {
        bag.apply(bag.current);
        buildNavKeys(); /* V2.9 修复：原 bag.buildNavKeys() 未挂载致 TypeError，主题/欣赏/面板初始化全中断 */
        bag.buildThemeBtn();
        /* V2.9.2：bag.buildAdmireBtn() 已移除（欣赏模式按钮下架） */
        bag.buildPanel();
        document.addEventListener('click', function (evt) {
            var open = bag.panel && bag.panel.classList.contains('open');
            if (open && !bag.panel.contains(evt.target) && evt.target.id !== 'cyThemeBtn') {
                bag.panel.classList.remove('open');
            }
        });
    }

    if (document.body) init();
    else document.addEventListener('DOMContentLoaded', init);
})();
