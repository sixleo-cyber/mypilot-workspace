# UI 优化 4 项：流式气泡尺寸 + 光标 + 表格 + 思考内容

## 问题清单

| # | 问题 | 文件 | 根因 |
|---|------|------|------|
| 1 | AI 流式输出气泡没有 maxWidth 限制 | ChatMessageSection.swift L95-113 | 流式气泡缺少 `.frame(maxWidth:)` |
| 2 | TypingCursor 光标太粗 | ChatMessageSection.swift L319-333 | 用 `Text("▌")` 渲染，字体跟随 body |
| 3 | Markdown 表格视觉体验差 | MarkdownRenderer.swift L352-421 | 表格边框 1.5px 太粗、无内边框、行间距不够 |
| 4 | AI 流式输出包含思考内容而非结果 | ChatStreamHandler.swift + WebSocketService.swift | `onThinkingUpdate` 回调未连接，thinkingContent 未实时显示在思考区 |

---

## Fix 1: 流式输出气泡添加 maxWidth

**文件**: `Features/Chat/ChatMessageSection.swift` L95-113

当前流式气泡无 maxWidth 限制，长文本撑满整个宽度。

```swift
// 修改前:
HStack(spacing: 0) {
    Text(verbatim: wsService.streamingContent)
        .font(AppTypography.body)
    TypingCursor()
}
    .padding(.horizontal, 12)
    .padding(.vertical, 8)
    .background(AppColors.aiBubbleBg)
    .cornerRadius(18, corners: [.topRight, .bottomLeft, .bottomRight])
    .cornerRadius(4, corners: [.topLeft])

// 修改后:
HStack(spacing: 0) {
    Text(verbatim: wsService.streamingContent)
        .font(AppTypography.body)
    TypingCursor()
}
    .padding(.horizontal, 14)
    .padding(.vertical, 8)
    .background(AppColors.aiBubbleBg)
    .cornerRadius(18, corners: [.topRight, .bottomLeft, .bottomRight])
    .cornerRadius(4, corners: [.topLeft])
    .frame(maxWidth: 520, alignment: .leading)  // 与正式 AI 气泡一致
```

同时 padding 从 12→14，与正式 AI 气泡一致。

---

## Fix 2: TypingCursor 细化

**文件**: `Features/Chat/ChatMessageSection.swift` L319-333

```swift
// 修改前:
struct TypingCursor: View {
    @State private var isVisible = true
    var body: some View {
        Text("▌")
            .font(AppTypography.body)
            .foregroundStyle(AppColors.ink500)
            .opacity(isVisible ? 1 : 0)
            ...
    }
}

// 修改后:
struct TypingCursor: View {
    @State private var isVisible = true
    var body: some View {
        Rectangle()
            .fill(AppColors.ink500)
            .frame(width: 1.5, height: 14)
            .opacity(isVisible ? 1 : 0)
            .onAppear {
                withAnimation(.easeInOut(duration: 0.5).repeatForever(autoreverses: true)) {
                    isVisible = false
                }
            }
    }
}
```

用 `Rectangle` 替代 `Text("▌")`，宽度 1.5px、高度 14px，更细更符合打字光标直觉。

---

## Fix 3: Markdown 表格样式优化

**文件**: `Features/Chat/MarkdownRenderer.swift` L352-421

当前问题：
- 分隔线 `Rectangle().fill(AppColors.separatorLine).frame(height: 1.5)` — 1.5px 太粗
- 外边框 `lineWidth: 1` — 太粗
- 行间无分隔线，难以区分行
- 表头背景 `AppColors.info.opacity(0.12)` — 蓝色调与 iMessage 风格不搭

```swift
// 修改后:
Grid(alignment: .leading, horizontalSpacing: 0, verticalSpacing: 0) {
    GridRow {
        ForEach(Array(headers.enumerated()), id: \.offset) { idx, h in
            cellContent(h, isHeader: true)
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .gridColumnAlignment(.leading)
                .background(AppColors.elevatedSurface)  // 浅灰背景替代蓝色
        }
    }

    // 表头分隔线 — 0.5px
    GridRow {
        ForEach(0..<colCount, id: \.self) { _ in
            Rectangle().fill(AppColors.separatorLine).frame(height: 0.5)
                .gridCellUnsizedAxes(.vertical)
        }
    }

    ForEach(Array(rows.enumerated()), id: \.offset) { ri, row in
        GridRow {
            ForEach(Array(row.enumerated()), id: \.offset) { idx, cell in
                if idx < row.count {
                    cellContent(cell, isHeader: false)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .gridColumnAlignment(.leading)
                        .background(ri % 2 == 0 ? Color.clear : AppColors.elevatedSurface.opacity(0.5))
                } else {
                    Color.clear
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                }
            }
        }
        // 行间分隔线 — 0.5px
        if ri < rows.count - 1 {
            GridRow {
                ForEach(0..<colCount, id: \.self) { _ in
                    Rectangle().fill(AppColors.separatorLine.opacity(0.5)).frame(height: 0.5)
                        .gridCellUnsizedAxes(.vertical)
                }
            }
        }
    }
}
.fixedSize(horizontal: false, vertical: true)
.frame(maxWidth: .infinity, alignment: .leading)
.clipShape(RoundedRectangle(cornerRadius: AppRadius.sm))
.overlay(
    RoundedRectangle(cornerRadius: AppRadius.sm)
        .strokeBorder(AppColors.separatorLine.opacity(0.5), lineWidth: 0.5)  // 0.5px 边框
)
```

