# MyPilot 下一步开发计划

## Summary

P8 阶段仅剩 AboutView 编译错误修复。修复后需全量验证，然后推进 P9 阶段。

## Current State Analysis

### P8 完成情况
| 任务 | 状态 |
|------|------|
| P8-1a: AgentRpcClientTests (14项) | ✅ |
| P8-1b: WebSocketRpcMethodsTests (6项) | ✅ |
| P8-2: About 页面 | ❌ 编译错误 |
| P8-3: 版本号 0.8.0 | ✅ |
| P8-4a: 移除通话设置占位 | ✅ |
| P8-4c: 设置页版本号 | ✅ |

### AboutView 编译错误根因
`AboutView.swift` 第 62 行引用 `appState.diagnostics`，但 `AppState` 类没有 `diagnostics` 属性。`diagnostics` 是 `DiagnosticsCenterView` 的 `@State private var diagnostics: ServerDiagnostics?`，通过 `APIService.fetchDiagnostics()` 获取。

### 修复方案
参照 `DiagnosticsCenterView` 的模式，在 AboutView 中使用 `@State private var diagnostics: ServerDiagnostics?` 自行获取，而非依赖 AppState。

---

## Proposed Changes

### Step 1: 修复 AboutView 编译错误

**文件**: `MyPilotApp/MyPilot/MyPilot/Features/Settings/AboutView.swift`

**改动**:
1. 删除 `@Environment(AppState.self) var appState`
2. 添加 `@State private var diagnostics: ServerDiagnostics?`
3. 添加 `@State private var isLoadingDiagnostics = false`
4. daemon 连接判断改为：通过 `@Environment(AppState.self)` 获取 `currentWebSocket`（保留这个引用，因为需要判断连接状态）
5. 在 `.onAppear` 中通过 `APIService.fetchDiagnostics()` 获取 daemon 信息
6. `daemonInfoGrid` 中使用 `diagnostics` 而非 `appState.diagnostics`

**关键代码模式**（参照 DiagnosticsCenterView）:
```swift
struct AboutView: View {
    @Environment(AppState.self) var appState
    @Environment(\.dismiss) private var dismiss
    @State private var diagnostics: ServerDiagnostics?
    @State private var isLoadingDiagnostics = false

    // ... daemon 连接判断用 appState.currentWebSocket?.isConnected
    // ... daemon 信息用 self.diagnostics

    .onAppear {
        loadDiagnostics()
    }

    private func loadDiagnostics() {
        guard let ws = appState.currentWebSocket, ws.isConnected else { return }
        isLoadingDiagnostics = true
        Task {
            // 参照 DiagnosticsCenterView 的 fetchDiagnostics 逻辑
            if let instance = appState.currentInstance {
                let result = await APIService.shared.fetchDiagnostics(host: instance.host, port: instance.port)
                diagnostics = result
            }
            isLoadingDiagnostics = false
        }
    }
}
```

需要确认 `APIService.fetchDiagnostics` 的签名和 `Instance` 的 `host`/`port` 属性。

### Step 2: 全量验证

```bash
# App 编译
cd /Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot
xcodebuild -project MyPilot.xcodeproj -scheme MyPilot -configuration Debug -destination 'platform=macOS' -skipMacroValidation build

# daemon 验证
cd /Users/liaoxing/Downloads/未命名文件夹/mypilot-link
npm run verify
```

### Step 3: P9 规划（待讨论）

P8 完成后，可推进的方向：

**P9-A: APIService 测试补齐**
- 当前 APIService 无测试覆盖
- Mock URLSession 测试 HTTP API 调用

**P9-B: 附件体验增强**
- 附件过期状态检测（已有基础实现）
- 图片/文档另存为（已有基础实现）
- 拖拽发送附件体验优化

**P9-C: 消息可靠性增强**
- 消息发送失败重试
- 离线消息队列
- 消息去重

**P9-D: UI 一致性收尾**
- iMessage 风格 UI 统一（参照 V10 showcase）
- 深色模式适配完善
- 动画和过渡效果

**P9-E: daemon 远程部署优化**
- 一键部署脚本
- 远程 daemon 版本检查
- 自动更新通知

---

## Assumptions & Decisions

1. AboutView 使用 `@State private var diagnostics` 自行获取，不添加到 AppState（保持 AppState 简洁）
2. 保留 `@Environment(AppState.self)` 仅用于判断 WebSocket 连接状态和获取 Instance 信息
3. P9 方向待用户选择后再细化

## Verification

1. `xcodebuild build` 通过
2. `npm run verify` 通过
3. App 中"关于 MyPilot"菜单打开 About 页面，显示版本号和 daemon 信息
