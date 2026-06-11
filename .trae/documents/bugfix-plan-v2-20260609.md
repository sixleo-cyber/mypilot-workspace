# Bug 修复计划 v2：思考重复、搜索全已配置、权限不持久

## 问题摘要

上一轮修复后三个 bug 仍未解决，根因分析需要修正：

1. **Bug 2.3**：思考内容重复渲染（"这个这个这个..."重复 10+ 次）
2. **搜索服务**：所有搜索服务都显示为"已配置"
3. **Bug 7.2**：权限切换后不持久

---

## Bug 2.3：思考内容重复渲染

### 真正根因

daemon.js 的 `handleGatewayEvent` 处理 `state === "delta"` 时（第 526-536 行）：

```js
const { text } = extractContentParts(message.content);
if (text) {
    pending.fullContent = text;
    const prev = pending.lastSent || "";
    const delta = text.startsWith(prev) ? text.slice(prev.length) : text;
    pending.lastSent = text;
    if (delta) {
        pending.appWs.send(JSON.stringify({ type: "stream", delta, content: text, ... }));
    }
}
```

Gateway 的 `message.content` 是**累积全量文本**（包含 `<think>` 标签），daemon 用 `text.startsWith(prev)` 做差量。但问题是：

1. Gateway 的累积文本中，`<think>` 标签内容在**每次 delta 中都完整出现**（因为是累积全量），而 `<think>` 标签外的可见内容也在增长
2. `extractContentParts` 不区分 thinking 和 visible，直接把整个文本（含 `<think>` 标签）作为 `text`
3. daemon 发给 App 的 stream 帧没有 `isReasoning` 字段，App 端 `isReasoning` 始终为 `false`
4. App 端 `ChatStreamHandler.parseDelta` 在 `isReasoning=false` 时调用 `stripThinkTags`，但每次 delta 都包含完整的 `<think>` 标签内容，导致 thinking 被重复提取

**举例**：
- Delta 1: `<think>这个</think>` → thinkingContent = "这个"
- Delta 2: `<think>这个改革</think>改革` → stripThinkTags 提取 thinking = "这个改革"，追加到 thinkingContent = "这个这个改革"（重复了"这个"）
- Delta 3: `<think>这个改革的核心</think>改革的核心` → thinking = "这个改革的核心"，追加后 = "这个这个改革这个改革的核心"（越来越乱）

**根本问题**：daemon 不应该把 `<think>` 标签内容作为流式 delta 的一部分发送给 App。应该在 daemon 层分离 thinking 和 visible 内容。

### 修复方案

**文件**：`mypilot-link/src/daemon.js`

在 `handleGatewayEvent` 的 delta 处理中，分离 thinking 和 visible 内容：

```js
if (state === "delta" && message?.role === "assistant") {
    const { text } = extractContentParts(message.content);
    if (text) {
        // 分离 thinking 和 visible 内容
        const thinkingText = extractThinking(text);
        const visibleText = stripThinkingTags(text);

        // 计算可见内容的增量
        const prevVisible = pending.lastSentVisible || "";
        const visibleDelta = visibleText.startsWith(prevVisible) ? visibleText.slice(prevVisible.length) : visibleText;
        pending.lastSentVisible = visibleText;

        // 计算思考内容的增量
        const prevThinking = pending.lastSentThinking || "";
        const thinkingDelta = thinkingText.startsWith(prevThinking) ? thinkingText.slice(prevThinking.length) : thinkingText;
        pending.lastSentThinking = thinkingText;

        if (visibleDelta || thinkingDelta) {
            pending.appWs.send(JSON.stringify({
                type: "stream",
                delta: visibleDelta || "",
                thinkingDelta: thinkingDelta || "",
                content: visibleText,
                thinkingContent: thinkingText,
                conversationId: pending.conversationId,
                agentId: pending.agentId,
                isReasoning: thinkingDelta.length > 0 && !visibleDelta
            }));
        }
    }
}
```

新增工具函数：

```js
function extractThinking(text) {
    const match = text.match(/<think>([\s\S]*?)(<\/think>|$)/);
    return match ? match[1] : "";
}

function stripThinkingTags(text) {
    return text.replace(/<think>[\s\S]*?(<\/think>|$)/g, "").trim();
}
```

