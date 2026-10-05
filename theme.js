/* 找乐子 V1.5 - 全局主题系统（默认深色流光 + 21 主题 + 自定义上传背景，源自 AI提示词/全能文件保存）
 * 主题面板：点右下角按钮弹出色块列表，点击应用，localStorage zl_theme 记忆
 * V1.5 新增：custom 主题支持上传本地图片作背景（压缩后存 localStorage zl_custom_bg）；
 *          左下角 👁 欣赏模式按钮（与右下角主题按钮对称同大小，点击隐藏界面只看背景） */
(function () {
    var KEY = 'zl_theme';
    var BGB_KEY = 'zl_custom_bg';
    var THEMES = ['dark', 'blue', 'gold', 'light', 'milk', 'guofeng', 'snowsun', 'cyber', 'aurora', 'custom'];
    var LABELS = { dark: '深色流光', blue: '经典蓝', gold: '鎏金', light: '明亮', milk: '牛奶',
        guofeng: '国风', snowsun: '雪阳', cyber: '赛博', aurora: '极光', custom: '自定义' };
    // 兼容旧主题：neon → cyber（最接近），light 保留；已下架主题自动回退 dark
    var LEGACY = { neon: 'cyber' };
    var current = localStorage.getItem(KEY) || 'dark';
    if (LEGACY[current]) current = LEGACY[current];
    if (THEMES.indexOf(current) < 0) current = 'dark';

    var panel = null;

    function applyCustomBg() {
        var bg = localStorage.getItem(BGB_KEY);
        if (bg) {
            document.documentElement.style.setProperty('--custom-bg', 'url(' + bg + ')');
        }
    }

    function apply(t) {
        document.documentElement.setAttribute('data-theme', t);
        localStorage.setItem(KEY, t);
        current = t;
        if (t === 'custom') applyCustomBg();
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

    // 上传自定义背景：读图 → 压缩（最长边 ≤1600）→ jpeg dataURL → localStorage → 应用
    function uploadCustomBg(file) {
        if (!file || file.type.indexOf('image/') !== 0) { alert('请选择图片文件'); return; }
        var fr = new FileReader();
        fr.onload = function () {
            var img = new Image();
            img.onload = function () {
                var MAX = 1600;
                var w = img.width, h = img.height;
                var scale = 1;
                if (Math.max(w, h) > MAX) scale = MAX / Math.max(w, h);
                w = Math.round(w * scale); h = Math.round(h * scale);
                var cv = document.createElement('canvas');
                cv.width = w; cv.height = h;
                var ctx = cv.getContext('2d');
                ctx.fillStyle = '#000';
                ctx.fillRect(0, 0, w, h);
                ctx.drawImage(img, 0, 0, w, h);
                var data = cv.toDataURL('image/jpeg', 0.85);
                try {
                    localStorage.setItem(BGB_KEY, data);
                    applyCustomBg();
                    alert('自定义背景已保存并应用（切换其他主题后选「自定义」可恢复）');
                } catch (e) {
                    alert('图片太大无法保存（本地存储容量有限），请换更小的图');
                }
            };
            img.onerror = function () { alert('图片读取失败，请换一张试试'); };
            img.src = fr.result;
        };
        fr.readAsDataURL(file);
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
            // 自定义项：附加上传背景按钮
            if (t === 'custom') {
                var up = document.createElement('span');
                up.className = 'zl-custom-up';
                up.textContent = '📤';
                up.title = '上传本地图片作自定义背景';
                var fi = document.createElement('input');
                fi.type = 'file';
                fi.accept = 'image/*';
                fi.style.display = 'none';
                fi.onchange = function () {
                    if (this.files && this.files[0]) uploadCustomBg(this.files[0]);
                    this.value = '';
                };
                up.onclick = function (e) {
                    e.stopPropagation();
                    fi.click();
                };
                it.appendChild(up);
                it.appendChild(fi);
            }
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
