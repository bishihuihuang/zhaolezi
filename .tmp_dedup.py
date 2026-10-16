import re, json, os

with open(r'E:\上传网页\zhaolezi\_原始未混淆版\10.html', encoding='utf-8') as f:
    content = f.read()

m = re.search(r'const icons = \[(.*?)\];', content, re.DOTALL)
if not m:
    print('NOT FOUND'); exit(1)
arr_text = m.group(1)

# Parse into groups by comment lines
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

for name, items in groups:
    print(f'{name}: {len(items)}')

# Dedupe (drop 原100 group entirely)
deduped = []
all_seen = set()
for name, items in groups:
    if '原100' in name:
        # capture its unique items for later redistribution
        only_items = [e for e in items if e not in all_seen]
        print(f'\n原100 unique (will redistribute): {len(only_items)}')
        print(only_items)
        continue
    new_items = []
    for e in items:
        if e not in all_seen:
            all_seen.add(e)
            new_items.append(e)
    deduped.append((name, new_items))

total = sum(len(x) for _, x in deduped)
print(f'\nAfter removing 原100 + dedupe: {total} unique')
for name, items in deduped:
    print(f'  {name}: {len(items)}')

with open(r'E:\上传网页\zhaolezi\.tmp_dedup.json', 'w', encoding='utf-8') as f:
    json.dump(deduped, f, ensure_ascii=False)
print('Saved to .tmp_dedup.json')
