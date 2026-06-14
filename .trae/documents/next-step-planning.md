# P3-1: WebSocketService 深度拆分

## Summary

将 WebSocketService.swift（755 行）拆分为职责清晰的多个组件，降低单文件复杂度，同时解决 H2（消息帧竞态条件）问题。

## Current State Analysis

### WebSocketService.swift 当前职责（755 行）
1. **连接生命周期**：connect/disconnect/reconnect（L76-L148）
2. **会话管理**：switchAgent/switchConversation/discardConversation（L161-L251）
3. **Frame 路由**：parseMessage 的 switch 分发（L255-L379）
4. **Frame 处理**：15 个 handle*Frame 方法（L382-L754）
5. **RPC 回调管理**：pendingRpcCallbacks 存取（L299-L319）
6. **UI 状态管理**：isProcessing/isStreaming/streamingContent/messages（L1-L62）
7. **Token 统计**：sessionInputTokens/sessionOutputTokens 等（L34-L41）
8. **搜索设置代理**：6 个 searchSettingsManager 透传方法（L499-L521）

### 已有的拆分
- `ConnectionManager.swift` — WebSocket 连接管理 ✅
- `ChatStreamHandler.swift` — 流式输出解析 ✅
- `AgentRpcClient.swift` — Gateway RPC 调用 ✅
- `WebSocketRpcMethods.swift` — RPC 方法扩展 ✅
- `WebSocketMessageSending.swift` — 消息发送 ✅
- `SearchSettingsManager.swift` — 搜索设置 ✅
- `AttachmentTransport.swift` — 附件处理 ✅

### H2 竞态问题根因
`mainAsync` 闭包调度导致帧处理顺序不确定：多个帧到达后，各自的 `mainAsync` 闭包执行顺序可能与到达顺序不同，导致状态不一致（如 done 在 stream 之前执行）。

## Proposed Changes

### Step 1: 抽取 WebSocketFrameRouter（新文件）

**文件**：`MyPilotApp/MyPilot/MyPilot/Services/WebSocketFrameRouter.swift`

**职责**：解析 JSON frame，按 type 分发到对应 handler

**做法**：
- 定义 `WebSocketFrameRouter` struct
- 将 `parseMessage` 中的 switch 逻辑移入
- 定义 `WebSocketFrameHandling` protocol，WebSocketService 遵循
- Router 持有 weak reference 到 handler

**关键**：Router 在**当前线程**同步调用 handler 方法，不做 mainAsync 调度。所有 mainAsync 统一由 handler 方法内部处理。

```swift
protocol WebSocketFrameHandling: AnyObject {
    func handleHelloFrame(_ json: [String: Any])
    func handleChatHistoryFrame(_ json: [String: Any])
    func handleGatewayRpcFrame(_ json: [String: Any])
    func handleResFrame(_ json: [String: Any])
    func handleAgentModelSetFrame(_ json: [String: Any])
    func handleProcessingFrame(_ json: [String: Any])
    func handleStreamFrame(_ json: [String: Any])
    func handleDoneFrame(_ json: [String: Any])
    func handleFileNewFrame(_ json: [String: Any])
    func handleErrorFrame(_ json: [String: Any])
    func handleGatewayHttpFrame(_ json: [String: Any])
    func handleTaskStatusFrame(_ json: [String: Any])
    func handleTaskNotifyFrame(_ json: [String: Any])
    func handleAgentCreatedFrame(_ json: [String: Any])
    func handleAgentStatusFrame(_ json: [String: Any])
    func handleModelUsageFrame(_ json: [String: Any])
    func handleMessageFrame(_ json: [String: Any])
}

struct WebSocketFrameRouter {
    weak var handler: WebSocketFrameHandling?

    func route(_ text: String) {
        guard let data = text.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return }
        let type = json["type"] as? String ?? ""
        switch type {
        case "heartbeat", "ping", "pong": break
        case "hello": handler?.handleHelloFrame(json)
        case "chat.history": handler?.handleChatHistoryFrame(json)
        // ... 所有 case
        default: print("[WS] ← unhandled frame type: \(type)")
        }
    }
}
```

**WebSocketService 改动**：
- `parseMessage` 改为调用 `frameRouter.route(text)`
- 所有 `handle*Frame` 方法签名改为 public（满足 protocol）
- 删除 `parseMessage` 中的 switch 逻辑

### Step 2: 抽取 ChatFrameHandler（新文件）

**文件**：`MyPilotApp/MyPilot/MyPilot/Services/ChatFrameHandler.swift`

