# MyPilot 下一阶段稳定可用开发规划

## Summary

下一阶段目标不是继续盲目扩功能，而是把现有 MyPilot macOS App + Node Link daemon 的核心链路打磨到“稳定可用、可诊断、可内测”。

规划按 P0/P1/P2 组织：

- P0：稳定可用必须完成，覆盖连接、消息、文件、会话、部署诊断五条主链路。
- P1：体验增强，在 P0 稳定基础上补齐高频产品能力。
- P2：长期扩展，面向更完整的 Agent 工作台和发布生态。

硬性约束：

1. 不修改 `/root/.openclaw/agents/main/SOUL.md`，除非用户后续明确授权。
2. 修改已部署在服务器的代码时，不得修改已部署代码的素材。
3. 优先在 App、daemon、协议转换层解决问题，不把稳定性依赖放到 agent prompt 或素材文件上。
4. 所有 P0 改动必须通过端到端测试验收，而不是只看构建通过。

## Current State Analysis

### 项目主线

当前项目包含 macOS SwiftUI App 与 Node Link daemon 两部分。

Swift App 主线位于：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/MyPilotApp.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/AppState.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Views/ContentView.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Views/ChatView.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/WebSocketService.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/APIService.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Models/Message.swift`

Node 侧存在两条相关线：

- 发布包线：`/Users/liaoxing/Downloads/未命名文件夹/package/src/daemon.js`
- 本地 MyPilot Link 线：`/Users/liaoxing/Downloads/未命名文件夹/mypilot-link/src/daemon.js`

当前 Swift App 的 `/api/upload`、WebSocket `chat.send`、附件收发与本地 MyPilot Link 的实现关系更直接；后续开发需要明确当前实际部署使用的是哪一条 daemon 代码，并避免只改本地副本却没有同步部署侧。

### 已完成能力

1. App 可以连接 daemon 并通过 WebSocket 收发聊天消息。
2. App 可以选择文件上传给 AI，`APIService.uploadFile` 调用 `/api/upload`。
3. App 发送 WebSocket 消息时已支持 `attachments` 字段。
4. AI 生成文件后，daemon 可扫描媒体目录并通过 `done.attachments` 回传给 App。
5. App 接收 `done.attachments` 时已支持相对 URL 转绝对 URL，也支持 `data` base64 字段。
6. 图片附件已能在 App 卡片中显示。
7. “AI 回复完成但仍显示正在输入”的状态问题已修复过一轮。
8. App 已有 Settings、Agent 管理、IM 渠道、定时任务、用量统计等页面骨架或初步实现。

### 当前主要风险

1. `WebSocketService.swift` 责任过重，连接、消息、流式输出、RPC、附件、会话状态、重连、任务状态都集中在同一个类中，后续稳定性问题容易互相影响。
2. 文件发送存在两条路径：输入框选择文件优先走 `/api/upload`，拖拽文件直接走 WebSocket base64，行为不一致。
3. 文件接收兼容多种格式：`done.attachments`、`message.attachments`、相对 URL、绝对 URL、base64 data、`MY_PILOT_MEDIA_V1` 文本指令，缺少统一协议边界说明和回归用例。
4. 会话保存依赖 `AppState` 本地 JSON 文件与 `WebSocketService` 当前状态配合，切换会话、跨会话 pending 消息、断线恢复场景仍需系统验证。
5. daemon 侧存在新旧两套代码路径，实际部署版本、开发版本、发布包版本可能不一致。
6. 当前诊断主要依靠 `print` 和 daemon log，缺少 App 内可见的连接/服务健康诊断。
7. 已部署服务器代码修改需要严格避免触碰素材文件，并且不得再动 `SOUL.md`。

## Proposed Changes

## P0：稳定可用必做

### P0-1 统一连接与消息状态恢复

目标：让用户能明确知道当前连接状态、消息是否发送成功、AI 是否仍在处理，并在断线后尽量恢复。

涉及文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/WebSocketService.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Views/ChatView.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Chat/ChatMessageSection.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Models/Message.swift`

