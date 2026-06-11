# 消息可靠性与诊断去重实施计划

## Summary

本轮继续推进已完成 P4-A、P4-B1、P4-B2/B3 之后的稳定性收敛，优先解决两个问题：

1. **消息可靠性语义收敛**：断线期间用户新发消息不再创建失败消息、不进入自动补发队列，而是仅保留输入框草稿并提示用户等待重连；已存在的失败消息继续走手动重试，避免 AI 请求重复执行。
2. **诊断中心去重**：以独立 `DiagnosticsCenterView` 为完整诊断入口，`NetworkSettingsView` 中不再保留一整套重复诊断详情与导出逻辑，只保留简要状态和跳转入口；抽出诊断报告生成逻辑，避免两个页面复制 Markdown 报告模板。

本轮不新增大型功能，不改变 daemon/Gateway 协议，不引入第三方依赖。

## Current State Analysis

### 当前已完成状态

前序阶段已完成并通过验证：

- P4-A：最后消息预览、断线重连补发、网页解析配置联动、旧对话预览回填。
- P4-B1：独立诊断中心页面与设置入口。
- P4-B2/B3：Node verify、Swift 测试目录收敛、ChatStreamHandler 测试扩展、ThinkingContentSanitizer 抽取与测试、DiagnosticsCenterView 独立文件拆分。

### 消息发送与断线处理现状

关键文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Views/ChatView.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Views/InputBarView.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/WebSocketService.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/ConnectionManager.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Models/Message.swift`

现状：

1. `ChatView` 在 `InputBarView` 的 `onSend` 回调中直接调用 `wsService.sendMessage(msg)`。
2. `InputBarView` 接收 `isConnected` 参数，但当前发送按钮的禁用逻辑主要由文本/附件是否为空决定，未把连接状态作为禁用条件。
3. `WebSocketService.sendMessage(_ msg:)` 会先把用户消息 append 到 `messages`，然后如果 `connectionManager.isConnected == false`，再把该消息标记为 `.failed`。
4. `WebSocketService.sendMessage(text:attachments:)` 也存在连接失败后把刚创建消息标记 `.failed` 的逻辑。
5. `ConnectionManager.disconnect()` 会过滤掉 `chat.send` 帧，只保留非聊天帧待重连补发：这是为了避免 AI 请求重复执行。
6. 重连收到 `hello` 后会 `flushPendingQueue()` 并把 queued 消息标记 failed，依赖用户手动重试。

用户本轮已确认的新语义：

- 断线期间用户新发消息采用 **仅草稿保留**。
- 也就是说：用户点击发送时，如果 WebSocket 未连接，不创建 `Message`，不写历史，不进入 pending queue，不自动补发；输入框文本和附件保持原样，并显示连接提示。
- 已经存在的 `.failed` 消息仍保留手动重试能力。

### 诊断实现现状

关键文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Settings/DiagnosticsCenterView.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Settings/NetworkSettingsView.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Settings/SettingsView.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/APIService.swift`

现状：

1. `DiagnosticsCenterView` 是完整诊断页面，展示连接、Gateway、目录、日志，并支持导出诊断包。
2. `NetworkSettingsView` 内仍有完整 `diagnosticsSection`，包含大量和 `DiagnosticsCenterView` 重复的字段展示、刷新逻辑、导出逻辑。
3. `NetworkSettingsView` 和 `DiagnosticsCenterView` 各自有一份 `exportDiagnostics(_:)` Markdown 模板，格式略有差异。
4. `ServerDiagnostics` 数据模型目前位于 `NetworkSettingsView.swift` 后半段，虽然 `DiagnosticsCenterView` 可直接使用，但模型位置不理想。

## Proposed Changes

### 1. 消息可靠性：断线仅保留草稿

#### 1.1 调整 `InputBarView` 的发送行为

