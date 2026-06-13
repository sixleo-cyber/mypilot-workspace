# 项目代码审查：技术 Bug 与优化建议

## 审查范围
- Swift 服务层：WebSocketService、ChatStreamHandler、ConnectionManager、AgentRpcClient、AttachmentTransport、WebSocketMessageSending、WebSocketRpcMethods
- Swift 视图层：ChatViewModel、AppState
- Node.js daemon：daemon.js（~900 行）

## 发现的问题

### 🔴 高严重度（可能导致崩溃或数据错误）

#### H1: WebSocketService — pendingRpcCallbacks 内存泄漏
**文件**: `WebSocketService.swift` L154, L174
**问题**: `setAgentModel` 和 `_sendGatewayRpc` 在 `pendingRpcCallbacks` 中注册回调后，用 `asyncAfter` 设置超时清理。但如果正常响应先到达并移除了回调，`asyncAfter` 仍会触发，此时 `removeValue` 返回 nil 所以不会误调 completion，但 **如果响应从未到达（如网络断开），回调会永远留在字典中**，因为 `asyncAfter` 的超时只在连接正常时才触发。
**影响**: 长时间运行后 `pendingRpcCallbacks` 可能积累大量未清理的闭包，闭包捕获了 `self` 和外部 `completion`，导致内存泄漏。
**修复**: 在 `disconnect()` 时清空 `pendingRpcCallbacks`，对所有 pending 回调调用超时处理。

#### H2: WebSocketService — 竞态条件：消息数组在多回调中修改
**文件**: `WebSocketService.swift`
**问题**: `handleStreamFrame`、`handleDoneFrame`、`handleErrorFrame` 等方法都修改 `messages` 数组。虽然标记了 `@MainActor`，但 `mainAsync` 闭包的调度可能导致同一帧的处理顺序与到达顺序不一致（例如 done 帧在最后一个 delta 帧之前被处理）。
**影响**: 消息内容不完整或重复。
**修复**: 确保帧按序处理，或使用串行队列。

#### H3: daemon.js — pendingRequests 无上限增长
**文件**: `daemon.js` L50
**问题**: `pendingRequests` Map 没有大小限制。如果 Gateway 响应慢或丢失，pending 条目会持续积累。虽然有超时机制（`gateway-rpc` 有 15s 超时），但 `chat` 类型的 pending 没有超时——如果 chat 永远不返回 final，pending 会永远存在。
**影响**: 内存泄漏，长期运行后可能 OOM。
**修复**: 为 chat 类型 pending 添加超时（如 10 分钟），定期清理过期 pending。

#### H4: daemon.js — verifyDevice 每次调用都写磁盘
**文件**: `daemon.js` L145-151
**问题**: `verifyDevice()` 在每次 WebSocket 消息验证时被调用，每次都执行 `saveDevices()`（写 JSON 文件）。高频消息场景下会导致大量磁盘 I/O。
**影响**: 性能问题，SSD 磨损。
**修复**: 使用防抖（debounce），只在设备信息实际变更时保存，或设置最小保存间隔（如 60s）。

### 🟡 中严重度（功能异常或体验问题）

#### M1: ChatViewModel.stopGeneration — 硬编码中文消息
**文件**: `ChatViewModel.swift` L86
**问题**: `stopGeneration()` 和 `resetChat()` 直接 append 硬编码中文消息到 messages，没有经过 `sanitizeContent`，也没有设置 `deliveryStatus`。
**影响**: 这些消息会显示在聊天记录中且被持久化，重启后仍然存在。用户可能不希望"已停止生成"被永久保存。
**修复**: 使用 `isSystem: true` 标记或 transient 标记，不持久化这类状态消息。

#### M2: ChatStreamHandler — flushTimer 竞态
**文件**: `ChatStreamHandler.swift`
**问题**: `flushTimer` 在 `reset()` 中被置 nil，但 `flushBuffer()` 可能正在另一个 `mainAsync` 闭包中执行。如果 reset 和 flush 同时调度到主队列，可能导致 flush 在 reset 之后执行，向已重置的 buffer 写入数据。
**影响**: 偶发的流式内容残留。
**修复**: 在 flushBuffer 中检查是否已被 reset。

