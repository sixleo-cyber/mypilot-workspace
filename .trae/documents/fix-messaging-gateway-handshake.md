# 修复消息发送功能 - Gateway 握手问题

## 问题总结

从实现定时任务功能开始，App 端发消息没反应、模型选择卡住。根本原因是 **daemon 与 Gateway 的 WebSocket 连接不稳定**，导致消息无法转发。

## 根因分析

### 发现1：Gateway 需要 `connect.challenge` → `connect` 握手

Gateway 在 WebSocket 连接建立后，会发送 `connect.challenge` 事件：
```json
{"type":"event","event":"connect.challenge","payload":{"nonce":"...","ts":...}}
```

客户端必须在超时时间内（约几秒）回复 `connect` 请求：
```json
{"type":"req","method":"connect","id":"uuid","params":{...}}
```

**当前 daemon 完全没有处理这个握手**，只是把 challenge 消息转发给 App，导致 Gateway 超时后关闭连接。这就是 daemon 日志中反复出现 `Gateway connection closed, will retry...` 的原因。

### 发现2：Gateway 要求设备身份认证才能获得 operator 权限

即使完成了握手，如果不提供设备身份（device identity），Gateway 会清除所有 operator scope，导致 `agents.list`、`chat.send` 等方法都返回 "missing scope" 错误。

测试结果：
- 无设备身份 → `agents.list` 返回 "missing scope: operator.read"
- 无设备身份 → `chat.send` 返回 "missing scope: operator.write"
- 有设备身份但签名无效 → "device signature invalid"
- CLI 模式 + auth token → 连接成功但 scope 被清除

### 发现3：daemon 当前代码与原始备份的差异

当前 `/root/mypilot-link/src/daemon.js` 相比原始 `/opt/mypilot-link/src/daemon.js`：
1. 新增了 `import fs from "node:fs"` 和 `import path from "node:path"`
2. `ws.on("message")` 处理器从简单转发改为 JSON 解析 + agents.list 拦截
3. 新增了 `handleAgentsList` 函数（从文件系统读取 agents 目录）
4. 转发时使用 `text` 变量而非 `data.toString()`

### 发现4：App 端 WebSocketService.swift 状态正常

回滚后 `parseMessage` 的 switch case 完整：`hello`, `chat.history`, `gateway-rpc`, `agent.model.set`, `processing`, `stream`, `done`, `error`, `gateway.http`，以及 `default: break`。代码逻辑正确。

### 发现5：App 端协议格式不匹配

App 使用 `{type: "methodName", id: "uuid", params: {...}}` 格式发送 RPC 请求，但 Gateway 期望的是 `{type: "req", method: "methodName", id: "uuid", params: {...}}` 格式。这意味着即使 Gateway 连接稳定，App 的 RPC 调用也无法被 Gateway 正确识别。

## 修复方案

### 核心思路

在 daemon 中实现完整的 Gateway 握手和协议转换，使 daemon 成为 App 和 Gateway 之间的智能代理：

1. **daemon 处理 Gateway 握手**：收到 `connect.challenge` 后，使用设备密钥签名并发送 `connect` 请求
2. **daemon 进行协议转换**：将 App 的旧格式 `{type: "method", id, params}` 转换为 Gateway 的 `req/res` 格式
3. **daemon 拦截 agents.list**：继续从文件系统读取（因为 Gateway 对 device 角色不响应 agents.list）
4. **daemon 转发 Gateway 响应**：将 Gateway 的 `res` 格式转换回 App 期望的 `gateway-rpc` 格式

### 具体修改

#### 文件1：`/root/mypilot-link/src/daemon.js`（远程服务器）

**修改 `setupGatewayConnection` 函数**：

1. 在 `gatewayWs.on("open")` 中，不再只打印日志，而是等待 challenge
2. 在 `gatewayWs.on("message")` 中：
   - 处理 `connect.challenge` 事件 → 发送 `connect` 请求（含设备身份签名）
   - 处理 `connect` 响应 → 标记握手完成
   - 处理其他 `res` 响应 → 转换为 `gateway-rpc` 格式转发给 App
   - 处理 `event` 事件 → 转发给 App（stream/done/processing 等）

