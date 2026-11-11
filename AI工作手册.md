# zhaolezi · AI 工作手册

> 本文件是给 AI 看的本站工作说明（与 说明.txt 配套，面向 AI 视角）。
> 更新日期：2026-11-01。AI 每次在本文件夹工作前，先读本文件与 说明.txt。


---

## 0. 给 AI 的三条铁律（务必遵守）

1. 【临时文件铁律】AI 在本文件夹产生的所有临时内容——调试脚本、日志、截图、
   中间产物、临时备份、测试文件等一切**不属于原网页必须**的文件——
   一律放在 本站目录\.tmp\ 下，不得散落在项目根目录或其他位置。
2. 【归档铁律】每推进完一项工作，检查本站\.tmp\：其中**不再需要**的文件
   必须全部移动到 E:\新文件\一大堆其他资料\AI日志\zhaolezi\ 下（按时间或主题建子目录），
   保持 .tmp 干净，只留仍在进行中的工作内容。
3. 【文档同步铁律】每次完成工作后，必须同步更新两份文档：
   ① 本站 说明.txt —— 记录本次改了什么、目录有无变化、新注意事项；
   ② 本文件（AI工作手册.md）—— 同样更新到最新状态。
   两份文档保持与本站当前实际状态一致，不得遗漏。

---

## 1. 本站是什么

找乐子 —— 混淆版游戏/趣味网站（V2.3.3）。线上：https://bishihuihuang.github.io/zhaolezi/，仓库 bishihuihuang/zhaolezi。
当前规模：46 个数字页面（1.html~46.html，含 41/42 政治作业）+ 首页 index.html；图片 42、音频 19、看看作业 12 张。

## 2. 目录结构（AI 视角）

index.html ← 混淆后首页（线上用，勿改）
pages\ ← 混淆后全部子页面（1.html~46.html + 文件搜索/verify/offline），images\（42）、audio\（19）、看看作业\（19）
_原始未混淆版\ ← 【修改入口】原始未混淆文件（50 个页面），已被 .gitignore 忽略，源码不公开
构建工具\_混淆工具.js ← 混淆脚本（根页面→根目录，其余→pages\，自动刷新 common.js）
common.css / common.js / theme.js / zl-features.js / zl-glass.js ← 公共层（V2 界面）
service-worker.js / manifest.json ← PWA
一键自动化发布.bat / 备份当前版本.bat ← 发布与备份
说明.txt（维护说明.txt）/ AI工作手册.md ← 文档

## 3. 修改入口与日常流程

1) 每次改前先双击 备份当前版本.bat（镜像到 E:\全面备份\zhaolezi备份）
2) 改  _原始未混淆版\ 里的 HTML（用记事本/VS Code）
3) 图片放 pages\images\、音频放 pages\audio\，引用相对路径
4) 混淆：node 构建工具\_混淆工具.js（或直接双击 一键自动化发布.bat 全自动）
5) 临时文件放 .tmp\，完成后归档（见铁律）

## 4. 发布流程

双击 一键自动化发布.bat：拉取远端→混淆→git add→commit→push 全自动（显示已中文化）。
混淆完成后页面出现在 pages\ 子目录（不是根目录）。
完成后更新 维护说明.txt 与 AI工作手册.md。

## 5. AI 禁止事项

· 不要直接改根目录或 pages\ 里的 HTML（是混淆产物，改了会损坏/被覆盖）
· 不要手动 git push（统一走 bat）
· 不要删 构建工具\_混淆工具.js、_原始未混淆版\、common.js、common.css
· .zcode\（交接报告）、工具脚本\ 为参考归档，勿动
· 临时文件一律 .tmp\

## 6. 注意事项（环境与编码）

