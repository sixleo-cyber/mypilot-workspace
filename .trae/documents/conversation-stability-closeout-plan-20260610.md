# 会话持久化与跨会话消息稳定闭环计划

## Summary

附件协议已经收口后，下一阶段聚焦“会话持久化与跨会话消息稳定”。目标是解决当前最容易造成用户感知不可靠的边界：AI 在非当前会话完成时只进入内存 pending、删除会话后 runtime state 未清理、搜索跳转缺少回归保护。

本轮范围已确认：

1. 跨会话 AI 完成消息立即落盘，而不是只等待页面切换/退出时补救。
2. 删除会话时清理 `WebSocketService` 的 pending/runtime state，避免幽灵写入。
3. 搜索跳转与 `highlightedMessageId` 做回归确认和必要小修。
4. 补 Swift 会话稳定测试。
5. 执行完整门禁：Node verify、Swift build、Swift tests。

本轮不做 WebSocketService 大拆，不改 Gateway 协议，不引入新依赖。

## Current State Analysis

### 1. 跨会话消息现状

关键文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/WebSocketService.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Views/ChatView.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/AppState.swift`

当前实现：

1. `WebSocketService` 有 `pendingCrossConversationMessages: [String: [Message]]`。
2. `done` 帧到达时：
   - 如果 `effectiveConvId == currentConversationId`，直接 append 到 `messages` 并触发 `onMessagePersist`。
   - 如果是非当前会话，则只 append 到 `pendingCrossConversationMessages[effectiveConvId]`。
3. `ChatView.onDisappear` 会调用 `getPendingMessages()`，把 pending 跨会话消息落盘。
4. `switchConversation` 时，如果目标会话有 pending，会 append 到当前 `messages`。

风险：

- 非当前会话的 AI 回复在收到 `done` 时没有立即持久化。
- 如果 App 生命周期、异常断开、删除会话、切换会话交错，pending 内存消息可能丢失或写回已删除会话。
- 会话预览不会在跨会话 done 到达时立即更新。

### 2. 删除会话现状

关键文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/AppState.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/WebSocketService.swift`

当前实现：

1. `AppState.deleteConversation(_:)` 会：
   - 从 `conversations` 删除该会话。
   - 如果删除当前会话，切换到 `default`。
   - 删除本地 `conv-{id}.json` 文件。
2. 但它没有通知 `WebSocketService` 清理：
   - `pendingCrossConversationMessages[deletedId]`
   - `conversationStates[deletedId]`
   - `activeGenerationConversationId == deletedId`
3. 如果删除后迟到的 done/error 再到达，仍可能写入 pending 或更新 runtime state。

### 3. 搜索跳转现状

关键文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/AppState.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Views/SidebarView.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Chat/ChatMessageSection.swift`

当前实现：

1. `AppState.searchMessages(query:)` 从 `Messages/conv-*.json` 搜索本地消息，返回 `SearchResult`，包含 `conversationId`、`agentId`、`messageId`。
2. `SidebarView` 搜索结果点击后会 post `.switchConversation`，并设置 `appState.highlightedMessageId`。
3. `ChatMessageSection` 根据 `highlightedMessageId` 滚动并高亮。

风险：

- 删除会话后旧文件如果残留或搜索结果缓存未刷新，可能跳转不存在会话。
- `highlightedMessageId` 没有专项测试覆盖。
- 跨会话立即落盘后，搜索应能立刻搜到新的 AI 回复。

### 4. 现有测试状态

关键文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/My PilotTests/MyPilotTests/WebSocketServiceReliabilityTests.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/My PilotTests/MyPilotTests/*.swift`

当前测试已有：

1. 断线时 `sendMessage` 不 append。
2. 断线时 `send(text:)` 不 append。
3. 空闲时 `enqueueOrSend` 不创建 failed 消息。
4. 附件、诊断、定时任务、流式处理等测试。

缺口：

- 没有会话 runtime state 清理测试。
- 没有跨会话 done/pending 持久化测试。
- 没有搜索结果与会话删除/消息落盘的回归测试。

## Proposed Changes

### 1. 增加跨会话即时持久化回调

文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/WebSocketService.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Views/ChatView.swift`

改动：

1. 在 `WebSocketService` 新增回调：
   - `var onCrossConversationMessagesPersist: ((String, [Message]) -> Void)?`
2. 在 `done` 分支中，当 `effectiveConvId != currentConversationId` 时：
   - 继续清理 `conversationStates[effectiveConvId]`。
   - 如果该会话未被标记删除，则调用 `onCrossConversationMessagesPersist?(effectiveConvId, [msg])`。
   - 同时可以继续保留 `pendingCrossConversationMessages` 作为 UI 切换时补充，但持久化不再依赖它。
3. `error` 分支对非当前会话也使用同样回调，确保错误消息也可落盘。
4. `ChatView.connectWebSocket()` 中设置该回调：
   - 读取 `appState.loadMessagesForConversation(convId)`。
   - append 新消息。
   - `appState.saveMessagesForConversation(existing, convId: convId)`。
   - 用最后一条非空内容更新 `appState.updateConversation(convId, lastMessage: preview)`。
5. 如果 `convId` 不在 `appState.conversations` 中，不自动创建已删除会话；直接忽略或仅保留 pending。推荐：忽略并清理 pending，避免删除后复活。

成功标准：

- 非当前会话收到 done 后立即写入 `conv-{id}.json`。
- 侧边栏会话预览立即更新。
- App 退出前也不会丢跨会话回复。

### 2. 删除会话时清理 runtime state

文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/AppState.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/WebSocketService.swift`