**修改 `setupServers` 中的 `ws.on("message")` 处理器**：

1. 拦截 `agents.list` → 从文件系统读取（保留现有逻辑）
2. 将 App 的旧格式 `{type: "method", id, params}` 转换为 `{type: "req", method: "method", id, params}` 发送给 Gateway
3. 将 `chat.send` 格式从 App 的 `{type: "chat.send", content, agentId, conversationId, ...}` 转换为 Gateway 的 `{type: "req", method: "chat.send", id, params: {agentId, conversationId, content}}`

**新增 `handleGatewayHandshake` 函数**：

```javascript
async function handleGatewayHandshake(nonce) {
  const config = detectOpenClawConfig();
  const deviceIdentity = await buildSignedGatewayDeviceIdentity({
    clientId: "gateway-client",
    clientMode: "backend",
    role: "operator",
    scopes: ["operator.admin", "operator.read", "operator.write", "operator.approvals", "operator.pairing"],
    token: config.token,
    nonce: nonce,
    platform: "node",
    deviceFamily: "server"
  });

  const connectReq = {
    type: "req",
    method: "connect",
    id: crypto.randomUUID(),
    params: {
      minProtocol: 3,
      maxProtocol: 4,
      client: {
        id: "gateway-client",
        version: LINK_VERSION,
        platform: "node",
        mode: "backend"
      },
      role: "operator",
      scopes: ["operator.admin", "operator.read", "operator.write", "operator.approvals", "operator.pairing"],
      caps: ["tool-events", "media"],
      device: deviceIdentity
    }
  };

  gatewayWs.send(JSON.stringify(connectReq));
}
```

**新增协议转换逻辑**：

Gateway → App 的响应转换：
- `{type: "res", id, ok: true, payload}` → `{type: "gateway-rpc", id, ok: true, payload}`
- `{type: "res", id, ok: false, error}` → `{type: "gateway-rpc", id, ok: false, payload: {error}}`
- `{type: "event", event: "chat", ...}` → 直接转发（App 已有处理 stream/done/processing/error 的逻辑）

App → Gateway 的请求转换：
- `{type: "agents.list", id, params}` → 拦截，从文件系统读取
- `{type: "models.list", id, params}` → `{type: "req", method: "models.list", id, params}`
- `{type: "chat.send", content, agentId, conversationId, id, ...}` → `{type: "req", method: "chat.send", id, params: {agentId, conversationId, content}}`
- `{type: "chat.reset", agentId, conversationId, id}` → `{type: "req", method: "chat.reset", id, params: {agentId, conversationId}}`
- `{type: "agent.model.set", agentId, modelId, id}` → `{type: "req", method: "agent.model.set", id, params: {agentId, modelId}}`
- 其他 RPC → `{type: "req", method: type, id, params}`

#### 文件2：`/Users/.../WebSocketService.swift`（本地 App）

**无需修改**。App 端代码逻辑正确，问题完全在 daemon 端。

## 验证步骤

1. 修改 daemon.js 后重启 daemon
2. 检查 daemon 日志确认 Gateway 握手成功（不再反复出现 `Gateway connection closed`）
3. 在 App 端测试：
   - 左侧栏 agents 列表正常显示
   - 发送消息能收到 AI 回复
   - 模型选择正常工作
   - 历史记录正常加载

## 风险和注意事项

1. **设备签名**：daemon 已有设备密钥对（在 credentials.json 中），但签名可能因格式问题被 Gateway 拒绝。需要测试 `buildSignedGatewayDeviceIdentity` 函数的输出是否被 Gateway 接受。
2. **协议版本**：Gateway 使用 protocol 3，需要确保 minProtocol/maxProtocol 设置正确。
3. **scope 清除**：如果设备身份验证失败，Gateway 会清除所有 scope，导致所有 RPC 方法不可用。需要确保设备身份验证成功。
4. **不修改已部署素材**：按照用户规则，不修改已部署代码的素材文件。
