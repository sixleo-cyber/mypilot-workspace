# WebSocketService 保守小拆计划

## Summary

消息可靠性补测已经闭环，下一阶段做 WebSocketService 保守小拆。目标是在不改变任何消息语义、不拆新文件、不调整 public API 的前提下，降低 `WebSocketService.swift` 的局部复杂度，为后续更大拆分做准备。

用户已确认：

1. 本轮做“保守小拆”。
2. 目标是降风险，而不是最大化减少行数。
3. 本轮验证执行完整门禁：Swift build、Swift tests、`mypilot-link npm run verify`。

本轮不拆 `SearchSettingsManager` 到新文件，不重构整个 `parseMessage(_:)`，不改变断线语义，不自动补发 `chat.send`，不修改 daemon、Gateway 协议或服务器素材。

## Current State Analysis

### 1. WebSocketService 当前仍然过重

文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/WebSocketService.swift`

当前职责仍包括：

- 连接生命周期编排。
- 消息发送、排队、重试。
- 流式输出和 thinking 内容。
- `gateway-rpc` / config / agent / schedule RPC 回调。
- 会话切换和跨会话状态。
- `task.status` / `task.notify` 处理。
- `message` / `message.send` 附件解析。
- 搜索设置管理。

技术债仍记录在：

- `/Users/liaoxing/Downloads/未命名文件夹/FEATURE_CHECKLIST.md`

当前 T1：

- `WebSocketService 仍臃肿（~800 行）`
- 影响：`维护困难`
- 优先级：`P2`

### 2. 当前测试安全网已经更充足

消息可靠性补测已经新增：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/My PilotTests/MyPilotTests/WebSocketServiceReliabilityTests.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/My PilotTests/MyPilotTests/MessageDeliveryStatusTests.swift`

覆盖：

- 未连接时 `send(text:)` / `sendMessage(_:)` / `enqueueOrSend(_:)` 不创建消息。
- `disconnect()` 将非终态用户消息标记为 `.failed`。
- `disconnect()` 清空 pending。
- AI 响应中 `enqueueOrSend` 和 `enqueueOrSendMessage` 创建 `.queued`。
- `MessageDeliveryStatus.isTerminal` 和 `fromTaskStatus` 映射。

这为本轮小拆提供回归保护。

### 3. 重复失败标记逻辑可以安全抽取

`WebSocketService.swift` 中存在两处重复逻辑：

1. `connectionManager.onDisconnected` 回调内：

```swift
for i in self.messages.indices {
    if self.messages[i].isFromUser,
       let status = self.messages[i].deliveryStatus,
       !status.isTerminal {
        self.messages[i].deliveryStatus = .failed
        self.messages[i].isFailed = true
    }
}
```

2. `disconnect()` 内：

```swift
for i in self.messages.indices {
    if self.messages[i].isFromUser,
       let status = self.messages[i].deliveryStatus,
       !status.isTerminal {
        self.messages[i].deliveryStatus = .failed
        self.messages[i].isFailed = true
    }
}
```

这两处语义相同，适合抽成私有 helper。

### 4. parseMessage 尾部三个分支适合保守拆 handler

当前 `parseMessage(_:)` 内尾部存在相对独立的分支：

- `task.status`
- `task.notify`
- `message`, `message.send`

这些分支不牵涉 `done/error/stream` 的复杂时序，也不改变 WebSocket 外部接口。适合先拆成私有方法：

- `handleTaskStatusFrame(_ json: [String: Any])`
- `handleTaskNotifyFrame(_ json: [String: Any])`
- `handleMessageFrame(_ json: [String: Any])`

这属于“保守小拆”：仍留在同一文件，不移动类，不改变 public API。

## Proposed Changes

### 1. 新增私有 helper：markNonTerminalUserMessagesFailed

文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/WebSocketService.swift`

新增方法位置：建议放在 `disconnect()` 附近或 `parseMessage(_:)` 前。

实现：

```swift
private func markNonTerminalUserMessagesFailed() {
    for i in messages.indices {
        if messages[i].isFromUser,
           let status = messages[i].deliveryStatus,
           !status.isTerminal {
            messages[i].deliveryStatus = .failed
            messages[i].isFailed = true
        }
    }
}
```

替换位置：

1. `connectionManager.onDisconnected` 回调中替换重复 for-loop。
2. `disconnect()` 中替换重复 for-loop。

语义不变：只标记已有非终态用户消息，不影响 assistant 消息和终态用户消息。

### 2. 拆出 task.status handler

文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/WebSocketService.swift`

新增：

```swift
private func handleTaskStatusFrame(_ json: [String: Any]) {
    let taskId = json["taskId"] as? String ?? ""
    let taskStatus = json["status"] as? String ?? ""
    let convId = json["conversationId"] as? String ?? currentConversationId
    mainAsync { [weak self] in
        guard let self = self else { return }
        guard !taskId.isEmpty, !taskStatus.isEmpty else { return }
        guard let status = MessageDeliveryStatus.fromTaskStatus(taskStatus) else { return }
        if let idx = self.messages.lastIndex(where: { $0.isFromUser && $0.deliveryStatus != nil && !$0.deliveryStatus!.isTerminal }) {
            self.messages[idx].deliveryStatus = status
        }
        if status == .running && convId == self.currentConversationId {
            self.isProcessing = true
            self.isStreaming = false
        }
        if status.isTerminal && convId == self.currentConversationId {
            self.isProcessing = self.activeProcessingCount > 0
            self.isStreaming = false
            self.processingTimeoutTimer?.invalidate()
        }
    }
}
```

