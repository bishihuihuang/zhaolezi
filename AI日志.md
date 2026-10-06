# AI 日志（工作定案记录）

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