**职责**：管理聊天相关的帧处理和运行时状态

**做法**：
- 将 `handleProcessingFrame`、`handleStreamFrame`、`handleDoneFrame`、`handleErrorFrame`、`handleFileNewFrame` 移入
- 将 `handleMessageFrame`、`handleTaskStatusFrame`、`handleTaskNotifyFrame` 移入
- 将 `conversationStates`、`activeGenerationConversationId`、`discardedConversationIds`、`pendingCrossConversationMessages` 移入
- 将 `processingTimeoutTimer`、`abortRecoveryTimer` 移入
- ChatFrameHandler 通过 delegate/callback 通知 WebSocketService 更新 UI 状态

```swift
@Observable
class ChatFrameHandler: WebSocketFrameHandling {
    weak var service: WebSocketService?

    // 从 WebSocketService 移入的状态
    var conversationStates: [String: (isProcessing: Bool, isStreaming: Bool, streamingContent: String)] = [:]
    var activeGenerationConversationId: String?
    var discardedConversationIds = Set<String>()
    var pendingCrossConversationMessages: [String: [Message]] = [:]
    var processingTimeoutTimer: Timer?
    var abortRecoveryTimer: Timer?

    // ... handle*Frame 实现
}
```

**WebSocketService 改动**：
- 删除上述状态属性，改为 `chatHandler.xxx` 透传
- 删除对应的 handle*Frame 方法
- 保留 `isProcessing`/`isStreaming`/`streamingContent`/`messages` 等 UI 状态（因为 View 直接绑定）

### Step 3: 解决 H2 竞态条件

**做法**：引入帧序列化队列

```swift
// 在 WebSocketService 中
private let frameQueue = DispatchQueue(label: "com.mypilot.frame-processing")

// ConnectionManager.onMessage 回调改为：
connectionManager.onMessage = { [weak self] message in
    let text = ...
    self?.frameQueue.async {
        self?.frameRouter.route(text)
    }
}
```

**关键**：所有帧处理在 `frameQueue` 上串行执行，保证顺序。但 UI 更新仍需 `mainAsync`。

**改进方案**：将帧处理分为两阶段：
1. **解析阶段**（frameQueue 串行）：解析 JSON、提取数据、计算状态变更
2. **应用阶段**（mainAsync）：将计算好的状态变更应用到 @Observable 属性

这样既保证帧处理顺序，又不会阻塞主线程。

### Step 4: 清理搜索设置透传

**做法**：将 6 个 searchSettingsManager 透传方法从 WebSocketService 移到 View 层直接调用 SearchSettingsManager。

**文件**：
- `WebSocketService.swift` — 删除 6 个透传方法和 searchSettingsManager 属性
- `ChatInputSection.swift` 或其他 View — 直接持有 SearchSettingsManager

## 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `Services/WebSocketFrameRouter.swift` | 新增 | Frame 路由 + protocol 定义 |
| `Services/ChatFrameHandler.swift` | 新增 | 聊天帧处理 + 运行时状态 |
| `Services/WebSocketService.swift` | 修改 | 瘦身至 ~300 行，保留连接/会话/UI 状态 |
| `Services/ConnectionManager.swift` | 不变 | — |
| `Services/ChatStreamHandler.swift` | 不变 | — |
| View 层文件 | 小改 | 搜索设置调用路径调整 |

## Assumptions & Decisions

1. **不改变 @Observable 模式**：WebSocketService 仍然是 @Observable，View 直接绑定其属性
2. **ChatFrameHandler 不是 @Observable**：它通过回调通知 WebSocketService 更新 UI 状态
3. **帧序列化用 DispatchQueue**：比 Actor 更简单，与现有 Timer/RunLoop 兼容
4. **Step 1-3 可独立完成**：每步后 xcodebuild 验证，不需要一次全做完
5. **搜索设置透传是低优先级**：Step 4 可选，不影响核心拆分

## Verification

每步完成后：
```bash
cd /Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot
xcodebuild -project MyPilot.xcodeproj -scheme MyPilot -configuration Debug -destination 'platform=macOS' -skipMacroValidation build
```

全部完成后：
```bash
xcodebuild test -project MyPilot.xcodeproj -scheme MyPilot -destination 'platform=macOS' -skipMacroValidation
```

## 执行顺序

1. Step 1: WebSocketFrameRouter（最安全，纯提取）
2. Step 3: 帧序列化队列（解决 H2）
3. Step 2: ChatFrameHandler（最大改动）
4. Step 4: 搜索设置清理（可选）
