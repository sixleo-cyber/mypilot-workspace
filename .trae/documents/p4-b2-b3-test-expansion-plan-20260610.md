# P4-B2/B3 测试扩展与诊断中心整理计划

## Summary

本轮优先推进 P4-B2/B3 测试扩展，目标是把已经完成的 P4-A 与 P4-B1 功能纳入更稳定的回归保护：

1. P4-B2：完善 `mypilot-link` Node 侧验证链路，以 `npm run verify` 作为后端最小回归门禁。
2. P4-B3：收敛 Swift 测试目录到 Xcode target 实际收录的 `My PilotTests/`，补关键纯逻辑测试。
3. 后续整理：将已实现的 `DiagnosticsCenterView` 从 `PlaceholderSettingsPages.swift` 拆到独立文件，降低设置页占位文件膨胀风险。

本轮不再重复实现 P4-A 功能，也不新增大功能；只做测试扩展、测试目录收敛和诊断中心文件边界整理。

## Current State Analysis

### 已完成并验证的功能状态

- P4-A 已通过人工测试：
  - 最后消息预览。
  - 断线重连补发。
  - 网页解析配置联动。
  - 旧对话 `lastMessagePreview` 回填。
- P4-B1 已通过人工测试：
  - 设置页已有“诊断中心”入口。
  - 当前实现位于 `MyPilotApp/MyPilot/MyPilot/Features/Settings/PlaceholderSettingsPages.swift` 中的 `DiagnosticsCenterView`。
  - 诊断读取复用 `APIService.fetchDiagnostics(serverURL:)`。

### Node 测试现状

`/Users/liaoxing/Downloads/未命名文件夹/mypilot-link/package.json` 已有：

- `check`: 对 `src/*.js` 运行 `node --check`。
- `test`: `node --test src/*.test.js`。
- `verify`: `npm run check && npm test && npm run pack:dry-run`。

当前已有测试文件：

- `/Users/liaoxing/Downloads/未命名文件夹/mypilot-link/src/connect-token.test.js`
- `/Users/liaoxing/Downloads/未命名文件夹/mypilot-link/src/device-identity.test.js`
- `/Users/liaoxing/Downloads/未命名文件夹/mypilot-link/src/daemon-utils.test.js`
- `/Users/liaoxing/Downloads/未命名文件夹/mypilot-link/src/scheduler.test.js`
- `/Users/liaoxing/Downloads/未命名文件夹/mypilot-link/src/search-providers.test.js`

已覆盖核心工具函数、定时任务、connect token、设备签名、搜索 provider 加密等。下一步重点不是大规模重写，而是补回归场景：配置批量读取、网页解析配置默认值/写入、诊断日志脱敏或 `/api/logs` 基础解析可测逻辑。

### Swift 测试现状

Xcode 工程 `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot.xcodeproj/project.pbxproj` 中 test target 名为 `My PilotTests`，并通过 `PBXFileSystemSynchronizedRootGroup` 收录目录：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/My PilotTests/`

当前存在重复测试目录：

- 目标目录：`/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/My PilotTests/`
- 重复遗留目录：`/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilotTests/`

两套目录内测试内容存在差异，其中遗留目录的 `ChatStreamHandlerTests.swift` 仍包含对 `private(set)` 属性 `isAborted` 的直接赋值，不应继续作为新增测试位置。

当前 target 目录中已有：

- `My PilotTests/MyPilotTests/ChatStreamHandlerTests.swift`
- `My PilotTests/MyPilotTests/AttachmentTransportTests.swift`
- `My PilotTests/MyPilotTests/MessageAttachmentTests.swift`
- `My PilotTests/My_PilotTests.swift`

生产代码关键点：

- `ChatStreamHandler.swift` 中 `stripThinkTags(from:)` 是 private，应通过 `parseDelta` 间接测试。
- `MessageBubbleView.swift` 中 `isLikelyCorruptThinking(_:)` 是 `fileprivate`，测试 target 不能直接调用；应抽到可测试的纯逻辑模块，而不是从 View 文件直接暴露。
- `AppState.swift` 现在包含 `updateConversation`、`ensureConversationExists`、旧对话 preview 回填逻辑，适合补纯逻辑回归测试，但它依赖真实 `Application Support` 目录，测试时需谨慎避免污染用户数据。

### 诊断中心现状

`DiagnosticsCenterView` 当前在：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Settings/PlaceholderSettingsPages.swift`

设置入口在：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Settings/SettingsView.swift`

计划中后续将其拆到：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Settings/DiagnosticsCenterView.swift`

