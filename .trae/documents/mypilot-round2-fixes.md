# MyPilot 四大问题修复计划（第二轮）

## 摘要

修复用户反馈的 4 个核心问题：
1. AI 生成文件无法通过 webchat 发送（webchat 不在 message 工具支持渠道列表中）
2. HEARTBEAT 文字出现在 AI 回复文本中
3. 多次发送消息后 AI 因未完成任务而一直「正在输入」
4. 多消息场景下无法区分 AI 回复对应哪条消息 → 本地排队机制

---

## 当前状态分析

### 问题 1：AI 生成文件无法通过 webchat 发送

**根因**：OpenClaw 的 `message` 工具只支持飞书/微信/Telegram 等渠道，webchat 不在支持列表中。AI 尝试用 `message` 工具发送文件时，因缺少 `target` 参数（webchat 没有有效的接收者 ID）而失败。

**当前代码**：`done` 帧的 `attachments` 字段已经正确解析，`ImageAttachmentCard` 和 `DocumentFileCard` 的 URL 拼接也已修复。问题不在客户端，而在服务端 AI 的工具调用限制。

**客户端可做的优化**：
- 当 `done` 帧包含 `attachments` 时，即使 `content` 为空也正确显示附件
- 修复 `done` 帧内容判断 Bug（第770行 `!content.isEmpty` 应为 `!finalContent.isEmpty`）
- 在 AI 回复中如果检测到文件生成失败的模式（如"无法发送"、"message 工具"等关键词），提供友好的提示

### 问题 2：HEARTBEAT 文字出现在 AI 回复中

**根因**：服务端在 `stream` 帧的 `delta` 字段中插入了 "HEARTBEAT" 文字作为应用层心跳。客户端的 `parseMessage` 虽然对 `type: "heartbeat"` 的帧做了静默丢弃，但 `stream` 帧中嵌入的心跳文字没有被过滤。

**当前代码**：`scheduleStreamFlush()` 直接将 `streamAccumulator` 累积到 `streamingContent`，没有过滤心跳标记。

**修复方案**：在 `stream` 帧处理中，过滤掉 delta 中的心跳标记文本。

### 问题 3：多次发送消息后 AI 一直「正在输入」

**根因**：
1. `activeProcessingCount` 计数器在多消息场景下可能不匹配——每条消息触发一个 `processing` 帧，但 `done` 帧可能只对应最后一条消息
2. 服务端可能对多条消息合并处理，只返回一个 `processing` + `done` 对，导致计数器只减了 1 但实际加了 2
3. 120 秒超时定时器只在第一个 `processing` 帧时启动，后续 `processing` 帧到达时重置了定时器，但如果服务端长时间处理多条消息，超时后 `isProcessing` 被强制重置，但服务端仍在处理

**修复方案**：
- 每收到 `processing` 帧时重置超时定时器（当前已实现）
- 在 `done`/`error` 帧处理中，确保 `activeProcessingCount` 不会低于 0（当前已用 `max(0, ...)` 保护）
- 增加一个全局安全网：如果 `isProcessing` 持续超过 180 秒（3分钟），强制重置所有状态

### 问题 4：本地排队机制

**根因**：当前没有任何机制阻止用户在 AI 处理期间发送新消息。多条消息同时发送到服务端，导致：
- AI 回复交错混乱
- 用户无法区分 AI 回复对应哪条消息
- 服务端可能因并发处理而卡顿

**设计方案**：

新增 `pendingMessages` 队列（`[Message]`）和 `isAiResponding` 计算属性：

```
isAiResponding = isProcessing || isStreaming
```

当 `isAiResponding == true` 时：
- 用户输入的新消息不发送到服务器
- 消息追加到 `pendingMessages`，`deliveryStatus = .queued`
- UI 上显示为"排队中"状态

当 AI 完成当前回复（`done`/`error` 帧到达，`isAiResponding == false`）时：
- 检查 `pendingMessages` 是否有消息
- 如果有，自动取出第一条发送到服务器
- 更新其 `deliveryStatus` 为 `.sending` → `.sent`

---

## 修改方案

### 修复 1：done 帧内容判断 Bug + 附件显示优化

**文件**：`Services/WebSocketService.swift`

**改动 A**：第770行，将 `!content.isEmpty` 改为 `!finalContent.isEmpty`

