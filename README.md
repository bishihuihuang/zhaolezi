# 找乐子（Zhaolezi）— 静态多页面 PWA

个人工具箱型静态站点：48 个页面（工具/游戏/学习），零第三方依赖，
Service Worker 离线可用，GitHub Pages 部署。

## 目录结构

```
zhaolezi/
├── _原始未混淆版/        构建输入（唯一手改区，README 见其内部）
├── *.html                构建产物（混淆后，勿手改）
├── theme.js / common.js / zl-features.js   公共层（根目录维护，构建时同步）
├── service-worker.js     离线缓存（构建自动升版，勿手改版本号）
├── _混淆工具.js          构建管道：混淆 + PWA 注入 + preCheck + 断言 + sitemap + 冒烟 + SW 升版
├── _冒烟自检.js          全量冒烟测试（构建自动执行；可单独跑）
├── manifest.json / sitemap.xml / robots.txt
└── 17-data.js            词典数据（构建自动同步）
```

## 命令

```bash
node _混淆工具.js                  # 全量构建（含断言/冒烟/SW 自动升版）
node _混淆工具.js 1.html 5.html    # 只构建指定文件
node _混淆工具.js --check          # 仅 preCheck（硬编码灰阶色扫描）
node _冒烟自检.js                  # 全量冒烟：模拟浏览器逐页执行内联脚本
```

## 维护规范（务必遵守）

1. **只改 `_原始未混淆版/` 源码 + 根目录 `theme.js`/`common.js`/`zl-features.js`/`_混淆工具.js`**。
   绝不手改根目录混淆产物——改完源码后跑构建，产物自动同步。
2. **构建即发布**：构建会自动 `service-worker.js` 缓存升版，用户拿到的永远是
   最新公共层（防"改了文件但旧缓存不失效"）。
3. **冒烟自检**：构建末尾自动跑 48 页加载期崩溃检测，失败置 exit 1 并提示。
   新增/修改页面后构建必须 exit 0。
4. 新增页面：改 `zl-features.js` 的 `ZL.PAGES`（sitemap 单一来源），构建自动生成 sitemap.xml。
5. 页面内部引用公共 `ZL` 能力（事件总线 `ZL.emit/ZL.on`、`ZL.unlock`、`ZL.showToast` 等）
   必须防御式判断 `window.ZL && ZL.xxx`（公共脚本 defer 加载，内联代码先于其执行）。
6. localStorage 键统一 `zl_` 前缀；跨页共享数据（如错题 `zl_err_items_v1`）只由拥有方写入，
   消费方（44 仪表盘等）只读 + 订阅事件刷新，不复制数据。
7. 主题系统三方对齐（THEMES/LABELS/CSS 块）由构建断言守护；新增主题需三处同步。

## 测试资产

| 工具 | 位置 | 作用 |
|---|---|---|
| `_冒烟自检.js` | 根目录 | 48 页内联脚本执行级崩溃检测（构建自动跑） |
| `_check_syntax.js` | 见工作日志 | 提取 `<script>` 块做 JS 语法检查 |
| `_m4_logic_test.js` | 见工作日志 | 跨页打通核心算法单测（SM-2/到期/反推/事件） |

## 里程碑

- M1：P0-1~7 安全加固（XSS/重定向/词典/IndexedDB 迁移基础）
- M2：P0-8 错题本照片迁移 IndexedDB
- M3：P1 全 13 项（娱乐页真实作答/主题对齐/sitemap/公共层）
- M4：P2 跨页打通（事件总线 + 43 真实复习 + 44 真实聚合/待复习卡 + 45 错题反推 + 全量冒烟 + 15/22 崩溃修复）
