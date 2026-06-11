# Bug 修复计划：思考内容重复渲染、权限不持久、搜索服务不一致

## 问题摘要

手动测试发现 3 个 bug：

1. **Bug 2.3**：思考过程重复渲染（如"当然会会会啊"而非"当然会啊"）
2. **Bug 7.2**：命令执行权限切换后不持久（退出再进入恢复为关闭）
3. **额外 Bug**：搜索服务列表与 OpenClaw 实际配置不一致

---

## Bug 2.3：思考内容重复渲染

### 根因分析

`ChatStreamHandler.parseDelta()` 有两条路径向 `thinkingContent` 追加内容：

1. **`isReasoning=true`** 时（第 38-41 行）：直接将 delta 追加到 `thinkingContent`
2. **`isReasoning=false`** 但 delta 包含 `<think>` 标签时（第 44-48 行）：`stripThinkTags` 提取思考内容追加到 `thinkingContent`

Gateway 在思考阶段发送 `isReasoning=true` 的 delta，在回复阶段可能发送包含 `<think>...</think>` 标签的 delta（`isReasoning=false`），导致同一思考内容被追加两次。

此外，`done` 帧中 `json["thinking"]` 包含完整思考内容，`streamHandler.drainThinkingContent()` 也返回流式累积的思考内容。当前逻辑是：如果 `done` 帧有 `thinking` 就用它，否则用流式累积的。但如果两者都有且内容不同（流式累积了重复内容），最终显示的可能是重复的。

### 修复方案

**文件**：`ChatStreamHandler.swift`

在 `parseDelta` 中增加防护：如果已经通过 `isReasoning` 路径累积了思考内容，则不再从 `<think>` 标签中提取。

```swift
func parseDelta(_ delta: String, isReasoning: Bool) -> String? {
    let filtered = delta
        .replacingOccurrences(of: "HEARTBEAT", with: "")
        .replacingOccurrences(of: "<heartbeat/>", with: "")
        .replacingOccurrences(of: "[HEARTBEAT]", with: "")
        .replacingOccurrences(of: "{\"type\":\"heartbeat\"}", with: "")
    guard !filtered.isEmpty else { return nil }

    if isReasoning {
        thinkingContent += filtered
        onThinkingUpdate?(thinkingContent)
        return nil
    }

    // 如果已经通过 isReasoning 累积了思考内容，跳过 <think> 标签解析
    // 避免同一思考内容被重复追加
    guard thinkingContent.isEmpty else {
        // 已经有思考内容，<think> 标签中的内容是重复的，只提取 visible 部分
        let (visible, _) = stripThinkTags(from: filtered)
        return visible.isEmpty ? nil : visible
    }

    let (visible, thinking) = stripThinkTags(from: filtered)
    if !thinking.isEmpty {
        thinkingContent += thinking
        onThinkingUpdate?(thinkingContent)
    }

    return visible.isEmpty ? nil : visible
}
```

**文件**：`WebSocketService.swift`（done 帧处理）

优先使用 `done` 帧中的 `thinking` 字段（Gateway 提供的完整版本），而非流式累积的可能重复的版本：

```swift
case "done":
    let content = json["content"] as? String ?? ""
    let thinkingFromDone = json["thinking"] as? String ?? json["reasoning_content"] as? String
    let drainedThinking = self.streamHandler.drainThinkingContent()
    // 优先使用 done 帧的 thinking（完整且不重复），仅在没有时回退到流式累积
    let thinkingContent = thinkingFromDone ?? drainedThinking
```

---

## Bug 7.2：权限切换不持久

### 根因分析

App 端 `setConfig` 发送 `{key: "agents.defaults.permissions.allowCommands", value: true}` 格式。

daemon 转发到 Gateway 时直接透传为 `{key, value}` 格式（daemon.js:1247）。

但 Gateway 的 `config.set` API 只接受 `{raw: 完整JSON字符串, baseHash: hash}` 格式（参考 daemon.js:671 的正确用法）。`{key, value}` 格式被 Gateway 忽略，配置不会更新。

### 修复方案

**文件**：`mypilot-link/src/daemon.js`

1. 新增 `setNestedValue(obj, keyPath, value)` 工具函数，支持 dot-notation 路径设置值
2. 新增 `handleConfigSetByKey(ws, deviceId, key, value, frameId)` 异步函数：
   - 调用 `gatewayRpc("config.get", {})` 获取当前配置和 hash
   - 用 `setNestedValue` 修改指定 key 的值
   - 调用 `gatewayRpc("config.set", {raw, baseHash})` 写回
   - 将结果返回给 App
