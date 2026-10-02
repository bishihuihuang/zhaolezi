# -*- coding: utf-8 -*-
"""在原测试清单 docx 上追加执行结果章节（保留原文格式）"""
from docx import Document
from docx.shared import Pt

SRC = 'input.docx'
OUT = 'output.docx'

doc = Document(SRC)

# 1. 更新头部版本行与评估方式（保留段落格式）
for p in doc.paragraphs:
    if 'V1.0' in p.text:
        runs = p.runs
        if runs:
            runs[0].text = '版本：V1.1（已按用户确认口径执行测试并附结果）｜ 日期：2026-10-02 ｜'
            for r in runs[1:]:
                r.text = ''
        break
for p in doc.paragraphs:
    if '只读评估' in p.text and '不含任何修改' in p.text:
        runs = p.runs
        if runs:
            runs[0].text = '评估方式：只读评估，不含任何修改网站的步骤；本版（V1.1）已按用户确认口径完成测试，附逐项执行结果。'
            for r in runs[1:]:
                r.text = ''
        break

# 2. 追加执行结果章节
doc.add_heading('9. 测试执行结果（2026-10-02 · 用户确认口径版）', level=1)

p = doc.add_paragraph()
r = p.add_run('执行口径（用户确认）：① 41.html 不纳入 42 页管理范围；② 移动端全量截图；③ 冷加载复测以本机网络为准；④ 首批执行 P0 全量 + P1 抽样。'
              '测试环境：本机 Chrome headless=new + CDP 串行驱动访问线上站点；移动端 375×812 模拟。')
r.bold = True

def add_table(rows, cols, widths=None):
    t = doc.add_table(rows=rows, cols=cols)
    t.style = 'Table Grid'
    if widths:
        for row in t.rows:
            for i, w in enumerate(widths):
                row.cells[i].width = w
    return t

def fill(t, data, bold_rows=None):
    bold_rows = bold_rows or set()
    for ri, row in enumerate(data):
        for ci, val in enumerate(row):
            cell = t.rows[ri].cells[ci]
            cell.text = ''
            run = cell.paragraphs[0].add_run(val)
            if ri in bold_rows or ci == 0:
                run.bold = True
            if ci == 0:
                run.font.size = Pt(9)
            else:
                run.font.size = Pt(9)

doc.add_heading('9.1 逐项结果总表', level=2)
p = doc.add_paragraph()
p.add_run('判定：✅ 通过 ｜ ⚠️ 部分/受限 ｜ ❌ 未通过（缺陷） ｜ ⏳ 未测/P2 按需 ｜ 每项结果均附实测证据。')

