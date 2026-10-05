/* ============================================================
 * V2.0 四模块逻辑回归测试（零依赖，node _v2_logic_test.js）
 * 覆盖：学习数据层 / 版本迁移 / 源码埋点断言 / 主题 Token
 * 配合 _冒烟自检.js（页面加载期崩溃）+ _theme_audit.js（硬编码色）
 * ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = __dirname;
const SRC = path.join(ROOT, '_原始未混淆版');
let pass = 0, fail = 0;
function T(name, ok, extra) {
    if (ok) { pass++; console.log('PASS  ' + name); }
    else { fail++; console.log('FAIL  ' + name + (extra ? '  → ' + extra : '')); }
}

/* ---------- 工具：vm 环境加载公共层 ---------- */
function loadCommon() {
    const store = {};
    const sandbox = {
        window: {},
        location: { pathname: '/test.html', protocol: 'file:' },
        addEventListener: function () {},
        document: {
            addEventListener: function () {},
            querySelector: function () { return null; },
            querySelectorAll: function () { return []; },
            documentElement: { setAttribute: function () {}, getAttribute: function () { return 'dark'; } },
            body: { appendChild: function () {}, setAttribute: function () {}, addEventListener: function () {} },
            createElement: function () { return { style: {}, classList: { add: function () {}, remove: function () {} }, setAttribute: function () {}, appendChild: function () {}, addEventListener: function () {} }; },
            getElementById: function () { return null; }
        },
        localStorage: {
            getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
            setItem: function (k, v) { store[k] = String(v); },
            removeItem: function (k) { delete store[k]; }
        },
        navigator: { userAgent: 'test' },
        BroadcastChannel: function () { this.postMessage = function () {}; },
        Date: Date, JSON: JSON, String: String, Array: Array, Object: Object, Math: Math, setTimeout: function () {}, clearTimeout: function () {}
    };
    sandbox.window = sandbox;
    vm.createContext(sandbox);
    const code = fs.readFileSync(path.join(ROOT, 'zl-features.js'), 'utf8');
    vm.runInContext(code, sandbox, { filename: 'zl-features.js', timeout: 3000 });
    return { store, ZL: sandbox.ZL };
}

/* ---------- 1. 公共层加载 + 事件总线 ---------- */
const ctx = loadCommon();
T('公共层可加载，ZL.emit/ZL.on 存在', !!(ctx.ZL && ctx.ZL.emit && ctx.ZL.on), ctx.ZL ? 'ZL 存在' : 'ZL 缺失');
T('showToast 已走 .zl-toast 类（变量化）', /zl-toast/.test(fs.readFileSync(path.join(ROOT, 'zl-features.js'), 'utf8')));

/* ---------- 2. 学习数据层 zl_study_log_v1 ---------- */
ctx.ZL.studyLog.add({ type: 'review', itemId: 'e1', subject: '数学', kp: '二次函数', at: Date.now() });
ctx.ZL.studyLog.add({ type: 'mastered', itemId: 'e2', subject: '语文', kp: '', at: Date.now() });
T('studyLog.add 写入存储', ctx.store['zl_study_log_v1'] && JSON.parse(ctx.store['zl_study_log_v1']).length === 2);
T('studyLog.recent(1) 取最近 1 条', ctx.ZL.studyLog.recent(1).length === 1 && ctx.ZL.studyLog.recent(1)[0].itemId === 'e2');
T('studyLog.todayCount=2（今天有 2 条）', ctx.ZL.studyLog.todayCount() === 2);
T('studyLog.streakDays=1（只有今天有记录）', ctx.ZL.studyLog.streakDays() === 1);
ctx.ZL.studyLog.add({ type: 'add', itemId: 'e3', at: Date.now() - 86400000 * 2 });
T('streakDays 断更回退为 1（前天记录不连今天）', ctx.ZL.studyLog.streakDays() === 1);

/* ---------- 3. 版本与迁移框架 ---------- */
T('dataMigration 推进数据版本到 2.0.0', (() => { try { return JSON.parse(ctx.store['zl_app_version']).ver === '2.0.0'; } catch (e) { return false; } })());
const before = ctx.store['zl_app_version'];
ctx.ZL.dataMigration('dup', '2.0.0', function () { ctx.ZL._migratedTwice = true; });
T('dataMigration 幂等（同版本跳过不重复执行）', ctx.ZL._migratedTwice !== true);
T('whatsNew 有未读版本条目', ctx.ZL.whatsNew().length >= 1);
ctx.ZL.markVersionSeen();
T('markVersionSeen 后 whatsNew 清空', ctx.ZL.whatsNew().length === 0);
T('APP_VER=2.0.0', ctx.ZL.APP_VER === '2.0.0');

/* ---------- 4. 源码埋点断言（四模块落地点） ---------- */
const src43 = fs.readFileSync(path.join(SRC, '43.html'), 'utf8');
const src44 = fs.readFileSync(path.join(SRC, '44.html'), 'utf8');
const src41 = fs.readFileSync(path.join(SRC, '41.html'), 'utf8');
const src30 = fs.readFileSync(path.join(SRC, '30.html'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'common.css'), 'utf8');

const count43 = (src43.match(/ZL\.studyLog\.add/g) || []).length;
T('43 学习埋点 4 处（add/edit/del/review/mastered）', count43 >= 4, '实际 ' + count43);
T('43 知识点胶囊用 --zl-accent', /--zl-accent/.test(src43));
T('43 科目表含「其他」', /name: '其他'/.test(src43));
T('44 学习动态 feed 渲染', /renderStudyFeed/.test(src44));
T('44 订阅 study.recorded', /ZL\.on\('study\.recorded'/.test(src44));
T('44 双卡（连续天数/今日学习）', /rv-streak/.test(src44) && /rv-today/.test(src44));
T('41 一键转错题函数', /function toErrBook/.test(src41) && /被转错题本/.test(src41) === false);
T('41 写 zl_err_items_v1', /zl_err_items_v1/.test(src41));
T('30 更新提醒（whatsNew + 公告 V2.0.0）', /createWhatsNew/.test(src30) && /V2\.0\.0：四模块升级/.test(src30));

/* ---------- 5. 主题 Token 层断言 ---------- */
const TOKENS = ['--zl-bg', '--zl-card', '--zl-card-2', '--zl-text', '--zl-muted', '--zl-border', '--zl-accent', '--zl-accent-2', '--zl-accent-grad', '--zl-ok', '--zl-danger', '--zl-link', '--zl-glow', '--zl-radius', '--zl-shadow', '--zl-btn-text'];
let missTok = [];
for (const t of TOKENS) if (css.indexOf(t + ':') < 0) missTok.push(t);
T('主题 Token 别名层完整（' + TOKENS.length + ' 个）', missTok.length === 0, '缺失: ' + missTok.join(','));
T('Token 引用真实（var(--bg)/var(--gold) 等源变量存在）', css.indexOf('--zl-bg: var(--bg);') >= 0 && css.indexOf('--zl-accent: var(--gold);') >= 0);
T('.zl-toast 类存在', /\.zl-toast/.test(css));

/* ---------- 6. 审计脚本可运行 ---------- */
try {
    const audit = require(path.join(ROOT, '_theme_audit.js'));
    T('_theme_audit.js 可运行，页数=48', audit.rows.length === 48, '实际 ' + audit.rows.length);
} catch (e) { T('_theme_audit.js 可运行', false, e.message); }

/* ---------- 汇总 ---------- */
console.log('\n========== V2 逻辑测试：通过 ' + pass + ' / ' + (pass + fail) + ' ==========');
process.exit(fail ? 1 : 0);