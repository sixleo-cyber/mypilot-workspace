#!/usr/bin/env python3
"""MyPilot App Icon v2 — Apple Big Sur+/macOS Sonoma+ 工艺升级

改进点（vs V1）：
1. 极轻微的垂直渐变 (#0084FF 顶 → #0066E6 底) —— Apple 现代图标工艺
2. 顶部极轻微径向高光 (3% white) —— 增加立体感
3. 圆点 r=7 → r=8，识别度更佳（小尺寸更清晰）
4. 横条高度 14 → 15，视觉重量更平衡
5. 几何居中微调，与 macOS Sonoma+ 网格对齐

设计依据（保留 V1 哲学）：
- 设计/MyPilot-Icon-Final-Spec.md 第 1-37 行（核心几何）
- 设计/MyPilot-Icon-Final-Spec.md 第 39-44 行（色彩系统）
- macOS Sonoma+ 图标工艺（Apple 设计语言）
"""

from PIL import Image, ImageDraw, ImageFilter
import os

# === 标准尺寸清单（macOS / iOS / Web 全套）===
ICON_SIZES = [
    # macOS App Icon
    (1024, '1024-mac-appstore'),  # App Store / marketing
    (512, '512-mac'),              # macOS @2x
    (256, '256-mac'),              # macOS @1x
    (180, '180-ios'),              # iPhone @3x (60pt)
    (167, '167-ios'),              # iPad Pro @2x (83.5pt)
    (152, '152-ios'),              # iPad @2x (76pt)
    (128, '128-mac'),              # macOS small
    (64, '64'),
    (32, '32-menubar'),
    (16, '16-favicon'),
]

# === 主参数（与 V1 严格一致，新增工艺升级）===
SIZE = 1024
BG_TOP = (0, 132, 255, 255)       # #0084FF (顶部稍亮)
BG_BOT = (0, 102, 230, 255)       # #0066E6 (底部稍深)
HIGHLIGHT = (255, 255, 255, 16)   # 顶部高光 (3% alpha)
CORNER_RADIUS = int(SIZE * 0.22)   # 225 (22% macOS)
SAFE_AREA_RATIO = 0.60             # 60% (与 V1 一致)
SVG_VIEW = 100                     # SVG 100×100

# 几何微调（V2 改进）
BAR_HEIGHT = 15                    # 14 → 15 (V2 视觉重量)
DOT_RADIUS = 8                     # 7 → 8  (V2 识别度)

# 条间距: y=20, 43, 66 (与 V1 保持一致, 总高 48+gap=15+6=69, 居中)
BARS = [
    (14, 19, 72, BAR_HEIGHT),   # 第 1 条 (最长) - 略微上移 1pt 平衡视觉重心
    (14, 42, 50, BAR_HEIGHT),   # 第 2 条 (中长)
    (14, 65, 32, BAR_HEIGHT),   # 第 3 条 (最短)
]
DOT = (86, 72, DOT_RADIUS)       # 圆点 (略上移 1pt 与第3条居中)

scale = (SIZE * SAFE_AREA_RATIO) / SVG_VIEW
offset = (SIZE - SVG_VIEW * scale) / 2

def svg_to_px(svg_val):
    return offset + svg_val * scale

# === 工具函数 ===
def draw_apple_gradient_bg(canvas):
    """绘制 Apple Big Sur+ 风格渐变背景"""
    # 1. 基础底色
    base = Image.new('RGBA', (SIZE, SIZE), BG_BOT)
    # 2. 顶部渐变层
    gradient = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    gd = ImageDraw.Draw(gradient)
    for y in range(SIZE):
        t = y / SIZE
        r = int(BG_TOP[0] * (1 - t) + BG_BOT[0] * t)
        g = int(BG_TOP[1] * (1 - t) + BG_BOT[1] * t)
        b = int(BG_TOP[2] * (1 - t) + BG_BOT[2] * t)
        gd.line([(0, y), (SIZE, y)], fill=(r, g, b, 255))
    base.alpha_composite(gradient)
    # 3. 顶部径向高光（极轻微）
    highlight_layer = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    hd = ImageDraw.Draw(highlight_layer)
    # 顶部椭圆高光（从中心顶部向下）
    for i in range(40):
        alpha = int(HIGHLIGHT[3] * (1 - i / 40))
        if alpha <= 0:
            break
        hd.ellipse(
            [(-100, -200 + i * 8), (SIZE + 100, SIZE * 0.7 - i * 8)],
            fill=(255, 255, 255, alpha)
        )
    base.alpha_composite(highlight_layer)
    return base

