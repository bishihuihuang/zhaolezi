# AI 日志（工作定案记录）

## 2026-10-06 V2.2.1 词典备份 + PWA 离线修复（git `9bd0a27`）

上一轮 V2.2.0 审计后按性价比选了两个方向落地（其余候选未做，见文末「遗留候选」）。

### 一、23 页收藏备份导出/导入（工具脚本/rebuild_23.js）
- 工具栏新增「📦 备份」按钮 + 隐藏 `input[type=file]`，样式对齐 `hist-chip`。
- 导出：`{version:1, favs, hist, exportedAt, source:'zhaolezi-23'}` → `ZL.download(filename, JSON, 'application/json')`，文件名 `zhaolezi-dict-YYYYMMDD.json`；`ZL.download` 缺失时降级为 `Blob + a.download`。
- 导入：`FileReader.readAsText` → `doBackupImport(text)`：
  - `version !== 1` → 拒绝并 toast「备份版本不匹配（需 v1，收到 vN）」
  - JSON 非法 → 拒绝并 toast「JSON 解析错误」
  - 缺 `favs/hist` 字段 → 拒绝并 toast
  - 通过则**合并去重**：现有收藏在前，新收藏追加，重复项过滤；历史写入前截断到 `maxHist`；调用 `renderHistory()`，若处于 `fav` tab 则刷新 `favView()`、若输入框有值则重跑 `doSearch(true)`。
- 全部走 `ZL.toast`，无新依赖。

### 二、PWA 离线体验修复（service-worker.js，v68 → v75）
- **修复缺陷**：原 L167 静态资源 fetch `.catch` 返回 `undefined`，`respondWith` 无响应导致 23 页分片离线静默失败。改为 `.then(off => off || caches.match('./index.html'))`。
- **导航离线回退链**：网络失败 → `caches.match(request)` → `offline.html` → `index.html`（原直接兜到首页，断网打开 23.html 会得到首页而非 23 页缓存）。
- **ASSETS 追加 `./offline.html`** 入预缓存。
- `CACHE_NAME` 由混淆器 `bumpServiceWorker()` 自动递增到 `zhaolezi-v75`（每跑一次混淆就 +1，是既有行为）。

### 三、offline.html 离线兜底页
- 深色/浅色主题自适应：`background: var(--bg)`、`color: var(--txt)`、次要按钮用 `rgba(128,128,128,.15)` 中性灰，绕开预检「#fff 硬编码」和「深灰文字」两条告警。
- 内容：`📡` 图标 + 标题 + 「🔄 重试」（监听 `online` 事件，700ms 后 `location.reload()`）+「🏠 回到首页」。
- 加入 `_混淆工具.js` `NO_OBFUSCATE = ['30.html', '文件搜索.html', 'offline.html']`，走源→目标直拷（不混淆内联脚本）。

### 四、公告与版本
- 30 页公告追加 V2.2.1 条目（源副本 `_原始未混淆版/30.html` + 混淆器生成根目录）。

### 五、验收（Node 验收门）
- `node 工具脚本/test_23_runtime.js` → **全部通过**（原 44 项 + 新增 12 项备份用例：导出 payload/文件名/MIME/version/favs/hist、合法导入、拒绝非法 JSON、拒绝版本不匹配、去重合并、hist 写入）。
- `node --check service-worker.js` → 通过。
- `node _冒烟自检.js` → 48 / 49（豁免 1，与基线一致）。
- 全量预检 → FAIL 0，49 页告警（新增 `offline.html` 1 条 `#fff` 误报——按钮渐变紫底配白字，非真缺陷）。

### 遗留候选（未做）
- **23 页数据 gzip**（22.56 MiB → 3-5 MiB）：需先确认生产部署形态（静态托管 / Python 后端 / 二者并行），本轮未定案。若走方案 3（仅把 `_serve.js` 的 `.json` 从 `no-cache` 改为 `max-age=86400`）可零业务改动落地浏览器强缓存，但不解决首访流量。
- **46.html 成就中心**：审计确认 `checkAch()` 只在完成本轮时触发（`endCycle`、`finishFree`），中间状态不触发是设计意图，非 bug。
- **38.html 成就中心防御性判断**：`renderHeader` 里 4 次 `(window.ZL && ZL.ACHIEVEMENTS)` 是洁癖，不影响功能。

---

## 2026-10-06 V2.2.0 上线后审计（git `42efa67`）

新增 `工具脚本/audit_ach_wiring.js`：解析成就目录 + 扫全站 `ZL.bump` 写入点（含解码根目录独占页的内联脚本），输出孤儿指标与条件型成就判据，可作回归门。跑出来的结论：94 条成就、38 种指标、tier 分布 52/24/12/6、8 类与 `ZL.CATS` 对齐。

**P0 缺陷（已修）**：`46.html` 的 `checkAch()` 末行调用 `gachAch()`，但该函数在整个文件中从未定义。每次番茄/自由专注完成都在末行抛 ReferenceError；调用点（`endCycle`、`finishFree`）没有 try/catch，异常向上冒泡中断后续收尾——成就解锁、toast、ding、`renderAll`、自动进入下一轮全部跳过，用户表现为「番茄完成了但没有任何反馈」。同时 `focus_25done`（一次专注满 25 分钟）是唯一的孤儿指标，成就永不可达。修法：删掉整段旧本地成就判断（逻辑已并入全站目录 `tomato_1/10`、`focus_7d`、`focus_100h`，由 `checkAll` 统一判定），`gach()` 补 `focus_25done` 写入点。审计由「孤儿 1」变「孤儿 0」，三个测试门仍全绿。

