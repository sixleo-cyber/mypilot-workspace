# P11-2: Agent 创建实时通知

## 概要

当 main-agent 在对话中自动创建子 agent 时，App 端无法即时感知，需要手动点"同步 Agent"才能看到。本计划在 daemon 端实现 `checkForNewAgents()` 轮询检测，发现新 agent 后推送 `agent.created` frame 给 App，App 端监听并自动刷新列表。

## 当前状态

- daemon.js L807 已添加 `checkForNewAgents(pending.appWs, pending.deviceId)` 调用，但函数未定义
- `knownAgentIds` 缓存变量未添加
- App 端 WebSocketService 未处理 `agent.created` frame
- `gatewayRpc()` 内部函数已可用（L843），可直接调用 `agents.list`

## 改动清单

### 1. daemon.js — 添加 knownAgentIds 缓存

**位置**: L52 附近（全局变量区）

```js
const knownAgentIds = new Set();
```

**初始化时机**: Gateway 连接成功后（`gatewayReady = true` 那段，约 L380），调用 `gatewayRpc("agents.list", {})` 填充缓存。

### 2. daemon.js — 实现 checkForNewAgents() 函数

**位置**: `handleGatewayEvent` 函数之后（约 L823 后）

```js
async function checkForNewAgents(appWs, deviceId) {
  try {
    const res = await gatewayRpc("agents.list", {});
    if (!res.ok) return;
    const agents = res.payload?.agents || [];
    const currentIds = new Set(agents.map(a => a.id));
    // 找出新 agent
    const newAgents = agents.filter(a => !knownAgentIds.has(a.id));
    if (newAgents.length > 0) {
      for (const a of newAgents) {
        knownAgentIds.add(a.id);
        log.info(`[agent] new agent detected: ${a.id}`);
        appWs.send(JSON.stringify({
          type: "agent.created",
          agent: { id: a.id, name: a.name || a.id, workspace: a.workspace || "", avatarUrl: a.avatarUrl || a.avatar || "" }
        }));
      }
    }
    // 同步清理已删除的 agent
    for (const id of knownAgentIds) {
      if (!currentIds.has(id)) knownAgentIds.delete(id);
    }
  } catch (err) {
    log.warn(`checkForNewAgents failed: ${err.message}`);
  }
}
```

### 3. daemon.js — Gateway 连接成功后初始化 knownAgentIds

**位置**: L386 `flushMessageQueue()` 之后

```js
// 初始化 knownAgentIds 缓存
try {
  const initRes = await gatewayRpc("agents.list", {});
  if (initRes.ok && initRes.payload?.agents) {
    for (const a of initRes.payload.agents) knownAgentIds.add(a.id);
    log.info(`[agent] knownAgentIds initialized: ${[...knownAgentIds].join(", ")}`);
  }
} catch {}
```

### 4. App 端 WebSocketService.swift — 添加 agent.created frame 处理

**位置**: `parseMessage` 的 switch 中，`case "task.notify"` 之后

```swift
case "agent.created":
    handleAgentCreatedFrame(json)
```

**新方法**:

```swift
private func handleAgentCreatedFrame(_ json: [String: Any]) {
    guard let agentInfo = json["agent"] as? [String: Any],
          let agentId = agentInfo["id"] as? String else { return }
    let name = agentInfo["name"] as? String ?? agentId
    let workspace = agentInfo["workspace"] as? String
    let avatarUrl = agentInfo["avatarUrl"] as? String
    let newAgent = Agent(id: agentId, name: name, workspace: workspace, avatarUrl: avatarUrl)

    mainAsync { [weak self] in
        guard let self = self else { return }
        // 避免重复
        if !self.agents.contains(where: { $0.id == agentId }) {
            self.agents.append(newAgent)
        }
        NotificationCenter.default.post(name: .agentNameDidChange, object: nil)
    }
}
```

## 验证步骤

1. `cd /Users/liaoxing/Downloads/未命名文件夹/mypilot-link && npm run verify`
2. Xcode 编译验证
3. 启动 daemon + App，与 main-agent 对话触发子 agent 创建，观察 App 是否自动刷新