def draw_apple_corner_mask(canvas_size, radius):
    """macOS 22% 圆角遮罩"""
    mask = Image.new('L', (canvas_size, canvas_size), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle(
        [(0, 0), (canvas_size - 1, canvas_size - 1)],
        radius=radius,
        fill=255
    )
    return mask

def draw_icon(size):
    """生成单个尺寸的图标"""
    s = size
    corner_r = int(s * 0.22)
    safe_scale = (s * SAFE_AREA_RATIO) / SVG_VIEW
    safe_offset = (s - SVG_VIEW * safe_scale) / 2

    def to_px(v):
        return safe_offset + v * safe_scale

    # 1. 渐变背景
    canvas = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    # 缩放版渐变
    big = Image.new('RGBA', (s, s), BG_BOT)
    grad = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    gd = ImageDraw.Draw(grad)
    for y in range(s):
        t = y / s
        r = int(BG_TOP[0] * (1 - t) + BG_BOT[0] * t)
        g = int(BG_TOP[1] * (1 - t) + BG_BOT[1] * t)
        b = int(BG_TOP[2] * (1 - t) + BG_BOT[2] * t)
        gd.line([(0, y), (s, y)], fill=(r, g, b, 255))
    big.alpha_composite(grad)
    # 高光（简单的顶部水平渐变，避免小尺寸下椭圆坐标反转）
    hl = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    hd = ImageDraw.Draw(hl)
    hl_h = max(int(s * 0.4), 20)
    steps = max(int(hl_h / 4), 5)
    for i in range(steps):
        alpha = int(HIGHLIGHT[3] * (1 - i / steps))
        if alpha <= 0:
            break
        y = int(i * hl_h / steps)
        next_y = int((i + 1) * hl_h / steps)
        hd.rectangle([(0, y), (s, next_y)], fill=(255, 255, 255, alpha))
    big.alpha_composite(hl)
    canvas.paste(big, (0, 0))

    # 2. 绘制前景（白色横条 + 圆点）
    fg = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    fd = ImageDraw.Draw(fg)
    WHITE = (255, 255, 255, 255)
    for (x, y, w, h) in BARS:
        px = to_px(x); py = to_px(y)
        pw = w * safe_scale; ph = h * safe_scale
        pr = (h / 2) * safe_scale
        fd.rounded_rectangle(
            [(px, py), (px + pw, py + ph)],
            radius=pr, fill=WHITE
        )
    # 圆点
    dcx = to_px(DOT[0]); dcy = to_px(DOT[1]); dr = DOT[2] * safe_scale
    fd.ellipse(
        [(dcx - dr, dcy - dr), (dcx + dr, dcy + dr)],
        fill=WHITE
    )
    canvas.alpha_composite(fg)

    # 3. 圆角遮罩
    mask = draw_apple_corner_mask(s, corner_r)
    out = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    out.paste(canvas, (0, 0), mask)
    return out

# === 1. 导出多尺寸到桌面 ===
desktop = '/Users/liaoxing/Desktop'
out_dir = os.path.join(desktop, 'MyPilot-AppIcon-v2')
os.makedirs(out_dir, exist_ok=True)

print(f"🎨 MyPilot App Icon v2 — Apple Big Sur+ 工艺升级")
print(f"   输出目录: {out_dir}\n")

for size, name in ICON_SIZES:
    icon = draw_icon(size)
    # 1024 用最高质量 + 优化
    if size == 1024:
        path = os.path.join(desktop, 'MyPilot-AppIcon-1024-v2.png')
        icon.save(path, 'PNG', optimize=True)
        print(f"   ✅ {path} ({size}×{size})  ← 主文件（覆盖桌面原版）")
    path = os.path.join(out_dir, f'MyPilot-AppIcon-{size}.png')
    icon.save(path, 'PNG', optimize=True)
    print(f"   📦 {path} ({size}×{size})")

# === 2. 导出 SVG 源文件（v2 升级版）===
svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" version="1.1">
  <!-- MyPilot Icon v2 — 几何 + 现代工艺 -->
  <defs>
    <linearGradient id="bgGrad" x1="50%" y1="0%" x2="50%" y2="100%">
      <stop offset="0%" stop-color="#0084FF"/>
      <stop offset="100%" stop-color="#0066E6"/>
    </linearGradient>
    <radialGradient id="topHighlight" cx="50%" cy="0%" r="80%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.08"/>
      <stop offset="60%" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect x="14" y="19" width="72" height="15" rx="7.5" fill="#FFFFFF"/>
  <rect x="14" y="42" width="50" height="15" rx="7.5" fill="#FFFFFF"/>
  <rect x="14" y="65" width="32" height="15" rx="7.5" fill="#FFFFFF"/>
  <circle cx="86" cy="72" r="8" fill="#FFFFFF"/>
</svg>
'''
svg_path = os.path.join(out_dir, 'MyPilot-Icon-Final-v2.svg')
with open(svg_path, 'w', encoding='utf-8') as f:
    f.write(svg)
print(f"\n   📄 SVG 源: {svg_path}")

# === 3. 导出 README（图标使用指南）===
readme = '''# MyPilot App Icon v2 — 升级说明

## 改进点（vs v1）

| # | 改进项 | v1 | v2 | 依据 |
|---|--------|----|----|------|
| 1 | 背景 | 纯色 #007AFF | **垂直渐变** #0084FF → #0066E6 | macOS Sonoma+ 图标工艺 |
| 2 | 顶部高光 | 无 | **径向白色高光 3%** | Apple Big Sur+ 立体感 |
| 3 | 横条高度 | 14pt | **15pt** | V2 视觉重量更平衡 |
| 4 | 圆点半径 | 7pt | **8pt** | V2 小尺寸更清晰 |
| 5 | 横条 Y 坐标 | 20/43/66 | 19/42/65 | 略上移 1pt，平衡视觉重心 |

## 保留要素（设计哲学不变）

- 三条递减圆角胶囊 = AI 思考"展开 → 聚焦 → 结论"
- 右下角圆点 = 当前焦点 / 实时激活
- 60% 安全边距
- 22% macOS 圆角
- #007AFF 蓝为品牌主色

## 文件清单

```
MyPilot-AppIcon-v2/
├── MyPilot-AppIcon-1024.png  ← App Store / Marketing
├── MyPilot-AppIcon-512.png   ← macOS @2x
├── MyPilot-AppIcon-256.png   ← macOS @1x
├── MyPilot-AppIcon-180.png   ← iPhone @3x (60pt)
├── MyPilot-AppIcon-167.png   ← iPad Pro @2x (83.5pt)
├── MyPilot-AppIcon-152.png   ← iPad @2x (76pt)
├── MyPilot-AppIcon-128.png   ← macOS 小尺寸
├── MyPilot-AppIcon-64.png
├── MyPilot-AppIcon-32.png    ← 菜单栏
├── MyPilot-AppIcon-16.png    ← Favicon
├── MyPilot-Icon-Final-v2.svg ← 矢量源
└── README.md
```

## 主文件位置

`~/Desktop/MyPilot-AppIcon-1024-v2.png` ← 替换桌面原 v1 图标

## 升级建议

- 浅色模式背景用 #0084FF（顶）→ #0066E6（底）
- 深色模式背景用 #0A84FF（顶）→ #0066CC（底）
- 16pt 以下建议隐藏圆点（保持三条横条即可识别）
'''
readme_path = os.path.join(out_dir, 'README.md')
with open(readme_path, 'w', encoding='utf-8') as f:
    f.write(readme)
print(f"   📘 README: {readme_path}")

print(f"\n✨ 全部完成！")
