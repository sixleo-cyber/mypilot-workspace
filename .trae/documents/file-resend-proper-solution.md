# AI 文件重发功能修复——正确方案

## Summary

**问题**：让 AI 重新发送已有文件时失败。AI 回复了文件路径（如 `/root/.openclaw/workspace/测试报告.docx`），但 App 只显示纯文本，没有文件附件卡片。

**根因**：Gateway chat 事件到达 daemon 时，`pendingRequests` 中找不到对应的 entry（`no pending entry`），导致整个 chat 事件处理逻辑被跳过——包括 `extractContentParts` 中的文件路径提取。

**新创建文件成功的原因**：Gateway 自动为 `write_file` 工具调用生成 `{ type: "file", url: "..." }` content part，这个在 `extractContentParts` 中被直接处理，不依赖文本正则。但引用已有文件时，AI 只输出文本路径，没有 `file` content part，只能靠文本正则提取——而正则提取的代码在 pending entry 丢失时被完全跳过。

## Proposed Changes

### 核心修复：handleChatResponse 保留双索引

**文件**: `mypilot-link/src/daemon.js`

#### 修复 1: handleChatResponse — 同时保留 reqId 和 runId

当前 `handleChatResponse` 收到 Gateway 响应后，把 pending entry 从 `reqId` 迁移到 `runId`，删除 `reqId`。如果 chat 事件在迁移完成前到达，就找不到 entry。

改为：**同时保留两个 key**，在 chat 结束时才清理。

```javascript
function handleChatResponse(msg, pending) {
  if (!msg.ok) {
    pendingRequests.delete(msg.id);
    // ... error handling
    return;
  }
  const runId = msg.payload?.runId;
  if (runId) {
    pending.runId = runId;
    pending.reqId = msg.id;
    pendingRequests.set(runId, pending);
    // 保留 reqId key 不删除，双索引防止竞态
    pending.workspaceSnapshot = snapshotWorkspace();
    log.info(`Chat started: runId=${runId}, reqId=${msg.id} (dual-keyed)`);
  } else {
    log.warn(`chat.send response has no runId, keeping reqId=${msg.id}`);
  }
}
```

#### 修复 2: final 帧发送后清理两个 key

在 `state === "final"` 处理中：

```javascript
pendingRequests.delete(runId);
if (pending.reqId) pendingRequests.delete(pending.reqId);
```

#### 修复 3: 简化 pending entry 查找逻辑

移除复杂的 sessionKey 恢复和 ad-hoc pending 构造。由于双索引保证 pending entry 一定存在，只需要一个简单的 fallback：

```javascript
const pending = pendingRequests.get(runId);
if (!pending) {
  // 极端情况：如果双索引仍然找不到，尝试 ad-hoc 构造
  const activeConn = findActiveAppConnection();
  if (activeConn) {
    // ... 构造临时 pending
  } else {
    log.warn(`[chat] no app connection, discarding`);
    return;
  }
}
```

#### 修复 4: extractContentParts 中文本路径匹配增强

当前正则 `wsPattern` 只在 `extractContentParts` 中执行，而 `extractContentParts` 在 delta 和 final 事件中都被调用。只要 pending entry 不丢失，文本路径就能被正确提取。

保留 Gateway 代理获取（当本地文件不存在时从 Gateway HTTP 端点 `/api/workspace-file/` 代理获取）作为文件下载的保障。但需要先确认 Gateway 是否提供此端点——如果不提供，需要用 SSH/SCP 或其他方式获取文件。

**关键发现**：Gateway 没有 `/api/workspace-file/` HTTP 端点。但新创建文件时附件能下载成功——这说明 content part 中的 `url` 字段可能不是指向 Gateway，而是指向本地路径或其他机制。

**解决方案**：在 `/api/workspace-file/` 端点中，如果本地文件不存在，通过 SSH 从服务器拉取文件到本地缓存。

## 修改文件清单

| 文件 | 改动 |
|------|------|
| `mypilot-link/src/daemon.js` | handleChatResponse 双索引 + final 清理 + 简化 pending 查找 + workspace-file SSH fallback |

## Verification Steps

1. `npm run verify` — daemon 测试通过
2. 重启 daemon
3. 测试 AI 创建新文件 → App 收到附件且可下载 ✅
4. 测试 AI 引用已有文件 → App 收到附件 ✅
5. 检查日志：不再出现 "no pending entry"
