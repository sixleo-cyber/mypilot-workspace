# 修复创建 Agent 时中文名导致 "main is reserved" 错误

## 问题

用户输入中文名（如 "代码专家"）创建 Agent 时，Gateway 报错 `"main" is reserved`。

**根因**：Gateway `normalizeAgentId(name)` 的逻辑：
1. 非法字符替换为 `-`，去首尾 `-`，截断 64 字符
2. 替换后为空 → 返回 `"main"`
3. 中文名 "代码专家" 全部是非法字符 → 替换后为空 → 返回 `"main"` → 报 "main is reserved"

**关键**：Gateway `agents.create` 的 `name` 参数同时用于生成 `agentId`，所以 `name` 必须是 ASCII 合法 ID。中文显示名需要走本地 `AgentNameOverrides` 覆盖。

## 修复方案

### CreateAgentView.createAgent — name 传 cleanId，中文走本地覆盖

**文件**: `MyPilotApp/MyPilot/MyPilot/Features/Settings/AgentsManagementView.swift` L687-693

```swift
// 改前
let name = agentName.isEmpty ? cleanId : agentName
ws?.createAgent(name: name, workspace: workspace) { result, error in

// 改后 — Gateway name 必须是 ASCII（用于生成 agentId），中文显示名走本地覆盖
let displayName = agentName.isEmpty ? cleanId : agentName
// 传给 Gateway 的 name 用 cleanId（保证 ASCII 合法），确保 agentId 正确生成
ws?.createAgent(name: cleanId, workspace: workspace) { result, error in
```

然后在创建成功后，如果 `displayName != cleanId`，保存到 `AgentNameOverrides`：

```swift
let agentId = result["agentId"] as? String ?? cleanId
// 如果用户输入了中文显示名，保存到本地覆盖
if displayName != cleanId {
    AgentNameOverrides.shared.setName(displayName, for: agentId)
    NotificationCenter.default.post(name: .agentNameDidChange, object: nil, userInfo: ["agentId": agentId])
}
```

同时 `finishCreation` 传入 `displayName` 而非 `name`：

```swift
self.syncAgentFilesFromRemote(agentId: agentId, name: displayName)
```

## 涉及文件

| 文件 | 改动 |
|------|------|
| `AgentsManagementView.swift` | `name` 参数改用 `cleanId`，中文显示名走 `AgentNameOverrides` |

## 验证步骤

1. `xcodebuild build` 编译通过
2. 创建 Agent：ID 输入 "coder"，名称输入 "代码专家" → 应成功创建，侧边栏显示 "代码专家"