实施内容：

1. 梳理 `WebSocketService` 中 `isConnected`、`isProcessing`、`isStreaming`、`activeProcessingCount`、`pendingMessages`、`pendingSendQueue` 的状态转换表。
2. 对 `chat.send` 发出、`chat.delta` 收到、`done` 收到、aborted、WebSocket close、receive error、reconnect success 建立明确的状态收敛规则。
3. 保留当前已修复的 done 后清理逻辑，但补齐异常分支的状态清理。
4. 对发送失败的用户消息设置明确 `deliveryStatus`，避免 UI 看起来已经发送但实际丢失。
5. 重连成功后只补发安全可重试的 pending 消息；已经有明确失败状态的消息不自动重复发送，避免 AI 重复执行。
6. 聊天界面显示更明确的状态：连接断开、正在重连、消息排队、发送失败、AI 处理中。

验收标准：

1. App 正常连接后发送文字消息，AI 完整回复后不再残留“正在输入”。
2. AI 流式回复期间切换会话再切回，当前会话状态仍正确。
3. WebSocket 断开时新消息进入排队或失败状态，不静默丢失。
4. 重连后可以继续发送新消息。
5. 多次连续发送消息不会让 `isProcessing` 卡死。

### P0-2 统一 App → AI 文件发送路径

目标：让选择文件、拖拽文件、图片、非图片文件都走一致的上传和发送协议，降低 WebSocket 大 base64 传输风险。

涉及文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Views/InputBarView.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Views/ChatView.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/APIService.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/WebSocketService.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Models/Message.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/mypilot-link/src/daemon.js`

实施内容：

1. 抽出统一的附件准备流程：读取文件、判断 MIME、图片压缩、优先上传、失败 fallback base64。
2. 让 `ChatView.handleDrop` 复用与输入框选择文件一致的上传逻辑，而不是直接把文件 base64 塞进 WebSocket。
3. 明确 base64 fallback 的大小上限，超过上限时提示上传失败而不是直接发送超大 WebSocket 帧。
4. 确认 `WebSocketService.sendMessage(_:)` 对附件对象只发送 `data` 或 `url` 中一种主要形式，并保证 MIME、filename、size 完整。
5. daemon `/api/upload` 返回字段保持与 `FileUploadResponse` 一致：`id`、`filename`、`mimeType`、`url`、`size`。
6. 对上传失败、文件读取失败、权限不足等场景在 App 中给出可见错误提示。

验收标准：

1. 从输入框选择图片，AI 能收到并识别。
2. 从输入框选择非图片文件，AI 能收到并读取。
3. 拖拽图片到聊天窗口，行为与输入框选择一致。
4. 拖拽非图片文件到聊天窗口，行为与输入框选择一致。
5. 上传失败时 App 有明确提示，不出现空消息或假成功。
6. 大文件不会导致 WebSocket 直接发送超大 base64 后卡死。

### P0-3 稳定 AI → App 文件回传协议

目标：让 AI 生成图片、文档、表格等文件后，App 端稳定显示附件卡片，并能打开或预览。

涉及文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/WebSocketService.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Chat/MessageBubbleView.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Models/Message.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/mypilot-link/src/daemon.js`

实施内容：

1. 将 `done.attachments` 作为首选协议，`MY_PILOT_MEDIA_V1` 文本指令作为兼容协议保留。
2. daemon 扫描 AI 生成媒体时继续生成 `attachments`，并为小图片保留 base64 `data` 优化显示。
3. App 侧附件解析统一处理 `id`、`filename`、`url`、`mimeType`、`size`、`data`。
4. 修复 `MessageAttachment` 编码策略与 AI 回传图片 base64 的持久化冲突：当前 `encode` 只有 `url` 为空才保存 `base64Data`，如果 AI 回传同时有 URL 和 data，历史消息重载后可能丢失 base64，只能重新走 URL。需要决定是否在小图片场景保留 base64，或保证 URL 永远可访问。
5. `ImageAttachmentCard` 对 base64、HTTP URL、相对 URL 的加载失败状态做更明确展示。
6. 非图片附件提供打开、复制链接、在浏览器/系统默认应用中打开的稳定入口。
7. daemon 媒体下载路由支持必要的 GET 响应，并明确是否需要兼容 HEAD 以便诊断。

