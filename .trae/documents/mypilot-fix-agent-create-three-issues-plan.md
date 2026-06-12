# 修复 Agent 创建后三个问题

## 问题总结

1. **创建 agent 后不全局生效**：需要重启 App 才能在侧边栏看到新 agent
2. **头像显示错误**：新 agent 未上传图片时，对话框显示 main agent 的头像
3. **对话内容串台**：子 agent 对话框显示 main agent 的对话内容

## 当前状态分析

### 已修复的部分（前一轮对话）
- `WebSocketService.switchAgent(to:)` — conversationId 已改为 `"\(agentId):default"`
- `SidebarView.swift` — 两处 conversationId 已改为 `"\(agentId):default"`
- `AppState.swift` — 删除会话后切换逻辑已改为 `"\(agentId):default"`
- `AgentsManagementView.swift` — onCreated 回调已添加 `ws?.requestAgentsList()` + 自动切换

### 仍需修复的部分

#### 问题 1 & 3：conversationId 硬编码 `"default"`

以下文件仍使用硬编码 `"default"` 作为 conversationId，导致子 agent 加载了 main 的消息文件 `conv-default.json`：

| 文件 | 行号 | 当前代码 | 问题 |
|------|------|---------|------|
| `ChatInputSection.swift` | L22 | `appState.currentConversationId = "default"` | 切换 agent 时 conversationId 不含 agentId 前缀 |
| `ChatInputSection.swift` | L23 | `loadMessagesForConversation("default")` | 加载了 main 的消息 |
| `ChatInputSection.swift` | L25 | `requestHistory(agentId:, conversationId: "default")` | 请求历史用了错误的 conversationId |
| `ChatViewModel.swift` | L67 | `loadMessagesForConversation("default")` | 同上 |
| `ChatViewModel.swift` | L69 | `requestHistory(agentId:, conversationId: "default")` | 同上 |

**修复方案**：将所有 `"default"` 替换为 `"\(agentId):default"` 格式。

#### 问题 2：头像显示错误

`AgentAvatarView` 的默认头像逻辑（L50-58）：
```swift
private var defaultIcon: some View {
    Circle()
        .fill(agent.id == "main" ? AppColors.amber300 : AppColors.lime300)
        .overlay(
            Image(systemName: agent.id == "main" ? "star.fill" : "cpu")
                ...
        )
}
```

这段逻辑本身是正确的——非 main agent 显示 lime300 + cpu 图标。**问题不在 AgentAvatarView**，而在于：

1. 新 agent 创建后，`requestAgentsList()` 刷新了 `ws.agents`，但侧边栏可能还没拿到最新的 agent 列表
2. 对话框头部（`ChatHeaderSection`）可能还在用旧的 agent 数据渲染头像

实际上，如果 `requestAgentsList()` 正确返回了新 agent 且 `ws.agents` 被更新，`AgentAvatarView` 应该能正确显示。头像显示 main 的头像更可能是因为 **conversationId 为 "default" 导致切换到了 main agent 的对话**，从而 `currentAgentId` 仍为 "main"，所以头像显示的是 main 的。

因此，**修复 conversationId 问题（问题 1 & 3）后，问题 2 也会随之解决**。

#### 额外问题：AppState.currentConversationId 初始值

`AppState.swift` L24: `var currentConversationId: String = "default"`

App 启动时，默认 conversationId 是 `"default"`，这意味着 main agent 的默认会话 ID 应该是 `"main:default"`。需要确认 App 启动连接时是否正确设置了初始值。

查看 `ChatView.swift` L110-113：
```swift
wsService.messages = appState.loadMessagesForConversation(appState.currentConversationId)
wsService.connect(to: instance)
wsService.currentConversationId = appState.currentConversationId
wsService.currentAgentId = "main"
```

App 启动时 `appState.currentConversationId` 为 `"default"`，但 `wsService.currentConversationId` 在 `switchAgent(to: "main")` 后会变成 `"main:default"`。这里存在不一致——`AppState` 存的是 `"default"`，而 `WebSocketService` 存的是 `"main:default"`。

**修复方案**：App 启动连接时，将 `appState.currentConversationId` 也设为 `"main:default"`。

#### 额外问题：ensureConversationExists 中的 "default" 判断

`AppState.swift` L170-176：
```swift
if convId != "default", conversations.contains(where: { $0.id == convId }) {
    return convId
}
if convId == "default" {
    if let existing = conversationsForAgent(agentId).first {
        return existing.id
    }
}
```

