# 诊断脱敏增强计划

## Summary

部署边界收敛完成后，下一阶段做 App 侧完整诊断脱敏增强。目标是避免诊断中心页面和导出的诊断报告泄露 token、API key、Bearer token、URL query 敏感参数、环境变量风格密钥等信息。

用户已确认：

1. 下一阶段优先做诊断脱敏。
2. 本轮范围为 App 侧完整增强：页面展示也脱敏、扩展脱敏规则、补测试、跑门禁。
3. 保持红线：不修改服务器素材，不动 Gateway 协议，不引入新依赖。

本轮优先改 MyPilot App 侧，不改 `/root/.openclaw/agents/main/SOUL.md`，不改 Gateway 协议。`mypilot-link` 服务端 `/api/logs` 脱敏可作为后续增强，不纳入本轮必做。

## Current State Analysis

### 1. 诊断报告导出已有基础脱敏

文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Settings/DiagnosticsReportBuilder.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/My PilotTests/MyPilotTests/DiagnosticsReportBuilderTests.swift`

现状：

`DiagnosticsReportBuilder.markdown(...)` 已对以下内容调用 `redactSensitiveText`：

- `directoryIssues`
- `recentErrors`
- `recentLogLines`
- `appInfo.serverURL`

现有 `redactSensitiveText` 覆盖：

- `accessToken`
- `refreshToken`
- `connectToken`
- `pairingCode`
- `apiKey`
- `token`
- `password`
- `secret`
- snake_case 的 query 风格参数

已有测试覆盖：

- `cache token=secret-token`
- `apiKey=secret-key failed`
- `connectToken=secret-connect`
- `http://localhost:52378?token=secret`

### 2. 脱敏规则仍有缺口

现有规则未完整覆盖：

1. `Authorization: Bearer xxx`
2. 独立 `Bearer xxx`
3. `x-api-key: xxx`
4. `OPENAI_API_KEY=xxx`、`ANTHROPIC_API_KEY=xxx` 等环境变量风格 key。
5. URL query 中的 `deviceId`、`code`、`pairing_code`、`authorization` 等参数。
6. JSON 中带下划线或横线的 key，例如 `"api_key":"xxx"`、`"x-api-key":"xxx"`。
7. `password: xxx`、`secret=xxx` 等带空格、冒号和引号的组合。

### 3. 诊断中心页面展示未脱敏

文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Settings/DiagnosticsCenterView.swift`

当前页面直接显示原文：

- `diag.recentErrors.prefix(5)` 的 `entry.message`
- `diag.recentLogLines` 的 `line`
- `diag.directoryIssues` 的 `issue`

风险：

- 即使导出报告脱敏，用户打开诊断中心页面时仍可能看到 token、Bearer、apiKey 或连接 query。
- 截图分享诊断中心也可能泄露敏感信息。

### 4. daemon 侧现状

文件：

- `/Users/liaoxing/Downloads/未命名文件夹/mypilot-link/src/daemon.js`

现状：

- `/api/info` 只返回 `gateway.hasToken`，不会直接返回 Gateway token。
- `/api/config` 对 `apiKey` 和 `gateway.auth.token` 做了 `***` 处理。
- `/api/logs` 读取日志快照，目前本轮不修改服务端响应，优先在 App 侧脱敏。

原因：

- 用户本轮选择 App 侧完整范围。
- 不改 Gateway 协议，不引入服务端协议变化。
- App 侧脱敏可以同时保护页面展示和导出报告。

## Proposed Changes

### 1. 扩展 DiagnosticsReportBuilder 脱敏规则

文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Settings/DiagnosticsReportBuilder.swift`

改动：

1. 保留 `static func redactSensitiveText(_:)` 作为统一入口。
2. 扩展敏感 key 列表，覆盖：
   - `accessToken`
   - `refreshToken`
   - `connectToken`
   - `pairingCode`
   - `apiKey`
   - `api_key`
   - `x-api-key`
   - `authorization`
   - `token`
   - `deviceId`
   - `device_id`
   - `code`
   - `password`
   - `secret`
   - `OPENAI_API_KEY`
   - `ANTHROPIC_API_KEY`
   - `GEMINI_API_KEY`
   - `PERPLEXITY_API_KEY`
3. 增加规则覆盖：
   - JSON 字段：`"token":"xxx"`、`"api_key": "xxx"`
   - key-value：`token=xxx`、`token: xxx`
   - URL query：`?token=xxx&deviceId=yyy`
   - Header：`Authorization: Bearer xxx`
   - 独立 Bearer：`Bearer xxx`
4. 替换结果统一使用可读占位：`<redacted>`。
5. 避免误伤普通中文文本和非敏感日志。