文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Views/InputBarView.swift`

改动：

1. `sendDisabled` 增加连接判断：当 `isConnected == false` 时，发送按钮禁用。
2. 发送按钮图标颜色在断线时使用弱化色，避免误导用户。
3. `sendMessage()` 中增加连接 guard：如果断线，设置本地 `uploadError` 或提示文案，不清空 `text`、不清空 `attachments`、不调用 `onSend(msg)`。
4. 如果有现有快捷键提交逻辑，也必须复用同一个 `sendMessage()` guard，确保键盘回车不会绕过按钮禁用。

成功标准：

- 断线时点击发送不会新增消息气泡。
- 断线时输入框内容和附件仍保留。
- 重连后用户可以再次点击发送。

#### 1.2 在 `ChatView` 中保留断线横幅，明确提示草稿保留

文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Views/ChatView.swift`

改动：

1. 现有 `connectionBanner` 继续显示。
2. 文案建议从“连接已断开”扩展为“连接已断开，当前输入会保留为草稿，重连后再发送”。
3. 保留“重新连接”按钮。

成功标准：

- 用户明确知道断线时不能发送，但输入不会丢。

#### 1.3 保持 `WebSocketService` 保守失败语义

文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/WebSocketService.swift`

改动策略：

1. 不移除 `sendMessage` 内的连接 guard，因为它仍是服务层防线。
2. 可将断线时 append 后再 failed 的逻辑改为更安全的“连接失败则直接返回，不 append 新消息”，但需谨慎：如果其它调用方绕过 `InputBarView`，也应符合“断线仅草稿保留”的语义。
3. 推荐统一：
   - `sendMessage(_ msg:)` 在 `connectionManager.isConnected == false` 时直接 `return`，不 append。
   - `sendMessage(text:attachments:)` 在 `connectionManager.isConnected == false` 时直接 `return`，不创建 `Message`。
   - 保留 `disconnect()` 中对已有 `.sending/.queued/.running` 用户消息标记 `.failed`，因为这些是断线前已创建的消息。
4. `retryMessage(_:)` 仍然只处理已有失败消息；如果未连接，重试应保持 failed 或直接不动并提示。

成功标准：

- 断线前已经发出的未完成消息断线后仍会变 failed。
- 断线后新发送请求不会创建 failed 消息。
- `.failed` 消息手动重试能力不被破坏。

#### 1.4 补 Swift 测试

候选文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/My PilotTests/MyPilotTests/WebSocketServiceReliabilityTests.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/My PilotTests/MyPilotTests/ConnectionManagerTests.swift`

实施策略：

1. 优先补服务层测试，不做 UI snapshot。
2. 如果 `WebSocketService` 能在测试中直接实例化，则测试：
   - 未连接时 `sendMessage(Message(...))` 不 append 消息。
   - 未连接时 `sendMessage(text:attachments:)` 不 append 消息。
3. 如果服务层因环境依赖难以测，至少补 `ConnectionManager` 纯逻辑测试：
   - `disconnect()` 后 `pendingSendQueue` 保留非 `chat.send` 帧。
   - `disconnect()` 后 `chat.send` 帧被过滤。
4. 如果 `pendingSendQueue` 为 private 且不可测，不为测试强行过度暴露；可以增加 internal 只读 snapshot 或小型 helper，但要避免破坏封装。

### 2. 诊断中心去重

#### 2.1 抽出诊断报告生成器

新增文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Settings/DiagnosticsReportBuilder.swift`

改动：

1. 新增纯函数/类型，例如：
   - `enum DiagnosticsReportBuilder`
   - `static func markdown(from diag: ServerDiagnostics, appInfo: DiagnosticsAppInfo) -> String`
2. `DiagnosticsAppInfo` 包含：
   - `serverURL: String`
   - `webSocketConnected: Bool`
   - `currentAgentId: String`
3. `DiagnosticsCenterView.exportDiagnostics(_:)` 改为调用公共 builder。
4. `NetworkSettingsView` 如仍需要导出，则也调用公共 builder；如果去掉导出按钮，则无需保留私有导出模板。

成功标准：

- Markdown 诊断报告模板只有一份。
- 导出内容不包含 token、配对码、API key 等敏感信息。

#### 2.2 网络设置页只保留简要诊断入口

文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Settings/NetworkSettingsView.swift`

改动：

1. 删除或大幅简化 `diagnosticsSection` 中重复的详细字段、最近异常、最近日志、导出诊断包按钮。
2. 保留一个“服务诊断”简要 section：
   - 当前连接质量。
   - Gateway 是否连接。
   - 最近刷新状态或错误摘要。
   - “打开诊断中心” NavigationLink。
   - 可保留小刷新按钮，但不再显示完整日志和报告导出。
