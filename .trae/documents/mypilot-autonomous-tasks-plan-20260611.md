# 剩余待办自主执行计划

## Summary

将剩余待办按自主能力分类，优先执行可自主完成的任务，不触碰需要人工介入的项目。

---

## 一、待办自主能力分类

### 可自主完成（纯代码/测试/脚本，无需人工）

| # | 待办 | 优先级 | 复杂度 | 说明 |
|---|------|--------|--------|------|
| A1 | WebSocketService 继续拆分：RPC 方法组移出 | P3 | 中 | 将 ~15 个 RPC 封装方法（requestAgentsList 到 scheduleRun）移到 AgentRpcClient 或新文件 |
| A2 | WebSocketService 继续拆分：消息发送组移出 | P3 | 中 | 将 send/sendMessage/retry/enqueue/resetChat/stopGeneration 移到独立文件 |
| A3 | daemon 协议边界纯函数测试 | P2 | 小 | 为 daemon.js 中未测试的纯函数（getMimeType、extractThinking）添加测试 |
| A4 | SearchSettingsManager 集成测试增强 | P2 | 小 | 补充 fetchSearchSettings 的 mock server 测试 |
| A5 | 版本号同步检查脚本 | P3 | 小 | 创建脚本检查 mypilot-link/package 版本号一致性 |

### 半自主（AI 做大部分，需人工验证）

| # | 待办 | 优先级 | 说明 |
|---|------|--------|------|
| B1 | 真实端到端回归（P0-3） | P0 | AI 可写测试代码，但需人工启动 App+daemon 验证 |
| B2 | 附件端到端回归（P2-1） | P2 | 同上 |
| C3 | 诊断中心继续迭代 | P2 | AI 可改代码，但需人工验证 UI 交互 |

### 需人工决策/操作

| # | 待办 | 优先级 | 说明 |
|---|------|--------|------|
| C1 | package 仓库归属（P2-4） | P2 | 需决策：独立 repo / subtree / 快照 |
| C2 | CI/CD 流水线 | P2 | 需 GitHub repo + Actions 配置 |
| C3 | macOS 签名公证 | P2 | 需 Apple Developer 账号 + 证书 |
| C4 | 版本与迁移策略（P3-3） | P3 | 需产品决策 |

---

## 二、本次执行计划（仅自主任务）

按收益/风险比排序，执行以下 3 项：

### Task 1: WebSocketService RPC 方法组移出（A1）

**目标**：将 WebSocketService.swift 中 15 个 RPC 封装方法移到独立文件，进一步降低核心文件行数。

**当前状态**：WebSocketService.swift 944 行，其中 RPC 方法组（requestAgentsList ~ scheduleRun）约 125 行（210-338），消息发送组（send/sendMessage/retry/enqueue/resetChat/stopGeneration）约 229 行（340-568）。

**具体步骤**：
1. 新建 `Services/WebSocketRpcMethods.swift`，使用 extension WebSocketService 方式组织
2. 将以下方法从 WebSocketService.swift 移到新文件：
   - `requestAgentsList(retryCount:)`
   - `requestModelsList()`
   - `requestAgentFile(agentId:name:)`
   - `requestAgentFileList(agentId:)`
   - `requestAgentFileContent(agentId:name:callback:)`
   - `saveAgentFile(agentId:name:content:callback:)`
   - `createAgent(id:name:model:callback:)`
   - `updateAgent(id:name:model:callback:)`
   - `deleteAgent(id:callback:)`
   - `getConfig(key:callback:)`
   - `getConfigBatch(keys:callback:)`
   - `setConfig(key:value:callback:)`
   - `scheduleList(callback:)`
   - `scheduleListDetailed(callback:)`
   - `scheduleCreate(params:callback:)`
   - `scheduleUpdate(id:updates:callback:)`
   - `scheduleDelete(id:callback:)`
   - `scheduleRun(id:callback:)`
   - `setAgentModel(modelId:completion:)`
   - `_sendGatewayRpc(method:params:clientReqId:callback:)`
3. 这些方法都只依赖 `sendRpc` 闭包和 `instance` 属性，不需要额外依赖
4. 跑 Swift build + test 验证

### Task 2: WebSocketService 消息发送组移出（A2）

**目标**：将消息发送相关方法移到独立文件。

**具体步骤**：
1. 新建 `Services/WebSocketMessageSending.swift`，使用 extension WebSocketService 方式
2. 将以下方法移到新文件：
   - `requestHistory(agentId:conversationId:)`
   - `mapHistoryMessages(_:)`
   - `mapHistoryMessage(_:)`
   - `retryMessage(_:)`
   - `enqueueOrSend(_:)`
   - `enqueueOrSendMessage(_:)`
   - `flushPendingMessages()`
   - `send(text:)`
   - `sendMessage(_:)`
   - `resetChat()`
   - `stopGeneration()`
3. 跑 Swift build + test 验证

### Task 3: daemon 纯函数测试增强（A3）

**目标**：为 daemon.js 中可独立测试的纯函数补充测试。

**具体步骤**：
1. 在 daemon-utils.test.js 中补充 `getMimeType` 的测试（如果已 export）
2. 如果 `getMimeType` 未 export，在 daemon.js 中 export 它
3. 补充测试场景：
   - 常见文件类型映射（.js→text/javascript, .png→image/png, .pdf→application/pdf 等）
   - 未知扩展名返回默认值
   - 大小写不敏感
4. 跑 `npm run verify` 验证

---

## 三、预期效果

| 指标 | 变化 |
|------|------|
| WebSocketService.swift 行数 | 944 → ~590（-37%） |
| 新文件 | WebSocketRpcMethods.swift (~200 行) + WebSocketMessageSending.swift (~250 行) |
| daemon 测试 | 83 → ~90 |
| 不触碰 | done/error/processing/stream handler（已拆完）、parseMessage 路由、连接管理 |

## Assumptions & Decisions

1. 使用 `extension WebSocketService` 而非新 class，保持对外 API 不变
2. 不改变任何方法签名或行为，纯文件搬迁
3. 不拆 parseMessage 路由和连接管理（风险高、收益低）
4. daemon 的 getMimeType 如果未 export 则先 export 再测试
5. 每完成一个 Task 就跑验证，不批量改

## Verification

每个 Task 完成后：
```bash
# Swift
cd /Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot
xcodebuild -project MyPilot.xcodeproj -scheme MyPilot -configuration Debug -destination 'platform=macOS' -skipMacroValidation build
xcodebuild test -project MyPilot.xcodeproj -scheme MyPilot -destination 'platform=macOS' -skipMacroValidation

# daemon
cd /Users/liaoxing/Downloads/未命名文件夹/mypilot-link && npm run verify
```
