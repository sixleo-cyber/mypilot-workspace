# 网络设置页面开发计划

## Summary

实现完整的网络设置页面，包含 PRD 3.2 节定义的 5 大模块：隐私模式、记忆读取、搜索及网页解析、执行权限配置、Gateway 设置。同时实现 `config.get`/`config.set` RPC 通道，使设置可读写 Gateway 配置。

## Current State Analysis

- `NetworkSettingsView` 当前是占位页面，仅显示"即将推出"提示
- `config.get`/`config.set` RPC 在开发计划中已定义，但 daemon 和 App 端均未实现
- daemon.js 中已有 `sendGatewayRpc` 通用转发机制，新增 RPC 只需添加 frame.type 处理
- WebSocketService.swift 中已有 `_sendGatewayRpc` 通用方法，新增 RPC 只需添加封装方法
- App 端无 `@AppStorage` 使用先例，仅 AppState.swift 用 UserDefaults 存储 instances
- GatewayClient.swift 有 `statsGet`/`statsPost`/`exec` 通用方法可参考

## Proposed Changes

### 1. Daemon 端添加 config.get / config.set 转发

**文件**: `mypilot-link/src/daemon.js`

在 `handleAppFrame` 中添加两个 frame.type 处理器：

```javascript
} else if (frame.type === "config.get") {
    sendGatewayRpc(ws, deviceIdParam, "config.get", { key: frame.params?.key || frame.key || "" }, frame.id);
} else if (frame.type === "config.set") {
    sendGatewayRpc(ws, deviceIdParam, "config.set", { key: frame.params?.key || frame.key || "", value: frame.params?.value || frame.value }, frame.id);
```

### 2. WebSocketService 添加 config RPC 方法

**文件**: `MyPilot/MyPilot/Services/WebSocketService.swift`

新增两个方法：

```swift
func getConfig(key: String, callback: @escaping ([String: Any]?) -> Void) {
    _sendGatewayRpc(method: "config.get", params: ["key": key]) { response in
        if response["ok"] as? Bool == true,
           let payload = response["payload"] as? [String: Any] {
            callback(payload)
        } else {
            callback(nil)
        }
    }
}

func setConfig(key: String, value: Any, callback: @escaping (Bool) -> Void) {
    _sendGatewayRpc(method: "config.set", params: ["key": key, "value": value]) { response in
        callback(response["ok"] as? Bool == true)
    }
}
```

### 3. 创建网络设置页面

**文件**: `MyPilot/MyPilot/Features/Settings/NetworkSettingsView.swift`（替换占位页面）

完整实现 PRD 3.2 节的 5 大模块：

#### A. 隐私模式
- Toggle 开关
- key: `privacyMode`

#### B. 记忆读取
- 待导入记录数（只读显示）
- 日志快照列表（只读显示）
- 隐私记忆读取 Toggle
- 历史记忆解析 Toggle
- 更新策略 Picker：每次一次/按需/每6小时
- 读取范围 Picker：当前活跃/本周所有
- keys: `memory.privacyRead`, `memory.historyParse`, `memory.updateStrategy`, `memory.readScope`

#### C. 搜索及网页解析
- OpenClaw 网页解析 Toggle + 自动导入
- 服务商配置列表（7 个服务商，每个显示名称 + 状态 + API Key 输入框）
- keys: `search.webParsing`, `search.providers.*`

#### D. 执行权限配置
- 执行范围 Picker（5 选项）
- Exec 执行方案 Picker（5 选项）
- 批准执行指令 Picker（3 选项）
- 执行记录追踪 Picker（4 选项）
- Gateway 主机授权 4 个 Toggle
- keys: `exec.scope`, `exec.scheme`, `exec.approval`, `exec.tracking`, `gateway.privilegedManual`, `gateway.privilegedRead`, `gateway.smartExecApproval`, `gateway.codeWriteExport`

#### E. Gateway 设置
- 连接状态（只读，从 WebSocketService 获取）
- 连接名 + ID（只读）
- Relay 地址（只读）
- 本地 IP（只读）

### 4. 数据流设计

**加载流程**：
1. 页面 onAppear → 调用 `config.get` 获取所有配置项
2. 解析返回的 payload，填充各 Toggle/Picker 的 @State 值
3. 如果 config.get 失败（Gateway 不支持），使用 @AppStorage 本地缓存值

**保存流程**：
1. Toggle/Picker 值变化 → 即时调用 `config.set` 写入 Gateway
2. 同时写入 @AppStorage 作为本地缓存
3. 如果 config.set 失败，显示错误提示，回滚 UI 值

**双重存储策略**：
- Gateway config 是权威数据源（在线时）
- @AppStorage 是本地缓存（离线时或 Gateway 不支持时）
- 每次加载时优先从 Gateway 读取，失败则回退到本地缓存

### 5. PlaceholderSettingsPages.swift 更新

移除 `NetworkSettingsView` 的占位定义（因为已被完整实现替换），保留其他 3 个占位页面。

## 文件清单

| 操作 | 文件路径 |
|------|---------|
| 修改 | `mypilot-link/src/daemon.js` — 添加 config.get/config.set 转发 |
| 修改 | `MyPilot/MyPilot/Services/WebSocketService.swift` — 添加 getConfig/setConfig 方法 |
| 替换 | `MyPilot/MyPilot/Features/Settings/NetworkSettingsView.swift` — 从占位改为完整实现 |
| 修改 | `MyPilot/MyPilot/Features/Settings/PlaceholderSettingsPages.swift` — 移除 NetworkSettingsView 占位 |

## Assumptions & Decisions

1. **config.get 返回格式**：假设 `config.get` 返回 `{ "value": <any> }`，需要实际测试确认
2. **config.set 参数格式**：假设 `config.set` 接受 `{ "key": string, "value": any }`
3. **双重存储**：@AppStorage 作为本地缓存兜底，确保离线也能正常显示和修改
4. **即时保存**：Toggle/Picker 变化时即时调用 config.set，不使用"保存按钮"
5. **Gateway 设置区只读**：连接状态、Relay 地址、本地 IP 从 WebSocketService 实时获取，不可编辑
6. **搜索服务商 API Key**：在列表中直接显示 SecureField 输入框，输入后即时保存

## Verification Steps

1. 打开设置 → 网络设置，5 个 Section 正确显示
2. 隐私模式 Toggle 切换后，config.set 调用成功
3. 记忆读取各 Picker 切换后，值正确保存
4. 搜索服务商 API Key 输入后，值正确保存
5. 执行权限各 Picker/Toggle 切换后，值正确保存
6. Gateway 设置区显示当前连接状态
7. 断开 Gateway 后，页面仍能正常显示（使用本地缓存）
8. 重新连接后，页面从 Gateway 刷新最新配置
9. 构建无错误
