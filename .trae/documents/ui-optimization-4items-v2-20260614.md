# UI 优化计划 — 4 项修复

## 问题分析

### 1. AI 回复消息时，气泡没有遵循尺寸距离

**根因**：流式气泡外层 HStack 缺少 `.padding(.horizontal, 16)`，而已完成消息气泡在 MessageBubbleView 中有此 padding。

对比：
- 已完成消息（MessageBubbleView.swift:151）：`.padding(.horizontal, 16)` ✅
- 流式内容（ChatMessageSection.swift:113-131）：无 `.padding(.horizontal, 16)` ❌

**修复**：在流式内容 HStack 外层添加 `.padding(.horizontal, 16)`

### 2. AI 流式输出光标太粗

**根因**：TypingCursor 使用 `Rectangle().frame(width: 1.5, height: 14)`，1.5px 宽度偏粗。

**修复**：宽度从 1.5px → 1px，高度从 14px → 16px（匹配 body 字体行高）

### 3. Markdown 表格渲染视觉体验不好

**根因**：当前 MarkdownTable 使用 SwiftUI Grid，但缺少：
- 列间垂直分隔线
- 表头与数据行视觉区分不够
- 单元格内边距不够紧凑
- 整体缺少"表格感"

**修复**：
- 添加列间垂直分隔线（0.5px separatorLine）
- 表头加深背景色 + 底部粗分隔线（1px）
- 单元格 padding 调整：horizontal 8, vertical 5
- 表头字体用 listTitle.bold()，数据行用 caption
- 外层圆角 + 边框保持

### 4. AI 流式输出显示思考内容而非结果

**根因**：ChatStreamHandler.parseDelta() 中 `stripThinkTags` 分支有 bug：

```swift
if !thinking.isEmpty && thinkingContent.isEmpty {
    thinkingContent += thinking
    onThinkingUpdate?(thinkingContent)
}
```

条件 `thinkingContent.isEmpty` 导致：当 `thinkingContent` 已有内容时（前序 delta 已添加），新提取的思考内容被丢弃，泄漏到 visible 返回值中。

**修复**：移除 `thinkingContent.isEmpty` 条件，始终将提取的思考内容追加到 `thinkingContent`

---

## 修改文件清单

### 文件 1: ChatMessageSection.swift
- 流式内容 HStack 添加 `.padding(.horizontal, 16)`

### 文件 2: ChatMessageSection.swift (TypingCursor)
- `width: 1.5` → `width: 1`
- `height: 14` → `height: 16`

### 文件 3: MarkdownRenderer.swift (MarkdownTable)
- 添加列间垂直分隔线
- 表头背景加深 + 底部粗线
- 调整单元格 padding
- 优化整体视觉

### 文件 4: ChatStreamHandler.swift
- 移除 `stripThinkTags` 中 `thinkingContent.isEmpty` 条件

---

## 验证步骤

1. 发送消息触发 AI 回复，观察流式气泡左右边距与已完成消息一致
2. 观察流式光标更细更自然
3. 让 AI 输出包含 Markdown 表格的内容，确认表格有清晰边框和行列区分
4. 使用支持思考的模型（如 DeepSeek），确认思考内容显示在思考区而非主内容区
