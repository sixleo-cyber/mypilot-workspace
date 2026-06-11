# MyPilot 四大问题修复与优化计划

## 摘要

针对用户反馈的 4 个核心问题进行技术修复和体验优化：
1. AI 生成文件后无法通过 app 发送（技术 Bug）
2. AI 复杂任务时「正在输入」状态卡住（优化建议）
3. 中英文混合输入时回车键冲突（优化建议）
4. 停止生成后消息无响应 + 消息已读/未读机制（新功能）

---

## 当前状态分析

### 问题 1：AI 生成文件后无法发送

**根因**：AI 生成文件（图片/markdown/word/excel/ppt）后，OpenClaw 服务端通过 `done` 帧的 `attachments` 字段返回文件信息。当前代码在 `WebSocketService.swift:683-692` 正确解析了 `done` 帧中的 `attachments`，但存在以下问题：

- **Bug A**：`MessageAttachment.base64Data` 不参与 `Codable` 序列化（`CodingKeys` 排除了它），持久化后 base64 数据丢失
- **Bug B**：AI 生成的附件 URL 是服务端相对路径（如 `/files/xxx.png`），`ImageAttachmentCard` 拼接 `serverURL + attachment.url` 时，如果 `serverURL` 末尾缺少 `/` 或 URL 格式不匹配，图片无法加载
- **Bug C**：`done` 帧的 `content` 可能为空字符串（服务端只在 `stream` 帧中发送内容），导致最终消息 content 为空，即使有附件也不显示

**关键代码位置**：
- `WebSocketService.swift:683-692` — done 帧附件解析
- `WebSocketService.swift:693` — Message 创建（content 可能为空）
- `Message.swift:15-17` — CodingKeys 排除 base64Data
- `MessageBubbleView.swift:194-248` — ImageAttachmentCard URL 拼接

### 问题 2：「正在输入」状态卡住

**根因**：`isProcessing` 状态只在收到 `processing` 帧时设为 `true`，在收到 `stream`/`done`/`error` 帧时设为 `false`。但如果服务端在复杂任务中：
- 长时间不发送任何帧（如执行耗时工具调用），客户端一直显示「正在输入」
- 服务端异常断开但未发送 `error` 或 `done` 帧，`isProcessing` 永远不会重置
- `abortedGeneration` 守卫在 `stopGeneration()` 后丢弃所有后续帧，但 `isProcessing` 已被重置，所以这不是直接原因

**当前没有超时机制**来处理长时间无响应的情况。

### 问题 3：中英文混合输入回车冲突

**根因**：当前实现在 `InputBarView.swift:210-216` 使用 `.onKeyPress(.return)` + `NSEvent.modifierFlags.contains(.shift)` 检测。问题在于：
- 中文输入法（IME）激活时，按 Enter 键先确认候选词，但 `.onKeyPress` 可能在 IME 确认之前就拦截了按键
- `NSEvent.modifierFlags` 是"侧信道"检测，在 IME 激活时行为不可靠
- macOS 的 `NSTextView`（TextField 底层）在 IME 激活时有 `markedText`（预输入文本），此时 Enter 应该确认输入法候选词而非发送消息

### 问题 4：停止生成后无响应 + 已读/未读机制

**根因 A（停止后无响应）**：`stopGeneration()` 设置 `abortedGeneration = true`，后续所有帧（包括 `done`、`error`）都被 `guard !self.abortedGeneration` 丢弃。但 `abortedGeneration` **永远不会被重置为 `false`**（除了在 `send()`/`sendMessage()` 开头），导致：
- 停止后，服务端可能仍在发送 `stream`/`done` 帧，全部被丢弃
- 用户发送新消息时，`send()` 会重置 `abortedGeneration = false`，但如果服务端上一轮的 `done` 帧还在传输中，它到达时 `abortedGeneration` 已经是 `false`，会被当作新消息处理

**根因 B（已读/未读）**：OpenClaw Gateway 没有 ACK 机制，只有 ACP（Agent Client Protocol）。ACP 是 IDE 集成协议，不适用于 webchat 场景。需要基于现有 `processing` 帧来推断服务端已收到并开始处理消息。

---

## 修改方案

### 修复 1：AI 生成文件发送问题

**文件**：`Services/WebSocketService.swift`

**改动 A**：修复 `done` 帧中 content 为空时使用 streamingContent
```swift
// L693 附近
let finalContent = content.isEmpty ? self.streamingContent : content
let msg = Message(content: finalContent, isFromUser: false, attachments: attachments, thinkingContent: thinkingContent)
```

**改动 B**：在 `done` 帧附件解析中，如果附件 URL 是相对路径，拼接完整 URL
```swift
var url = att["url"] as? String ?? ""
if !url.isEmpty && !url.hasPrefix("http") {
    // 拼接服务端 base URL
    let base = self.instance?.effectiveServerURL ?? ""
    url = base.hasSuffix("/") ? "\(base)\(url)" : "\(base)/\(url)"
}
```

**文件**：`Features/Chat/MessageBubbleView.swift`