3. 删除 `NetworkSettingsView` 私有 `exportDiagnostics(_:)` 模板，避免重复。
4. 如果 `NetworkSettingsView` 仍保留 `serverDiagnostics` 和 `refreshDiagnostics()` 用于简要状态，可以继续使用；否则可完全移除相关 state 并仅提供跳转入口。

推荐方案：

- 保留 `serverDiagnostics` 与 `refreshDiagnostics()`，用于网络页顶部简要健康状态。
- 详细日志和导出只放在 `DiagnosticsCenterView`。

成功标准：

- 设置 → 网络 页面不再重复展示完整诊断中心。
- 设置 → 诊断中心 仍可展示完整诊断并导出。

#### 2.3 ServerDiagnostics 模型位置评估

当前位置：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Settings/NetworkSettingsView.swift`

计划：

1. 如果只是小改，可以暂时保留模型位置，避免牵动过多文件。
2. 如果 `DiagnosticsReportBuilder` 需要更清晰依赖，可将 `ServerDiagnostics` 移到新文件：
   - `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/ServerDiagnostics.swift`
3. 本轮推荐移动到 `Services/ServerDiagnostics.swift`，因为 `APIService`、`DiagnosticsCenterView`、`NetworkSettingsView` 都依赖它，放在具体 View 文件中不合理。

成功标准：

- `ServerDiagnostics` 不再绑在网络设置页面文件中。
- APIService 解码逻辑不变。

#### 2.4 补诊断报告生成测试

文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/My PilotTests/MyPilotTests/DiagnosticsReportBuilderTests.swift`

测试：

1. 报告包含版本、Gateway 状态、目录状态、最近异常、App 信息。
2. 报告不包含敏感字段样式：`token`、`accessToken`、`refreshToken`、`connectToken`、`apiKey`、`pairingCode`。
3. 空日志、空异常时输出“无”或“无可用日志”。

### 3. 验证与回归

#### 3.1 Node 验证

```bash
cd /Users/liaoxing/Downloads/未命名文件夹/mypilot-link
npm run verify
```

预期：

- 仍然通过。

#### 3.2 Swift 构建与测试

```bash
cd /Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot
xcodebuild -project MyPilot.xcodeproj -scheme MyPilot -configuration Debug -destination 'platform=macOS' -skipMacroValidation build
```

```bash
cd /Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot
xcodebuild test -project MyPilot.xcodeproj -scheme MyPilot -destination 'platform=macOS' -skipMacroValidation
```

预期：

- Build succeeded。
- Test succeeded。

#### 3.3 人工回归

1. 正常连接时发送消息：消息正常创建、发送、流式回复。
2. 断开连接后在输入框输入文本并点击发送：
   - 消息不出现在消息列表。
   - 输入框文本仍保留。
   - 附件仍保留。
   - 页面有断线提示。
3. 点击重新连接后再发送：消息正常发送。
4. 断线前处于 `.sending/.running` 的消息断线后变为 failed，可手动重试。
5. 进入设置 → 网络：只看到简要诊断/跳转，不再看到完整日志和导出报告。
6. 进入设置 → 诊断中心：完整诊断展示和导出仍可用。
7. 导出的诊断报告不包含 token、API key、配对码等敏感信息。

## Assumptions & Decisions

1. 用户已确认本轮优先“消息可靠性”。
2. 用户已确认断线期间新发消息采用“仅草稿保留”。
3. 用户已确认诊断去重纳入本轮。
4. 不自动补发 `chat.send`，避免 AI 重复执行。
5. 非聊天帧仍可沿用现有 `ConnectionManager.pendingSendQueue` 重连补发逻辑。
6. 不修改 daemon/Gateway 协议。
7. 不修改已部署代码素材。
8. 不引入新依赖。
9. 不提交 git commit，除非用户明确要求。

## Out of Scope

本轮不做：

1. 定时任务端到端验证。
2. 通话设置和订阅管理占位页产品化。
3. package 与 mypilot-link 双线部署边界治理。
4. UI snapshot 测试。
5. 自动重试 AI 请求。
6. 大规模重构 WebSocketService。 