这里的 `"default"` 判断逻辑需要更新为匹配 `"agentId:default"` 格式，否则新格式 `"coder:default"` 会跳过这个分支直接创建新会话。需要将 `convId == "default"` 改为 `convId.hasSuffix(":default")` 或 `convId == "\(agentId):default"`。

## 修改计划

### 1. ChatInputSection.swift（L19-28）
**文件**：`/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Chat/ChatInputSection.swift`

将 `onSwitchAgent` 回调中的硬编码 `"default"` 改为 `"\(agentId):default"`：

```swift
onSwitchAgent: { agentId in
    appState.saveMessagesForConversation(wsService.messages, convId: wsService.currentConversationId)
    wsService.switchAgent(to: agentId)
    let convId = "\(agentId):default"
    appState.currentConversationId = convId
    wsService.messages = appState.loadMessagesForConversation(convId)
    if wsService.messages.isEmpty {
        wsService.requestHistory(agentId: agentId, conversationId: convId)
    }
    wsService.requestAgentFile(agentId: agentId, name: "SOUL.md")
},
```

### 2. ChatViewModel.swift（L64-72）
**文件**：`/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Chat/ChatViewModel.swift`

将 `switchAgent(to:appState:)` 方法中的硬编码 `"default"` 改为 `"\(agentId):default"`：

```swift
func switchAgent(to agentId: String, appState: AppState) {
    appState.saveMessagesForConversation(wsService.messages, convId: wsService.currentConversationId)
    wsService.switchAgent(to: agentId)
    let convId = "\(agentId):default"
    wsService.messages = appState.loadMessagesForConversation(convId)
    if wsService.messages.isEmpty {
        wsService.requestHistory(agentId: agentId, conversationId: convId)
    }
    wsService.requestAgentFile(agentId: agentId, name: "SOUL.md")
}
```

### 3. AppState.swift — ensureConversationExists
**文件**：`/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/AppState.swift`

更新 `ensureConversationExists` 中的 `"default"` 判断逻辑，使其兼容 `"\(agentId):default"` 格式：

```swift
func ensureConversationExists(convId: String, agentId: String, lastMessage: String) -> String {
    let preview = lastMessage.trimmingCharacters(in: .whitespacesAndNewlines)
    if conversations.contains(where: { $0.id == convId }) {
        return convId
    }
    // 兼容 "agentId:default" 格式的默认会话
    if convId.hasSuffix(":default") || convId == "default" {
        if let existing = conversationsForAgent(agentId).first {
            return existing.id
        }
    }
    let conv = Conversation(agentId: agentId, title: String(preview.prefix(20)), lastMessagePreview: String(preview.prefix(50)))
    conversations.append(conv)
    saveConversations()
    return conv.id
}
```

### 4. AppState.swift — currentConversationId 初始值
**文件**：同上

将 `currentConversationId` 默认值从 `"default"` 改为 `"main:default"`：

```swift
var currentConversationId: String = "main:default"
```

### 5. ChatView.swift — 启动连接时同步初始值
**文件**：`/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Views/ChatView.swift`

确保启动连接时 `appState.currentConversationId` 与 `wsService` 一致：

```swift
// L110-113
wsService.messages = appState.loadMessagesForConversation(appState.currentConversationId)
wsService.connect(to: instance)
wsService.currentConversationId = appState.currentConversationId
wsService.currentAgentId = "main"
// 同步 appState 的初始 conversationId
if appState.currentConversationId == "default" {
    appState.currentConversationId = "main:default"
}
```

## 假设与决策

1. **conversationId 格式统一为 `"\(agentId):default"`**：这是之前对话中已确定的方案，所有 agent 的默认会话都使用此格式
2. **头像问题随 conversationId 修复而解决**：头像显示 main 的根本原因是切换 agent 时 conversationId 错误，导致 `currentAgentId` 仍为 "main"
3. **向后兼容**：旧的 `conv-default.json` 消息文件仍保留在磁盘，但不会被新格式自动加载。如果用户之前有 main agent 的对话，需要迁移
4. **消息文件迁移**：如果存在 `conv-default.json` 但不存在 `conv-main:default.json`，应将前者重命名为后者，以保留 main agent 的历史消息

## 验证步骤

1. `xcodebuild build` 编译通过
2. 功能验证：
   - 创建新 agent → 侧边栏立即显示，无需重启
   - 新 agent 对话框显示正确的默认头像（lime300 + cpu），不是 main 的
   - 新 agent 对话框为空，不显示 main 的对话内容
   - 切换回 main agent → main 的历史消息正常显示
   - App 重启后，所有 agent 的对话内容正确隔离
