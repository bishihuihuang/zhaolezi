# -*- coding: utf-8 -*-
"""抽取 AI 提示词系统的 21 个主题变量定义 → zhaolezi 主题素材"""
import io, re, json

src = r'E:\上传网页\ai-prompts\_dist\AI提示词系统\AI提示词管理.html'
c = io.open(src, 'r', encoding='utf-8-sig').read()

# 抽取所有 :root[data-theme="X"]{...} 块
themes = {}
for m in re.finditer(r':root\[data-theme="([a-zA-Z-]+)"\]\s*\{', c):
    name = m.group(1)
    start = m.end()
    # 找匹配的 }
    depth = 1
    i = start
    while depth > 0 and i < len(c):
        if c[i] == '{': depth += 1
        elif c[i] == '}': depth -= 1
        i += 1
    themes[name] = c[start:i-1]

print('主题数:', len(themes), list(themes.keys()))
# 变量名全集
allvars = set()
for body in themes.values():
    for vm in re.finditer(r'--([a-zA-Z0-9-]+)\s*:', body):
        allvars.add(vm.group(1))
print('变量数:', len(allvars))
print('变量列表:', sorted(allvars))

# 输出每主题的 --bg/--card/--txt/--gold 摘要
for n, b in themes.items():
    g = {}
    for k in ['bg', 'card', 'card-2', 'txt', 'dim', 'gold', 'gold-2', 'line']:
        m = re.search(r'--' + k + r':([^;]+);', b)
        g[k] = m.group(1).strip() if m else '-'
    print(n, '| bg:', g['bg'], '| card:', g['card'], '| txt:', g['txt'], '| gold:', g['gold'])

# 保存到 JSON 供后续使用
out = {n: b.strip() for n, b in themes.items()}
io.open(r'E:\上传网页\zhaolezi\_theme_vars.json', 'w', encoding='utf-8').write(json.dumps(out, ensure_ascii=False, indent=1))
print('已保存 _theme_vars.json')
