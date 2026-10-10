/* 找乐子 - 全局功能：成就系统 + 站内搜索 + 通用组件 */
(function () {
    var ZL = window.ZL = window.ZL || {};

    function LS(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
    function SS(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

    /* ========== 通用 Toast（样式走公共层 .zl-toast，随主题变量联动） ========== */
    ZL.showToast = function (msg, ms) {
        ms = ms || 2600;
        var t = document.getElementById('zlToast');
        if (!t) {
            t = document.createElement('div');
            t.id = 'zlToast';
            t.className = 'zl-toast';
            document.body.appendChild(t);
        }
        t.textContent = msg;
        t.classList.add('show');
        clearTimeout(t._tm);
        t._tm = setTimeout(function () { t.classList.remove('show'); }, ms);
    };

    /* ========== 公共工具（供各页面复用，页面勿重复实现） ========== */
    ZL.escapeHtml = function (s) {
        return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
        });
    };
    ZL.fmtDate = function (d) {
        d = d || new Date();
        return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
    };
    ZL.download = function (fileName, text, mime) {
        try {
            var blob = new Blob([text], { type: mime || 'text/plain;charset=utf-8' });
            var a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800);
        } catch (e) {}
    };

    /* ========== 事件总线：同页直调 + 跨 tab（BroadcastChannel + storage 兜底） ========== */
    ZL._evt = {};
    ZL.on = function (type, cb) {
        (ZL._evt[type] = ZL._evt[type] || []).push(cb);
    };
    ZL.emit = function (type, payload) {
        var list = ZL._evt[type] || [];
        for (var i = 0; i < list.length; i++) { try { list[i](payload || {}); } catch (e) {} }
        try {
            new BroadcastChannel('zhaolezi').postMessage({ type: type, payload: payload || {}, at: Date.now() });
        } catch (e) {}
        try { localStorage.setItem('zl_evt_' + type, JSON.stringify({ payload: payload || {}, at: Date.now() })); } catch (e2) {}
    };
    try {
        var _zlBC = new BroadcastChannel('zhaolezi');
        _zlBC.onmessage = function (e) {
            var d = e.data || {};
            var list = ZL._evt[d.type] || [];
            for (var i = 0; i < list.length; i++) { try { list[i](d.payload || {}); } catch (err) {} }
        };
    } catch (e) {}
    /* storage 兜底：BroadcastChannel 不可用时，跨 tab 靠同源 storage 事件同步 */
    window.addEventListener('storage', function (e) {
        if (!e.newValue || e.key.indexOf('zl_evt_') !== 0) return;
        var type = e.key.slice(7);
        var list = ZL._evt[type] || [];
        try { var p = JSON.parse(e.newValue).payload; } catch (e2) { return; }
        for (var i = 0; i < list.length; i++) { try { list[i](p || {}); } catch (err) {} }
    });

    /* ========== V2.0 学习数据层 zl_study_log_v1（事件驱动数据资产） ==========
     * 记录全站学习动作（复习/掌握/增删改错题等），供 44 仪表盘聚合：
     *   ZL.studyLog.add({type, itemId, subject, kp, extra}) -> 写日志 + emit 'study.recorded'
     *   ZL.studyLog.recent(n)     最近 n 条
     *   ZL.studyLog.todayCount()  今日活动数
     *   ZL.studyLog.streakDays()  连续学习天数（今天未学则以今天为断点回退）
     * 条目：{type, itemId, subject, kp, at}
     * type 契约：add/edit/del/review/mastered */
    (function () {
        var KEY = 'zl_study_log_v1';
        var MAX = 500; // 容量上限，超出截断最旧记录
        function read() {
            try { var a = JSON.parse(localStorage.getItem(KEY)); if (Object.prototype.toString.call(a) === '[object Array]') return a; } catch (e) {}
            return [];
        }
        function write(a) {
            if (a.length > MAX) a = a.slice(a.length - MAX);
            try { localStorage.setItem(KEY, JSON.stringify(a)); } catch (e) {}
            return a;
        }
        ZL.studyLog = {
            add: function (entry) {
                var a = read();
                a.push({
                    type: entry.type || 'review',
                    itemId: entry.itemId == null ? '' : String(entry.itemId),
                    subject: entry.subject || '',
                    kp: entry.kp || '',
                    at: entry.at || Date.now()
                });
                write(a);
                ZL.emit('study.recorded', a[a.length - 1]);
            },
            recent: function (n) {
                var a = read();
                return n ? a.slice(-n) : a;
            },
            todayCount: function () {
                var a = read(), now = new Date(), c = 0;
                for (var i = 0; i < a.length; i++) {
                    var d = new Date(a[i].at);
                    if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()) c++;
                }
                return c;
            },
            // 连续学习天数：往前数连续有记录的天数；今天没记录则不把今天算入
            streakDays: function () {
                var a = read(), days = {};
                for (var i = 0; i < a.length; i++) {
                    var d = new Date(a[i].at);
                    days[d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()] = 1;
                }
                var now = new Date(), n = 0, cur = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                function key(d) { return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
                if (!days[key(cur)]) cur.setDate(cur.getDate() - 1); // 今天没学，从昨天起算
                while (days[key(cur)]) { n++; cur.setDate(cur.getDate() - 1); }
                return n;
            }
        };
    })();

    /* ========== V2.0 版本与数据迁移框架 ==========
     * zl_app_version = {ver, at, read[]}：ver=数据已迁移到的版本，read=已读过的更新记录
     * 新功能发布流程：ZL.APP_VER 升版 → VERSION_LOG 补一条 → whatsNew() 自动触达用户
     * dataMigration(name, toVer, fn)：确保数据结构演进到 toVer，幂等，只执行一次 */
    ZL.APP_VER = '2.2.0';
    ZL.VERSION_LOG = [
        { ver: '2.2.0', title: '成就系统 V2.2 · 全站融合', desc: '94 项成就（基础52/中级24/高级12/隐藏6）· 成就积分与等级头衔 · 跨页弹卡与实时同步' },
        { ver: '2.1.1', title: '词典中文反查 · 秒出', desc: '前 2 万高频词预置索引，常见中文反查免全库扫描' },
        { ver: '2.1.0', title: '在线词典 30 万词', desc: 'ECDICT 26 分片懒加载，完整释义/词频/搭配' },
        { ver: '2.0.0', title: '学习数据层 · 跨页实时', desc: '学习动态/连续天数实时联动；作业盒子一键转错题；设计 Token 主题层' }
    ];
    function verState() {
        var st = { ver: '', read: [] };
        try {
            var p = JSON.parse(localStorage.getItem('zl_app_version') || '{}');
            if (p && typeof p.ver === 'string') st.ver = p.ver;
            if (Object.prototype.toString.call(p && p.read) === '[object Array]') st.read = p.read;
        } catch (e) {}
        return st;
    }
    function verGte(a, b) { // 仅支持 x.y.z 数字段
        var pa = String(a || '0').split('.').map(Number);
        var pb = String(b || '0').split('.').map(Number);
        while (pa.length < 3) pa.push(0);
        while (pb.length < 3) pb.push(0);
        for (var i = 0; i < 3; i++) { if (pa[i] > pb[i]) return true; if (pa[i] < pb[i]) return false; }
        return true;
    }
    ZL.dataMigration = function (name, toVer, fn) {
        var st = verState();
        if (verGte(st.ver, toVer)) return; // 已推进到该版本，跳过
        try { if (fn) fn(); } catch (e) {}
        st.ver = toVer;
        try { localStorage.setItem('zl_app_version', JSON.stringify({ ver: st.ver, at: Date.now(), read: st.read })); } catch (e2) {}
    };
    ZL.whatsNew = function () {
        var st = verState(), out = [];
        for (var i = 0; i < ZL.VERSION_LOG.length; i++) {
            var v = ZL.VERSION_LOG[i];
            if (st.read.indexOf(v.ver) < 0 && verGte(v.ver, st.ver)) out.push(v);
        }
        return out;
    };
    ZL.markVersionSeen = function () {
        var st = verState(), read = st.read.slice();
        for (var i = 0; i < ZL.VERSION_LOG.length; i++) {
            var v = ZL.VERSION_LOG[i].ver;
            if (read.indexOf(v) < 0) read.push(v);
        }
        try { localStorage.setItem('zl_app_version', JSON.stringify({ ver: st.ver, at: Date.now(), read: read })); } catch (e) {}
    };
    // 内置迁移：v2.0.0 —— 规范 43 错题条目字段（补 point 默认值，幂等无害）
    ZL.dataMigration('err_items_norm', '2.0.0', function () {
        try {
            var items = JSON.parse(localStorage.getItem('zl_err_items_v1') || '[]');
            if (Object.prototype.toString.call(items) === '[object Array]') {
                var changed = false;
                for (var i = 0; i < items.length; i++) {
                    if (items[i] && items[i].point == null) { items[i].point = ''; changed = true; }
                }
                if (changed) localStorage.setItem('zl_err_items_v1', JSON.stringify(items));
            }
        } catch (e) {}
    });

    /* ========== 页面索引（站内搜索） ========== */
    ZL.PAGES = [
        { f: 'index.html', t: '找乐子主站·优质工具库', k: '首页 工具库 导航 主程序' },
        { f: '1.html', t: '密码登录', k: '密码 登录 门禁' },
        { f: '2.html', t: '第三方信息授权协议', k: '协议 授权' },
        { f: '3.html', t: '授权确认', k: '协议 勾选 确认' },
        { f: '4.html', t: '选择IP登录', k: 'IP 登录 选择' },
        { f: '5.html', t: '找乐子·媒体池', k: '图片 音频 媒体 相册' },
        { f: '6.html', t: '作者介绍', k: '作者 碧世辉煌 介绍' },
        { f: '7.html', t: '优质工具箱', k: '工具 工具箱' },
        { f: '8.html', t: '背包', k: '背包 物品' },
        { f: '9.html', t: '纯文本一键生成txt', k: 'txt 文本 生成' },
        { f: '10.html', t: '后台修改办法', k: '后台 修改 维护' },
        { f: '11.html', t: '赞赏支持', k: '赞赏 支持 捐 助力' },
        { f: '12.html', t: '基础计算器', k: '计算器 计算' },
        { f: '13.html', t: '日期计算器', k: '日期 计算 时间' },
        { f: '14.html', t: '虚拟消费系统', k: '购物 商品 购物车 优惠券 消费' },
        { f: '15.html', t: '强密码生成器', k: '密码 生成 安全' },
        { f: '16.html', t: '黑客模拟器', k: '黑客 终端 模拟' },
        { f: '17.html', t: '古今中外暗号大全', k: '暗号 密码 加密 语言' },
        { f: '18.html', t: '单位换算', k: '单位 换算 长度 重量' },
        { f: '19.html', t: '网页备忘录', k: '备忘录 笔记 链接 收藏' },
        { f: '20.html', t: '五子棋·人机对弈', k: '五子棋 棋 游戏 对战' },
        { f: '21.html', t: '记忆配对游戏', k: '记忆 配对 游戏 翻牌' },
        { f: '22.html', t: '扫雷', k: '扫雷 游戏 炸弹' },
        { f: '23.html', t: '在线词典', k: '词典 单词 翻译' },
        { f: '24.html', t: '词频统计', k: '词频 统计 文本' },
        { f: '25.html', t: '字数统计', k: '字数 统计 字符' },
        { f: '26.html', t: '二维码生成器', k: '二维码 生成 扫码' },
        { f: '27.html', t: '摩斯密码转换', k: '摩斯 密码 电报 转换' },
        { f: '28.html', t: '免责声明', k: '声明 免责' },
        { f: '29.html', t: '反馈渠道', k: '反馈 意见 联系' },
        { f: '30.html', t: '更新公告', k: '更新 公告 版本' },
        { f: '31.html', t: '娱乐游戏', k: '游戏 娱乐 导航' },
        { f: '32.html', t: '找乐子工具', k: '工具 导航' },
        { f: '文件搜索.html', t: '文件搜索', k: '文件 搜索 查找' },
        { f: '33.html', t: '今天玩什么·随机乐子', k: '随机 乐子 推荐 今天玩什么' },
        { f: '34.html', t: '打字速度测试', k: '打字 速度 WPM 练习' },
        { f: '35.html', t: '番茄专注·白噪音', k: '番茄 专注 计时 白噪音' },
        { f: '36.html', t: '双人井字棋', k: '井字棋 双人 对战 游戏' },
        { f: '37.html', t: '每日一题', k: '每日 答题 谜题 挑战' },
        { f: '38.html', t: '签到·成就徽章墙', k: '签到 成就 徽章 打卡' },
        { f: '39.html', t: '分享卡片生成', k: '分享 卡片 海报 生成' },
        { f: '40.html', t: '语音控制', k: '语音 声控 命令' },
        { f: '41.html', t: '看看作业', k: '作业 照片 查看 学习' },
        { f: '42.html', t: '看看作业——更新公告', k: '作业 更新 公告' },
        { f: '43.html', t: '错题本', k: '错题 错题本 整理 复习 导出 知识点' },
        { f: '44.html', t: '学习仪表盘', k: '学习仪表盘 统计 记录 进度 打卡 时间' },
        { f: '45.html', t: '学习资料知识图谱', k: '知识图谱 导图 知识点 资料 图谱 梳理' },
        { f: '46.html', t: '学习计时与专注模式', k: '番茄钟 专注 计时 白噪音 成就 统计 休息' }
    ];

    /* ========== 体系门禁 + 目录分层解析 ==========
     * 门禁：1-8 体系（2-8.html）→ 经 1.html（密码登录）；
     *       看看作业体系（41/42.html）→ 经 verify.html（密码验证）；
     *       其余页直链；1.html/verify.html 本身是门户不拦截。
     * 分层（V2.3.3）：业务页在 pages/，首页 index.html 留根。
     *   pages/ 内页面跳首页需上一级；根级首页跳业务页需加 pages/ 前缀。
     * ZL.resolve(f) 是唯一入口，返回可直接赋给 href/location 的地址。 */
    var GATE_MAP = {
        '2.html': '1.html?go=2.html',
        '3.html': '1.html?go=3.html',
        '4.html': '1.html?go=4.html',
        '5.html': '1.html?go=5.html',
        '6.html': '1.html?go=6.html',
        '7.html': '1.html?go=7.html',
        '8.html': '1.html?go=8.html',
        '41.html': 'verify.html?go=41.html',
        '42.html': 'verify.html?go=42.html'
    };
    /* 当前页是否在 pages/ 子目录（pathname 结尾 /pages/xxx，兼容 file:// 绝对路径） */
    var IN_PAGES = /\/pages\/[^/]+$/i.test(location.pathname);
    /* 根级公共资源的相对前缀（zl-glass.js 等运行时动态注入用，与 ZL.resolve 的页面解析分离） */
    ZL.assetPrefix = IN_PAGES ? '../' : '';
    ZL.resolve = function (f) {
        if (f === 'index.html') return IN_PAGES ? '../index.html' : 'index.html';
        var g = GATE_MAP[f] || f;
        return IN_PAGES ? g : 'pages/' + g;
    };
    /* 兼容旧调用方：门禁解析与目录分层一并完成 */
    ZL.gateUrl = function (f) { return ZL.resolve(f); };

    /* ================================================================
     * 成就系统 V2.2（多维度 94 条：基础52/中级24/高级12/隐藏6）
     * 数据层：
     *   zl_ach        已解锁 id 数组（兼容旧版）
     *   zl_ach_meta   解锁时间戳 {id: ts}（0=迁移补记）
     *   zl_ach_stats  计数指标 {metric: n}（bump 驱动）
     *   zl_ach_new    新解锁队列（跨页弹卡消费）
     * 判定模型：指标制（bump 累计/取最大）+ 条件制（cond 实时读各页真实数据）
     * ================================================================ */
    ZL.TIER_CFG = {
        1: { nm: '基础', ic: '🥉', col: '#cd7f32' },
        2: { nm: '中级', ic: '🥈', col: '#8fa3b8' },
        3: { nm: '高级', ic: '🥇', col: '#f5b301' },
        h: { nm: '隐藏', ic: '🎁', col: '#9b59b6' }
    };
    ZL.CATS = [
        { id: 'explore', nm: '探索启程', ic: '🧭' },
        { id: 'learn', nm: '学习成长', ic: '📚' },
        { id: 'game', nm: '游戏竞技', ic: '🎮' },
        { id: 'focus', nm: '效率专注', ic: '⏱️' },
        { id: 'habit', nm: '习惯养成', ic: '📅' },
        { id: 'tool', nm: '工具达人', ic: '🛠️' },
        { id: 'create', nm: '收藏创作', ic: '🎨' },
        { id: 'build', nm: '站点共建', ic: '🤝' }
    ];
    ZL.TIER_PTS = { 1: 10, 2: 30, 3: 100, h: 50 };
    ZL.TITLES = [
        { min: 0, nm: '探索新手', ic: '🐣' },
        { min: 10, nm: '初窥门径', ic: '🌱' },
        { min: 25, nm: '小有所成', ic: '🌟' },
        { min: 40, nm: '渐入佳境', ic: '🔥' },
        { min: 55, nm: '声名鹊起', ic: '💫' },
        { min: 70, nm: '名扬四海', ic: '👑' },
        { min: 82, nm: '传奇收集者', ic: '🏆' },
        { min: 88, nm: '全站大师', ic: '⚡' }
    ];

    ZL.ACHIEVEMENTS = [
        /* ---------- 基础（tier 1）：探索启程 ---------- */
        { id: 'first_login', t: '初来乍到', d: '完成第一次密码登录', icon: '🎯', tier: 1, cat: 'explore', how: '在首页完成一次密码登录', metric: 'login_done', target: 1 },
        { id: 'first_tool', t: '开门见山', d: '第一次使用任意工具', icon: '🧰', tier: 1, cat: 'explore', how: '访问任意一个工具/功能页', cond: function () { return pagesUsed() >= 1; }, cur: pagesUsed, target: 1 },
        { id: 'first_ach', t: '初识徽章', d: '解锁第一个成就', icon: '🏅', tier: 1, cat: 'explore', how: '解锁任意 1 个成就', cond: function () { return unlockedCount() >= 1; }, cur: unlockedCount, target: 1 },
        { id: 'visit_10', t: '环顾四周', d: '访问过 10 个不同页面', icon: '🗺️', tier: 1, cat: 'explore', how: '累计访问 10 个不同页面', cond: function () { return pagesUsed() >= 10; }, cur: pagesUsed, target: 10 },
        { id: 'visit_30', t: '大半个站', d: '访问过 30 个不同页面', icon: '🧭', tier: 1, cat: 'explore', how: '累计访问 30 个不同页面', cond: function () { return pagesUsed() >= 30; }, cur: pagesUsed, target: 30 },
        { id: 'search_first', t: '站内寻宝', d: '使用一次全站搜索', icon: '🔍', tier: 1, cat: 'explore', how: '按 Ctrl+K 呼出搜索面板并搜索关键词', metric: 'search_use', target: 1 },
        { id: 'back_3', t: '常回来看看', d: '累计活跃 3 天', icon: '📆', tier: 1, cat: 'explore', how: '累计 3 天访问网站', cond: function () { return activeDays() >= 3; }, cur: activeDays, target: 3 },
        { id: 'visit_night', t: '夜访者', d: '在深夜 22:00-06:00 打开网站', icon: '🌙', tier: 1, cat: 'explore', how: '深夜时段访问任意页面', metric: 'night_visit', target: 1 },
        { id: 'game_first', t: '小试身手', d: '任一游戏获胜一次', icon: '🎮', tier: 1, cat: 'game', how: '五子棋/井字棋/扫雷/记忆配对任一首胜', cond: function () { return anyGameWin(); } },

        /* ---------- 基础：学习成长 ---------- */
        { id: 'dict_first', t: '查词启蒙', d: '词典完成首次查询', icon: '📖', tier: 1, cat: 'learn', how: '在词典输入单词查询', metric: 'dict_query', target: 1 },
        { id: 'dict_cn', t: '中文反查', d: '首次使用中文反查', icon: '🇨🇳', tier: 1, cat: 'learn', how: '词典输入中文反查单词', metric: 'dict_cn', target: 1 },
        { id: 'dict_speak', t: '会发音', d: '首次点击单词发音', icon: '🔊', tier: 1, cat: 'learn', how: '词典点击发音按钮', metric: 'dict_speak', target: 1 },
        { id: 'dict_fav1', t: '首藏单词', d: '收藏第一个单词', icon: '⭐', tier: 1, cat: 'learn', how: '词典点击收藏按钮', metric: 'dict_fav', target: 1 },
        { id: 'dict_fav5', t: '五词入囊', d: '收藏 5 个单词', icon: '📚', tier: 1, cat: 'learn', how: '词典累计收藏 5 个单词', metric: 'dict_fav', target: 5 },
        { id: 'err_first', t: '错题首记', d: '错题本记录第一条错题', icon: '📝', tier: 1, cat: 'learn', how: '在错题本添加一条错题', metric: 'err_add', target: 1 },
        { id: 'rv_first', t: '温故知新', d: '完成第一次错题复习', icon: '🔁', tier: 1, cat: 'learn', how: '在错题本完成一次复习', metric: 'rv_done', target: 1 },
        { id: 'quiz_right5', t: '小有所成', d: '每日一题累计答对 5 题', icon: '✅', tier: 1, cat: 'learn', how: '每日一题累计答对 5 题', metric: 'quiz_right', target: 5 },
        { id: 'learn_1d', t: '今日学习', d: '学习仪表盘记录首个学习动作', icon: '📅', tier: 1, cat: 'learn', how: '在学习仪表盘完成任意学习动作', metric: 'learn_day', target: 1 },

        /* ---------- 基础：游戏竞技 ---------- */
        { id: 'gobang_win', t: '棋逢对手', d: '五子棋战胜 AI', icon: '♟️', tier: 1, cat: 'game', how: '在五子棋页获胜一局', metric: 'gobang_win', target: 1 },
        { id: 'gobang_win3', t: '三连决胜', d: '五子棋累计胜 3 局', icon: '🎯', tier: 1, cat: 'game', how: '五子棋累计获胜 3 局', metric: 'gobang_win', target: 3 },
        { id: 'tictac_win', t: '纵横四方', d: '井字棋获胜一局', icon: '⭕', tier: 1, cat: 'game', how: '井字棋获胜一局', metric: 'tictac_win', target: 1 },
        { id: 'mines_clear', t: '拆弹专家', d: '扫雷通关', icon: '💣', tier: 1, cat: 'game', how: '扫雷通关一次', metric: 'mines_clear', target: 1 },
        { id: 'mines_3', t: '雷区老手', d: '扫雷累计通关 3 次', icon: '🧨', tier: 1, cat: 'game', how: '扫雷累计通关 3 次', metric: 'mines_clear', target: 3 },
        { id: 'memory_pair', t: '记忆大师', d: '记忆配对通关', icon: '🧠', tier: 1, cat: 'game', how: '记忆配对通关一次', metric: 'memory_pair', target: 1 },
        { id: 'daily_quiz', t: '每日一题', d: '完成今日答题', icon: '🧩', tier: 1, cat: 'game', how: '每日一题答对一次', metric: 'quiz_right', target: 1 },
        { id: 'typing_30', t: '初露锋芒', d: '打字测试达 30 WPM', icon: '⌨️', tier: 1, cat: 'game', how: '打字测试速度达 30 WPM', metric: 'typing_best', target: 30, mode: 'max' },

        /* ---------- 基础：效率专注 ---------- */
        { id: 'focus_first', t: '心流初体验', d: '完成第一次专注', icon: '⏱️', tier: 1, cat: 'focus', how: '专注模式完成一次专注', metric: 'focus_done', target: 1 },
        { id: 'focus_25', t: '深度专注', d: '完成一次 25 分钟专注', icon: '⏳', tier: 1, cat: 'focus', how: '完成一个完整的 25 分钟专注', metric: 'focus_25done', target: 1 },
        { id: 'tomato_1', t: '番茄首果', d: '完成第一个完整番茄', icon: '🍅', tier: 1, cat: 'focus', how: '在 46 页完成一次番茄钟（25 分钟完整专注）', metric: 'focus_min', target: 25 },
        { id: 'focus_amb', t: '白噪音', d: '首次使用环境白噪音', icon: '🎵', tier: 1, cat: 'focus', how: '在 46 页开启白噪音', metric: 'focus_amb', target: 1 },
        { id: 'focus_free60', t: '深度马拉松', d: '单次自由专注满 60 分钟', icon: '🧘', tier: 1, cat: 'focus', how: '自由专注单次满 60 分钟', metric: 'focus_free60', target: 1 },
        { id: 'typing_50', t: '快手', d: '打字测试达 50 WPM', icon: '⌨️', tier: 1, cat: 'focus', how: '打字测试速度达 50 WPM', metric: 'typing_best', target: 50, mode: 'max' },

        /* ---------- 基础：习惯养成 ---------- */
        { id: 'checkin_1', t: '初次签到', d: '完成第一次签到', icon: '✅', tier: 1, cat: 'habit', how: '在签到页点击签到', cond: function () { return checkinTotal() >= 1; }, cur: checkinTotal, target: 1 },
        { id: 'checkin_3', t: '三日不辍', d: '连续签到 3 天', icon: '📅', tier: 1, cat: 'habit', how: '连续签到 3 天', cond: function () { return checkinStreak() >= 3; }, cur: checkinStreak, target: 3 },
        { id: 'checkin_7', t: '持之以恒', d: '连续签到 7 天', icon: '🔥', tier: 1, cat: 'habit', how: '连续签到 7 天', cond: function () { return checkinStreak() >= 7; }, cur: checkinStreak, target: 7 },
        { id: 'focus_7d', t: '专注七日', d: '连续专注 7 天', icon: '🗓️', tier: 1, cat: 'habit', how: '连续 7 天有专注记录', cond: function () { return focusStreak() >= 7; }, cur: focusStreak, target: 7 },
        { id: 'tomato_10', t: '番茄达人', d: '单日完成 10 个番茄', icon: '🍅', tier: 1, cat: 'habit', how: '某一天内完成 10 个番茄钟', metric: 'tomato_day10', target: 1 },
        { id: 'learn_3d', t: '学习三日连', d: '连续学习 3 天', icon: '📚', tier: 1, cat: 'habit', how: '连续 3 天有学习记录', cond: function () { return studyStreak() >= 3; }, cur: studyStreak, target: 3 },

        /* ---------- 基础：工具达人 ---------- */
        { id: 'tool_10', t: '工具达人', d: '使用过 10 个不同工具', icon: '🛠️', tier: 1, cat: 'tool', how: '累计使用 10 个不同工具', cond: function () { return pagesUsed() >= 10; }, cur: pagesUsed, target: 10 },
        { id: 'tool_20', t: '百炼成钢', d: '使用过 20 个不同工具', icon: '🔧', tier: 1, cat: 'tool', how: '累计使用 20 个不同工具', cond: function () { return pagesUsed() >= 20; }, cur: pagesUsed, target: 20 },
        { id: 'calc_first', t: '计算能手', d: '首次使用计算器', icon: '➗', tier: 1, cat: 'tool', how: '使用一次计算器', metric: 'calc_add', target: 1 },
        { id: 'qr_first', t: '二维码匠', d: '首次生成二维码', icon: '🔳', tier: 1, cat: 'tool', how: '生成一次二维码', metric: 'qr_add', target: 1 },
        { id: 'memo_first', t: '备忘录主', d: '写下第一条备忘录', icon: '📝', tier: 1, cat: 'tool', how: '保存第一条备忘录', metric: 'memo_add', target: 1 },
        { id: 'pwd_first', t: '强密卫士', d: '首次生成强密码', icon: '🔐', tier: 1, cat: 'tool', how: '生成一次强密码', metric: 'pwd_add', target: 1 },

        /* ---------- 基础：收藏创作 ---------- */
        { id: 'share_first', t: '首张分享卡', d: '生成首张分享卡片', icon: '🎨', tier: 1, cat: 'create', how: '生成一张分享卡片', metric: 'share_add', target: 1 },
        { id: 'morse_first', t: '摩斯电报', d: '首次摩斯密码转换', icon: '📡', tier: 1, cat: 'create', how: '进行一次摩斯密码转换', metric: 'morse_add', target: 1 },
        { id: 'txt_first', t: '文本管家', d: '首次生成 txt 文件', icon: '📄', tier: 1, cat: 'create', how: '生成一个 txt 文件', metric: 'txt_add', target: 1 },
        { id: 'freq_first', t: '词频侦探', d: '首次词频统计', icon: '🔤', tier: 1, cat: 'create', how: '进行一次词频统计', metric: 'freq_add', target: 1 },

        /* ---------- 基础：站点共建 ---------- */
        { id: 'fb_first', t: '建言献策', d: '首次打开反馈渠道', icon: '💬', tier: 1, cat: 'build', how: '打开反馈建议页', metric: 'fb_open', target: 1 },
        { id: 'voice_first', t: '语音助手', d: '首次使用语音控制', icon: '🎙️', tier: 1, cat: 'build', how: '使用一次语音控制', metric: 'voice_cmd', target: 1 },
        { id: 'sup_first', t: '支持作者', d: '浏览赞赏支持页', icon: '❤️', tier: 1, cat: 'build', how: '打开赞赏支持页', metric: 'sup_open', target: 1 },
        { id: 'bag_first', t: '背包初启', d: '背包首次存入物品', icon: '🎒', tier: 1, cat: 'build', how: '在背包添加一个物品', metric: 'bag_add', target: 1 },

        /* ---------- 中级（tier 2）：学习成长 ---------- */
        { id: 'dict_fav50', t: '词库收藏家', d: '收藏 50 个单词', icon: '📚', tier: 2, cat: 'learn', how: '词典累计收藏 50 个单词', metric: 'dict_fav', target: 50 },
        { id: 'dict_hist200', t: '学海无涯', d: '词典累计查询 200 次', icon: '🌊', tier: 2, cat: 'learn', how: '词典累计查询 200 次', metric: 'dict_query', target: 200 },
        { id: 'err20', t: '错题达人', d: '错题本累计 20 条错题', icon: '📋', tier: 2, cat: 'learn', how: '错题本累计收录 20 条', metric: 'err_add', target: 20 },
        { id: 'rv30', t: '复习标兵', d: '累计完成 30 次复习', icon: '🔁', tier: 2, cat: 'learn', how: '错题本累计复习 30 次', metric: 'rv_done', target: 30 },
        { id: 'quiz_7d', t: '七天全对', d: '连续 7 天完成每日一题', icon: '📅', tier: 2, cat: 'learn', how: '每日一题连续 7 天', metric: 'quiz_streak', target: 7, mode: 'max' },
        { id: 'learn_14d', t: '半月勤学', d: '连续学习 14 天', icon: '📖', tier: 2, cat: 'learn', how: '连续 14 天有学习记录', cond: function () { return studyStreak() >= 14; }, cur: studyStreak, target: 14 },
        { id: 'master1', t: '科科精进', d: '任一科目错题掌握率≥60%', icon: '🎓', tier: 2, cat: 'learn', how: '任一科目错题掌握过半', cond: function () { return masteredSubj() >= 1; }, cur: masteredSubj, target: 1 },

        /* ---------- 中级：游戏竞技 ---------- */
        { id: 'gobang_win10', t: '百战不殆', d: '五子棋累计胜 10 局', icon: '⚔️', tier: 2, cat: 'game', how: '五子棋累计获胜 10 局', metric: 'gobang_win', target: 10 },
        { id: 'tictac_10', t: '圈圈连珠', d: '井字棋累计胜 10 局', icon: '⭕', tier: 2, cat: 'game', how: '井字棋累计获胜 10 局', metric: 'tictac_win', target: 10 },
        { id: 'mines_10', t: '扫雷十连', d: '扫雷累计通关 10 次', icon: '💣', tier: 2, cat: 'game', how: '扫雷累计通关 10 次', metric: 'mines_clear', target: 10 },
        { id: 'memory_5', t: '记忆五冠', d: '记忆配对累计通关 5 次', icon: '🧠', tier: 2, cat: 'game', how: '记忆配对累计通关 5 次', metric: 'memory_pair', target: 5 },
        { id: 'typing_60', t: '键盘舞者', d: '打字测试达 60 WPM', icon: '⌨️', tier: 2, cat: 'game', how: '打字测试速度达 60 WPM', metric: 'typing_best', target: 60, mode: 'max' },

        /* ---------- 中级：效率专注 ---------- */
        { id: 'focus_10', t: '心流常客', d: '累计完成 10 次专注', icon: '⏱️', tier: 2, cat: 'focus', how: '累计专注 10 次', metric: 'focus_done', target: 10 },
        { id: 'focus_10h', t: '十时沉淀', d: '累计专注 10 小时', icon: '⏳', tier: 2, cat: 'focus', how: '累计专注满 600 分钟', metric: 'focus_min', target: 600 },
        { id: 'focus_14d', t: '专注半月', d: '连续专注 14 天', icon: '🗓️', tier: 2, cat: 'focus', how: '连续 14 天有专注记录', cond: function () { return focusStreak() >= 14; }, cur: focusStreak, target: 14 },

        /* ---------- 中级：习惯养成 ---------- */
        { id: 'checkin_14', t: '半月打卡', d: '连续签到 14 天', icon: '📅', tier: 2, cat: 'habit', how: '连续签到 14 天', cond: function () { return checkinStreak() >= 14; }, cur: checkinStreak, target: 14 },
        { id: 'checkin_30', t: '月度坚持', d: '累计签到 30 天', icon: '🔥', tier: 2, cat: 'habit', how: '累计签到 30 天', cond: function () { return checkinTotal() >= 30; }, cur: checkinTotal, target: 30 },

        /* ---------- 中级：工具达人 / 探索 ---------- */
        { id: 'tool_30', t: '三十而行', d: '使用过 30 个不同工具', icon: '🛠️', tier: 2, cat: 'tool', how: '累计使用 30 个不同工具', cond: function () { return pagesUsed() >= 30; }, cur: pagesUsed, target: 30 },
        { id: 'visit_40', t: '全站通', d: '访问过 40 个不同页面', icon: '🗺️', tier: 2, cat: 'explore', how: '累计访问 40 个不同页面', cond: function () { return pagesUsed() >= 40; }, cur: pagesUsed, target: 40 },
        { id: 'ach_20', t: '收藏家', d: '解锁 20 个成就', icon: '🏅', tier: 2, cat: 'explore', how: '解锁任意 20 个成就', cond: function () { return unlockedCount() >= 20; }, cur: unlockedCount, target: 20 },

        /* ---------- 中级：收藏创作 / 站点共建 ---------- */
        { id: 'memo_20', t: '备忘录老手', d: '备忘录累计 20 条', icon: '📝', tier: 2, cat: 'create', how: '备忘录累计 20 条', metric: 'memo_add', target: 20 },
        { id: 'share_5', t: '分享达人', d: '累计生成 5 张分享卡', icon: '🎨', tier: 2, cat: 'create', how: '累计生成 5 张分享卡片', metric: 'share_add', target: 5 },
        { id: 'voice_10', t: '语音老手', d: '累计使用语音命令 10 次', icon: '🎙️', tier: 2, cat: 'build', how: '语音控制累计 10 次', metric: 'voice_cmd', target: 10 },
        { id: 'fb_sent', t: '反馈先锋', d: '提交过 1 次反馈', icon: '💬', tier: 2, cat: 'build', how: '提交一次反馈建议', metric: 'fb_sent', target: 1 },

        /* ---------- 高级（tier 3） ---------- */
        { id: 'dict_fav300', t: '词海拾贝', d: '词典累计收藏 300 词', icon: '📚', tier: 3, cat: 'learn', how: '词典累计收藏 300 个单词', metric: 'dict_fav', target: 300 },
        { id: 'dict_1000', t: '千次求索', d: '词典累计查询 1000 次', icon: '🌊', tier: 3, cat: 'learn', how: '词典累计查询 1000 次', metric: 'dict_query', target: 1000 },
        { id: 'err_master', t: '错题王者', d: '错题本累计掌握 30 题', icon: '📋', tier: 3, cat: 'learn', how: '错题累计标记掌握 30 题', metric: 'mastered', target: 30 },
        { id: 'typing_100', t: '键圣', d: '打字测试达 100 WPM', icon: '⌨️', tier: 3, cat: 'game', how: '打字测试速度达 100 WPM', metric: 'typing_best', target: 100, mode: 'max' },
        { id: 'quiz_30d', t: '月度全勤', d: '连续 30 天完成每日一题', icon: '📅', tier: 3, cat: 'learn', how: '每日一题连续 30 天', metric: 'quiz_streak', target: 30, mode: 'max' },
        { id: 'gobang_hard', t: '神之一手', d: '五子棋困难档累计胜 10 局', icon: '♟️', tier: 3, cat: 'game', how: '困难难度累计获胜 10 局', metric: 'gobang_hard', target: 10 },
        { id: 'game_all', t: '全栈玩家', d: '四大游戏全部通关', icon: '🎮', tier: 3, cat: 'game', how: '五子棋/井字棋/扫雷/记忆配对各通一次', cond: function () { return gameAll(); } },
        { id: 'focus_100h', t: '时间领主', d: '累计专注 100 小时', icon: '⏳', tier: 3, cat: 'focus', how: '累计专注满 6000 分钟', metric: 'focus_min', target: 6000 },
        { id: 'checkin_100', t: '百日坚持', d: '累计签到 100 天', icon: '📅', tier: 3, cat: 'habit', how: '累计签到 100 天', cond: function () { return checkinTotal() >= 100; }, cur: checkinTotal, target: 100 },
        { id: 'learn_100d', t: '百日勤学', d: '连续学习 100 天', icon: '📖', tier: 3, cat: 'learn', how: '连续 100 天有学习记录', cond: function () { return studyStreak() >= 100; }, cur: studyStreak, target: 100 },
        { id: 'all_pages', t: '全站大师', d: '访问全部 48 个页面', icon: '🗺️', tier: 3, cat: 'tool', how: '全部页面都访问过一遍', cond: function () { return pagesUsed() >= 48; }, cur: pagesUsed, target: 48 },
        { id: 'ach_90', t: '几乎集齐', d: '成就收集率达 90%', icon: '🏆', tier: 3, cat: 'explore', how: '解锁成就总数的 90%', cond: function () { return unlockedCount() >= Math.ceil(ZL.ACHIEVEMENTS.length * 0.9); }, cur: unlockedCount, target: Math.ceil(94 * 0.9) },

        /* ---------- 隐藏（tier h） ---------- */
        { id: 'night_focus', t: '深夜书房', d: '在 22:00-02:00 完成一次专注', icon: '🌙', tier: 'h', cat: 'focus', how: '隐藏成就——深夜专注（解锁后可见）', hide: true },
        { id: 'midnight_checkin', t: '午夜打卡', d: '在 00:00-01:00 完成签到', icon: '🌌', tier: 'h', cat: 'habit', how: '隐藏成就——午夜签到（解锁后可见）', hide: true },
        { id: 'same_tool_7d', t: '形影不离', d: '连续 7 天使用同一页面', icon: '🕰️', tier: 'h', cat: 'tool', how: '隐藏成就——连续 7 天使用同一工具（解锁后可见）', hide: true, cond: function () { return sameTool7(); } },
        { id: 'keyboard_easter', t: '密语入站', d: '在任意页面敲出隐藏密语', icon: '⌨️', tier: 'h', cat: 'explore', how: '隐藏成就——输入神秘字母序列（解锁后可见）', hide: true },
        { id: 'not_found', t: '迷路彩蛋', d: '访问一个不存在的页面', icon: '🧭', tier: 'h', cat: 'explore', how: '隐藏成就——找到 404 页面（解锁后可见）', hide: true, cond: function () { return is404Page(); } },
        { id: 'anni_day', t: '周年之约', d: '在网站周年纪念日使用', icon: '🎂', tier: 'h', cat: 'explore', how: '隐藏成就——在 9月19日 周年纪念日登录（解锁后可见）', hide: true, cond: function () { return isAnni(); } }
    ];

    ZL.byId = function (id) { for (var i = 0; i < ZL.ACHIEVEMENTS.length; i++) { if (ZL.ACHIEVEMENTS[i].id === id) return ZL.ACHIEVEMENTS[i]; } return null; };
    ZL.getUnlocked = function () { var u = LS('zl_ach'); return (Array.isArray(u)) ? u : []; };
    ZL.getStats = function () { var s = LS('zl_ach_stats'); return (s && typeof s === 'object') ? s : {}; };

    /* 条件成就的数据读取助手（全部容错，读各页真实数据） */
    function pagesUsed() { var u = LS('zl_used'); return (Array.isArray(u)) ? u.length : 0; }
    function unlockedCount() { return ZL.getUnlocked().length; }
    function activeDays() { var d = LS('zl_daily_days'); return (Array.isArray(d)) ? d.length : 0; }
    function checkinData() { try { var c = JSON.parse(localStorage.getItem('zl_checkin') || 'null'); return c || {}; } catch (e) { return {}; } }
    function checkinTotal() { return checkinData().total || 0; }
    function checkinStreak() { return checkinData().streak || 0; }
    function studyStreak() { try { return (ZL.studyLog && ZL.studyLog.streakDays) ? ZL.studyLog.streakDays() : 0; } catch (e) { return 0; } }
    function anyGameWin() {
        var s = ZL.getStats();
        return ((s.gobang_win || 0) + (s.tictac_win || 0) + (s.mines_clear || 0) + (s.memory_pair || 0)) >= 1;
    }
    function gameAll() {
        var u = ZL.getUnlocked();
        return ['gobang_win', 'tictac_win', 'mines_clear', 'memory_pair'].every(function (id) { return u.indexOf(id) >= 0; });
    }
    function focusStreak() {
        try {
            var S = JSON.parse(localStorage.getItem('zhaolezi_46_focus') || 'null');
            if (!S || !S.stats || !S.stats.days) return 0;
            var days = S.stats.days, cur = new Date(), n = 0;
            function key(dd) { return dd.getFullYear() + '-' + (dd.getMonth() + 1) + '-' + dd.getDate(); }
            var today = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate());
            if (!(days[key(today)] && days[key(today)].min > 0)) today.setDate(today.getDate() - 1);
            while (days[key(today)] && days[key(today)].min > 0) { n++; today.setDate(today.getDate() - 1); }
            return n;
        } catch (e) { return 0; }
    }
    function masteredSubj() {
        try {
            var items = JSON.parse(localStorage.getItem('zl_err_items_v1') || '[]');
            if (!Array.isArray(items) || !items.length) return 0;
            var by = {}, cnt = 0;
            for (var i = 0; i < items.length; i++) {
                var it = items[i] || {}, sub = it.subject || '';
                if (!sub) continue;
                by[sub] = by[sub] || { total: 0, mastered: 0 };
                by[sub].total++;
                if (it.status === 'mastered' || it.status === '掌握' || it.mastered || it.stage === 'mastered') by[sub].mastered++;
            }
            for (var k in by) { if (by[k].total > 0 && by[k].mastered / by[k].total >= 0.6) cnt++; }
            return cnt;
        } catch (e) { return 0; }
    }
    function sameTool7() {
        try {
            var pd = LS('zl_page_days');
            if (!pd || typeof pd !== 'object') return false;
            for (var k in pd) {
                var list = (Array.isArray(pd[k]) ? pd[k] : []).slice().sort(), run = 1;
                for (var i = 1; i < list.length; i++) {
                    var a = String(list[i - 1]).split('-'), b = String(list[i]).split('-');
                    if (a.length !== 3 || b.length !== 3) continue;
                    var diff = Math.round((new Date(+b[0], +b[1] - 1, +b[2]) - new Date(+a[0], +a[1] - 1, +a[2])) / 86400000);
                    run = (diff === 1) ? run + 1 : 1;
                    if (run >= 7) return true;
                }
            }
        } catch (e) {}
        return false;
    }
    function is404Page() { try { var b = document.body; return !!b && /^404\b/.test((b.textContent || '').trim()); } catch (e) { return false; } }
    function isAnni() { var d = new Date(); return d.getMonth() === 8 && d.getDate() === 19; }

    /* 解锁：写 zl_ach + zl_ach_meta + zl_ach_new，广播，消费弹卡 */
    var _checking = false;
    ZL.unlock = function (id, silent) {
        var u = ZL.getUnlocked();
        if (u.indexOf(id) >= 0) return false;
        u.push(id); SS('zl_ach', u);
        var meta = LS('zl_ach_meta') || {};
        if (!meta || typeof meta !== 'object') meta = {};
        meta[id] = Date.now(); SS('zl_ach_meta', meta);
        var q = LS('zl_ach_new');
        if (!Array.isArray(q)) q = [];
        q.push(id); SS('zl_ach_new', q);
        ZL.emit('ach.unlocked', { id: id });
        if (!silent) {
            if (!_checking) ZL.checkAll(false);
            ZL.drainNew();
        }
        return true;
    };

    /* 全量检查：指标达标 or 条件成立即解锁；多趟收敛（本趟新解锁可触发后续条件成就）；
     * silent=true 只入队不弹卡 */
    ZL.checkAll = function (silent) {
        if (_checking) return [];
        _checking = true;
        var newly = [];
        for (var pass = 0; pass < 3; pass++) {
            var u = ZL.getUnlocked(), s = ZL.getStats(), added = false;
            for (var i = 0; i < ZL.ACHIEVEMENTS.length; i++) {
                var a = ZL.ACHIEVEMENTS[i];
                if (u.indexOf(a.id) >= 0) continue;
                var hit = false;
                if (a.metric) hit = (s[a.metric] || 0) >= a.target;
                else if (a.cond) { try { hit = !!a.cond(); } catch (e) {} }
                if (hit) { ZL.unlock(a.id, true); newly.push(a.id); added = true; }
            }
            if (!added) break;
        }
        _checking = false;
        return newly;
    };

    /* 指标驱动：add 累加 / max 取最高值，命中后弹卡 */
    ZL.bump = function (metric, n, mode) {
        n = (n == null) ? 1 : n;
        var s = ZL.getStats();
        if (mode === 'max') { if ((s[metric] || 0) >= n) return []; s[metric] = n; }
        else { s[metric] = (s[metric] || 0) + n; }
        SS('zl_ach_stats', s);
        var newly = ZL.checkAll(false);
        if (newly.length) ZL.drainNew();
        return newly;
    };

    /* 单条成就详情（供墙/卡片渲染）：进度 cur / 目标 target / 解锁时间 ts */
    ZL.achInfo = function (id) {
        var a = ZL.byId(id);
        if (!a) return null;
        var unlocked = ZL.getUnlocked().indexOf(id) >= 0;
        var meta = LS('zl_ach_meta') || {};
        var cur = null;
        if (a.metric) cur = ZL.getStats()[a.metric] || 0;
        else if (a.cur) { try { cur = a.cur(); } catch (e) { cur = null; } }
        return { id: id, unlocked: unlocked, ts: meta[id] || 0, cur: cur, target: (a.target != null) ? a.target : null, tier: a.tier, cat: a.cat, hide: !!a.hide, name: a.t, d: a.d, how: a.how, icon: a.icon };
    };

    /* 成就积分：基础10 / 中级30 / 高级100 / 隐藏50 */
    ZL.getPoints = function () {
        var u = ZL.getUnlocked(), p = 0;
        for (var i = 0; i < u.length; i++) { var a = ZL.byId(u[i]); if (a) p += ZL.TIER_PTS[a.tier] || 0; }
        return p;
    };

    /* 等级头衔：按解锁数量取当前头衔与下一头衔 */
    ZL.getTitle = function () {
        var c = ZL.getUnlocked().length, cur = ZL.TITLES[0], next = null;
        for (var i = 0; i < ZL.TITLES.length; i++) {
            if (c >= ZL.TITLES[i].min) { cur = ZL.TITLES[i]; next = ZL.TITLES[i + 1] || null; }
            else break;
        }
        return { cur: cur, next: next, count: c };
    };

    /* 弹卡队列：消费 zl_ach_new，右上角依次弹出（跨页排队）。DOM 未就绪时不消费也不清队，等下次 drain */
    ZL.drainNew = function () {
        var q = LS('zl_ach_new');
        if (!Array.isArray(q) || !q.length) return;
        if (typeof document === 'undefined' || !document.body) return;
        SS('zl_ach_new', []);
        for (var i = 0; i < q.length; i++) {
            (function (id, idx) {
                setTimeout(function () { ZL._showAchCard(id); }, 500 + idx * 900);
            })(q[i], i);
        }
    };
    ZL._showAchCard = function (id) {
        try {
            var a = ZL.byId(id);
            if (!a || typeof document === 'undefined' || !document.body) return;
            var cfg = ZL.TIER_CFG[a.tier] || ZL.TIER_CFG[1];
            var card = document.createElement('div');
            card.style.cssText = 'position:fixed;top:16px;right:16px;z-index:2147483647;min-width:240px;max-width:320px;padding:12px 14px;border-radius:14px;background:var(--card,#fff);color:var(--txt,#333);box-shadow:0 14px 44px rgba(0,0,0,.4);border-left:4px solid ' + cfg.col + ';display:flex;align-items:center;gap:10px;font-size:14px;line-height:1.4;opacity:0;transform:translateX(30px);transition:all .35s ease;cursor:pointer;';
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');
            card.title = '点击打开成就中心';
            card.innerHTML = '<div style="font-size:30px;flex:none;">' + a.icon + '</div><div style="flex:1;"><div style="font-weight:bold;font-size:15px;">🏆 ' + a.t + ' <span style="font-size:11px;color:' + cfg.col + ';border:1px solid ' + cfg.col + ';border-radius:8px;padding:0 5px;margin-left:4px;">' + cfg.ic + cfg.nm + '</span></div><div style="color:var(--dim,#888);font-size:12px;margin-top:3px;">' + a.d + '</div></div>';
            document.body.appendChild(card);
            /* 点击卡片 → 跳转成就中心（并立即关闭本卡） */
            function closeAndGo() { try { card.remove(); window.location.href = ZL.resolve('38.html'); } catch (e) {} }
            card.addEventListener('click', closeAndGo);
            card.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); closeAndGo(); } });
            setTimeout(function () { try { card.style.opacity = '1'; card.style.transform = 'translateX(0)'; } catch (e) {} }, 30);
            setTimeout(function () { try { card.remove(); } catch (e) {} }, 5000);
        } catch (e) {}
    };

    /* 工具使用计数（跨页统计：去重页面 / 活跃日 / 每页使用日 / 深夜访问） */
    ZL.trackPage = function (pageKey, silent) {
        if (!pageKey) return;
        var used = LS('zl_used');
        if (!Array.isArray(used)) used = [];
        if (used.indexOf(pageKey) < 0) { used.push(pageKey); SS('zl_used', used); }
        var d = new Date(), dk = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
        var days = LS('zl_daily_days');
        if (!Array.isArray(days)) days = [];
        if (days.indexOf(dk) < 0) { days.push(dk); SS('zl_daily_days', days); }
        var pd = LS('zl_page_days');
        if (!pd || typeof pd !== 'object') pd = {};
        var list = (Array.isArray(pd[pageKey])) ? pd[pageKey] : [];
        if (list.indexOf(dk) < 0) { list.push(dk); pd[pageKey] = list; SS('zl_page_days', pd); }
        var h = d.getHours();
        if (h >= 22 || h < 6) ZL.bump('night_visit', 1);
        ZL.checkAll(!!silent);
        if (!silent) ZL.drainNew();
    };

    /* 成就系统初始化：迁移补记 + 静默检查 + 消费队列 + 密语监听 */
    ZL.dataMigration('ach_v2', '2.2.0', function () {
        var u = ZL.getUnlocked();
        if (!Array.isArray(u)) { u = []; SS('zl_ach', u); }
        var meta = LS('zl_ach_meta');
        if (!meta || typeof meta !== 'object') meta = {};
        var changed = false;
        for (var i = 0; i < u.length; i++) { if (meta[u[i]] == null) { meta[u[i]] = 0; changed = true; } }
        if (changed) SS('zl_ach_meta', meta);
        if (!LS('zl_ach_stats')) SS('zl_ach_stats', {});
        if (!LS('zl_ach_new')) SS('zl_ach_new', []);
    });
    ZL.checkAll(true);
    (function () {
        function go() { setTimeout(function () { ZL.drainNew(); }, 600); }
        try { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go(); } catch (e) { go(); }
    })();
    /* 隐藏成就：密语 'zhaolezi'（全站任意页可敲出） */
    try {
        var _easterBuf = '';
        document.addEventListener('keydown', function (e) {
            if (!e || typeof e.key !== 'string') return;
            if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
                _easterBuf = (_easterBuf + e.key.toLowerCase()).slice(-8);
                if (_easterBuf === 'zhaolezi') { _easterBuf = ''; ZL.unlock('keyboard_easter'); }
            } else if (e.key === 'Escape') { _easterBuf = ''; }
        });
    } catch (e) {}

    /* ========== 站内搜索 ========== */
    ZL.search = function (q) {
        q = (q || '').trim().toLowerCase();
        if (!q) return [];
        var out = [];
        for (var i = 0; i < ZL.PAGES.length; i++) {
            var p = ZL.PAGES[i];
            if ((p.t + ' ' + p.k).toLowerCase().indexOf(q) >= 0) {
                out.push(p);
            }
        }
        return out;
    };

    /* ========== 最近记录面板（#8 优化：二维码/摩斯/暗号等） ========== */
    ZL.RECENT_MAP = {
        '26.html': { key: 'zl_recent_qr', input: '#qrText', label: '二维码' },
        '27.html': { key: 'zl_recent_morse', input: '#inputBox', label: '摩斯密码' },
        '17.html': { key: 'zl_recent_cipher', input: null, label: '暗号' }
    };
    ZL.saveRecent = function (key, text) {
        try {
            var list = LS(key) || [];
            list.unshift({ t: String(text).slice(0, 120), time: new Date().toLocaleString() });
            SS(key, list.slice(0, 10));
        } catch (e) {}
    };
    ZL.openRecent = function () {
        var page = (window.location.pathname.split('/').pop() || '').toLowerCase();
        var cfg = ZL.RECENT_MAP[page];
        if (!cfg) { ZL.showToast('本页无最近记录功能'); return; }
        var list = LS(cfg.key) || [];
        if (document.getElementById('zlRecentPanel')) document.getElementById('zlRecentPanel').remove();
        var panel = document.createElement('div');
        panel.id = 'zlRecentPanel';
        panel.style.cssText = 'position:fixed;bottom:76px;right:20px;width:min(300px,86vw);max-height:46vh;overflow-y:auto;z-index:2147483646;background:var(--card,#fff);color:var(--txt,#333);border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.4);padding:10px 0;';
        var head = document.createElement('div');
        head.style.cssText = 'padding:8px 16px;font-size:14px;font-weight:bold;color:var(--blue,#667eea);border-bottom:1px solid var(--line,#eee);display:flex;justify-content:space-between;align-items:center;';
        head.innerHTML = '🕘 最近' + cfg.label + '<span style="cursor:pointer;color:var(--dim,#999);" id="zlRecentClose">✕</span>';
        panel.appendChild(head);
        if (!list.length) {
            var empty = document.createElement('div');
            empty.style.cssText = 'padding:20px;text-align:center;color:var(--dim,#999);font-size:13px;';
            empty.textContent = '暂无记录';
            panel.appendChild(empty);
        } else {
            list.forEach(function (it) {
                var row = document.createElement('div');
                row.style.cssText = 'padding:10px 16px;font-size:13px;color:var(--txt,#333);cursor:pointer;border-bottom:1px solid var(--line,#f3f3f3);word-break:break-all;';
                row.innerHTML = '<span style="color:var(--dim,#888);"></span><br>';
                row.firstChild.textContent = it.time;
                row.appendChild(document.createTextNode(it.t));
                row.onmouseenter = function () { this.style.background = 'var(--card-2,#f4f6ff)'; };
                row.onmouseleave = function () { this.style.background = ''; };
                row.onclick = function () {
                    if (cfg.input) {
                        var inp = document.querySelector(cfg.input);
                        if (inp) {
                            inp.value = it.t;
                            inp.focus();
                            ZL.showToast('已回填，可重新生成');
                        }
                    } else {
                        try { navigator.clipboard.writeText(it.t).then(function () { ZL.showToast('已复制内容'); }).catch(function () {}); } catch (e) {}
                    }
                    panel.remove();
                };
                panel.appendChild(row);
            });
        }
        document.body.appendChild(panel);
        document.getElementById('zlRecentClose').onclick = function () { panel.remove(); };
    };

    /* 主题按钮左侧：最近记录浮钮（仅记录功能页显示） */
    var _page = (window.location.pathname.split('/').pop() || '').toLowerCase();
    if (ZL.RECENT_MAP[_page]) {
        (function () {
            var btn = document.createElement('div');
            btn.textContent = '🕘';
            btn.title = '最近记录';
            btn.setAttribute('aria-label', '最近记录');
            btn.style.cssText = 'position:fixed;bottom:20px;right:74px;z-index:2147483646;width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#43a047,#2e7d32);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:18px;box-shadow:0 4px 16px rgba(0,0,0,.35);user-select:none;-webkit-user-select:none;';
            btn.onclick = function () { ZL.openRecent(); };
            if (document.body) { document.body.appendChild(btn); }
            else { document.addEventListener('DOMContentLoaded', function () { document.body.appendChild(btn); }); }
        })();
    }

    /* ========== V1.9.2 对比度兜底：深底暗字/浅底亮字自动换主题色 ========== */
    function _zlLuma(rgb) { return (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255; }
    function _zlParse(c) {
        if (!c) return null;
        var m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (m) { return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10), m[4] === undefined ? 1 : parseFloat(m[4])]; }
        var h = c.match(/^#([0-9a-f]{6})$/i);
        if (h) { var v = parseInt(h[1], 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255, 1]; }
        var h3 = c.match(/^#([0-9a-f]{3})$/i);
        if (h3) { var s = h3[1]; return [parseInt(s[0] + s[0], 16), parseInt(s[1] + s[1], 16), parseInt(s[2] + s[2], 16), 1]; }
        return null;
    }
    function _zlIsGray(rgb) { return (Math.max(rgb[0], rgb[1], rgb[2]) - Math.min(rgb[0], rgb[1], rgb[2])) < 24; }
    function _zlGradLuma(bi) {
        if (!bi || bi.indexOf('gradient') < 0) return null;
        var m = bi.match(/gradient\([^)]*\)/g);
        if (!m) return null;
        var sum = 0, cnt = 0;
        for (var i = 0; i < m.length; i++) {
            var cols = m[i].match(/#[0-9a-f]{6}|#[0-9a-f]{3}|rgba?\([^)]*\)/gi);
            if (!cols) continue;
            for (var j = 0; j < cols.length; j++) {
                var p = _zlParse(cols[j]);
                if (p) { sum += _zlLuma(p); cnt++; }
            }
        }
        return cnt ? sum / cnt : null;
    }
    var _zlLight = false;
    function _zlBgOf(el) {
        var n = el, acc = null;
        while (n) {
            var cs = getComputedStyle(n);
            var g = _zlGradLuma(cs.backgroundImage);
            if (g !== null) { return (acc && acc[3] >= 0.95) ? _zlLuma(acc) : g; }
            var bg = _zlParse(cs.backgroundColor);
            if (bg && bg[3] > 0) {
                if (bg[3] >= 0.95) { return acc ? _zlLuma(_zlBlend(acc, bg)) : _zlLuma(bg); }
                acc = acc ? _zlBlend(bg, acc) : bg;
            }
            if (n === document.body) break;
            n = n.parentElement;
        }
        if (acc) {
            var b2 = _zlParse(getComputedStyle(document.body).backgroundColor);
            if (b2 && b2[3] > 0) { return _zlLuma(_zlBlend(acc, b2)); }
            return _zlLuma(_zlBlend(acc, _zlLight ? [244, 246, 251, 1] : [10, 14, 39, 1]));
        }
        var b3 = _zlParse(getComputedStyle(document.body).backgroundColor);
        if (b3 && b3[3] > 0) { return _zlLuma(b3); }
        return 0.1;
    }
    function _zlBlend(top, bottom) {
        var a = top[3];
        return [bottom[0] * (1 - a) + top[0] * a, bottom[1] * (1 - a) + top[1] * a, bottom[2] * (1 - a) + top[2] * a, 1];
    }
    var _zlFixRan = false;
    ZL.contrastFix = function (force) {
        if (_zlFixRan && !force) return;
        _zlFixRan = true;
        try {
            var _rcs = getComputedStyle(document.documentElement);
            var _bgV = _zlParse(_rcs.getPropertyValue('--bg'));
            var lightTheme = _bgV ? _zlLuma(_bgV) > 0.5 : false;
            _zlLight = lightTheme;
            var dim = (_rcs.getPropertyValue('--dim') || '#8b93a7').trim();
            var txt = (_rcs.getPropertyValue('--txt') || '#e8ecf5').trim();
            var blue = (_rcs.getPropertyValue('--blue') || '#7aa8ff').trim();
            if (dim.indexOf('#') === 0) dim = 'rgb(' + parseInt(dim.slice(1, 3), 16) + ',' + parseInt(dim.slice(3, 5), 16) + ',' + parseInt(dim.slice(5, 7), 16) + ')';
            if (txt.indexOf('#') === 0) txt = 'rgb(' + parseInt(txt.slice(1, 3), 16) + ',' + parseInt(txt.slice(3, 5), 16) + ',' + parseInt(txt.slice(5, 7), 16) + ')';
            if (blue.indexOf('#') === 0) blue = 'rgb(' + parseInt(blue.slice(1, 3), 16) + ',' + parseInt(blue.slice(3, 5), 16) + ',' + parseInt(blue.slice(5, 7), 16) + ')';
            var els = document.querySelectorAll('body *');
            for (var i = 0; i < els.length; i++) {
                var el = els[i];
                var tag = el.tagName;
                if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'CANVAS' || tag === 'IMG' || tag === 'VIDEO' || tag === 'SVG' || tag === 'BR' || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') continue;
                if (el.children.length > 0 && el.childNodes.length === el.children.length) continue;
                if (!el.textContent || !el.textContent.trim()) continue;
                var cs = getComputedStyle(el);
                var c = _zlParse(cs.color);
                if (!c) continue;
                if (c[3] === 0) continue;
                var bg = _zlBgOf(el);
                var cl = _zlLuma(c);
                var isHeading = /^(H1|H2|H3|H4|H5|H6)$/.test(tag) || /title|heading/i.test(el.className || '');
                var _dlp = _zlParse(dim);
                var dimLuma = _dlp ? _zlLuma(_dlp) : 0.5;
                var rep = '';
                if (_zlIsGray(c)) {
                    if (bg < 0.4 && cl < 0.45) { rep = dimLuma > 0.5 ? dim : 'rgb(219,227,245)'; }
                    else if (bg > 0.82 && cl > 0.82) { rep = isHeading ? 'rgb(30,39,51)' : 'rgb(30,39,51)'; }
                } else if (bg < 0.4 && cl < 0.45) { rep = lightTheme ? 'rgb(219,227,245)' : blue; }
                else if (bg > 0.82 && cl > 0.82) { rep = 'rgb(30,39,51)'; }
                if (rep) {
                    el.style.transition = 'none';
                    el.style.setProperty('color', rep, 'important');
                    try { el.style.setProperty('-webkit-text-fill-color', rep, 'important'); } catch (e2) {}
                }
            }
        } catch (e) {}
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(ZL.contrastFix, 200); });
    } else {
        setTimeout(ZL.contrastFix, 200);
    }
    try {
        var _zlThemeObs = new MutationObserver(function (muts) {
            for (var i = 0; i < muts.length; i++) {
                if (muts[i].attributeName === 'data-theme') {
                    setTimeout(function () { ZL.contrastFix(true); }, 120);
                    setTimeout(function () { ZL.contrastFix(true); }, 700);
                    return;
                }
            }
        });
        _zlThemeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    } catch (e2) {}

    /* ========== V1.9.5 防回归 c 方案：运行时巡检 ZL.verifyAudit() ========== */
    /* 复用上方 _zlLuma/_zlParse/_zlBlend/_zlGradLuma/_zlBgOf/_zlLight；
       用法：ZL.verifyAudit().then(r => console.log(JSON.stringify(r)))；
       遍历 10 主题，每主题设 data-theme → contrastFix(true) 两次 → 审计叶子元素；
       返回 { ok, totalFails, report:{主题:失败数, 主题_s:[样本]}, time } */
    var _zlAuditThemes = ['dark', 'blue', 'gold', 'light', 'milk', 'guofeng', 'snowsun', 'cyber', 'aurora', 'custom'];
    function _zlAuditOnce() {
        var fails = [];
        var els = document.querySelectorAll('body *');
        for (var i = 0; i < els.length; i++) {
            var el = els[i];
            if (el.children.length > 0) continue;
            if (!el.textContent || !el.textContent.trim()) continue;
            var tag = el.tagName;
            if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'CANVAS' || tag === 'IMG' || tag === 'VIDEO' || tag === 'SVG' || tag === 'BR' || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') continue;
            var cs = getComputedStyle(el);
            var c = _zlParse(cs.color);
            if (!c) continue;
            if (c[3] === 0) continue;
            var bg = _zlBgOf(el);
            var cl = _zlLuma(c);
            if (bg < 0.4 && cl < 0.45) {
                fails.push({ t: el.textContent.trim().slice(0, 16), color: cs.color, bg: bg.toFixed(2) });
            } else if (bg > 0.82 && cl > 0.82) {
                fails.push({ t: el.textContent.trim().slice(0, 16), color: cs.color, bg: bg.toFixed(2) });
            }
        }
        return fails;
    }
    ZL.verifyAudit = function (opts) {
        opts = opts || {};
        var themes = opts.themes || _zlAuditThemes;
        var prevTheme = document.documentElement.getAttribute('data-theme');
        return new Promise(function (resolve) {
            var res = {}, idx = 0, totalFails = 0;
            function next() {
                if (idx >= themes.length) {
                    // V2：审计结束还原用户原主题，避免停留在审计主题
                    if (prevTheme) document.documentElement.setAttribute('data-theme', prevTheme);
                    else document.documentElement.removeAttribute('data-theme');
                    if (window.ZL && ZL.contrastFix) ZL.contrastFix(true);
                    var anyFail = totalFails > 0;
                    res.total = themes.length;
                    resolve({ ok: !anyFail, totalFails: totalFails, report: res, time: new Date().toISOString() });
                    return;
                }
                var th = themes[idx];
                document.documentElement.setAttribute('data-theme', th);
                if (window.ZL && ZL.contrastFix) ZL.contrastFix(true);
                setTimeout(function () {
                    if (window.ZL && ZL.contrastFix) ZL.contrastFix(true);
                    setTimeout(function () {
                        var f = _zlAuditOnce();
                        res[th] = f.length;
                        totalFails += f.length;
                        if (f.length) res[th + '_s'] = f.slice(0, 3);
                        idx++;
                        next();
                    }, 350);
                }, 250);
            }
            next();
        });
    };

    /* 自动统计当前页使用（排除门禁/导航页） */
    var cur = (window.location.pathname.split('/').pop() || '').toLowerCase();
    var skipPages = ['1.html', '2.html', '3.html', '4.html', '28.html', '29.html', '30.html', '10.html'];
    if (cur && skipPages.indexOf(cur) < 0 && cur.indexOf('.html') > 0) {
        ZL.trackPage(cur);
    }
})();

