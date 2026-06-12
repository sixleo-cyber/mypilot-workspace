# 修复 Agent 删除三个问题

## 问题总结

1. **删除确认弹窗不弹出**：在 AgentDetailView 点击"删除 Agent"后，需要返回上一级页面才弹出确认弹窗
2. **删除后不即时全局生效**：侧边栏等视图没有立即刷新
3. **重启后 agent 未被删除**：删除操作没有真正在 Gateway 端执行

## 当前状态分析

### 问题 1：alert 弹窗时机

当前代码（[AgentsManagementView.swift](file:///Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Settings/AgentsManagementView.swift#L133-L143)）：

```swift
.alert("确认删除", isPresented: .constant(showDeleteConfirm != nil)) { ... }
```

**问题**：`.alert` 修饰符挂在 `AgentsManagementView` 的 `Form` 上，但 `showDeleteConfirm` 是在 `AgentDetailView`（NavigationLink 目标页面）中通过 `onDelete` 回调设置的。当用户在 AgentDetailView 点击"删除 Agent"时：
1. `onDelete()` 被调用 → `showDeleteConfirm = agent`
2. 但此时用户仍在 AgentDetailView 页面（NavigationLink 的子页面）
3. alert 挂在父页面的 Form 上，子页面覆盖了父页面，所以 alert 无法显示
4. 用户返回上一级后，子页面消失，父页面的 alert 才能显示

**修复方案**：将 alert 移到 AgentDetailView 内部，让确认弹窗在当前页面弹出。

### 问题 2 & 3：删除逻辑错误

当前 `deleteAgent()` 方法（L157-165）：

```swift
private func deleteAgent(_ agent: Agent) {
    guard agent.id != "main" else {
        errorMessage = "无法删除默认 Agent"
        return
    }
    ws?.setConfig(key: "agents.entries.\(agent.id)", value: NSNull()) { _ in
        DispatchQueue.main.async { agents.removeAll { $0.id == agent.id } }
    }
}
```

**问题**：
- 使用 `setConfig` 设置 `agents.entries.{id}` 为 `NSNull()`，这不是 Gateway 的标准删除方式
- Gateway 有专门的 `agents.delete` RPC（daemon.js L1626-1627 已支持转发）
- App 端已有 `ws?.deleteAgent(id:callback:)` 方法（WebSocketRpcMethods.swift L76-80）
- 但 `deleteAgent()` 函数没有调用它，而是用了 `setConfig` 这种非标准方式
- `setConfig` 只是修改了配置项，不会触发 Gateway 真正删除 agent

**修复方案**：改用 `ws?.deleteAgent(id:callback:)` 调用 Gateway 的 `agents.delete` RPC，并在删除成功后刷新全局 agents 列表。

## 修改计划

### 1. AgentDetailView — 内置删除确认弹窗

**文件**：`/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Settings/AgentsManagementView.swift`

将删除确认弹窗从 AgentsManagementView 移到 AgentDetailView 内部：

**AgentDetailView 改动**：
- 添加 `@State private var showDeleteConfirm = false`
- "删除 Agent" 按钮改为设置 `showDeleteConfirm = true`
- 添加 `.alert` 修饰符在 AgentDetailView 的 Form 上
- alert 确认后调用 `onDelete()` 回调

**AgentsManagementView 改动**：
- 删除 `@State private var showDeleteConfirm: Agent?`
- 删除 `.alert("确认删除", ...)` 修饰符
- `onDelete` 回调改为直接调用 `deleteAgent(agent)`

### 2. deleteAgent() — 改用 agents.delete RPC

**文件**：同上

将 `deleteAgent()` 从 `setConfig` 改为调用 `ws?.deleteAgent()`：

```swift
private func deleteAgent(_ agent: Agent) {
    guard agent.id != "main" else {
        errorMessage = "无法删除默认 Agent"
        return
    }
    ws?.deleteAgent(id: agent.id) { success in
        if success {
            agents.removeAll { $0.id == agent.id }
            // 刷新全局 agents 列表
            ws?.requestAgentsList()
            // 通知侧边栏等视图刷新
            NotificationCenter.default.post(name: .agentNameDidChange, object: nil)
            // 如果删除的是当前活跃 agent，切换回 main
            if ws?.currentAgentId == agent.id {
                ws?.switchAgent(to: "main")
                NotificationCenter.default.post(
                    name: .switchConversation,
                    object: nil,
                    userInfo: ["conversationId": "main:default", "agentId": "main"]
                )
            }
        } else {
            errorMessage = "删除失败，请重试"
        }
    }
}
```

### 3. AgentDetailView onDelete 回调简化

**文件**：同上

NavigationLink 的 onDelete 回调从 `{ showDeleteConfirm = agent }` 改为 `{ deleteAgent(agent) }`：

```swift
NavigationLink {
    AgentDetailView(agent: agent, onDelete: { deleteAgent(agent) }, onSave: { loadAgents() })
}
```

## 验证步骤

1. `xcodebuild build` 编译通过
2. 功能验证：
   - 在 AgentDetailView 点击"删除 Agent" → 立即弹出确认弹窗（不需返回上一级）
   - 确认删除 → 侧边栏立即移除该 agent
   - 切换到其他 agent → 对话正常
   - 重启 App → 被删除的 agent 不再出现