不改 UI 行为，只做文件边界整理。

## Proposed Changes

### 1. P4-B2：Node 测试扩展与 verify 门禁

#### 1.1 运行并修复 `npm run verify`

文件：

- `/Users/liaoxing/Downloads/未命名文件夹/mypilot-link/package.json`
- `/Users/liaoxing/Downloads/未命名文件夹/mypilot-link/src/*.test.js`

步骤：

1. 运行 `npm run verify`。
2. 如果 `node --check`、`npm test` 或 `npm pack --dry-run` 失败，只修复与当前源码/测试相关的问题。
3. 不引入新测试依赖，继续使用 Node 内置 `node:test` 与 `node:assert/strict`。

验收：

- `npm run verify` 通过。

#### 1.2 补充 daemon 配置与网页解析配置测试

文件：

- `/Users/liaoxing/Downloads/未命名文件夹/mypilot-link/src/daemon-utils.test.js`
- `/Users/liaoxing/Downloads/未命名文件夹/mypilot-link/src/search-providers.test.js`
- `/Users/liaoxing/Downloads/未命名文件夹/mypilot-link/src/search-providers.js`

计划测试：

1. `setNestedValue/getNestedValue` 增加覆盖：
   - `tools.web.fetch.maxBytes`
   - `tools.web.fetch.timeout`
   - 同一路径重复写入覆盖旧值。
2. `search-providers.test.js` 增加覆盖：
   - `getWebParsingEnabled` 的默认值。
   - `setWebParsingEnabled` 对布尔值的持久化写入与读取。
   - 如现有导出中存在 maxBytes/timeout helper，则补对应测试；如果没有 helper，不强行新增 API，仅验证 daemon 通用 key-path 写入逻辑。

边界：

- 不修改已部署素材。
- 不新增第三方依赖。
- 不改变现有 config schema，只验证已有 key-path 能力。

#### 1.3 诊断日志相关可测逻辑评估

文件：

- `/Users/liaoxing/Downloads/未命名文件夹/mypilot-link/src/daemon.js`
- `/Users/liaoxing/Downloads/未命名文件夹/mypilot-link/src/runtime.js`

计划：

1. 只读检查日志读取和脱敏函数是否已有可导出的纯函数。
2. 如果已有纯函数，补轻量测试。
3. 如果没有纯函数，本轮不强行改 daemon HTTP handler 结构，避免扩大范围。

验收：

- 诊断相关测试若新增，不影响 `npm run verify`。

### 2. P4-B3：Swift 测试目录收敛与覆盖扩展

#### 2.1 收敛测试目录到 `My PilotTests/`

目标目录：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/My PilotTests/`

重复遗留目录：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilotTests/`

计划：

1. 后续所有新增/修改 Swift 测试只放入 `My PilotTests/MyPilotTests/`。
2. 对遗留 `MyPilotTests/` 目录：
   - 若内容已被目标目录覆盖，则删除遗留目录中的重复测试文件。
   - 若发现目标目录缺少有效测试，先迁移到目标目录再删除遗留文件。
3. 不改 Xcode target 名称，不改 `project.pbxproj` 的 target 结构。

验收：

- Xcode 的 `My PilotTests` target 仍能运行。
- 仓库中不再出现两套同名 Swift 测试长期漂移。

#### 2.2 扩展 `ChatStreamHandlerTests`

文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/My PilotTests/MyPilotTests/ChatStreamHandlerTests.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/ChatStreamHandler.swift`

新增测试：

1. `abort()` / `clearAbort()` 行为：
   - 初始 `isAborted == false`。
   - `abort()` 后为 true。
   - `clearAbort()` 后为 false。
2. `<think>...</think>` 单段剥离：
   - 可见文本返回。
   - thinking callback 收到思考内容。
3. 分片 think 标签：
   - 例如先传 `hello <thi`，再传 `nk>hidden</think> world`。
   - 验证可见内容不会泄漏半截 think 标签。
4. 未闭合 think block：
   - 不把未闭合思考内容作为可见内容返回。
   - 后续 `drainThinkingContent()` 可取出思考内容。
5. `reset()` 清理状态：
   - 清空 thinkingContent、abort 状态和未完成 think buffer。

原则：

- 不把 private `stripThinkTags(from:)` 改成公开，只通过 `parseDelta` 间接测。

#### 2.3 抽出 `isLikelyCorruptThinking` 纯逻辑并补测

新增文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/ThinkingContentSanitizer.swift`

