# Bug 修复计划：空白消息气泡 + 输入栏占位符

## Bug 1: 空白消息气泡

### 根因分析

**AI 消息气泡无空内容保护**：用户消息在 `MessageBubbleView.swift:81` 有 `if !message.content.isEmpty` 守卫，但 AI 消息（L125-131）无条件渲染 `MarkdownRenderer(message.content)`，即使 content 为空也会渲染带 padding + background 的空气泡。

**空消息来源**（3 处）：

1. **`AgentRpcClient.swift:245`** — `requestHistory` 解析历史消息时，直接用 `content` 创建 Message，无空内容过滤：
   ```swift
   historyMessages.append(Message(content: content, isFromUser: role == "user"))
   ```
   如果 Gateway 返回的历史中有空 content 的消息（如 tool call 消息），会创建空气泡。

2. **`WebSocketMessageSending.swift:39-44`** — `mapHistoryMessage` 有部分保护（attachments 存在时用 "📎"），但 content 和 attachments 都为空时仍创建空消息。

3. **`WebSocketChatFrameHandler.swift:144`** — abort 恢复路径：
   ```swift
   if !self.streamingContent.isEmpty {
       self.messages.append(Message(content: self.streamingContent, isFromUser: false))
   }
   ```
   此处有保护，但 `handleDoneFrame` L178 的 `!finalDisplayContent.isEmpty || !mergedAttachments.isEmpty` 在 `effectiveConvId == currentConversationId` 分支中，跨会话消息无此保护。

### 修复方案

#### Fix 1a: MessageBubbleView — AI 气泡空内容守卫

文件：`Features/Chat/MessageBubbleView.swift`

在 AI 消息分支（L119-141），对 `MarkdownRenderer` 添加空内容守卫，与用户消息保持一致：

```swift
// 修改前 (L125-131):
MarkdownRenderer(message.content)
    .padding(.horizontal, 14)
    .padding(.vertical, 8)
    .background(AppColors.aiBubbleBg)
    .cornerRadius(18, corners: [.topRight, .bottomLeft, .bottomRight])
    .cornerRadius(4, corners: [.topLeft])

// 修改后:
if !message.content.isEmpty || (message.thinkingContent != nil && !message.thinkingContent!.isEmpty && !ThinkingContentSanitizer.isLikelyCorruptThinking(message.thinkingContent!)) {
    MarkdownRenderer(message.content)
        .padding(.horizontal, 14)
        .padding(.vertical, 8)
        .background(AppColors.aiBubbleBg)
        .cornerRadius(18, corners: [.topRight, .bottomLeft, .bottomRight])
        .cornerRadius(4, corners: [.topLeft])
} else if !message.attachments.isEmpty {
    // 纯附件消息（无文本内容）也需要渲染气泡容器
    EmptyView()
}
```

**更简洁的方案**：只对 `MarkdownRenderer` 加 `!message.content.isEmpty` 守卫，附件和思考内容已有独立渲染逻辑：

```swift
if !message.content.isEmpty {
    MarkdownRenderer(message.content)
        .padding(.horizontal, 14)
        .padding(.vertical, 8)
        .background(AppColors.aiBubbleBg)
        .cornerRadius(18, corners: [.topRight, .bottomLeft, .bottomRight])
        .cornerRadius(4, corners: [.topLeft])
}
```

#### Fix 1b: AgentRpcClient — 过滤历史空消息

文件：`Services/AgentRpcClient.swift`

在 `requestHistory` 中过滤空 content 且无附件的消息：

```swift
// 修改前 (L242-246):
for m in rawMessages {
    let role = m["role"] as? String ?? ""
    let content = m["content"] as? String ?? ""
    historyMessages.append(Message(content: content, isFromUser: role == "user"))
}

// 修改后:
for m in rawMessages {
    let role = m["role"] as? String ?? ""
    let content = m["content"] as? String ?? ""
    let rawAttachments = m["attachments"] as? [[String: Any]] ?? []
    // 跳过空内容且无附件的消息（如 tool call 中间态）
    guard !content.isEmpty || !rawAttachments.isEmpty else { continue }
    historyMessages.append(Message(content: content.isEmpty ? "📎" : content, isFromUser: role == "user"))
}
```

#### Fix 1c: WebSocketMessageSending — 补全空内容保护

