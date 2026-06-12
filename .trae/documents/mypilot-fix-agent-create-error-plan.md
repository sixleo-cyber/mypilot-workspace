# 修复创建 Agent 失败 — 错误信息丢失 + 无诊断信息

## 问题分析

用户在创建 Agent（ID: coder，名称: 代码专家）时看到 **"创建失败，Gateway 注册失败"**。

### 根因：错误信息在回调链中被丢弃

**完整调用链**：

```
CreateAgentView.createAgent()
  → ws?.createAgent(id:name:model:callback:)    // WebSocketRpcMethods
    → rpcClient?.createAgent(id:name:model:onResult:)  // AgentRpcClient
      → sendRpc("agents.create", params, nil) { response in
          if response["ok"] == true {
              onResult(response["payload"])   ✅ 成功时传 payload
          } else {
              onResult(nil)                   ❌ 失败时传 nil，error 丢失！
          }
      }
```

**AgentRpcClient.swift:108-113** — 当 Gateway 返回 `ok: false` 时：
- `onResult(nil)` 被调用，`response["error"]` 中的错误详情完全丢失
- CreateAgentView 收到 `nil` 后只能显示通用错误 "Gateway 注册失败"

### Daemon 端链路（正常）

daemon.js `handleGatewayResponse` 对 `gateway-rpc` 类型正确转发了 `ok`、`payload`、`error` 字段（L421-431），问题不在 daemon。

## 修复方案

### 1. AgentRpcClient.createAgent — 保留错误信息

**文件**: `MyPilotApp/MyPilot/MyPilot/Services/AgentRpcClient.swift`

将回调类型从 `([String: Any]?) -> Void` 改为携带错误信息的结构：

```swift
// 改前
func createAgent(id: String, name: String, model: String?, onResult: @escaping ([String: Any]?) -> Void)

// 改后 — 用元组传递 (payload?, error?)
func createAgent(id: String, name: String, model: String?, onResult: @escaping ([String: Any]?, String?) -> Void)
```

实现改为：

```swift
func createAgent(id: String, name: String, model: String?, onResult: @escaping ([String: Any]?, String?) -> Void) {
    var params: [String: Any] = ["id": id, "name": name]
    if let model = model, !model.isEmpty { params["model"] = model }
    sendRpc("agents.create", params, nil) { response in
        if response["ok"] as? Bool == true {
            onResult(response["payload"] as? [String: Any], nil)
        } else {
            let errMsg = (response["error"] as? [String: Any])?["message"] as? String
                ?? response["error"] as? String
                ?? "未知错误"
            onResult(nil, errMsg)
        }
    }
}
```

### 2. WebSocketRpcMethods.createAgent — 透传新签名

**文件**: `MyPilotApp/MyPilot/MyPilot/Services/WebSocketRpcMethods.swift`

```swift
// 改前
func createAgent(id: String, name: String, model: String?, callback: @escaping ([String: Any]?) -> Void)

// 改后
func createAgent(id: String, name: String, model: String?, callback: @escaping ([String: Any]?, String?) -> Void)
```

实现同步更新闭包透传。

### 3. CreateAgentView.createAgent — 显示具体错误

**文件**: `MyPilotApp/MyPilot/MyPilot/Features/Settings/AgentsManagementView.swift`

```swift
// 改前
ws?.createAgent(id: cleanId, name: name, model: ...) { result in
    guard let result = result, result["ok"] as? Bool == true else {
        errorMessage = "创建失败，Gateway 注册失败"
        return
    }
}

// 改后
ws?.createAgent(id: cleanId, name: name, model: ...) { result, error in
    guard let result = result else {
        errorMessage = "创建失败：\(error ?? "未知错误")"
        isCreating = false
        return
    }
    // ... 继续后续逻辑
}
```

## 涉及文件

| 文件 | 改动 |
|------|------|
| `AgentRpcClient.swift` L105-115 | 回调签名增加 `String?` error 参数 |
| `WebSocketRpcMethods.swift` L64-68 | 同步更新签名和透传 |
| `AgentsManagementView.swift` L690-696 | 显示 Gateway 返回的具体错误 |

## 验证步骤

1. `xcodebuild build` 编译通过
2. 创建一个新 Agent → 如果 Gateway 仍拒绝，应显示具体原因而非笼统的 "注册失败"
3. 如果 Gateway 正常支持创建，应成功完成流程