`parseMessage(_:)` 中：

```swift
case "task.status":
    handleTaskStatusFrame(json)
```

### 3. 拆出 task.notify handler

新增：

```swift
private func handleTaskNotifyFrame(_ json: [String: Any]) {
    let taskStatus = json["status"] as? String ?? ""
    let summary = json["summary"] as? String ?? ""
    let convId = json["conversationId"] as? String ?? currentConversationId
    mainAsync { [weak self] in
        guard let self = self else { return }
        if !summary.isEmpty && convId == self.currentConversationId {
            let statusIcon: String = {
                switch taskStatus {
                case "succeeded": return "✅"
                case "failed": return "❌"
                case "timed_out": return "⏱"
                case "cancelled": return "⏹"
                case "lost": return "👻"
                default: return "📋"
                }
            }()
            self.messages.append(Message(content: "\(statusIcon) 任务完成: \(summary)", isFromUser: false))
        }
    }
}
```

`parseMessage(_:)` 中：

```swift
case "task.notify":
    handleTaskNotifyFrame(json)
```

注意：原逻辑读取了 `taskId` 但未使用。保守小拆可以不保留未使用变量，避免无效变量；行为不变。

### 4. 拆出 message/message.send handler

新增：

```swift
private func handleMessageFrame(_ json: [String: Any]) {
    let content = json["content"] as? String ?? ""
    let rawAttachments = json["attachments"] as? [[String: Any]] ?? []
    let (displayContent, attachments) = AttachmentTransport.resolveAllAttachments(
        rawAttachments: rawAttachments,
        content: content,
        serverURL: instance?.effectiveServerURL ?? "",
        token: instance?.token
    )
    if !displayContent.isEmpty || !attachments.isEmpty {
        mainAsync { [weak self] in
            guard let self = self else { return }
            self.messages.append(Message(content: displayContent.isEmpty ? "📎" : displayContent, isFromUser: false, attachments: attachments))
            self.onMessagePersist?()
        }
    }
}
```

`parseMessage(_:)` 中：

```swift
case "message", "message.send":
    handleMessageFrame(json)
```

### 5. 不拆 done/error/stream

本轮明确不碰以下分支的大结构：

- `stream`
- `done`
- `error`
- `processing`
- `gateway-rpc`

原因：这些分支涉及流式时序、跨会话落盘、pending flush、abort recovery，风险更高。保守小拆应避开。

### 6. 功能清单更新

文件：

- `/Users/liaoxing/Downloads/未命名文件夹/FEATURE_CHECKLIST.md`

改动：

1. 更新 T1：
   - 问题：`WebSocketService 已完成第一阶段保守小拆，仍需继续拆分 stream/done/error 与搜索设置管理`
   - 影响：`核心文件复杂度仍偏高`
   - 优先级：`P2`
2. 增加修复历史：
   - `v15 | 06-10 | WebSocketService 保守小拆：抽非终态失败标记 helper，拆 task.status/task.notify/message handler | T1`

## Verification Steps

### 1. Swift build

```bash
cd /Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot
xcodebuild -project MyPilot.xcodeproj -scheme MyPilot -configuration Debug -destination 'platform=macOS' -skipMacroValidation build
```

预期：`BUILD SUCCEEDED`。

### 2. Swift tests

```bash
cd /Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot
xcodebuild test -project MyPilot.xcodeproj -scheme MyPilot -destination 'platform=macOS' -skipMacroValidation
```

预期：`TEST SUCCEEDED`。

重点关注：

- `WebSocketServiceReliabilityTests`
- `MessageDeliveryStatusTests`
- `AttachmentTransportTests`
- `ConversationPersistenceTests`

### 3. mypilot-link verify

本轮不改 daemon，但用户要求完整门禁，因此运行：

```bash
cd /Users/liaoxing/Downloads/未命名文件夹/mypilot-link
npm run verify
```

预期：通过。

## Assumptions & Decisions

1. 用户已确认本轮只做 WebSocketService 保守小拆。
2. 不拆新文件。
3. 不移动 `SearchSettingsManager`。
4. 不改 public API。
5. 不改变断线发送语义。
6. 不自动补发 `chat.send`。
7. 不修改 daemon、Gateway 协议。
8. 不修改服务器素材，不动 `/root/.openclaw/agents/main/SOUL.md`。
9. 不引入新依赖。
10. 不提交 git commit，除非用户明确要求。

## Out of Scope

本轮不做：

1. `SearchSettingsManager` 移文件。
2. `parseMessage(_:)` 全量重构。
3. `stream` / `done` / `error` 分支拆分。
4. WebSocketFrameRouter / ChatFrameHandler 新类型。
5. 发布或 npm publish。
6. git commit。