文件：`Services/WebSocketMessageSending.swift`

`mapHistoryMessage` 已有部分保护，但 content 和 attachments 都为空时仍创建空消息。添加 guard：

```swift
// 修改前 (L39-44):
return Message(
    content: displayContent.isEmpty && !attachments.isEmpty ? "📎" : displayContent,
    isFromUser: role == "user",
    attachments: attachments,
    thinkingContent: thinking
)

// 修改后:
if displayContent.isEmpty && attachments.isEmpty && thinking == nil {
    return nil
}
return Message(
    content: displayContent.isEmpty && !attachments.isEmpty ? "📎" : displayContent,
    isFromUser: role == "user",
    attachments: attachments,
    thinkingContent: thinking
)
```

同时修改 `mapHistoryMessages` 返回类型过滤 nil：

```swift
// 修改前:
func mapHistoryMessages(_ rawMessages: [[String: Any]]) -> [Message] {
    rawMessages.map { mapHistoryMessage($0) }
}

// 修改后:
func mapHistoryMessages(_ rawMessages: [[String: Any]]) -> [Message] {
    rawMessages.compactMap { mapHistoryMessage($0) }
}
```

---

## Bug 2: 输入栏占位符字体和位置偏下

### 根因分析

文件：`Views/IMETextView.swift`

1. **字体不一致**：`fontSize` 参数传入 16，但 placeholder draw 时 fallback 用 `font ?? NSFont.systemFont(ofSize: 14)`，如果 `font` 为 nil 则显示 14px 而非 16px。
2. **位置偏下**：placeholder 绘制 y 偏移为 `textContainerInset.height + 4`（= 2+4=6px），加上 NSTextView 的默认文本容器基线偏移，导致文字视觉上偏下。
3. **NSTextView 默认行为**：NSTextView 的 `textContainerInset` 设置为 `(4, 2)`，但实际文本绘制区域有额外的 lineFragmentPadding 和基线调整，placeholder 作为手动绘制没有对齐这些偏移。

### 修复方案

文件：`Views/IMETextView.swift`

#### Fix 2a: 统一 placeholder 字体

```swift
// 修改前 (L101-103):
let attrs: [NSAttributedString.Key: Any] = [
    .foregroundColor: NSColor(AppColors.ink400),
    .font: font ?? NSFont.systemFont(ofSize: 14)
]

// 修改后:
let attrs: [NSAttributedString.Key: Any] = [
    .foregroundColor: NSColor(AppColors.ink400),
    .font: font ?? NSFont.systemFont(ofSize: fontSize)
]
```

#### Fix 2b: 修正 placeholder 绘制位置

使用 NSTextView 的 layoutManager 计算实际文本基线位置，让 placeholder 与输入文本对齐：

```swift
// 修改前 (L106):
ps.draw(in: CGRect(x: textContainerInset.width + 4, y: textContainerInset.height + 4, width: bounds.width - 16, height: bounds.height))

// 修改后:
// 计算与实际文本基线对齐的 y 位置
let lineHeight = font?.boundingRectForFont.height ?? fontSize * 1.2
let textY = textContainerInset.height + (bounds.height - textContainerInset.height * 2 - lineHeight) / 2
ps.draw(in: CGRect(x: textContainerInset.width + (textContainer?.lineFragmentPadding ?? 4), y: textY, width: bounds.width - textContainerInset.width * 2 - (textContainer?.lineFragmentPadding ?? 4) * 2, height: lineHeight))
```

---

## 修改文件清单

| 文件 | 修改内容 |
|------|----------|
| `Features/Chat/MessageBubbleView.swift` | AI 气泡添加 `!message.content.isEmpty` 守卫 |
| `Services/AgentRpcClient.swift` | requestHistory 过滤空消息 |
| `Services/WebSocketMessageSending.swift` | mapHistoryMessage 返回 Optional + compactMap 过滤 |
| `Views/IMETextView.swift` | placeholder 字体统一 + 绘制位置修正 |

## 验证步骤

1. 编译通过（Xcode IDE 中 Clean Build 后编译）
2. 新建对话页面无空气泡
3. 切换到 main agent 对话页面无空气泡
4. 输入栏 placeholder 文字垂直居中、字体大小与输入文字一致
