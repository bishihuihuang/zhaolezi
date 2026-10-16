import re

with open(r'E:\上传网页\zhaolezi\_原始未混淆版\10.html', encoding='utf-8') as f:
    content = f.read()

m = re.search(r'const icons = \[(.*?)\];', content, re.DOTALL)
arr_text = m.group(1)

# Parse groups
lines = arr_text.splitlines()
groups = []
cur_name = None
cur_items = []
for line in lines:
    s = line.strip()
    if s.startswith('//') and not s.startswith("'"):
        if cur_name is not None:
            groups.append((cur_name, cur_items))
        name_m = re.match(r'//\s*([^（]+)', s)
        cur_name = name_m.group(1).strip() if name_m else '未命名'
        cur_items = []
    elif s.startswith("'") or s.startswith(','):
        for e in re.findall(r"'([^']+)'", s):
            cur_items.append(e)
if cur_name is not None:
    groups.append((cur_name, cur_items))

# Collect 原100 items
orig100 = []
other_groups = []
for name, items in groups:
    if '原100' in name:
        orig100 = items
    else:
        other_groups.append((name, items))

# Which 原100 emojis are NOT in other_groups?
other_set = set()
for _, items in other_groups:
    other_set.update(items)
orig100_unique = [e for e in orig100 if e not in other_set]
print(f'原100 unique (only in 原100): {len(orig100_unique)}')
print(orig100_unique)

# Dedupe other_groups (against each other)
deduped = []
seen = set()
for name, items in other_groups:
    new = []
    for e in items:
        if e not in seen:
            seen.add(e)
            new.append(e)
    deduped.append((name, new))

print(f'\nOther groups after dedupe: {sum(len(x) for _,x in deduped)}')
for n,i in deduped:
    print(f'  {n}: {len(i)}')

# Build final structure: 原100 unique + other groups + new groups
# We'll add 原100 unique as new categories at the end (clocks, weather, misc symbols)
clocks = [e for e in orig100_unique if re.match(r'🕐|🕑|🕒|🕓|🕔|🕕|🕖|🕗|🕘|🕙|🕚|🕛', e)]
weather = [e for e in orig100_unique if e in ['🌙','☀️','🌧️','⚡','🌈','❄️','☃️','🌪️','🌊','💧','🌀']]
fruits_only = [e for e in orig100_unique if e == '🍇']
misc_symbols = [e for e in orig100_unique if e not in clocks + weather + fruits_only]

print(f'\nClocks: {len(clocks)}: {clocks}')
print(f'Weather: {len(weather)}: {weather}')
print(f'Fruits-only: {len(fruits_only)}: {fruits_only}')
print(f'Misc symbols: {len(misc_symbols)}: {misc_symbols}')

# New groups to add
faces = ['😀','😁','😂','🤣','😃','😄','😅','😆','😉','😊',
        '😋','😎','😍','😘','🥰','😗','😙','😚','🥲','😝',
        '🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶',
        '🙄','😯','😮','😲','😳','🥺','😦','😧','😨','😰',
        '😥','😢','😭','😱','😖','😣','😞','😓','😩','😫',
        '🥱','😤','😡','😠','🤬','😈','👿','👹','👺','🤡',
        '👻','💀','☠️','👽','🤖','😺','😸','😹','😻','😼',
        '😽','🙀','😿','😾','😌','😔','😪','🤤','😴','🙊',
        '🤢','🤮','🤧','😷','🤒','🤕','🤠','🥳','🤓','🧐',
        '🥴','🤪','🤩','🥵','🥶','🥴','🤯','🤷','🤷‍♀️','🤷‍♂️']
hands = ['👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞',
        '🤟','🤘','🤙','👈','👉','👆','👇','☝️','👍','👎',
        '✊','👊','🤛','🤜','👏','🙌','👐','🤲','🙏','💪',
        '🦾','✍️','🤳','🫵','👀','👁️','👅','👄','💋','🦶',
        '👣','👂','👃','🫶','🤝','🫱','🫲','🫳','🫴','🫰']
