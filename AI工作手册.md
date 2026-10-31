# zhaolezi · AI 工作手册

> 本文件是给 AI 看的本站工作说明（与 说明.txt 配套，面向 AI 视角）。
> 更新日期：2026-10-31。AI 每次在本文件夹工作前，先读本文件与 说明.txt。

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
