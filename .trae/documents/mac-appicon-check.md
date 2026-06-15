# Mac AppIcon 检查与完善

## 现状

- **AppIcon.png**：1024x1024, 7.8KB, RGBA PNG
- **Contents.json**：macOS 所有尺寸（16/32/128/256/512 的 1x/2x）+ iOS 1024x1024 都指向同一文件
- Xcode 会自动缩放，单文件方案可行

## 设计规范（方案 A）

- 背景：`#007AFF`（系统蓝）
- 元素：白色 `#FFFFFF` 三条渐缩胶囊 + 右下角焦点圆点
- SVG 居中缩放至图标内 60%（含安全边距）
- macOS 圆角矩形 22%

## 验证项

1. 当前 AppIcon.png 是否符合设计规范（蓝底白元素）？
2. macOS 圆角矩形裁剪是否正确？
3. 小尺寸（16x16）下圆点是否可见？

## 方案

由于无法直接查看 PNG 内容，最安全的做法是：
1. 用设计规范中的 SVG 重新生成 1024x1024 AppIcon
2. 确保 macOS 圆角矩形背景 + 白色几何元素
3. 替换现有 AppIcon.png

### 生成步骤

用 Python + Cairo 或 rsvg-convert 将 SVG 渲染为 1024x1024 PNG：
- 背景：圆角矩形 #007AFF（圆角 22% = 225px）
- SVG 元素居中缩放 60%，填白色
- 输出 1024x1024 RGBA PNG

### 替换文件

直接替换 `AppIcon.appiconset/AppIcon.png`，Contents.json 无需修改。