body_people = ['👶','🧒','👦','👧','🧑','👩','👨','🧓','👵','👴',
              '👲','🧕','👳','👮','👷','🤴','👸','🤵','🤶','👼',
              '🤰','🤱','🦹','🦸','🦹‍♀️','🦸‍♀️','🦹‍♂️','🦸‍♂️','🧙','🧚',
              '🧛','🧜','🧝','🧞','🧟','💂','🕵️','👩‍🚀','👨‍🚀','👩‍🍳',
              '👨‍🍳','👩‍🎓','👨‍🎓','👩‍🎤','👨‍🎤','👩‍🎨','👨‍🎨','👩‍💻','👨‍💻','👩‍💼',
              '👨‍💼','👩‍🔧','👨‍🔧','👩‍🏫','👨‍🏫','👩‍🏭','👨‍🏭','👩‍⚕️','👨‍⚕️','👩‍🔬',
              '👨‍🔬','👩‍💻','👨‍💻','👩‍🎄','👨‍🎄','👩‍🌾','👨‍🌾','👩‍✈️','👨‍✈️','👩‍🚒']
sports = ['⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱',
         '🪀','🏓','🏸','🏒','🏑','🥍','🏏','🪃','🥅','🥊',
         '🥋','🎽','⛳','🪁','🏹','🎣','🤿','🥌','🎯','🎳',
         '🎲','🎴','🁣','🀄','🃏','🎴','🎲','🎰','🎰','🪩']
instruments = ['🎵','🎶','🎼','🎸','🎹','🎺','🎻','🥁','🪕','🪗',
              '🪘','🪈','🎷','🎻','🎸','🎺','🎹','🥁','🎙️','🎚️',
              '🎛️','🎞️','🎟️','🎫','🎽','🎪','🎤','🎧','🎼','🎵',
              '🎶','🎵','🎶','🎵','🎶','🎼','🎼','🎵','🎶','🎵']
new_emojis = ['🫡','🫠','🪪','🤌','🫶','🧿','🪆','🪧','🫣','🫢',
             '🫥','🫸','🫷','🪤','🪫','🪣','🪜','🪟','🪠','🪥',
             '🪛','🪚','🪙','🪷','🪴','🪵','🪨','🪺','🪹','🪸',
             '🪷','🪸','🪵','🪷','🪸','🪸','🪷','🪸','🪷','🪸',
             '🪷','🪸','🪷','🪸','🪷','🪸','🪵','🪵','🪵','🪵']

# Dedupe new groups
def dedupe(lst):
    seen = set()
    out = []
    for x in lst:
        if x not in seen:
            seen.add(x)
            out.append(x)
    return out

faces = dedupe(faces)
hands = dedupe(hands)
body_people = dedupe(body_people)
sports = dedupe(sports)
instruments = dedupe(instruments)
new_emojis = dedupe(new_emojis)

# Combine everything, dedupe against each other
all_emojis = []
final_seen = set()

def add_group(name, items):
    global all_emojis
    new = []
    for e in items:
        if e not in final_seen:
            final_seen.add(e)
            new.append(e)
    all_emojis.append((name, new))

# Order: keep existing groups first, then add new groups
add_group('动物', deduped[0][1])
add_group('食物饮料', deduped[1][1])
add_group('交通建筑', deduped[2][1])
add_group('物品与工具', deduped[3][1])
add_group('符号与杂项', deduped[4][1])
add_group('时钟与天气', clocks + weather + fruits_only)
add_group('常用符号', misc_symbols)
add_group('表情', faces)
add_group('手势与身体', hands + body_people)
add_group('职业与运动', sports)
add_group('乐器与艺术', instruments)
add_group('Emoji 14+ 新增', new_emojis)

total = sum(len(x) for _,x in all_emojis)
print(f'\n=== FINAL TOTAL: {total} unique ===')
for n, i in all_emojis:
    print(f'  {n}: {len(i)}')

# Generate JS array text
def fmt(items, per_line=10):
    lines = []
    for i in range(0, len(items), per_line):
        chunk = items[i:i+per_line]
        lines.append("            " + ",".join(f"'{e}'" for e in chunk))
    return "\n".join(lines)

parts = []
parts.append("// ===== 1200+ 常用Emoji图标（丰富且实用，已去重并扩充） =====")
for n, i in all_emojis:
    parts.append(f"    // {n}（{len(i)}个）")
    parts.append(fmt(i))
    parts.append("")

final_text = "\n".join(parts)
print(f'\n=== GENERATED TEXT ({len(final_text)} chars) ===')

# Write to file
with open(r'E:\上传网页\zhaolezi\.tmp_new_icons.txt', 'w', encoding='utf-8') as f:
    f.write(final_text)
print('Written to .tmp_new_icons.txt')