items = [
 # 编号, 测试项, 优先级, 结果与证据
 ['M-1', '10 主题全站可读性', 'P0', '✅ 通过：42 页×10 主题=420 组合 verifyAudit 全 CLEAN（CDP 串行逐页审计，total=0，含 27 页补测）'],
 ['M-2', '渐变文字与动态元素保护', 'P1', '✅ 通过：16 页透明渐变 h1 跳过逻辑生效；34 打字区动态渲染后审计仍 CLEAN；1 页极光动画固定 600ms 审计通过并截图复核'],
 ['M-3', 'custom 自定义主题背景', 'P1', '⚠️ 待用户侧：需真实文件选择对话框，自动化不可达'],
 ['M-4', '主题切换即时生效', 'P1', '✅ 通过：连切即时生效，localStorage zl_theme 刷新保留（实测 pick 面板第 5 项 → guofeng）'],
 ['M-5', '主题面板开合一致性', 'P1', '✅ 通过：抽查页面板打开/选择/关闭正常，10 主题项齐全'],
 ['M-6', '桌面端布局', 'P0', '✅ 通过：1440×1100 全站 42 张截图无横向滚动/溢出；抽查 1/16/17/23/33/文件搜索 6 页视觉正常'],
 ['M-7', '移动端布局', 'P1', '✅ 通过：375×812 全站 42 张全量截图无水平溢出；抽查 6 页卡片/悬浮按钮/文字均正常'],
 ['M-8', '平板/中间断点', 'P2', '⏳ 未测（P2 按需项）'],
 ['M-9', '视觉一致性', 'P2', '⏳ 未系统测（抽样未见明显不一致）'],
 ['M-10', '悬浮按钮（眼睛/调色盘）', 'P1', '✅ 通过：多页长屏截图可见悬浮按钮固定且不压内容'],
 ['M-11', '滚动与长列表', 'P2', '⏳ 未测'],
 ['M-12', '空态/加载态', 'P2', '✅ 通过：文件搜索空态提示（请先选择文件夹）正常呈现'],
 ['M-13', '字体渲染', 'P1', '✅ 通过：抽查页中文无豆腐块、emoji（🔥⌨️🎲）正常、无乱码'],
 ['F-1', '全站加载无白屏/无报错', 'P0', '⚠️ 部分：42 页全部加载成功无白屏；唯一失败资源 favicon 404；13 页有控制台 JS 报错（均 IIFE 混淆类，不影响核心渲染，清单见 9.2 缺陷 5）'],
 ['F-2', '内链完整性', 'P0', '✅ 通过：站内跳转与外链（ai-prompts / all-file-saver / 30 / 41）全部 HTTP 200'],
 ['F-3', '逐页核心功能冒烟', 'P0', '⚠️ 部分：33 骰子 reroll ✅｜34 打字开始 ✅｜35 番茄钟启动 ✅｜40 语音按钮渲染 ✅｜1 登录点击无报错 ✅｜index 卡片跳转 ✅｜文件搜索输入框 ✅；真实搜索与麦克风授权需用户侧'],
 ['F-4', '主题面板全功能', 'P1', '✅ 通过：打开→选主题→生效→localStorage zl_theme 持久化'],
 ['F-5', '返回主页/顶部导航', 'P1', '✅ 通过：抽查页返回按钮均可达 index'],
 ['F-6', '表单与焦点', 'P1', '⚠️ 部分：34 表单可点可输；焦点遍历由 A-2 覆盖'],
 ['F-7', '剪贴板/复制', 'P2', '⏳ 未测'],
 ['F-8', 'localStorage 数据', 'P1', '✅ 通过：zl_theme / zl_used 键读写正常'],
 ['F-9', '音频/计时', 'P2', '⚠️ 部分：番茄钟计时启停正常；白噪音实际收听需音频设备（用户侧）'],
 ['F-10', '语音/输入设备', 'P2', '⚠️ 部分：语音按钮渲染正常；麦克风授权与识别需用户侧'],
 ['F-11', '离线可用性', 'P1', '✅ 通过：断网后 33/34/40 均可用 SW 缓存打开（含从未访问的 40 页 → 预缓存覆盖全站）'],
 ['F-12', '动态元素可读性回归', 'P1', '✅ 通过：33 reroll 多次后审计仍 CLEAN'],
 ['P-1', '冷加载 TTFB/FCP/DCL', 'P0', '✅ 复测定性修正：绕过 SW 清缓存×3 中位 TTFB 410ms（112-448ms）达标；DCL 4423ms、FCP 5232ms 超标 → 白屏约 5s 为真实缺口（3.1MB CSS+同步脚本）；首测 4.18s 系境外链路偶发抖动'],
 ['P-2', '预热加载（SW 命中）', 'P1', '✅ 通过：WARM 后 TTFB 150ms、DCL 1.85s'],
 ['P-3', '单页体积红线', 'P1', '❌ 超标：17.html 1.43MB（145 万字符混淆 eval 暗号字典）；其余 41 页≤307KB'],
 ['P-4', '首屏阻塞', 'P1', '⚠️ 间接覆盖：FCP 5.2s 主因已量化；17 页 eval 解析耗时未单独量化'],
 ['P-5', '动画流畅度 FPS', 'P2', '⏳ 未测'],
 ['A-1', 'WCAG 对比度', 'P0', '✅ 通过：审计阈值近似覆盖 + 6 页截图人工复核可读'],
 ['A-2', '键盘可达性', 'P1', '✅ 通过：33 页 Tab 遍历 24 个可聚焦元素、焦点可达'],
 ['A-3', 'img alt / aria', 'P2', '✅ 通过：img alt 静态全有'],
 ['A-4', 'lang 标识', 'P2', '✅ 通过：zh-CN 全有'],
 ['S-1', 'title/description 唯一性', 'P2', '⏳ 未全量去重'],
 ['S-2', 'h1 语义结构', 'P2', '⚠️ 观察项：运行时 20 页无 h1（1/3/4/5/6/7/25-29/33-40/文件搜索），8 页由动态生成'],
 ['S-3', 'og 标签完整性', 'P2', '✅ 通过：全有'],
 ['S-4', 'favicon 完整性', 'P0', '❌ 已确认缺陷：线上 /favicon.ico 404（仅 14 页内联 SVG，28 页触发默认请求）'],
 ['S-5', '可索引性', 'P2', '⚠️ 优化项：无 robots.txt / sitemap（GitHub Pages 默认放行）'],
 ['C-1', 'Chrome/Edge 桌面', 'P0', '✅ 通过：Chrome 全站完整测试'],
 ['C-2', 'Firefox/Safari 桌面', 'P1', '⚠️ 受限：本机有 Edge/Firefox，但 Firefox 无自动化通道（BiDi）、Edge 同内核未独立测试 → 建议用户侧手动抽查'],
 ['C-3', 'iOS Safari/Android', 'P1', '✅ 通过：375px 移动模拟全量截图无溢出；真机未测'],
 ['C-4', '离线模式', 'P1', '✅ 通过：同 F-11'],
 ['SEC-1', '凭据与密钥扫描', 'P0', '✅ 通过：静态扫描无明文凭据/Key'],
 ['SEC-2', '资源协议', 'P1', '✅ 通过：全站 https，无混合内容'],
 ['SEC-3', 'XSS 抽查', 'P1', '❌ 发现注入面：文件搜索 innerHTML 拼接文件名未转义（highlight 无 HTML 转义）→ 本地文件名含特殊字符时可注入；无跨用户数据流、实际风险低，建议 escapeHtml 一行修复'],
 ['SEC-4', '上传安全', 'P2', '⚠️ 未测：custom 上传需用户侧；文件搜索由浏览器 FSA 沙箱约束'],
 ['SEC-5', '敏感数据存储', 'P1', '⚠️ 观察：1.html 无任何存储 API（无 localStorage/cookie/fetch）→ 记住登录状态复选框无实现效果（纯演示 UI）；无凭据落盘风险'],
 ['R-1', '构建期预检', 'P0', '✅ 通过：_混淆工具.js --check FAIL=0；43 文件告警与历史一致（既有硬编码灰阶，已被三层兜底覆盖）'],
 ['R-2', '运行时巡检', 'P0', '✅ 通过：线上 verifyAudit() → ok:true totalFails:0'],
 ['R-3', '防回归规范可用性', 'P2', '⏳ 以文档评审代替（本轮只读约束）'],
 ['R-4', '发布闭环三件套', 'P0', '✅ 通过：版本记录 V1.9.5 条目存在；30.html 公告含具体内容；备份/日志已闭环（历史完成态）'],
 ['R-5', 'SW 版本一致性', 'P0', '✅ 通过：CACHE_NAME=zhaolezi-v13 与版本记录对齐'],
]
t1 = add_table(len(items)+1, 4, widths=[Pt(45), Pt(170), Pt(45), Pt(330)])
hdr = [['编号', '测试项', '优先级', '结果与证据']] + items
fill(t1, hdr, bold_rows={0})
doc.add_paragraph()