**改动 C**：`ImageAttachmentCard` 中增强 URL 拼接容错
- 确保 `serverURL` 和 `attachment.url` 之间只有一个 `/`
- 添加加载失败时的重试按钮

**文件**：`Models/Message.swift`

**改动 D**：将 `base64Data` 加入 `CodingKeys`，使其参与持久化（仅当 URL 为空时才序列化 base64，避免数据膨胀）

### 修复 2：「正在输入」超时保护

**文件**：`Services/WebSocketService.swift`

**改动**：添加处理超时定时器
- 收到 `processing` 帧时，启动 120 秒超时定时器
- 如果 120 秒内没有收到 `stream`/`done`/`error` 帧，自动重置 `isProcessing = false` 并追加超时提示消息
- 收到 `stream`/`done`/`error` 帧时，取消超时定时器
- 新增 `processingTimeoutTimer: Timer?` 私有属性

### 修复 3：IME 输入法回车冲突

**文件**：`Views/InputBarView.swift`

**改动**：替换 `.onKeyPress` 为 `NSTextView` 代理方式
- 将 `TextField` 替换为包装了 `NSTextView` 的自定义 `NSViewRepresentable`
- 在 `NSTextView` 的 `doCommandBySelector` 中拦截 Enter 键：
  - 如果有 `markedText`（IME 预输入），不拦截，让输入法处理
  - 如果按住 Shift，插入换行符
  - 否则，调用 `handleSubmit()`
- 这是最可靠的 macOS IME 兼容方案

### 修复 4：停止后无响应 + 已读/未读

**改动 A：修复 abortedGeneration 永不重置的 Bug**

**文件**：`Services/WebSocketService.swift`

- 在 `stopGeneration()` 中，发送 `sessions.abort` 后，启动 5 秒定时器
- 5 秒后如果仍未收到 `done`/`error` 帧，强制重置 `abortedGeneration = false` 和 `isProcessing = false`
- 收到 `done`/`error` 帧时，如果 `abortedGeneration == true`，正常处理帧（保存已流式输出的内容），然后重置 `abortedGeneration = false`

**改动 B：消息已读/未读机制**

**文件**：`Models/Message.swift`

- 新增 `var deliveryStatus: MessageDeliveryStatus` 枚举字段
```swift
enum MessageDeliveryStatus: String, Codable {
    case sending       // 发送中（本地显示发送动画）
    case sent          // 已发送到服务器（WebSocket 帧已发出）
    case delivered     // 服务器已接收并开始处理（收到 processing 帧）
    case failed        // 发送失败
}
```

**文件**：`Services/WebSocketService.swift`

- `send()`/`sendMessage()` 中：消息创建时 `deliveryStatus = .sending`，WebSocket 帧成功发出后设为 `.sent`
- 收到 `processing` 帧：将对应的用户消息 `deliveryStatus` 更新为 `.delivered`
- 发送失败时：`deliveryStatus = .failed`

**文件**：`Features/Chat/MessageBubbleView.swift`

- 用户消息气泡右下角显示状态图标：
  - `.sending`：小型 ProgressView（发送动画）
  - `.sent`：单勾 ✓（灰色）
  - `.delivered`：双勾 ✓✓（绿色）
  - `.failed`：红色感叹号 + 重试按钮

**文件**：`Features/Chat/ChatMessageSection.swift`

- AI 消息的「正在输入」状态仅在收到 `processing` 帧后才显示（而非消息发出后立即显示），实现用户期望的"消息已读后才开始输入"体验

---

## 假设与决策

| 决策点 | 选择 | 理由 |
|--------|------|------|
| IME 兼容方案 | NSTextView 包装 | `.onKeyPress` 无法感知 IME markedText，是唯一可靠方案 |
| 已读/未读判定 | 基于 `processing` 帧到达 | OpenClaw 无 ACK 机制，`processing` 是最早的"服务端已接收"信号 |
| 超时阈值 | 120 秒 | 复杂任务（如代码生成）可能需要较长时间，120s 是合理上限 |
| abortedGeneration 重置 | 5 秒定时器 + done/error 帧到达时重置 | 避免永久卡死，同时允许服务端正常完成 |
| base64Data 持久化 | 仅在 URL 为空时序列化 | 避免大量 base64 数据膨胀持久化存储 |

---

## 验证步骤

1. **文件发送**：让 AI 生成图片/文件，验证附件在消息气泡中正确显示，可点击打开
2. **超时保护**：模拟服务端长时间无响应（断开网络），验证 120 秒后自动退出「正在输入」
3. **IME 输入**：切换到中文输入法，输入拼音后按 Enter 确认候选词（不应发送消息），再按 Enter 发送
4. **停止后恢复**：输入 `/stop` 后立即发送新消息，验证新消息正常发送和接收
5. **已读/未读**：发送消息后观察状态图标变化：发送中 → 已发送 → 已送达
6. **构建验证**：`xcodebuild -scheme MyPilot -destination 'platform=macOS' build ONLY_ACTIVE_ARCH=NO`