/* ========== V2 悬浮回首页按钮：仅当页面没有任何指向首页的链接时注入 ========== */
(function () {
    function initHomeBtn() {
        var cur = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
        if (cur === 'index.html' || cur === '') return;
        /* V2.3.3：业务页在 pages/ 内，页面内回首页链接是 ../index.html（或注入器写的 .back-home），一并识别避免重复按钮 */
        if (document.querySelector('a[href="index.html"], a[href="./index.html"], a[href="../index.html"], a[href$="/index.html"], a[href="./"], a.back-home, a[href$="/zhaolezi/"]')) return;
        var b = document.createElement('button');
        b.id = 'zlHomeBtn';
        b.type = 'button';
        b.setAttribute('aria-label', '返回首页');
        b.title = '返回首页';
        b.style.cssText = 'position:fixed;left:16px;bottom:76px;width:44px;height:44px;border-radius:50%;border:1px solid var(--line,#ddd);background:var(--card,#fff);color:var(--txt,#333);font-size:20px;line-height:1;cursor:pointer;z-index:2147483000;box-shadow:0 4px 14px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;padding:0;';
        b.textContent = '🏠';
        /* V2.3.3：业务页在 pages/ 下，首页在根，硬编码 index.html 会落到 pages/index.html 404 */
        b.onclick = function () { location.href = (window.ZL && window.ZL.resolve) ? window.ZL.resolve('index.html') : 'index.html'; };
        document.body.appendChild(b);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initHomeBtn);
    else initHomeBtn();
})();

/* ========== V2.3.0 液态玻璃层：动态加载 zl-glass.js（全站生效，无需改各页） ========== */
(function () {
    function loadGlass() {
        var s = document.createElement('script');
        // pages/ 页需上一级取根级 zl-glass.js；首页留根则同目录
        s.src = (window.ZL && ZL.assetPrefix || '') + 'zl-glass.js';
        s.async = true;
        s.onload = function () { try { window.ZL && ZL.glass && ZL.glass.init(); } catch (e) {} };
        s.onerror = function () {}; // 离线/加载失败静默降级，不影响主功能
        document.head.appendChild(s);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadGlass);
    else loadGlass();
})();
