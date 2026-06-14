# UI 优化计划 — 2 项修复

## 问题分析

### 1. BouncingDots 气泡与流式内容气泡边距不一致，过渡有撕裂感

**当前代码对比**：

BouncingDots 气泡（ChatMessageSection.swift:95-112）：
- `.padding(.horizontal, 14)` + `.padding(.vertical, 10)`
- **无** `.padding(.horizontal, 16)` 外层
- **无** `.frame(maxWidth: 520)`

流式内容气泡（ChatMessageSection.swift:115-142）：
- `.padding(.horizontal, 14)` + `.padding(.vertical, 8)`
- `.padding(.horizontal, 16)` 外层
- `.frame(maxWidth: 520)`

差异：
1. vertical padding: 10 vs 8
2. 外层 horizontal 16: 无 vs 有
3. maxWidth 520: 无 vs 有

**修复**：统一 BouncingDots 气泡的 padding 和 frame 与流式内容气泡一致。同时将两个气泡合并为同一个视图，用条件判断内部内容（BouncingDots vs 文字），避免两个独立 List row 之间的切换跳跃。

### 2. 流式输出带有 markdown 语法（`***`、`##`）

**根因**：流式内容使用 `Text(verbatim: wsService.streamingDisplayContent)` 显示原始文本，不做 Markdown 渲染。`verbatim` 参数意味着所有字符原样显示，包括 `*`、`#` 等标记符号。

**修复**：将 `Text(verbatim:)` 替换为 `MarkdownRenderer` 渲染。但 MarkdownRenderer 对不完整的 markdown（如流式输出中 `**` 只写了一半）可能渲染异常，需要处理。

更实际的方案：使用 `Text(AttributedString(markdown:))` 替代 `Text(verbatim:)`，对解析失败的内容 fallback 到纯文本。这样 `**bold**` 会渲染为粗体，`## heading` 会渲染为标题，`***` 会被解析为粗斜体标记。

---

## 修改文件清单

### 文件 1: ChatMessageSection.swift

**改动 1：合并 BouncingDots 和流式内容为同一个气泡**

将两个独立的 `if` 块合并为一个，共享同一个气泡容器：

```swift
// 统一的 AI 流式输出气泡
if wsService.isProcessing || wsService.isStreaming {
    HStack {
        VStack(alignment: .leading, spacing: 0) {
            // 思考中：显示 BouncingDots
            if wsService.isProcessing && !wsService.isStreaming {
                HStack(spacing: 8) {
                    BouncingDots()
                    if let status = wsService.processingStatusText {
                        Text(status)
                            .font(AppTypography.caption)
                            .foregroundStyle(AppColors.ink400)
                    }
                }
            }
            // 流式输出：显示内容
            if wsService.isStreaming && !wsService.streamingDisplayContent.isEmpty {
                let lines = wsService.streamingDisplayContent.components(separatedBy: "\n")
                ForEach(Array(lines.enumerated()), id: \.offset) { idx, line in
                    HStack(spacing: 0) {
                        StreamingLineText(line)
                        if idx == lines.count - 1 {
                            TypingCursor()
                        }
                    }
                }
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 8)
        .background(AppColors.aiBubbleBg)
        .cornerRadius(18, corners: [.topRight, .bottomLeft, .bottomRight])
        .cornerRadius(4, corners: [.topLeft])
        .frame(maxWidth: 520, alignment: .leading)
        .textSelection(.enabled)
        Spacer()
    }
    .padding(.horizontal, 16)
    .listRowSeparator(.hidden)
    .id("streaming-content")
}
```

**改动 2：新增 StreamingLineText 视图，解析 markdown**

```swift
struct StreamingLineText: View {
    let rawLine: String
    @State private var rendered: Text?

    var body: some View {
        Group {
            if let rendered {
                rendered
            } else {
                Text(verbatim: rawLine)
                    .font(AppTypography.body)
            }
        }
        .lineLimit(nil)
        .onAppear { renderMarkdown() }
        .onChange(of: rawLine) { _, _ in renderMarkdown() }
    }

    private func renderMarkdown() {
        if let attr = try? AttributedString(markdown: rawLine, options: .init(interpretedSyntax: .inlineOnlyPreservingWhitespace)) {
            rendered = Text(attr)
        } else {
            rendered = nil
        }
    }
}
```

---

## 验证步骤

1. AI 开始思考时显示 BouncingDots 气泡，开始生成内容时气泡平滑过渡（不跳动）
2. 流式输出中 `**bold**` 显示为粗体，`## heading` 显示为标题，`***` 不显示为原始标记