变化：
- 表头背景：`info.opacity(0.12)` → `elevatedSurface`（浅灰，iMessage 风格）
- 分隔线：1.5px → 0.5px
- 外边框：1px → 0.5px + opacity 0.5
- 行间距：padding 8→6（更紧凑）
- 奇偶行：交替透明/浅灰
- 添加行间 0.5px 分隔线
- 圆角：md→sm（8px 更紧凑）

---

## Fix 4: 流式输出不应包含思考内容

**根因分析**：`ChatStreamHandler.parseDelta` 在 `isReasoning=true` 时正确返回 nil（不输出到流），但 `onThinkingUpdate` 回调从未被 WebSocketService 连接，导致思考内容不会实时显示在思考区。

然而更关键的问题是：当 `thinkingDelta` 为空且 `isReasoning=false` 时，如果 delta 中包含 `<think>...</think>` 标签，`stripThinkTags` 会剥离它们，但**如果 daemon 没有正确分离 thinkingDelta**，原始思考文本可能混入 delta 中。

检查 daemon.js 中的 chat stream 处理：

需要确认 daemon 是否正确将 `thinkingDelta` 和 `delta` 分离。但根据代码逻辑，`parseDelta` 已经有 `<think>` 标签剥离逻辑，问题可能在于：

1. daemon 发送的 `isReasoning` 标志不准确
2. 或者 `<think>` 标签剥离不完整

**修复方案**：在 `onFlush` 回调中添加 `onThinkingUpdate` 连接，让思考内容实时显示在 ThinkingSection 而非混入流式输出。

**文件**: `Services/WebSocketService.swift` L95-101

```swift
// 修改前:
streamHandler.onFlush = { [weak self] content in
    guard let self = self else { return }
    self.streamingContent += content
    self.isStreaming = true
    self.isProcessing = self.activeProcessingCount > 0
}

// 修改后:
streamHandler.onFlush = { [weak self] content in
    guard let self = self else { return }
    self.streamingContent += content
    self.isStreaming = true
    self.isProcessing = self.activeProcessingCount > 0
}
streamHandler.onThinkingUpdate = { [weak self] thinking in
    guard let self = self else { return }
    // 更新当前 agent 的 thinkingContent，让 ThinkingSection 实时显示
    if let idx = self.agents.firstIndex(where: { $0.id == self.currentAgentId }) {
        self.agents[idx].thinkingContent = thinking
    }
}
```

同时需要在流式输出期间显示思考区。检查 MessageBubbleView 中 ThinkingSection 的显示逻辑——它只在 `message.thinkingContent` 非空时显示。但流式输出时还没有创建 Message，所以需要在 ChatMessageSection 的流式气泡上方也添加 ThinkingSection。

**文件**: `Features/Chat/ChatMessageSection.swift` — 在流式气泡前添加思考区显示

```swift
// 在 BouncingDots 指示器之前，添加流式思考区显示
if wsService.isProcessing || wsService.isStreaming {
    if let thinking = wsService.streamHandler.thinkingContent, !thinking.isEmpty,
       !ThinkingContentSanitizer.isLikelyCorruptThinking(thinking) {
        HStack {
            ThinkingSection(content: thinking, isExpanded: .constant(true))
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(AppColors.elevatedSurface)
                .cornerRadius(12)
            Spacer()
        }
        .padding(.horizontal, 16)
        .listRowSeparator(.hidden)
        .id("streaming-thinking")
    }
}
```

但 `streamHandler` 是 private 的。需要添加一个公开的 computed property：

**文件**: `Services/WebSocketService.swift` — 添加 `currentThinkingContent` 属性

```swift
var currentThinkingContent: String? {
    let content = streamHandler.thinkingContent
    return content.isEmpty ? nil : content
}
```

---

## 修改文件清单

| 文件 | 修改 |
|------|------|
| `Features/Chat/ChatMessageSection.swift` | 1. 流式气泡加 maxWidth:520 + padding 14 2. TypingCursor 改为 Rectangle 1.5×14 3. 流式思考区显示 |
| `Features/Chat/MarkdownRenderer.swift` | 表格样式优化（边框 0.5px、行间线、浅灰表头） |
| `Services/WebSocketService.swift` | 1. 连接 onThinkingUpdate 回调 2. 添加 currentThinkingContent 属性 |

## 验证步骤

1. AI 流式输出时气泡宽度不超过 520px，与正式消息一致
2. 光标为细竖线（1.5px × 14px），闪烁自然
3. Markdown 表格有清晰行列分隔、浅灰表头、0.5px 边框
4. AI 思考过程显示在思考区（可折叠），流式输出仅显示结果内容
