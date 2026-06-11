# 附件协议统一与回归测试计划

## Summary

本轮优先推进“附件协议统一”，目标是把当前选择文件、拖拽文件、AI 回传附件、历史消息重载、daemon 文件 API 这几条链路收敛成明确、可测试、可回归的协议边界，并修复功能清单技术债 T4：`MessageAttachment 编码冲突（url vs base64）`。

用户已确认：

1. 下一阶段优先做附件协议。
2. 本轮范围是“统一实现”，不只是补测试。
3. daemon 侧回归纳入本轮。

本轮不做大规模 UI 重构，不改 Gateway 协议，不修改服务器素材或 agent prompt。

## Current State Analysis

### 1. Swift App 附件模型现状

关键文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Models/Message.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/AttachmentTransport.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/My PilotTests/MyPilotTests/MessageAttachmentTests.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/My PilotTests/MyPilotTests/AttachmentTransportTests.swift`

当前状态：

1. `MessageAttachment` 已支持 `url` 和 `base64Data`。
2. `MessageAttachment.encode(to:)` 已显式保留 `base64Data`。
3. `AttachmentTransport.parseAttachments(from:baseURL:)` 支持：
   - 相对 URL 拼接。
   - 绝对 URL 保留。
   - `data` 字段转 `base64Data`。
4. `AttachmentTransport.buildAttachmentPayload(from:)` 发送时优先 `base64Data`，否则 `url`。
5. 已有 Swift 测试覆盖一部分基础场景，但还缺少：
   - data URI 解析。
   - `base64Data` 和 `url` 共存时的优先级。
   - `MY_PILOT_MEDIA_V1` 有效指令解析。
   - done/message 两种回传路径统一解析。
   - 去重策略。

### 2. Swift App 发送路径现状

关键文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Views/ChatView.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Views/InputBarView.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/APIService.swift`

当前状态：

1. `ChatView.prepareAttachment(fileURL:serverURL:token:)` 是“优先 `/api/upload`，失败后 base64 fallback”的统一准备流程。
2. `InputBarView` 选择文件调用 `ChatView.prepareAttachment(...)`，这是合理的。
3. `ChatView.handleDrop(providers:)` 拖拽文件也调用 `ChatView.prepareAttachment(...)`，但拖拽后会直接构造 `Message` 并立即 `sendMessage`，没有经过输入框附件列表，行为与文件选择仍不一致：
   - 选择文件：先进入 `selectedAttachments`，用户可看到附件并决定是否发送。
   - 拖拽文件：直接发送。
4. `InputBarView.uploadImageData(_:)` 截图/图片粘贴路径自己实现了一套上传 + base64 fallback，与 `ChatView.prepareAttachment` 逻辑重复。
5. base64 fallback 大小限制目前写在两处，均为 5MB，但没有统一常量。

### 3. Swift App 接收路径现状

关键文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/WebSocketService.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/AttachmentTransport.swift`

当前状态：

1. `done` 帧使用 `AttachmentTransport.resolveAllAttachments(...)`，可以同时处理：
   - `done.attachments`
   - 内容里的 `MY_PILOT_MEDIA_V1` 指令
2. `message` / `message.send` 帧仍在 `WebSocketService` 内手写附件解析逻辑，只解析 id/filename/url/mimeType/size，不保留 `data`，也没有复用 `AttachmentTransport.resolveAllAttachments(...)`。
3. 这会导致 AI 通过 message 工具发送文件时，与 done 帧附件解析能力不一致。

### 4. daemon 侧附件链路现状

关键文件：

- `/Users/liaoxing/Downloads/未命名文件夹/mypilot-link/src/daemon.js`
- `/Users/liaoxing/Downloads/未命名文件夹/mypilot-link/src/daemon-utils.test.js`

当前状态：

1. `/api/upload` 接收 `{ filename, mimeType, data }`，写入 `uploadsDir`，返回 `{ id, filename, mimeType, url, size, createdAt }`。
2. `/api/file/:id` 读取上传文件并返回内容。
3. `/api/workspace-files` 和 `/api/workspace-file/:filename` 支持 AI workspace 文件浏览/读取。
4. `extractContentParts(content)` 能从 AI content parts 中提取 text/thinking/attachments：
   - image data URI 会写入 upload 文件并返回 `/api/file/:id`。
   - image URL 会作为附件 URL。
   - file part 会作为附件 URL。
   - 文本中的 workspace 文件路径会转 `/api/workspace-file/:filename`。
5. 现有 Node 测试已覆盖部分 `extractContentParts`，但未覆盖 data URI 写入、workspace 文件匹配、发送到 Gateway 时附件 data/url 优先级等边界。

### 5. 功能清单现状

文件：

- `/Users/liaoxing/Downloads/未命名文件夹/FEATURE_CHECKLIST.md`

当前技术债：

- T4：`MessageAttachment 编码冲突（url vs base64）`，影响是历史消息图片可能丢失。

本轮完成并验证后，应更新 T4 为“已统一协议，继续扩展端到端覆盖”。

## Proposed Changes

### 1. Swift 附件协议统一

#### 1.1 抽出统一附件常量与准备服务

新增文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/AttachmentPreparationService.swift`

