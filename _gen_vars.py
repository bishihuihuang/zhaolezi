# -*- coding: utf-8 -*-
"""生成 zhaolezi 22 主题变量 CSS（dark 默认 + 21 套两项目同款）→ 追加到 common.css"""
import io, json

THEMES = ['blue','gold','light','milk','guofeng','juju','snowsun','nostalgia','garden','coco',
          'cyber','ink','nebula','sakura','desert','ocean','aurora','steampunk','forest','moon','custom']
LABELS = {'blue':'经典蓝','gold':'鎏金','light':'明亮','milk':'牛奶','guofeng':'国风','juju':'幽蓝',
          'snowsun':'雪阳','nostalgia':'怀旧','garden':'花园','coco':'可可','cyber':'赛博','ink':'水墨',
          'nebula':'星云','sakura':'樱花','desert':'沙漠','ocean':'海洋','aurora':'极光','steampunk':'蒸汽朋克',
          'forest':'森林','moon':'月光','custom':'自定义蓝','dark':'深色流光'}

vars_json = json.loads(io.open(r'E:\上传网页\zhaolezi\_theme_vars.json', 'r', encoding='utf-8').read())

def pick(body, key, default=''):
    import re
    m = re.search(r'--' + key + r':([^;]+);', body)
    return m.group(1).strip() if m else default

# dark 默认主题（zhaolezi 现有视觉）
dark = '''    :root {
        --bg: #0a0e27;
        --bg-dim: #161a3d;
        --card: rgba(245, 247, 255, .96);
        --card-2: #ffffff;
        --txt: #333333;
        --dim: #666666;
        --line: #e8e8e8;
        --gold: #ff6b6b;
        --gold-2: #ffd700;
        --gold-grad: linear-gradient(135deg, #ff6b6b, #ffa500, #ffd700, #ff6b6b);
        --blue: #667eea;
        --green: #11998e;
        --purple: #764ba2;
        --red: #ff6b6b;
        --glow: #667eea;
        --glow-2: #ffa500;
        --glow-3: #38ef7d;
        --radius: 16px;
        --shadow: 0 25px 70px rgba(0, 0, 0, .35);
        --btn-txt: #ffffff;
        --title-grad: linear-gradient(135deg, #ff6b6b, #ffa500, #ffd700, #ff6b6b);
        --back-grad: linear-gradient(135deg, #11998e, #38ef7d);
        --btn-grad: linear-gradient(135deg, #667eea, #764ba2);
        --flow-grad: linear-gradient(125deg, #0a0e27, #161a3d, #1f1652, #331d6e, #1d1b4b, #0f122f, #241a54);
        --scroll-thumb: linear-gradient(180deg, #667eea, #764ba2);
    }'''

blocks = [dark]
for t in THEMES:
    b = vars_json[t]
    g = {
        'bg': pick(b, 'bg'), 'bg-dim': pick(b, 'bg-dim'), 'card': pick(b, 'card'),
        'card-2': pick(b, 'card-2'), 'txt': pick(b, 'txt'), 'dim': pick(b, 'dim'),
        'line': pick(b, 'line'), 'gold': pick(b, 'gold'), 'gold-2': pick(b, 'gold-2'),
        'blue': pick(b, 'blue'), 'green': pick(b, 'green'), 'purple': pick(b, 'purple'),
        'red': pick(b, 'red'), 'glow': pick(b, 'glow'), 'glow-2': pick(b, 'glow-2'),
        'glow-3': pick(b, 'glow-3'), 'radius': pick(b, 'radius'), 'shadow': pick(b, 'shadow'),
        'btn-txt': pick(b, 'btn-txt'), 'gold-grad': pick(b, 'gold-grad'),
    }
    block = '''    :root[data-theme="%s"] {
        --bg: %s; --bg-dim: %s;
        --card: %s; --card-2: %s;
        --txt: %s; --dim: %s;
        --line: %s;
        --gold: %s; --gold-2: %s;
        --blue: %s; --green: %s; --purple: %s; --red: %s;
        --glow: %s; --glow-2: %s; --glow-3: %s;
        --radius: %s;
        --shadow: %s;
        --btn-txt: %s;
        --title-grad: linear-gradient(135deg, var(--glow), var(--gold), var(--gold-2));
        --back-grad: linear-gradient(135deg, var(--green), var(--blue));
        --btn-grad: linear-gradient(135deg, var(--gold), var(--gold-2));
        --flow-grad: linear-gradient(125deg, var(--bg), var(--bg-dim), var(--card-2), var(--bg), var(--bg-dim));
        --scroll-thumb: linear-gradient(180deg, var(--gold), var(--gold-2));
    }''' % (t, g['bg'], g['bg-dim'], g['card'], g['card-2'], g['txt'], g['dim'], g['line'],
            g['gold'], g['gold-2'], g['blue'], g['green'], g['purple'], g['red'],
            g['glow'], g['glow-2'], g['glow-3'], g['radius'], g['shadow'], g['btn-txt'])
    blocks.append(block)

css = '\n\n/* ============ V1.4 多主题变量体系（默认深色流光 + 21 主题，源自 AI提示词/全能文件保存） ============ */\n' + '\n'.join(blocks) + '\n'

# 主题面板样式（theme.js 生成 DOM 用）
css += '''
/* ============ V1.4 主题面板样式 ============ */
.zl-theme-panel {
    position: fixed;
    bottom: 74px;
    right: 16px;
    z-index: 2147483645;
    width: 272px;
    max-height: 320px;
    overflow-y: auto;
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 16px;
    box-shadow: var(--shadow);
    padding: 12px;
    display: none;
    color: var(--txt);
    scrollbar-width: thin;
}
.zl-theme-panel.open { display: block; }
.zl-theme-panel::-webkit-scrollbar { width: 6px; }
.zl-theme-panel::-webkit-scrollbar-thumb { background: var(--gold-2); border-radius: 3px; }
.zl-theme-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
}
.zl-theme-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 8px 4px;
    border: 1px solid var(--line);
    border-radius: 10px;
    cursor: pointer;
    background: var(--card-2);
    color: var(--txt);
    font-size: 11px;
    transition: transform .2s, box-shadow .2s;
}
.zl-theme-item:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(0,0,0,.18); }
.zl-theme-item.active { border-color: var(--gold); box-shadow: 0 0 0 2px var(--gold); }
.zl-theme-dot {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    border: 2px solid rgba(255,255,255,.5);
    box-shadow: 0 2px 8px rgba(0,0,0,.3);
}
.zl-theme-title { font-weight: 700; margin-bottom: 8px; font-size: 13px; }
'''

common_css_path = r'E:\上传网页\zhaolezi\common.css'
c = io.open(common_css_path, 'r', encoding='utf-8-sig').read()
if 'V1.4 多主题变量体系' in c:
    # 已存在则替换旧块
    s = c.find('/* ============ V1.4 多主题变量体系')
    e = c.find('\n/* ============================================================', s)
    c = c[:s] + css + c[e:]
else:
    c = c.rstrip() + css
io.open(common_css_path, 'w', encoding='utf-8-sig').write(c)
print('common.css 主题变量已写入，长度', len(c))

# 主题标签 JSON 供 theme.js 使用
io.open(r'E:\上传网页\zhaolezi\_zl_themes.json', 'w', encoding='utf-8').write(json.dumps(LABELS, ensure_ascii=False))
print('主题标签已存 _zl_themes.json')
