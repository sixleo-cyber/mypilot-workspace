# P11: 子 Agent 协作增强

## 需求

1. **AGENTS.md 协作关系可视化**：在 Agent 详情页展示 AGENTS.md 中声明的协作关系
2. **Agent 创建实时通知**：当 main-agent 自动创建子 agent 时，App 端实时收到通知并更新列表
3. **任务委派过程可视化**：在对话中显示任务委派过程（main → coder 的请求和返回）

## 当前状态分析

### Gateway 事件机制
Gateway 发送 3 种事件给 daemon：
- `chat`：对话流（delta/final）
- `chat.error`：对话错误
- `agent`：agent 生命周期（assistant stream + lifecycle phases: error/end）

**关键限制**：Gateway **不会**主动通知 daemon 关于：
- 新 agent 被创建
- agent 间任务委派
- 子 agent spawn

这意味着"实时通知"和"委派可视化"需要通过**轮询**或**推理**来实现，而非事件驱动。

### AGENTS.md 格式
AGENTS.md 是每个 agent workspace 下的 markdown 文件，声明了该 agent 可以委派任务给哪些子 agent。格式类似：
```markdown
# AGENTS.md
- coder: 代码专家，负责编程任务
- writer: 写作助手，负责文案撰写
```

App 已有 `requestAgentFile(agentId:name:)` 方法可以获取 AGENTS.md 内容。

### Daemon 转发机制
Daemon 的 `handleGatewayEvent` 只处理 `chat`、`chat.error`、`agent` 三种事件。没有 agent 创建或委派事件的转发。

## 修改计划

### 1. AGENTS.md 协作关系可视化

**文件**：`/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Settings/AgentDetailView.swift`（在 AgentsManagementView.swift 内）

在 Agent 详情页添加"协作关系"Section，显示该 agent 的 AGENTS.md 内容：

- 添加 `@State private var agentsMdContent: String?`
- 在 `onAppear` 时调用 `ws?.requestAgentFile(agentId: agent.id, name: "AGENTS.md")` 获取内容
- 解析 AGENTS.md 中的 agent 列表（`- agentId: description` 格式）
- 显示为列表，每项包含 agent 名称和描述
- 如果该 agent 出现在其他 agent 的 AGENTS.md 中，也显示"被 XX 委派"关系

**实现细节**：
```swift
Section("协作关系") {
    if let content = agentsMdContent, !content.isEmpty {
        // 解析 AGENTS.md 中的 agent 列表
        ForEach(parseAgentsMd(content), id: \.agentId) { entry in
            HStack {
                AgentAvatarView(agent: Agent(id: entry.agentId, name: entry.agentId))
                VStack(alignment: .leading) {
                    Text(entry.agentId).font(.subheadline)
                    Text(entry.description).font(.caption).foregroundStyle(.secondary)
                }
            }
        }
    } else {
        Text("无协作关系").foregroundStyle(.secondary)
    }
}
```

### 2. Agent 创建实时通知（轮询方案）

由于 Gateway 不主动推送 agent 创建事件，采用**轻量轮询**方案：

**daemon.js 改动**：
- 添加 `agents.list` 缓存，记录上次返回的 agent 列表
- 在 `handleGatewayEvent` 的 `agent` lifecycle `end` 事件后，自动调用 `agents.list` 检查是否有新 agent
- 如果检测到新 agent，向 App 发送 `agent.created` frame

```js
// 在 agent lifecycle end 事件处理后
if (phase === "end") {
    // 检查是否有新 agent 被创建
    checkForNewAgents(pending.appWs, pending.deviceId);
}

async function checkForNewAgents(appWs, deviceId) {
    // 调用 Gateway agents.list RPC
    // 比对缓存，如果有新 agent 则发送 agent.created frame
}
```

**App 端改动**（WebSocketService.swift）：
- 添加 `case "agent.created"` 处理
- 收到后自动调用 `requestAgentsList()` 刷新列表
- 发送 `agentNameDidChange` 通知驱动侧边栏刷新

### 3. 任务委派过程可视化

**方案**：在 daemon 的 `handleGatewayEvent` 中，当检测到 `agent` 事件的 `payload.stream === "assistant"` 且 `payload.agentId` 与当前对话的 `agentId` 不同时，说明发生了任务委派。

**daemon.js 改动**：
- 在 `agent` 事件处理中，检测 `payload.agentId` 是否与 `pending.agentId` 不同
- 如果不同，说明是子 agent 在响应，发送 `agent.delegate` frame 给 App

```js
if (payload.stream === "assistant") {
    const eventAgentId = payload.agentId || pending.agentId;
    if (eventAgentId !== pending.agentId) {
        // 子 agent 在响应，通知 App
        pending.appWs.send(JSON.stringify({
            type: "agent.delegate",
            fromAgentId: pending.agentId,
            toAgentId: eventAgentId,
            conversationId: pending.conversationId,
            text: payload.data?.text || ""
        }));
    }
}
```

**App 端改动**：
- WebSocketService 添加 `case "agent.delegate"` 处理
- 在对话消息中插入"委派给 XX"的标记消息
- ChatView 中显示委派标记（类似 iMessage 的"转发"样式）

**注意**：这个功能依赖 Gateway 的 `agent` 事件是否包含 `agentId` 字段。需要实际测试确认。如果 Gateway 不传递 `agentId`，则无法区分是哪个 agent 在响应，此功能暂不可实现。

## 实施优先级

1. **P11-1：AGENTS.md 协作关系可视化**（确定可行，无外部依赖）
2. **P11-2：Agent 创建实时通知**（需要修改 daemon，轮询方案可行）
3. **P11-3：任务委派过程可视化**（依赖 Gateway 事件格式，需先验证）

## 验证步骤

1. `xcodebuild build` 编译通过
2. `npm run verify` daemon 验证通过
3. 功能验证：
   - Agent 详情页显示 AGENTS.md 协作关系
   - main-agent 创建子 agent 后，App 自动收到通知并更新列表
   - 任务委派过程在对话中可见
