# MyPilot P8 开发计划：发布准备 + 体验打磨

## Summary

P8 聚焦四个方向：1) Swift 测试补齐（AgentRpcClient、WebSocketRpcMethods）；2) About 页面；3) 版本号规范化；4) 产品体验打磨。

## Current State Analysis

### 已完成基线（P0-P7）
- P0-P7 全部完成，daemon 测试 199 用例，Swift 测试 14 个文件
- 代码无 TODO/FIXME/HACK

### Swift 测试盲区
| 模块 | 有测试 | 缺失 |
|------|--------|------|
| ConnectionManager | ✅ 11 项 | — |
| AppState | ✅ 11 项 | — |
| ChatStreamHandler | ✅ | — |
| AttachmentTransport | ✅ | — |
| SearchSettingsManager | ✅ 10 项 | — |
| ScheduledTaskMapping | ✅ | — |
| AgentRpcClient | ❌ | RPC 方法签名、回调参数解析 |
| WebSocketRpcMethods | ❌ | scheduleListDetailed 3参数、_sendGatewayRpc 超时 |
| APIService | ❌ | HTTP API 调用 |
| ThinkingContentSanitizer | ✅ | — |

### 占位/未完成功能
- 通话设置：PlaceholderSettingsPage "即将推出"
- 订阅管理：SubscriptionView 有 UI 骨架但无功能
- App 无 About 页面和版本号展示

---

## Proposed Changes

### P8-1：Swift 测试补齐

#### P8-1a: AgentRpcClientTests

**文件**: `My PilotTests/MyPilotTests/AgentRpcClientTests.swift`（新建）

**测试场景**:
1. `scheduleList` 回调正确传递 tasks
2. `scheduleListDetailed` 回调正确传递 (success, tasks, crontabTasks)
3. `scheduleCreate` 传递参数并解析响应
4. `scheduleUpdate` 传递 id 和 updates
5. `scheduleDelete` 传递 id
6. `scheduleRun` 传递 id
7. `agentsList` 委托 sendRpc
8. `modelsList` 委托 sendRpc
9. `configGet` 委托 sendRpc
10. `configSet` 委托 sendRpc
11. sendRpc 闭包被正确调用

**实现方式**: Mock sendRpc 闭包，验证方法名、参数、回调行为

#### P8-1b: WebSocketRpcMethodsTests

**文件**: `My PilotTests/MyPilotTests/WebSocketRpcMethodsTests.swift`（新建）

**测试场景**:
1. `scheduleListDetailed` 解析 3 参数回调 (success, tasks, crontabTasks)
2. `scheduleList` 内部调用 scheduleListDetailed，只传 tasks
3. `_sendGatewayRpc` 未连接时返回 NOT_CONNECTED 错误
4. `_sendGatewayRpc` 超时后回调 TIMEOUT 错误
5. `_sendGatewayRpc` 正常发送帧到 connectionManager
6. pendingRpcCallbacks 正确匹配 id

**实现方式**: Mock ConnectionManager（isConnected、send），验证帧格式和回调行为

**验收**: `xcodebuild test` 通过

---

### P8-2：App 版本信息与关于页面

**文件**:
- `MyPilotApp/MyPilot/MyPilot/Features/Settings/AboutView.swift`（新建）
- `MyPilotApp/MyPilot/MyPilot/MyPilotApp.swift` — 添加"关于 MyPilot"菜单项

**About 页面内容**:
1. App 图标 + 名称
2. 版本号（`Bundle.main.infoDictionary?["CFBundleShortVersionString"]`）
3. daemon 信息（从 `/api/info` 获取：packageName、flavor、pid、nodeVersion）
4. 构建号
5. 版权信息 © 2026 MyPilot

**菜单栏修改**:
```swift
CommandGroup(replacing: .about) {
    Button("关于 MyPilot") {
        // 打开 AboutView 窗口
    }
}
```

**设置页底部**: 添加"关于"入口

**验收**: 菜单栏"关于 MyPilot"打开 About 页面，显示完整版本信息

---

### P8-3：版本号规范化

**文件**:
- `MyPilotApp/MyPilot/MyPilot/Info.plist` 或 Xcode 项目 — CFBundleShortVersionString
- `mypilot-link/package.json` — version 字段

**内容**:
- App 版本号设为 `0.8.0`（反映 P0-P7 开发进度）
- mypilot-link 版本号对齐 `0.8.0`
- 构建号格式：`YYYYMMDDNN`（如 `2026061200`）

**验收**: App 关于页面和 `/api/info` 显示一致版本号

---

### P8-4：产品体验打磨

#### P8-4a: 移除通话设置占位页

**文件**: `MyPilotApp/MyPilot/MyPilot/Features/Settings/AdvancedSettingsView.swift`

**内容**: 从设置导航中移除"通话设置"入口，等语音插件就绪后再添加

#### P8-4b: 保留订阅管理预览

**文件**: 无需修改，保留当前 SubscriptionView UI 预览

#### P8-4c: 设置页底部版本号

**文件**: `MyPilotApp/MyPilot/MyPilot/Features/Settings/SettingsView.swift`

**内容**: 设置页底部添加版本号展示（小字灰色文字），点击打开 About 页面

**验收**: 设置页无死胡同，导航清晰

---

## 实施顺序

```
P8-1a (AgentRpcClient 测试) ──┐
P8-1b (WebSocketRpcMethods 测试) ──┤──→ P8-2 (About 页面) ──→ P8-3 (版本号) ──→ P8-4 (体验打磨)
```

P8-1a 和 P8-1b 可并行。P8-2 依赖 P8-1 完成后确保不破坏现有测试。P8-3 和 P8-4 可连续推进。

---

## Assumptions & Decisions

1. 通话设置从导航中移除（减少用户困惑）
2. 订阅管理保留当前 UI 预览
3. 版本号从 `0.8.0` 开始
4. About 页面从 `/api/info` 获取 daemon 信息
5. Swift 测试使用 Mock 闭包，不依赖真实 WebSocket 连接

## Verification

```bash
# App 编译+测试
cd /Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot
xcodebuild -project MyPilot.xcodeproj -scheme MyPilot -configuration Debug -destination 'platform=macOS' -skipMacroValidation build
xcodebuild test -project MyPilot.xcodeproj -scheme MyPilot -destination 'platform=macOS' -skipMacroValidation

# daemon 验证
cd /Users/liaoxing/Downloads/未命名文件夹/mypilot-link
npm run verify
```
