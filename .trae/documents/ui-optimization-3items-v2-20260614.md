# UI 优化计划 — 3 项修复

## 问题分析

### 1. 流式输出一段一段出现

**根因**：`ChatStreamHandler.scheduleFlush()` 使用 30ms 延迟 Timer，但 `guard flushTimer == nil` 意味着在 Timer 触发前新 delta 到达时不会重新调度——这是合并优化。但问题在于 **`onFlush` 回调在主线程执行 `self.streamingContent += content`**，而 SwiftUI 的 `@Observable` 属性变更会在当前 RunLoop 周期末批量更新视图。

更关键的是：**`onChange(of: wsService.streamingContent)` 的节流间隔 80ms 太长**，导致滚动和渲染不同步。当 delta 到达频率高于 80ms 时，中间的 scrollTo 被跳过，SwiftUI 可能延迟渲染。

**修复**：
- 将节流间隔从 80ms 降为 50ms
- 更关键：`ChatStreamHandler` 的 flush 间隔从 30ms 降为 16ms（约 60fps），让每次 delta 更快到达 UI

### 2. 光标不跟随最新输出的最后一个字

**根因**：流式内容使用 `Text(verbatim: wsService.streamingContent)` + `TypingCursor()` 的 HStack。当内容包含换行符 `\n` 时，SwiftUI 的 `Text(verbatim:)` **不会将 `\n` 渲染为换行**——它只显示为空格或忽略。这意味着多行内容在视觉上被压缩成一行或几行，光标位置自然不对。

**验证**：SwiftUI `Text(verbatim:)` 不会处理 `\n` 为换行，需要用 `Text` 的 `AttributedString` 或分段显示。

**修复**：将流式内容按 `\n` 分段，用 VStack 逐行渲染，最后一行末尾放光标。这样每行自然换行，光标始终在最后一行末尾。

### 3. AI 气泡内容被折叠/截断

**根因**：AI 气泡有 `.frame(maxWidth: 520, alignment: .leading)` 限制。但用户描述的"折叠"不是 maxWidth 导致的——maxWidth 只限制宽度不限制高度。真正的原因是 **SwiftUI `Text` 默认有 `lineLimit` 行数限制**（在某些容器中默认为 1 或有限行数），或者 **`MarkdownRenderer` 中 `ParaText` 的 `AttributedString(markdown:)` 解析时对长文本做了截断**。

查看 `ParaText` 代码：`Text(attr)` 和 `Text(line.raw)` 都没有显式设置 `.lineLimit(nil)`。在 SwiftUI 中，`Text` 在某些布局容器中默认行数有限制。

**修复**：
- 在 `MarkdownRenderer` 的 `ParaText` 中，对每个 `Text` 添加 `.lineLimit(nil)` + `.fixedSize(horizontal: false, vertical: true)` 确保完整显示
- 在流式内容的 `Text(verbatim:)` 也添加 `.lineLimit(nil)`

---

## 修改文件清单

### 文件 1: ChatStreamHandler.swift
- `scheduleFlush` 的 Timer 间隔从 0.03s → 0.016s（60fps）

### 文件 2: ChatMessageSection.swift
- 流式内容渲染：将 `Text(verbatim:)` + `TypingCursor` 的 HStack 改为按 `\n` 分段的 VStack，最后一行末尾放光标
- 节流间隔从 80ms → 50ms

### 文件 3: MarkdownRenderer.swift (ParaText)
- 每个 `Text` 添加 `.lineLimit(nil)` + `.fixedSize(horizontal: false, vertical: true)`

---

## 具体改动

### ChatStreamHandler.swift — flush 间隔

```swift
// 旧
flushTimer = Timer.scheduledTimer(withTimeInterval: 0.03, repeats: false)

// 新
flushTimer = Timer.scheduledTimer(withTimeInterval: 0.016, repeats: false)
```

### ChatMessageSection.swift — 流式内容渲染

将：
```swift
HStack(spacing: 0) {
    Text(verbatim: wsService.streamingContent)
        .font(AppTypography.body)
    TypingCursor()
}
```

改为按行分段渲染：
```swift
VStack(alignment: .leading, spacing: 0) {
    let lines = wsService.streamingContent.components(separatedBy: "\n")
    ForEach(Array(lines.enumerated()), id: \.offset) { idx, line in
        HStack(spacing: 0) {
            Text(verbatim: line)
                .font(AppTypography.body)
            if idx == lines.count - 1 {
                TypingCursor()
            }
        }
    }
}
```

### MarkdownRenderer.swift — ParaText 防截断

在每个 `Text(attr)` / `Text(line.raw)` 后添加：
```swift
.lineLimit(nil)
.fixedSize(horizontal: false, vertical: true)
```

---

## 验证步骤

1. 发送消息触发 AI 回复，观察流式输出是否平滑（不再一段一段）
2. 流式输出多行内容时，光标始终在最后一行末尾
3. AI 输出长段落内容，确认不被截断/折叠
