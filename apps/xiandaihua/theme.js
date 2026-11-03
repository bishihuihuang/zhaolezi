/* ============================================================
 * 全局主题系统（默认深空流光 + 10 主题 + 自定义上传背景）
 * - 右下角 🎨 主题按钮：色块面板，点击应用，localStorage xd_theme 记忆
 * - custom 主题：支持上传本地图片作背景（压缩后存 xd_custom_bg）
 * - 左下角 👁 欣赏模式按钮：与主题按钮对称同大小，隐藏界面只看背景
 * - 字号调节 A−/A/A+：持久化 xd_font_scale（0.8–1.4，默认 1）
 * 页面使用约定：与 common.js/xd-features.js 一样以 defer 加载
 * ============================================================ */
(function () {
    'use strict';

    /* ---- 主题盘存：当前主题 / 主题表 / 旧名映射 ---- */
    var KEY = 'xd_theme';
    var BGB_KEY = 'xd_custom_bg';
    var THEMES = ['zhaolezi', 'blue', 'gold', 'light', 'snowsun', 'aurora'];
    var LABELS = { zhaolezi: '彩虹亮彩', blue: '经典蓝', gold: '鎏金', light: '明亮', snowsun: '雪阳', aurora: '极光' };
    var LEGACY = { neon: 'zhaolezi', dark: 'zhaolezi', milk: 'zhaolezi', guofeng: 'zhaolezi', cyber: 'zhaolezi', custom: 'zhaolezi' };
    var current = localStorage.getItem(KEY) || 'zhaolezi';
    if (LEGACY[current]) current = LEGACY[current];
    if (THEMES.indexOf(current) < 0) current = 'zhaolezi';

    var panel = null;

    /* ---- 字号调节 A− / A / A+（持久化 xd_font_scale，0.8–1.4，默认 1） ---- */
    var FS_KEY = 'xd_font_scale';
    var fScale = parseFloat(localStorage.getItem(FS_KEY));
    if (isNaN(fScale) || fScale < 0.8 || fScale > 1.4) fScale = 1;
    function clampFont(s) {
        return Math.min(1.4, Math.max(0.8, Math.round(s * 10) / 10));
    }
    function applyFont(s) {
        fScale = clampFont(s);
        document.documentElement.style.setProperty('--font-scale', fScale);
        try { localStorage.setItem(FS_KEY, String(fScale)); } catch (e) {}
        try {
            if (window.XD && XD.showToast) {
                XD.showToast('🔠 字号 ' + Math.round(fScale * 100) + '%（' + (fScale === 1 ? '默认' : fScale > 1 ? '放大' : '缩小') + '）', 1800);
            }
        } catch (e) {}
    }
    function buildFontBox() {
        // 每次注入前先移除旧的，防止重复初始化
        var old = document.getElementById('xdFontBtns');
        if (old && old.parentNode) old.parentNode.removeChild(old);
        var box = document.createElement('div');
        box.id = 'xdFontBtns';
        box.className = 'xd-font-box';
        box.setAttribute('role', 'group');
        box.setAttribute('aria-label', '字号调节');
        box.innerHTML = '<button class="xd-font-btn" type="button" data-f="-0.1" title="减小字号">A−</button>' +
                        '<button class="xd-font-btn" type="button" data-f="0" title="恢复默认字号">A</button>' +
                        '<button class="xd-font-btn" type="button" data-f="0.1" title="增大字号">A+</button>';
        box.addEventListener('click', function (e) {
            var b = e.target.closest('.xd-font-btn');
            if (!b) return;
            var d = parseFloat(b.getAttribute('data-f'));
            applyFont(d === 0 ? 1 : fScale + d);
        });
        document.body.appendChild(box);
    }

    /* ---- 自定义背景：应用已存图片 / 上传新图压缩入库 ---- */
    function applyCustomBg() {
        var bg = localStorage.getItem(BGB_KEY);
        if (bg) {
            document.documentElement.style.setProperty('--custom-bg', 'url(' + bg + ')');
        }
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

    /* ---- 主题应用：换 data-theme → 持久化 → 面板高亮同步 ---- */
    function apply(t) {
        document.documentElement.setAttribute('data-theme', t);
        localStorage.setItem(KEY, t);
        current = t;
        if (t === 'custom') applyCustomBg();
        if (panel) {
            var items = panel.querySelectorAll('.xd-theme-item');
            for (var i = 0; i < items.length; i++) {
                items[i].className = 'xd-theme-item' + (items[i].getAttribute('data-t') === t ? ' active' : '');
            }
        }
        var btn = document.getElementById('xdThemeBtn');
        if (btn) btn.setAttribute('data-t', t);
    }

    /* ---- 色块渐变预览：dark 固定深空流光；其余临时切主题读 --gold 系 ---- */
    function dotBg(t) {
        if (t === 'zhaolezi') return 'conic-gradient(from 0deg,#ff6b6b,#f6d365,#38ef7d,#7c5cff,#ff6b6b)';
        var prev = document.documentElement.getAttribute('data-theme');
        document.documentElement.setAttribute('data-theme', t);
        var s = getComputedStyle(document.documentElement);
        var a = s.getPropertyValue('--gold').trim();
        var b = s.getPropertyValue('--gold-2').trim();
        document.documentElement.setAttribute('data-theme', prev || 'zhaolezi');
        return 'linear-gradient(135deg,' + (a || '#888') + ',' + (b || '#888') + ')';
    }

    /* ---- 主题面板：标题 + 主题色块网格（custom 附上传按钮） ---- */
    function buildPanel() {
        panel = document.createElement('div');
        panel.className = 'xd-theme-panel';
        var title = document.createElement('div');
        title.className = 'xd-theme-title';
        title.textContent = '🎨 主题切换';
        panel.appendChild(title);
        var grid = document.createElement('div');
        grid.className = 'xd-theme-grid';
        for (var i = 0; i < THEMES.length; i++) {
            var t = THEMES[i];
            var it = document.createElement('div');
            it.className = 'xd-theme-item' + (t === current ? ' active' : '');
            it.setAttribute('data-t', t);
            it.setAttribute('role', 'button');
            it.title = '切换为' + (LABELS[t] || t);
            var dot = document.createElement('div');
            dot.className = 'xd-theme-dot';
            dot.style.background = dotBg(t);
            var nm = document.createElement('span');
            nm.textContent = LABELS[t] || t;
            it.appendChild(dot);
            it.appendChild(nm);
            it.onclick = function () { apply(this.getAttribute('data-t')); };
            // 自定义项：附加上传背景按钮
            if (t === 'custom') {
                var up = document.createElement('span');
                up.className = 'xd-custom-up';
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

    /* ---- 入口：应用主题字号 → 两个悬浮按钮 → 面板 → 外点关闭 ---- */
    function init() {
        apply(current);
        applyFont(fScale);
        buildFontBox();
        var btn = document.createElement('div');
        btn.id = 'xdThemeBtn';
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
        // 左下角欣赏模式按钮（与主题按钮对称、同大小；隐藏界面只看背景，再点恢复）
        var admire = document.createElement('div');
        admire.id = 'xdAdmireBtn';
        admire.title = '欣赏模式：隐藏界面只看背景';
        admire.setAttribute('aria-label', '欣赏模式');
        admire.innerHTML = '👁';
        admire.style.cssText = 'position:fixed;bottom:20px;left:20px;z-index:2147483646;width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#11998e,#38ef7d);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:20px;box-shadow:0 4px 16px rgba(0,0,0,.35);user-select:none;-webkit-user-select:none;transition:opacity .3s;';
        admire.onclick = function () {
            var on = document.body.classList.toggle('xd-admire');
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