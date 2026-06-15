# MyPilot 项目代码检查计划

## 摘要

对 MyPilot 项目（SwiftUI App + Node.js daemon）进行代码质量检查，识别并修复潜在问题。

## 当前状态分析

### 整体架构
- **Swift App**: macOS SwiftUI 应用，`@Observable` 宏，URLSessionWebSocketTask
- **Node.js Daemon**: HTTP + WS 服务，端口 52378，连接 OpenClaw Gateway
- **版本**: mypilot-link `0.8.0` / clawpilot-app `1.3.7`

### 已发现的问题

#### P0 - 必须修复

1. **`readBody` 无请求体大小限制** — [daemon.js:1346-1353](file:///Users/liaoxing/Downloads/未命名文件夹/开发/mypilot-link/src/daemon.js#L1346-L1353)
   - `readBody` 函数没有限制请求体大小，可能导致内存耗尽（DoS）
   - 修复：添加大小限制（如 10MB），超限时返回 413

2. **`execSync` 阻塞事件循环** — [daemon.js:522-524](file:///Users/liaoxing/Downloads/未命名文件夹/开发/mypilot-link/src/daemon.js#L522-L524) 和 [daemon.js:1644-1646](file:///Users/liaoxing/Downloads/未命名文件夹/开发/mypilot-link/src/daemon.js#L1644-L1646)
   - `scp` 命令使用 `execSync`，最坏情况阻塞 30 秒，期间所有连接挂起
   - 修复：改用 `execFile` + Promise 包装，或设置更短超时 + 警告日志

3. **`handleChatResponse` 中 `msg.ok=false` 错误信息未限制** — [daemon.js:491-513](file:///Users/liaoxing/Downloads/未命名文件夹/开发/mypilot-link/src/daemon.js#L491-L513)
   - 错误信息可能包含敏感内容，直接转发给客户端有泄露风险
   - 修复：截断错误信息，仅转发前 200 字符

#### P1 - 应该修复

4. **Swift 代码中 27 处 `print()` 调试日志** — 分布在多个文件
   - WebSocketChatFrameHandler.swift (5处), WebSocketMessageSending.swift (4处), ConnectionManager.swift (7处), WebSocketSystemFrameHandler.swift (2处), MyPilotApp.swift (2处), 其他 (7处)
   - 生产代码中 `print()` 无过滤，影响性能且无法关闭
   - 修复：统一替换为 `os.Logger` 或条件编译 `#if DEBUG`

5. **CLI 中 `console.log` 用于用户输出是合理的** — [cli.js](file:///Users/liaoxing/Downloads/未命名文件夹/开发/mypilot-link/src/cli.js)
   - CLI 的 `console.log` 是面向终端用户的，不需要改
   - 但 [runtime.js:176](file:///Users/liaoxing/Downloads/未命名文件夹/开发/mypilot-link/src/runtime.js#L176) 和 [scheduler.js:16](file:///Users/liaoxing/Downloads/未命名文件夹/开发/mypilot-link/src/scheduler.js#L16) 的 `console.log` 作为 fallback logger 需要确认是否合理

6. **App 端 `127.0.0.1:52378` 硬编码 fallback** — [WebSocketService.swift:130](file:///Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/WebSocketService.swift#L130), [IMChannelsView.swift:78](file:///Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Settings/IMChannelsView.swift#L78)
   - 作为本地开发 fallback 是合理的，但应提取为常量统一管理
   - 修复：提取为 `AppConstants.defaultServerURL`

7. **Daemon 中 `127.0.0.1` 连接 Gateway** — daemon.js 多处
   - 这是设计如此（Gateway 在同一台机器），合理

#### P2 - 建议改进

8. **`handleGatewayResponse` 中未处理未知 pending type** — [daemon.js:409-500](file:///Users/liaoxing/Downloads/未命名文件夹/开发/mypilot-link/src/daemon.js#L409-L500)
   - 如果 pending.type 不匹配任何已知类型，请求永远不会被清理
   - 修复：添加 default 分支，记录警告并删除 pending

9. **`uncaughtException` 处理不完善** — [daemon.js:2140-2150](file:///Users/liaoxing/Downloads/未命名文件夹/开发/mypilot-link/src/daemon.js#L2140-L2150)
   - 捕获后未确保异步操作完成就退出
   - 修复：添加 graceful shutdown 逻辑

10. **AddInstanceView 配对码占位符** — [AddInstanceView.swift:117](file:///Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Views/AddInstanceView.swift#L117)
    - `TextField("XXXX-XXXX-XXXX", text: $pairingCode)` 占位符格式与实际配对码格式可能不一致
    - 需确认实际配对码格式

## 修改计划

### 第一步：修复 P0 问题（daemon.js）

1. **`readBody` 添加大小限制**
   - 文件: `开发/mypilot-link/src/daemon.js`
   - 在 `readBody` 函数中添加大小检查，超过 10MB 时调用 `res.writeHead(413)` 并返回

2. **`execSync` 改为异步**
   - 文件: `开发/mypilot-link/src/daemon.js`
   - 将 `execSync` 替换为 `execFile` + Promise，避免阻塞事件循环
   - 或至少将超时从 30s 降到 10s 并添加警告

3. **错误信息截断**
   - 文件: `开发/mypilot-link/src/daemon.js`
   - 在 `handleChatResponse` 中截断 `msg.payload?.error` 到 200 字符

### 第二步：修复 P1 问题（Swift print → Logger）

4. **Swift print() 替换为 os.Logger**
   - 文件: 多个 Swift 文件
   - 创建统一的 Logger 实例，替换所有 `print()` 调用
   - 使用 `os.Logger(subsystem: "com.mypilot.app", category: "...")`

5. **提取硬编码 URL 为常量**
   - 文件: WebSocketService.swift, IMChannelsView.swift
   - 提取 `"http://127.0.0.1:52378"` 为 `AppConstants.defaultServerURL`

### 第三步：修复 P2 问题

6. **handleGatewayResponse 添加 default 分支**
   - 文件: `开发/mypilot-link/src/daemon.js`
   - 在 pending.type 匹配链末尾添加 else 分支

7. **uncaughtException graceful shutdown**
   - 文件: `开发/mypilot-link/src/daemon.js`
   - 捕获后记录日志，延迟 1s 后 process.exit(1)

## 假设与决策

- 不修改 `开发/package` 分支的代码（ClawPilot 公共包线）
- CLI 中的 `console.log` 保持不变（面向终端用户输出）
- Daemon 中 `127.0.0.1` 连接 Gateway 保持不变（设计如此）
- 不添加新的依赖包

## 验证步骤

1. `cd 开发/mypilot-link && npm run verify` — 确认 daemon 代码通过检查和测试
2. Xcode 编译 Swift App — 确认无编译错误
3. SSH 到服务器部署更新后的 daemon，验证 `/api/health` 返回 `gatewayConnected: true`
