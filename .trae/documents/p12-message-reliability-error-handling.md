# P12: 消息可靠性 + 错误处理增强

## 概要

增强 MyPilot 的消息可靠性和错误处理，解决当前存在的发送无确认、消息可能重复、错误提示不完善等问题。

## 当前状态分析

### 已有机制
- **ConnectionManager**: 指数退避重连（1s→30s）、ping 心跳（25s）、发送队列（断线缓存非 chat.send 帧）
- **DisconnectedBanner**: 断开时显示提示 + 手动重连按钮
- **markNonTerminalUserMessagesFailed()**: 标记未完成用户消息为失败
- **handleErrorFrame**: 服务端错误显示为用户消息

### 缺失项
1. **无发送确认** — 用户发消息后不知道是否送达
2. **无消息去重** — 可能收到重复消息
3. **发送失败无重试** — 用户消息发送失败后只能重新输入
4. **错误提示不统一** — 有些错误静默吞掉，有些只打 log
5. **RPC 超时无提示** — 如 agents.list 超时用户无感知

## 改动清单

### 1. WebSocketService — 消息发送确认

在 `sendMessage` 后追踪消息状态，daemon 回复 `chat.req` 确认帧时标记为已送达。

**文件**: `WebSocketService.swift`

- 添加 `pendingMessageIds: Set<String>` 追踪已发送但未确认的消息 ID
- `sendMessage()` 时将 messageId 加入 pendingMessageIds
- 收到 daemon 的 `chat.req` 确认帧时移除
- 超时 10s 未确认的消息标记为发送失败，UI 显示重发按钮

### 2. WebSocketService — 消息去重

**文件**: `WebSocketService.swift`

- 添加 `processedFrameIds: Set<String>` 缓存最近处理的帧 ID
- `parseMessage()` 中检查 frame id 是否已处理
- 缓存大小限制 100 条，LRU 淘汰

### 3. Message — 发送状态枚举

**文件**: `Message.swift`

- 添加 `enum SendStatus { case sending, sent, failed }` 枚举
- Message 添加 `var sendStatus: SendStatus` 属性（默认 `.sent`）
- 发送中的消息显示 loading 指示器
- 发送失败的消息显示红色 + 重发按钮

### 4. ChatMessageSection — 发送状态 UI

**文件**: `ChatMessageSection.swift`

- `sending` 状态：消息气泡右侧显示小型 ProgressView
- `failed` 状态：消息气泡右侧显示红色感叹号，点击重发

### 5. WebSocketService — 统一错误处理

**文件**: `WebSocketService.swift`

- 添加 `var lastError: String?` 属性
- 所有 RPC 调用失败时更新 lastError
- 添加 `var showError: Bool` 控制错误 toast 显示
- 网络错误、RPC 超时、Gateway 断开统一走此通道

### 6. ChatView — 错误 Toast

**文件**: `ChatView.swift`

- 在聊天区域顶部添加错误 toast（3s 自动消失）
- 显示 lastError 内容
- 使用 `.onChange(of: wsService.lastError)` 触发

### 7. ConnectionManager — 重连后自动恢复

**文件**: `ConnectionManager.swift`

- 重连成功后自动调用 `requestHistory()` 补齐断线期间的消息
- 重连成功后自动调用 `requestAgentsList()` 刷新 agent 列表

## 不做的事

- **发送队列持久化** — 过度工程，App 重启后重新输入即可
- **端到端加密** — 不在当前范围
- **离线模式** — 后续版本考虑

## 验证步骤

1. `cd /Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot && xcodebuild -project MyPilot.xcodeproj -scheme MyPilot -configuration Debug -destination 'platform=macOS' -skipMacroValidation build`
2. 手动测试：断开网络 → 发消息 → 观察失败状态 → 恢复网络 → 观察重连 + 消息补齐
3. 手动测试：发送消息 → 观察 sending → sent 状态变化
