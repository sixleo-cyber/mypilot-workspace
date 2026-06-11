# 消息可靠性补测计划

## Summary

诊断脱敏增强完成后，下一阶段做消息可靠性完整补测。目标是在不改变当前产品语义的前提下，补强断线、排队、失败状态和 task.status 映射的测试安全网，为后续 WebSocketService 小步拆分提供保护。

用户已确认：

1. 下一阶段优先做消息可靠性补测。
2. 本轮做完整补测：disconnect 标 failed、AI 响应中 enqueue、状态枚举、task status 映射。
3. 允许为测试性和可维护性做极小代码改动，例如抽取纯函数。
4. 不改主语义：断线新发仍只保留草稿，不创建消息，不自动补发 `chat.send`。

## Current State Analysis

### 1. 当前消息可靠性语义已经落地

关键文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Views/InputBarView.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Views/ChatView.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/WebSocketService.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/ConnectionManager.swift`

当前语义：

1. 输入栏层：断线时发送按钮禁用；如果发送路径被触发，也会提示“连接已断开，输入内容已保留，重连后再发送”，不调用 `onSend`，不清空输入和附件。
2. 服务层：`send(text:)` 和 `sendMessage(_:)` 都先检查 `connectionManager.isConnected`，未连接时直接 return，不 append 新消息。
3. `ConnectionManager.disconnect()` 已过滤 pending send queue 中的 `chat.send`，避免重连后自动补发非幂等 AI 请求。
4. `WebSocketService.disconnect()` 会把已有非终态用户消息标记为 `.failed` 并设置 `isFailed = true`，然后清空 `pendingMessages`。

### 2. 当前测试覆盖不足

关键文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/My PilotTests/MyPilotTests/WebSocketServiceReliabilityTests.swift`

已有测试：

1. `sendMessage` 未连接时不 append。
2. `send(text:)` 未连接时不 append。
3. `enqueueOrSend` 未连接且 idle 时不创建 failed 消息。
4. `discardConversationState` 标记 discarded。

缺口：

1. 未测试 disconnect 会把 `.sending` / `.queued` / `.running` 用户消息标 failed。
2. 未测试 terminal 状态不会被 disconnect 改写。
3. 未测试 `enqueueOrSend` 在 AI 响应中创建 `.queued` 并同步写入 `pendingMessages` 和 `messages`。
4. 未测试 `enqueueOrSendMessage` 对带附件 Message 的 queued 行为。
5. 未测试 `MessageDeliveryStatus.isTerminal` 枚举完整性。
6. `task.status` 映射内联在 `WebSocketService.parseMessage`，无法直接单测。

### 3. task.status 映射适合抽成纯函数

当前内联位置：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/WebSocketService.swift`

当前映射：

- `queued` → `.queued`
- `running` → `.running`
- `succeeded` → `.delivered`
- `failed` → `.failed`
- `timed_out` → `.timedOut`
- `cancelled` → `.cancelled`
- `lost` → `.lost`
- unknown → `nil`

建议抽到：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Models/Message.swift`

新增：

```swift
extension MessageDeliveryStatus {
    static func fromTaskStatus(_ raw: String) -> MessageDeliveryStatus?
}
```

然后 `WebSocketService` 调用该纯函数。这样不改变语义，但可以直接单测。

## Proposed Changes

### 1. 抽取 task.status 映射纯函数

文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Models/Message.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/WebSocketService.swift`

改动：

1. 在 `MessageDeliveryStatus` 内新增：

```swift
static func fromTaskStatus(_ raw: String) -> MessageDeliveryStatus? {
    switch raw {
    case "queued": return .queued
    case "running": return .running
    case "succeeded": return .delivered
    case "failed": return .failed
    case "timed_out": return .timedOut
    case "cancelled": return .cancelled
    case "lost": return .lost
    default: return nil
    }
}
```

2. 将 `WebSocketService` 的 `task.status` 分支中内联 closure 替换为：

```swift
let newStatus = MessageDeliveryStatus.fromTaskStatus(taskStatus)
```

3. 不改变任何状态转换含义。

### 2. 补充 MessageDeliveryStatus 测试

文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/My PilotTests/MyPilotTests/MessageDeliveryStatusTests.swift`

新增测试：