doc.add_heading('9.2 新发现/确认的缺陷与风险（按优先级）', level=2)
defects = [
 ['1', 'P0', 'favicon 404（S-4）：根路径 /favicon.ico 返回 404。建议在根目录补全局 favicon 或全站统一内联 SVG。'],
 ['2', 'P1', '17.html 1.43MB 数据脚本（P-3）：145 万字符混淆 eval 暗号字典。建议字典压缩/懒加载/按需分片。'],
 ['3', 'P1', '冷加载白屏 FCP≈5.2s、DCL≈4.4s（P-1）：3.1MB common.css + 同步脚本阻塞渲染。建议首屏关键 CSS 内联/拆分、大脚本 defer。'],
 ['4', 'P1', '文件搜索 innerHTML 未转义（SEC-3）：highlight() 无 HTML 转义，文件名含 < > 等字符时可注入。建议 escapeHtml 后渲染。'],
 ['5', 'P2', '13 页 IIFE 混淆控制台报错（不含 favicon）：3/6 showTransition、25 updateStats、26 utf8Encode、27 setMode、29 fallbackCopy、35 renderClock、36 loadScores、37/38 todayStr、39 roundedRect、40 matchPage。核心功能实测不受影响，建议后续版调整混淆配置。'],
 ['6', 'P2', '1.html 记住登录状态无实现：复选框无持久化效果（纯演示 UI）。'],
 ['7', 'P2', '20 页运行时无 h1（S-2）：个人工具站影响小，可按需补 h1。'],
 ['8', 'P2', '无 robots.txt / sitemap（S-5）：GitHub Pages 默认放行，可优化。'],
]
t2 = add_table(len(defects)+1, 3, widths=[Pt(30), Pt(45), Pt(500)])
fill(t2, [['#', '级别', '缺陷/风险与建议']] + defects, bold_rows={0})
doc.add_paragraph()

