# 修复 AI 文件路径不被转为附件的问题

## Summary

AI 回复中引用 `/root/.openclaw/workspace/测试报告.docx` 路径时，App 只显示纯文本路径，没有转为文件附件。根因是 Gateway chat 事件到达时 `pendingRequests` 中找不到对应 entry，导致整个回复（包括 extractContentParts）被跳过。

## Current State Analysis

### 问题链条

1. App 发 `chat.send` → daemon 调 `sendToGateway` → `pendingRequests.set(reqId, {...})`
2. Gateway 响应 `res` → `handleChatResponse` → `pendingRequests.set(runId, pending); pendingRequests.delete(reqId)`
3. Gateway 推送 `chat` event → `pendingRequests.get(runId)` → **失败！keys 为空**

### 根因推断

日志显示 `no pending entry (keys: )` — keys 完全为空，说明：

- **可能 A**：`handleChatResponse` 从未被调用（Gateway 响应格式不匹配 `msg.type === "res"`）
- **可能 B**：`handleChatResponse` 被调用了但 `msg.payload.runId` 为 undefined（chat.send 响应不含 runId）
- **可能 C**：chat 事件在 `handleChatResponse` 之前到达（竞态），但 sessionKey 恢复也失败了

从日志看 Gateway 响应是 `[Gateway ←] res id=mp-1-mq9jlw1l ok=true`，这说明 `handleGatewayResponse` **确实**被调用了。但 keys 为空说明可能是情况 B——`runId` 为 undefined，导致 pending entry 被 `pendingRequests.delete(msg.id)` 删除而没有迁移到 runId。

### 当前的 fallback 机制问题

orphan final 路径只推送了 `file.new`，但没有发送 `done` 帧和文本内容——App 收不到 AI 的文字回复。

## Proposed Changes

### 文件: `mypilot-link/src/daemon.js`

#### 1. 添加调试日志确认 runId 是否存在

在 `handleChatResponse` 中已有 `log.info(\`chat.send response: ok=\${msg.ok}, runId=\${runId || "none"}...\`)`。

在 orphan 分支也加入 sessionKey 调试信息。

#### 2. 核心修复：让 chat 事件不再完全依赖 pending entry

将 chat 事件处理改为：即使没有 pending entry，也向 App 发送完整的 `stream`/`done` 帧。

关键改动：**在没有 pending entry 时，从当前 App 连接中找到活跃的 WebSocket 连接，构造临时的 pending entry**。

```javascript
if (!pending) {
  // 尝试 sessionKey 恢复
  let foundBySession = null;
  for (const [, entry] of pendingRequests.entries()) {
    if (entry.type === "chat" && entry.sessionKey === msg.payload?.sessionKey) {
      foundBySession = entry;
      break;
    }
  }
  if (foundBySession) {
    pendingRequests.set(runId, foundBySession);
  } else {
    // 从活跃连接中找到 App WebSocket，构造临时 pending
    const activeConn = findActiveAppConnection();
    if (activeConn) {
      const eventSk = msg.payload?.sessionKey || "";
      const agentId = eventSk.split(":")[1] || "main";
      const convParts = eventSk.split(":");
      const conversationId = convParts[convParts.length - 1] || "default";
      
      foundBySession = {
        type: "chat",
        appWs: activeConn,
        deviceId: "",
        fullContent: "",
        sessionKey: eventSk,
        conversationId,
        agentId,
        workspaceSnapshot: null,
        lastSentVisible: "",
        lastSentThinking: "",
        lastFileCheck: 0,
      };
      pendingRequests.set(runId, foundBySession);
      log.info(`[chat] created ad-hoc pending for runId=${runId?.substring(0, 16)}`);
    } else {
      // 真的没有连接，只能放弃
      log.warn(`[chat] no app connection for runId=${runId?.substring(0, 16)}, discarding`);
      return;
    }
  }
}
```

#### 3. 新增辅助函数 findActiveAppConnection

```javascript
function findActiveAppConnection() {
  for (const [, ws] of connections.entries()) {
    if (ws.readyState === 1) return ws;
  }
  return null;
}
```

#### 4. 移除 orphan final 的特殊处理

因为现在所有 chat 事件都能找到/构造 pending entry，不再需要 orphan final 分支。整个 if/else 块简化为：先尝试恢复 pending，再尝试构造临时 pending，最后走正常流程。

### 文件: `MyPilotApp/MyPilot/MyPilot/Services/WebSocketService.swift`

无需修改。现有 `handleDoneFrame` 和 `handleFileNewFrame` 已能正确处理。

## 修改文件清单

| 文件 | 改动 |
|------|------|
| `mypilot-link/src/daemon.js` | 重写 chat 事件 pending 查找逻辑，构造临时 pending，移除 orphan final 分支 |

## Assumptions & Decisions

1. chat 事件的 `msg.payload.sessionKey` 格式与 sendToGateway 构造的一致
2. 活跃 App 连接可通过 `connections` Map 获取
3. 不修改 Gateway 端代码（服务端不受控）
4. 不修改 App 端代码

## Verification Steps

1. `npm run verify` — daemon 测试通过
2. 重启 daemon
3. 在 App 中测试：「请把刚才的 word 文档再发给我」
4. 预期：AI 回复中引用文件路径 → App 显示文件附件卡片
5. 检查 daemon 日志：确认 chat 事件被正确处理
