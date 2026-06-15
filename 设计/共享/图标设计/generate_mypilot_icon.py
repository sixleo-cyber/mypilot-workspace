#!/usr/bin/env python3
"""生成 MyPilot macOS App Icon PNG
依据: 设计/MyPilot-Icon-Final-Spec.md
- 1024×1024
- 背景: #007AFF
- 22% 圆角 (macOS 风格)
- 居中放置 SVG 几何: 3 条递减白色圆角胶囊 + 1 个右下角圆点
"""

from PIL import Image, ImageDraw

# === 画布参数 ===
SIZE = 1024
BG_COLOR = (0, 122, 255, 255)            # #007AFF
WHITE = (255, 255, 255, 255)
CORNER_RADIUS = int(SIZE * 0.22)         # 22% macOS 圆角 = 225
SAFE_AREA_RATIO = 0.60                    # SVG 占图标 60%
SVG_VIEW = 100                             # SVG viewBox 是 100×100

scale = (SIZE * SAFE_AREA_RATIO) / SVG_VIEW
offset = (SIZE - SVG_VIEW * scale) / 2

def svg_to_px(svg_val):
    return offset + svg_val * scale

# === 创建画布 ===
img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

# === 1. macOS 圆角矩形背景 ===
draw.rounded_rectangle(
    [(0, 0), (SIZE - 1, SIZE - 1)],
    radius=CORNER_RADIUS,
    fill=BG_COLOR
)

# === 2. 3 条白色圆角胶囊 ===
bars = [
    (14, 20, 72, 14),   # 第 1 条（最长）
    (14, 43, 50, 14),   # 第 2 条（中长）
    (14, 66, 32, 14),   # 第 3 条（最短）
]

for (x, y, w, h) in bars:
    px = svg_to_px(x)
    py = svg_to_px(y)
    pw = w * scale
    ph = h * scale
    pr = (h / 2) * scale
    draw.rounded_rectangle(
        [(px, py), (px + pw, py + ph)],
        radius=pr,
        fill=WHITE
    )

# === 3. 右下角圆点 ===
dot_cx = svg_to_px(86)
dot_cy = svg_to_px(73)
dot_r = 7 * scale
draw.ellipse(
    [(dot_cx - dot_r, dot_cy - dot_r),
     (dot_cx + dot_r, dot_cy + dot_r)],
    fill=WHITE
)

# === 4. 导出 PNG ===
output_path = '/Users/liaoxing/Desktop/MyPilot-AppIcon-1024.png'
img.save(output_path, 'PNG', optimize=True)
print(f"✅ 已生成: {output_path}")
import os
print(f"   尺寸: {SIZE}x{SIZE}")
print(f"   圆角: {CORNER_RADIUS}px (22%)")
print(f"   文件大小: {os.path.getsize(output_path) / 1024:.1f} KB")