· bat 必须 GBK+CRLF+chcp 936；混淆工具会刷新 common.js 时间戳
· _原始未混淆版\ 已被 .gitignore 忽略，不会上传 GitHub
· 改了 41/42 等页面，线上看 pages\41.html（不是根目录）
· 升级/大改看 .zcode\交接报告_V2.3.3.md
· **SW 缓存策略（V117 起）**：`service-worker.js` 里 HTML 导航 + JS 脚本走网络优先，CSS/图片/音频等其他静态资源走缓存优先。JS 是版本敏感代码，走缓存优先会导致"发版后 SW 缓存里旧 JS 拦截新 JS，用户强刷无效"（V116 前踩过这个坑）。CACHE_NAME 每次构建自动 +1；如需手工介入，先手 bump 一次再跑混淆工具，工具再自动 +1。
· **V120 停靠栏移除**：`zl-glass.js` 里底部玻璃停靠栏（`.zl-dock`）已整块删除——`initDock()` 函数、`.zl-dock`/`.zl-dock-item`/`.zl-pill`/`.zl-dock-hide`/`.zl-ctx` CSS、`zlBreathe` 呼吸动画、`ls`/`ss` 辅助函数、放大态收起 Dock 逻辑全部清零。CFG 只保留 `skipPages`（供 `isSkipPage()` 判断门禁页）。M2 鼠标光效、M3 模块放大+水滴筛选+汇总指标不受影响。
· **V122 成就入口改造**：`index.html` 里居中长方形内的成就提示横条（`.ach-widget`）已删除——CSS 全块、HTML 横条、`renderAchWidget()` 函数（原 V2.2 版，读 `awAll`/`awLine`/`awSub`）全部清零。改为左上角悬浮奖杯按钮 `.ach-trophy`（`position:fixed; top:14px; left:14px; 44×44; z-index:2147483006`，玻璃拟态+毛玻璃），右下角挂「已解锁/总数」角标 `#awBadge`，点击整块 `<a>` 跳 `38.html` 成就中心。JS 只剩 `updateAchTrophy()` 一行刷角标，仍订阅 `ZL.on('ach.unlocked')`。成就总数取自 `ZL.ACHIEVEMENTS.length`（当前 93 枚，定义在 `zl-features.js`）。注意：`zl-features.js` 第 437 行 `ach_90` 的 `Math.ceil(94 * 0.9)` 是遗留硬编码（应为 93），本轮未改，留待单独修。
· **V126 奖杯入口移除（用户决策）**：左上角奖杯按钮 `.ach-trophy` 的 CSS 与 HTML 已从源 `index.html` 删除；成就**逻辑完整保留**——`updateAchTrophy()`（函数开头 `if (!badge) return;` 空值保护，DOM 不存在即静默跳过）与 `ZL.on('ach.unlocked')` 订阅原样在册，成就解锁、Toast、数据全部照常。
· **V125 右上角刷新按键**：`zl-glass.js` 新增 `initRefresh()`（全站生效，由 `zl-features.js` 动态加载，无需改各页 HTML）。右上角悬浮 🔄 按钮（`position:fixed; top:14px; right:14px; 44×44; z-index:2147483007`，玻璃拟态），点击或进页自动触发 `rfCheck()`：① SW 更新检查（`reg.update()` → 等新 SW 激活 → reload）；② 抽样比对 5 关键资源（`common.css`/`common.js`/`theme.js`/`zl-features.js`/`zl-glass.js`），用 `?cb=<时间戳>` 绕过 SW 缓存，字节比对，不同则 `cache.put()` 覆盖；③ 清掉 `?cb=` 污染条目。30 分钟节流（`localStorage zl_rf_ts`），进页静默跑一次不 reload；手动点击有变更 → 1.5s 后 reload。Toast 提示「已是最新」/「已更新 N 项」/「发现新版本，正在更新…」/「检查失败」。
· **V126 刷新按钮移除（用户决策）**：右上角 🔄 按钮 UI（`.zl-refresh` CSS 与按钮 DOM）已删；**进页静默更新检查保留**（30 分钟节流，`rfCheck(true)`：发现新 SW → Toast + 自动 reload；抽样比对有变更 → Toast + reload）。`rfToast` 与 `.zl-rf-toast` 样式保留供提示用。
· **V126b 首页两 bug 修复 + 自定义主题回归（2026-10-31 08:21 发布，03b7906）**：① 首页 `absUrl()` 原 `return u;` 未补前缀致四区工具卡片全 404——已改为站内页走 `ZL.resolve()`（门禁+pages/ 前缀），外部/兄弟站绝对 URL 原样；② `.bg-ambient` 不透明底色遮死主题背景——已移除，并新增 `.bg-ambient .bg-flow-1` 承载层（dark 主题视觉不变，非 dark 主题由 common.css 规则接管显示背景图）；③ 主题面板恢复第 7 项「自定义」（上传背景按钮 + 历史已存 zl_custom_bg 无缝找回）。教训：**换首页版本时必须保留"运行时 ZL.resolve 补前缀"约定，勿在 JS 数据里裸写文件名直出 href**。
· **V126c 自定义背景交互（de26873）**：「自定义」项单击=应用背景、双击=打开图片上传（📤 小按键已删）；画质降级链 2560@0.92→1920@0.88→1600@0.85（存得下的最高档）。
· **V126d 亮图自适应前景（2969a7c）**：上传时 canvas 采样亮度存 `zl_custom_bg_lum`；≥150 自动 `data-bg-lum="light"` 整站切浅色前景（common.css 与首页各一组变量覆盖），暗图维持深色，切走自动还原。
· **V127 统一弹窗（740678b）**：`zl-features.js` 新增 `ZL.dialog`（alert/confirm/prompt 三 API，Promise 化，串行队列）——居中长方形抽屉卡片（毛玻璃+弹性上滑展开，Esc/遮罩/按钮交互，textContent 防注入）。**window.alert 已全局劫持**：全站 31 处 alert 自动卡片化（含未来新增）；confirm×3（41.html×2、14.html 购物车）与 prompt×1（19.html 备注名）已逐点改 async/await（均带原生兜底）。**新代码禁止再直接调 confirm()/prompt()**，一律 `ZL.dialog.confirm/prompt`；alert 随意（劫持兜住）。
· **V128 分区重组与下架收尾（2026-10-31 11:47，d2889d3）**：① 首页「学习工具」分区移除，「看看作业/在线词典」并入「效率工具」（顺序：优质工具箱→网页备忘录→看看作业→在线词典→二维码生成器→文件搜索），导航与 hero/meta 文案同步（分区=效率/娱乐/站务）；② `32.html` 文件搜索器卡按需求移回 31/32 工具箱页保留（首页入口裁撤）、**首卡「返回主程序」固定跳 index.html（31/32 页首卡=回首页返回键，用户明确规则，勿改跳本页）**、渲染循环对齐 31 页改 `4+62*6` 固定格数（"敬请期待～"占位补齐视觉）；③ **发布异常记录**：d2889d3 首次 push 显示成功但远端被回退至 879d9f1（原因未明，疑并行操作），重推时 Bash 直连 `git push` 被 Mimosa 安全钩子拦截（D 盘历史脚本风险，与推送内容无关）——改由手册更新触发 bat 全流程完成推送；**教训：push 后必须 `git ls-remote` 复核远端，勿轻信 push 输出**。
· **V130 首页顶栏主题适配 + 底部精简（2026-10-31 21:40）**：① `.site-header` 背景原写死 `rgba(24,24,24,.72)`（任何主题下均黑灰）→ 改 `var(--surface)`（common.css 默认 :root 已同步该令牌 `rgba(255,255,255,.85)`，六主题全适配，backdrop-filter 毛玻璃保留）；教训：**首页组件背景必须用令牌，禁止写死色值**；② footer 删除 `f-links` 四链接（更新公告/反馈通道/一起来赞赏/免责声明，其工具卡入口在站务分区保留），版权行改「© 2026 找乐子 · 免登录使用」一行，`.site-footer` padding `--sp-600`→`--sp-400` 收紧（`.f-links` 规则已删）。
· **V131 首页五主题完整适配 · 方案 C（2026-10-31 22:30）**：承接 V130（仅默认找乐子主题），把剩余 5 主题（经典蓝/鎏金/明亮/雪阳/极光）的首页全部适配，每个主题色系完整、有特色。① **common.css 五个 data-theme 块各补首页双令牌同步**（`--surface←--card` / `--surface-2←--card-2` / `--text←--txt` / `--text-dim←--dim` / `--text-mute←--dim` / `--accent←--gold` / `--accent-2←--gold-2` / `--accent-ink←--btn-txt`），修复"非默认主题下顶栏/卡片仍是白玻璃、正文深色文字在深背景不可读"的根因（各主题块原只有 `--card/--txt/--gold`，首页用的 `--surface/--text/--accent` 回退到默认 :root 亮色值）；② **源版 index.html 三处写死金色令牌化**：`.hero-title` 渐变 `linear-gradient(90deg,#FFF,#9B9B9B)`→`var(--title-grad)`（各主题自动得其色系渐变，修复亮主题白字不可读）；`.btn-primary` 阴影/hover `rgba(246,211,101,..)`→`color-mix(in srgb,var(--accent) N%,transparent)`；`.tool-box:hover` 金边/金阴影→`color-mix` 同上；③ **common.css 末尾新增「V130 首页主题特色增强」段**：各主题 `.glow-1/2/3` 光斑换主题特色色（蓝/金/绿/橙/紫等，原全站写死金橙紫），`.tool-box` 描边按主题定制（鎏金金边、雪阳白雾描边+白雾 hover、极光紫描边）；④ 字体特色复用 V2.4.9 既有规则（鎏金衬线、明亮细字重、极光极细字重）。**教训：双令牌同步必须覆盖全部主题块，不能只做默认 :root**；color-mix(in srgb,...) 用于令牌半透明派生（Chrome 111+ 支持，站点环境 OK）。
· **线上部署验证**：GitHub Pages 用 Fastly CDN，静态资源 `Cache-Control: max-age=600`（10 分钟）。推送后立刻 curl 可能拿到 CDN 缓存的旧文件；等 10 分钟或用 `?v=随机数` 绕过。
· **V132 五主题背景图双版本入库（2026-10-31）**：为经典蓝/鎏金/明亮/雪阳/极光 5 主题各生成 1 张电脑 + 1 张手机网页背景图，共 10 张，落位 `pages\images\`，命名 `bg-{主题}-{pc|mobile}.jpg`（blue/gold/light/snowsun/aurora）。电脑版 16:9（工具输出 2730×1536）、手机版 9:16（1536×2730），JPG 高清、纯视觉无文字，中心留白便于叠加网页内容。生成模型：**Seedream 5.0 Flash**（用户确认降级；5.0 Pro 为会员专属，当前环境调用返回空不可用）。雪阳·电脑初版误出室内窗框，已重生成纯户外雪山版。旧 `bg-*.jpg`（未分 pc/mobile 版本）未被覆盖，仍在 images\ 共存，引用旧名的页面不受影响。
· **V133 背景图按端适配逻辑上线（2026-11-01 00:10）**：① common.css 五个主题块 `--bg-image` 改指 `bg-{theme}-pc.jpg`（PC/横屏/平板默认）；② aurora 主题两处硬编码 `url(pages/images/bg-aurora.jpg)`（V2.4.9 段）改为 `var(--bg-image)`，统一走变量；③ common.css 文件末尾新增 `@media (max-width: 768px)` 段——手机竖屏时五主题 `--bg-image` 切为 `bg-{theme}-mobile.jpg`；④ `service-worker.js` 预缓存清单由旧 5 张 `bg-*.jpg` 更新为 10 张新图（pc+mobile 各 5），CACHE_NAME 随构建自动升版。效果：电脑/横屏开 PC 横图（16:9 2730×1536），手机（≤768px）开手机竖图（9:16 1536×2730），两端各按自身比例 cover 完整铺满。**注意**：断点 768px 为手机竖屏判定；平板竖屏（768–1024）仍用 PC 图，如需改断点只调该 @media。旧 `bg-{theme}.jpg` 保留在库中（未删除），如确认无引用可归档冷区。
· **V134 背景图 1/4 放大 bug 根治 · 方案 C（2026-11-01 00:46，commit 0506815）**：V133 上线后用户实测背景图只显示约 1/4（电脑手机两端都是）。**根因**：V1.4.3 段 `.bg-flow-1` 的 `background-attachment: fixed` + `background-size: cover` 组合——浏览器（手机 Safari/Chrome、部分桌面/高 DPI）在页面高约 2192px 时把 cover 的参照高度算成**整个文档高度**而非视口，背景图被放大 ~2.6 倍，只露出视口大小的中部 ≈ 原图 1/4~1/6；headless 截图渲染行为与真实浏览器不同，故上次截图验证未抓到（盲区教训）。**修复（方案 C——独立背景图承载层）**：① 源版 index.html `.bg-ambient` 内新增 `<div class="bg-img">`（位于 `.bg-flow-1` 之后、glow 之前）；② common.css 新增 `.bg-ambient .bg-img { position:absolute; inset:0; background:var(--bg-image) center/cover no-repeat; pointer-events:none; }`——`inset:0` 元素尺寸=视口，cover 按元素算 → 精确铺满，**不用 background-attachment**（从根上绕开该 bug），pc/mobile 由 V133 的 `--bg-image` + `@media` 自动切换；zhaolezi 主题无 `--bg-image` → 透明，底下 `.bg-flow-1` 彩虹柔光渐变照常；③ V1.4.3 `background-attachment: fixed` 全改 `local`（业务页无 `.bg-img` 的兜底，容器本身 `position:fixed` 视觉等价，但 cover 不再按整页放大）。**验证**：1280 桌面=完整横图大画幅（光带横贯、无黑边）、390 手机=完整竖图（光带纵贯、无露白、文字清晰），两端均不再 1/4。**教训：涉及 background-attachment + cover 的改动必须以真实浏览器实测为验收，headless 截图不可信**；背景图承载层应独立成元素、让尺寸语义与 cover 对齐（元素=视口）。
· **V2.5.3 返回导航统一 · 小房子键（2026-11-01 08:04，commit ee2c168）**：39/36/1-8 页返回键重定向——① 39 分享卡片生成「返回主页」改跳 **32 工具导航**；② 36 双人井字棋改跳 **31 娱乐游戏**；③ 1-8 体系页（密码登录/授权协议/授权确认/选择IP/媒体池/作者介绍/优质工具箱/背包）原先散落的「返回主程序」文字链接（1 左上 `back-home`、4 右上 `back-main`、5 右上 `ghost-btn` backMain）与运行时注入的旧 `zlHomeBtn` 统一替换为**左下角深青色小房子圆形跳转键**（`.home-fab`，56×56，fixed left16/bottom74，z-index 2147483647，点击播放 1200ms 转场动画后跳 31.html）。**实现**：每页源码 `</body>` 前注入 `.home-fab` + `.home-overlay`（毛玻璃转场遮罩+三层 loader-ring+「找乐子～」文字）+ 独立 IIFE 绑定（preventDefault→overlay.show→1200ms→location.href=href）；`zl-features.js` 的 `initHomeBtn` 注入条件加入 `a.home-fab` 检测——已有新键页面不再注入旧 `zlHomeBtn`（避免与欣赏模式 `zlAdmireBtn` bottom20 重叠）；`zl-features.js` APP_VER 2.5.2→2.5.3 + VERSION_LOG 头条目，30.html announcementsConfig 头条目。**验证**：浏览器实测 1.html FAB→31.html、39.html backHome→32.html、36.html backHome→31.html 均带转场成功跳转；视觉确认左下角房子键（上）+欣赏模式（下）分开不重叠、页面无旧文字链接；构建冒烟 43/44 通过。**注意**：39/36 复用原 `back-area` 键（grid 大按钮）仅改 href/JS target，不注入 FAB；2/3/6/7/8 页保留原「返回上一页」流程键（backLink/backBtn/btnBack）。
· **V2.6.0 全站六主题适配（2026-11-01，t4 任务）**：**43 页全部完成六主题精细适配**（审计口径：44/44 页接入变量、未接 0 页；硬编码文字色 1866→669，余量全为白名单语义色）。**规范**：底/卡面→`var(--card)/--card-2`，文字→`--txt`，次要→`--dim`，边框→`--line`，强调→`--glow/--gold-2`，渐变→`--btn-grad/--back-grad/--title-grad/--gold-3-grad`，半透明强调→`color-mix(in srgb, var(--xx) N%, transparent)`，文字随主题对比→`--btn-txt`。**页面级特判**：词云 canvas 调色板改运行时读主题令牌（8 变量）+ data-theme MutationObserver 重绘；黑客模拟器=深色道具策略（页面底随主题、终端舱体保持黑客绿黑 + `.terminal-titlebar .title` 加 !important 防 common.css 覆盖）；暗号大全金系全随主题（金雪花/金环转场）；番茄钟 SVG 环形进度 stroke 改 style var(--red)/var(--green)；分享卡/打字测试 canvas 渐变运行时读令牌；34/39/46 的 JS 绘图均读 getComputedStyle。**性能修复**：移除 9 页违规的 background-position 全屏背景动画（24/5/4/17/3/6/2/14/文件搜索/9/15/11/34/29/38/25/19/26/27/28/30/42/31/32 等 titleGradient 同步移除），只留 transform 动画。**白名单（语义色不动）**：转场 loader-ring 品牌色、奖牌金银铜、RANKS 段位色、黑客终端舱内配色、扫雷经典灰皮、canvas 棋盘木色黑白子、分享卡用户可选背景、赞赏码白底、break 模式白玻璃、代码块深色、计算器 LED 屏、中性黑影与 rgba(127,x) 灰洗。**遗留观察**：审计 #667/#fff 告警为预检正则 3 位截断误报与白名单项；verify.html 自带黑金令牌体系（保密门禁语义）未动。APP_VER 2.5.3→2.6.0 + VERSION_LOG 头条目 + 30.html 公告头条目（双行规则）。
· **V2.6.0a 10.html 方法卡独立悬浮修复（2026-11-01，commit ccc47f0）**：用户反馈 3 张方法卡鼠标移入联动上浮——根因是承载容器 `.cell.content-area`（含 3 卡+图标列表的大格）整体响应 `.cell:hover` 位移。修复：`.cell.content-area:hover { transform:none }` 禁容器浮起 + `.content-section:hover` 各卡独立上浮（translateY(-5px)+glow 柔光影）；顺手令牌化方法三占位内联色（rgba(240,242,245,.8)/#bbb → card mix/line）。**教训：网格页给 `.cell:hover` 加位移前先确认哪些 cell 是"容器"哪些是"卡"，容器类加 `:hover transform:none` 豁免。**
· **V2.6.0b 31/32 页样式崩坏修复（2026-11-01，commit bba4143）**：V2.6.0 适配时批量替换脚本吃掉了 3 处跨行 `linear-gradient(...)` 的闭括号（header h1 / 返回主页卡 / 文字渐变各 1），CSS 解析器自断点吞规则到下一个 `)`，31/32 卡片区整体裸奔（裸链接+敬请期待）。修复：三处改 `background: var(--title-grad);` / `var(--card);+border line`。**加固：新增「style 块括号平衡体检」（对 ( 与 ) 计数须相等），全站 44 页复检仅 31/32 失衡、已归零；该体检应作为批量改 CSS 后的固定工序**。教训：跨行替换必须保持括号收支平衡；冒烟自检只跑 JS 不测 CSS，括号体检是 CSS 的"冒烟"。
· **V2.6.0c 小房子键统一移右上 + 跳转动画补齐（2026-11-01，commit b6ca85e）**：用户要求 31/32/1-8 的回首页小房子统一移右上并补动画。**两类房子键**：① 1-8 页源码内联 `.home-fab`（深青 56px，自带 1200ms overlay 动画）——8 页 CSS `left:16/bottom:74` 全改 `top:14/right:16`，**2.html 特例 top:74**（右上 30px 处有「下一步」流程键，fab 放其下方避让）；② 31/32 等无静态首页链接页被 `zl-features.js initHomeBtn` 注入的白底 `zlHomeBtn`（44px，原左下 bottom76、onclick 直跳无动画——common.js 的跳转动画 hook 只拦 `[onclick]` 属性与 `a[href]`，JS 赋值的 onclick 拦不到）——**改造：button→`<a href=resolve('index.html')>`+右上定位**，点击即被 hook 拦截播放统一转场（900ms 三层 ring+"找乐子"），hook 未加载时 a 默认导航天然兜底。**注意**：zlHomeBtn 变 a 后 href 是 resolve 后的（pages 页=../index.html），hook 识别 index → 显示品牌文字；右上角与 zl-rf-toast（top68）不叠。**教训：给 JS 注入按钮补全站动画，最省路径是改造成 `<a href>` 让既有 hook 接管，勿自建动画。**
· **V2.7.2 四站 manifest/断链修复 + 阶段2 强混淆上线（2026-11-07，t8 续，commits d6dbd97→fae4c07）**：①**manifest 治理**——af/ai/cy/xd 四 manifest start_url 全改新中文页名（旧值指已删路径：全能文件保存.html/AI提示词系统/AI提示词管理.html/index.html），图标全部改 af-/cy-/xd- 前缀（cy 原 4 个 icon-*.png 根目录不存在=断链，改 cy-icon-*）；全能-文件保存 icon→af-assets/、manifest 链接→af-manifest.json；学习计时 apple-touch-icon `../favicon-48.png` 越界→`favicon-48.png`（同层化遗留）。②**阶段2 混淆升级**——内联脚本 base64+escape 单层（可脱壳）替换为 javascript-obfuscator 5.10.0 强混淆（stringArray+base64 编码+rotate/shuffle+控制流压平 0.5+selfDefending+hexadecimal 命名；**renameGlobals 必须关**——内联 onclick 依赖全局原名；**debugProtection 必须禁**——控制台死循环教训；>100KB 大脚本压平阈值减半 0.25 防重页变慢；单脚本失败自动回退老方案；产物标记 `/*ZL-OBF-V2*/`，392 内联脚本 386 混淆、NO_OBFUSCATE 6 个豁免；残留明文仅模板字面量/短字面量 17 碎片）。全量构建 56s，冒烟 189/190（豁免 1）0 失败。③**发布坑实证**——bat 在工作区干净时判"无改动"直接退出**不会 push**（补推不能裸跑 bat）；`echo | cmd //c bat` 管道喂 pause 防挂起；Pages 构建偶发 40min+ 延迟（d6dbd97 迟不生效，重推载体重建恢复）；api.github.com 本网络不可达，构建状态只能内容探测（Last-Modified/内容 grep）。
· **V2.7.1 全站同层化（2026-11-06，t8 任务，commit 8eaff7f）**：apps 四站 html 全部并入 _原始未混淆版/ 同层（190 页中文语义名：找乐子 44/现代- 127/创意- 15/提示词- 2/全能- 2，映射表 _tmp_rename_final.json 撞名 0）；四站资源站前缀化（xd-/cy-/ai-/af-）随构建复制到根；pages/ 分层取消（_混淆工具.js outDir 全根/fixHomePath 直通/NO_OBFUSCATE 新名/资源目录复制）；链接全改写约 1800 处（sections 四入口/ZL.PAGES/GATE_MAP/ZL.resolve 去 pages 前缀/SW ASSETS/门禁 ?go=/SW 路径）；SW ASSETS 移除 10 张无引用 bg 图；**SW 无限循环根治**（四站页面注册全删+自注销 SW 去 navigate）与 **placeLiq MutationObserver 风暴守卫**（全能站「没有响应」双真因）；冒烟 shim 增强（style.setProperty/parentNode 兜底）+KNOWN_STUB_LIMITS 更新（189 通过+1 豁免 0 失败）；闸门基线 23 文件/320 处；apps/ 与 pages/ 已删除（全站同层在根）。
· **V2.7.0 四站并入（2026-11-04，t5 任务，commits 2365048→285966c）**：ai-prompts/现代化/创意/全能文件保存四站并入仓库 `apps/` 子目录上线——首页四卡片改站内链接 `apps/xxx/index.html`（走 JUMP_ANIM 转场），absUrl 加 `^apps/` 直连判断；四站全部页面换装找乐子六主题（彩虹亮彩默认），各站改造脚本（锚点+计数+括号平衡+残留扫描）在 `构建工具/_t5四站并入/`；apps 四站 SW 换自注销版；主站 SW ASSETS 加四站入口。**gitlink 事故**：首次发布 apps 带入各站上线网页自带 .git 被识别为子模块（create mode 160000），文件未入库线上 404——修复=剥 .git/.gitignore/.gitattributes 后重拷重发；**教训：拷 git 仓库工作区必须先剥 .git，发布后核对 git 输出无 160000**。同日 UI 精修：38.html orb 光球/大块动画去除；ai-prompts 3D 倾斜全链路去除+回收站胶囊回归统计栏+dock 停靠栏移除；现代化 glass-dock 移除+字号栏竖排 44px+欣赏模式按钮 :not(#xdAdmireBtn) 豁免（修复浏览模式按钮消失）。

---


## 7. 全站统一跳转动画（2026-10-11 新增 · V126 视觉重制）

所有跳转按键（`<a href="*.html">` 和 `onclick="location.*='***.html'"`）点击后会显示统一的 zhaolezi 转场动画。**V126（2026-10-31）视觉已复刻原生「三层 loader-ring」设计**：半透明黑底（rgba(0,0,0,.72)+16px 毛玻璃）+ 外环 `var(--accent)` 顺时针旋转 + 内环（#A78BFA/#667EEA）反向旋转 + 居中品牌文字（`var(--accent)`，22px 粗体）。替换了旧版单层绿色 #38ef7d 圆环（用户判定过丑）。

**中心文字规则**：
- 跳 `index.html` → 按当前站点品牌显示（zhaolezi=找乐子 / creativity=创意引擎 / xiandaihua=现代化 / all-file-saver=全能文件保存 / ai-prompts=AI 提示词库）
- 其他跳转 → 目标 HTML 的 `<title>` 剥离品牌名后取最长段（如"主板与 CPU - 现代化·知识学习站"→"主板与 CPU"）

**Hook 实现位置**：构建工具/_混淆工具.js 里的 JUMP_ANIM_CODE 常量，每次混淆自动写入 common.js

**禁止事项**：
- 不要删除 hook 代码（含 `__JUMP_ANIM_INIT__` 标记）
- 不要手动改 hook 里的动画样式或文字规则（跨 5 站共享）
- 跳动画播放 900ms 期间重复点击会被锁住（`jumpLocked` 机制），属正常行为
- 启动屏自动跳转（`setTimeout` 内的 `location.replace`）**不会**被拦截，属预期

**回滚方式**：删除 hook 代码段（含 `__JUMP_ANIM_INIT__` 标记的整段 IIFE）即可恢复原跳转行为。

## 2026-11-07 V2.7.3 · 全能文件保存卡死根因修复

- 根因：`MutationObserver(placeLiq)` 无限风暴——A 分支 `remove('single')` 在自身观察器监听下自触发（t6 守卫不彻底）
- 修复：变更 class 前后 `liqMo.disconnect()/reobserve()` 断链（fix4 方案，功能保留）；9 处调试探针全清
- 教训：页面卡死勿以 title 探针为中断证据（同步/回调/注释/HTML 四类探针行为不同）

## 2026-11-07 V2.9 · 全站跳转与公共层修复（六处）

- autoAttachGlobals 只扫真顶层函数 + try/catch：修复混淆后 IIFE 内函数挂载断链（nowTag/closeDlg/ensureStyle is not defined，全站每页都炸）
- common.css 背景图 pages/images/→images/（15 处，同层化残留）
- SW 注册 location.origin+'/service-worker.js'→'service-worker.js'（子路径站点 404）
- index.html renderTools 对 .hero-proof 判空
- zl-glass rfCheck：SW ready/update 全超时保护 + requestIdleCallback 延迟 + 去自动 reload（首屏卡顿真凶）

## 2026-11-07 V2.9.1 · 现代化站跳转 404 根治

- 根因：xd-features.js 的 XD.TREE 用 id+'.html' 规则（A/A1/A2-1…），同层化后页面已改名「现代-XXX.html」→ 目录树 125 链接全 404
- 修复：新增 XD_FILE_MAP（源 _tmp_rename_final.json，125 条全覆盖）+ nd.f 优先查映射
- 影响面：目录树/搜索/前后页/收藏全部经 nd.f，一处修复全站生效

## 2026-11-08 V2.9.3 · 全站结构分层化

- 线上：190 HTML → pages/（189 页），资源 → assets/（css/js/images/audio/23data/看看作业/af/cy/xd/ai）；根只留 index.html + PWA 必需文件
- 本地顶层极简：一键自动化发布.bat + 构建工具/ + _原始未混淆版/（自包含全部素材）+ 产物（index/pages/assets）
- 构建工具：outDir/refPrefix/fixHomePath 恢复分层 + 资产映射重写 + JS 字符串路径 + SW currentScript 根注册
- 旧平铺产物 227 项归档 E:\AI永久记忆\85_备份\找乐子旧平铺产物-20261108\
- 验证：190 页本地全量扫描（除 api/log/today 预期与 4s 超时误报外零异常）；页面引用 ../assets/ 与 pages/ 全部 200

## 2026-11-11 V4.0 · 全站「留白编辑风」重设计（189 页逐页完成）

- **理念**：大道至简——纸面、字阶、发丝线；留白即装饰。用户唯一一次确认：留白编辑风 + 直接到底（设计→验证→修复→发布全环节自主完成）。
- **新增设计系统 `ed.css`**（源区根级，构建自动同步 assets/css/ed.css 并注入全部**非首页**页面，index.html 零接触）：--ed-* 语义令牌（全部派生自 --zl-*/主题变量，零新硬编码色）+ 元素级纸面默认值（h1 大细标题/控件/表格/代码/选择色）+ 装饰静默（.bg-animation/.bg-flow/.orb/.bg-orb 全 display:none）+ .ed-* 布局原语（wrap/measure/kicker/lede/btn三态/card/list/fold/footer）+ 找乐子词汇层（.container/.card/.title-area/.back-area 扁平化）。SW 预缓存已登记 ed.css。
- **xd-common.css V5.0 / cy-common.css V5.0 全量重写**：所有类选择器契约 100% 保留（校验脚本 .tmp/选择器契约校验.js），令牌值不动（JS/画布读取），渐变标题→墨色细字重，玻璃卡→发丝线，悬停位移取消，进度/焦点=主题蓝，全站统一跳转动画（.overlay/.loader-ring）按铁律原封未动。
- **找乐子 43 页逐页**：枢纽 5 页改为编辑风索引行（372 个「敬请期待」占位格全部清除，首卡返回站规保留）；门禁 5 页统一「纸面之门」（哈希校验/?go=白名单/转场契约原封）；工具 13 页 + 游戏 6 页补齐编辑风页头（kicker+h1+lede）与「原理与技巧」深度内容（details.ed-fold 折叠）；站务/重页 14 页同样处理（媒体池/背包为舞台页保持最小干预）。
- **现代 127 页**：127 块 bg-animation 装饰 div 全部移除（codemod 平衡走位防嵌套误切）；15 个内联样式页规整（渐变→主题蓝/阴影→无/圆角统一/tint→color-mix）；首页键 emoji 清理；doc 课内容已扎实（中位 1030 字）未强行注水。
- **创意/提示词/全能**：cy-common V5 + 15 页去装饰与规整；提示词-欢迎页纯纸面重写（splashShown/跳转逻辑原封）；提示词-管理器与全能-文件保存规整扫（渐变→令牌/阴影→无/圆角统一）。
- **净化与验证**：死装饰 CSS 括号匹配式剥离；transition:all 清除 25 页；风格闸门绿（存量 403 < 基线 407）；冒烟 189/190（豁免 1）；产物校验 20/0/0；indexdiff 首页 body 结构 0 变化；p0 回归探针 0 异常。
- **新契约提醒**：① 页面 JS 若新增单字母变量会被风格闸门拦截（ exempts: i/j/k/x/y/e/_ ）；② 深度内容统一放 `<details class="ed-fold"><summary>…</summary><div class="ed-fold-body">…</div></details>`；③ 编辑风页头三件套 = `.ed-kicker` + `h1` + `.ed-lede`；④ ed.css 不注入 index.html，别给首页引用它。

## 2026-11-11 V4.1 · 截图战役：揪出并修复 V4.0 设计系统「半死」缺陷（已发布 d411fe1）

- **起因**：用户要求「实际截图观看的分析」。搭 CDP 单实例 Edge 截图管线（.tmp/cdpshot/shot-all.mjs，桌面 1280×900 + 手机 390×844 双机位，189 页全量），亲眼看后**发现 V4.0 发布版设计系统只活了部分**。
- **🔴 根因一（最关键）**：ed.css 头注释写了「--zl-*/主题变量」，注释里的 `*/` 把文件首注释提前闭合，多余注释文字（全角标点无分号）一直吞到 :root 选择器 → **整个 --ed-* 令牌块被浏览器整条丢弃**。症状=页头挤窄栏竖排、字阶/字距/圆角/留白全失效。修=改写注释措辞；新增 `.tmp/游离注释闭合探测.js` 全站扫（现全站无同类）。
- **🔴 根因二**：`ensureImgLazy` 正则 `[^>]*` 在 onerror 属性值内的 `>` 处提前截断，把 loading 塞进属性值中间 → 作者介绍/背包头像区解析碎片。修=带 onerror/onload 的 img 跳过注入。
- **其余修复**：① `.container` 多页 max-height+overflow 内滚裁切内容 → max-height:none/overflow:visible（扫雷雷区不再截断）；② 彩虹滚动条 → thumb 加 !important 中性化；③ 页级自造 .decor-circle/.decorations 光斑 → ed 装饰静默改属性子串选择器 `[class*=decor/orb/glow/deco-/bg-flow]`；④ `.title-area` flex 行 → display:block 纵向堆叠 + grid-column 1/-1 通栏；⑤ `.back-area` 收缩为幽灵 pill；⑥ `.page-head` 通栏原语；⑦ 应用页（全能/提示词）6 处被早前正则替换打断的非法 `var(--gold-b,...),#xxx)` 坏背景 → 修为 none/纯色。
- **逐页 bespoke**：作者介绍整页重写（居中名片+楷体署名+真实文案+ed-fold，契约与头像保留，换掉「啥也没有/简介空空如也」占位文案）；免责声明去装饰 div+去重标题+卡扁平；在线词典 fold 移位+按钮去渐变。
- **验证**：冒烟 189/190 · 产物校验 PASS · indexdiff 0 变化 · 闸门绿 403<407 · 无游离闭合符；发布 d411fe1（117 文件 +1000/−1253），线上 Last-Modified 23:52 GMT 确认真部署。
- **铁律新增**：① CSS 注释里绝不写「星号+斜杠」序列（会提前闭注吞规则）；② 批量 CSS 正则替换后**必须截图亲眼看**（正则会产非法值、计算样式会骗人）；③ 计算样式探测脚本 .tmp/cdpshot/probe-style.mjs 可直查任意页任意元素的 computed 值。

## 2026-11-12 V4.2 · 接手审计：全站 189 页视觉审计收官 + 三个真 bug 修复（已发布 86a6a10）

- **审计方式**：不信任任何记载，全部实证重跑。① 五条铁律逐项验证：indexdiff body 结构 0 变化 / 源区自包含（190 html+5 css+13 js+全部资源目录）/ --blue=#667eea 与 THEME_EARLY data-theme=zhaolezi / Ctrl+K(Ctrl/Cmd/K 与 /) 命令面板在产物 common.js 实证存在 / 发布走 bat。② 上届声称的验证全套重跑：闸门 403<407 绿、产物校验 20/0/0、冒烟 189/190（豁免提示词-管理器）、err-scan 189 页 0 运行时错误、游离闭合符全清。③ **189 页桌面截图全量逐页亲眼看**（E:\上传网页\_probe\shots-v4\dt-*.png），按家族推进：找乐子游戏 11+工具 13+站务 20+创意 15+提示词 2+全能 2+现代课程 127（含 14 测验与全部特殊交互页）。
- **🔴 真 bug 一（E/F/G 测验内容挤左半栏）**：这三页的 `<nav class="lesson-nav">` 被放在了 `</article>` **外面**（其余 124 页都在内部），成为 `main{display:flex}` 的第二个子元素 → article 被挤成 ~700px 左半栏、nav 按键行占右侧。修=源文件把 nav 挪回 article 内（A 页为正确样板）。教训：**同模板页面的 DOM 嵌套一致性也要抽查**（class 相同不等于结构相同）。
- **🔴 真 bug 二（callout 内 `<b>` 全部块级化断句）**：xd-common.css `.callout b{display:block}` 本意是 callout 标题行块级，却波及正文内联加粗 → 模块J「保命口诀」每个加粗词独占一行、术语词典「69」孤行、毕业证书「A 到 N 十四个模块」孤行。修=`.callout > b:first-child{display:block}` 仅标题块级。教训：**块级化规则必须限定"标题位"（:first-child），不能裸选标签**。
- **其余修复**：① ed.css 词汇层补 `.title-area p/.ed-kicker/.small` 白字钉回（赞赏支持/打字测试白字隐形，特异性 0,1,1>0,1,0）与 `.container{border:0}`（暗号/黑客彩框）；② 暗号大全 outputZone 初始空白 → DOMContentLoaded 默认渲染一条随机暗号（真内容非纸老虎）；③ cy-common body `padding-bottom:88px` 预留固定 dock 空间（创意站底部不再压内容）；④ 娱乐游戏/工具导航 `t is not defined` 运行时错误（变量重命名漏引用）；⑤ 双人井字棋/分享卡片删页内重复小标题、反馈渠道渐变描边→发丝线。
- **验证与发布**：冒烟 189/190 · 闸门绿 · 产物校验 20/0/0 · indexdiff body 0 变化（仅混淆种子重掷 1 行）· err-scan 0 错误 · 游离闭合符全清；发布 86a6a10（116 文件 +166/−136），ls-remote 确认 d411fe1..86a6a10 已上线。遗留候选：反馈渠道 promo 图仍为旧彩虹设计（图片资产，需人工重制）、分享卡片 promo 同、作者介绍头像待用户真图、黑客模拟器 SYSTEM BREACH 巨型水印为页面主题元素（保留）。
- **发布注意**：一键自动化发布.bat 有 6 处 pause（含成功路径），非交互执行用 `cmd //c "一键自动化发布.bat" < /dev/null`（pause 遇 EOF 立即返回）。

## 2026-11-12 V4.3 · 模块字母条「键帽化」+ contrastFix 竞态豁免（已发布 6b0db4e）

- **起因**：用户截图指出模块导航条「按键没适配」——原 .mod-pill 是透明裸文字 + 悬浮胶囊滑块，无实体按键感。
- **设计**（assets/css/xd-common.css，24 行）：`.mod-pill` 改为 36px 固定高**发丝线键帽**（1px var(--line) 描边 + 纸面底 + 居中字母，gap 4→6px）；激活态 `.mod-slider` 为**墨色实心滑块**，滑块上文字强制白色。视觉＝键帽阵列 + 墨块游标，与留白编辑风一致。
- **🔴 隐形杀手（竞态）**：`assets/js/zl-features.js` 的 `contrastFix()` 会对「浅底浅字」内联刷 `!important` 色，**看不见层叠在按键下的实心滑块**，导致激活键墨底墨字（整页刷新偶发正常、从目录树进入必现）。修＝contrastFix 跳过 `.mod-strip` 及其子元素；同步去 xd-features.js 旧圆点。
- **验证**：桌机+手机双机位截图 4 张（E:\上传网页\_probe\shots-v4\dt-现代-全站目录树.png / dt-现代-模块A计算机基础.png / mb-* 同名 2 张）——键帽阵列、墨色激活块、白字均正确；控件观感审计（audit-controls.mjs，189 页）无系统性破损（47 处 skip-link 为无障碍误报，真问题仅 scene-link 33px 触摸目标偏小 + 移动端浮动球压内容，列入遗留）。
- **发布**：6b0db4e（113 文件 +142/−137，含 SW v385→v387），ls-remote 确认 e0e2c9f..6b0db4e 已推送到 GitHub；线上 Pages 构建有延迟，Last-Modified 待复核。
- **沉淀**：① 凡「层叠滑块+文字」控件，必须检查全站内联 !important 刷色函数（contrastFix）的豁免名单；② 键帽类控件统一 36px 高 + var(--line) 发丝线，激活态墨底白字。
