# -*- coding: utf-8 -*-
"""生成 zhaolezi 站点 favicon：深蓝流光底 + 白色乐字，多尺寸 ico + svg"""
from PIL import Image, ImageDraw, ImageFont
import os

ROOT = r"E:\上传网页\zhaolezi"
FONT = r"C:\Windows\Fonts\msyh.ttc"

sizes = [16, 32, 48]
img = Image.new("RGBA", (48, 48), (0, 0, 0, 0))
d = ImageDraw.Draw(img)
# 圆角深蓝底（站点默认深色流光 --bg #0a0e27）
d.rounded_rectangle([0, 0, 47, 47], radius=10, fill=(10, 14, 39, 255))
# 顶部高光条装饰
d.rounded_rectangle([6, 6, 42, 9], radius=2, fill=(102, 126, 234, 200))
# 白色 "乐" 字
f = ImageFont.truetype(FONT, 30)
d.text((24, 25), "乐", font=f, fill=(232, 236, 245, 255), anchor="mm")

# 缩放到各尺寸并保存 ico
img.save(os.path.join(ROOT, "favicon.ico"), format="ICO", sizes=[(s, s) for s in sizes])

# 导出 48px png 作为 svg 备选外的参考
img.save(os.path.join(ROOT, "favicon-48.png"), format="PNG")

# SVG 版本（现代浏览器）
svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<rect width="64" height="64" rx="13" fill="#0a0e27"/>
<rect x="8" y="8" width="48" height="4" rx="2" fill="#667eea" opacity="0.8"/>
<text x="32" y="43" font-family="Microsoft YaHei, PingFang SC, sans-serif" font-size="36" font-weight="bold" fill="#e8ecf5" text-anchor="middle">乐</text>
</svg>'''
with open(os.path.join(ROOT, "favicon.svg"), "w", encoding="utf-8") as f:
    f.write(svg)

print("favicon.ico / favicon.svg / favicon-48.png 已生成")
for fn in ["favicon.ico", "favicon.svg", "favicon-48.png"]:
    p = os.path.join(ROOT, fn)
    print(fn, os.path.getsize(p), "bytes")