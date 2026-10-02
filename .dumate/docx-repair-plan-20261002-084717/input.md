---
title: zhaolezi 全站修复规划
author: DuMate
keywords: [zhaolezi, 修复规划, favicon, 性能优化, XSS, 发布闭环]
date: 2026-10-02
docx:
  title: {enabled: true}
  toc: {enabled: true, depth: 3, title: 目录}
  page: {size: A4, margin: {top: 2.2cm, bottom: 2.2cm, left: 2.2cm, right: 2.2cm}}
  font: {body: {eastAsia: 微软雅黑, latin: Calibri, size: 10.5pt}, heading: {eastAsia: 微软雅黑, color: "1F3864"}}
  table: {style: grid, alignment: center, cellAlignment: left, verticalAlignment: center, headerFill: "D9E2F3", headerColor: "000000", headerBold: true}
---

# 0. 文档说明

- 本规划由用户委托制定，范围覆盖 zhaolezi 全站已确认的 8 项修复。
- 修复项清单、证据与测试口径均来自《zhaolezi全站全面测试清单（只读评估版）》V1.1 与历史运行日志。
- 本轮只交付规划，不修改任何代码文件，等用户回复确认后再动工。
- 用户已确认口径：41.html 不纳入 42 页管理范围；移动端全量截图；冷加载复测以本机网络为准；执行范围 P0 全量 + P1 抽样。

# 1. 修复总览

- 8 项修复按优先级与依赖分为 4 个批次执行。
- 批次 A：独立低风险快赢；批次 B：性能优化；批次 C：混淆脚本修复；批次 D：发布闭环。
- 硬约束贯穿全部批次：改页面必更公告；动公共资源必 bump SW；发布必走三件套。

| 编号 | 修复项 | 优先级 | 涉及文件 | 批次 |
| --- | --- | --- | --- | --- |
| F-1 | favicon /favicon.ico 404 | P0 | 新增 favicon.ico | A |
| F-2 | 17.html 体积 1.43MB | P1 | 17.html + 数据文件 | B |
| F-3 | 冷加载白屏 FCP 5.23s / DCL 4.42s | P1 | common.css + images + SW | B |
| F-4 | 文件搜索 innerHTML 未转义 XSS | P1 | 文件搜索.html | A |
| F-5 | 13 页 IIFE 混淆控制台报错 | P1 | 35/40 等 13 页源码 | C |
| F-6 | 记住登录实质未生效（产物不同步） | P1 | 1.html 重新构建 | D |
| F-7 | 20 页运行时无 h1 | P2 | 20.html | A |
| F-8 | 无 robots.txt / sitemap.xml | P2 | 新增两个站点文件 | A |

# 2. 逐项修复方案

## 2.1 F-1 favicon /favicon.ico 404（P0）

- 现状证据：站点根目录无 favicon.ico；除 14.html 内联 SVG 外，其余页面请求 /favicon.ico 均返回 404，控制台持续报错。
- 修复动作：生成多尺寸 favicon.ico（16 32 48 像素合成）；放入站点根目录 E:\上传网页\zhaolezi\favicon.ico。
- 涉及文件：新增根目录 favicon.ico；可选同步 _原始未混淆版\favicon.ico；不改任何页面源码。
- 改动影响：浏览器标签页显示站点图标；控制台 404 消失；页面功能零影响。
- 风险：极低；ICO 需工具生成（Pillow 或在线合成均可）。
- 验收标准：本机与线上 GET /favicon.ico 均返回 200；清 console 后无 favicon 404 报错；标签页显示图标。
- 优先级与依赖：P0，零依赖，批次 A 最先执行。

## 2.2 F-2 17.html 体积 1.43MB（P1）

