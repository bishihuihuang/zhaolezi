/* 找乐子 V1.5 - 全局主题系统（默认深色流光 + 6 主题 + 自定义上传背景，源自 AI提示词/全能文件保存）
 * 主题面板：点右下角按钮弹出色块列表，点击应用，localStorage zl_theme 记忆
 * V1.5：左下角 👁 欣赏模式按钮（与右下角主题按钮对称同大小，点击隐藏界面只看背景）
 * V1.6：主题精简（milk/guofeng/cyber 下架，旧值自动回退 dark）；custom 上传背景
 *       保留为第 7 项（V126b 用户决策恢复），历史已上传背景（zl_custom_bg）无缝找回 */
(function () {
    var KEY = 'zl_theme';
    var BGB_KEY = 'zl_custom_bg';
    var LUM_KEY = 'zl_custom_bg_lum';   // V126d：背景图平均亮度（0-255），≥150 视为亮图切浅色前景
    var THEMES = ['zhaolezi', 'blue', 'gold', 'light', 'snowsun', 'aurora', 'custom'];
    var LABELS = { zhaolezi: '找乐子', blue: '经典蓝', gold: '鎏金', light: '明亮',
        snowsun: '雪阳', aurora: '极光', custom: '自定义' };
    // 兼容旧主题：neon → aurora，dark（深色流光已下架）→ zhaolezi（同为深色系）
    var LEGACY = { neon: 'aurora', dark: 'zhaolezi' };
    var current = localStorage.getItem(KEY) || 'zhaolezi';
    if (LEGACY[current]) current = LEGACY[current];
    if (THEMES.indexOf(current) < 0) current = 'zhaolezi';

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
        if (t === 'custom') {
            applyCustomBg();
            // V126d：亮图自动切浅色前景，暗图维持深色；切走时还原
            try {
                var lum = parseInt(localStorage.getItem(LUM_KEY) || '0', 10);
                document.documentElement.setAttribute('data-bg-lum', lum >= 150 ? 'light' : 'dark');
            } catch (e) {}
        } else {
            document.documentElement.removeAttribute('data-bg-lum');
        }
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
        if (t === 'zhaolezi') return 'linear-gradient(135deg,#000000,#F6D365)';
        var prev = document.documentElement.getAttribute('data-theme');
        document.documentElement.setAttribute('data-theme', t);
        var s = getComputedStyle(document.documentElement);
        var a = s.getPropertyValue('--gold').trim();
        var b = s.getPropertyValue('--gold-2').trim();
        document.documentElement.setAttribute('data-theme', prev || 'dark');
        return 'linear-gradient(135deg,' + (a || '#888') + ',' + (b || '#888') + ')';
    }

    // 上传自定义背景：读图 → 画质降级链压缩（localStorage 存得下的最高档）→ 亮度采样 → 存储 → 应用
    function uploadCustomBg(file) {
        if (!file || file.type.indexOf('image/') !== 0) { alert('请选择图片文件'); return; }
        var fr = new FileReader();
        fr.onload = function () {
            var img = new Image();
            img.onload = function () {
                // V126d 画质链：优先近无损档（2560@0.92），存不下逐档回退，保用户画质
                var chain = [[2560, 0.92, '高清'], [1920, 0.88, '标准'], [1600, 0.85, '兼容']];
                var saved = false, grade = '', lum = 128;
                for (var i = 0; i < chain.length && !saved; i++) {
                    var MAX = chain[i][0], q = chain[i][1];
                    var scale = Math.max(img.width, img.height) > MAX ? MAX / Math.max(img.width, img.height) : 1;
                    var w = Math.round(img.width * scale), h = Math.round(img.height * scale);
                    var cv = document.createElement('canvas');
                    cv.width = w; cv.height = h;
                    var ctx = cv.getContext('2d');
                    ctx.fillStyle = '#000';
                    ctx.fillRect(0, 0, w, h);
                    ctx.drawImage(img, 0, 0, w, h);
                    var data = cv.toDataURL('image/jpeg', q);
                    try {
                        localStorage.setItem(BGB_KEY, data);
                        saved = true; grade = chain[i][2];
                    } catch (e) { /* 本档存不下，降下一档 */ }
                    if (saved) {
                        // 亮度采样：均匀步进取像素做感知亮度均值（0-255）
                        try {
                            var px = ctx.getImageData(0, 0, w, h).data;
                            var sum = 0, n = 0;
                            for (var p = 0; p < px.length; p += 4 * 97) {
                                sum += 0.2126 * px[p] + 0.7152 * px[p + 1] + 0.0722 * px[p + 2];
                                n++;
                            }
                            lum = Math.round(sum / (n || 1));
                        } catch (e) {}
                    }
                }
                if (!saved) { alert('图片太大无法保存（本地存储容量有限），请换更小的图'); return; }
                try { localStorage.setItem(LUM_KEY, String(lum)); } catch (e) {}
                applyCustomBg();
                alert('自定义背景已保存（' + grade + '画质' + (lum >= 150 ? '，已自动切换浅色前景' : '') + '）');
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
            it.onclick = function () {
                // custom 项由专属单击/双击逻辑接管，避免双重触发
                if (this.getAttribute('data-t') !== 'custom') apply(this.getAttribute('data-t'));
            };
            // 自定义项（V126c）：单击=应用背景，双击=打开图片上传；📤 小按键已取消
            if (t === 'custom') {
                it.title = '单击：应用自定义背景；双击：上传背景图片';
                var fi = document.createElement('input');
                fi.type = 'file';
                fi.accept = 'image/*';
                fi.style.display = 'none';
                fi.onchange = function () {
                    if (this.files && this.files[0]) uploadCustomBg(this.files[0]);
                    this.value = '';
                };
                it.appendChild(fi);
                var applyTimer = null;
                it.addEventListener('click', function () {
                    if (applyTimer) return; // dblclick 已接管本次序列
                    applyTimer = setTimeout(function () {
                        applyTimer = null;
                        apply('custom');
                        try {
                            if (!localStorage.getItem(BGB_KEY)) {
                                alert('当前还没有自定义背景图——双击「自定义」项即可上传图片');
                            }
                        } catch (e) {}
                    }, 250);
                });
                it.addEventListener('dblclick', function (e) {
                    e.preventDefault();
                    if (applyTimer) { clearTimeout(applyTimer); applyTimer = null; }
                    fi.click();
                });
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
