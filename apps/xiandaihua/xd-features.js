/* 现代化学习站 - 全局功能层 xd-features.js
 * XD 命名空间：通用工具 + 事件总线 + 模块树(TREE) + 目录/面包屑渲染 + 学习进度
 *              + 测验引擎 + 错题本 + 成就系统 + 站内搜索
 * 页面使用约定：公共脚本以 defer 加载，页面内联脚本先于其执行，
 * 引用公共能力必须防御式判断 window.XD && XD.xxx（在 DOMContentLoaded 回调中使用最稳）。
 * localStorage 键统一 xd_ 前缀。
 *
 * 模块树约定：
 *   XD.TREE 是全站唯一结构来源。节点：{id, n:名称, d:描述, icon, children:[...]}
 *   - children 存在 → 该节点是"目录页"，文件 = id.html，页面 data-kind="dir"
 *   - 无 children   → 该节点是"内容页/测验/工具"，页面 data-kind="doc|quiz|tool"
 *   - 树深支持到 10 层，目录页与面包屑渲染均为递归实现
 */
(function () {
    var XD = window.XD = window.XD || {};

    /* ========== 本地存储：JSON 安全读写（键统一 xd_ 前缀，永不抛错） ========== */
    function LS(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
    function SS(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
    /* 诗意模块统一入口：语义与 LS/SS 完全相同，只是有了名字与归处 */
    XD.storage = { get: LS, set: SS };

    /* ========== 通用工具 ========== */
    XD.showToast = function (msg, ms) {
        ms = ms || 2600;
        var t = document.getElementById('xdToast');
        if (!t) {
            t = document.createElement('div');
            t.id = 'xdToast';
            t.className = 'xd-toast';
            document.body.appendChild(t);
        }
        t.textContent = msg;
        t.classList.add('show');
        clearTimeout(t._tm);
        t._tm = setTimeout(function () { t.classList.remove('show'); }, ms);
    };
    XD.escapeHtml = function (s) {
        return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
        });
    };
    XD.fmtDate = function (d) {
        d = d || new Date();
        return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
    };
    XD.download = function (fileName, text, mime) {
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
    XD.copy = function (text, okMsg) {
        if (!text) return;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () {
                XD.showToast(okMsg || '已复制到剪贴板');
            }).catch(function () { fallbackCopy(text, okMsg); });
        } else { fallbackCopy(text, okMsg); }
        function fallbackCopy(t, m) {
            var ta = document.createElement('textarea');
            ta.value = t;
            ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;';
            document.body.appendChild(ta);
            ta.focus(); ta.select();
            try { document.execCommand('copy'); XD.showToast(m || '已复制到剪贴板'); } catch (e) {}
            document.body.removeChild(ta);
        }
    };

    /* ========== 事件总线：同页直调 + 跨 tab（BroadcastChannel 主通道 + storage 兜底） ========== */
    XD._evt = {};
    XD.on = function (type, cb) {
        (XD._evt[type] = XD._evt[type] || []).push(cb);
    };
    /* 派发：逐个调用本地监听，异常不影响其它监听 */
    function busDispatch(list, payload) {
        for (var i = 0; i < list.length; i++) { try { list[i](payload || {}); } catch (e) {} }
    }
    XD.emit = function (type, payload) {
        busDispatch(XD._evt[type] || [], payload);
        try {
            new BroadcastChannel('xiandaihua').postMessage({ type: type, payload: payload || {}, at: Date.now() });
        } catch (e) {}
        try { localStorage.setItem('xd_evt_' + type, JSON.stringify({ payload: payload || {}, at: Date.now() })); } catch (e2) {}
    };
    try {
        var _xdBC = new BroadcastChannel('xiandaihua');
        _xdBC.onmessage = function (e) {
            var d = e.data || {};
            busDispatch(XD._evt[d.type] || [], d.payload);
        };
    } catch (e) {}
    window.addEventListener('storage', function (e) {
        if (!e.newValue || !e.key || e.key.indexOf('xd_evt_') !== 0) return;
        var type = e.key.slice(7);
        try { var p = JSON.parse(e.newValue).payload; } catch (e2) { return; }
        busDispatch(XD._evt[type] || [], p);
    });

    /* ============================================================
     * 模块树 XD.TREE（全站结构单一来源：目录页/搜索/sitemap/SW 都由它派生）
     * 文件名规则：id + '.html'。树深理论支持 10 层，渲染全部递归。
     * ============================================================ */
    XD.TREE = [
        { id: 'A', icon: '🖥️', n: '计算机基础', d: '认识计算机的构成：定义、硬件、软件、数据与编码', children: [
            { id: 'A1', n: '认识计算机', d: '定义、四步循环、简史与家族' },
            { id: 'A2', n: '硬件', d: '主板/CPU/内存/硬盘/显卡逐个拆解', children: [
                { id: 'A2-1', n: '主板与 CPU', d: '骨架与大脑：芯片组、主频、核心线程' },
                { id: 'A2-2', n: '内存', d: '临时工作台：容量、频率与卡顿的关系' },
                { id: 'A2-3', n: '硬盘与存储', d: '机械 vs 固态：给老电脑最划算的升级' },
                { id: 'A2-4', n: '显卡、电源与散热', d: '画面加工厂与隐形地基' },
                { id: 'A2-5', n: '接口速查与升级决策', d: 'USB/HDMI 认全 + "卡了换什么"决策表' }
            ]},
            { id: 'A3', n: '软件与操作系统', d: '系统干什么、各系统对比、驱动与装系统' },
            { id: 'A4', n: '数据与二进制', d: '一切信息都是 0 和 1', children: [
                { id: 'A4-1', n: '二进制与存储单位', d: 'bit/Byte、KB-MB-GB 换算、进制转换' },
                { id: 'A4-2', n: '字符编码', d: 'ASCII→Unicode→UTF-8，乱码的真相' },
                { id: 'A4-3', n: '图片与声音的数字化', d: '像素、采样与压缩' }
            ]},
            { id: 'A6', n: '鼠标练习器', d: '单击/双击/右键/拖拽专项训练', tool: 1 },
            { id: 'A5', n: '测验：计算机基础', d: '12 题结业测验', quiz: 'A' }
        ]},
        { id: 'B', icon: '🖱️', n: '电脑详细使用', d: '把 Windows 用得又快又稳：文件、软件、安全、排障', children: [
            { id: 'B1', n: 'Windows 使用总览', d: '桌面、窗口分屏、虚拟桌面、截图' },
            { id: 'B2', n: '文件与文件夹管理', d: '路径、扩展名、批量操作与整理原则' },
            { id: 'B3', n: '软件的安装与管理', d: '装对软件、卸干净软件、防捆绑' },
            { id: 'B4', n: '系统设置与安全', d: '更新、杀毒、防火墙与密码卫生' },
            { id: 'B5', n: '网络连接', d: 'WiFi、网线、热点、DNS 与网速排查' },
            { id: 'B6', n: '日常维护与故障排查', d: '卡顿/蓝屏/断网/备份的处置顺序' },
            { id: 'B7', n: '测验：电脑使用', d: '12 题结业测验', quiz: 'B' }
        ]},
        { id: 'C', icon: '🌐', n: '网络与服务器', d: '看懂网页背后的世界：网络、DNS、HTTP 与服务器', children: [
            { id: 'C1', n: '网络基础', d: '局域网、互联网与客户端-服务器模型' },
            { id: 'C2', n: 'IP、域名与 DNS', d: '互联网的门牌与电话簿' },
            { id: 'C3', n: '网页打开的全过程', d: '从回车到渲染：HTTP/状态码/HTTPS' },
            { id: 'C4', n: '服务器是什么', d: '机房、云、虚拟化与 Web 服务器软件' },
            { id: 'C5', n: '网站托管与 GitHub Pages', d: '静态/动态网站与免费托管' },
            { id: 'C6', n: '测验：网络与服务器', d: '10 题结业测验', quiz: 'C' }
        ]},
        { id: 'D', icon: '⌨️', n: '键盘与快捷键', d: '指法、速查与两只招牌练习器，让双手跟上思维', children: [
            { id: 'D1', n: '键盘全解', d: '布局分区、指法与坐姿' },
            { id: 'D2', n: '快捷键速查库', d: '可搜索的分场景快捷键手册', children: [
                { id: 'D2-1', n: 'Windows 系统速查', d: 'Win 键家族与窗口管理' },
                { id: 'D2-2', n: '浏览器与文本编辑速查', d: '标签页、缩放、选区操作' },
                { id: 'D2-3', n: '开发者与效率工具速查', d: '终端、VS Code、截图录入' }
            ]},
            { id: 'D3', n: '快捷键练习器', d: '招牌交互：真实按键判定训练', tool: 1 },
            { id: 'D4', n: '打字速度测试', d: '中英文测速、准确率与最佳记录', tool: 1 }
        ]},
        { id: 'E', icon: '🤖', n: '如何使用 AI', d: '从认知到驾驭：大模型、提示词工程与工具工作流', children: [
            { id: 'E1', n: 'AI 基础认知', d: '大模型是什么、能与不能、幻觉与核实' },
            { id: 'E2', n: '提示词工程', d: '把需求说清楚的五要素与迭代法' },
            { id: 'E3', n: 'AI 工具地图与工作流', d: '场景选型、隐私与版权边界' },
            { id: 'E4', n: '提示词实验室', d: '组装式提示词生成器', tool: 1 },
            { id: 'E6', n: 'AI 生活应用场景', d: '问路、做菜、带娃、看病：AI 天天用得上' },
            { id: 'E7', n: 'AI 使用安全与隐私', d: '别喂隐私、内容要核实、防 AI 新骗局' },
            { id: 'E5', n: '测验：如何使用 AI', d: '8 题结业测验', quiz: 'E' }
        ]},
        { id: 'F', icon: '🐙', n: 'Git 与 GitHub', d: '版本控制、Git 配置、把网页发布到 GitHub Pages', children: [
            { id: 'F1', n: '版本控制概念', d: '为什么需要给文件拍"快照"' },
            { id: 'F2', n: '安装与配置 Git', d: '下载安装与 git config 全流程' },
            { id: 'F3', n: 'Git 核心命令图解', d: 'init/add/commit/status/log/push/pull' },
            { id: 'F4', n: 'GitHub 入门', d: '注册、建仓、HTTPS/SSH 与 README' },
            { id: 'F5', n: '上传网页到 GitHub Pages 全流程', d: '从建仓到上线的手把手指南' },
            { id: 'F6', n: 'Git 命令演练场', d: '模拟终端闯关练习', tool: 1 },
            { id: 'F7', n: '测验：Git 与 GitHub', d: '10 题结业测验', quiz: 'F' }
        ]},
        { id: 'G', icon: '🛠️', n: '怎么开发网页', d: 'HTML/CSS/JS 三件套、调试工具与第一个上线项目', children: [
            { id: 'G1', n: '开发总览', d: '三件套分工、工具与文件组织' },
            { id: 'G2', n: 'HTML 入门', d: '标签、结构与第一个页面' },
            { id: 'G3', n: 'CSS 入门', d: '选择器、盒模型与布局' },
            { id: 'G4', n: 'JavaScript 入门', d: '变量、函数、事件与 DOM' },
            { id: 'G5', n: '调试与 F12 开发者工具', d: '元素、控制台与网络面板实战' },
            { id: 'G6', n: '实战：个人主页开发与发布', d: '毕业项目：从零写到上线' },
            { id: 'G7', n: '测验：怎么开发网页', d: '10 题结业测验', quiz: 'G' }
        ]},
        { id: 'H', icon: '📱', n: '手机与平板', d: '触屏、App、输入法与拍照：把智能手机用明白', children: [
            { id: 'H1', n: '触屏与手势基础', d: '开关机、锁屏与六大手势' },
            { id: 'H2', n: '桌面与 App 安装', d: '应用商店、安装授权与卸载整理' },
            { id: 'H3', n: '手写与语音输入', d: '不会拼音也能打字' },
            { id: 'H4', n: '拍照与相册', d: '对焦调光、相册管理与备份' },
            { id: 'H5', n: '设置、WiFi 与存储清理', d: '长辈模式、连网与手机瘦身' },
            { id: 'H6', n: '测验：手机与平板', d: '10 题结业测验', quiz: 'H' }
        ]},
        { id: 'I', icon: '💬', n: '微信与生活服务', d: '聊天、支付、出行与挂号：把生活服务搬进手机', children: [
            { id: 'I1', n: '微信入门', d: '注册登录、加好友与视频通话' },
            { id: 'I2', n: '微信进阶', d: '群聊、朋友圈与公众号' },
            { id: 'I3', n: '微信支付与红包', d: '绑卡、付款码、扫一扫与转账' },
            { id: 'I4', n: '支付宝与扫码支付', d: '实名、付款收款与生活缴费' },
            { id: 'I5', n: '出行、挂号与生活 App', d: '打车、导航、乘车码与预约挂号' },
            { id: 'I6', n: '测验：微信与生活服务', d: '10 题结业测验', quiz: 'I' }
        ]},
        { id: 'J', icon: '🛡️', n: '网络安全与防诈骗', d: '密码、骗术拆解、AI 新骗局与止损报警：把防骗练成本能', children: [
            { id: 'J1', n: '密码与账号安全', d: '好密码标准、双重验证与防盗' },
            { id: 'J2', n: '电话与短信诈骗识别', d: '开场白、套路与官方渠道' },
            { id: 'J3', n: '购物与转账安全', d: '退款骗局、二手交易与转账核实' },
            { id: 'J4', n: 'AI 时代新骗局', d: '换脸、语音克隆与假新闻' },
            { id: 'J5', n: '被骗之后：止损与报警', d: '黄金半小时、冻结、证据与心理' },
            { id: 'J6', n: '诈骗识别练习器', d: '情景闯关判危险度', tool: 1 },
            { id: 'J7', n: '测验：网络安全与防诈骗', d: '10 题结业测验', quiz: 'J' }
        ]},
        { id: 'K', icon: '📄', n: '办公与文档', d: 'Word/Excel/PPT、WPS 云文档与电子邮件：把生活写成文档', children: [
            { id: 'K1', n: 'Word 入门', d: '打字、保存与排版四件套' },
            { id: 'K2', n: 'Excel 入门', d: '单元格、自动求和与排序' },
            { id: 'K3', n: 'PPT 入门', d: '幻灯片、插图与放映' },
            { id: 'K4', n: 'WPS·云文档·打印', d: '免费三合一、同步与打印设置' },
            { id: 'K5', n: '电子邮件', d: '注册、写信、附件与钓鱼识别' },
            { id: 'K6', n: '测验：办公与文档', d: '10 题结业测验', quiz: 'K' }
        ]},
        { id: 'L', icon: '🛒', n: '网上购物与现代消费', d: '网购入门、下单支付、物流收货、退换货与直播团购：把网购用得又省又安全', children: [
            { id: 'L1', n: '网购入门', d: '选平台、注册登录、搜索筛选、看评价与比价' },
            { id: 'L2', n: '下单与支付', d: '核对下单、支付方式、优惠凑单与订单查询' },
            { id: 'L3', n: '物流与收货', d: '查物流、驿站快递柜取件与收货验货' },
            { id: 'L4', n: '退换货与售后', d: '七天无理由、退货流程、退款到账与投诉维权' },
            { id: 'L5', n: '直播购物与团购', d: '看直播防逼单、领券拼单与本地生活团购核销' },
            { id: 'L6', n: '测验：网上购物与现代消费', d: '10 题结业测验', quiz: 'L' }
        ]},
        { id: 'M', icon: '🏠', n: '数字生活进阶', d: '短视频、智能电视、智能家居、数字政务、线上就医与备份换机：把家里的数字设备都用顺手', children: [
            { id: 'M1', n: '短视频与直播', d: '刷得安全、拍得开心、防上瘾防骗' },
            { id: 'M2', n: '智能电视与机顶盒', d: '遥控、联网、点播与投屏，长辈模式' },
            { id: 'M3', n: '智能家居', d: '语音音箱、智能插座、摄像头与场景联动' },
            { id: 'M4', n: '数字政务', d: '政务App、电子社保卡、医保查询与待遇认证' },
            { id: 'M5', n: '线上就医与健康管理', d: '在线问诊、挂号、报告查询与家庭医生签约' },
            { id: 'M6', n: '手机文件与备份换机', d: '找文件、云备份、微信记录迁移与老手机善后' },
            { id: 'M7', n: '测验：数字生活进阶', d: '10 题结业测验', quiz: 'M' }
        ]},
        { id: 'N', icon: '🧳', n: '旅游与出行', d: '出行规划、火车高铁、飞机、酒店住宿、景区预约与旅途防坑：一个人也能把远门出明白', children: [
            { id: 'N1', n: '出行规划与准备', d: '目的地时间、天气行装、证件票据与家里检查' },
            { id: 'N2', n: '火车与高铁', d: '12306 购票、检票进站与乘车流程' },
            { id: 'N3', n: '飞机出行', d: '订票、值机、安检与登机全流程' },
            { id: 'N4', n: '酒店与住宿', d: '订房选房、入住退房与住店安全' },
            { id: 'N5', n: '景区预约与行程安排', d: '门票预约、跟团与自由行、行程表' },
            { id: 'N6', n: '旅途防坑与应急', d: '低价团、黑车、购物坑与证件丢失' },
            { id: 'N7', n: '测验：旅游与出行', d: '10 题结业测验', quiz: 'N' }
        ]},
        { id: 'SYS', icon: '📊', n: '学习系统', d: '仪表盘、成就与测验中心', children: [
            { id: '41', n: '学习仪表盘', d: '进度、连续天数与成绩聚合' },
            { id: '42', n: '成就徽章墙', d: '26 枚成就等你解锁' },
            { id: '43', n: '测验中心与错题本', d: '全部测验入口 + 错题复习' },
            { id: 'SYS4', n: '生活场景速查', d: '按生活问题找教程', tool: 1 },
            { id: 'SYS5', n: '术语词典', d: '电脑手机术语速查：遇到看不懂的词来这里查', tool: 1 },
            { id: 'SYS6', n: '毕业证书', d: '学完十四大模块，领取你的毕业证书', tool: 1 }
        ]},
        { id: 'SITE', icon: 'ℹ️', n: '关于本站', d: '公告、指南、免责与反馈', children: [
            { id: '44', n: '更新公告', d: '版本日志' },
            { id: '45', n: '关于本站与使用指南', d: '怎么学、怎么把本站部署到你自己的 GitHub' },
            { id: '46', n: '免责声明与反馈', d: '边界说明与联系方式' }
        ]}
    ];

    /* ===== 树工具：扁平化 / 查找 / 面包屑 / 前后页 ===== */
    // 节点约定：目录页有 children（文件 = id.html），内容页/测验/工具无 children
    XD._byId = {};
    XD._flat = []; // DFS 展平的全节点（含目录），面包屑经 nd.path 取
    function isLeaf(nd) { return !nd.children || !nd.children.length; }
    (function walk(nodes, parentPath) {
        for (var i = 0; i < nodes.length; i++) {
            var nd = nodes[i];
            nd.f = nd.id + '.html';
            nd.path = parentPath.concat(nd);
            XD._byId[nd.id] = nd;
            XD._flat.push(nd);
            if (!isLeaf(nd)) walk(nd.children, parentPath.concat(nd));
        }
    })(XD.TREE, []);

    /* ========== 叶子页索引 XD.PAGES（搜索/前后页用） ========== */
    /* 仅收录叶子节点（图文课/测验/工具页）；站点地图/SW 与构建脚本由 TREE 另生成 */
    XD.PAGES = [];
    (function () {
        for (var i = 0; i < XD._flat.length; i++) {
            var nd = XD._flat[i];
            if (isLeaf(nd)) {
                XD.PAGES.push({ f: nd.f, t: nd.n, k: (nd.d || '') + ' ' + nd.id, m: nd.id, quiz: nd.quiz || '' });
            }
        }
    })();

    XD.node = function (id) { return XD._byId[id] || null; };
    XD.crumbsOf = function (id) {
        var nd = XD._byId[id];
        return nd ? nd.path.slice() : [];
    };
    XD.leafCount = function (nd) {
        if (isLeaf(nd)) return 1;
        var c = 0;
        for (var i = 0; i < nd.children.length; i++) c += XD.leafCount(nd.children[i]);
        return c;
    };
    // 十四大学习模块：进度分母，SYS/SITE 不计入学习进度
    XD.modIds = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'];
    XD.leafFilesOfMod = function (modId) {
        var nd = XD._byId[modId];
        if (!nd) return [];
        var out = [];
        (function walkLeaves(n) {
            if (isLeaf(n)) { out.push(n.f); return; }
            for (var i = 0; i < n.children.length; i++) walkLeaves(n.children[i]);
        })(nd);
        return out;
    };

    /* ============================================================
     * 学习进度 XD.progress（xd_read_v1）
     * 读一页记一页：键 = 文件名，值 = 阅读时间戳；
     * 进度分母 = 十四大模块全部叶子页（SYS/SITE 不计入）
     * ============================================================ */
    (function () {
        var KEY = 'xd_read_v1';
        function read() { return LS(KEY) || {}; }
        function percentOf(readCount, total) { return total ? Math.round(readCount / total * 100) : 0; }

        XD.progress = {
            all: read,
            markRead: function (f) {
                var a = read();
                if (!a[f]) {
                    a[f] = Date.now();
                    SS(KEY, a);
                    XD.emit('progress.read', { f: f });
                    XD.achieve.checkProgress(a);
                    if (XD.game) XD.game.add(5, '首次阅读' + (f ? '（' + f + '）' : ''));
                }
            },
            isRead: function (f) { return !!read()[f]; },
            count: function () { return Object.keys(read()).length; },
            nodeProgress: function (idOrNode) {
                var nd = typeof idOrNode === 'string' ? XD.node(idOrNode) : idOrNode;
                if (!nd) return 0;
                var files = XD.leafFilesOfMod(nd.id);
                if (!files.length) return 0;
                var a = read(), n = 0;
                for (var i = 0; i < files.length; i++) if (a[files[i]]) n++;
                return percentOf(n, files.length);
            },
            overall: function () {
                var total = 0, readCount = 0, a = read();
                for (var m = 0; m < XD.modIds.length; m++) {
                    var files = XD.leafFilesOfMod(XD.modIds[m]);
                    total += files.length;
                    for (var i = 0; i < files.length; i++) if (a[files[i]]) readCount++;
                }
                return percentOf(readCount, total);
            }
        };
    })();

    /* ========== 目录页渲染：renderDir(containerId, nodeId) ========== */
    function isDirNode(nd) { return nd.children && nd.children.length; }
    function badgeOf(nd) { return isDirNode(nd) ? '📁 模块目录' : (nd.quiz ? '📝 结业测验' : nd.tool ? '🧪 互动工具' : '📖 图文课'); }
    function iconOf(nd) { return nd.icon || (nd.quiz ? '📝' : nd.tool ? '🧪' : isDirNode(nd) ? '📁' : '📖'); }
    function statusOf(p) { return p === 100 ? '<span class="done-flag">✅ 已完成</span>' : p > 0 ? '进行中 ' + p + '%' : '未开始'; }
    XD.renderDir = function (containerId, nodeId) {
        var box = document.getElementById(containerId);
        var nd = XD.node(nodeId);
        if (!box || !nd || !isDirNode(nd)) return;
        var html = '';
        for (var i = 0; i < nd.children.length; i++) {
            var c = nd.children[i];
            var p = XD.progress.nodeProgress(c);
            var tag = p === 100 ? '✅' : p > 0 ? p + '%' : '';
            html += '<a class="module-card" href="' + c.f + '">' +
                (tag ? '<span class="tag">' + tag + '</span>' : '') +
                '<div class="mod-head"><span style="font-size:28px;">' + iconOf(c) + '</span>' +
                '<span class="mod-no">' + c.id + '</span></div>' +
                '<b>' + XD.escapeHtml(c.n) + '</b>' +
                '<span>' + XD.escapeHtml(c.d || '') + '</span>' +
                '<ul><li>' + badgeOf(c) + ' · ' + (isDirNode(c) ? XD.leafCount(c) + ' 页内容' : '直接阅读') + '</li>' +
                '<li>' + statusOf(p) + '</li></ul>' +
                (isDirNode(c) || c.quiz || c.tool ? '' : '<div class="dir-prog"><i style="width:' + p + '%;"></i></div>') +
                '</a>';
        }
        box.innerHTML = html;
    };

    /* ========== 面包屑：自动插入到 .site-header 之后 ========== */
    XD.renderCrumbs = function () {
        var f = document.body.getAttribute('data-page');
        if (!f) return;
        var id = f.replace(/\.html$/, '');
        var path = XD.crumbsOf(id);
        if (!path.length) return;
        var html = '<nav class="crumbs" aria-label="位置">';
        html += '<a href="index.html">🏠 首页</a>';
        for (var i = 0; i < path.length; i++) {
            var sep = ' <span>›</span> ';
            html += sep + (i === path.length - 1 ? '<b>' + XD.escapeHtml(path[i].n) + '</b>' : '<a href="' + path[i].f + '">' + XD.escapeHtml(path[i].n) + '</a>');
        }
        html += '</nav>';
        var header = document.querySelector('.site-header');
        if (header && header.insertAdjacentHTML) {
            header.insertAdjacentHTML('afterend', html);
        } else {
            document.body.insertAdjacentHTML('afterbegin', html);
        }
    };

    /* ========== 前后页（DFS 顺序）渲染到 #xdPrevNext ========== */
    XD.renderPrevNext = function () {
        var box = document.getElementById('xdPrevNext');
        if (!box) return;
        var f = document.body.getAttribute('data-page');
        var id = f ? f.replace(/\.html$/, '') : '';
        // 在全站叶子序列中找当前位置（目录页不算）
        var leaves = XD.PAGES;
        var idx = -1;
        for (var i = 0; i < leaves.length; i++) if (leaves[i].f === f) { idx = i; break; }
        var html = '';
        if (idx > 0) html += '<a href="' + leaves[idx - 1].f + '">← ' + XD.escapeHtml(leaves[idx - 1].t) + '</a>';
        else html += '<a href="index.html">← 回到首页</a>';
        html += '<a class="mid" href="1.html">🗺 总目录</a>';
        if (idx >= 0 && idx < leaves.length - 1) html += '<a href="' + leaves[idx + 1].f + '">' + XD.escapeHtml(leaves[idx + 1].t) + ' →</a>';
        else html += '<a href="41.html">看看学习仪表盘 →</a>';
        box.innerHTML = html;
    };

    /* ============================================================
     * 学习日志 XD.studyLog（xd_study_log_v1，供仪表盘聚合）
     * 每条记录：{ type, itemId, mod, at }；越界自动裁剪，读取永不抛错
     * ============================================================ */
    (function () {
        var KEY = 'xd_study_log_v1';
        var MAX = 500;

        /* ---- 存储层：读入与写回（损坏数据视为空数组） ---- */
        function readLog() {
            try {
                var a = JSON.parse(localStorage.getItem(KEY));
                if (Object.prototype.toString.call(a) === '[object Array]') return a;
            } catch (e) {}
            return [];
        }
        function writeLog(a) {
            if (a.length > MAX) a = a.slice(a.length - MAX);
            try { localStorage.setItem(KEY, JSON.stringify(a)); } catch (e) {}
            return a;
        }

        /* ---- 日期键：本地时区 Y-M-D ---- */
        function dayKey(ts) {
            var d = new Date(ts);
            return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
        }

        XD.studyLog = {
            add: function (entry) {
                var a = readLog();
                a.push({ type: entry.type || 'read', itemId: entry.itemId == null ? '' : String(entry.itemId), mod: entry.mod || '', at: entry.at || Date.now() });
                writeLog(a);
                XD.emit('study.recorded', a[a.length - 1]);
            },
            recent: function (n) { var a = readLog(); return n ? a.slice(-n) : a; },
            todayCount: function () {
                var a = readLog(), now = new Date(), c = 0;
                for (var i = 0; i < a.length; i++) {
                    var d = new Date(a[i].at);
                    if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()) c++;
                }
                return c;
            },
            streakDays: function () {
                var a = readLog(), days = {};
                for (var i = 0; i < a.length; i++) days[dayKey(a[i].at)] = 1;
                var now = new Date(), n = 0, cur = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                if (!days[dayKey(cur.getTime())]) cur.setDate(cur.getDate() - 1);
                while (days[dayKey(cur.getTime())]) { n++; cur.setDate(cur.getDate() - 1); }
                return n;
            },
            heatmap: function (nDays) {
                var a = readLog(), out = [], now = new Date(), counts = {};
                for (var i = 0; i < a.length; i++) { var k = dayKey(a[i].at); counts[k] = (counts[k] || 0) + 1; }
                for (var j = nDays - 1; j >= 0; j--) {
                    var day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - j);
                    out.push({ d: dayKey(day.getTime()), c: counts[dayKey(day.getTime())] || 0 });
                }
                return out;
            }
        };
    })();

    /* ============================================================
     * 测验引擎 XD.quiz（xd_quiz_v1 成绩 + xd_err_items_v1 错题本）
     * run()：渲染题目 → 点击即判 → 结算落成绩 → 考后解析报告；
     * 做错题自动进错题本；首次完成或刷新最高分时才发经验。
     * ============================================================ */
    (function () {
        var QUIZ_KEY = 'xd_quiz_v1';
        var ERR_KEY = 'xd_err_items_v1';

        /* ---- 成绩存取 ---- */
        function readResults() { return LS(QUIZ_KEY) || {}; }

        XD.quiz = {
            results: readResults,
            getResult: function (id) { return readResults()[id] || null; },

            /* ---- 错题本 ---- */
            errItems: function () { return LS(ERR_KEY) || []; },
            removeErr: function (qid) {
                var a = XD.quiz.errItems();
                var b = a.filter(function (x) { return x.qid !== qid; });
                SS(ERR_KEY, b);
                XD.emit('errbook.changed', {});
            },
            clearErr: function () { SS(ERR_KEY, []); XD.emit('errbook.changed', {}); },

            /* ---- 试炼主流程：渲染 → 交互判定 → 结算 ---- */
            run: function (containerId, cfg) {
                var box = document.getElementById(containerId);
                if (!box || !cfg || !cfg.questions || !cfg.questions.length) return;
                var qs = cfg.questions;
                var state = { answered: 0, right: 0, results: [] };
                var html = '<div class="quiz-box" id="' + containerId + '_inner">';
                html += '<h2 style="border:none;padding-left:0;margin:6px 0 4px;">📝 ' + XD.escapeHtml(cfg.title || '随堂测验') + '</h2>';
                html += '<p class="lesson-sub" style="text-align:left;">共 ' + qs.length + ' 题，点击选项立即判定；做错会自动进入错题本。</p>';
                for (var i = 0; i < qs.length; i++) {
                    var q = qs[i];
                    html += '<div class="quiz-q" data-i="' + i + '">';
                    html += '<div class="q-title"><span class="q-no">Q' + (i + 1) + '</span>' + XD.escapeHtml(q.q) + '</div>';
                    for (var j = 0; j < q.opts.length; j++) {
                        html += '<button class="quiz-opt" data-q="' + i + '" data-o="' + j + '">' + String.fromCharCode(65 + j) + '. ' + XD.escapeHtml(q.opts[j]) + '</button>';
                    }
                    html += '<div class="quiz-exp" data-e="' + i + '">' + (q.exp ? '💡 ' + XD.escapeHtml(q.exp) : '') + '</div>';
                    html += '</div>';
                }
                html += '<div class="quiz-result" style="display:none;" data-r="1"></div>';
                html += '</div>';
                box.innerHTML = html;

                box.addEventListener('click', function (e) {
                    var btn = e.target.closest ? e.target.closest('.quiz-opt') : null;
                    if (!btn || btn.disabled) return;
                    var qi = +btn.getAttribute('data-q');
                    var oi = +btn.getAttribute('data-o');
                    var q = qs[qi];
                    var qEl = box.querySelector('.quiz-q[data-i="' + qi + '"]');
                    if (!qEl || qEl.getAttribute('data-done')) return;
                    qEl.setAttribute('data-done', '1');
                    var opts = qEl.querySelectorAll('.quiz-opt');
                    for (var k = 0; k < opts.length; k++) { opts[k].disabled = true; }
                    var ok = (oi === q.a);
                    btn.classList.add(ok ? 'correct' : 'wrong');
                    if (!ok) opts[q.a].classList.add('correct');
                    var exp = qEl.querySelector('.quiz-exp');
                    if (exp) exp.classList.add('show');
                    state.answered++;
                    if (ok) state.right++;
                    state.results[qi] = { ok: ok, chosen: oi };
                    if (!ok) {
                        var errs = XD.quiz.errItems();
                        errs.push({ qid: cfg.id + '-Q' + (qi + 1), quizId: cfg.id, quizTitle: cfg.title || '', q: q.q, opts: q.opts, a: q.a, exp: q.exp || '', at: Date.now() });
                        SS(ERR_KEY, errs);
                    }
                    if (state.answered === qs.length) finish();
                });

                /* ---- 结算：成绩入库（仅刷新最高分）+ 埋学习记录 + 错题报告 ---- */
                function finish() {
                    var score = Math.round(state.right / qs.length * 100);
                    var r = box.querySelector('[data-r]');
                    var all = readResults();
                    var prev = all[cfg.id];
                    var improved = !prev || score > prev.score;
                    if (improved) {
                        all[cfg.id] = { score: score, right: state.right, total: qs.length, at: Date.now() };
                        SS(QUIZ_KEY, all);
                    }
                    XD.studyLog.add({ type: 'quiz', itemId: cfg.id, mod: cfg.id });
                    XD.emit('quiz.done', { id: cfg.id, score: score, right: state.right, total: qs.length, improved: improved });
                    XD.achieve.checkQuiz(all);
                    if (score === 100) XD.achieve.unlock('quiz_perfect');
                    XD.achieve.unlock('quiz_first');
                    // 游戏化：首次完成或刷新最高分才发经验，防止反复重做刷分
                    if (improved && XD.game) {
                        XD.game.add(25, '完成测验「' + (cfg.title || cfg.id) + '」');
                        if (score >= 60) XD.game.add(10, '测验及格');
                        if (score === 100) XD.game.add(15, '测验满分');
                    }
                    // 考后解析报告：逐题对错 + 你的答案/正确答案 + 解析 + 错题本跳转
                    var rep = '<div class="quiz-report"><h3>📋 本次答题解析</h3>';
                    for (var x = 0; x < qs.length; x++) {
                        var rx = state.results[x];
                        var ok = !!(rx && rx.ok);
                        rep += '<div class="qr-item ' + (ok ? 'qr-ok' : 'qr-no') + '">' +
                            '<span class="qr-mark">' + (ok ? '✓' : '✗') + '</span><div>' +
                            '<b>' + (x + 1) + '. ' + XD.escapeHtml(qs[x].q) + '</b>';
                        if (rx && !ok) rep += '<div class="qr-yours">你的答案：' + String.fromCharCode(65 + rx.chosen) + '. ' + XD.escapeHtml(qs[x].opts[rx.chosen]) + '</div>';
                        if (rx && !ok) rep += '<div class="qr-right">正确答案：' + String.fromCharCode(65 + qs[x].a) + '. ' + XD.escapeHtml(qs[x].opts[qs[x].a]) + '</div>';
                        if (qs[x].exp) rep += '<div class="qr-exp">💡 ' + XD.escapeHtml(qs[x].exp) + '</div>';
                        rep += '</div></div>';
                    }
                    rep += '<div class="qr-actions"><button class="btn ghost" data-errbook="1">📕 打开错题本复习</button></div></div>';
                    r.style.display = 'block';
                    r.innerHTML = '<div class="score">' + score + ' 分</div>' +
                        '<p style="margin:6px 0;">答对 ' + state.right + ' / ' + qs.length + ' 题' +
                        (score === 100 ? ' · 🎉 满分！' : score >= 60 ? ' · 通过' : ' · 未通过，看看解析再来一次吧') + '</p>' +
                        (improved ? '' : '<p style="margin:4px 0;font-size:13px;color:var(--dim);">已做过本测验，本次未超过历史最高分，不重复计经验</p>') +
                        '<button class="btn" data-retry="1">🔄 重做一次</button>' + rep;
                }

                box.addEventListener('click', function (e) {
                    if (e.target && e.target.getAttribute) {
                        if (e.target.getAttribute('data-retry')) {
                            XD.quiz.run(containerId, cfg);
                            var boxEl = document.getElementById(containerId);
                            if (boxEl) boxEl.scrollIntoView({ behavior: 'smooth' });
                        } else if (e.target.getAttribute('data-errbook')) {
                            location.href = '43.html';
                        }
                    }
                });
            }
        };
    })();

    /* ============================================================
     * 成就系统 xd_ach_v1：26 枚徽章
     * ACHIEVEMENTS 为徽章定义表（文案即数据，逐字保留）；
     * XD.achieve 负责读取、幂等解锁与从学习记录推导判定。
     * ============================================================ */
    (function () {
        var KEY = 'xd_ach_v1';
        var QUIZ_IDS = ['A', 'B', 'C', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N']; /* 有测验的 13 个模块 */

        XD.ACHIEVEMENTS = [
            /* 阅读 */
            { id: 'first_read', t: '初来乍到', d: '阅读完第一节课', icon: '🎯' },
            { id: 'explorer', t: '全站漫游', d: '累计阅读 20 个不同页面', icon: '🧭' },
            /* 模块完成（A-N） */
            { id: 'mod_a', t: '硬件通', d: '完成模块A：计算机基础', icon: '🖥️' },
            { id: 'mod_b', t: '电脑高手', d: '完成模块B：电脑详细使用', icon: '🖱️' },
            { id: 'mod_c', t: '网络向导', d: '完成模块C：网络与服务器', icon: '🌐' },
            { id: 'mod_d', t: '指尖飞舞', d: '完成模块D：键盘与快捷键', icon: '⌨️' },
            { id: 'mod_e', t: 'AI 驾驭者', d: '完成模块E：如何使用 AI', icon: '🤖' },
            { id: 'mod_f', t: '版本控制者', d: '完成模块F：Git 与 GitHub', icon: '🐙' },
            { id: 'mod_g', t: '开发者入门', d: '完成模块G：怎么开发网页', icon: '🛠️' },
            { id: 'mod_h', t: '掌上达人', d: '完成模块H：手机与平板', icon: '📱' },
            { id: 'mod_i', t: '生活管家', d: '完成模块I：微信与生活服务', icon: '💬' },
            { id: 'mod_j', t: '火眼金睛', d: '完成模块J：网络安全与防诈骗', icon: '🛡️' },
            { id: 'mod_k', t: '办公能手', d: '完成模块K：办公与文档', icon: '📄' },
            { id: 'mod_l', t: '购物达人', d: '完成模块L：网上购物与现代消费', icon: '🛒' },
            { id: 'mod_m', t: '智家能手', d: '完成模块M：数字生活进阶', icon: '🏠' },
            { id: 'mod_n', t: '出行达人', d: '完成模块N：旅游与出行', icon: '🧳' },
            /* 测验 */
            { id: 'quiz_first', t: '小试牛刀', d: '完成第一次测验', icon: '✏️' },
            { id: 'quiz_perfect', t: '满分学霸', d: '任意测验取得满分', icon: '🏆' },
            { id: 'all_quiz', t: '测验达人', d: '完成全部 13 个模块测验', icon: '🎓' },
            /* 练习器 */
            { id: 'shortcut_10', t: '快键新手', d: '快捷键练习器累计答对 10 题', icon: '⚡' },
            { id: 'shortcut_50', t: '快键高手', d: '快捷键练习器累计答对 50 题', icon: '🚀' },
            { id: 'typing_40', t: '打字入门', d: '打字测试达到 40 字/分钟', icon: '⌨️' },
            { id: 'typing_80', t: '键盘大师', d: '打字测试达到 80 字/分钟', icon: '👑' },
            /* 坚持 */
            { id: 'streak_3', t: '坚持三天', d: '连续学习 3 天', icon: '🔥' },
            { id: 'streak_7', t: '坚持一周', d: '连续学习 7 天', icon: '⭐' },
            { id: 'graduate', t: '顺利毕业', d: '学完全部 14 个模块（毕业证书页可打印证书）', icon: '🏫' }
        ];

        function got() { return LS(KEY) || {}; }
        function defOf(id) {
            for (var i = 0; i < XD.ACHIEVEMENTS.length; i++) if (XD.ACHIEVEMENTS[i].id === id) return XD.ACHIEVEMENTS[i];
            return null;
        }

        /* 阅读量徽章 */
        function unlockReadAwards(keys) {
            if (keys.length >= 1) XD.achieve.unlock('first_read');
            if (keys.length >= 20) XD.achieve.unlock('explorer');
        }
        /* 模块全页读完徽章；返回是否全部模块都完成 */
        function unlockModAwards(readMap) {
            var allDone = true;
            for (var m = 0; m < XD.modIds.length; m++) {
                var files = XD.leafFilesOfMod(XD.modIds[m]), n = 0;
                for (var i = 0; i < files.length; i++) if (readMap[files[i]]) n++;
                if (files.length && n === files.length) XD.achieve.unlock('mod_' + XD.modIds[m].toLowerCase());
                if (files.length && n < files.length) allDone = false;
            }
            return allDone;
        }
        /* 连续学习徽章 */
        function unlockStreakAwards() {
            if (XD.studyLog.streakDays() >= 3) XD.achieve.unlock('streak_3');
            if (XD.studyLog.streakDays() >= 7) XD.achieve.unlock('streak_7');
        }

        XD.achieve = {
            list: function () {
                var g = got();
                return XD.ACHIEVEMENTS.map(function (a) {
                    return { id: a.id, t: a.t, d: a.d, icon: a.icon, at: g[a.id] || 0 };
                });
            },
            unlock: function (id) {
                var g = got();
                if (g[id]) return; /* 幂等：已解锁直接返回 */
                var def = defOf(id);
                if (!def) return;
                g[id] = Date.now();
                SS(KEY, g);
                XD.showToast('🏅 成就解锁：' + def.t + ' — ' + def.d);
                XD.emit('achieve.unlocked', { id: id, t: def.t });
            },
            checkProgress: function (readMap) {
                unlockReadAwards(Object.keys(readMap));
                var allDone = unlockModAwards(readMap);
                unlockStreakAwards();
                if (allDone) XD.achieve.unlock('graduate');
            },
            checkQuiz: function (all) {
                var n = 0;
                for (var i = 0; i < QUIZ_IDS.length; i++) if (all && all[QUIZ_IDS[i]]) n++;
                if (n >= QUIZ_IDS.length) XD.achieve.unlock('all_quiz');
            }
        };
    })();

    /* ============================================================
     * 游戏化 XD.game（xd_xp_v1 经验 + xd_daily_v1 每日任务）
     * 经验表 12 级（0→3600 XP）；每日任务完成态实时从学习记录推导，
     * 只记录"已领取"，不额外落完成标记
     * ============================================================ */
    (function () {
        var XP_KEY = 'xd_xp_v1';        // { xp: n, log: [{n, why, at}] }
        var DAILY_KEY = 'xd_daily_v1';  // { date: 'Y-M-D', claimed: {t1:1,...} } 仅记录已领取，完成态实时推导
        XD.LEVELS = [
            { xp: 0, t: '懵懂新手' },
            { xp: 50, t: '初学乍练' },
            { xp: 150, t: '渐入佳境' },
            { xp: 300, t: '小有所成' },
            { xp: 500, t: '融会贯通' },
            { xp: 750, t: '娴熟老手' },
            { xp: 1050, t: '得心应手' },
            { xp: 1400, t: '学有所成' },
            { xp: 1800, t: '进阶达人' },
            { xp: 2300, t: '精益求精' },
            { xp: 2900, t: '博闻强识' },
            { xp: 3600, t: '数字学神' }
        ];

        /* ---- 存储层 ---- */
        function readXp() {
            var a = LS(XP_KEY);
            if (a && typeof a.xp === 'number') return a;
            return { xp: 0, log: [] };
        }
        function writeXp(a) {
            if (a.log && a.log.length > 200) a.log = a.log.slice(-200);
            SS(XP_KEY, a);
        }

        /* ---- 等级推算：由经验值定位当前/下一级 ---- */
        function levelInfo(xp) {
            var lv = 0;
            for (var i = 0; i < XD.LEVELS.length; i++) if (xp >= XD.LEVELS[i].xp) lv = i;
            var cur = XD.LEVELS[lv];
            var next = XD.LEVELS[lv + 1] || null;
            var span = next ? next.xp - cur.xp : 1;
            var got = next ? xp - cur.xp : span;
            return {
                lv: lv + 1, t: cur.t, xp: xp,
                pct: next ? Math.max(0, Math.min(100, Math.round(got / span * 100))) : 100,
                next: next ? next.xp : xp, nextT: next ? next.t : ''
            };
        }
        function isToday(ts) {
            var d = new Date(ts), now = new Date();
            return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
        }
        XD.game = {
            xp: function () { return readXp().xp; },
            level: function () { return levelInfo(readXp().xp); },
            add: function (n, why) {
                var a = readXp();
                var before = levelInfo(a.xp).lv;
                a.xp += n;
                a.log.push({ n: n, why: why || '', at: Date.now() });
                writeXp(a);
                var after = levelInfo(a.xp).lv;
                if (after > before) XD.showToast('🔺 升级！Lv' + after + ' · ' + levelInfo(a.xp).t, 3600);
                XD.emit('game.xp', { xp: a.xp, n: n, why: why || '' });
            },
            /* 每日任务：完成态全部从现有存储实时推导，零额外记录 */
            dailyTasks: function () {
                var readMap = XD.progress.all();
                var readsToday = 0;
                for (var f in readMap) {
                    if (Object.prototype.hasOwnProperty.call(readMap, f)) {
                        if (isToday(readMap[f])) readsToday++;
                    }
                }
                var log = XD.studyLog.recent(500);
                var qToday = 0, pToday = 0;
                for (var i = 0; i < log.length; i++) {
                    var e = log[i];
                    if (!isToday(e.at)) continue;
                    if (e.type === 'quiz') qToday++;
                    if (e.type === 'practice' || e.type === 'mouse') pToday++;
                }
                var c = LS(DAILY_KEY);
                var claimed = (c && c.date === XD.fmtDate(new Date()) && c.claimed) ? c.claimed : {};
                var tasks = [
                    { id: 't1', t: '今日读满 2 页', d: '打开两篇图文课，进入页面自动记录', done: readsToday >= 2, xp: 10 },
                    { id: 't2', t: '完成一次互动练习', d: '键盘/打字/鼠标等练习器跑完一轮', done: pToday >= 1, xp: 10 },
                    { id: 't3', t: '完成一套测验', d: '任意一套结业测验做完即算', done: qToday >= 1, xp: 10 }
                ];
                for (var j = 0; j < tasks.length; j++) tasks[j].claimed = !!claimed[tasks[j].id];
                return tasks;
            },
            claimDaily: function (id) {
                var today = XD.fmtDate(new Date());
                var tasks = XD.game.dailyTasks();
                var def = null;
                for (var i = 0; i < tasks.length; i++) if (tasks[i].id === id) def = tasks[i];
                if (!def || !def.done || def.claimed) return false;
                var c = LS(DAILY_KEY) || {};
                if (c.date !== today || !c.claimed) c = { date: today, claimed: {} };
                c.claimed[id] = 1;
                SS(DAILY_KEY, c);
                XD.game.add(def.xp, '完成每日任务「' + def.t + '」');
                XD.emit('game.daily', { id: id });
                return true;
            }
        };
    })();

    /* ============================================================
     * 首次导游 XD.guide（xd_guide_v1）——首页 3 步轮播遮罩
     * 仅展示一次（完成后本地标记），可跳过；科普"学习如何为你计分"
     * ============================================================ */
    (function () {
        var KEY = 'xd_guide_v1';

        /* ---- 三步导游词（数据即文案，逐字保留） ---- */
        var STEPS = [
            { icon: '🗺️', t: '先看课程地图', d: '首页下面就是全部模块的课程地图，从你最想学的地方点进去，随时能回来。' },
            { icon: '✅', t: '打开页面自动记录', d: '每打开一篇图文课就记一次已读，首页绿色进度条会一点点往上涨，成就感看得见。' },
            { icon: '🏅', t: '测验积累经验升级', d: '每个模块结尾有一场结业测验，做完有解析；拿徽章、攒经验，一步步从小白升到"数字学神"。' }
        ];

        XD.guide = {
            /* 未标记过则展示；已展示过静默跳过 */
            maybe: function () {
                try { if (localStorage.getItem(KEY)) return; } catch (e) {}
                XD.guide.show();
            },
            show: function () {
                if (document.getElementById('xdGuide')) return;
                try { localStorage.setItem(KEY, '1'); } catch (e) {}

                /* ---- 搭骨架：遮罩 + 步骤窗 + 导航 + 圆点 ---- */
                var mask = document.createElement('div');
                mask.className = 'guide-mask';
                mask.id = 'xdGuide';
                mask.innerHTML = '<div class="guide-box">' +
                    '<div class="guide-step"></div>' +
                    '<div class="guide-nav"><button type="button" class="guide-skip" data-g="skip">跳过</button>' +
                    '<button type="button" class="btn guide-next" data-g="next">下一步 →</button></div>' +
                    '<div class="guide-dots"></div></div>';
                document.body.appendChild(mask);
                var stepEl = mask.querySelector('.guide-step');
                var dotsEl = mask.querySelector('.guide-dots');
                var nextEl = mask.querySelector('.guide-next');

                /* ---- 渲染当前步与导航态 ---- */
                var cur = 0;
                function render() {
                    var s = STEPS[cur];
                    stepEl.innerHTML = '<div class="guide-icon">' + s.icon + '</div><b>' + s.t + '</b><p>' + s.d + '</p>';
                    nextEl.textContent = cur === STEPS.length - 1 ? '开始学习 🎉' : '下一步 →';
                    var dh = '';
                    for (var i = 0; i < STEPS.length; i++) dh += '<i' + (i === cur ? ' class="on"' : '') + '></i>';
                    dotsEl.innerHTML = dh;
                }
                function close() {
                    mask.classList.add('out');
                    setTimeout(function () { if (mask.parentNode) mask.parentNode.removeChild(mask); }, 350);
                }
                mask.addEventListener('click', function (e) {
                    var t = e.target;
                    if (t.getAttribute && t.getAttribute('data-g') === 'skip') { close(); return; }
                    if (t.getAttribute && t.getAttribute('data-g') === 'next') {
                        if (cur < STEPS.length - 1) { cur++; render(); } else close();
                        return;
                    }
                    if (t === mask) close();
                });
                render();
            }
        };
    })();

    /* ============================================================
     * 收藏夹 XD.fav（xd_fav_v1）——每页右上角 ☆/★ 切换，仪表盘「我的收藏」读取
     * 结构：存储层 read/write（值必须是数组，损坏数据视为空）＋ 业务层五接口
     * ============================================================ */
    (function () {
        var KEY = 'xd_fav_v1';

        /* ---- 存储层 ---- */
        function read() {
            try {
                var a = JSON.parse(localStorage.getItem(KEY));
                if (Object.prototype.toString.call(a) === '[object Array]') return a;
            } catch (e) {}
            return [];
        }
        function write(a) { try { localStorage.setItem(KEY, JSON.stringify(a)); } catch (e) {} }

        /* ---- 业务层：文件名 ↔ 页面信息（未收录的旧收藏仍可列出） ---- */
        function pageOf(f) {
            for (var i = 0; i < XD.PAGES.length; i++) if (XD.PAGES[i].f === f) return XD.PAGES[i];
            return null;
        }

        XD.fav = {
            list: function () {
                var a = read(), out = [];
                for (var i = 0; i < a.length; i++) {
                    var p = pageOf(a[i]);
                    out.push(p ? { f: p.f, t: p.t, m: p.m } : { f: a[i], t: a[i], m: '' });
                }
                return out;
            },
            has: function (f) { return read().indexOf(f) >= 0; },
            toggle: function (f) {
                var a = read(), i = a.indexOf(f);
                if (i >= 0) { a.splice(i, 1); write(a); XD.emit('fav.changed', { f: f, on: false }); return false; }
                a.push(f); write(a); XD.emit('fav.changed', { f: f, on: true }); return true;
            },
            remove: function (f) {
                var a = read(), i = a.indexOf(f);
                if (i >= 0) { a.splice(i, 1); write(a); XD.emit('fav.changed', { f: f, on: false }); }
            },
            count: function () { return read().length; }
        };
    })();

    /* ============================================================
     * 语音朗读 XD.speak —— 图文课正文朗读条（🔊 每页右上角）
     * SpeechSynthesis 缺失时提供空壳 toggle（不抛错）
     * 段落来源：h1/h2/h3/p/li/td/th，排除工具性区块（代码/测验/页脚/目录/前后页/操作条/自身）
     * ============================================================ */
    (function () {
        if (!('speechSynthesis' in window)) { XD.speak = { toggle: function () {} }; return; }

        var synth = window.speechSynthesis;
        var bar = null, parts = [], idx = 0, rate = 1, paused = false, running = false;
        var utter = null;

        /* ---- 收集可朗读段落 ---- */
        var SKIP = '.code-block, .quiz-report, .lesson-footer, .toc, .lesson-nav, .page-actions, .speak-bar';
        function collect() {
            var box = document.querySelector('.lesson.container');
            if (!box) return [];
            var nodes = box.querySelectorAll('h1, h2, h3, p, li, td, th');
            var out = [];
            for (var i = 0; i < nodes.length; i++) {
                var n = nodes[i];
                if (n.closest(SKIP)) continue;
                var t = (n.textContent || '').replace(/\s+/g, ' ').trim();
                if (t) out.push({ el: n, text: t });
            }
            return out;
        }

        /* ---- 高亮与滚动 ---- */
        function clearHL() {
            if (!parts.length) return;
            for (var i = 0; i < parts.length; i++) parts[i].el.classList.remove('speaking');
        }
        function speakPart() {
            if (!running) return;
            if (idx >= parts.length) { finish(); return; }
            clearHL();
            var part = parts[idx];
            part.el.classList.add('speaking');
            try { part.el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
            var u = new SpeechSynthesisUtterance(part.text);
            u.lang = 'zh-CN';
            u.rate = rate;
            var vs = synth.getVoices().filter(function (v) { return /^zh/i.test(v.lang); });
            if (vs.length) u.voice = vs[0];
            u.onend = function () { idx++; speakPart(); };
            u.onerror = function () { idx++; speakPart(); };
            utter = u;
            synth.speak(u);
        }

        /* ---- 结束 / 停止 ---- */
        function finish() {
            running = false;
            clearHL();
            if (bar) {
                var p = bar.querySelector('[data-sp="play"]');
                if (p) p.textContent = '▶ 重听一遍';
            }
            XD.showToast('🔊 朗读完毕');
        }
        function stop() {
            running = false; paused = false;
            try { synth.cancel(); } catch (e) {}
            clearHL();
            idx = 0;
        }

        /* ---- 朗读条 UI ---- */
        function buildBar() {
            bar = document.createElement('div');
            bar.className = 'speak-bar';
            bar.innerHTML = '<span class="speak-t">🔊 朗读中</span>' +
                '<button type="button" class="speak-btn" data-sp="play">⏸ 暂停</button>' +
                '<button type="button" class="speak-btn" data-sp="stop">⏹ 停止</button>' +
                '<span class="speak-rate"><label>语速</label>' +
                '<button type="button" class="speak-btn" data-rate="0.75">慢</button>' +
                '<button type="button" class="speak-btn on" data-rate="1">中</button>' +
                '<button type="button" class="speak-btn" data-rate="1.1">快</button></span>' +
                '<button type="button" class="speak-btn" data-sp="close">✕</button>';
            document.body.appendChild(bar);
            bar.addEventListener('click', function (e) {
                var b = e.target.closest('[data-sp], [data-rate]');
                if (!b) return;
                var sp = b.getAttribute('data-sp');
                if (sp === 'play') {
                    if (paused) { paused = false; synth.resume(); b.textContent = '⏸ 暂停'; }
                    else if (running) { paused = true; synth.pause(); b.textContent = '▶ 继续'; }
                    else start();
                } else if (sp === 'stop') { stop(); if (bar) bar.style.display = 'none'; }
                else if (sp === 'close') { stop(); if (bar) bar.style.display = 'none'; }
                else if (b.getAttribute('data-rate')) {
                    rate = parseFloat(b.getAttribute('data-rate'));
                    var rs = bar.querySelectorAll('[data-rate]');
                    for (var i = 0; i < rs.length; i++) rs[i].classList.toggle('on', rs[i] === b);
                    if (running) { try { synth.cancel(); } catch (e) {} idx--; idx = Math.max(0, idx); speakPart(); }
                }
            });
        }
        function start() {
            parts = collect();
            if (!parts.length) { XD.showToast('本页没有可朗读的正文'); return; }
            if (!bar) buildBar();
            bar.style.display = 'flex';
            idx = 0; paused = false; running = true;
            var p = bar.querySelector('[data-sp="play"]');
            if (p) p.textContent = '⏸ 暂停';
            synth.cancel();
            speakPart();
        }

        XD.speak = {
            toggle: function () {
                if (running || paused) { stop(); if (bar) bar.style.display = 'none'; }
                else start();
            },
            stop: stop
        };
    })();

    /* ============================================================
     * 护眼提醒 XD.eyeCare（xd_eye_v1）——当日累计学习满 45 分钟提醒一次
     * 每 30 秒 tick（页面不可见时跳过计数），提醒后 1 小时冷却
     * ============================================================ */
    (function () {
        var KEY = 'xd_eye_v1';
        var TIP_SEC = 45 * 60;
        var COOLDOWN = 60 * 60 * 1000;

        /* ---- 存储层：跨日自动重置 ---- */
        function read() {
            try {
                var o = JSON.parse(localStorage.getItem(KEY));
                if (o && typeof o === 'object') return o;
            } catch (e) {}
            return { date: '', sec: 0, lastTip: 0 };
        }
        function write(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }
        function today() { return XD.fmtDate(new Date()); }

        /* ---- 累计 30 秒一跳，满 45 分钟且冷却已过才提醒 ---- */
        function tick() {
            var o = read();
            if (o.date !== today()) o = { date: today(), sec: 0, lastTip: 0 };
            o.sec += 30;
            var now = Date.now();
            var show = o.sec >= TIP_SEC && now - o.lastTip >= COOLDOWN;
            if (show) o.lastTip = now;
            write(o);
            if (show) showTip();
        }
        function showTip() {
            if (document.getElementById('eyeTip')) return;
            var tip = document.createElement('div');
            tip.className = 'eye-tip';
            tip.id = 'eyeTip';
            tip.innerHTML = '<div class="eye-ic">👀</div><div class="eye-mid"><b>该让眼睛歇一歇啦</b>' +
                '<span>你已经连续学了很久。站起来走走、看看窗外远处，比一直盯屏幕更护眼。</span></div>' +
                '<div class="eye-side"><button type="button" class="btn ghost" data-eye="later">再学一会儿</button>' +
                '<button type="button" class="btn" data-eye="ok">知道了</button></div>';
            document.body.appendChild(tip);
            tip.addEventListener('click', function (e) {
                var b = e.target.closest('[data-eye]');
                if (!b) return;
                tip.classList.add('out');
                setTimeout(function () { if (tip.parentNode) tip.parentNode.removeChild(tip); }, 300);
            });
        }

        XD.eyeCare = {
            start: function () {
                if (typeof document.visibilityState === 'undefined' && typeof document.hidden === 'undefined') return;
                setInterval(function () {
                    if (typeof document.visibilityState !== 'undefined' && document.visibilityState === 'hidden') return;
                    tick();
                }, 30000);
            },
            tick: tick
        };
    })();

    /* ========== 版本框架 ========== */
    XD.APP_VER = '1.5.0';
    XD.VERSION_LOG = [
        { ver: '1.5.0', title: '玻璃拟态交互升级 + 术语词典与毕业证书', desc: '全站上线 6 大玻璃拟态交互：光随鼠走（卡片柔光跟随 + 3D 轻微倾斜）、玻璃停靠栏（底部居中图标 dock，悬停放大相邻跟随）、液态模块导航条（目录页顶部 A-N 玻璃胶囊，切换滑块滑动回弹）、模块就地放大（图文课卡片原位浮起铺满主区，底部缩略条切换，Esc/✕ 原路收回）、水滴分裂筛选（学习统计今天/本周/本月/全年液态胶囊分裂，指标数字滚动）、命令面板（Ctrl+K 或 / 唤起玻璃搜索，背景压暗模糊 + 关键词高亮 + 回车跳转）；仪表盘新增最近 35 天学习热力日历与每日任务今日目标进度条；新增第 8 个工具「术语词典」（SYS5，60 个术语的大白话解释）与第 9 个工具「毕业证书」（SYS6，学完十四大模块领取可打印证书）；成就徽章增至 26 枚（新增坚持一周、顺利毕业）；页面增至 127 个、TREE 节点 125 个' },
        { ver: '1.4.0', title: '适老功能四件套 + 生活场景速查', desc: '新增语音朗读、收藏夹、打印本页、护眼休息提醒四大适老功能（每页右上角一键使用）；新增第 7 个工具「生活场景速查」（SYS4）：按生活问题直达课程；页面增至 125 个、TREE 节点 123 个；鼠标练习器与快捷键挑战补成绩评价，仪表盘新增我的收藏卡' },
        { ver: '1.3.0', title: '游戏化升级 + 三大新模块', desc: '新增网上购物与现代消费（L）/数字生活进阶（M）/旅游与出行（N）三大模块共 23 页，测验增至 13 套、成就增至 24 枚、目录页 19 个；首页重构（等级徽章/今日统计/继续学习）；XP 等级、每日任务、首次导游、考后解析报告与错题弱项分析全面上线' },
        { ver: '1.2.0', title: '内容大扩容', desc: '新增四大模块：手机与平板（H）/微信与生活服务（I）/网络安全与防诈骗（J）/办公与文档（K），共 32 个新页面，测验增至 10 套、成就增至 21 枚，新增鼠标练习器与诈骗识别练习器' },
        { ver: '1.1.0', title: '模块树结构上线', desc: '全站改为模块化目录树：点进模块看到细分子模块，目录套目录层层深入，面包屑导航定位，树深支持到 10 层' },
        { ver: '1.0.0', title: '现代知识学院开学', desc: '七大模块上线：计算机基础/电脑使用/网络与服务器/键盘快捷键/AI/Git与GitHub/Web开发；快捷键练习器、Git演练场、提示词实验室、测验与错题本、学习仪表盘' }
    ];

    /* ============================================================
     * 站内搜索 XD.search（Ctrl+K 或 / 唤起玻璃命令面板）
     * 职责拆分：escRe 转义 / hl 高亮 / matches 过滤 / build 面板 / render 结果 / move 选择 / open close 开合
     * ============================================================ */
    (function () {
        var mask = null, input = null, listEl = null, cur = -1, items = [];

        /* ---- 匹配与高亮 ---- */
        function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
        function hl(text, kw) {
            var esc = XD.escapeHtml(String(text == null ? '' : text));
            if (!kw) return esc;
            try { return esc.replace(new RegExp('(' + escRe(kw) + ')', 'gi'), '<mark class="hl">$1</mark>'); }
            catch (err) { return esc; }
        }
        function matches(p, kw) { return (p.t + ' ' + p.k + ' ' + p.f).toLowerCase().indexOf(kw) >= 0; }

        /* ---- 面板构建（一次性，open 时复用） ---- */
        function build() {
            mask = document.createElement('div');
            mask.className = 'xd-search-mask';
            mask.innerHTML = '<div class="xd-search-box">' +
                '<div class="cmd-head"><b>🔍 命令面板</b><span>Ctrl+K 或 / 唤起 · ↑↓ 选择 · 回车跳转 · Esc 关闭</span></div>' +
                '<input class="xd-search-input" placeholder="搜索课程…（输入关键词，实时过滤高亮）">' +
                '<div class="xd-search-list"></div></div>';
            document.body.appendChild(mask);
            input = mask.querySelector('.xd-search-input');
            listEl = mask.querySelector('.xd-search-list');
            mask.addEventListener('click', function (e) { if (e.target === mask) close(); });
            input.addEventListener('input', function () { render(input.value); });
            input.addEventListener('keydown', function (e) {
                if (e.key === 'Escape') { close(); }
                else if (e.key === 'ArrowDown') { move(1); e.preventDefault(); }
                else if (e.key === 'ArrowUp') { move(-1); e.preventDefault(); }
                else if (e.key === 'Enter' && items.length) { location.href = items[Math.max(0, cur)]; }
            });
        }

        /* ---- 结果渲染：空词列出全部，命中词高亮，无结果给空态 ---- */
        function render(kw) {
            kw = (kw || '').trim().toLowerCase();
            cur = -1;
            var ps = XD.PAGES.filter(function (p) {
                if (!kw) return true;
                return matches(p, kw);
            }).slice(0, 30);
            items = ps.map(function (p) { return p.f; });
            var html = '';
            for (var i = 0; i < ps.length; i++) {
                html += '<div class="xd-search-item" data-f="' + ps[i].f + '"><span class="f">' + hl(ps[i].f, kw) + '</span><span>' + hl(ps[i].t, kw) + '</span></div>';
            }
            if (!ps.length) html = '<div class="xd-search-item"><span>没有匹配的课程</span></div>';
            listEl.innerHTML = html;
            var els = listEl.querySelectorAll('.xd-search-item[data-f]');
            for (var j = 0; j < els.length; j++) {
                els[j].onclick = function () { location.href = this.getAttribute('data-f'); };
            }
        }

        /* ---- 键盘循环选择 ---- */
        function move(d) {
            var els = listEl.querySelectorAll('.xd-search-item[data-f]');
            if (!els.length) return;
            cur = (cur + d + els.length) % els.length;
            for (var i = 0; i < els.length; i++) els[i].classList.toggle('hot', i === cur);
        }

        /* ---- 开合 ---- */
        function open() {
            if (!mask) build();
            mask.classList.add('open');
            input.value = '';
            render('');
            setTimeout(function () { input.focus(); }, 50);
        }
        function close() { if (mask) mask.classList.remove('open'); }

        /* ---- 全局热键：输入态放行，Ctrl+K 与 / 唤起 ---- */
        document.addEventListener('keydown', function (e) {
            var tag = (e.target && e.target.tagName) || '';
            if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable)) return;
            if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); open(); return; }
            if (e.key === '/' && mask && !mask.classList.contains('open')) { e.preventDefault(); open(); }
        });

        XD.search = { open: open, close: close };
    })();

    /* ============================================================
     * 玻璃拟态 UI（v1.5）：
     * ① 光随鼠走 —— 卡片 3D 倾斜 + 光斑跟随，事件委托提升性能；
     * ② 玻璃停靠栏 —— 全站底部居中图标 dock，悬停当前放大、相邻跟随。
     * ============================================================ */
    (function () {
        /* ---- 光随鼠走：mousemove 委托更新 CSS 变量（移出复原） ---- */
        var CARD_SEL = '.card, .module-card, .qc-card, .scene-card';
        var tiltEl = null;
        function tiltVars(px, py, w, h) {
            return {
                mx: px + 'px', my: py + 'px',
                rx: ((py / h) - 0.5) * -3 + 'deg',
                ry: ((px / w) - 0.5) * 3 + 'deg'
            };
        }
        function setTilt(el, x, y) {
            var r = el.getBoundingClientRect();
            if (!r || !r.width) return;
            var v = tiltVars(x - r.left, y - r.top, r.width, r.height);
            el.style.setProperty('--mx', v.mx);
            el.style.setProperty('--my', v.my);
            el.style.setProperty('--rx', v.rx);
            el.style.setProperty('--ry', v.ry);
        }
        function clearTilt(el) {
            el.style.setProperty('--rx', '0deg');
            el.style.setProperty('--ry', '0deg');
        }
        document.addEventListener('mousemove', function (e) {
            var c = e.target && e.target.closest ? e.target.closest(CARD_SEL) : null;
            if (c) { setTilt(c, e.clientX, e.clientY); tiltEl = c; }
            else if (tiltEl) { clearTilt(tiltEl); tiltEl = null; }
        }, true);

        /* ---- 玻璃停靠栏：DOCK 数据 + 惰性构建 + 悬停提升 ----
         * v1.6：图标由 emoji 改为跨平台一致的文字徽标（s 字段），
         * 渲染不再受操作系统 emoji 字体差异影响。 */
        var DOCK = [
            { f: 'index.html', s: '首页', t: '首页' },
            { f: '1.html', s: '目录', t: '全站目录' },
            { f: '41.html', s: '仪表', t: '学习仪表盘' },
            { f: '42.html', s: '徽章', t: '成就徽章墙' },
            { f: '43.html', s: '测验', t: '测验中心' },
            { f: 'SYS4.html', s: '场景', t: '场景速查' },
            { f: 'SYS5.html', s: '词典', t: '术语词典' },
            { f: 'SYS6.html', s: '证书', t: '毕业证书' },
            { f: null, s: '搜索', t: '搜索' } /* 无页面 → 打开命令面板 */
        ];
        function dockItemHtml(d, cur) {
            if (d.f) return '<a href="' + d.f + '" title="' + d.t + '"' + (d.f === cur ? ' class="on"' : '') + '>' + d.s + '</a>';
            return '<button type="button" class="dock-btn" data-dock="search" title="' + d.t + '">' + d.s + '</button>';
        }
        function bindSearchBtns(dock) {
            var btns = dock.querySelectorAll('.dock-btn[data-dock="search"]');
            for (var s = 0; s < btns.length; s++) {
                (function (b) {
                    b.addEventListener('click', function () { if (window.XD && XD.search) XD.search.open(); });
                })(btns[s]);
            }
        }
        function bindLift(items) {
            function idxOf(it) {
                for (var q = 0; q < items.length; q++) if (items[q] === it) return q;
                return -1;
            }
            for (var k = 0; k < items.length; k++) {
                (function (it) {
                    it.addEventListener('mouseenter', function () {
                        it.classList.add('lift-lg');
                        var i = idxOf(it);
                        if (i > 0) items[i - 1].classList.add('lift');
                        if (i >= 0 && i < items.length - 1) items[i + 1].classList.add('lift');
                    });
                    it.addEventListener('mouseleave', function () {
                        it.classList.remove('lift-lg');
                        for (var q = 0; q < items.length; q++) items[q].classList.remove('lift');
                    });
                })(items[k]);
            }
        }
        function buildDock() {
            if (!document.body || document.getElementById('xdDock')) return; /* 幂等 */
            var cur = document.body.getAttribute('data-page') || '';
            var dock = document.createElement('div');
            dock.className = 'glass-dock';
            dock.id = 'xdDock';
            var h = '';
            for (var i = 0; i < DOCK.length; i++) h += dockItemHtml(DOCK[i], cur);
            dock.innerHTML = h;
            document.body.appendChild(dock);
            bindSearchBtns(dock);
            bindLift(dock.children);
        }
        if (document.body) {
            if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildDock);
            else buildDock();
        }
    })();

    /* ============================================================
     * 液态模块导航条（v1.5）：目录页顶部 A-N 玻璃胶囊 + 液态滑块
     * 滑块"像水一样"滑到当前模块；点击胶囊平滑滚动后延迟跳转。
     * ============================================================ */
    (function () {
        /* v1.6：模块图标改"金色圆点 + 字母"徽标；emoji 描绘交给正文内容，
         * 导航条不再依赖系统 emoji 字体 → 跨平台完全一致 */
        var HOME_PILL = '<a class="mod-pill" href="index.html" data-mod="HOME" title="首页"><i></i>首页</a>';
        var MOD_DOT = '<i></i>';
        var JUMP_DELAY = 440; /* 点击后留给滑块动画的时间 */

        function modOf(page) {
            if (page === 'index.html' || page === '1.html') return 'HOME';
            for (var i = 0; i < XD.modIds.length; i++) {
                if (page.indexOf(XD.modIds[i]) === 0) return XD.modIds[i];
            }
            return '';
        }
        function pillHtml(id, cur) {
            var nd = XD.node(id);
            if (!nd) return '';
            return '<a class="mod-pill' + (cur === id ? ' on' : '') + '" href="' + (nd.f || id + '.html') + '" data-mod="' + id + '" title="' + XD.escapeHtml(nd.n) + '">' + MOD_DOT + '<b>' + id + '</b></a>';
        }
        /* 滑块贴住 .on 胶囊（左右各内缩 2px，避免遮住圆角） */
        function place(slider, pills) {
            var target = null;
            for (var i = 0; i < pills.length; i++) if (pills[i].classList.contains('on')) { target = pills[i]; break; }
            if (!target) { slider.style.display = 'none'; return; }
            slider.style.display = '';
            slider.style.left = (target.offsetLeft + 2) + 'px';
            slider.style.width = Math.max(0, target.offsetWidth - 4) + 'px';
        }
        function bindPills(pills, slider) {
            for (var p = 0; p < pills.length; p++) {
                (function (pill) {
                    pill.addEventListener('click', function (e) {
                        if (pill.classList.contains('on')) return;
                        e.preventDefault();
                        if (pill.scrollIntoView) {
                            try { pill.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }); } catch (err) { }
                        }
                        slider.style.display = '';
                        slider.style.left = (pill.offsetLeft + 2) + 'px';
                        slider.style.width = Math.max(0, pill.offsetWidth - 4) + 'px';
                        setTimeout(function () { location.href = pill.getAttribute('href'); }, JUMP_DELAY);
                    });
                })(pills[p]);
            }
        }
        function buildStrip() {
            if (!window.XD || !XD.TREE) return;
            if (document.body.getAttribute('data-kind') !== 'dir') return; /* 仅目录页 */
            var container = document.querySelector('main .container') || document.querySelector('.container');
            if (!container) return;
            var h1 = container.querySelector('h1');
            if (!h1 || container.querySelector('.mod-strip')) return; /* 幂等 */
            var cur = modOf(document.body.getAttribute('data-page') || '');
            var html = '<div class="mod-strip"><div class="mod-pills">';
            html += cur === 'HOME' ? HOME_PILL.replace('class="mod-pill"', 'class="mod-pill on"') : HOME_PILL;
            for (var m = 0; m < XD.modIds.length; m++) html += pillHtml(XD.modIds[m], cur);
            html += '<span class="mod-slider"></span></div></div>';
            h1.insertAdjacentHTML('beforebegin', html);
            var slider = container.querySelector('.mod-strip .mod-slider');
            var pills = container.querySelectorAll('.mod-pill');
            place(slider, pills);
            bindPills(pills, slider);
        }
        if (document.body) {
            if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildStrip);
            else buildStrip();
        }
    })();

    /* ============================================================
     * 模块就地放大（v1.5）：目录页图文课卡从原位"飞"成全屏预览
     * 点击卡 → 卡片位置飞入舞台；Esc/关闭 → 反向飞回原位。
     * 无 fetch 环境直接整页跳转（守护降级）。
     * ============================================================ */
    (function () {
        if (typeof fetch === 'undefined') return; /* 无 fetch 环境直接整页跳转 */

        var cache = {}; /* url → {ok, html, title} */
        var stage = null, thumbs = null, curHref = '', zoomCards = [];
        var FLY_CSS = '.45s cubic-bezier(.22, .61, .36, 1)'; /* 飞出动画 */
        var BACK_MS = 430; /* 飞回后卸载舞台 */
        var DOC_BADGE = '图文课';

        function fetchDoc(url) {
            if (cache[url]) return Promise.resolve(cache[url]);
            return fetch(url, { cache: 'no-cache' }).then(function (r) {
                if (!r.ok) throw new Error('fetch fail');
                return r.text();
            }).then(function (txt) {
                var d = new DOMParser().parseFromString(txt, 'text/html');
                var body = d.body;
                var kind = (body && body.getAttribute('data-kind')) || '';
                var box = d.querySelector('main .container, .container');
                var hasInteract = box && box.querySelector('.quiz-box, .vk, .term, .type-target');
                var info = {
                    ok: !!(box && kind === 'doc' && !hasInteract),
                    html: box ? box.innerHTML : '',
                    title: (d.querySelector('h1') || { textContent: '' }).textContent || ''
                };
                cache[url] = info;
                return info;
            }).catch(function () { return null; });
        }

        /* 卡片矩形 → 从卡片中心飞向视口中心的 transform */
        function toStageTransform(rect) {
            var vw = window.innerWidth || document.documentElement.clientWidth || 800;
            var vh = window.innerHeight || document.documentElement.clientHeight || 600;
            var cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
            return 'translate(' + (cx - vw / 2) + 'px,' + (cy - vh / 2) + 'px) scale(' + (rect.width / vw) + ',' + (rect.height / vh) + ')';
        }
        function buildUI() {
            stage = document.createElement('div');
            stage.className = 'zoom-stage';
            stage.innerHTML = '<div class="zoom-head"><span class="zoom-title"></span>' +
                '<button type="button" class="zoom-btn zoom-new">↗ 在新页面打开</button>' +
                '<button type="button" class="zoom-btn zoom-close">✕ 关闭</button></div>' +
                '<div class="zoom-body"><p class="empty-hint">正在加载…</p></div>';
            document.body.appendChild(stage);
            stage.querySelector('.zoom-close').addEventListener('click', closeZoom);
            stage.querySelector('.zoom-new').addEventListener('click', function () { location.href = curHref; });
            stage.addEventListener('click', function (e) { if (e.target === stage) closeZoom(); });
            thumbs = document.createElement('div');
            thumbs.className = 'thumb-strip';
            thumbs.style.display = 'none';
            document.body.appendChild(thumbs);
        }
        function showDoc(href) {
            var title = stage.querySelector('.zoom-title');
            var body = stage.querySelector('.zoom-body');
            body.innerHTML = '<p class="empty-hint">正在加载…</p>';
            fetchDoc(href).then(function (info) {
                if (!info || !info.ok) { location.href = href; return; } /* 不可预览 → 整页跳转 */
                title.textContent = info.title.trim() || href;
                body.innerHTML = info.html;
                body.scrollTop = 0;
            });
        }
        function renderThumbs() {
            var h = '';
            for (var k = 0; k < zoomCards.length; k++) {
                h += '<button type="button" class="thumb' + (zoomCards[k].href === curHref ? ' on' : '') + '" data-href="' + zoomCards[k].href + '">' + XD.escapeHtml(zoomCards[k].title) + '</button>';
            }
            thumbs.innerHTML = h;
            thumbs.style.display = '';
            thumbs.querySelectorAll('.thumb').forEach(function (b) {
                b.addEventListener('click', function () {
                    var th = b.getAttribute('data-href');
                    if (th === curHref) return;
                    curHref = th;
                    thumbs.querySelectorAll('.thumb').forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-href') === th); });
                    showDoc(th);
                });
            });
        }
        /* 收集当前卡片所在网格里所有"图文课"卡（供缩略图切换） */
        function collectDocCards(grid) {
            var cards = [];
            var links = grid.querySelectorAll('.module-card');
            for (var i = 0; i < links.length; i++) {
                var li = links[i].querySelector('ul li');
                if (li && li.textContent.indexOf(DOC_BADGE) >= 0) {
                    cards.push({ href: links[i].getAttribute('href'), title: (links[i].querySelector('b') || { textContent: '' }).textContent || '' });
                }
            }
            return cards;
        }
        function isDocCard(card) {
            var badge = card.querySelector('ul li');
            return !!(badge && badge.textContent.indexOf(DOC_BADGE) >= 0);
        }
        function openZoom(href, rect) {
            curHref = href;
            var grids = document.querySelectorAll('.card-grid');
            for (var i = 0; i < grids.length; i++) grids[i].classList.add('zoom-on');
            renderThumbs();
            stage.style.transformOrigin = '0 0';
            stage.style.transform = toStageTransform(rect);
            stage.style.opacity = '0';
            stage.classList.add('open');
            function fly() {
                stage.style.transition = 'transform ' + FLY_CSS + ', opacity .3s';
                stage.style.transform = 'translate(0,0) scale(1,1)';
                stage.style.opacity = '1';
            }
            if (window.requestAnimationFrame) requestAnimationFrame(fly);
            else setTimeout(fly, 16);
            showDoc(href);
        }
        function closeZoom() {
            var grids = document.querySelectorAll('.card-grid');
            for (var i = 0; i < grids.length; i++) grids[i].classList.remove('zoom-on');
            thumbs.style.display = 'none';
            var orig = null;
            var links = document.querySelectorAll('.module-card');
            for (var j = 0; j < links.length; j++) if (links[j].getAttribute('href') === curHref) { orig = links[j]; break; }
            if (orig) {
                stage.style.transform = toStageTransform(orig.getBoundingClientRect());
                stage.style.opacity = '0';
                setTimeout(function () {
                    stage.classList.remove('open');
                    stage.style.transition = '';
                    stage.style.transform = '';
                    stage.style.opacity = '';
                }, BACK_MS);
            } else {
                stage.classList.remove('open');
            }
        }
        /* 暴露给 zoom-capture.js（前置捕获拦截）的复用接口：
         * 仅图文课卡判定 + 同一放大流程，避免两处逻辑漂移 */
        if (window.XD) {
            XD.zoom = {
                isDoc: isDocCard,
                openCard: function (c) {
                    zoomCards = collectDocCards(c.closest('.card-grid') || c.parentElement);
                    if (!stage) buildUI();
                    openZoom(c.getAttribute('href'), c.getBoundingClientRect());
                }
            };
        }
        document.addEventListener('click', function (e) {
            var c = e.target && e.target.closest ? e.target.closest('.module-card') : null;
            if (!c) return;
            if (!isDocCard(c)) return; /* 测验/工具/目录整页跳转 */
            e.preventDefault();
            var href = c.getAttribute('href');
            var grid = c.closest('.card-grid') || c.parentElement;
            zoomCards = collectDocCards(grid);
            if (!stage) buildUI();
            openZoom(href, c.getBoundingClientRect());
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && stage && stage.classList.contains('open')) closeZoom();
        });
    })();

    /* ============================================================
     * 首页仪表盘 XD.home（原 index.html 内联脚本抽离）
     * 渲染职责拆为五个小函数；SYS/SITE 系统模块不参与学习进度展示；
     * 启动时机与内联脚本一致：DOMContentLoaded（或已就绪时立即执行）
     * ============================================================ */
    (function () {
        function isSystemModule(mod) { return 'SYS SITE'.indexOf(mod.id) >= 0 && mod.id.length > 1; }

        /* ---- 搜索入口：Ctrl+K / 输入框回车 / 搜索按钮 → 命令面板 ---- */
        function bindSearch() {
            var si = document.getElementById('searchInput');
            var sb = document.getElementById('searchBtn');
            if (si) si.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' && window.XD && XD.search) XD.search.open();
            });
            if (sb) sb.addEventListener('click', function () {
                if (window.XD && XD.search) XD.search.open();
            });
        }

        /* ---- 等级卡（XP 等级 + 经验条） ---- */
        function renderLevelCard() {
            var lvBox = document.getElementById('homeLevel');
            if (!lvBox) return;
            var lv = XD.game.level();
            lvBox.innerHTML =
                '<div class="lv-card"><div class="lv-head">' +
                '<span class="lv-badge">Lv' + lv.lv + ' · ' + XD.escapeHtml(lv.t) + '</span>' +
                '<span class="lv-xp">' + lv.xp + ' XP</span></div>' +
                '<div class="xp-bar"><i style="width:' + lv.pct + '%;"></i></div>' +
                '<div class="lv-next">' + (lv.nextT ? '距「' + XD.escapeHtml(lv.nextT) + '」还差 ' + (lv.next - lv.xp) + ' XP' : '🎉 已达最高等级') + '</div></div>';
        }

        /* ---- 今日统计：今日学习 / 连续天数 / 已读页数 / 徽章数（全部实时推导） ---- */
        function renderTodayStats() {
            var ts = document.getElementById('todayStats');
            if (!ts) return;
            var achN = 0, aList = XD.achieve.list();
            for (var a = 0; a < aList.length; a++) if (aList[a].at) achN++;
            ts.innerHTML =
                '<span class="badge">📆 今日学习 ' + XD.studyLog.todayCount() + ' 次</span>' +
                '<span class="badge">🔥 连续 ' + XD.studyLog.streakDays() + ' 天</span>' +
                '<span class="badge">📖 已读 ' + XD.progress.count() + ' 页</span>' +
                '<span class="badge">🏅 徽章 ' + achN + '/' + XD.ACHIEVEMENTS.length + ' 枚</span>';
        }

        /* ---- 进度环 + 进度条（CSS 变量 --p 驱动圆环） ---- */
        function renderProgressRing() {
            var pct = XD.progress.overall();
            var ring = document.getElementById('progRing');
            if (ring) ring.style.setProperty('--p', pct);
            var pt = document.getElementById('progTxt');
            if (pt) pt.textContent = pct + '%';
            var pf = document.getElementById('progFill');
            if (pf) pf.style.width = pct + '%';
        }

        /* ---- 继续学习卡：取 xd_read_v1 里最近读过的页面 ---- */
        function renderContinueCard() {
            var cc = document.getElementById('continueCard');
            if (!cc) return;
            var all = XD.progress.all();
            var bestF = '', bestAt = 0;
            for (var k in all) {
                if (Object.prototype.hasOwnProperty.call(all, k) && all[k] > bestAt) { bestAt = all[k]; bestF = k; }
            }
            if (!bestF) {
                cc.innerHTML = '<div class="card cont-card"><b>⏩ 继续学习</b>' +
                    '<span>还没有学习记录——从下面任意一个模块开始，点进去随便读一课就好。</span>' +
                    '<a class="btn" href="A.html">从模块 A 开始 →</a></div>';
            } else {
                var lastTitle = bestF;
                for (var j = 0; j < XD.PAGES.length; j++) {
                    if (XD.PAGES[j].f === bestF) { lastTitle = XD.PAGES[j].t; break; }
                }
                var mid = bestF.replace(/\.html$/, ''), modTxt = '';
                var topM = mid.charAt(0).toUpperCase();
                var modN = XD.node(topM);
                if (modN) modTxt = '模块' + topM + ' · ' + XD.escapeHtml(modN.n);
                cc.innerHTML = '<div class="card cont-card"><b>⏩ 继续学习</b>' +
                    '<span>上次学到：<b>' + XD.escapeHtml(lastTitle) + '</b>' +
                    (modTxt ? '<br><span style="font-size:12px;">' + modTxt + '</span>' : '') + '</span>' +
                    '<a class="btn" href="' + bestF + '">接着学 →</a></div>';
            }
        }

        /* ---- 模块卡片（一级目录，系统模块跳过） ---- */
        function renderModuleGrid() {
            var grid = document.getElementById('modGrid');
            if (!grid) return;
            var html = '';
            for (var i = 0; i < XD.TREE.length; i++) {
                var mod = XD.TREE[i];
                if (isSystemModule(mod)) continue;
                var p = XD.progress.nodeProgress(mod);
                html += '<a class="module-card" href="' + mod.f + '">' +
                    '<span class="tag">' + (p === 100 ? '✅' : p + '%') + '</span>' +
                    '<div class="mod-head"><span style="font-size:30px;">' + mod.icon + '</span><span class="mod-no">模块' + mod.id + '</span></div>' +
                    '<b>' + XD.escapeHtml(mod.n) + '</b>' +
                    '<span>' + XD.escapeHtml(mod.d || '') + '</span>' +
                    '<ul><li>' + (mod.children ? mod.children.length + ' 个子模块' : '') + ' · 共 ' + XD.leafCount(mod) + ' 页内容</li>' +
                    '<li>' + (p === 100 ? '<span class="done-flag">✅ 已完成</span>' : p > 0 ? '进行中 ' + p + '%' : '未开始') + '</li></ul>' +
                    '</a>';
            }
            grid.innerHTML = html;
        }

        XD.home = {
            init: function () {
                bindSearch();
                if (!window.XD) return;
                renderLevelCard();
                renderTodayStats();
                renderProgressRing();
                renderContinueCard();
                renderModuleGrid();
            }
        };

        /* ---- 启动时机：DOMContentLoaded（或已就绪时立即执行） ---- */
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function () { XD.home.init(); });
        } else {
            XD.home.init();
        }
    })();

    /* ============================================================
     * 打字速度测试 XD.D4（原 D4.html 内联 520 行 script 抽离）
     * 生产行为逐条保留：语料 / 等级渐变 / 音效 / 限时 / 每日挑战 / 图表 / 分享卡 / 成就
     * 修复：原内联脚本第 636/653 行引用未声明的 optRow（严格模式下点击模式页签即 ReferenceError），
     *       本次将 optRow 纳入 IDS 契约声明。
     * ============================================================ */
    (function () {
        'use strict';

        /* ---- 主题色（运行时读 CSS 变量，跟随暗色/金色主题） ---- */
        var CS = getComputedStyle(document.documentElement);
        function cssVar(name, fallback) {
            var v = CS.getPropertyValue(name).trim();
            return v || fallback || '#667eea';
        }
        var C_BLUE = cssVar('--blue', '#667eea');
        var C_GREEN = cssVar('--green', '#11998e');
        var C_RED = cssVar('--red', '#ff6b6b');
        var C_DIM = cssVar('--dim', '#8b93a7');
        var C_PURPLE = cssVar('--purple', C_BLUE);

        /* ---- 语料库（与生产内联脚本逐字一致：中易 15 / 中难 15 / 中困难 15 / 英 14 / 长文 6） ---- */
        var POOLS = {
            cn: {
                easy: [
                    '床前明月光。', '春眠不觉晓。', '白日依山尽。', '粒粒皆辛苦。', '天涯共此时。',
                    '欲穷千里目。', '疑是地上霜。', '处处闻啼鸟。', '低头思故乡。', '更上一层楼。',
                    '海内存知己。', '会当凌绝顶。', '一览众山小。', '相逢何必曾相识。', '润物细无声。'
                ],
                mid: [
                    '光阴似箭，日月如梭，珍惜当下每一天。',
                    '生活不止眼前的苟且，还有诗和远方。',
                    '纸上得来终觉浅，绝知此事要躬行。',
                    '长风破浪会有时，直挂云帆济沧海。',
                    '天下难事必作于易，天下大事必作于细。',
                    '问渠那得清如许，为有源头活水来。',
                    '海内存知己，天涯若比邻。',
                    '千里之行，始于足下；九层之台，起于累土。',
                    '路漫漫其修远兮，吾将上下而求索。',
                    '业精于勤，荒于嬉；行成于思，毁于随。',
                    '读书破万卷，下笔如有神。',
                    '宝剑锋从磨砺出，梅花香自苦寒来。',
                    '山重水复疑无路，柳暗花明又一村。',
                    '沉舟侧畔千帆过，病树前头万木春。',
                    '欲把西湖比西子，淡妆浓抹总相宜。'
                ],
                hard: [
                    '真正的平静，不是避开车马喧嚣，而是在心中修篱种菊。',
                    '所谓天才，不过是把别人喝咖啡的工夫用在了学习上。',
                    '世界上最宽阔的是海洋，比海洋更宽阔的是人的胸怀。',
                    '不登高山，不知天之高也；不临深溪，不知地之厚也。',
                    '志不强者智不达，言不信者行不果。',
                    '学而不思则罔，思而不学则殆。',
                    '知之者不如好之者，好之者不如乐之者。',
                    '三更灯火五更鸡，正是男儿读书时。',
                    '锲而舍之，朽木不折；锲而不舍，金石可镂。',
                    '博学之，审问之，慎思之，明辨之，笃行之。',
                    '穷则独善其身，达则兼济天下。',
                    '老骥伏枥，志在千里；烈士暮年，壮心不已。',
                    '千磨万击还坚劲，任尔东西南北风。',
                    '不畏浮云遮望眼，自缘身在最高层。',
                    '先天下之忧而忧，后天下之乐而乐。'
                ]
            },
            en: [
                'Practice makes perfect.',
                'Where there is a will, there is a way.',
                'Actions speak louder than words.',
                'Every cloud has a silver lining.',
                'The early bird catches the worm.',
                'Knowledge is power.',
                'Time and tide wait for no man.',
                'Well begun is half done.',
                'Rome was not built in a day.',
                'Better late than never.',
                'The best way to predict the future is to create it.',
                'Stay hungry, stay foolish.',
                'Think different and dream big.',
                'Success is the sum of small efforts repeated day in and day out.'
            ],
            long: [
                '燕子去了，有再来的时候；杨柳枯了，有再青的时候；桃花谢了，有再开的时候。但是，聪明的，你告诉我，我们的日子为什么一去不复返呢？',
                '生命的意义不在于长度，而在于深度。我们无法决定生命的起点，却可以决定如何度过每一个今天，让每一天都过得充实而有意义。',
                '读书是一种习惯，更是一种享受。当文字在指尖流淌，当思想在脑海碰撞，你会发现自己正慢慢变得更辽阔、更从容。',
                '科技改变生活，创新驱动未来。人工智能正在走进千家万户，为人类带来前所未有的便利，同时也提醒我们保持思考与温度。',
                '清晨的阳光透过窗帘洒进房间，空气里飘着淡淡的咖啡香。打开笔记本，写下今天的计划，平凡的日子也要认真对待。',
                '少壮不努力，老大徒伤悲。一寸光阴一寸金，寸金难买寸光阴。把握当下，珍惜时间，才能不负青春、不负自己。'
            ]
        };

        /* ---- 本地存储键（统一 xd_ 前缀，读写走 XD.storage） ---- */
        var KEYS = { best: 'xd_typing_best_v1', rec: 'xd_typing_recs_v1', daily: 'xd_typing_daily_v1', sound: 'xd_typing_sound_v1' };

        /* ---- 等级（青铜 0 → 王者 120，背景随主题渐变） ---- */
        var RANKS = [
            { n: '青铜', min: 0, bg: C_DIM },
            { n: '白银', min: 30, bg: 'linear-gradient(135deg,' + C_DIM + ',' + cssVar('--line', '#cfd8e3') + ')' },
            { n: '黄金', min: 50, bg: cssVar('--title-grad', 'linear-gradient(135deg,#ffd54f,#f9a825)') },
            { n: '铂金', min: 70, bg: cssVar('--back-grad', 'linear-gradient(135deg,#80deea,#0097a7)') },
            { n: '钻石', min: 90, bg: cssVar('--btn-grad', 'linear-gradient(135deg,#b39ddb,#5e35b1)') },
            { n: '王者', min: 120, bg: 'linear-gradient(135deg,' + C_BLUE + ',' + C_PURPLE + ')' }
        ];

        /* ---- 纯函数 ---- */
        function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
        function todayStr() {
            var d = new Date();
            return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
        }
        function rankOf(wpm) {
            for (var i = RANKS.length - 1; i >= 0; i--) { if (wpm >= RANKS[i].min) return RANKS[i]; }
            return RANKS[0];
        }
        function poolFor(src, diff) {
            if (src === 'en') return POOLS.en;
            if (diff === 'easy') return POOLS.cn.easy;
            if (diff === 'hard') return POOLS.cn.hard;
            return POOLS.cn.mid;
        }
        function grade(target, typed) {
            var correct = 0, errors = [];
            for (var i = 0; i < Math.min(typed.length, target.length); i++) {
                if (typed[i] === target[i]) { correct++; }
                else if (errors.length < 10) errors.push({ in: typed[i], want: target[i] });
            }
            if (typed.length < target.length && typed.length > 0 && errors.length < 10) {
                errors.push({ in: '（漏打）', want: target.slice(typed.length, typed.length + 1) });
            }
            return { correct: correct, errors: errors };
        }
        function toWpm(correct, minutes) { return Math.round((correct / 5) / minutes); }
        function toAccuracy(correct, totalTyped) { return Math.round(correct / totalTyped * 100); }

        /* ---- DOM 契约（26 个具名元素，含修复的 optRow；模式页签按类名收集） ---- */
        var IDS = ['targetText', 'typeInput', 'startBtn', 'doneBtn', 'resetBtn', 'shareBtn', 'speedVal', 'accVal', 'timeVal', 'leftVal', 'bestLine', 'resultMsg', 'errWrap', 'errList', 'rankBadge', 'rankProgress', 'diffSel', 'srcSel', 'soundChk', 'histChart', 'recordsList', 'dailySentence', 'dailyStatus', 'dailyTag', 'dailyUseBtn', 'optRow'];
        var dom = {}, modeTabs = [];
        function bindDom() {
            for (var i = 0; i < IDS.length; i++) dom[IDS[i]] = document.getElementById(IDS[i]);
        }

        /* ---- 状态机 ---- */
        var state = {
            current: '', currentSrc: '中文名句',
            mode: 'free', diff: 'mid', src: 'cn',
            startTime: 0, running: false, timerId: null,
            limitSec: 60, limitLeft: 60,
            lastResult: null, soundOn: true, badBeeped: false
        };

        /* ---- 音效 ---- */
        function beep(freq, dur, vol) {
            if (!state.soundOn) return;
            try {
                var AC = window.AudioContext || window.webkitAudioContext;
                if (!AC) return;
                if (!beep._ctx) beep._ctx = new AC();
                var ctx = beep._ctx;
                var o = ctx.createOscillator();
                var g = ctx.createGain();
                o.type = 'sine'; o.frequency.value = freq;
                g.gain.setValueAtTime((vol || 0.12), ctx.currentTime);
                g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (dur || 0.05));
                o.connect(g); g.connect(ctx.destination);
                o.start(); o.stop(ctx.currentTime + (dur || 0.05));
            } catch (e) {}
        }
        function playDone() { beep(523, 0.12, 0.15); setTimeout(function () { beep(659, 0.12, 0.15); }, 130); setTimeout(function () { beep(784, 0.2, 0.15); }, 260); }

        /* ---- 视图：等级 ---- */
        function loadBest() {
            var best = XD.storage.get(KEYS.best) || 0;
            var lv = rankOf(best);
            dom.rankBadge.textContent = lv.n;
            dom.rankBadge.style.background = lv.bg;
            var next = null;
            for (var i = 0; i < RANKS.length; i++) { if (RANKS[i].min > best) { next = RANKS[i]; break; } }
            dom.rankProgress.textContent = next ? ('距「' + next.n + '」还需 ' + (next.min - best) + ' 字/分钟') : '已达最高等级 👑';
            dom.bestLine.textContent = best > 0 ? '🏆 历史最佳：' + best + ' 字/分钟' : '暂无最佳成绩，快去创造纪录！';
        }

        /* ---- 视图：句子 ---- */
        function pickSentence() {
            var t;
            if (state.mode === 'long') { t = pick(POOLS.long); state.currentSrc = '长文段落'; }
            else {
                var p = poolFor(state.src, state.diff);
                t = pick(p);
                state.currentSrc = state.src === 'en' ? '英文句子' : ('中文名句·' + (state.diff === 'easy' ? '简单' : state.diff === 'hard' ? '困难' : '中等'));
            }
            state.current = t;
            return t;
        }
        function renderText() {
            var html = '';
            for (var i = 0; i < state.current.length; i++) {
                html += '<span data-i="' + i + '">' + (state.current[i] === ' ' ? '&nbsp;' : state.current[i]) + '</span>';
            }
            dom.targetText.innerHTML = html;
            var sp = dom.targetText.querySelectorAll('span');
            if (sp.length) sp[0].className = 'next';
        }

        /* ---- 视图：每日挑战（按日期哈希选句，避免同日随机漂移） ---- */
        function dailyPick() {
            var seed = todayStr();
            var h = 0;
            for (var i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
            var pool = POOLS.cn.easy.concat(POOLS.cn.mid, POOLS.cn.hard);
            return pool[h % pool.length];
        }
        function renderDaily() {
            var t = dailyPick();
            dom.dailySentence.textContent = t;
            if (XD.storage.get(KEYS.daily) === todayStr()) {
                dom.dailyTag.textContent = '✅ 今日已完成';
                dom.dailyTag.classList.add('daily-done');
                dom.dailyStatus.textContent = '今天的挑战句已完成，明天再来～';
                dom.dailyUseBtn.disabled = true;
            } else {
                dom.dailyTag.textContent = '🔥 今日挑战';
                dom.dailyStatus.textContent = '练完这句（准确率 ≥85%）即完成今日挑战';
                dom.dailyUseBtn.disabled = false;
            }
        }

        /* ---- 流程：新一轮 ---- */
        function newSentence() {
            if (state.timerId) { clearInterval(state.timerId); state.timerId = null; }
            state.running = false;
            state.startTime = 0;
            state.limitLeft = state.limitSec;
            pickSentence();
            renderText();
            dom.typeInput.value = '';
            dom.typeInput.disabled = false;
            dom.resultMsg.textContent = '';
            dom.resultMsg.className = '';
            dom.errWrap.classList.remove('show');
            dom.errList.innerHTML = '';
            dom.shareBtn.disabled = true;
            state.lastResult = null;
            dom.timeVal.textContent = '0s';
            dom.speedVal.textContent = '0';
            dom.accVal.textContent = '0%';
            dom.leftVal.textContent = state.mode === 'time' ? state.limitLeft + 's' : '—';
            dom.startBtn.textContent = '▶ 开始';
            dom.startBtn.disabled = false;
            dom.doneBtn.disabled = true;
            dom.typeInput.placeholder = '点击「开始」后在这里打字';
        }

        /* ---- 流程：开始 / 暂停 ---- */
        function startRun() {
            if (state.running) {
                state.running = false;
                if (state.timerId) { clearInterval(state.timerId); state.timerId = null; }
                dom.startBtn.textContent = '▶ 继续';
                return;
            }
            state.running = true;
            if (!state.startTime) state.startTime = Date.now();
            dom.typeInput.placeholder = '开始打字吧，完成后按回车或点「完成」';
            dom.startBtn.textContent = '⏸ 暂停';
            dom.doneBtn.disabled = false;
            dom.typeInput.focus();
            if (state.mode === 'time') {
                state.limitLeft = state.limitSec;
                dom.leftVal.textContent = state.limitLeft + 's';
                if (state.timerId) clearInterval(state.timerId);
                state.timerId = setInterval(function () {
                    state.limitLeft--;
                    dom.leftVal.textContent = state.limitLeft + 's';
                    if (state.limitLeft <= 0) finish();
                }, 1000);
            } else {
                if (state.timerId) clearInterval(state.timerId);
                state.timerId = setInterval(function () {
                    dom.timeVal.textContent = Math.floor((Date.now() - state.startTime) / 1000) + 's';
                }, 500);
            }
        }

        /* ---- 流程：实时判定 ---- */
        function updateInput() {
            if (!state.running) return;
            var v = dom.typeInput.value;
            var spans = dom.targetText.querySelectorAll('span');
            var allOk = true;
            for (var i = 0; i < spans.length; i++) {
                spans[i].className = '';
                if (i < v.length) {
                    if (v[i] === state.current[i]) { spans[i].className = 'ok'; }
                    else { spans[i].className = 'bad'; allOk = false; if (!state.badBeeped) { beep(330, 0.05, 0.08); state.badBeeped = true; } }
                }
            }
            if (v.length > 0 && v[v.length - 1] === state.current[v.length - 1]) beep(660, 0.03, 0.06);
            state.badBeeped = v.length > 0 && v[v.length - 1] !== state.current[v.length - 1];
            if (v.length < spans.length) spans[v.length].className = 'next';
            if (allOk && v.length >= spans.length) finish();
        }

        /* ---- 流程：结算 ---- */
        function finish() {
            if (!state.running && !state.startTime) return;
            if (state.timerId) { clearInterval(state.timerId); state.timerId = null; }
            state.running = false;
            var v = dom.typeInput.value;
            var secs = Math.max((Date.now() - state.startTime) / 1000, 0.1);
            var minutes = Math.max(secs / 60, 0.001);
            var r = grade(state.current, v);
            var totalTyped = Math.max(v.length, 1);
            var acc = toAccuracy(r.correct, totalTyped);
            var wpm = toWpm(r.correct, minutes);
            dom.timeVal.textContent = Math.round(secs) + 's';
            dom.accVal.textContent = acc + '%';
            dom.speedVal.textContent = wpm;
            dom.leftVal.textContent = state.mode === 'time' ? '0s' : '—';
            dom.doneBtn.disabled = true;
            dom.startBtn.textContent = '▶ 开始';
            dom.resultMsg.className = acc >= 85 ? 'good' : '';
            dom.resultMsg.textContent = '本次速度 ' + wpm + ' 字/分钟，准确率 ' + acc + '%' + (acc >= 85 ? ' 🎉' : '，继续加油！');
            if (acc >= 85) {
                var best = XD.storage.get(KEYS.best) || 0;
                if (wpm > best) { XD.storage.set(KEYS.best, wpm); loadBest(); dom.resultMsg.textContent += ' 刷新最佳成绩！🏆'; }
                if (window.XD && XD.achieve) {
                    if (wpm >= 80) XD.achieve.unlock('typing_80');
                    if (wpm >= 40) XD.achieve.unlock('typing_40');
                }
                if (window.XD && XD.studyLog) XD.studyLog.add({ type: 'practice', itemId: 'D4', mod: 'D' });
            }
            var recs = XD.storage.get(KEYS.rec) || [];
            recs.unshift({ w: wpm, a: acc, s: Math.round(secs), d: todayStr(), m: state.mode, src: state.currentSrc });
            XD.storage.set(KEYS.rec, recs.slice(0, 20));
            renderRecords(); drawChart();
            dom.errList.innerHTML = '';
            if (r.errors.length) {
                for (var k = 0; k < r.errors.length; k++) {
                    var d = document.createElement('span');
                    d.className = 'err-item';
                    d.innerHTML = '输「' + r.errors[k].in + '」应为 <b>「' + r.errors[k].want + '」</b>';
                    dom.errList.appendChild(d);
                }
                dom.errWrap.classList.add('show');
            }
            if (state.mode === 'free' && state.current === dailyPick() && acc >= 85 && XD.storage.get(KEYS.daily) !== todayStr()) {
                XD.storage.set(KEYS.daily, todayStr());
                renderDaily();
                dom.resultMsg.textContent += ' ✅ 今日挑战完成！';
            }
            state.lastResult = { wpm: wpm, acc: acc, secs: Math.round(secs), mode: state.mode };
            dom.shareBtn.disabled = false;
            playDone();
        }

        /* ---- 视图：历史记录与折线图 ---- */
        function renderRecords() {
            var recs = XD.storage.get(KEYS.rec) || [];
            dom.recordsList.innerHTML = '';
            if (!recs.length) { dom.recordsList.textContent = '还没有历史记录，快去测一次吧～'; return; }
            recs.slice(0, 10).forEach(function (r) {
                var d = document.createElement('div');
                d.textContent = r.d + ' ｜ ' + r.w + ' 字/分钟 ｜ 准确率 ' + r.a + '% ｜ ' + r.s + 's ｜ ' + (r.m === 'time' ? '限时' : r.m === 'long' ? '长文' : '自由') + ' ｜ ' + (r.src || '');
                dom.recordsList.appendChild(d);
            });
        }
        function drawChart() {
            var c = dom.histChart;
            var ctx = c.getContext('2d');
            // 无 Canvas 环境（少数内嵌浏览器）只跳过绘图，历史数据本身不受影响
            if (!ctx) { if (c.parentNode) c.parentNode.style.display = 'none'; return; }
            var W = c.width, H = c.height;
            ctx.clearRect(0, 0, W, H);
            var recs = XD.storage.get(KEYS.rec) || [];
            if (!recs.length) {
                ctx.fillStyle = C_DIM;
                ctx.font = '14px "Microsoft YaHei"';
                ctx.textAlign = 'center';
                ctx.fillText('暂无数据，测一次就会出现在这里', W / 2, H / 2);
                return;
            }
            var data = recs.slice(0, 20).reverse().map(function (r) { return r.w; });
            var max = Math.max.apply(null, data.concat([20]));
            var n = data.length;
            ctx.strokeStyle = 'rgba(102,126,234,.15)';
            ctx.lineWidth = 1;
            for (var g = 0; g <= 4; g++) {
                var gy = H - (g / 4) * (H - 30) - 15;
                ctx.beginPath(); ctx.moveTo(30, gy); ctx.lineTo(W - 10, gy); ctx.stroke();
                ctx.fillStyle = C_DIM; ctx.font = '10px "Microsoft YaHei"'; ctx.textAlign = 'left';
                ctx.fillText(String(Math.round(max * g / 4)), 4, gy + 3);
            }
            ctx.strokeStyle = C_BLUE;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            for (var i = 0; i < n; i++) {
                var x = 30 + (W - 50) * (n === 1 ? 0.5 : i / (n - 1));
                var y = H - (data[i] / max) * (H - 40) - 15;
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();
            for (var j = 0; j < n; j++) {
                var x2 = 30 + (W - 50) * (n === 1 ? 0.5 : j / (n - 1));
                var y2 = H - (data[j] / max) * (H - 40) - 15;
                ctx.beginPath();
                ctx.arc(x2, y2, 3.5, 0, Math.PI * 2);
                ctx.fillStyle = C_PURPLE;
                ctx.fill();
            }
        }

        /* ---- 视图：分享成绩卡 ---- */
        function shareCard() {
            if (!state.lastResult) return;
            var lv = rankOf(state.lastResult.wpm);
            var c = document.createElement('canvas');
            c.width = 640; c.height = 360;
            var ctx = c.getContext('2d');
            // 无 Canvas 环境生成不了图片卡，降级为只复制成绩文案
            var txt = '我在「现代化·知识学习站」打字测试打出 ' + state.lastResult.wpm + ' 字/分钟（准确率 ' + state.lastResult.acc + '%），等级 ' + lv.n + '，快来挑战我！';
            if (!ctx) {
                if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).catch(function () { copyFallback(txt); });
                else copyFallback(txt);
                dom.resultMsg.textContent = '成绩文案已复制 📋（当前环境不支持生成图片卡）';
                return;
            }
            var g = ctx.createLinearGradient(0, 0, 640, 360);
            g.addColorStop(0, C_BLUE); g.addColorStop(0.5, C_PURPLE); g.addColorStop(1, cssVar('--red', '#f093fb'));
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, 640, 360);
            ctx.fillStyle = 'rgba(255,255,255,.12)';
            ctx.beginPath(); ctx.arc(560, 60, 120, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(80, 320, 90, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 30px "Microsoft YaHei"';
            ctx.textAlign = 'center';
            ctx.fillText('⌨️ 现代化·知识学习站 · 打字测试', 320, 56);
            ctx.font = 'bold 88px "Segoe UI"';
            ctx.fillText(String(state.lastResult.wpm), 320, 190);
            ctx.font = '24px "Microsoft YaHei"';
            ctx.fillText('字/分钟', 320, 226);
            ctx.font = '22px "Microsoft YaHei"';
            ctx.fillText('准确率 ' + state.lastResult.acc + '% ｜ 用时 ' + state.lastResult.secs + 's ｜ 等级 ' + lv.n, 320, 276);
            ctx.fillText(todayStr() + ' · bishihuihuang.github.io/xiandaihua', 320, 316);
            var url = c.toDataURL('image/png');
            var w = window.open('');
            if (w) {
                var img = w.document.createElement('img');
                img.style.maxWidth = '100%';
                img.setAttribute('src', url);
                w.document.body.appendChild(img);
            }
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(txt).catch(function () { copyFallback(txt); });
            } else { copyFallback(txt); }
            dom.resultMsg.textContent = '成绩卡已生成（新窗口），文案已复制 📋';
        }
        function copyFallback(txt) {
            var ta = document.createElement('textarea');
            ta.value = txt; document.body.appendChild(ta); ta.select();
            try { document.execCommand('copy'); } catch (e2) {}
            document.body.removeChild(ta);
        }

        /* ---- 事件绑定 ---- */
        function bindEvents() {
            for (var i = 0; i < modeTabs.length; i++) {
                (function (t) {
                    t.addEventListener('click', function () {
                        for (var j = 0; j < modeTabs.length; j++) modeTabs[j].classList.remove('active');
                        t.classList.add('active');
                        state.mode = t.getAttribute('data-mode');
                        dom.optRow.style.display = state.mode === 'long' ? 'none' : '';
                        newSentence();
                    });
                })(modeTabs[i]);
            }
            dom.diffSel.addEventListener('change', function () { state.diff = dom.diffSel.value; newSentence(); });
            dom.srcSel.addEventListener('change', function () { state.src = dom.srcSel.value; newSentence(); });
            dom.soundChk.addEventListener('change', function () { state.soundOn = dom.soundChk.checked; XD.storage.set(KEYS.sound, state.soundOn ? '1' : '0'); });
            dom.startBtn.addEventListener('click', startRun);
            dom.doneBtn.addEventListener('click', finish);
            dom.typeInput.addEventListener('input', updateInput);
            dom.typeInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); finish(); } });
            dom.resetBtn.addEventListener('click', newSentence);
            dom.shareBtn.addEventListener('click', shareCard);
            dom.dailyUseBtn.addEventListener('click', function () {
                state.mode = 'free';
                for (var j = 0; j < modeTabs.length; j++) modeTabs[j].classList.remove('active');
                document.querySelector('.mode-tab[data-mode="free"]').classList.add('active');
                dom.optRow.style.display = '';
                if (state.timerId) { clearInterval(state.timerId); state.timerId = null; }
                state.running = false;
                state.startTime = 0;
                state.current = dailyPick();
                state.currentSrc = '今日挑战';
                renderText();
                dom.typeInput.value = '';
                dom.typeInput.disabled = false;
                dom.resultMsg.textContent = '';
                dom.resultMsg.className = '';
                dom.errWrap.classList.remove('show');
                dom.errList.innerHTML = '';
                dom.shareBtn.disabled = true;
                dom.timeVal.textContent = '0s'; dom.speedVal.textContent = '0'; dom.accVal.textContent = '0%';
                dom.leftVal.textContent = '—';
                dom.startBtn.textContent = '▶ 开始';
                dom.startBtn.disabled = false;
                dom.doneBtn.disabled = true;
                dom.typeInput.placeholder = '点击「开始」后在这里打字';
            });
        }

        /* ---- 对外接口（D4.html 于 DOMContentLoaded 调用；仅本页存在 #targetText 才启动） ---- */
        XD.D4 = {
            init: function () {
                if (!document.getElementById('targetText')) return;
                bindDom();
                modeTabs = document.querySelectorAll('.mode-tab');
                var snd = XD.storage.get(KEYS.sound);
                state.soundOn = snd === null ? true : snd === '1';
                dom.soundChk.checked = state.soundOn;
                loadBest();
                renderDaily();
                newSentence();
                renderRecords();
                drawChart();
                bindEvents();
            }
        };
    })();

    /* ========== 页面初始化（面包屑 + 前后页 + 进度 + 代码复制） ========== */
    /* 职责拆分为五个小函数：逐个守卫、互不牵连，任何一项失败都不影响其它项 */

    function injectToTop() {
        if (document.querySelector('.to-top')) return;
        var topBtn = document.createElement('button');
        topBtn.className = 'to-top';
        topBtn.type = 'button';
        topBtn.setAttribute('aria-label', '回到顶部');
        topBtn.textContent = '↑';
        document.body.appendChild(topBtn);
        topBtn.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
        var onScroll = function () {
            var y = window.pageYOffset || document.documentElement.scrollTop || 0;
            topBtn.classList.toggle('show', y > 320);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    }

    function initRevealFx() {
        var els = document.querySelectorAll('.reveal');
        if (!els.length) return;
        if ('IntersectionObserver' in window) {
            var obs = new IntersectionObserver(function (es) {
                for (var i = 0; i < es.length; i++) {
                    if (es[i].isIntersecting) { es[i].target.classList.add('in'); obs.unobserve(es[i].target); }
                }
            }, { threshold: 0.12 });
            for (var j = 0; j < els.length; j++) obs.observe(els[j]);
        } else {
            for (var k = 0; k < els.length; k++) els[k].classList.add('in');
        }
    }

    function maybeRunGuide() {
        if (!XD.guide) return;
        var pf = document.body.getAttribute('data-page');
        var hp0 = location.pathname || '';
        var last0 = hp0.split('/').pop();
        if ((!pf || pf === 'index.html') && (!last0 || last0 === '' || last0 === 'index.html')) XD.guide.maybe();
    }

    function currentPage() {
        var f = document.body.getAttribute('data-page');
        var kind = document.body.getAttribute('data-kind') || 'doc';
        return { f: f, kind: kind };
    }

    function injectPageActions(page) {
        // 适老操作条：朗读 / 收藏 / 打印（门户页除外，全站 JS 注入）
        if (!page.f || page.f === 'index.html' || page.f === '1.html') return;
        var hdr = document.querySelector('.site-header');
        var badge = hdr ? hdr.querySelector('.mod-badge') : null;
        if (!badge) return;
        var canSpeak = page.kind === 'doc' && ('speechSynthesis' in window);
        var ah = '<span class="page-actions">';
        if (canSpeak) ah += '<button type="button" class="page-act" data-act="speak" title="朗读本页">🔊</button>';
        ah += '<button type="button" class="page-act" data-act="fav" title="收藏本页"><span class="fav-ic">' + (XD.fav.has(page.f) ? '★' : '☆') + '</span></button>';
        ah += '<button type="button" class="page-act" data-act="print" title="打印本页">🖨</button></span>';
        badge.insertAdjacentHTML('afterend', ah);
        var abar = hdr.querySelector('.page-actions');
        if (abar) abar.addEventListener('click', function (e) {
            var b = e.target.closest('.page-act');
            if (!b) return;
            var act = b.getAttribute('data-act');
            if (act === 'print') { window.print(); }
            else if (act === 'fav') {
                var on = XD.fav.toggle(page.f);
                var ic = b.querySelector('.fav-ic');
                if (ic) ic.textContent = on ? '★' : '☆';
                XD.showToast(on ? '⭐ 已收藏，可在仪表盘「我的收藏」里找到' : '已取消收藏');
            }
            else if (act === 'speak') { XD.speak.toggle(); }
        });
    }

    function recordVisit(page) {
        // 内容页/测验/工具：记进度 + 学习日志 + 成就复核（目录页只读不记）
        if (page.f && page.kind !== 'dir') {
            XD.progress.markRead(page.f);
            var id = page.f.replace(/\.html$/, '');
            var top = id.charAt(0).toUpperCase();
            if (XD.modIds.indexOf(top) >= 0) XD.studyLog.add({ type: page.kind === 'quiz' ? 'quiz' : page.kind === 'tool' ? 'practice' : 'read', itemId: id, mod: top });
            XD.achieve.checkProgress(XD.progress.all());
        }
    }

    function attachCopyButtons() {
        var blocks = document.querySelectorAll('.code-block');
        for (var i = 0; i < blocks.length; i++) {
            (function (b) {
                if (b.querySelector('.copy-btn')) return;
                var btn = document.createElement('button');
                btn.className = 'copy-btn';
                btn.textContent = '复制';
                btn.onclick = function () { XD.copy(b.innerText.replace(/^复制\n?/, '')); };
                b.appendChild(btn);
            })(blocks[i]);
        }
    }

    function pageInit() {
        XD.renderCrumbs();
        XD.renderPrevNext();
        injectToTop();
        initRevealFx();
        maybeRunGuide();
        var page = currentPage();
        injectPageActions(page);
        if (XD.eyeCare) XD.eyeCare.start();
        recordVisit(page);
        attachCopyButtons();
    }
    if (document.body && document.readyState !== 'loading') {
        pageInit();
    } else {
        document.addEventListener('DOMContentLoaded', pageInit);
    }
})();