- 现状证据：17.html 混淆产物 1.43MB；源码 _原始未混淆版\17.html 约 1.1MB；体积构成为内嵌暗号字典数据（triggerMap 数组，源码第 522 行起）+ 内嵌 KaiTi 字体样式。
- 修复动作：把 triggerMap 字典数据抽离为独立文件 _原始未混淆版\17-data.js；17.html 改为 script 标签引入，数据挂到全局变量；构建 17.html；SW 预缓存清单加入 17-data.js。
- 涉及文件：_原始未混淆版\17.html（裁剪数据段）、新增 _原始未混淆版\17-data.js、17.html（构建产物）、service-worker.js（缓存清单）。
- 改动影响：17 页 HTML 从 1.43MB 降至几十 KB；数据文件可被浏览器与 SW 缓存，二次访问接近瞬时；页面功能与触发词逻辑不变。
- 风险：中。数据加载方式变化需回归全部暗号触发路径；改用 script 引入而非 fetch，避免 file:// 本地直开跨域失败；构建后必须实测本地与线上双环境。
- 验收标准：17.html 构建后小于 200KB；暗号查询功能与抽查触发词输出与修复前一致；本地 file:// 与线上均正常；控制台无新报错。
- 优先级与依赖：P1；依赖构建与 SW；批次 B。

## 2.3 F-3 冷加载白屏（P1）

- 现状证据：本机口径冷加载 TTFB 410ms 达标，但 FCP 5.23s / DCL 4.42s；根因为 common.css 3.0MB（其中约 2.96MB 是 21 行 base64 内联背景图与字体）+ 同步脚本阻塞渲染；另确认 common.css 残留 12 个已下架主题块（juju/coco/desert/forest/garden/ink/moon/nebula/nostalgia/ocean/sakura/steampunk），每块各含一张 base64 背景。
- 修复动作：分三步执行，每步独立验收。
- 第一步：清理残留主题块，删除 common.css 中 12 个已下架主题的 data-theme 块（含其 base64 背景），预计减重约 1.5 至 1.8MB。
- 第二步：把在用 10 主题的 base64 背景图解码为独立图片文件，存入新增 images\ 目录；common.css 改 url() 引用；SW 预缓存图片。
- 第三步：首屏关键样式（主题变量与基础布局）抽 critical 样式内联到各页 head；common.css 改延迟加载；theme.js 等脚本加 defer（先验证依赖顺序）。
- 涉及文件：common.css、新增 images\ 目录、所有页面（如做第三步）、theme.js、service-worker.js。
- 改动影响：CSS 从 3.0MB 降至几十 KB；FCP / DCL 预计下降 40% 以上；10 主题背景显示不变（改为外置文件加载）；删除残留主题块不影响任何在用主题。
- 风险：中。删除残留块前已复核 theme.js 仅含 10 主题，旧主题值自动回退 dark；背景外置后需重测 10 主题全量显示；第三步改动面大且有主题闪烁风险，建议放最后单测，必要时可只交付前两步。
- 验收标准：冷加载复测（本机绕过 SW 清缓存三次）FCP 小于 2.5s、DCL 小于 2s；42 页 x 10 主题 verifyAudit 仍为 0 失败；10 主题背景全部正常无 404；移动端 375px 全量截图正常。
- 优先级与依赖：P1；依赖构建与 SW；批次 B；第一步可先行独立交付。
- 处理约束：common.css 第 130 行为超长 base64，禁止直接 Read，处理时用脚本按行定位或 Grep。

## 2.4 F-4 文件搜索 XSS（P1 低危）

- 现状证据：文件搜索.html 的 renderResults 用 highlight(f.name / f.path) 拼接 innerHTML；highlight 函数（第 404 行起）未做 HTML 转义；文件名或路径含特殊字符时可注入脚本。
- 修复动作：新增 escapeHtml 函数（转义与号、小于号、大于号、双引号、单引号）；highlight 改为先转义再套 mark 标签；renderResults 中文件名、路径、文件类型全部先转义再拼接。
- 涉及文件：文件搜索.html（NO_OBFUSCATE 直接复制页，改源码后复制/构建同步）。
- 改动影响：含特殊字符的文件名与路径安全显示；XSS 注入面关闭；正常搜索高亮行为不变。
- 风险：低。需回归高亮正确性（中文、大小写、特殊字符文件名）；mark 标签为受控白名单，其余全部转义。
- 验收标准：构造含图片标签与事件脚本代码（img onerror 组合）的文件名搜索不弹窗、按文本显示、高亮正常；正常关键词搜索高亮回归通过。
- 优先级与依赖：P1；零依赖；批次 A。

## 2.5 F-5 13 页 IIFE 混淆控制台报错（P1）

