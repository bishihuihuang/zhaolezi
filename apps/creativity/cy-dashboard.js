/* ============================================================================
   灵感运营看板：原生 canvas 图表 + 水滴分裂筛选 + 模块就地放大
   ----------------------------------------------------------------------------
   数据来源：前端种子随机生成的演示数据（刷新后一致），非真实业务数据。
   颜色全部读取 :root 令牌，随 9 套主题自动适配。

   注意：必须等 common.js（defer）执行完再取 CY.glass —— 内联脚本在解析期运行，
   那时玻璃模块还没就绪。本文件以 defer 方式加载，DOMContentLoaded 触发时
   CY.glass 已就绪，无需额外协调。

   2026-10-17 全面整改：拆为独立小节，函数体全部 ≤50 行，单字母标识符清零。
   ========================================================================= */

/* ============ 1 · 种子随机与演示数据集（刷新后一致） ============ */
(function () {
    var glass = (window.CY && window.CY.glass) || {};
    if (!glass.stage) return;
    var bag = (glass._dash = glass._dash || {});

    /* LCG 线性同余参数（Numerical Recipes）：乘数 / 增量 / 模 2^32，hex 标注可读 */
    var LCG_MULT = 0x19660D, LCG_INCR = 0x3C6EF35F, LCG_MOD = 0x100000000;

    function srand(seed) {
        var state = seed >>> 0;
        return function () { state = (state * LCG_MULT + LCG_INCR) >>> 0; return state / LCG_MOD; };
    }

    var TOOLS = [['💡灵感', 14], ['✍️文案', 11], ['📑摘要', 8], ['🎨配色', 7],
        ['🔍体检', 6], ['🖼️艺术', 5], ['⚖️决策', 4], ['🎯目标', 5],
        ['📓记录', 6], ['🧩连线', 3], ['📚方法', 3], ['🛡️自检', 2]];
    var TYPES = [['灵感', 40], ['文案', 24], ['艺术', 16], ['分析', 12], ['其他', 8]];
    var RANGES = [
        { key: 'today', icon: '☀️', label: '今天', seed: 11, n: 12,
            x: ['9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'] },
        { key: 'week', icon: '📅', label: '本周', seed: 23, n: 7,
            x: ['一', '二', '三', '四', '五', '六', '日'] },
        { key: 'month', icon: '🗓️', label: '本月', seed: 47, n: 20, x: null },
        { key: 'year', icon: '🌸', label: '全年', seed: 89, n: 12,
            x: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'] }
    ];

    bag.srand = srand;
    bag.TOOLS = TOOLS;
    bag.TYPES = TYPES;
    bag.RANGES = RANGES;
})();

/* ============ 2 · 数据集生成：趋势 / 柱状 / 环形 / 热力 + 指标 ============ */
(function () {
    var glass = (window.CY && window.CY.glass) || {};
    if (!glass.stage) return;
    var bag = (glass._dash = glass._dash || {});
    var srand = bag.srand, TOOLS = bag.TOOLS, TYPES = bag.TYPES;

    function buildData(range) {
        var rnd = srand(range.seed);
        var trend = [], up = 6 + rnd() * 8;
        for (var idx = 0; idx < range.n; idx++) {
            up += (rnd() - 0.42) * 7;
            up = Math.max(3, Math.min(46, up));
            trend.push(Math.round(up));
        }
        var bars = TOOLS.map(function (tool) {
            return { name: tool[0], v: Math.max(1, Math.round(tool[1] * (0.55 + rnd() * 0.9))) };
        });
        var ring = TYPES.map(function (type) {
            return { name: type[0], v: Math.max(1, Math.round(type[1] * (0.6 + rnd() * 0.8))) };
        });
        var heat = [];
        for (var rowIdx = 0; rowIdx < 4; rowIdx++) {
            var row = [];
            for (var colIdx = 0; colIdx < range.n; colIdx++) row.push(Math.round(rnd() * 100));
            heat.push(row);
        }
        var sum = trend.reduce(function (left, right) { return left + right; }, 0);
        var calls = bars.reduce(function (left, right) { return left + right.v; }, 0);
        var active = bars.filter(function (bar) { return bar.v >= 3; }).length;
        return {
            x: range.x, trend: trend, bars: bars, ring: ring, heat: heat,
            metrics: [
                { l: '灵感产出', v: sum, suf: ' 条' },
                { l: '工具调用', v: calls, suf: ' 次' },
                { l: '活跃工具', v: active, suf: ' / 13' },
                { l: '日均灵感', v: +(sum / range.n).toFixed(1), suf: ' 条' }
            ]
        };
    }

    bag.buildData = buildData;
})();

/* ============ 3 · canvas 基础：尺寸适配 / 令牌取值 / 圆角矩形 / 平滑曲线 ============ */
(function () {
    var glass = (window.CY && window.CY.glass) || {};
    if (!glass.stage) return;
    var bag = (glass._dash = glass._dash || {});

    function fit(canvas) {
        var dpr = window.devicePixelRatio || 1;
        var width = canvas.clientWidth || 100, height = canvas.clientHeight || 60;
        canvas.width = Math.max(1, Math.round(width * dpr));
        canvas.height = Math.max(1, Math.round(height * dpr));
        var ctx = canvas.getContext('2d');
        if (!ctx) return null;            /* 环境不支持 2D 上下文时跳过绘制 */
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, width, height);
        return { ctx: ctx, width: width, height: height };
    }

    function tok(name, fb) {
        var value = getComputedStyle(document.documentElement).getPropertyValue(name);
        return (value && value.trim()) || fb;
    }

    function rrect(ctx, left, top, width, height, radius) {
        if (width < 0) width = 0; if (height < 0) height = 0;
        radius = Math.min(radius, width / 2, height / 2);
        ctx.beginPath();
        ctx.moveTo(left + radius, top);
        ctx.arcTo(left + width, top, left + width, top + height, radius);
        ctx.arcTo(left + width, top + height, left, top + height, radius);
        ctx.arcTo(left, top + height, left, top, radius);
        ctx.arcTo(left, top, left + width, top, radius);
        ctx.closePath();
    }

    /* 平滑曲线：相邻点中点间的三次贝塞尔插值 */
    function smooth(ctx, pts) {
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (var idx = 1; idx < pts.length; idx++) {
            var prev = pts[idx - 1], cur = pts[idx], mx = (prev[0] + cur[0]) / 2;
            ctx.bezierCurveTo(mx, prev[1], mx, cur[1], cur[0], cur[1]);
        }
    }

    bag.fit = fit;
    bag.tok = tok;
    bag.rrect = rrect;
    bag.smooth = smooth;
})();

