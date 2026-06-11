# P4-A 核心功能补齐计划

## Summary

完成 P4-A 剩余 3 项功能：A2 Agent 头像与最后消息预览、A3 断线重连补发、A4 网页解析配置联动。（A1 定时任务已完成）

## Current State Analysis

### A2: Agent 头像与最后消息预览
- **Agent 模型**已有 `avatarUrl` 字段（[Agent.swift:9](file:///Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Models/Agent.swift#L9)）
- **AgentRow** 已支持 `AsyncImage` 渲染头像（[SidebarView.swift:370-396](file:///Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Views/SidebarView.swift#L370-L396)）
- **Conversation 模型**已有 `lastMessagePreview` 字段（[Conversation.swift:9](file:///Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Models/Conversation.swift#L9)）
- **ConversationRow** 已渲染 `lastMessagePreview`（[SidebarView.swift:437-442](file:///Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Views/SidebarView.swift#L437-L442)）
- **问题**：`lastMessagePreview` 从未被更新 — 收到 AI 回复后没有写入预览文本
- **daemon agents.list**：需要确认是否返回 avatar 字段

**结论**：UI 层已就绪，缺的是数据填充逻辑 — 收到消息后更新 `lastMessagePreview`。

### A3: 断线重连后 pending 队列补发
- **ConnectionManager** 已有 `pendingSendQueue` 和 `flushPendingQueue()`（[ConnectionManager.swift:37-103](file:///Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/ConnectionManager.swift#L37-L103)）
- **问题**：`flushPendingQueue()` 在 `onConnected` 回调中是否被调用？需要检查 WebSocketService 的重连逻辑
- **问题**：当前队列只存 JSON 字符串，没有去重机制 — 重连后可能重复发送 `chat.send`
- **需要**：在 WebSocketService 的 `onReconnect` 中调用 `flushPendingQueue()`，并对 `chat.send` 做去重

### A4: 网页解析配置真实联动
- **NetworkSettingsView** 已有"OpenClaw 网页解析"Toggle（[NetworkSettingsView.swift:292](file:///Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Settings/NetworkSettingsView.swift#L292)）
- 当前 Toggle 通过 `updateSearchToggles` 更新 `tools.web.fetch.enabled`
- **问题**：缺少 `tools.web.fetch.maxBytes` 和 `tools.web.fetch.timeout` 的配置项
- **需要**：在"联网搜索"Section 中添加 maxBytes 和 timeout 的配置控件

## Proposed Changes

### A2: Agent 头像与最后消息预览

**文件**: `MyPilotApp/MyPilot/MyPilot/Services/WebSocketService.swift`

在 AI 回复完成（收到 `chat.final` 或 `agent.lifecycle.end`）时，更新当前会话的 `lastMessagePreview`：

1. 找到处理 `chat.final` / `done` 的逻辑位置
2. 提取 AI 回复的前 100 个字符作为预览
3. 更新 `appState.conversations` 中对应会话的 `lastMessagePreview` 和 `lastMessageAt`

**文件**: `MyPilotApp/MyPilot/MyPilot/Services/AgentRpcClient.swift`

确认 `agents.list` RPC 返回的数据中是否包含 avatar 字段，如果有则确保 Agent 模型正确映射。

### A3: 断线重连后 pending 队列补发

**文件**: `MyPilotApp/MyPilot/MyPilot/Services/WebSocketService.swift`

1. 在 `onConnected` 回调中调用 `connectionManager.flushPendingQueue()`
2. 为 `chat.send` 类型的消息添加去重：发送前记录 `requestId`，重连补发时跳过已在 `chat.history` 中存在的请求

**文件**: `MyPilotApp/MyPilot/MyPilot/Services/ConnectionManager.swift`

1. `flushPendingQueue` 添加去重回调参数，让 WebSocketService 决定是否跳过某条消息

### A4: 网页解析配置真实联动

**文件**: `MyPilotApp/MyPilot/MyPilot/Features/Settings/NetworkSettingsView.swift`

在"联网搜索"Section 中添加：
1. `maxBytes` 配置：Stepper 或 TextField，范围 1024-10485760，默认 1048576（1MB）
2. `timeout` 配置：Stepper，范围 1-60 秒，默认 10 秒

**文件**: `MyPilotApp/MyPilot/MyPilot/Services/AgentRpcClient.swift`

新增 `updateWebFetchConfig` 方法，一次性设置 `tools.web.fetch.enabled`、`tools.web.fetch.maxBytes`、`tools.web.fetch.timeout`。

## Assumptions & Decisions

1. **A2 不改 daemon**：头像 URL 由 Gateway 的 `agents.list` 返回，App 端已支持渲染，只需确保数据映射正确
2. **A2 预览文本取前 100 字符**：足够在侧边栏显示，不会太长
3. **A3 去重策略**：基于 `chat.send` 的 `id` 字段，重连后先调 `chat.history` 获取已有消息 ID，跳过已存在的
4. **A4 不改 daemon**：`config.set` 已支持设置任意 key-path，只需 App 端发送正确的配置项

## Verification Steps

1. A2：发送消息后，侧边栏对话行显示最后消息预览；Agent 列表显示头像（如果 Gateway 返回了 avatarUrl）
2. A3：发送消息时断开连接 → 重连后消息自动补发 → 不重复
3. A4：修改 maxBytes/timeout → 重新打开设置页 → 值已持久化
4. `npm test` 仍全部通过
