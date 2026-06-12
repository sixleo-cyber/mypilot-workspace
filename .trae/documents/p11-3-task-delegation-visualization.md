# P11-3: 任务委派过程可视化

## 概要

在对话中显示 main-agent 委派任务给子 agent 的过程，让用户知道当前是哪个 agent 在响应。

## 当前状态分析

### Gateway 事件结构（从远端日志验证）

Gateway 发送的 `agent` 事件 payload 包含：
- `runId`: 会话运行 ID
- `stream`: `assistant` | `lifecycle` | `item` | `command_output`
- `data`: 事件数据
- `sessionKey`: 格式 `"agent:{agentId}:{conversationId}"`

**关键发现**：Gateway **不发送** subagent/delegate/spawn 相关事件。当 main-agent 委派任务给子 agent 时：
1. 子 agent 的输出作为 main-agent `assistant` stream 的一部分返回
2. 不会产生独立的"委派事件"或新的 runId
3. `item` stream 的 kind 只有 `command` 和 `tool`，没有 `subagent`

### 可行方案

由于 Gateway 不主动推送委派事件，采用**文本模式匹配 + agent 事件流推断**方案：

1. **daemon 端**：在 `agent` 事件的 `item` stream 中，检测 `kind: "command"` 且 title 包含 agent 调用关键词（如 `call_agent`、`delegate`、`spawn`），推断委派发生
2. **daemon 端**：在 `assistant` stream 中，检测文本中是否包含子 agent 标识（如 `[coder]`、`→ coder`）
3. **App 端**：在对话中插入"委派给 XX"的系统消息标记

**更务实的方案**：利用已有的 `checkForNewAgents` 机制 + `item` stream 中的 command 信息，在 App 端显示"正在调用工具..."的状态提示。

## 改动清单

### 方案 A：轻量级 — 工具调用状态提示（推荐）

在 daemon 转发 `agent` 事件的 `item` stream 时，提取 `kind: "command"` 的 title 信息，发送给 App 显示"正在执行: {title}"。

#### 1. daemon.js — 转发 item stream 事件

**位置**: `handleGatewayEvent` 函数中 `payload.stream === "assistant"` 之前

```js
if (payload.stream === "item") {
  const data = payload.data || {};
  if (data.phase === "start" && data.kind === "command" && data.title) {
    pending.appWs.send(JSON.stringify({
      type: "agent.status",
      status: "executing",
      title: data.title,
      conversationId: pending.conversationId,
      agentId: pending.agentId
    }));
  }
}
```

#### 2. WebSocketService.swift — 添加 agent.status frame 处理

**位置**: `parseMessage` switch 中

```swift
case "agent.status":
    handleAgentStatusFrame(json)
```

**新方法**:

```swift
private func handleAgentStatusFrame(_ json: [String: Any]) {
    let status = json["status"] as? String ?? ""
    let title = json["title"] as? String ?? ""
    let convId = json["conversationId"] as? String ?? currentConversationId

    mainAsync { [weak self] in
        guard let self = self, convId == self.currentConversationId else { return }
        if status == "executing" && !title.isEmpty {
            // 更新处理状态显示
            self.isProcessing = true
            self.processingStatusText = title
        }
    }
}
```

#### 3. WebSocketService.swift — 添加 processingStatusText 属性

```swift
var processingStatusText: String?
```

#### 4. ChatView / ChatMessageSection — 显示处理状态文本

在 `isProcessing` 状态下，如果有 `processingStatusText`，显示"正在执行: {title}"。

### 方案 B：完整委派可视化（需 Gateway 支持，暂不可行）

需要 Gateway 添加 `agent.delegate` 事件类型，包含 `fromAgentId` 和 `toAgentId`。当前 Gateway 不支持，需要等待上游更新。

## 验证步骤

1. `cd /Users/liaoxing/Downloads/未命名文件夹/mypilot-link && npm run verify`
2. Xcode 编译验证
3. 与 main-agent 对话，观察是否显示"正在执行: ..."状态提示