**文件**：`ChatStreamHandler.swift`

修改 `parseDelta` 以支持 `thinkingDelta` 字段：

```swift
func parseDelta(_ delta: String, isReasoning: Bool, thinkingDelta: String = "") -> String? {
    let filtered = delta
        .replacingOccurrences(of: "HEARTBEAT", with: "")
        .replacingOccurrences(of: "<heartbeat/>", with: "")
        .replacingOccurrences(of: "[HEARTBEAT]", with: "")
        .replacingOccurrences(of: "{\"type\":\"heartbeat\"}", with: "")
    guard !filtered.isEmpty || !thinkingDelta.isEmpty else { return nil }

    // 如果有专门的 thinkingDelta，直接追加
    if !thinkingDelta.isEmpty {
        thinkingContent += thinkingDelta
        onThinkingUpdate?(thinkingContent)
    }

    // visible delta 不再需要 stripThinkTags（daemon 已分离）
    guard !filtered.isEmpty else { return nil }

    // 兼容旧版 daemon：如果 delta 仍包含 <think> 标签
    if thinkingDelta.isEmpty && filtered.contains("<think>") {
        let (visible, thinking) = stripThinkTags(from: filtered)
        if !thinking.isEmpty && thinkingContent.isEmpty {
            thinkingContent += thinking
            onThinkingUpdate?(thinkingContent)
        }
        return visible.isEmpty ? nil : visible
    }

    return filtered.isEmpty ? nil : filtered
}
```

**文件**：`WebSocketService.swift`

修改 stream 帧处理，传递 `thinkingDelta`：

```swift
case "stream":
    let isReasoning = json["isReasoning"] as? Bool ?? false
    let thinkingDelta = json["thinkingDelta"] as? String ?? ""
    if let delta = json["delta"] as? String, !delta.isEmpty || !thinkingDelta.isEmpty {
        mainAsync { [weak self] in
            guard let self = self else { return }
            guard !self.streamHandler.isAborted else { return }
            guard let visibleContent = self.streamHandler.parseDelta(delta, isReasoning: isReasoning, thinkingDelta: thinkingDelta) else { return }
            // ... rest unchanged
        }
    }
```

---

## 搜索服务全部显示为"已配置"

### 根因分析

`fetchSearchSettingsFallback` 中的 `providerResult` 函数（第 934-948 行）将所有有 `apiKey` 的 skills 条目标记为 `isConfigured: true`。但 `skills.entries` 中的条目不全是搜索服务 — 有些是其他类型的 skill（如 code-interpreter、image-gen 等），它们也有 `apiKey` 或 `enabled` 字段。

而且 `fetchSearchSettings` 的合并逻辑（第 888-905 行）现在**总是**调用 `fetchSearchSettingsFallback` 并合并，导致 fallback 中所有有 apiKey 的 skill 都被添加为"已配置"的搜索服务。

### 修复方案

**文件**：`WebSocketService.swift`

1. `providerResult` 只添加**已知搜索服务**（有对应 providerIdForSkillKey 映射的）为 isConfigured
2. `fetchSearchSettings` 的合并逻辑：只添加主数据源中不存在的**已知搜索服务**

```swift
private func providerResult(merged: [String: [String: Any]], webSearchEnabled: Bool) -> [String: Any] {
    var providerIds: Set<String> = []
    let rawProviders: [[String: Any]] = merged.compactMap { (key, entry) -> [String: Any]? in
        let hasKey = (entry["apiKey"] as? String)?.isEmpty == false
        guard hasKey else { return nil }
        // 只添加已知搜索服务
        guard let pid = self.providerIdForSkillKey(key) else { return nil }
        providerIds.insert(pid)
        let name = entry["name"] as? String ?? pid
        return ["id": pid, "name": name, "isConfigured": true, "isBuiltIn": true]
    }
    // ...
}
```

合并逻辑也加上过滤：