修改文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Chat/MessageBubbleView.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/My PilotTests/MyPilotTests/ThinkingContentSanitizerTests.swift`

计划：

1. 新增 `enum ThinkingContentSanitizer` 或 `struct ThinkingContentSanitizer`，提供 internal static 方法：
   - `static func isLikelyCorruptThinking(_ text: String) -> Bool`
2. 将 `MessageBubbleView.swift` 中 `fileprivate func isLikelyCorruptThinking` 替换为调用新纯逻辑方法，或删除本地函数并改调用点。
3. 测试覆盖：
   - 正常短文本返回 false。
   - 正常长文本返回 false。
   - 单字符长重复返回 true。
   - 2-4 字符 token 重复返回 true，例如 `举个举个举个举个...`。
   - 边界长度小于 20 返回 false。

原因：

- 这个逻辑是内容清洗，不属于 UI 渲染；抽到 Services 层可以降低 View 文件负担并让测试 target 直接覆盖。

#### 2.4 补 AppState 对话预览回归测试的可行性

候选文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/AppState.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/My PilotTests/MyPilotTests/AppStateConversationPreviewTests.swift`

计划：

1. 先评估 `AppState` 是否支持注入测试目录。
2. 如果不支持，优先不改 `AppState` 初始化结构，避免触碰真实用户数据路径。
3. 如果可以安全注入临时目录，则补测试：
   - `ensureConversationExists("default", agentId:, lastMessage:)` 会创建或复用会话。
   - `updateConversation` 会 trim 空白并写入 preview。
   - 旧对话加载回填会从 `conv-{id}.json` 提取最近非空消息。

本轮默认策略：除非能做到完全临时目录隔离，否则暂不添加 AppState 文件系统测试。

### 3. 诊断中心拆文件整理

新增文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Settings/DiagnosticsCenterView.swift`

修改文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Settings/PlaceholderSettingsPages.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Settings/SettingsView.swift`

计划：

1. 将 `DiagnosticsCenterView` 及其私有 helper 从 `PlaceholderSettingsPages.swift` 移动到独立 `DiagnosticsCenterView.swift`。
2. `SettingsView.swift` 中入口保持 `DiagnosticsCenterView()` 不变。
3. 不改诊断 UI 文案、不改 API 调用、不改导出格式，保证人工测试已通过的行为不变。

验收：

- Swift 构建通过。
- 设置页仍显示“诊断中心”。
- 进入页面后能刷新诊断并导出诊断包。

## Assumptions & Decisions

1. 本轮用户选择“测试扩展优先”。
2. Swift 测试统一收敛到 Xcode target 实际收录的 `My PilotTests/`。
3. 测试补齐后，下一批功能优先做“诊断拆文件”，不是继续扩展消息可靠性或设置体验。
4. 不引入新依赖：
   - Node 继续使用内置 `node:test`。
   - Swift 继续使用 Swift Testing 的 `@Suite`、`@Test`、`#expect`。
5. 不修改已部署代码素材。
6. 不提交 git commit，除非用户另行明确要求。
7. 对 AppState 的文件系统测试必须保证临时目录隔离；否则不做，避免污染用户真实 Application Support 数据。

## Verification Steps

### Node

```bash
cd /Users/liaoxing/Downloads/未命名文件夹/mypilot-link
npm run verify
```

必须通过：

- `npm run check`
- `npm test`
- `npm run pack:dry-run`

### Swift 构建

```bash
cd /Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot
xcodebuild -project MyPilot.xcodeproj -scheme MyPilot -configuration Debug -destination 'platform=macOS' build
```

必须出现：

```text
** BUILD SUCCEEDED **
```

### Swift 测试

优先在 Xcode 中运行：

- Scheme: `MyPilot`
- Test target: `My PilotTests`

也可尝试命令行：

```bash
cd /Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot
xcodebuild test -project MyPilot.xcodeproj -scheme MyPilot -destination 'platform=macOS'
```

### 人工回归

1. App 启动并连接 daemon。
2. 新开对话，发送文本，侧边栏最后消息预览可见。
3. 打开旧对话，若历史消息存在，预览可回填。
4. 打开设置 → 诊断中心，可看到连接/Gateway/目录/日志信息。
5. 导出诊断包成功。
6. 修改网页解析配置后重开设置仍保留。
7. 断线重连补发仍通过。

## Out of Scope

本轮不做：

1. 新增大型产品功能。
2. 重构 WebSocket 协议。
3. 修改 daemon 与 Gateway 的协议语义。
4. UI snapshot 测试。
5. 引入新的测试框架或第三方依赖。
6. 对已部署素材文件做任何修改。
