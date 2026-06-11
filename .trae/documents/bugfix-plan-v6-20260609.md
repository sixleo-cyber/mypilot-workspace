# Bug 修复计划 v6 — 2026-06-09（迭代4 - 推理过程混乱根因）

## 用户报告

3. **推理过程仍然混乱**：
   ```
   好好好好好好好好好好好，用，用，用，用，用，用，用，用，用，用例子例子例子例子例子例子例子例子例子例子说：

   **，用例子说：

   **说：

   **说：
   ```
   然后**突然跳出整段结果**

## Phase 1 探索 — 关键真相

### 真相 A：daemon 存在两条独立的 stream 推送路径，且**同时启用**

抓取服务器 `nohup.out` 真实日志，统计当前 daemon 实际处理的事件：

| 事件类型 | 计数 | daemon 处理位置 | 推送类型 |
|---------|------|----------------|---------|
| `event: "agent"`，`stream: "assistant"` | **1441 次** | [daemon.js#L630-640](file:///Users/liaoxing/Downloads/未命名文件夹/mypilot-link/src/daemon.js#L630-L640) | `type:"stream"` |
| `event: "chat"`，`state: "delta"` | **380 次** | [daemon.js#L538-566](file:///Users/liaoxing/Downloads/未命名文件夹/mypilot-link/src/daemon.js#L538-L566) | `type:"stream"` |

**两条路径推送的内容完全一致**（同样的累积 text 增量），但维护**独立的累积变量**：
- agent 路径用 `pending.lastSent` / `pending.fullContent`
- chat 路径用 `pending.lastSentVisible` / `pending.lastSentThinking`

### 真相 B：App 端无去重，直接累加

[`WebSocketService.swift`](file:///Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/WebSocketService.swift#L633-L644) `case "stream":` 处理收到的 delta，调用 `streamHandler.parseDelta` → `streamingContent += visibleContent`。

两条路径推同样 token 给 App → App 把同样内容累加 2 次 → 用户看到 **"好好好…用，用，用…例子例子例子"** 的词级重复。

### 真相 C：Gateway 完全不发 thinking/reasoning

抓取最近所有 chat delta，`message.content` 数组**只有 `type:"text"`**，全文 0 处 `type:"thinking"`/`type:"reasoning"`。daemon 自己的统计 `[chat] final: ... thinking.length=0` 也印证当前模型（ark/glm/minimax，配置中 `reasoning:false`）完全不产生思维链。

所以用户报"推理过程仍然混乱"看到的胡言乱语，**不是真的推理过程**，而是**双重推送导致的可见正文流字符级重复**。用户把它当成"推理过程"是因为这堆字符出现得很早，最后才"突然跳出整段结果"（最终 done 帧的 finalDisplayContent 覆盖 streamingContent）。

### 真相 D：最终 done 帧"突然跳出整段"

[`WebSocketService.swift`](file:///Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/WebSocketService.swift#L654-L670) done 帧处理：
```swift
let finalContent = content.isEmpty ? self.streamingContent : content
// 用 done 帧的完整 content 覆盖 streamingContent 形成新 Message
```

done 帧的 `content` 来自 Gateway chat final 的纯净文本（无重复），所以最终 Message 内容是干净的。这就是**用户看到的"突然跳出整段结果"** — 双重累加的"好好好…"被 done 帧的干净内容替换。

## 修复方案

### 修复 1：daemon 关闭 agent.stream 推送路径（核心修复）

**文件**：[`daemon.js`](file:///Users/liaoxing/Downloads/未命名文件夹/mypilot-link/src/daemon.js#L630-L640)

**做法**：在 `agent.stream === "assistant"` 分支中**禁用 stream 推送**，只保留 `pending.fullContent` 更新（用于 lifecycle end 兜底）。

```js
if (payload.stream === "assistant") {
  const full = payload.data?.text || "";
  if (full) {
    pending.fullContent = full; // 仅记录最新累积内容，供 lifecycle end fallback
    pending.lastSent = full;    // 同步 lastSent 避免下次重复发
    // 不再推送 stream — chat 事件路径会推送同样的 visibleDelta
  }
}
```

**理由**：
- `chat` 事件已包含完整的 delta 流，是 Gateway 官方协议路径
- `agent` 事件是早期实现/向后兼容路径，但当前与 `chat` 路径完全重叠
- 删除 stream 推送但保留 fullContent — lifecycle end 5s 兜底超时仍可用

### 修复 2：daemon 兜底防御 — `[chat] no pending entry` 时不再发空 delta

日志中频繁出现：
```
[chat] event state=delta runId=... no pending entry (keys: )
```
说明 agent lifecycle end 已清空 pending（5s 超时被取消），但 Gateway 还在发 chat delta。这些"晚到的 delta"无 pending 也不会重发，因为 [`L529-L532`](file:///Users/liaoxing/Downloads/未命名文件夹/mypilot-link/src/daemon.js#L529-L532) 已经 return。所以这不是问题。但需要确认 agent lifecycle end **不应在 chat final 之前清空 pending**。

**做法**：在 `agent lifecycle end` 中**移除 5s setTimeout 的 pendingRequests.delete**，只在 `chat final` 时清理 pending。

修改 [`L650-L661`](file:///Users/liaoxing/Downloads/未命名文件夹/mypilot-link/src/daemon.js#L650-L661)：
```js
} else if (phase === "end") {
  log.info(`[...] Chat lifecycle ended, waiting for chat final event`);
  // 延长超时到 30s，让 chat final 有充足时间到达
  setTimeout(() => {
    if (pendingRequests.has(runId)) {
      const p = pendingRequests.get(runId);
      if (p && p.appWs && p.fullContent) {
        p.appWs.send(JSON.stringify({ type: "done", content: p.fullContent, conversationId: p.conversationId, agentId: p.agentId }));
      }
      pendingRequests.delete(runId);
      log.info(`[...] Chat timeout fallback after 30s`);
    }
  }, 30000); // 5s → 30s
}
```

### 修复 3：App 端最终防御 — streamHandler 检测重复词增长

**文件**：[`ChatStreamHandler.swift`](file:///Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/ChatStreamHandler.swift)

即使 daemon 改好，仍可能因网络重试/Gateway 异常重发 delta。增加防御：

在 `parseDelta` 中，**如果新 delta 与最近已累积内容尾部完全重叠**（即 `accumulator.hasSuffix(delta)`），则丢弃此 delta。

```swift
func parseDelta(_ delta: String, isReasoning: Bool, thinkingDelta: String = "") -> String? {
    // ... 现有逻辑

    // 防御：如果 accumulator 的尾部已包含此 delta，认为是 daemon 重复推送
    if !delta.isEmpty && accumulator.hasSuffix(delta) {
        return nil // 丢弃重复
    }

    return filtered.isEmpty ? nil : filtered
}
```

**注意**：这个检查应该在 `accumulator` 层做，而不是单次 delta 层。但 `streamingContent` 才是真实累积。所以应该用 `streamingContent.hasSuffix(delta)` 检查。

**更稳妥**：在 WebSocketService 的 `case "stream":` 中做检查，因为它能访问 `self.streamingContent`：
```swift
if !delta.isEmpty && self.streamingContent.hasSuffix(delta) && delta.count > 0 {
    return // 丢弃重复 delta
}
```

但这种检查也可能误伤合法重复（如"哈哈哈"），需要加阈值（如 delta.count >= 2）。

**决策**：先做修复 1（最干净），不实施修复 3（避免误伤）。如果修复 1 后仍有问题再上 3。

## 文件变更清单

| 文件 | 变更 | 优先级 |
|------|------|--------|
| `mypilot-link/src/daemon.js` | 1. agent.stream=assistant 移除 stream 推送，仅保留 fullContent 更新<br>2. agent lifecycle end 的超时从 5s 延长到 30s | P0 |

## 假设与决策

- **假设 A**：`chat` 事件流是 Gateway 标准且完整的协议路径，单独使用足以覆盖所有 delta 场景。已通过日志确认 380 个 chat delta 中 final 帧带有完整 text 内容。
- **决策 A**：禁用 agent.stream=assistant 推送，而非禁用 chat。理由：chat 路径有 thinking 分离、增量计算、attachment 提取等更完整的逻辑；agent 路径是早期简陋实现。
- **决策 B**：保留 agent lifecycle end 的兜底 done 机制，但延长到 30s — 因为它在某些罕见场景（chat final 丢失）下仍可用。
- **决策 C**：不在 App 端加去重防御，避免误伤合法重复内容（如「哈哈哈」、`---`、`####`）。
- **决策 D**：不修改 App 侧代码 — 减少风险面，纯靠 daemon 协议层修复。

## 验证步骤

1. 重启 daemon
2. 进入对话，发送一个会让模型用例子说明的问题
3. 流式过程中观察：每个字应**只出现一次**（无"好好好…用，用，用…例子例子例子"重复）
4. 最终 done 帧的整段结果应**无缝衔接**流式内容（不再"突然跳出"）
5. 检查 daemon 日志：仍可见 `[chat] final: text.length=...` 正常完成
6. 验证 lifecycle end 超时延长不影响正常完成（chat final 通常在 lifecycle end 后 100ms 内到达）

## 约束

- 不修改 SOUL.md
- 不修改已部署素材
- 不影响已开发和已测试通过的功能（命令执行、网络访问、搜索同步等不受影响）
- 不破坏用户本地持久化数据
