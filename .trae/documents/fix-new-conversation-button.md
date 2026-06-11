# 修复侧边栏"新建会话"按钮不可见问题

## 问题分析

### 当前状态
侧边栏的 "+" 新建会话按钮位于 `SidebarView.swift:128` 的条件渲染块内：

```swift
if let ws = appState.currentWebSocket, !ws.agents.isEmpty {
    ForEach(ws.agents) { agent in
        // "+" 按钮在这里面
    }
}
```

**整个 Agent 区域（包括 "+" 按钮）被双重条件守卫：**
1. `appState.currentWebSocket` 必须不为 nil
2. `ws.agents` 必须不为空

### 根本原因

1. **设计缺陷**：新建对话功能完全依赖 agents 列表已加载完成。如果 agents 为空，用户没有任何入口创建新对话。
2. **agents 加载链路脆弱**：`requestAgentsList()` 只在收到 `hello` 消息时调用，RPC 请求无超时机制，失败时无错误日志，agents 永远为空。
3. **时序窗口**：连接建立到 agents 加载完成之间存在时间差，期间 "+" 按钮不可见。
4. **断线重连**：`disconnect()` 会清空 agents，重连后需等待新的 `hello` 才能重新加载。

### 用户实际体验
用户点击实例后，侧边栏只显示实例列表，看不到任何 Agent 分区和 "+" 按钮。即使 WebSocket 已连接，如果 `agents.list` RPC 未成功返回，整个 Agent 区域都不会渲染。

## 修改方案

### 1. SidebarView.swift — 将 "+" 按钮从 agents 条件中解耦

**核心思路**：当 `currentWebSocket` 存在时（即已选中实例并连接），始终显示 Agent 区域。如果 agents 为空，显示加载状态和默认的 "+" 按钮。

修改 `sessionList` 中的条件渲染逻辑：

```swift
// 修改前
if let ws = appState.currentWebSocket, !ws.agents.isEmpty {
    ForEach(ws.agents) { agent in ... }
}

// 修改后
if let ws = appState.currentWebSocket {
    if ws.agents.isEmpty {
        Section {
            HStack {
                Text("加载中...")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Spacer()
                Button(action: {
                    let conv = appState.createConversation(agentId: "main")
                    NotificationCenter.default.post(
                        name: .switchConversation,
                        object: nil,
                        userInfo: ["conversationId": conv.id, "agentId": "main"]
                    )
                    appState.currentConversationId = conv.id
                }) {
                    Image(systemName: "plus.circle")
                        .font(.caption)
                }
                .buttonStyle(.plain)
            }
        } header: {
            Text("默认助手")
        }
    } else {
        ForEach(ws.agents) { agent in
            // 保持原有逻辑不变
        }
    }
}
```

### 2. WebSocketService.swift — 为 requestAgentsList 添加错误日志和重试

在 `requestAgentsList()` 的回调中，当 RPC 失败时打印错误日志，并添加超时重试：

```swift
func requestAgentsList() {
    mainAsync {
        self._sendGatewayRpc(method: "agents.list", params: [:]) { [weak self] response in
            guard let self = self else { return }
            if response["ok"] as? Bool == true,
               let payload = response["payload"] as? [String: Any],
               let rawAgents = payload["agents"] as? [[String: Any]] {
                var parsed: [Agent] = []
                for a in rawAgents {
                    let id = a["id"] as? String ?? ""
                    let workspace = a["workspace"] as? String
                    var model: Agent.AgentModel?
                    if let m = a["model"] as? [String: Any] {
                        model = Agent.AgentModel(primary: m["primary"] as? String)
                    }
                    parsed.append(Agent(id: id, name: id == "main" ? "默认助手" : id, workspace: workspace, model: model))
                }
                self.agents = parsed
            } else {
                print("[WS] agents.list failed: \(response)")
                DispatchQueue.main.asyncAfter(deadline: .now() + 3) { [weak self] in
                    guard let self = self, self.agents.isEmpty, self.isConnected else { return }
                    self.requestAgentsList()
                }
            }
        }
    }
}
```

### 3. WebSocketService.swift — 在 urlSession didOpenWithProtocol 中也触发 requestAgentsList

当前 `hello` 消息是触发 agents 加载的唯一入口。但 `urlSession(_:webSocketTask:didOpenWithProtocol:)` 也会被调用（连接建立时）。添加一个备用触发点：

```swift
func urlSession(_ session: URLSession, webSocketTask: URLSessionWebSocketTask, didOpenWithProtocol protocol: String?) {
    mainAsync {
        self.isConnected = true
        self.requestAgentsList()
    }
}
```

注意：`hello` 处理中已有 `requestAgentsList()`，这里只是作为备用。如果 `hello` 先到达，agents 已加载，重复调用无害。

## 修改文件清单

| 文件 | 修改内容 |
|------|----------|
| `MyPilotApp/MyPilot/MyPilot/Views/SidebarView.swift` | 重构 agents 区域条件渲染，agents 为空时显示加载状态和默认 "+" 按钮 |
| `MyPilotApp/MyPilot/MyPilot/Services/WebSocketService.swift` | `requestAgentsList()` 添加失败日志和重试；`didOpenWithProtocol` 添加备用触发 |

## 验证步骤

1. 启动 App，添加实例并连接
2. 确认侧边栏在 agents 加载前显示"加载中..."和 "+" 按钮
3. 确认 agents 加载后正常显示 Agent 列表和每个 Agent 旁的 "+" 按钮
4. 点击 "+" 按钮能成功创建新对话并切换
5. 模拟 agents.list 失败场景（如断开 daemon），确认 3 秒后自动重试
6. 断线重连后确认 agents 能重新加载
