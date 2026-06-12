# 修复 agents.create 参数不匹配 Gateway Schema

## 问题

Gateway `agents.create` RPC 的参数 schema（`additionalProperties: false`）：

```js
AgentsCreateParamsSchema = Type.Object({
    name: NonEmptyString,       // 必填 — agentId 从 name 自动生成
    workspace: NonEmptyString,  // 必填
    emoji: Type.Optional(Type.String()),
    avatar: Type.Optional(Type.String())
}, { additionalProperties: false });
```

当前代码传了 `{ id, name, workspace }`，其中 `id` 不在 schema 中 → 报错 `unexpected property 'id'`。

`agents.update` schema（创建后可设 model）：

```js
AgentsUpdateParamsSchema = Type.Object({
    agentId: NonEmptyString,
    name: Type.Optional(NonEmptyString),
    workspace: Type.Optional(NonEmptyString),
    model: Type.Optional(NonEmptyString),
    avatar: Type.Optional(Type.String())
}, { additionalProperties: false });
```

## 修复方案

### 1. AgentRpcClient.createAgent — 移除 id 参数

**文件**: `MyPilotApp/MyPilot/MyPilot/Services/AgentRpcClient.swift` L105-118

```swift
// 改前
func createAgent(id: String, name: String, workspace: String?, onResult: @escaping ([String: Any]?, String?) -> Void) {
    var params: [String: Any] = ["id": id, "name": name]
    if let workspace = workspace, !workspace.isEmpty { params["workspace"] = workspace }

// 改后 — Gateway 从 name 自动生成 agentId，不接受 id
func createAgent(name: String, workspace: String, onResult: @escaping ([String: Any]?, String?) -> Void) {
    let params: [String: Any] = ["name": name, "workspace": workspace]
```

### 2. WebSocketRpcMethods.createAgent — 同步签名

**文件**: `MyPilotApp/MyPilot/MyPilot/Services/WebSocketRpcMethods.swift` L64-68

```swift
// 改前
func createAgent(id: String, name: String, workspace: String?, callback: @escaping ([String: Any]?, String?) -> Void)

// 改后
func createAgent(name: String, workspace: String, callback: @escaping ([String: Any]?, String?) -> Void)
```

### 3. daemon.js — 移除 id 转发

**文件**: `mypilot-link/src/daemon.js` L1622-1625

```js
// 改前
const createParams = { id: frame.params?.id || frame.id || "", name: frame.params?.name || "" };
if (frame.params?.workspace) createParams.workspace = frame.params.workspace;

// 改后 — Gateway 不接受 id，只传 name + workspace
const createParams = { name: frame.params?.name || "", workspace: frame.params?.workspace || "" };
```

### 4. CreateAgentView.createAgent — 适配新流程

**文件**: `MyPilotApp/MyPilot/MyPilot/Features/Settings/AgentsManagementView.swift` L685-703

关键变化：
- 不再传 `id`，Gateway 从 `name` 自动生成 `agentId`
- 创建成功后从 response 中取回实际 `agentId`（`result["agentId"]`）
- 用返回的 `agentId` 执行后续操作（保存文件、设置 model、保存头像）

```swift
// 改前
ws?.createAgent(id: cleanId, name: name, workspace: workspace) { result, error in
    guard let result = result else { ... }
    // 使用 cleanId 作为 agentId ...

// 改后
let workspace = ws?.currentAgent?.workspace?.replacingOccurrences(of: "/main", with: "/\(cleanId)")
    ?? "~/.openclaw/workspace-\(cleanId)"
ws?.createAgent(name: name, workspace: workspace) { result, error in
    guard let result = result else { ... }
    // Gateway 从 name 生成 agentId，从 response 取回
    let agentId = result["agentId"] as? String ?? cleanId
    // 后续使用 agentId ...
```

注意：`finishCreation` 和 `syncAgentFilesFromRemote` 也要用返回的 `agentId` 而非用户输入的 `cleanId`。

### 5. CreateAgentView UI — 调整 Agent ID 输入

当前 UI 让用户输入 "Agent ID"，但 Gateway 不接受自定义 id，agentId 由 name 自动生成。应移除 Agent ID 输入框，改为只输入名称。或者保留 ID 输入但仅用于本地显示（不传给 Gateway）。

**决策**：保留 ID 输入框用于本地显示/头像存储，但传给 Gateway 的只有 `name`。如果用户输入了 ID，则用 ID 作为 name 传给 Gateway（这样 agentId 就会从 ID 生成，与用户预期一致）。

## 涉及文件

| 文件 | 改动 |
|------|------|
| `AgentRpcClient.swift` | 移除 `id` 参数，`workspace` 改为必填 |
| `WebSocketRpcMethods.swift` | 同步签名 |
| `daemon.js` | 移除 `id` 转发，`workspace` 改为必填 |
| `AgentsManagementView.swift` | 适配新签名，从 response 取回 agentId |

## 验证步骤

1. `xcodebuild build` 编译通过
2. `npm run verify` daemon 测试通过
3. 部署 daemon.js 到远程服务器并重启
4. 在 App 中创建 Agent → 验证成功创建
