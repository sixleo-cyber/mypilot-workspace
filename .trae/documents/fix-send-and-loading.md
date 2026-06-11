# 修复：发消息无响应 + 新建会话一直"加载中"

## 问题分析

### 问题一：发消息无响应

**根因：`send(text:)` 和 `sendMessage(_:)` 在非主线程读取 `currentAgentId` / `currentConversationId`**

在 [WebSocketService.swift:196-216](file:///Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/WebSocketService.swift#L196-L216) 中：

```swift
func send(text: String) {
    guard let task = webSocketTask else { return }
    mainAsync {
        self.abortedGeneration = false
        self.messages.append(Message(content: text, isFromUser: true))
    }
    // ⚠️ 以下代码在调用线程执行（可能是主线程也可能不是）
    // currentAgentId 和 currentConversationId 的读取不在 mainAsync 保护内
    let frame: [String: Any] = [
        "type": "chat.send",
        "content": text,
        "agentId": currentAgentId,           // ← 竞态读取
        "conversationId": currentConversationId, // ← 竞态读取
        ...
    ]
    task.send(.string(jsonString)) { ... }
}
```

`@Observable` 的属性在非主线程读取时不会崩溃，但可能读到过期值。更关键的是：**如果 `send` 被从后台线程调用，`currentAgentId` 可能是旧值**，导致消息发到了错误的 sessionKey，Gateway 找不到对应的 session，自然没有响应。

**另一个问题：`didOpenWithProtocol` 和 `hello` 双重触发 `requestAgentsList()`**

- `didOpenWithProtocol`（L527-531）设置 `isConnected = true` 并调用 `requestAgentsList()`
- `hello` 消息（L371-377）也设置 `isConnected = true` 并调用 `requestAgentsList()`

这导致 `agents.list` RPC 被发送两次。第一次的回调 ID 存入 `pendingRpcCallbacks`，但 Gateway 只回复一次（第二次请求的 ID），第一次的回调永远不会被调用，造成内存泄漏。更严重的是，如果第一次请求的响应先到达，回调被消费，第二次请求的响应到达时找不到回调，`agents` 可能被设为空。

### 问题二：新建会话一直"加载中"

**根因：`@Observable` 观察链断裂**

`AppState` 是 `@Observable`，`WebSocketService` 也是 `@Observable`。理论上 `appState.currentWebSocket?.agents` 的变化应该被 SwiftUI 追踪。但实际存在以下问题：

1. **`ChatView` 中 `@State private var wsService = WebSocketService()`** — 这创建了一个独立的 `@Observable` 实例。SwiftUI 的 `@State` 对 `@Observable` 引用类型只追踪引用本身是否变化（是否指向新对象），**不追踪对象内部属性的变化**。

2. **SidebarView 通过 `appState.currentWebSocket?.agents` 访问** — 当 `ws.agents` 从空变为有数据时，`appState.currentWebSocket` 这个引用没变（还是指向同一个 `wsService`），所以 `AppState` 不会触发 `@Observable` 的变更通知，SidebarView 不会重新渲染。

3. **双重 `requestAgentsList()` 导致竞态** — 如果第一次请求失败（因为 `isConnected` 还没设为 `true`，`_sendGatewayRpc` 直接返回 `NOT_CONNECTED`），3 秒后重试。但如果第二次请求成功，`agents` 被设为有数据，但 SidebarView 可能已经因为观察链断裂而不再监听这个变化。

## 修改方案

### 1. WebSocketService.swift — 修复 `send`/`sendMessage` 的线程安全

将帧构建和发送也放入 `mainAsync`，确保 `currentAgentId` 和 `currentConversationId` 的读取在主线程：

```swift
func send(text: String) {
    mainAsync {
        guard let task = self.webSocketTask else { return }
        self.abortedGeneration = false
        self.messages.append(Message(content: text, isFromUser: true))

        let frame: [String: Any] = [
            "type": "chat.send",
            "content": text,
            "agentId": self.currentAgentId,
            "conversationId": self.currentConversationId,
            "id": UUID().uuidString,
            "timestamp": Int(Date().timeIntervalSince1970)
        ]
        guard let jsonData = try? JSONSerialization.data(withJSONObject: frame),
              let jsonString = String(data: jsonData, encoding: .utf8) else { return }
        task.send(.string(jsonString)) { error in
            if let error = error { print("[WS] Send error: \(error.localizedDescription)") }
        }
    }
}
```

`sendMessage` 同理。

### 2. WebSocketService.swift — 移除 `didOpenWithProtocol` 中的 `requestAgentsList()`

只保留 `hello` 消息中的调用，避免双重触发：

```swift
func urlSession(_ session: URLSession, webSocketTask: URLSessionWebSocketTask, didOpenWithProtocol protocol: String?) {
    mainAsync {
        self.isConnected = true
    }
}
```

### 3. ChatView.swift — 消除 `@State` 持有 `wsService` 的观察断裂

将 `wsService` 改为由 `AppState` 统一管理，ChatView 直接使用 `appState.currentWebSocket`：

```swift
struct ChatView: View {
    @Environment(AppState.self) var appState
    let instance: Instance
    @State private var showModelPicker = false

    var body: some View {
        VStack(spacing: 0) {
            if let wsService = appState.currentWebSocket {
                ChatHeaderSection(wsService: wsService, showModelPicker: $showModelPicker)
                Divider()
                ChatMessageSection(wsService: wsService, serverURL: instance.serverURL)
                Divider()
                ChatInputSection(wsService: wsService, instance: instance, appState: appState, showModelPicker: $showModelPicker)
            }
        }
        .onAppear {
            if appState.currentWebSocket == nil {
                let wsService = WebSocketService()
                wsService.messages = appState.loadMessagesForConversation(appState.currentConversationId)
                wsService.connect(to: instance)
                wsService.currentConversationId = appState.currentConversationId
                wsService.currentAgentId = "main"
                wsService.onMessagePersist = { [weak wsService] in
                    guard let ws = wsService else { return }
                    appState.saveMessagesForConversation(ws.messages, convId: ws.currentConversationId)
                }
                appState.currentWebSocket = wsService
            }
        }
        .onDisappear {
            // 保存逻辑保持不变
        }
        .onReceive(NotificationCenter.default.publisher(for: .switchConversation)) { ... }
    }
}
```

**关键变化**：`wsService` 不再是 `@State`，而是通过 `appState.currentWebSocket` 访问。这样 SidebarView 和 ChatView 共享同一个 `@Observable` 对象引用，SwiftUI 能正确追踪 `agents` 等属性的变化。

### 4. WebSocketService.swift — 为 `requestAgentsList` 添加最大重试次数

防止无限重试：

```swift
func requestAgentsList(retryCount: Int = 0) {
    mainAsync {
        self._sendGatewayRpc(method: "agents.list", params: [:]) { [weak self] response in
            guard let self = self else { return }
            if response["ok"] as? Bool == true,
               let payload = response["payload"] as? [String: Any],
               let rawAgents = payload["agents"] as? [[String: Any]] {
                // ... 解析逻辑不变
                self.agents = parsed
            } else {
                print("[WS] agents.list failed (retry \(retryCount)): \(response)")
                if retryCount < 5 {
                    DispatchQueue.main.asyncAfter(deadline: .now() + 3) { [weak self] in
                        guard let self = self, self.agents.isEmpty, self.isConnected else { return }
                        self.requestAgentsList(retryCount: retryCount + 1)
                    }
                }
            }
        }
    }
}
```

## 修改文件清单

| 文件 | 修改内容 |
|------|----------|
| `MyPilotApp/MyPilot/MyPilot/Services/WebSocketService.swift` | 1. `send(text:)` 和 `sendMessage(_:)` 帧构建移入 `mainAsync`；2. `didOpenWithProtocol` 移除 `requestAgentsList()`；3. `requestAgentsList` 添加 `retryCount` 参数限制最大重试 5 次 |
| `MyPilotApp/MyPilot/MyPilot/Views/ChatView.swift` | 移除 `@State private var wsService`，改为通过 `appState.currentWebSocket` 访问，`onAppear` 中创建并赋值给 `appState` |

## 验证步骤

1. 启动 App，连接实例
2. 发送文字消息，确认 AI 正常回复
3. 确认侧边栏 agents 列表正常显示（不再一直"加载中"）
4. 点击 "+" 按钮创建新对话，确认能正常切换和发送消息
5. 断开网络后重连，确认 agents 列表能自动恢复
6. 检查 Xcode 控制台无 `[WS] agents.list failed` 重复日志
