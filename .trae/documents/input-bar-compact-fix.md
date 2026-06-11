# 输入栏紧凑布局优化计划

## 概述

用户反馈：输入栏单行布局方向正确（`[📎 更多] [输入框] [发送]`），但存在两个问题：
1. 按钮行上方仍有可见的分割线，整个输入栏区域被锁定在大尺寸
2. 应该和输入框一样紧凑——空状态时紧凑，多行输入时整体区域随输入框扩展

## 当前状态分析

### 已完成
- 单行布局已实现：`[📎文件] [⋯更多] [输入框] [↑发送]`
- 6 个辅助按钮已收进 `MoreActionsGrid` popover（2×3 网格）
- `ChatView.swift` 中消息区与输入区之间的 `Divider()` 已移除
- `IMETextView.intrinsicContentSize` 使用字体行高作为最小高度

### 文件清单
| 文件 | 行数 | 状态 |
|------|------|------|
| `MyPilot/Views/InputBarView.swift` | 649 | 单行布局 + MoreActionsGrid |
| `MyPilot/Views/ChatView.swift` | 223 | 无消息/输入区分隔线 |
| `MyPilot/Views/IMETextView.swift` | 146 | intrinsicContentSize 自适应高度 |
| `MyPilot/Features/Chat/ChatInputSection.swift` | 103 | 简单包装层 |

### 待修复问题

**问题 A — "按钮行上面的线"**
- `ChatView.swift` 第 29 行有一个 `Divider()` 在 header 和消息区之间（这个是合理的）
- 需确认用户看到的"线"是否来自其他来源：可能是 `InputBarView` 的 VStack 背景色差异、textField 的 stroke border 视觉溢出、或父容器的 padding/background

**问题 B — "锁定大尺寸 / 不紧凑"**
- 当前 `InputBarView.body` 的 HStack 有 `.padding(.vertical, 6)`
- `textField` 有 `.frame(minHeight: 28, maxHeight: 116)` + `.padding(.vertical, 4)`
- `IMETextView.textContainerInset = NSSize(width: 4, height: 4)`
- 空状态总高度 ≈ 6(pad) + 28(minHeight) + 6(pad) = 40px → 可能仍偏大
- 按钮 size 28×28 与 minHeight 28 基本对齐，但整体视觉上可能不够紧凑

**问题 C — 多行扩展联动**
- 当前 HStack 中按钮固定 28px，输入框可扩展到 116px
- HStack 高度会跟随最高的子视图（输入框）自动扩展 ✅ 这应该是正确的
- 但需要验证实际行为：按钮是否随输入框垂直居中

## 修改方案

### Step 1: 构建验证
- 运行 `xcodebuild build` 确认当前代码编译通过
- 如果有 brace mismatch 等 error，先修复

### Step 2: 紧凑化 InputBarView 布局

**文件**: `MyPilot/Views/InputBarView.swift`

#### 2a. 减少垂直 padding
```
.padding(.vertical, 6) → .padding(.vertical, 4)
```
减少上下各 2px，让空状态更紧凑。

#### 2b. textField 内部 padding 微调
```
.padding(.vertical, 4) → .padding(.vertical, 2)
```
输入框内部垂直间距从 4 减到 2。

#### 2c. 按钮尺寸微调（可选）
```
.frame(width: 28, height: 28) → .frame(width: 26, height: 26)
```
文件按钮和更多按钮缩小 2px，与更紧凑的输入框匹配。

#### 2d. IMETextView inset 微调
**文件**: `MyPilot/Views/IMETextView.swift`

```
textContainerInset = NSSize(width: 4, height: 4) → NSSize(width: 4, height: 2)
```
减少内部垂直 inset。

#### 2e. intrinsicContentSize 最小高度微调
```swift
// 当前
let minH = max(lineHeight + textContainerInset.height * 2, 28)
// 改为
let minH = max(lineHeight + textContainerInset.height * 2, 24)
```
最小高度从 28 降到 24，让空输入框更紧凑。

### Step 3: 移除多余分割线

检查并移除输入栏上方可能存在的视觉分隔：
- 确认 `ChatView.swift` 中 `ChatMessageSection` 和 `ChatInputSection` 之间无 Divider（已完成）
- 检查 `InputBarView` 自身是否有不必要的背景色/边框造成"线"的视觉效果
- 如果 `textField` 的 `.stroke(AppColors.ink200, lineWidth: 1)` 在视觉上看起来像一条横线，考虑改用更淡的颜色或去掉

### Step 4: 多行扩展验证
确保 HStack 在输入框扩展时：
- 按钮保持垂直居中（`.frame(height:)` 不设固定值，让 HStack 自动处理）
- 发送按钮图标大小不随输入框扩展而变化
- 整体 VStack 高度跟随内容自适应

## 验证步骤

1. `xcodebuild build` 编译通过
2. 空状态截图：输入栏应仅占 ~32-36px 高度
3. 输入 2-3 行文字：输入栏应随文字扩展，按钮居中
4. 输入超过 4 行文字：输入框应出现滚动（maxHeight 120 限制）
5. 点击"更多"按钮：popover 应正常弹出 2×3 网格
6. 点击文件按钮：fileImporter 应正常弹出
7. 发送按钮：空白时灰色，有文字时绿色，AI 回复中变停止图标

## 假设与决策
- 用户选择方案 B（保留文件+更多按钮，其余藏进 popover）— 已实现
- 不需要额外的背景色或阴影来区分输入区域
- 保持现有的 AppColors 配色体系不变
