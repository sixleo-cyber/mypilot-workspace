# 新增 Agent 一键同步功能

## 需求

用户可以让 main-agent 自动生成子 agent。这些 agent 不是通过 MyPilot App 创建的，但需要在 App 端显示。需要在 agent 管理页面新增一个"一键同步"按钮，将 Gateway 上所有 agent 同步到 App 端。

## 当前状态分析

### 现有流程
1. `requestAgentsList()` → Gateway `agents.list` RPC → 返回所有已注册 agent
2. `WebSocketService.agents` 被更新（全局状态）
3. `AgentsManagementView.loadAgents()` 在 `onAppear` 时从 `ws.agents` 读取到本地 `@State agents`
4. `SidebarView` 直接使用 `ws.agents`，所以侧边栏会自动显示新 agent

### 关键发现
- `requestAgentsList()` 已经能获取 Gateway 上**所有** agent（包括非 App 创建的）
- 问题在于 `AgentsManagementView` 的本地 `agents` 只在 `onAppear` 时同步一次
- 侧边栏用 `ws.agents` 是实时更新的，但管理页面的列表不是

## 修改计划

### 1. AgentsManagementView — 添加同步按钮

**文件**：`/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Settings/AgentsManagementView.swift`

在"创建新 Agent"按钮旁添加"同步 Agent"按钮：

```swift
Section {
    HStack {
        Button { syncAgents() } label: {
            Label("同步 Agent", systemImage: "arrow.triangle.2.circlepath")
                .font(.subheadline)
                .foregroundStyle(AppColors.leaf300)
        }
        .disabled(isSyncing)

        Spacer()

        Button { showCreateAgent = true } label: {
            Label("创建新 Agent", systemImage: "plus.circle.fill")
                .font(.subheadline)
                .foregroundStyle(AppColors.leaf300)
        }
    }
}
```

添加 `@State private var isSyncing = false` 和 `syncAgents()` 方法：

```swift
private func syncAgents() {
    isSyncing = true
    errorMessage = nil
    ws?.requestAgentsList()
    DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
        if let currentAgents = ws?.agents {
            agents = currentAgents
        }
        isSyncing = false
    }
}
```

### 2. loadAgents() 优化 — 减少延迟等待

当前 `loadAgents()` 用 3 秒固定延迟等待 RPC 响应，体验不好。添加对 `ws.agents` 变化的监听，实现更及时的更新：

在 `AgentsManagementView` 中添加 `.onReceive` 监听 `ws.agents` 变化：

```swift
.onReceive(NotificationCenter.default.publisher(for: .agentNameDidChange)) { _ in
    // 当 agent 列表变化时，同步本地状态
    if let currentAgents = ws?.agents {
        agents = currentAgents
    }
}
```

### 3. 同步后自动拉取新 agent 的头像

对于非 App 创建的 agent，可能没有本地头像。同步时检查新 agent 是否有远端 `avatarUrl`，如果有则下载保存到本地。

这个功能可以后续迭代，当前先确保 agent 列表正确显示即可。`AgentAvatarView` 已有远端头像回退逻辑（本地 > 远端 avatarUrl > 默认图标），所以即使没有本地头像也能正确显示。

## 假设与决策

1. **同步 = 重新拉取 agents.list**：Gateway `agents.list` 返回所有 agent，包括 main-agent 自动创建的子 agent。无需额外 API
2. **不做增量同步**：直接全量刷新 `ws.agents`，简单可靠
3. **不自动同步**：用户手动点击同步按钮触发，避免频繁请求
4. **头像处理**：当前 `AgentAvatarView` 已支持远端头像回退，无需额外处理

## 验证步骤

1. `xcodebuild build` 编译通过
2. 功能验证：
   - 在 agent 管理页面点击"同步 Agent" → 列表刷新，显示 Gateway 上所有 agent
   - 通过 main-agent 创建子 agent → 点击同步 → 新 agent 出现在列表中
   - 侧边栏同步更新
   - 新 agent 可以正常对话