- 现状证据：35 renderClock、40 matchPage，以及 3/6 showTransition、25 updateStats、26 utf8Encode、27 setMode、29 fallbackCopy、36 loadScores、37/38 todayStr、39 roundedRect 共 13 处控制台报 is not defined；根因为 _混淆工具.js 的 autoAttachGlobals 靠正则收集顶层 function 声明，页面脚本被 IIFE 包裹或存在嵌套 function 声明时挂载失败；33/34 页已用去 IIFE + 嵌套函数匿名化手法修复成功。
- 修复动作：逐页修改 _原始未混淆版 对应源码，去掉 IIFE 包裹、把嵌套 function 声明改为顶层声明；逐页 node --check 校验后构建；先修 35、40 两页确认手法，再批量修其余页。
- 涉及文件：_原始未混淆版\3、6、25、26、27、29、35、36、37、38、39、40.html 及构建后同名根目录文件。
- 改动影响：控制台报错消除；全局函数由 autoAttachGlobals 正常挂载；页面核心功能不变（此前实测功能不受影响）。
- 风险：中。修改脚本结构需逐页功能冒烟；注意去掉 IIFE 后可能引入同名全局变量冲突，改造前先查页内重名。
- 验收标准：逐页 CDP 加载后清 console 无该报错；对应页核心功能冒烟通过；该页 verifyAudit 仍 CLEAN。
- 优先级与依赖：P1；依赖页面构建；批次 C，分两批（35/40 先，其余后）。

## 2.6 F-6 记住登录实质未生效（P1）

- 现状证据：_原始未混淆版\1.html 已完整实现记住登录（写入端第 473 行 localStorage.setItem('zl_logged')，读取端第 538 行自动跳转），但根目录 1.html 经检查不含 zl_logged 逻辑；线上与本地根目录页面为旧构建产物，源码改动从未上线。
- 修复动作：用 _混淆工具.js 重新构建 1.html，使源码中记住登录功能上线；构建后核对根目录 1.html 包含该逻辑。
- 涉及文件：_原始未混淆版\1.html（已是最终态，如需微调改此处）、1.html（重新构建）、30.html 公告（该功能随本轮一并公示）。
- 改动影响：勾选记住登录后，下次访问 1.html 自动免密跳转目标页；根目录 1.html 与源码恢复同步。
- 风险：低。构建后需回归密码验证、转场动画、记住登录三端；若有其它源码级未上线改动会一并上线，需在公告中说明。
- 验收标准：勾选记住并登录后重开 1.html 自动跳转；不勾选则要求输入密码；控制台无新报错。
- 优先级与依赖：P1；依赖构建；批次 D（随发布闭环一起上线并公告）。

## 2.7 F-7 20 页运行时无 h1（P2）

- 现状证据：20.html 页面运行时 document 中无 h1 元素，缺语义化主标题。
- 修复动作：在 _原始未混淆版\20.html 把页面主标题改为 h1（保持现有视觉样式，必要时使用视觉隐藏类）；构建 20.html。
- 涉及文件：_原始未混淆版\20.html、20.html（构建产物）。
- 改动影响：补齐语义化主标题，利于无障碍与 SEO；页面视觉不变。
- 风险：低。注意 h1 替换后样式选择器是否仍命中（若样式按类选择器则无影响）。
- 验收标准：CDP 查询 h1 存在且文本正确；页面截图与修复前一致。
- 优先级与依赖：P2；依赖构建；批次 A。

## 2.8 F-8 无 robots.txt / sitemap.xml（P2）

- 现状证据：站点根目录无 robots.txt、无 sitemap.xml。
- 修复动作：新增 robots.txt（放行全部爬虫 + 指向 sitemap）；新增 sitemap.xml（列出 42 个管理内页面的线上 URL，41.html 不纳入）。
- 涉及文件：新增根目录 robots.txt、sitemap.xml；同步 _原始未混淆版 目录。
- 改动影响：搜索引擎可正确抓取与索引；零功能影响。
- 风险：极低；GitHub Pages 原样托管静态文件。
- 验收标准：线上 GET /robots.txt 与 /sitemap.xml 返回 200；内容 UTF-8 正确；sitemap 不含 41.html。
- 优先级与依赖：P2；零依赖；批次 A。

# 3. 批次与依赖关系