改动：

1. 新增 `enum AttachmentPreparationService` 或 `struct AttachmentPreparationService`。
2. 提供统一常量：
   - `static let maxInlineBase64Bytes = 5 * 1024 * 1024`
3. 提供统一方法：
   - `static func prepareFile(fileURL: URL, serverURL: String, token: String) async throws -> MessageAttachment`
   - `static func prepareImageData(_ data: Data, filename: String, serverURL: String, token: String) async throws -> MessageAttachment`
   - `static func compressImageData(_ data: Data) -> Data`
4. 迁移 `ChatView.prepareAttachment(...)` 和 `ChatView.compressImageData(...)` 到该服务。
5. `ChatView` 保留轻量 wrapper 或直接调用服务，避免大范围 UI 调用改动。
6. `InputBarView.uploadFileToServer(...)` 和 `uploadImageData(...)` 改用该服务。

成功标准：

- 文件选择、图片粘贴/截图、拖拽都复用同一个附件准备逻辑。
- base64 fallback 上限只有一处定义。
- 上传失败时 fallback 行为一致。

#### 1.2 拖拽文件行为与选择文件统一

文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Views/ChatView.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Views/InputBarView.swift`

现状：

- 选择文件进入输入栏附件列表。
- 拖拽文件直接发送消息。

计划改动：

1. 推荐新增 `InputBarView` 的可选外部附件注入机制：
   - 在 `ChatView` 中维护 `@State private var droppedAttachments: [MessageAttachment] = []` 或 `pendingExternalAttachments`。
   - `InputBarView` 增加 binding 参数，如 `externalAttachments: Binding<[MessageAttachment]>`，在 `.onChange` 中 append 到 `selectedAttachments` 并清空外部数组。
2. `handleDrop` 不再直接 `wsService.sendMessage(msg)`。
3. `handleDrop` 上传/准备附件成功后，将附件加入 `pendingExternalAttachments`，由输入栏展示，用户再决定发送。
4. 上传失败仍显示错误消息或输入栏错误提示；本轮可保留当前错误消息追加方式，但不直接发送成功附件。

成功标准：

- 拖拽文件后附件显示在输入栏，不自动发送。
- 用户可以删除附件或添加文本后发送。
- 选择文件与拖拽文件行为一致。

#### 1.3 接收路径统一到 `AttachmentTransport.resolveAllAttachments`

文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/WebSocketService.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/AttachmentTransport.swift`

改动：

1. `done` 帧继续使用 `resolveAllAttachments`。
2. `message` / `message.send` 帧删除手写解析，改用：
   - `AttachmentTransport.resolveAllAttachments(rawAttachments: rawAttachments, content: content, serverURL: ..., token: ...)`
3. 这样 message 工具发送文件也能获得：
   - 相对 URL 补全。
   - base64 data 保留。
   - `MY_PILOT_MEDIA_V1` 指令解析。
4. `resolveAllAttachments` 如存在重复附件，应做最小去重：
   - 优先按 `id` 去重。
   - `id` 缺失时按 `url` 或 `filename + size` 去重。

成功标准：

- done 和 message/send 两条路径解析一致。
- AI 回传 base64 data 不丢。
- 文本指令解析后 clean text 正确。

#### 1.4 明确发送/接收/持久化优先级

文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Models/Message.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/AttachmentTransport.swift`

协议决策：

1. 发送到 daemon：
   - `base64Data` 存在时发送 `data`。
   - 否则发送 `url`。
2. 接收 daemon：
   - `data` 存在时保留为 `base64Data`。
   - `url` 存在时补全相对 URL。
   - `data` 和 `url` 共存时都保留，但发送时仍优先 data。
3. 持久化历史：
   - `MessageAttachment` 必须保留 `base64Data`。
   - `url` 不应被 `base64Data` 覆盖。

成功标准：

- 历史消息重载后图片仍可显示。
- url/base64 共存时不会丢任一字段。

### 2. Swift 测试扩展

文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/My PilotTests/MyPilotTests/AttachmentTransportTests.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/My PilotTests/MyPilotTests/MessageAttachmentTests.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/My PilotTests/MyPilotTests/AttachmentPreparationServiceTests.swift`（如能纯逻辑测试）

