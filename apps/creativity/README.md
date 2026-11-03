# ✨ 创意引擎 · Muse

> 为灵感而生的本地创作工具箱 —— 12 个零依赖纯前端工具，全部数据在浏览器内完成，不上传、不联网、不收集。

纯 HTML / CSS / JavaScript，**零第三方依赖**，可直接部署到 GitHub Pages。支持 10 套主题、离线 PWA 缓存、成就与签到系统。

---

## 🚀 部署到 GitHub Pages（三步）

> 已在本目录准备好全部文件（含 `.nojekyll`、`404.html`、`sitemap.xml`、`service-worker.js`），上传即可运行，无需安装任何东西。

### 第 1 步：新建仓库

1. 打开 <https://github.com/new>
2. Repository name 填 `creativity`（或你喜欢的名字，**这个值决定你的访问网址**）
3. 选 **Public** → **不勾选**任何自动生成文件（README / .gitignore / LICENSE 本地已有同名文件）→ Create repository

### 第 2 步：上传本站文件

两种任选其一：

**方式 A · 网页拖拽（最简单，无需 Git）**
1. 进入新仓库 → 点 **Add file → Upload files**
2. 把本目录里的**所有文件和子目录**拖进去（含 `工具脚本/`、`.nojekyll`、`.gitignore`）
   - GitHub 页面不显示以点开头的隐藏文件时，可在文件管理器按 `Ctrl+Alt+.` 让它们可见
3. Commit changes

**方式 B · 命令行（推荐，后续更新方便）**

在本目录执行：

```bash
git init
git add -A
git commit -m "init: 创意引擎 Muse"
git remote add origin https://github.com/bishihuihuang/creativity.git
git branch -M main
git push -u origin main
```

**方式 C · 双击脚本（方式 B 的封装，已内置在 `上传到GitHub.bat`）**

```bash
上传到GitHub.bat  https://github.com/bishihuihuang/creativity.git
```

不带参数只执行 add + commit 不推送，方便你先看提交内容；脚本只增不删，不会 reset、不会 force push。如果你的 git 还没配过用户名/邮箱，脚本会写一份**本仓库本地**占位配置（不碰全局设置），按提示换成你自己的即可。

> ⚠️ **`上传到GitHub.bat` 必须保存为 GBK(ANSI) + CRLF 行尾，请勿转存为 UTF-8。**
> cmd.exe 读取 UTF-8 批处理时会错位断行，中文行会被当成命令执行而报一堆「不是内部或外部命令」。
> 若 VS Code 打开显示乱码，请在右下角编码处选 **以 ANSI 打开**（GB 2312/GBK），而不是「保存为 UTF-8」。

### 第 3 步：开启 Pages

1. 仓库页面 → **Settings** → 左侧 **Pages**
2. **Build and deployment → Source** 选 **Deploy from a branch**
3. **Branch** 选 `main`，**Folder** 选 `/ (root)` → Save
4. 等 1～2 分钟，GitHub 会给你网址：
   - 仓库项目 → `https://bishihuihuang.github.io/creativity/`
   - 自定义域名 → `https://www.你的域名/`

> 想换成自己的域名或换个仓库名？不用手工全局替换。站点地址出现在 14 个页面的 `<link rel="canonical">`、`index.html` 的 `og:url`、`robots.txt`、`sitemap.xml` 四处，一条命令统一改写：
>
> ```bash
> node 工具脚本/build.js --deploy https://bishihuihuang.github.io/creativity
> ```
>
> 方式 C 的 `上传到GitHub.bat` 会从这个仓库地址**自动推导**出站点地址并带上它，所以直接跑脚本就不用管这一步。改完后随时用 `node 工具脚本/build.js --check` 核对四处地址是否一致。

---

## 🧰 12 件工具