验收标准：

1. AI 生成 PNG/JPG，App 显示附件卡片并直接展示图片。
2. AI 生成 XLSX/PDF/TXT，App 显示文件卡片并能打开或下载。
3. 历史会话重新加载后，附件卡片仍可见。
4. 图片 URL 失效或下载失败时，App 显示可理解的失败状态。
5. 同一次 AI 回复中多个文件不会重复发送，也不会漏显示。

### P0-4 会话持久化与跨会话消息稳定

目标：确保会话切换、历史消息、本地保存、搜索结果在实际使用中可靠。

涉及文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/AppState.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Views/ChatView.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/WebSocketService.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Models/Conversation.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Models/Message.swift`

实施内容：

1. 梳理 `AppState.saveMessagesForConversation`、`loadMessagesForConversation`、`updateConversation` 与 `WebSocketService.currentConversationId` 的调用时机。
2. 修复可能存在的会话 ID 不一致导致消息保存到错误文件的问题。
3. 明确跨会话收到消息时存入 `pendingCrossConversationMessages` 后的持久化策略。
4. 搜索结果跳转会话时，保证 `highlightedMessageId` 与加载后的消息列表一致。
5. 删除会话时同步清理消息文件，并避免当前 WebSocket 仍写入已删除会话。
6. 对空会话、默认会话、新建会话命名规则做一致处理。

验收标准：

1. 新建会话、发送消息、退出 App、重开后消息仍在。
2. 切换会话时消息不串线。
3. AI 回复期间切换到另一个会话，回复完成后原会话消息能正确归档。
4. 删除会话后不会再出现幽灵消息。
5. 搜索结果点击后能跳转到正确会话与消息位置。

### P0-5 daemon 部署、版本与诊断稳定

目标：解决端口占用、服务未启动、部署代码与本地代码不一致时难定位的问题。

涉及文件：

- `/Users/liaoxing/Downloads/未命名文件夹/package/src/daemon.js`
- `/Users/liaoxing/Downloads/未命名文件夹/package/src/cli.js`
- `/Users/liaoxing/Downloads/未命名文件夹/package/src/autostart.js`
- `/Users/liaoxing/Downloads/未命名文件夹/package/src/server-api.js`
- `/Users/liaoxing/Downloads/未命名文件夹/package/package.json`
- `/Users/liaoxing/Downloads/未命名文件夹/mypilot-link/src/daemon.js`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/APIService.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Settings/NetworkSettingsView.swift`

实施内容：

1. 明确当前实际部署使用的 daemon 入口，是 `package/src/daemon.js` 还是 `mypilot-link/src/daemon.js`。
2. 给 daemon `/api/health`、`/api/info` 返回更可诊断的信息：版本、启动时间、端口、上传目录、媒体目录、Gateway 连通状态。
3. App 设置页增加服务诊断区，展示服务器地址、健康检查结果、版本、WebSocket 状态、最近错误。
4. daemon 启动时检测端口占用并输出明确错误，而不是让用户只能从 AI 回复里猜测。
5. 对文件上传目录、媒体目录、workspace 目录做启动时可读写检查。
6. 清理 P0 相关调试日志输出，保留有价值但不泄露 token、路径敏感信息的日志。
7. 修改服务器部署代码时只改代码文件，不修改素材文件，不修改 `SOUL.md`。

验收标准：

1. App 能在设置页看到 daemon 是否健康。
2. daemon 端口被占用时有明确错误提示。
3. `/api/health` 能反映服务基础状态。
4. `/api/info` 能帮助判断 App 连接到的是否是预期版本。
5. 文件上传目录不可写时能在诊断中暴露。
6. 部署侧改动后可通过端到端测试确认与本地行为一致。

## P1：稳定基础上的高频体验增强