### 2. 诊断中心页面展示也调用脱敏

文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Settings/DiagnosticsCenterView.swift`

改动：

1. `directoriesCard` 中展示 `directoryIssues` 时，对 `issue` 调用 `DiagnosticsReportBuilder.redactSensitiveText(issue)`。
2. `logsCard` 中展示 `recentErrors` 时，对 `entry.message` 调用脱敏。
3. `logsCard` 中展示 `recentLogLines` 时，对 `line` 调用脱敏。
4. 保持页面结构、字体、颜色不变，只改变展示文本。
5. 如脱敏后文本过长，继续沿用现有 `lineLimit` / `truncationMode`。

成功标准：

- 页面和导出报告脱敏逻辑一致。
- 用户截图诊断中心也不会泄露常见 token/API key/Bearer。

### 3. 补充单元测试

文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/My PilotTests/MyPilotTests/DiagnosticsReportBuilderTests.swift`

改动：

1. 扩展 `markdownRedactsSensitiveValues` 或新增独立测试 `redactSensitiveTextRedactsCommonSecretFormats`。
2. 覆盖以下输入：
   - `Authorization: Bearer abc.def.ghi`
   - `Bearer sk-live-xxx`
   - `x-api-key: secret-key`
   - `OPENAI_API_KEY=sk-secret`
   - `ANTHROPIC_API_KEY=anthropic-secret`
   - `http://localhost:52378/ws?token=secret&deviceId=device-secret`
   - `{ "api_key": "json-secret", "token": "json-token" }`
   - `pairing_code=123456`
3. 断言原始 secret 不出现在结果中。
4. 断言结果包含 `<redacted>`。
5. 保留已有运行线测试。

说明：

- SwiftUI View 展示本身不做快照测试；通过共享脱敏函数测试保证页面和导出都复用同一逻辑。

### 4. 功能清单更新

文件：

- `/Users/liaoxing/Downloads/未命名文件夹/FEATURE_CHECKLIST.md`

改动：

1. 更新 T6：
   - 问题：`诊断中心已产品化，日志脱敏已覆盖页面与导出，需持续补体验`
   - 影响：`排障能力仍可增强`
   - 优先级：`P2`
2. 增加修复历史：
   - `v13 | 06-10 | 诊断脱敏增强：页面展示与导出报告统一脱敏 Bearer、API key、URL query 和环境变量风格密钥 | T6`

### 5. 验证步骤

#### 5.1 Swift build

```bash
cd /Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot
xcodebuild -project MyPilot.xcodeproj -scheme MyPilot -configuration Debug -destination 'platform=macOS' -skipMacroValidation build
```

预期：`BUILD SUCCEEDED`。

#### 5.2 Swift tests

```bash
cd /Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot
xcodebuild test -project MyPilot.xcodeproj -scheme MyPilot -destination 'platform=macOS' -skipMacroValidation
```

预期：`TEST SUCCEEDED`。

#### 5.3 mypilot-link verify

虽然本轮不改 daemon 主线代码，但按项目规则执行 MyPilot 主线门禁：

```bash
cd /Users/liaoxing/Downloads/未命名文件夹/mypilot-link
npm run verify
```

预期：通过。

#### 5.4 package verify

本轮不改 `package` 发布包线代码，可不跑；如要做全局门禁，可跑：

```bash
cd /Users/liaoxing/Downloads/未命名文件夹/package
npm run verify
```

预期：通过。

#### 5.5 人工回归

1. 让诊断日志中包含模拟敏感值，例如：
   - `Authorization: Bearer test-token`
   - `apiKey=test-key`
   - `http://localhost:52378/ws?token=test&deviceId=device`
2. 打开诊断中心。
3. 确认页面“目录状态”“最近异常与日志”不显示原始敏感值。
4. 导出诊断报告。
5. 确认 Markdown 不包含原始敏感值，显示 `<redacted>`。

## Assumptions & Decisions

1. 用户已确认下一阶段优先做诊断脱敏。
2. 本轮范围为 App 侧完整增强，不修改服务端 `/api/logs` 响应。
3. 不修改服务器素材，不动 `/root/.openclaw/agents/main/SOUL.md`。
4. 不修改 Gateway 协议。
5. 不引入新依赖。
6. 不做诊断中心 UI 大改版。
7. 不提交 git commit，除非用户明确要求。

## Out of Scope

本轮不做：

1. 服务端 `/api/logs` 响应脱敏。
2. Gateway 协议变更。
3. 真实服务器日志清理。
4. 发布到 npm。
5. WebSocketService 拆分。
6. 消息可靠性语义调整。