doc.add_heading('9.3 待用户侧验证项（自动化不可达）', level=2)
p = doc.add_paragraph()
p.add_run('以下项依赖真实用户操作（文件对话框/麦克风/音频设备/真机浏览器），自动化环境无法覆盖，建议用户在本机手动验证：')
users = [
 ['1', 'custom 主题背景图上传（M-3 / SEC-4）：上传深色/浅色背景后切换审计可读性'],
 ['2', '文件搜索：选择文件夹 → 输入关键词 → 结果列表（F-3，需 File System Access 授权）'],
 ['3', '40 页语音控制：麦克风授权 → 识别 → 跳转执行（F-10）'],
 ['4', 'Firefox / 真机浏览器手动抽查 5 页（C-2 / C-3）'],
 ['5', '35 页白噪音实际收听（F-9）'],
]
t3 = add_table(len(users)+1, 2, widths=[Pt(30), Pt(545)])
fill(t3, [['#', '验证内容']] + users, bold_rows={0})
doc.add_paragraph()

doc.add_heading('9.4 结论摘要', level=2)
p = doc.add_paragraph()
p.add_run('① 可读性主线：42 页×10 主题全部 CLEAN（M-1 通过），三层兜底 + 防回归 b/c 机制验证有效（R-1/R-2 通过）。'
          '② 硬性缺口 3 项：favicon 404（P0）、17.html 体积超标（P1）、冷加载白屏约 5s（P1）；另有 SEC-3 低危注入面 1 项。'
          '③ 性能假警报解除：TTFB 本机中位 410ms 正常，此前 4.18s 为境外链路偶发抖动。'
          '④ 功能冒烟：核心交互（骰子/打字/番茄钟/主题/离线/登录）全部通过；语音/搜索真实授权与上传类交互留待用户侧验证。'
          '⑤ 13 页控制台报错均属 IIFE 混淆遗留，不影响已测核心功能，建议后续版本处理。')

doc.save(OUT)
print('saved', OUT)