#### M3: daemon.js — sessionTokenUsage 无清理机制
**文件**: `daemon.js` L56
**问题**: `sessionTokenUsage` Map 只在 compact 命令时重置单个 session，但从不删除整个条目。长时间运行后，已结束的 session 条目会永远占用内存。
**影响**: 缓慢的内存泄漏。
**修复**: 在 chat final 后设置一个定时器（如 1 小时后清理），或限制 Map 大小。

#### M4: WebSocketService — conversationStates 无清理
**文件**: `WebSocketService.swift`
**问题**: `conversationStates` 字典存储每个会话的状态，但从不清理旧条目。频繁切换 agent 后会积累大量无用状态。
**影响**: 内存缓慢增长。
**修复**: 限制 conversationStates 大小，或在 disconnect 时清理。

#### M5: daemon.js — workspace 文件扫描使用同步 I/O
**文件**: `daemon.js` L516, L540
**问题**: `snapshotWorkspace()` 和 `diffWorkspace()` 使用 `fs.readdirSync` 和 `fs.statSync`。在 delta 帧处理中每 2 秒调用一次，如果 workspace 文件很多，会阻塞事件循环。
**影响**: 高频聊天时可能导致消息延迟。
**修复**: 改用异步 `fs.promises.readdir` 和 `fs.promises.stat`。

#### M6: AgentRpcClient — requestAgentsList 重试逻辑缺陷
**文件**: `AgentRpcClient.swift` L45-47
**问题**: 重试条件是 `retryCount < 5 && currentAgents.isEmpty && isConnected`。如果第一次请求返回了部分 agents（ok=false 但 agents 非空），则不会重试。但如果 agents 列表为空是因为 Gateway 还没初始化完成，应该重试。
**影响**: 偶发的 agents 列表为空。
**修复**: 改为：如果 ok=false 且 retryCount < 5，始终重试。

### 🟢 低严重度（代码质量/可维护性）

#### L1: WebSocketRpcMethods — setAgentModel 超时硬编码 30s
**文件**: `WebSocketRpcMethods.swift` L157
**问题**: `setAgentModel` 的超时是硬编码的 30 秒，而 `_sendGatewayRpc` 默认 15 秒。不一致。
**修复**: 统一使用 `_sendGatewayRpc`，或提取超时常量。

#### L2: daemon.js — extractThinking 正则效率
**文件**: `daemon.js` L557
**问题**: `extractThinking` 使用 `[\s\S]*?` 懒惰匹配，对长文本效率较低。每次 delta 帧都调用。
**修复**: 缓存上次匹配位置，或使用更高效的模式。

#### L3: ChatViewModel — sanitizedMessages 每次调用都重新计算
**文件**: `ChatViewModel.swift` L116-122
**问题**: `sanitizedMessages()` 是计算属性，每次访问都遍历所有消息做正则替换。在列表滚动时会被频繁调用。
**修复**: 缓存结果，在 messages 变更时才重新计算。

#### L4: daemon.js — scp 命令使用 StrictHostKeyChecking=no
**文件**: `daemon.js` L489
**问题**: `scp -o StrictHostKeyChecking=no` 禁用了主机密钥验证，存在 MITM 风险。
**修复**: 首次连接后缓存 known_hosts，后续使用默认验证。

#### L5: WebSocketService — mainAsync 辅助函数
**问题**: 大量使用 `mainAsync { ... }` 包装，但有些方法本身已经在主线程上（如 `@MainActor` 方法内部），导致不必要的 dispatch。
**修复**: 检查是否已在主线程，如果是则直接执行。

## 优先修复建议

| 优先级 | 编号 | 修复难度 | 建议 |
|--------|------|----------|------|
| P0 | H1 | 低 | disconnect 时清空 pendingRpcCallbacks |
| P0 | H3 | 中 | 为 chat pending 添加超时 |
| P0 | H4 | 低 | verifyDevice 防抖 |
| P1 | M1 | 低 | 系统消息不持久化 |
| P1 | M3 | 低 | sessionTokenUsage 定期清理 |
| P1 | M5 | 中 | workspace 扫描改异步 |
| P2 | H2 | 高 | 需要架构调整，暂缓 |
| P2 | M2 | 低 | flushBuffer 加 guard |
| P2 | M4 | 低 | conversationStates 限制大小 |
| P3 | L1-L5 | 低 | 代码质量优化 |

## 验证步骤
1. 修复后运行 `xcodebuild` 编译验证
2. 运行 `npm run verify` 验证 daemon
3. 启动 App 测试基本功能：连接、发送消息、切换 Agent、停止生成