| 页 | 工具 | 做什么 |
|---|---|---|
| `1.html` | 💡 灵感火花 | 输入一个关键词，一次性吐出 6 个角度、30+ 个可用点子，带 SCAMPER 视角与「反着来」模式 |
| `2.html` | ✍️ 文案工坊 | 标语 / 标题 / 金句 / 广告语 / 祝福，按情绪与句式生成，一键复制 |
| `3.html` | 📌 摘要萃取 | 长文压成三档摘要（一句话 / 三句 / 要点清单），附关键词与核心句高亮 |
| `4.html` | 🔍 文本体检 | 字数、词频、词云、阅读与朗读时长、情感倾向、信息密度、可读性估算，导出报告 |
| `5.html` | 🎨 配色灵感 | HSL 取色、六种色彩和谐算法、WCAG 2.1 对比度实时计算、一键导出 CSS 变量 |
| `6.html` | 🖼️ 生成艺术 | 流场、树状分形、圆环编织、点阵场四种生成算法，手写 Perlin 噪声，导出 PNG |
| `7.html` | ⚖️ 决策矩阵 | 加权打分 + 敏感性分析（权重 ±30% 看结论是否翻转），雷达图对比 |
| `8.html` | 🎯 目标拆解 | SMART 检查 + 里程碑拆分 + 时间线甘特视图，进度持久化 |
| `9.html` | 📓 灵感记录本 | 速记卡、标签、筛选、批量导出 Markdown / JSON |
| `10.html` | 🔗 创意连线 | 词汇联想配对训练，含词表、计时、连击与成就 |
| `11.html` | 📖 创作方法库 | SCAMPER、奥斯本 30 条、六顶思考帽、SMART 等 8 套方法论，附可执行引导 |
| `12.html` | ℹ️ 关于与更新 | 版本记录、签到连续天数、成就墙、数据导出与清除 |
| `verify.html` | ✅ 全站自检 | 跑一遍全部公共能力，逐条报告通过 / 失败 |

---

## 🛠️ 本地预览与构建

预览（纯静态，任意方式都行）：

```bash
node 工具脚本/serve.js 8000    # 项目自带，零依赖
python -m http.server 8000     # 或
npx http-server -p 8000
```

浏览器打开 <http://127.0.0.1:8000>。

**构建 / 自检**（可选，改过页面或新增了页面后建议跑一次）：

```bash
node 工具脚本/build.js --check                   # 只检查，不写文件
node 工具脚本/build.js                           # 重新生成 sitemap.xml 与 service-worker.js
node 工具脚本/build.js --deploy https://bishihuihuang.github.io/creativity   # 同上，并统一改写站点地址
node 工具脚本/check_tokens.js                    # 设计令牌完整性审计（10 套主题 × 全部引用令牌）
```

`build.js` 会做这些事：
1. 从 `cy-features.js` 的 `CY.PAGES` 读出页面清单，校验文件是否都在；
2. 重生成 `sitemap.xml`（15 个 URL）与 `robots.txt`；
3. 刷新 `service-worker.js` 的 `PRECACHE` 清单，清单有变化时自动把 `CACHE_VERSION` 的 patch 号 +1（这是让老用户下次访问拿到新缓存的关键）；
4. 把每个页面的 `<link rel="canonical">` 与 `og:url` 统一写成 `--deploy` 指定的地址；
5. 对全部外部 JS 与 28 个内联 `<script>` 做语法冒烟测试，检查所有 `href` / `src` 引用的本地文件真实存在；
6. `--check` 模式下额外核对四处 URL 是否指向同一个地址、404 页是否带 `noindex`。

`check_tokens.js` 单独查三件最容易静默失败的事：页面引用的令牌是否有人定义、某套主题是否漏覆盖关键基础变量（导致 `--zl-*` 解析到旧主题的值）、首屏预加载脚本的主题白名单是否与 CSS 定义一致。退出码非 0 表示有问题。

---

## 🏗️ 目录结构

