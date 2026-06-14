# AI 消息自由选择文本优化

## 问题

AI 消息内容只能整行整行选中，无法自由选中任意部分（跨行或行内部分字符）。

## 根因分析

**两层分段渲染导致选择被限制在行级别：**

### 层1：MarkdownRenderer → ParaText
- `ParaText` 先按 `\n\n` 分段为 `Para`，再按 `\n` 分行为 `Line`
- 每行渲染为独立 `Text(attr)` 或 `Text(line.raw)`
- SwiftUI 的文本选择以 `Text` 视图为单位，无法跨 `Text` 选择

### 层2：流式输出 ChatMessageSection
- `streamingDisplayContent` 按 `\n` 分行
- 每行一个 `StreamingLineText`（独立 `Text` 视图）
- 同样无法跨行选择

## 方案

**将多行合并为单个 `Text` 视图**，利用 SwiftUI 的 `Text` 拼接（`Text + Text`）实现跨行选择。

### 修改1：ParaText — 合并行为单个 Text

**文件**：`MarkdownRenderer.swift`

**当前**：
```swift
VStack(alignment: .leading, spacing: 0) {
    ForEach(para.lines) { line in
        Text(attr/line.raw)  // 每行独立 Text
    }
}
```

**改为**：
```swift
// 将同一 Para 内的所有行拼接为一个 Text，行间用 \n 连接
// SwiftUI Text 拼接后，系统原生支持跨行自由选择
VStack(alignment: .leading, spacing: 8) {
    ForEach(paras) { para in
        Group {
            if let combined = combinedText(for: para) {
                combined
            } else {
                Text(verbatim: para.lines.map { $0.raw }.joined(separator: "\n"))
            }
        }
        .lineLimit(nil)
        .fixedSize(horizontal: false, vertical: true)
    }
}
```

关键实现：`combinedText(for:)` 方法将 `Para` 内所有行拼接为单个 `Text`：
- 空行 → `Text("\n")`
- 标题行 → `Text(attr).fontWeight(.bold)`
- 普通行 → `Text(attr)` 或 `Text(verbatim: raw)`
- 行间用 `+` 拼接 `Text("\n")`

### 修改2：流式输出 — 合并为单个 Text

**文件**：`ChatMessageSection.swift`

**当前**：
```swift
let lines = wsService.streamingDisplayContent.components(separatedBy: "\n")
ForEach(Array(lines.enumerated()), id: \.offset) { idx, line in
    HStack(spacing: 0) {
        StreamingLineText(rawLine: line)
        if idx == lines.count - 1 {
            TypingCursor()
        }
    }
}
```

**改为**：
```swift
// 将流式内容渲染为单个 Text，支持自由选择
HStack(spacing: 0) {
    StreamingContentText(rawContent: wsService.streamingDisplayContent)
    TypingCursor()
}
```

新增 `StreamingContentText` 视图：将整个内容解析为单个 `Text`（使用 `AttributedString(markdown:)`），失败则 fallback 为 `Text(verbatim:)`。

### 修改3：MarkdownRenderer 外层 VStack 间距

**文件**：`MarkdownRenderer.swift`

外层 `VStack(spacing: 6)` 保持不变，因为不同 Block（文本段 vs 代码块 vs 表格）之间确实需要分隔。

## 不改动的部分

- `CodeBlockView`：代码块已有 `.textSelection(.enabled)`，且是单个 `Text`，已支持自由选择
- `MarkdownTable`：表格是 Grid 结构，无法合并为单个 Text，保持现状
- 右键菜单"复制内容"：保留作为备选方案
- `MessageBubble` 的 `.textSelection(.enabled)`：保留

## 验证

1. AI 回复完成后，鼠标可自由选中任意部分文字（跨行、行内部分）
2. 流式输出期间，同样可自由选择
3. 代码块内可自由选择
4. 标题行仍显示为粗体
5. Markdown 语法（**bold**、`code`）仍正确渲染
6. 编译通过