3. 修改 `config.set` 帧处理：

```js
} else if (frame.type === "config.set") {
  const key = frame.params?.key || frame.key || "";
  const value = frame.params?.value !== undefined ? frame.params.value : frame.value;
  if (key && value !== undefined) {
    handleConfigSetByKey(ws, deviceIdParam, key, value, frame.id);
  } else if (frame.params?.raw) {
    sendGatewayRpc(ws, deviceIdParam, "config.set", frame.params, frame.id);
  } else {
    ws.send(JSON.stringify({ type: "res", id: frame.id, ok: false, error: { code: "INVALID_PARAMS", message: "config.set requires key+value or raw" } }));
  }
```

---

## 额外 Bug：搜索服务列表不一致

### 根因分析

搜索服务有两个数据源：
1. **主数据源**：daemon 的 `/api/settings/search`（`search-providers.json` 本地存储）
2. **回退数据源**：`/api/config`（Gateway 的 `openclaw.json` skills.entries）

`search-providers.js` 的 `BUILT_IN_PROVIDERS` 硬编码了 8 个服务，但 OpenClaw 实际可能配置了其他服务（如 byted-web-search）。`initSearchProviders` 只迁移内置列表中的服务。

App 端 `fetchSearchSettings` 优先用主数据源，只在 0 个已配置服务时才用回退。如果主数据源有已配置服务但缺少 OpenClaw 实际配置的服务，就会显示不一致。

### 修复方案

**文件**：`mypilot-link/src/search-providers.js`

修改 `initSearchProviders` 迁移逻辑：扫描 skills.entries 中所有带 apiKey 的条目，对不在 `BUILT_IN_PROVIDERS` 列表中的，动态添加为 provider：

```js
// 在 initSearchProviders 的迁移逻辑中，遍历完 BUILT_IN_PROVIDERS 后：
for (const [skillKey, entry] of Object.entries(skills)) {
  if (!entry?.apiKey) continue;
  const builtIn = BUILT_IN_PROVIDERS.find(p => p.skillKey === skillKey);
  if (builtIn) continue; // 已处理
  // 非内置服务，动态添加
  const existing = data.providers.find(p => p.skillKey === skillKey);
  if (!existing) {
    const id = skillKey; // 用 skillKey 作为 id
    const name = entry.name || skillKey;
    const { encryptedApiKey, apiKeyNonce } = encryptApiKey(entry.apiKey, _encryptionKey);
    data.providers.push({
      id, name, icon: "globe", skillKey,
      isBuiltIn: false, isConfigured: true,
      encryptedApiKey, apiKeyNonce, baseUrl: null,
    });
    migrated = true;
  }
}
```

同时修改 `listProvidersSummary` 返回 `skillKey` 字段，方便 App 端匹配。

**文件**：`MyPilotApp/.../SearchSettingsManager` (WebSocketService.swift)

修改 `fetchSearchSettings`：合并主数据源和回退数据源，确保 Gateway 配置的所有搜索服务都显示。

---

## 实施步骤

### Step 1：修复 Bug 2.3（思考内容重复渲染）
- 修改 `ChatStreamHandler.swift` 的 `parseDelta` 方法
- 修改 `WebSocketService.swift` 的 done 帧处理逻辑

### Step 2：修复 Bug 7.2（权限不持久）
- 在 `daemon.js` 中新增 `setNestedValue` 和 `handleConfigSetByKey`
- 修改 `config.set` 帧处理逻辑
- 上传到服务器并重启 daemon

### Step 3：修复搜索服务不一致
- 修改 `search-providers.js` 的 `initSearchProviders` 和 `listProvidersSummary`
- 修改 App 端 `SearchSettingsManager` 的 `fetchSearchSettings`
- 上传到服务器并重启 daemon

### Step 4：验证
- 重新 Build App
- 端到端测试三个 bug 的修复效果

---

## 假设与决策

- **Bug 2.3**：根因是 `isReasoning` 和 `<think>` 标签双重路径导致重复追加，以及 done 帧合并逻辑不够精确
- **Bug 7.2**：确认 Gateway 的 `config.set` 不支持 `{key, value}` 格式，需要在 daemon 层做 read-modify-write 转换
- **搜索服务**：根因是 `BUILT_IN_PROVIDERS` 硬编码列表不包含 OpenClaw 实际配置的所有服务
- 不修改已部署素材（OpenClaw Gateway 配置等）