新增测试：

1. `parseAttachments`：
   - data URI 或 `data` 字段保留为 `base64Data`。
   - `url` + `data` 共存时都保留。
   - 相对 URL 用 baseURL 补全。
2. `buildAttachmentPayload`：
   - `base64Data` 优先输出 `data`。
   - 无 `base64Data` 时输出 `url`。
   - 同时有 `base64Data` 和 `url` 时输出 `data`，不输出/不依赖 url。
3. `resolveAllAttachments`：
   - done.attachments + MY_PILOT_MEDIA_V1 同时存在时合并。
   - 重复附件去重。
   - clean text 移除媒体指令。
4. `MessageAttachment`：
   - Codable round-trip 保留 url + base64Data 共存。
   - 旧 JSON 缺少可选字段时仍解码。
5. `AttachmentPreparationService`：
   - `maxInlineBase64Bytes` 常量存在。
   - 图片压缩函数对非图片 data 原样返回或不崩溃。

### 3. daemon 侧回归测试

文件：

- `/Users/liaoxing/Downloads/未命名文件夹/mypilot-link/src/daemon-utils.test.js`
- `/Users/liaoxing/Downloads/未命名文件夹/mypilot-link/src/daemon.js`

改动：

1. 补 `extractContentParts` 测试：
   - image URL part → attachment url。
   - file URL part → attachment url。
   - data URI image → attachment `/api/file/:id`，并写入 uploadsDir。
   - workspace path 文本 → `/api/workspace-file/:filename` attachment。
2. 如果现有 `extractContentParts` 强依赖真实 `os.homedir()` 和全局 `uploadsDir`，不要大改 daemon 架构；优先补不依赖真实文件系统的 URL/file part 测试。
3. 如需要测试 data URI 或 workspace 文件，推荐小范围抽可测试 helper 或允许测试创建临时文件，但必须避免写用户真实素材目录。
4. 不新增第三方依赖，继续使用 `node:test`。

成功标准：

- `npm run verify` 通过。
- daemon 附件提取边界有回归保护。

### 4. 功能清单校准

文件：

- `/Users/liaoxing/Downloads/未命名文件夹/FEATURE_CHECKLIST.md`

改动：

1. 更新 T4：
   - 从“MessageAttachment 编码冲突（url vs base64）”改为“附件协议已统一，需继续补真实端到端大文件/多文件场景”。
2. 如本轮完成拖拽与选择文件统一，可在附件相关功能项备注中标明：
   - 文件选择/拖拽统一使用 `AttachmentPreparationService`。
   - done/message 回传统一使用 `AttachmentTransport.resolveAllAttachments`。

### 5. 验证步骤

#### 5.1 Node 验证

```bash
cd /Users/liaoxing/Downloads/未命名文件夹/mypilot-link
npm run verify
```

预期：

- check 通过。
- node:test 通过。
- pack dry-run 通过。

#### 5.2 Swift 构建与测试

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

#### 5.3 人工回归

1. 选择文件：附件进入输入栏，发送后 AI 能收到。
2. 拖拽文件：附件进入输入栏，不自动发送；用户可添加文本后发送。
3. 图片/截图路径：上传成功时走 `/api/upload`；上传失败且小于 5MB 时 base64 fallback。
4. 超过 5MB 且上传失败时显示清晰错误。
5. AI 通过 done.attachments 回传文件，App 正确显示附件。
6. AI 通过 message/send 回传文件，App 正确显示附件。
7. AI 文本包含 `MY_PILOT_MEDIA_V1` 指令时，App 移除指令并显示附件。
8. App 重启后历史消息中的 base64 图片仍可显示。
9. `url` 和 `base64Data` 共存时历史重载不丢字段。

## Assumptions & Decisions

1. 用户已确认下一阶段优先做附件协议。
2. 用户已确认本轮做“统一实现”，不是仅补测试。
3. 用户已确认 daemon 侧回归纳入本轮。
4. 发送优先级：`base64Data` → `data`，否则 `url`。
5. 接收保留原则：`data` 和 `url` 共存时都保留。
6. 拖拽行为改为与选择文件一致：进入输入栏附件列表，不自动发送。
7. base64 fallback 上限保持 5MB，但改为统一常量。
8. 不修改 Gateway 协议。
9. 不修改服务器素材、不修改 `SOUL.md`。
10. 不引入第三方依赖。
11. 不提交 git commit，除非用户明确要求。

## Out of Scope

本轮不做：

1. 多文件上传进度条。
2. 大文件分片上传。
3. 文件预览 UI 大改。
4. package 与 mypilot-link 双线发布治理。
5. 会话持久化跨会话稳定性专项。
6. 通话设置/订阅管理占位页处理。
