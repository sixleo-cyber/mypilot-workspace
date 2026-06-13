# P21: 修复自定义 SF Symbols 不显示

## 问题分析

自定义 SF Symbols（`mp.*`）编译进了 Assets.car 但运行时不显示。通过 `assetutil` 检查编译产物发现：

- **符号被栅格化为 6x6 像素的极小图片**（如 `mp.chat` → PixelWidth: 6, PixelHeight: 6）
- Xcode 没有将其识别为矢量 SF Symbol，而是当作普通图片处理
- 根本原因：**SVG 格式不正确**

### 当前 SVG 格式（错误）
```xml
<svg viewBox="0 0 500 500">
  <g id="alignment-guides">
    <line ... id="Baseline-S"/>
    ...
  </g>
  <g id="Regular-M" transform="translate(85, 75) scale(13.75)">
    <path d="M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9..."/>
  </g>
</svg>
```

### 问题
1. **`transform` 缩放导致路径被压缩到极小**：原始路径是 24x24 的坐标空间，`scale(13.75)` 将其放大到 330x330，但 `translate(85, 75)` 再偏移。SF Symbols 引擎可能不识别带 transform 的路径
2. **SF Symbols 模板要求路径直接绘制在 500x500 canvas 中**，不需要 transform 缩放
3. **alignment guides 格式可能也有问题**：SF Symbols 模板需要特定的 SVG 结构

### 正确的 SF Symbols SVG 模板格式

Apple SF Symbols 模板导出的 SVG 格式：
- Canvas: 500x500
- 路径直接在 500x500 坐标空间中绘制（不使用 transform 缩放）
- alignment guides 使用标准格式
- `<g id="Regular-M">` 不带 transform

## 修复方案

### Step 1: 重写 SVG 转换脚本
将原始 24x24 的图标路径坐标乘以缩放因子（约 13.75），直接映射到 500x500 canvas，去掉 transform。

具体做法：
- 读取每个 SVG 文件中的 `<path>`/`<circle>` 等绘制元素
- 解析 path 的 `d` 属性中的所有坐标值，乘以缩放因子 + 偏移
- 解析 `circle`/`rect` 的 `cx`/`cy`/`r`/`x`/`y`/`width`/`height` 属性，同样缩放
- 生成新的 SVG，路径直接在 500x500 空间中，不带 transform

**缩放计算**：
- 原始路径坐标范围约 0-24（标准 SF Symbol 图标尺寸）
- 目标 canvas: 500x500
- 图标区域：约 85-415（330px 宽，居中），垂直 75-405
- 缩放因子: 330/24 = 13.75
- 偏移: translate(85, 75)

### Step 2: 批量转换所有 64 个 SVG 文件

### Step 3: xcodebuild 验证 + assetutil 检查符号尺寸

### Step 4: 清理临时脚本

## 关键文件
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Assets.xcassets/mp.*.symbolset/mp.*.svg` — 64 个 SVG 文件
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Assets.xcassets/Contents.json` — Asset Catalog 根配置（已确认无需 provides-namespace）

## 验证标准
- `assetutil --info` 输出中符号应为矢量格式（不应有 PixelWidth/PixelHeight 极小值）
- App 运行时 `Image(systemName: "mp.chat")` 能正确渲染图标