```swift
for fp in fallbackProviders {
    let fid = fp["id"] as? String ?? ""
    // 只添加主数据源中不存在的已知搜索服务
    if !mainIds.contains(fid) && (fp["isConfigured"] as? Bool ?? false) {
        // 检查是否是已知搜索服务
        let isKnownSearchProvider = /* 检查 fid 是否在已知搜索服务列表中 */
        if isKnownSearchProvider {
            mergedProviders.append(fp)
        }
    }
}
```

---

## Bug 7.2：权限不持久

### 根因分析

`config.get` 的链路：
1. App 发 `config.get {key: "agents.defaults.permissions"}` → daemon 透传给 Gateway
2. Gateway 的 `config.get` 返回 `{payload: {parsed: 完整配置, hash: ...}}`
3. daemon 透传 Gateway 响应给 App
4. App 的 `AgentRpcClient.getConfig` 期望 `payload.value` 是指定 key 的值
5. 但 Gateway 返回的是完整配置，`payload.value` 不存在 → `onResult(nil)` → 权限保持默认值 `false`

**问题**：daemon 的 `config.get` 处理只是简单透传，没有从 Gateway 返回的完整配置中提取指定 key 的值。

### 修复方案

**文件**：`mypilot-link/src/daemon.js`

修改 `config.get` 帧处理，从 Gateway 返回的完整配置中提取指定 key 的值：

```js
} else if (frame.type === "config.get") {
  const key = frame.params?.key || frame.key || "";
  if (key) {
    // 有 key 参数：从完整配置中提取指定路径的值
    handleConfigGetByKey(ws, deviceIdParam, key, frame.id);
  } else {
    // 无 key：直接透传
    sendGatewayRpc(ws, deviceIdParam, "config.get", {}, frame.id);
  }
```

新增 `handleConfigGetByKey` 和 `getNestedValue`：

```js
function getNestedValue(obj, keyPath) {
  const keys = keyPath.split(".");
  let current = obj;
  for (const key of keys) {
    if (current == null || typeof current !== "object") return undefined;
    current = current[key];
  }
  return current;
}

async function handleConfigGetByKey(ws, deviceId, key, frameId) {
  try {
    const getRes = await gatewayRpc("config.get", {});
    if (!getRes.ok) {
      ws.send(JSON.stringify({ type: "res", id: frameId, ok: false, error: { code: "CONFIG_GET_FAILED" } }));
      return;
    }
    const config = getRes.payload.parsed || {};
    const value = getNestedValue(config, key);
    ws.send(JSON.stringify({ type: "res", id: frameId, ok: true, payload: { value } }));
  } catch (err) {
    ws.send(JSON.stringify({ type: "res", id: frameId, ok: false, error: { code: "INTERNAL", message: err.message } }));
  }
}
```

---

## 实施步骤

### Step 1：修复 Bug 2.3（思考内容重复渲染）
1. 在 daemon.js 中新增 `extractThinking` 和 `stripThinkingTags` 工具函数
2. 修改 `handleGatewayEvent` 的 delta 处理，分离 thinking 和 visible
3. 修改 `ChatStreamHandler.parseDelta` 支持 `thinkingDelta` 参数
4. 修改 `WebSocketService` stream 帧处理传递 `thinkingDelta`

### Step 2：修复搜索服务全部已配置
1. 修改 `providerResult` 只添加已知搜索服务
2. 修改 `fetchSearchSettings` 合并逻辑加上过滤

### Step 3：修复权限不持久
1. 在 daemon.js 中新增 `getNestedValue` 和 `handleConfigGetByKey`
2. 修改 `config.get` 帧处理

### Step 4：部署
1. 上传 daemon.js 到服务器并重启
2. 删除旧的 search-providers.json 让迁移重新运行

### Step 5：验证
1. Build App
2. 端到端测试

---

## 假设与决策

- **Bug 2.3**：根因是 daemon 不分离 thinking/visible，且 Gateway 的累积全量文本导致 `<think>` 内容重复。修复策略是在 daemon 层做分离，App 端用独立的 `thinkingDelta` 字段
- **搜索服务**：根因是 fallback 的 `providerResult` 不区分搜索服务和其他 skill。修复策略是只显示已知搜索服务
- **Bug 7.2**：根因是 daemon 的 `config.get` 不做 key 路径解析。修复策略是在 daemon 层做 read-extract
- 不修改已部署素材