### P1-1 消息操作

涉及文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Chat/MessageBubbleView.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Chat/ChatMessageSection.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/WebSocketService.swift`

内容：

1. 消息右键菜单：复制、复制 Markdown、删除、重新发送、从此处重新生成。
2. 用户消息发送失败后支持重试。
3. AI 消息支持复制正文、复制思考内容、复制附件链接。

验收标准：

1. 对任意消息右键能看到对应操作。
2. 删除消息后本地持久化同步更新。
3. 失败用户消息可重试，且不会重复插入多条相同用户消息。

### P1-2 定时任务增强

涉及文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Settings/ScheduledTasksView.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/WebSocketService.swift`
- daemon 侧实际任务 API 文件，需在执行前再次确认具体路径

内容：

1. 在定时任务页面新增创建任务 Sheet。
2. 支持任务名称、Agent、任务内容、Cron 表达式、常用频率预设。
3. 支持暂停、恢复、删除、手动触发。
4. 显示最近运行状态与失败原因。

验收标准：

1. App 内可创建一个定时任务。
2. 可暂停、恢复、删除。
3. 手动触发后能看到执行状态变化。
4. 失败时能看到具体原因。

### P1-3 权限与安全配置

涉及文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Settings/NetworkSettingsView.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Settings/AdvancedSettingsView.swift`
- daemon 侧权限配置文件，需在执行前确认实际位置

内容：

1. 增加文件读写、命令执行、网络访问等权限展示。
2. 权限默认保守，不因 UI toggle 误导用户以为已生效。
3. 若 daemon 不支持某权限，App 显示“不支持/需升级 daemon”。
4. 后续若接入真实权限 API，再将 UI 与 daemon 能力绑定。

验收标准：

1. 用户能看到当前权限状态。
2. 不支持的权限不会显示成可用开关。
3. 权限变更失败时有明确提示。

### P1-4 工作区文件浏览器

涉及文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Settings/AgentFilesView.swift`
- 新增或扩展已有 Settings 子页面，执行时优先复用现有组件
- daemon 侧 workspace 文件 API，需确认实际路径

内容：

1. 浏览 AI workspace 中生成的文件。
2. 支持按类型筛选：图片、文档、表格、其他。
3. 支持预览、打开、下载、复制链接。
4. 与聊天附件卡片使用同一套附件模型。

验收标准：

1. 用户能看到 workspace 中最近生成的文件。
2. 点击文件能预览或打开。
3. 不暴露不应访问的系统路径。

## P2：长期扩展方向

### P2-1 WebSocketService 分层重构

目标：降低单类复杂度，为后续功能扩展减少回归风险。

建议拆分：

1. `ConnectionManager`：连接、重连、ping、send queue。
2. `ChatStreamHandler`：delta、thinking、done、abort。
3. `AttachmentTransport`：附件发送、接收、媒体指令兼容。
4. `AgentRpcClient`：agents、models、agent files、settings RPC。
5. `ConversationRuntimeStore`：当前会话运行态与跨会话 pending 消息。

约束：

- 不在 P0 阶段大拆，除非某项 P0 无法在现结构下安全完成。
- 先补状态表和回归测试路径，再逐步抽离。

### P2-2 发布包与本地 daemon 统一

目标：消除 `package/` 与 `mypilot-link/` 两套 daemon 行为差异。

内容：

1. 确认哪套作为最终发布入口。
2. 把稳定后的 `/api/upload`、`/mypilot-media`、WebSocket 转换、健康诊断合并到最终入口。
3. 保留迁移说明和版本兼容策略。
4. 发布前使用 `package/package.json` 中的 `npm run check` 做 JS 语法验证。

### P2-3 Agent 工作台增强

内容：

1. Agent 头像、描述、能力标签、最近使用记录。
2. Agent 文件编辑安全边界，默认不主动修改 SOUL.md。
3. Agent 运行日志与任务历史。
4. Agent 级别的默认模型、权限、工具开关。

### P2-4 多端与远程访问能力

内容：

