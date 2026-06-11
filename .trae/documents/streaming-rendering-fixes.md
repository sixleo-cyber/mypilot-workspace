# 流式输出渲染修复计划

## 当前状态分析

### 问题1：结构化输出中 `###` 仍显示为原始文本

**根因分析**：
- [MarkdownRenderer.swift](file:///Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Chat/MarkdownRenderer.swift) 的 `ParaText` 行渲染使用 `AttributedString(markdown: line, options: .init(interpretedSyntax: .inlineOnlyPreservingWhitespace))`
- `inlineOnlyPreservingWhitespace` 选项只解析**内联** Markdown（粗体`**`、斜体`*`、代码`` ` ``、链接等），明确**排除**块级元素（标题 `###`、列表、引用等）
- 因此 `### 标题` 被原样显示为 `### 标题` 而非渲染为标题样式

**影响文件**：`MarkdownRenderer.swift` — `ParaText.paras` 计算属性（第162-179行）

### 问题2：回答结束后思考渲染遮挡生成的答案

**根因分析**：
- [ChatMessageSection.swift](file:///Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Chat/ChatMessageSection.swift) 使用 `ZStack(alignment: .bottom)` 将 `StreamingIndicator` 叠加在消息列表上方
- `StreamingIndicator` 显示条件：`wsService.isStreaming || wsService.isProcessing`
- 上一轮修复添加的 `conversationStates` 机制在切换会话时保存/恢复 `isProcessing` 和 `isStreaming` 状态
- 当 `done` 到达时，`conversationStates` 被清理，但存在边缘情况：`streamingContent` 和 `isStreaming`/`isProcessing` 的清除与 `messages.append` **不在同一原子操作内**，`@Observable` 可能触发两次视图更新，导致短暂重叠

**影响文件**：
- `ChatMessageSection.swift` — ZStack 布局和 StreamingIndicator 条件
- `WebSocketService.swift` — `done` case 中的状态清除顺序

### 问题3：流式输出卡顿，没有打字机效果

**根因分析**：
- [WebSocketService.swift](file:///Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/WebSocketService.swift) 中 `scheduleStreamFlush` 使用 **0.15秒**定时器批量刷新（第471行）
- 每个 delta 到来时先累积到 `streamAccumulator`，150ms 后才一次性追加到 `streamingContent`
- 如果 150ms 内来了多个 delta（实际 Gateway 推送频率很高），所有文本一次性跳出来，产生**卡顿跳跃**而非**逐字平滑**效果
- 0.15s 间隔在 macOS 上等于约 9 帧（60fps），人眼明显可感知不连贯

**影响文件**：`WebSocketService.swift` — `scheduleStreamFlush` 方法（第469-479行）

---

## 修改方案

### 修改1：MarkdownRenderer 支持标题语法（问题1）

**文件**：`MarkdownRenderer.swift`

**做法**：在 `ParaText.paras` 计算中添加标题行预处理，将 `### text` 转换为粗体+适当字号

**具体改动**：
- 在 `Line` 构建时（第165-176行），识别以 `#{1,6} ` 开头的行
- 对标题行：
  - 去掉前缀 `#` 和空格
  - 用 `AttributedString(markdown: "**\(text)**")` 创建粗体属性字符串
  - 在 `body` 中为标题行使用 `.font(.headline)`（1级）或 `.font(.subheadline)`（2-6级）

```swift
// 伪代码示意
if line.hasPrefix("# ") {
    let text = String(line.dropFirst(2))
    let level: Int = 1
} else if line.hasPrefix("## ") {
    let text = String(line.dropFirst(3))
    let level: Int = 2
} else if ... {
    // up to ######
}
```

### 修改2：消除思考/流式指示器与答案重叠（问题2）

**文件**：`ChatMessageSection.swift`、`WebSocketService.swift`

**做法**：
1. **关键修复**：在 `ChatMessageSection` 中，当 `messages` 包含最近一条非用户消息时，不再显示 `ProcessingView` — 因为这意味着 AI 已经完成了回复
2. **或更干净的方案**：移除 `isProcessing`/`isStreaming` 对外暴露的逻辑，改为让 `ChatMessageSection` 检查是否有一条"pending streaming message"来判断

**推荐方案（最小改动）**：
- 在 `WebSocketService` 中添加一个 `var hasReceivedDone = false` 标记
- `done` 处理时设置 `hasReceivedDone = true`，切换会话时重置
- `ChatMessageSection` 中 StreamingIndicator 只在 `!hasReceivedDone && (isStreaming || isProcessing)` 时显示
- 或更简单：在 `done` 处理中先设置 `isStreaming = false; isProcessing = false`，然后在**同一个 `withTransaction`** 中追加消息，确保 SwiftUI 只做一次视图更新

**实际推荐方案**：使用 `withTransaction(Transaction(animation: .none))` 包裹 `done` 处理中的所有状态变更，强制 SwiftUI 原子化更新。

### 修改3：优化流式输出为平滑打字机效果（问题3）

**文件**：`WebSocketService.swift`

**做法**：降低刷新间隔，从 0.15s 降到 0.03s（约 2 帧 @ 60fps），使增量文本几乎实时显示

**具体改动**：
- 第471行：`withTimeInterval: 0.15` → `withTimeInterval: 0.03`
- 可选增强：添加字符级平滑动画，但 0.03s 间隔已足够流畅

---

## 修改文件清单

| 文件 | 修改内容 | 行号 |
|------|----------|------|
| `MarkdownRenderer.swift` | `ParaText.paras` 添加标题行检测和加粗渲染 | ~165-176 |
| `ChatMessageSection.swift` | 添加 `hasReceivedDone` 条件或 `withTransaction` 包裹 | ~35-42 |
| `WebSocketService.swift` | `done` case 添加原子更新 | ~588-607 |
| `WebSocketService.swift` | `scheduleStreamFlush` 刷新间隔 0.15 → 0.03 | ~471 |

## 验证方案

1. **问题1验证**：发送"用markdown格式输出一个包含三级标题和列表的内容"，检查 `###` 是否正确渲染为粗体标题
2. **问题2验证**：发送多条消息，观察回答完成后 StreamingIndicator 立即消失，不与消息气泡重叠
3. **问题3验证**：发送消息，观察流式输出呈现平滑打字机效果，不再出现大块跳跃