改动：

1. 在 `WebSocketService` 新增方法：
   - `func discardConversationState(_ conversationId: String)`
2. 方法行为：
   - 删除 `pendingCrossConversationMessages[conversationId]`。
   - 删除 `conversationStates[conversationId]`。
   - 如果 `activeGenerationConversationId == conversationId`，置 nil。
   - 可维护 `discardedConversationIds: Set<String>`，用于忽略删除后迟到的 done/error。
3. 在 `done` / `error` 分支开头，如果 `effectiveConvId` 属于 `discardedConversationIds`，直接清理当前处理状态并 return，不写 pending、不持久化。
4. `AppState.deleteConversation(_:)` 中调用 `currentWebSocket?.discardConversationState(conv.id)`。
5. 删除的是当前会话时，保留当前切换到 default 的行为。

成功标准：

- 删除会话后，迟到 done/error 不会重建消息文件。
- pending/runtime state 中不再保留 deletedId。

### 3. 搜索跳转回归与必要小修

文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/AppState.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Views/SidebarView.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Chat/ChatMessageSection.swift`

改动策略：

1. 优先测试现有行为，不大改 UI。
2. `AppState.searchMessages(query:)` 当前只搜索文件，不校验 `conversationId` 是否仍存在于 `conversations`。本轮建议过滤不存在的会话，避免旧文件残留导致跳转幽灵会话。
3. 如果搜索结果点击时会话已不存在，`SidebarView` 应忽略或刷新搜索结果。本轮可通过搜索源过滤解决。
4. 保持 `highlightedMessageId` 现有逻辑。

成功标准：

- 删除会话后搜索不到该会话消息。
- 跨会话落盘消息可被搜索。
- 点击搜索结果仍能切换并高亮目标消息。

### 4. 补 Swift 测试

候选文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/My PilotTests/MyPilotTests/ConversationPersistenceTests.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/My PilotTests/MyPilotTests/WebSocketServiceReliabilityTests.swift`

测试建议：

1. `AppState.searchMessages`：
   - 创建两个会话和本地消息文件。
   - 搜索能找到目标消息并返回 `messageId`。
   - 删除会话后搜索结果不包含 deletedId。
2. `WebSocketService.discardConversationState`：
   - 构造 pending 跨会话消息。
   - 调用 discard 后 `getPendingMessages()` 不包含该会话。
3. `WebSocketService` 非当前会话 done：
   - 如 parseMessage 可直接调用，则模拟 done 帧并验证回调收到 convId 和消息。
   - 如果 parseMessage 为 private 且不宜暴露，不强行扩大 API；优先测试公开的 state 清理和 AppState 搜索/删除逻辑。
4. 删除会话不复活：
   - 删除会话后保存消息不会被搜索到。

### 5. 功能清单校准

文件：

- `/Users/liaoxing/Downloads/未命名文件夹/FEATURE_CHECKLIST.md`

改动：

1. 如本轮完成，补一条修复历史：
   - `v11 | 06-10 | 会话稳定闭环：跨会话即时落盘、删除会话清 runtime state、搜索过滤已删除会话 | #8-13`
2. 技术债可保持 T1/T2 继续存在，不必强行关闭。
3. 如发现会话相关条目备注可更准确，可更新 #8-13 的备注为“已覆盖跨会话落盘/删除清理回归”。

### 6. 验证步骤

#### 6.1 Node 验证

```bash
cd /Users/liaoxing/Downloads/未命名文件夹/mypilot-link
npm run verify
```

预期：

- check 通过。
- node:test 通过。
- pack dry-run 通过。

#### 6.2 Swift 构建

```bash
cd /Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot
xcodebuild -project MyPilot.xcodeproj -scheme MyPilot -configuration Debug -destination 'platform=macOS' -skipMacroValidation build
```

预期：

- `BUILD SUCCEEDED`。

#### 6.3 Swift 测试

```bash
cd /Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot
xcodebuild test -project MyPilot.xcodeproj -scheme MyPilot -destination 'platform=macOS' -skipMacroValidation
```

预期：

- `TEST SUCCEEDED`。

#### 6.4 人工回归

1. A 会话发送消息，回复未完成时切到 B。
2. A 的 done 到达后，A 会话文件立即更新，侧边栏预览更新。
3. App 退出重启后，A 会话回复仍存在。
4. 删除 A 会话后，迟到 done/error 不会重建 A 文件。
5. 搜索 deleted 会话里的文本不会出现。
6. 搜索现存会话文本能跳转并高亮目标消息。

## Assumptions & Decisions

1. 用户已确认下一阶段优先做会话稳定。
2. 用户已确认本轮做完整闭环：跨会话落盘、删除清理、搜索回归、测试、完整门禁。
3. 不自动补发 AI 请求。
4. 不修改 Gateway 协议。
5. 不大拆 `WebSocketService`。
6. 不引入新依赖。
7. 不修改服务器素材、不修改 `SOUL.md`。
8. 不提交 git commit，除非用户明确要求。

## Out of Scope

本轮不做：

1. WebSocketService 大规模重构。
2. 部署边界治理。
3. 占位页收敛。
4. 文件浏览器增强。
5. 订阅/支付能力。
6. 语音通话能力。
