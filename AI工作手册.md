# zhaolezi · AI 工作手册

> 本文件是给 AI 看的本站工作说明（与 说明.txt 配套，面向 AI 视角）。
> 更新日期：2026-10-11。AI 每次在本文件夹工作前，先读本文件与 说明.txt。

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
当前规模：46 个数字页面（1.html~46.html，含 41/42 政治作业）+ 首页 index.html；图片 42、音频 19、看看作业 19 张。

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
· **线上部署验证**：GitHub Pages 用 Fastly CDN，静态资源 `Cache-Control: max-age=600`（10 分钟）。推送后立刻 curl 可能拿到 CDN 缓存的旧文件；等 10 分钟或用 `?v=随机数` 绕过。

---


## 7. 全站统一跳转动画（2026-10-11 新增）

所有跳转按键（`<a href="*.html">` 和 `onclick="location.*='***.html'"`）点击后会显示统一的 zhaolezi 圆环转圈动画（绿色 #38ef7d 圆环 + 半透明黑背景）。

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