```swift
// 修改前
if !content.isEmpty || !attachments.isEmpty {

// 修改后
if !finalContent.isEmpty || !attachments.isEmpty {
```

### 修复 2：过滤 stream 帧中的 HEARTBEAT 文字

**文件**：`Services/WebSocketService.swift`

**改动**：在 `stream` 帧处理中，过滤 delta 中的心跳标记

```swift
case "stream":
    // ... 现有代码 ...
    if let delta = json["delta"] as? String, !delta.isEmpty {
        let filteredDelta = delta
            .replacingOccurrences(of: "HEARTBEAT", with: "")
            .replacingOccurrences(of: "<heartbeat/>", with: "")
            .replacingOccurrences(of: "[HEARTBEAT]", with: "")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        guard !filteredDelta.isEmpty else { return }
        // ... 用 filteredDelta 替代 delta 继续处理
    }
```

### 修复 3：isProcessing 安全网 + 超时优化

**文件**：`Services/WebSocketService.swift`

**改动 A**：将超时定时器从 120 秒增加到 180 秒，并在每次 `processing` 帧到达时重置

**改动 B**：在 `done`/`error` 帧处理后，如果 `activeProcessingCount` 归零但 `isProcessing` 仍为 true，强制重置

**改动 C**：在 `send()`/`sendMessage()` 中重置 `abortedGeneration = false` 之前，先检查是否有残留的 processing 状态

### 修复 4：本地消息排队机制

**文件**：`Services/WebSocketService.swift`

**改动 A**：新增属性

```swift
var pendingMessages: [Message] = []
var isAiResponding: Bool { isProcessing || isStreaming }
```

**改动 B**：新增 `enqueueOrSend()` 方法

```swift
func enqueueOrSend(_ text: String) {
    mainAsync {
        if self.isAiResponding {
            let queuedMsg = Message(content: text, isFromUser: true, deliveryStatus: .queued)
            self.pendingMessages.append(queuedMsg)
            self.messages.append(queuedMsg)
        } else {
            self.send(text: text)
        }
    }
}
```

**改动 C**：在 `done`/`error` 帧处理后，检查并发送排队消息

```swift
// 在 done/error 处理末尾
if !self.isAiResponding && !self.pendingMessages.isEmpty {
    let next = self.pendingMessages.removeFirst()
    self.send(text: next.content)
}
```

**文件**：`Features/Chat/ChatInputSection.swift`

**改动 D**：将 `wsService.sendMessage(msg)` 改为 `wsService.enqueueOrSend()`

**文件**：`Features/Chat/MessageBubbleView.swift`

**改动 E**：在 `deliveryStatusIcon` 中增加 `.queued` 状态显示

```swift
case .queued:
    HStack(spacing: 2) {
        Image(systemName: "clock")
            .font(.system(size: 9))
        Text("排队中")
            .font(.system(size: 9))
    }
    .foregroundStyle(AppColors.amber300)
```

**文件**：`Models/Message.swift`

**改动 F**：在 `MessageDeliveryStatus` 枚举中确认 `.queued` 已存在（当前已有）

---

## 假设与决策

| 决策点 | 选择 | 理由 |
|--------|------|------|
| HEARTBEAT 过滤方式 | 字符串替换 | 服务端可能用不同格式嵌入心跳，覆盖常见模式 |
| 排队消息发送时机 | AI 完成后自动发送 | 用户选择"本地排队，AI完成后自动发送" |
| 排队消息显示 | 在聊天区显示，标记"排队中" | 用户能看到自己的消息已记录，只是等待发送 |
| 超时阈值 | 180 秒 | 复杂任务可能需要较长时间，3分钟是合理上限 |
| done 帧内容判断 | 使用 finalContent 而非 content | 修复 AI 回复丢失的 Bug |

---

## 验证步骤

1. **文件发送**：让 AI 生成文件，验证 `done` 帧附件正确显示，内容不丢失
2. **HEARTBEAT 过滤**：验证 AI 回复文本中不再出现 "HEARTBEAT" 字样
3. **多消息不卡**：连续发送 3 条消息，验证 AI 逐个回复后「正在输入」正确消失
4. **排队机制**：AI 回复期间发送新消息，验证消息显示"排队中"；AI 完成后自动发送
5. **构建验证**：`xcodebuild -scheme MyPilot -destination 'platform=macOS' build ONLY_ACTIVE_ARCH=NO`