```
创意/
├── index.html          主站入口，12 宫格导航 + 主题 + 签到
├── 1.html ~ 12.html    12 个工具页
├── 404.html            GitHub Pages 自定义 404（5 秒后自动回首页）
├── verify.html         全站自检页
│
├── common.css          10 套主题 + UI 套件（按钮/卡片/表单/表格/统计块）
├── common.js           SW 注册、防误触保护、离线提示
├── theme.js            主题切换面板（浮球 + 10 主题 + 自定义配色）
├── cy-features.js      CY 全局库：事件总线、活动日志、签到、成就、版本迁移
│
├── manifest.json       PWA 清单
├── service-worker.js   离线缓存（清单由 build.js 生成，勿手改）
├── sitemap.xml         由 build.js 生成
├── robots.txt          允许全量抓取 + 指向 sitemap
├── .nojekyll           告诉 GitHub Pages 别用 Jekyll 处理
├── .gitignore
├── 上传到GitHub.bat    可选：封装 git add/commit/push 的上传脚本
│
├── favicon.svg         品牌图标（火花）
├── favicon.ico         IE / 旧浏览器
├── favicon-48.png      Apple touch icon
├── icon-192.png        PWA 图标
├── icon-512.png        PWA 图标（含 maskable 用途）
│
└── 工具脚本/
    ├── build.js        构建入口：sitemap + SW 升版 + URL 统一改写 + 冒烟自检
    ├── check_calls.js  调用点静态解析：JS 里被调用的元素 id 是否真的存在
    ├── check_tokens.js 设计令牌完整性审计（主题覆盖 / 别名层 / 预加载白名单）
    ├── serve.js        本地静态预览服务器（零依赖）
    └── gen-icons.js    图标生成脚本
```

### 架构约定

- **主题**：`common.css` 里用 `:root[data-theme="..."]` 定义 10 套主题，页面只引用 `--zl-*` 设计令牌别名，改主题不改页面。主题名在写入 localStorage 前先校验白名单，且首屏有个内联脚本在首帧前设好 `data-theme`，避免闪白。
- **公共库 `CY`**：所有工具页通过 `<script defer src="cy-features.js">` 拿到同一个 `CY` 命名空间。常用成员：
  - `CY.PAGES` / `CY.ACHIEVEMENTS` —— 全站唯一的页面与成就清单，改页面名在这里改
  - `CY.trackPage(name)` —— 页面自动登记访问，累计解锁成就
  - `CY.addActivity(days)` / `CY.streakDays()` —— 活动日志与连续天数
  - `CY.showToast(msg)` —— 统一浮层提示
  - `CY.contrastFix()` —— 低对比度自动补救，带 `MutationObserver` 监听主题切换
  - `CY.emit(evt, data)` —— 跨页事件总线，`BroadcastChannel('cy-muse')` 优先，降级到 `storage` 事件
  - `CY.APP_VER` / `CY.VERSION_LOG` / `CY.dataMigration(name, toVer, fn)` —— 版本与幂等数据迁移框架
- **localStorage**：一律 `cy_` 前缀；所有读取都走 `window.CY && CY.xxx` 防御式判断，因为公共脚本是 `defer` 的。
- **离线**：Service Worker 采用「缓存优先 + 后台静默更新」，导航请求失败时回退到 `index.html`。新增或删除页面后务必跑一次 `node 工具脚本/build.js`，否则清单不更新、老缓存不会失效。

### 防小白保护

`common.js` 里有一个自定义右键菜单和按键组合拦截器：屏蔽 F12 / Ctrl+U / Ctrl+Shift+I / Ctrl+S 等，保留 Ctrl+V / Ctrl+C / Ctrl+X / Ctrl+A / Ctrl+F 和 F5 —— 免得使用者把控制台打开后吓到，也免得误触改坏页面。

---

## 📦 后续更新流程

改了页面或加了新工具后，本地执行：

```bash
node 工具脚本/build.js      # 校验 + 更新清单
git add -A
git commit -m "feat: 说明改了什么"
git push
```

如果这次改动只涉及已有页面内容（没有增删页面），`PRECACHE` 清单不变，`CACHE_VERSION` 不会升 —— 但没关系，SW 的 fetch 策略是「命中缓存后照样把网络结果写回」，用户下一次访问自然拿到新内容。只有**新增或删除页面**时才需要升版，否则旧用户可能请求到一个缓存里没有的页面。

---

## 📄 许可

MIT —— 可自由使用、修改、再分发。不附带任何形式的担保。