1. 完善 relay/public direct route 状态展示。
2. 支持不同网络环境下的连接质量提示。
3. 增加访问 token 过期、刷新、撤销的用户可见状态。
4. 支持导出诊断包，便于远程排查。

## Assumptions & Decisions

1. 下一阶段首要目标是稳定可用，不优先做大范围新功能。
2. 计划采用 P0/P1/P2，而不是时间线方式。
3. P0 同时覆盖核心链路、会话持久化、部署诊断，不把某一块完全延后。
4. 验收以端到端测试为主，构建通过只是基础要求。
5. App 与 daemon 都纳入规划。
6. 不修改 `SOUL.md`，AI 生成文件回传依赖 daemon 自动扫描和协议附件，不依赖 prompt 文件改动。
7. 不修改已部署代码的素材文件。
8. 执行前需要再次确认当前服务器实际运行的 daemon 文件路径，防止改错本地副本。
9. 若 P0 中发现必须重构 `WebSocketService` 才能稳定修复，可以做小范围提取，但不做无关大重构。

## Verification Steps

### 基础构建验证

Swift App：

```bash
xcodebuild -scheme MyPilot -destination 'platform=macOS' build
```

Node 发布包：

```bash
cd /Users/liaoxing/Downloads/未命名文件夹/package
npm run check
```

本地 MyPilot Link：

```bash
node --check /Users/liaoxing/Downloads/未命名文件夹/mypilot-link/src/daemon.js
```

### P0 端到端测试清单

1. 连接测试
   - 启动 daemon。
   - App 连接服务器。
   - 设置页健康检查显示正常。
   - WebSocket 状态显示已连接。

2. 文字消息测试
   - 发送普通文字消息。
   - AI 流式回复。
   - 回复完成后“正在输入”消失。
   - 会话保存后重开 App 仍可看到消息。

3. App → AI 文件测试
   - 输入框选择图片发送。
   - 输入框选择 TXT/PDF/XLSX 发送。
   - 拖拽图片发送。
   - 拖拽非图片文件发送。
   - AI 能读取或识别文件。

4. AI → App 文件测试
   - 请求 AI 生成图片。
   - App 显示附件卡片并能看到图片。
   - 请求 AI 生成表格或文本文件。
   - App 显示文件卡片并能打开或下载。
   - 重开 App 后历史附件仍可见。

5. 断线恢复测试
   - App 连接后手动停止 daemon。
   - App 显示断线。
   - 断线期间发送消息有排队或失败状态。
   - 重启 daemon 后 App 可重连。
   - 重连后可继续发送新消息。

6. 会话切换测试
   - 创建两个会话。
   - 在会话 A 发送消息。
   - AI 回复期间切到会话 B。
   - AI 回复完成后回到会话 A。
   - 消息不串线，回复归档正确。

7. 部署诊断测试
   - 访问 `/api/health`。
   - 访问 `/api/info`。
   - 模拟端口占用或目录不可写时确认错误可诊断。

## Recommended Execution Order

1. P0-5：先确认实际 daemon 入口和健康诊断，避免后续改错目标。
2. P0-1：稳定连接与消息状态，保证聊天主链路不会卡住。
3. P0-2：统一 App → AI 文件发送路径。
4. P0-3：稳定 AI → App 文件回传协议。
5. P0-4：补齐会话持久化和跨会话场景。
6. P1-1：消息操作。
7. P1-2：定时任务增强。
8. P1-3：权限与安全配置。
9. P1-4：工作区文件浏览器。
10. P2 项按后续产品目标逐步推进。

## Immediate Next Step After Plan Approval

如果用户批准本计划，执行时第一步应读取本文件，然后只做 P0-5 的只读确认与最小实现：

1. 确认当前服务器实际运行 daemon 路径。
2. 对照本地 `package/src/daemon.js` 与 `mypilot-link/src/daemon.js` 的能力差异。
3. 先补健康诊断和版本信息，确保后续每次 App 连接都知道自己连到什么版本。
4. 不触碰 `SOUL.md`。
5. 不修改已部署素材。