1. `isTerminal`：
   - terminal：`.delivered`, `.failed`, `.timedOut`, `.cancelled`, `.lost`
   - non-terminal：`.sending`, `.sent`, `.queued`, `.running`
2. `fromTaskStatus`：
   - 覆盖所有已知 raw 值。
   - unknown 返回 nil。

### 3. 补充 WebSocketServiceReliabilityTests

文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/My PilotTests/MyPilotTests/WebSocketServiceReliabilityTests.swift`

新增测试：

1. `disconnectMarksNonTerminalUserMessagesFailed`
   - 构造用户消息：`.sending`, `.queued`, `.running`, `.sent`
   - 构造终态用户消息：`.delivered`, `.failed`, `.timedOut`, `.cancelled`, `.lost`
   - 构造 assistant 消息：`.sending` 或 nil
   - 调用 `disconnect()`。
   - 断言非终态用户消息变 `.failed` 且 `isFailed == true`。
   - 断言终态用户消息保持原状态。
   - 断言 assistant 消息不被改写。

2. `disconnectClearsPendingMessages`
   - 设置 `isProcessing = true`。
   - 调用 `enqueueOrSend("queued")`，确认产生 pending。
   - 调用 `disconnect()`。
   - 断言 `pendingMessages.isEmpty`。
   - 断言原 queued 消息在 `messages` 中变 failed。

3. `enqueueOrSendWhileRespondingQueuesTextMessage`
   - 设置 `isProcessing = true`。
   - 调用 `enqueueOrSend("next")`。
   - 断言 `pendingMessages.count == 1`。
   - 断言 `messages.count == 1`。
   - 断言二者 id 相同，状态为 `.queued`。

4. `enqueueOrSendMessageWhileRespondingQueuesAttachmentMessage`
   - 构造带附件或普通 Message。
   - 设置 `isProcessing = true`。
   - 调用 `enqueueOrSendMessage(msg)`。
   - 断言 pending/messages 同步新增，状态为 `.queued`。

5. `discardConversationStateKeepsPendingCrossConversationMessagesOutOfDrain`
   - 当前 `pendingCrossConversationMessages` 是 private，无法直接构造。
   - 不建议为测试暴露内部字典。
   - 本轮保持已有 `isConversationDiscarded` 测试即可；如果实现中已有公开入口可制造 pending，再补 drain 测试。

### 4. 功能清单更新

文件：

- `/Users/liaoxing/Downloads/未命名文件夹/FEATURE_CHECKLIST.md`

改动：

1. 更新 T2：
   - 问题：`已有 Swift Tests target，消息可靠性与状态映射已补测试，仍需更多端到端回归`
   - 影响：`仍需真实断网/重连端到端回归`
   - 优先级：`P2`
2. 增加修复历史：
   - `v14 | 06-10 | 消息可靠性补测：断线 failed 标记、AI 响应中 queued、MessageDeliveryStatus terminal 与 task.status 映射 | T2`

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

### 3. mypilot-link verify

本轮只改 App 侧 Swift 代码，可不跑 daemon；但按项目规则，如果希望保持主线门禁完整，可跑：

```bash
cd /Users/liaoxing/Downloads/未命名文件夹/mypilot-link
npm run verify
```

预期：通过。

### 4. 人工回归

1. 正常连接时发送消息，确认消息进入发送中/已发送状态。
2. AI 回复中发送下一条，确认进入 queued。
3. 断线后 queued/sending/running 用户消息变 failed。
4. 断线状态下输入栏内容和附件仍保留，不自动发送。
5. 重连后用户可手动重试 failed 消息。

## Assumptions & Decisions

1. 用户已确认本轮优先做消息可靠性完整补测。
2. 允许抽取 `MessageDeliveryStatus.fromTaskStatus` 这类纯函数。
3. 不改变断线发送语义。
4. 不自动补发 `chat.send`。
5. 不修改 Gateway 协议。
6. 不修改服务器素材，不动 `/root/.openclaw/agents/main/SOUL.md`。
7. 不引入新依赖。
8. 不提交 git commit，除非用户明确要求。

## Out of Scope

本轮不做：

1. WebSocketService 大拆。
2. `parseMessage(_:)` 大规模重构。
3. 真实断网 UI 自动化测试。
4. 服务端协议变更。
5. 发布或 npm publish。
6. git commit。