## 3.1 批次 A（独立低风险，可最先执行）

- 内容：F-1 favicon、F-4 XSS、F-7 无 h1、F-8 robots/sitemap。
- 特点：四项互不依赖，均不改公共资源，可单独提交与验收。

## 3.2 批次 B（性能优化）

- 顺序：F-3 第一步（清理残留主题块）先行；再 F-2 17 页数据抽离；最后 F-3 第二、三步（背景外置、关键样式内联）。
- 依赖：F-3 所有步骤与 F-2 均需重新构建受影响页面并更新 SW。

## 3.3 批次 C（混淆脚本修复）

- 内容：F-5 逐页去 IIFE；先 35/40 验证手法，再批量其余 11 页。

## 3.4 批次 D（发布闭环）

- 顺序：F-6 重建 1.html 上线记住登录；SW CACHE_NAME v13 升至 v14；git 提交推送；30.html 公告追加本轮全部改动；版本记录追加；日志补章节；robocopy 备份；全量回归验收。
- 依赖：批次 A、B、C 全部通过后执行。

# 4. 硬性约束与发布闭环

- 凡修改任何 zhaolezi 网页或公共资源，30.html 公告必须追加具体内容（announcementsConfig 数组头部插入 date + content）。
- 凡动公共资源（common.css、theme.js、zl-features.js、common.js、新增图片），service-worker.js 的 CACHE_NAME 必须从 v13 bump 到 v14。
- 所有页面改动一律改 _原始未混淆版 源码，再用 node _混淆工具.js xxx.html 构建；30.html 与 文件搜索.html 为 NO_OBFUSCATE 复制页，改源码后直接同步。
- 发布必须完成三件套：版本记录追加（E:\全面备份\zhaolezi备份\zhaolezi版本记录.txt）、工作日志补章节、robocopy 备份。
- 构建会重写根目录 common.js（含右键菜单与 SW 注册），发布提交必须带上。
- 防回归既有机制继续生效：node _混淆工具.js --check 静默检查 0 FAIL；控制台 ZL.verifyAudit() 运行时巡检 0 失败。
- 41.html 不纳入管理范围；移动端全量截图核验；冷加载以本机网络口径复测。

# 5. 回归与验收总清单

- 42 页 x 10 主题 = 420 组合 verifyAudit 全部 0 失败。
- node _混淆工具.js --check 输出 0 FAIL。
- 受影响页功能冒烟 + 控制台 0 error（13 页 IIFE 报错清零）。
- 移动端 375px 宽度全站截图无横向溢出。
- 冷加载复测（本机绕过 SW 清缓存三次）：FCP < 2.5s、DCL < 2s、TTFB 不劣化。
- 线上 GitHub Pages：SW v14 生效、favicon.ico 200、robots.txt 与 sitemap.xml 200。
- 30.html 可看到本轮新公告；版本记录、日志、备份三件套齐全。

# 6. 风险与未决事项

- 浏览器自动化后端偶发 COMMAND_TIMEOUT：大批量回归用 CDP 串行，超时 resync 一次，不无限重试；23/32 页持续超时则以截图人工复核兜底。
- 17 页数据抽离在 file:// 直开场景受限：选用 script 标签方案而非 fetch，避免本地验证失败。
- F-3 第三步（关键样式内联）改动面大、有主题闪烁风险：单独测试，若收益不达标可只交付前两步。
- F-5 去掉 IIFE 后可能引入同名全局变量冲突：改造前先查重，逐页冒烟。
- F-6 重建 1.html 会一并上线源码中其它未发布改动：公告中如实说明。
- 本轮为只读规划，未作任何代码改动；待用户回复确认后方可开始执行。

# 7. 建议

- 建议先执行批次 A 四项快赢：独立、零依赖、当天可交付，为后续批次积累发布节奏。
- 建议冷加载只做 F-3 前两步：清理残留主题块加背景外置，即可减负约 2MB 且零行为变化，第三步视前两步实测效果再定。
- 建议 17 页用 script 标签抽数据而非 fetch：本地与线上双端兼容，SW 可预缓存，回归成本最低。
- 建议发布闭环统一收口在批次 D：SW bump、公告、三件套一次做齐，避免多次发布遗漏检查项。