**P1 遗留（未修，需定夺）**：`46.html` 保留了一套 V1 本地成就系统（`ACHS` 6 条 + `S.ach` 本地存储 + `achGrid` 渲染），与全站目录的 5 条专注/习惯类成就（`tomato_1`、`tomato_10`、`focus_7d`、`focus_100h`、`focus_free60`）语义重复，用户在同一区块看到两组不同名的成就，且 `S.ach` 已成死代码（`unlock()` 已无调用点）仍随导出/import 往返。

**主题治理**：`_theme_audit.js` 仍报 2099 处硬编码色 / 48 页，未接变量体系的是 24.html（111 处，最重）等 8 页。

**P1/P2 候选（下一轮）**：23 词典详情弹层 / 收藏导出 / 自测+语速；`23data` gzip（21MB 分片 + 1.9MB zh_top）；五子棋搜索、每日一题作答、井字棋轮换、扫雷移动端、33 打通、38 签到合并。

**工具链限制**：本次会话浏览器不可用（IAB `browser guest not attached`；本轮 `mcp__node_repl__js` 不在工具列表；Tabbit `CLI_REGISTRATION_UNAVAILABLE`），真机验收仍未做。46.html 内联脚本是明文未被混淆，可直接 grep（与其他页不同）。

---


## 2026-10-06 V2.2.0 成就系统全站融合

### 交付内容
- `zl-features.js`：成就目录 94 条（基础 52 / 中级 24 / 高级 12 / 隐藏 6），新增数据层
  `zl_ach` / `zl_ach_meta` / `zl_ach_new`，API：`ZL.bump(metric,n,mode)`、`ZL.unlock(id,silent)`、
  `ZL.checkAll(silent)`、`ZL.trackPage(pageKey)`、`ZL.drainNew()`、`ZL.achInfo/achScore/achTitle`，
  成就积分与 6 级头衔，`dataMigration('ach_v2','2.2.0')`；跨 tab 同步走 `ZL.on/emit` +
  BroadcastChannel + storage 兜底。
- 38 页成就中心重做：分类筛选、进度环、稀有度标注、未解锁线索提示、积分与头衔展示。
- 全页埋点：`ZL.trackPage` 在 `zl-features.js` 内自动调用（48 页全覆盖，仅排除门禁/导航页
  1/2/3/4/10/28/29/30），各页业务动作埋 `ZL.bump`（35 阅读、37 答题含连击 max、44 学习、
  46 番茄 `focus_min` 与番茄数、23/搜索 `search_use`）。
- 46 番茄钟并轨：`tomato_1` 修正为 `metric:'focus_min', target:25`（原指标无人写入）。
- 44 学习中心嵌入成就速览卡；首页新增「成就徽章」挂件显示已解锁数。
- 弹卡卡片化：`_showAchCard` 右上角依次弹出、可点击直达成就中心、5s 自动消失、
  `zl_ach_new` 队列消费（DOM 未就绪时不清队）。
- 30 页公告新增 V2.2.0 条目；`APP_VER` 升 `2.2.0`，VERSION_LOG 补条，`whatsNew()` 自动触达。
- `service-worker.js` 缓存 `zhaolezi-v67`。

### 验收结果（Node 验收门）
- `node 工具脚本/test_ach_logic.js` → 通过 40 / 失败 0（含 cond 条件解锁、trackPage 去重、
  同页连续 7 天隐藏成就、unlock 幂等与元数据、积分头衔、迁移幂等）。
- `node _冒烟自检.js` → 通过 47 / 48（豁免 1 为既有约定）。
- `node _v2_logic_test.js` → 通过 25 / 25（原先 2 项硬编码 `2.0.0` 的断言改为对照
  `ZL.APP_VER` 动态判定，避免后续升版再次误报）。
- 产物层验证：内联 JS 被 base64+eval 混淆，grep 字面量无效，故解码校验——
  46.html 含 7 处 `ZL.bump`、`focus_min` 写入已落地；37 含 `quiz_right`/`quiz_streak`('max')；
  35 含 3 处 `ZL.bump`；44 含 `learn_day` 与 12 处「成就」；38 含 `ACHIEVEMENTS`/积分/头衔；
  index 含 9 处「成就」。

### 踩坑记录
- `30.html` 在 `_原始未混淆版/` 无手工副本时，`_混淆工具.js` 会以根目录版本为基准生成
  源副本（不混淆直拷），随后**再次运行会用它回写覆盖根目录**。因此对 30 页的任何修改必须
  落到 `_原始未混淆版/30.html`，根目录文件会被下一次构建覆盖。本次先误改根目录导致公告条目
  丢失、已修复并在两处保持一致。
- 混淆产物中 `ZL.bump` 等调用被编码为 base64，源码层验收 grep 必须在 `_原始未混淆版/` 或
  `zl-features.js` 上做；产物层需用 base64 解码后再校验。

### 未完成 / 待补
- 本次会话内嵌浏览器未就绪（`browser guest not attached`）、Tabbit CLI 注册失效，未能做
  IAB 真机点击验收；成就链路的逻辑、埋点与产物完整性已由上述 Node 门与解码校验覆盖。
  浏览器恢复后建议复核：解锁瞬间弹卡出现与点击跳转、首页挂件计数刷新、跨 tab 同步。
