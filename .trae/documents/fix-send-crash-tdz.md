# 修复：切换模型后发消息卡死 + agent list 超时

## 问题分析

### 根因：`sendToGateway` 中 TDZ 引用错误导致函数崩溃

在 P16 token 估算功能中，我在 `sendToGateway` 的 `pendingRequests.set()` 中添加了：
```js
userMessageChars: (message || "").length,  // L1216
```

但 `message` 是在 L1223 才用 `let message` 声明的。JavaScript 的 `let` 有暂时性死区（TDZ），在声明前引用会抛出 `ReferenceError`。

### Bug 链

1. **切换模型成功后发消息 → "正在发送消息" 永远卡住**
   - `chat.send` → daemon 先发 `{ type: "processing" }` → App `isProcessing = true`
   - daemon 调用 `sendToGateway` → L1216 抛出 `ReferenceError` → 函数崩溃
   - `pendingRequests` 中已设置条目（L1207），但 Gateway 从未收到 chat.send
   - App 永远收不到 `done` → `isProcessing` 永远为 true

2. **`/stop` 后再发消息 → "获取 agent.list 超时"**
   - `stopGeneration` 设 `isProcessing = false` → 调用 `flushPendingMessages()`
   - `flushPendingMessages` → `send(text:)` → daemon 又调 `sendToGateway` → 再次崩溃
   - `agent.model.set` 成功后触发 `requestAgentsList()` → `_sendGatewayRpc("agents.list")`
   - 如果 Gateway 正忙或 daemon 状态异常，agents.list 超时

3. **无法发送消息**
   - `isProcessing` 卡住 → `isAiResponding` 为 true → 新消息被入队而非发送
   - 或者 daemon 端 `pendingRequests` 泄漏，后续 chat 事件被旧 pending 拦截

### 次要问题

- `sendGatewayRpc` 之前没有超时（已在上轮修复）
- `sessions.abort` 后不清理 pending（已在上轮修复）
- `stopGeneration` 不清理 `activeGenerationConversationId`（已在上轮修复）

## 修复方案

### 1. 修复 `sendToGateway` TDZ 错误（关键修复）

**文件**：`mypilot-link/src/daemon.js` L1216

将 `userMessageChars: (message || "").length` 改为 `userMessageChars: (text || "").length`

因为 `text` 是函数参数，在 `pendingRequests.set()` 时已经可用。`message` 是后面才从 `text` 和 `attachments` 构造出来的，但 `userMessageChars` 只需要记录用户输入的字符数，用 `text` 即可。

### 2. 给 `chat.send` 处理添加 try-catch（防御性修复）

**文件**：`mypilot-link/src/daemon.js` L1788-1792

在 `handleAppWsMessage` 的 `chat.send` 分支中，给 `sendToGateway` 调用添加 try-catch：
- 如果 `sendToGateway` 抛出异常，发送 `error` frame 给 App
- 清理 `pendingRequests` 中刚设置的条目
- 这样 App 端可以正确处理错误，不会卡在 `isProcessing = true`

### 3. App 端 `handleErrorFrame` 中重置 `isProcessing`（防御性修复）

**文件**：`MyPilotApp/MyPilot/MyPilot/Services/WebSocketService.swift`

在 `handleErrorFrame` 中确保 `isProcessing = false` 和 `activeProcessingCount = 0`，防止错误后状态卡住。

## 验证步骤

1. `cd mypilot-link && npm run verify` — 确保测试通过
2. `cd MyPilotApp/MyPilot && xcodebuild build` — 确保 App 编译通过
3. 部署 daemon 到远端
4. 测试：切换模型 → 发消息 → 确认 AI 正常回复
5. 测试：发消息 → 中断 → 再发消息 → 确认正常工作
