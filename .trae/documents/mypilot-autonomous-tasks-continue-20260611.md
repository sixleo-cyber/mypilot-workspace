# 剩余待办自主执行计划（续）

## 当前状态

### 已损坏：WebSocketService.swift
- 第 210 行有正确的 `// MARK: - MyPilot Media 指令解析`
- 第 212-583 行是残留的 RPC 方法代码（应该已移到 WebSocketRpcMethods.swift 但删除失败）
- 第 583 行有重复的 `// MARK: - MyPilot Media 指令解析`
- 第 585 行有正确的 `private func parseMessage(_ text: String) {`
- **修复**：删除第 212-584 行（从残留代码开头到第二个 MARK 注释），保留第一个 MARK + 正确的 parseMessage

### 已完成
- WebSocketRpcMethods.swift 已创建，包含全部 20 个 RPC 方法（173 行）
- SearchSettingsManager.swift 已移出为独立文件
- daemon-utils.test.js 已有 35+ 测试

### 待完成自主任务

| # | 任务 | 复杂度 | 说明 |
|---|------|--------|------|
| 1 | 修复 WebSocketService.swift 残留代码 | 小 | 删除 212-584 行残留 RPC 代码 |
| 2 | 消息发送组移出到 WebSocketMessageSending.swift | 中 | 11 个方法（requestHistory ~ stopGeneration） |
| 3 | daemon getMimeType 导出 + 测试 | 小 | export getMimeType + 7 个测试用例 |

### 需人工介入的任务（不执行）

| # | 任务 | 原因 |
|---|------|------|
| P0-3 | 真实端到端回归 | 需启动 App+daemon 人工操作 |
| P2-1 | 附件端到端回归 | 同上 |
| P2-4 | package 仓库归属 | 需产品决策 |
| CI/CD | 流水线 | 需 GitHub repo + Actions |
| 签名 | macOS 签名公证 | 需 Apple Developer 账号 |

---

## 执行步骤

### Task 1: 修复 WebSocketService.swift 残留代码

**文件**：`MyPilotApp/MyPilot/MyPilot/Services/WebSocketService.swift`

**操作**：删除第 212-584 行（残留的 RPC 方法代码 + 重复的 MARK 注释）

**目标结构**（第 208 行之后）：
```swift
    }

    // MARK: - MyPilot Media 指令解析

    private func parseMessage(_ text: String) {
        guard let data = text.data(using: .utf8),
```

**验证**：`xcodebuild build`

### Task 2: 消息发送组移出到 WebSocketMessageSending.swift

**新建文件**：`MyPilotApp/MyPilot/MyPilot/Services/WebSocketMessageSending.swift`

**移出的方法**（从 WebSocketService.swift 第 339-567 行）：
1. `requestHistory(agentId:conversationId:)` — 调用 _sendGatewayRpc
2. `mapHistoryMessages(_:)` — 纯转换
3. `mapHistoryMessage(_:)` — 纯转换，依赖 AttachmentTransport + instance
4. `retryMessage(_:)` — 依赖 messages + send
5. `enqueueOrSend(_:)` — 依赖 isAiResponding + pendingMessages + messages + send
6. `enqueueOrSendMessage(_:)` — 同上
7. `flushPendingMessages()` — 依赖 isAiResponding + pendingMessages + messages + send
8. `send(text:)` — 核心发送，依赖 connectionManager + streamHandler + messages + currentAgentId/ConversationId + reasoningMode/verboseMode + onMessagePersist
9. `sendMessage(_:)` — 带附件发送，同上 + AttachmentTransport
10. `resetChat()` — 重置会话，依赖 connectionManager + streamHandler + messages + streamingContent
11. `stopGeneration()` — 停止生成，依赖 streamHandler + activeProcessingCount + isProcessing/isStreaming + connectionManager + currentAgentId/ConversationId + pendingRpcCallbacks + abortRecoveryTimer

**组织方式**：`extension WebSocketService { ... }`

**验证**：`xcodebuild build && xcodebuild test`

### Task 3: daemon getMimeType 导出 + 测试

**文件 1**：`mypilot-link/src/daemon.js`
- 在 `getMimeType` 函数前加 `export`（第 465 行）

**文件 2**：`mypilot-link/src/daemon-utils.test.js`
- 添加 import `getMimeType`
- 新增 7 个测试：
  1. 常见图片类型（.png → image/png, .jpg → image/jpeg, .gif → image/gif）
  2. 常见文档类型（.pdf → application/pdf, .docx → application/vnd.openxmlformats...）
  3. 常见代码类型（.js → text/javascript, .py → text/x-python, .html → text/html）
  4. 大小写不敏感（.PNG → image/png, .JPG → image/jpeg）
  5. 无扩展名返回默认值（"noext" → application/octet-stream）
  6. 未知扩展名返回默认值（.xyz → application/octet-stream）
  7. 音视频类型（.mp4 → video/mp4, .mp3 → audio/mpeg）

**验证**：`cd mypilot-link && npm run verify`

---

## 预期效果

| 指标 | 变化 |
|------|------|
| WebSocketService.swift 行数 | ~943 → ~590（-37%） |
| 新文件 | WebSocketMessageSending.swift (~230 行) |
| daemon 测试 | 35 → ~42 |
| 不触碰 | parseMessage 路由、连接管理、handler 方法 |

## 验证命令

每个 Task 完成后：
```bash
# Swift
cd /Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot
xcodebuild -project MyPilot.xcodeproj -scheme MyPilot -configuration Debug -destination 'platform=macOS' -skipMacroValidation build

# daemon
cd /Users/liaoxing/Downloads/未命名文件夹/mypilot-link && npm run verify
```