/* ============ 4 · 趋势图：面积 + 渐变折线 + 末端高亮 + 稀疏标签 ============ */
(function () {
    var glass = (window.CY && window.CY.glass) || {};
    if (!glass.stage) return;
    var bag = (glass._dash = glass._dash || {});
    var tok = bag.tok, smooth = bag.smooth, TAU = Math.PI * 2;
    function drawTrend(frame, data, small) {
        var ctx = frame.ctx, width = frame.width, height = frame.height;
        var max = Math.max.apply(null, data.trend), min = Math.min.apply(null, data.trend);
        var span = Math.max(1, max - min);
        var labH = small ? 0 : 16;
        var pts = data.trend.map(function (val, idx) {
            var left = 4 + (width - 8) * (data.trend.length < 2 ? 0 : idx / (data.trend.length - 1));
            var top = (height - labH - 4) - ((val - min) / span) * (height - labH - 12);
            return [left, top];
        });
        var c1 = tok('--glow', '#6366f1'), c2 = tok('--glow-2', '#a855f7'), c3 = tok('--glow-3', '#22d3ee');
        /* 面积填充（globalAlpha 兼容任意主题色格式） */ ctx.save(); ctx.globalAlpha = small ? 0.2 : 0.3;
        ctx.fillStyle = c1;
        ctx.beginPath();
        smooth(ctx, pts);
        ctx.lineTo(pts[pts.length - 1][0], height - 2);
        ctx.lineTo(pts[0][0], height - 2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        /* 折线渐变描边 */ var lg = ctx.createLinearGradient(0, 0, width, 0);
        lg.addColorStop(0, c1); lg.addColorStop(0.5, c2); lg.addColorStop(1, c3);
        ctx.beginPath();
        smooth(ctx, pts);
        ctx.strokeStyle = lg;
        ctx.lineWidth = small ? 1.4 : 2.6;
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.stroke();
        if (small) return;
        /* 末端高亮点 */ var last = pts[pts.length - 1];
        ctx.beginPath(); ctx.arc(last[0], last[1], 4.5, 0, TAU);
        ctx.fillStyle = c3; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.stroke();
        /* 稀疏 x 轴标签 */
        ctx.fillStyle = tok('--dim', '#8b93a7'); ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
        if (data.x) {
            var step = Math.ceil(data.x.length / 8);
            for (var idx = 0; idx < data.x.length; idx += step) {
                ctx.fillText(data.x[idx], pts[idx][0], height - 3);
            }
        }
    }
    bag.drawTrend = drawTrend;
})();

/* ============ 5 · 柱状图：工具使用分布 ============ */
(function () {
    var glass = (window.CY && window.CY.glass) || {};
    if (!glass.stage) return;
    var bag = (glass._dash = glass._dash || {});
    var tok = bag.tok, rrect = bag.rrect;

    function drawBars(frame, data, small) {
        var ctx = frame.ctx, width = frame.width, height = frame.height;
        var max = Math.max.apply(null, data.bars.map(function (bar) { return bar.v; }));
        var count = data.bars.length, barWidth = (width - 8) / count;
        var labH = small ? 0 : 15;
        var c1 = tok('--glow', '#6366f1'), c3 = tok('--glow-3', '#22d3ee');
        data.bars.forEach(function (bar, idx) {
            var barH = Math.max(2, (bar.v / max) * (height - labH - 6));
            var left = 4 + idx * barWidth, top = height - labH - 3 - barH;
            var grad = ctx.createLinearGradient(0, top, 0, height - labH - 3);
            grad.addColorStop(0, c3); grad.addColorStop(1, c1);
            ctx.fillStyle = grad;
            rrect(ctx, left + barWidth * 0.16, top, barWidth * 0.68, barH, small ? 2 : 6);
            ctx.fill();
            if (!small) {
                ctx.fillStyle = tok('--dim', '#8b93a7');
                ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
                ctx.fillText(bar.name, left + barWidth / 2, height - 4);
            }
        });
    }

    bag.drawBars = drawBars;
})();

/* ============ 6 · 环形图：创作类型占比 + 图例 ============ */
(function () {
    var glass = (window.CY && window.CY.glass) || {};
    if (!glass.stage) return;
    var bag = (glass._dash = glass._dash || {});
    var tok = bag.tok;

    function drawRing(frame, data, small) {
        var ctx = frame.ctx, width = frame.width, height = frame.height;
        var cx = width / 2, cy = height / 2;
        var radius = Math.min(width, height) / 2 - 3;
        var innerRadius = radius * (small ? 0.62 : 0.6);
        var total = data.ring.reduce(function (left, right) { return left + right.v; }, 0);
        var cols = [tok('--glow', '#6366f1'), tok('--glow-2', '#a855f7'),
            tok('--glow-3', '#22d3ee'), tok('--green', '#11998e'), tok('--red', '#ef4444')];
        var angle = -Math.PI / 2, gap = small ? 0.01 : 0.05;
        data.ring.forEach(function (seg, idx) {
            var ang = seg.v / total * Math.PI * 2;
            if (ang - gap * 2 <= 0) { angle += ang; return; }
            ctx.beginPath();
            ctx.arc(cx, cy, radius, angle + gap, angle + ang - gap);
            ctx.arc(cx, cy, innerRadius, angle + ang - gap, angle + gap, true);
            ctx.closePath();
            ctx.fillStyle = cols[idx % cols.length];
            ctx.fill();
            angle += ang;
        });
        if (small) return;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = tok('--txt', '#333');
        ctx.font = '800 20px sans-serif';
        ctx.fillText(total, cx, cy - 5);
        ctx.fillStyle = tok('--dim', '#8b93a7');
        ctx.font = '600 10px sans-serif';
        ctx.fillText('总计', cx, cy + 12);
        /* 图例 */
        ctx.textBaseline = 'middle';
        var lx = 8, ly = 10;
        ctx.font = '9px sans-serif'; ctx.textAlign = 'left';
        data.ring.forEach(function (seg, idx) {
            ctx.fillStyle = cols[idx % cols.length];
            ctx.fillRect(lx, ly, 7, 7);
            ctx.fillStyle = tok('--dim', '#8b93a7');
            ctx.fillText(seg.name, lx + 10, ly + 1);
            ly += 13;
        });
    }

    bag.drawRing = drawRing;
})();

/* ============ 7 · 热力图：时段活跃分布 ============ */
(function () {
    var glass = (window.CY && window.CY.glass) || {};
    if (!glass.stage) return;
    var bag = (glass._dash = glass._dash || {});
    var tok = bag.tok, rrect = bag.rrect;

    function drawHeat(frame, data, small) {
        var ctx = frame.ctx, width = frame.width, height = frame.height;
        var rows = data.heat.length, cols = data.heat[0].length;
        var cellWidth = (width - 4) / cols, cellHeight = (height - 4) / rows;
        for (var rowIdx = 0; rowIdx < rows; rowIdx++) {
            for (var colIdx = 0; colIdx < cols; colIdx++) {
                var val = data.heat[rowIdx][colIdx] / 100;
                ctx.globalAlpha = 0.12 + val * 0.82;
                ctx.fillStyle = val > 0.66 ? tok('--glow-3', '#22d3ee') : tok('--glow', '#6366f1');
                rrect(ctx, colIdx * cellWidth + 1, rowIdx * cellHeight + 1, cellWidth - 2, cellHeight - 2, small ? 1.5 : 3);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;
    }

    bag.drawHeat = drawHeat;
})();

/* ============ 8 · 看板 API：CYDASH 公开面（数据 / 周期 / paint） ============ */
document.addEventListener('DOMContentLoaded', function () {
    var glass = (window.CY && window.CY.glass) || {};
    if (!glass.stage) return;
    var bag = (glass._dash = glass._dash || {});
    var drawTrend = bag.drawTrend, drawBars = bag.drawBars, drawRing = bag.drawRing, drawHeat = bag.drawHeat;
    var cur = bag.RANGES[1];
    var data = bag.buildData(cur);

    function paint(canvas, mod, small) {
        var key = mod && mod.dataset ? mod.dataset.mod : null;
        if (!key) return;
        var frame = bag.fit(canvas);
        if (!frame) return;
        try {
            if (key === 'trend') drawTrend(frame, data, small);
            else if (key === 'bars') drawBars(frame, data, small);
            else if (key === 'ring') drawRing(frame, data, small);
            else if (key === 'heat') drawHeat(frame, data, small);
        } catch (err) { }
    }

    window.CYDASH = {
        G: glass, RANGES: bag.RANGES,
        get data() { return data; },
        set range(next) { cur = next; data = bag.buildData(next); },
        get range() { return cur; },
        paint: paint,
        fit: bag.fit, tok: bag.tok
    };
});

/* ============ 9 · 看板装配一：图表模块与指标卡渲染 ============ */
document.addEventListener('DOMContentLoaded', function () {
    var api = window.CYDASH;
    if (!api || !api.G) return;
    var glass = api.G;

    var MODS = [
        { key: 'trend', icon: '📈', title: '灵感产出趋势' },
        { key: 'bars', icon: '🧮', title: '工具使用分布' },
        { key: 'ring', icon: '🍩', title: '创作类型占比' },
        { key: 'heat', icon: '🌡️', title: '时段活跃热力' }
    ];

    var grid = document.getElementById('cyDashGrid');
    var metricsBox = document.getElementById('cyMetrics');
    var dripBox = document.getElementById('cyDrip');
    if (!grid || !metricsBox) return;

    grid.innerHTML = MODS.map(function (mod) {
        return '<div class="cy-dash-mod" data-mod="' + mod.key + '" data-title="' + mod.title + '" tabindex="0">' +
            '<div class="cy-dash-mod-head">' +
            '<span class="cy-dash-mod-title">' + mod.icon + ' ' + mod.title + '</span>' +
            '<span class="cy-dash-mod-hint">点击放大 ⤢</span>' +
            '</div><canvas></canvas></div>';
    }).join('');

    metricsBox.innerHTML = api.data.metrics.map(function (metric, idx) {
        return '<div class="cy-metric">' +
            '<div class="cy-metric-label">' + metric.l + '</div>' +
            '<div class="cy-metric-num" data-i="' + idx + '" data-roll="0">0</div>' +
            '<div class="cy-metric-trend" data-i="' + idx + '"></div></div>';
    }).join('');

    glass.stage(grid, { render: api.paint });

    /* 装配状态交给后续小节（周期应用 / 水滴筛选 / 重画）复用 */
    var dash = (glass._dash = glass._dash || {});
    dash.MODS = MODS;
    dash.grid = grid;
    dash.metricsBox = metricsBox;
    dash.dripBox = dripBox;
});

/* ============ 10 · 看板装配二：周期应用 + 水滴筛选 + 初始绘制 ============ */
document.addEventListener('DOMContentLoaded', function () {
    var api = window.CYDASH;
    if (!api || !api.G) return;
    var glass = api.G;
    var dash = (glass._dash = glass._dash || {});
    var grid = dash.grid, metricsBox = dash.metricsBox, dripBox = dash.dripBox, MODS = dash.MODS;
    if (!grid || !metricsBox) return;

    function applyRange(key) {
        var range = api.RANGES.filter(function (candidate) { return candidate.key === key; })[0] || api.RANGES[1];
        api.range = range;
        var data = api.data;
        data.metrics.forEach(function (metric, idx) {
            var node = metricsBox.querySelector('.cy-metric-num[data-i="' + idx + '"]');
            if (!node) return;
            if (glass.roll) glass.roll(node, metric.v, { decimals: (metric.v % 1) ? 1 : 0, suffix: metric.suf, dur: 850 });
            else node.textContent = metric.v + metric.suf;
            var tr = metricsBox.querySelector('.cy-metric-trend[data-i="' + idx + '"]');
            if (tr) tr.textContent = '📈 ' + range.label + '数据';
        });
        grid.querySelectorAll('.cy-dash-mod').forEach(function (mod) {
            var cv = mod.querySelector('canvas');
            if (cv) api.paint(cv, mod, false);
        });
        window.dispatchEvent(new Event('cydash:change'));
    }

    if (dripBox) {
        glass.drip(dripBox, {
            capsule: '统计周期',
            options: api.RANGES.map(function (range) {
                return { key: range.key, label: range.label, icon: range.icon };
            }),
            value: 'week',
            onSelect: applyRange
        });
    }
    applyRange('week');
});

/* ============ 11 · 看板装配三：尺寸重画 + 缩略图 + 柔光 ============ */
document.addEventListener('DOMContentLoaded', function () {
    var api = window.CYDASH;
    if (!api || !api.G) return;
    var glass = api.G;
    var dash = (glass._dash = glass._dash || {});
    var grid = dash.grid, MODS = dash.MODS;
    if (!grid) return;

    function paintThumbs() {
        document.querySelectorAll('.cy-thumb canvas').forEach(function (cv, idx) {
            var mod = grid.querySelector('.cy-dash-mod[data-mod="' + MODS[idx].key + '"]');
            if (mod) api.paint(cv, mod, true);
        });
    }

    var rt;
    window.addEventListener('resize', function () {
        clearTimeout(rt);
        rt = setTimeout(function () {
            grid.querySelectorAll('.cy-dash-mod').forEach(function (mod) {
                var cv = mod.querySelector('canvas');
                if (cv) api.paint(cv, mod, false);
            });
        }, 200);
    });
    window.addEventListener('cydash:change', function () { setTimeout(paintThumbs, 60); });
    setTimeout(paintThumbs, 120);

    /* 看板卡片跟随柔光（boot 时尚未渲染，需自行调用） */
    if (glass.enableTilt) {
        glass.enableTilt('.cy-dash-mod', { maxTilt: 4, lift: 2 });
        glass.enableTilt('.cy-metric', { maxTilt: 4, lift: 2 });
    }
});
