# MyPilot Code Wiki

## 1. 项目概述

MyPilot 是一个 macOS 原生 AI 助手客户端，由 **SwiftUI App** + **Node.js Daemon** 两层架构组成。App 通过 WebSocket 与本地 Daemon 通信，Daemon 作为中间层连接 OpenClaw Gateway，实现 AI 对话、Agent 管理、文件传输、定时任务等功能。

```
┌──────────────┐     WebSocket     ┌──────────────┐     WebSocket     ┌──────────────────┐
│  MyPilot App │ ◄──────────────► │   Daemon     │ ◄──────────────► │  OpenClaw Gateway │
│  (SwiftUI)   │   ws://127.0.0.1 │  (Node.js)   │  ws://127.0.0.1  │  (AI Backend)     │
│  Port: -     │   :52378         │  Port: 52378 │  :<gateway-port> │                   │
└──────────────┘                   └──────────────┘                   └──────────────────┘
```

### 两条产品线

| 属性 | mypilot-link (私有化) | package (公共发布) |
|------|----------------------|-------------------|
| 包名 | `@mypilot/link` | `@clawpilot-app/link` |
| Flavor | `mypilot-link` | `clawpilot-link` |
| CLI 命令 | `mypilot` | `clawlink` |
| 本地端口 | 52378 | - |
| 特殊能力 | 诊断、定时任务、附件协议、本地 OpenClaw 调试 | 国际化、自启动、Relay 模式 |
| 代码路径 | `开发/mypilot-link/` | `开发/package/` |

---

## 2. 项目目录结构

```
未命名文件夹/
├── MyPilotApp/MyPilot/                    # SwiftUI macOS App (Xcode 项目)
│   ├── MyPilot/                           # 主 App 源码
│   │   ├── MyPilotApp.swift               # App 入口
│   │   ├── AppState.swift                 # 全局状态管理
│   │   ├── Core/                          # 核心基础层
│   │   │   ├── DesignSystem/              # 设计系统 (颜色/字体/间距/圆角)
│   │   │   └── Networking/                # 网络层 (GatewayClient + DTOs)
│   │   ├── Models/                        # 数据模型
│   │   ├── Services/                      # 服务层 (WebSocket/RPC/附件/头像...)
│   │   ├── Features/                      # 功能模块
│   │   │   ├── Chat/                      # 聊天功能
│   │   │   └── Settings/                  # 设置功能
│   │   ├── Views/                         # 顶层视图
│   │   └── SharedComponents/              # 共享 UI 组件
│   └── My PilotTests/                     # 单元测试
├── 开发/
│   ├── mypilot-link/                      # MyPilot 私有化 Daemon
│   │   ├── src/
│   │   │   ├── daemon.js                  # Daemon 主文件
│   │   │   ├── cli.js                     # CLI 入口
│   │   │   ├── openclaw.js                # OpenClaw 配置检测
│   │   │   ├── network.js                 # 网络通信
│   │   │   ├── scheduler.js               # 定时任务调度
│   │   │   ├── search-providers.js        # 搜索提供商管理
│   │   │   ├── device-identity.js         # 设备身份签名
│   │   │   ├── connect-token.js           # 连接令牌
│   │   │   ├── runtime.js                 # 运行时工具
│   │   │   └── constants.js               # 常量定义
│   │   └── package.json                   # @mypilot/link
│   └── package/                           # ClawPilot 公共发布 Daemon
│       ├── src/
│       │   ├── daemon.js                  # Daemon 主文件
│       │   ├── cli.js                     # CLI 入口 (clawlink)
│       │   ├── server-api.js              # Relay 服务器 API
│       │   ├── i18n.js                    # 国际化
│       │   ├── autostart.js               # 自启动管理
│       │   └── version-support.js         # 版本兼容
│       └── package.json                   # @clawpilot-app/link
└── .trae/                                 # Trae IDE 配置
    ├── rules/project_rules.md             # 项目规则
    └── documents/                         # 开发文档
```

---

## 3. 整体架构

### 3.1 通信架构

```
App (SwiftUI)                          Daemon (Node.js)                    Gateway
─────────────                          ─────────────────                   ───────
    │                                      │                                  │
    │  1. WebSocket Connect                │                                  │
    │  (ws://host:52378/?deviceId=&token=) │                                  │
    │ ──────────────────────────────────► │                                  │
    │                                      │  2. WebSocket Connect            │
    │                                      │  (ws://127.0.0.1:<gw-port>)      │
    │                                      │ ──────────────────────────────► │
    │                                      │                                  │
    │  3. hello frame                      │  4. connect.challenge            │
    │ ◄────────────────────────────────── │ ◄────────────────────────────── │
    │                                      │  5. connect req (签名认证)        │
    │                                      │ ──────────────────────────────► │
    │                                      │  6. connect res (认证通过)        │
    │                                      │ ◄────────────────────────────── │
    │                                      │                                  │
    │  7. chat.send                        │  8. chat.send (转发)              │
    │ ──────────────────────────────────► │ ──────────────────────────────► │
    │                                      │                                  │
    │  9. processing                       │  10. chat event (delta/final)    │
    │ ◄────────────────────────────────── │ ◄────────────────────────────── │
    │  11. stream (delta)                  │                                  │
    │ ◄────────────────────────────────── │                                  │
    │  12. done (final)                    │                                  │
    │ ◄────────────────────────────────── │                                  │
```

### 3.2 数据流：消息发送与接收

**发送流程：**
1. 用户在 `InputBarView` 输入文字 → `ChatViewModel.sendMessage()`
2. `WebSocketService.enqueueOrSend()` → `send()` 构造 `chat.send` 帧
3. `ConnectionManager.send()` 通过 URLSessionWebSocketTask 发送
4. Daemon 收到 `chat.send` → `sendToGateway()` 转发到 OpenClaw Gateway

**接收流程：**
1. Gateway 推送 `chat` event → Daemon 解析 delta/final
2. Daemon 计算 visibleDelta/thinkingDelta → 推送 `stream` 帧给 App
3. App `ConnectionManager.onMessage` → `WebSocketFrameRouter.route()`
4. `WebSocketChatFrameHandler.handleStreamFrame()` → `ChatStreamHandler.parseDelta()`
5. `streamHandler.onFlush` → `streamingBuffer` → 30ms 打字机定时器 → `streamingDisplayContent`
6. `done` 帧 → 最终消息写入 `messages` 数组 → 触发持久化和通知

### 3.3 流式输出双层缓冲架构

```
Gateway delta → ChatStreamHandler.parseDelta()
                    │
                    ├── thinkingDelta → streamingThinkingContent
                    │
                    └── visibleDelta → onFlush → streamingBuffer (接收层)
                                                        │
                                              30ms Typewriter Timer
                                                        │
                                              streamingDisplayContent (显示层)
                                                        │
                                              UI: StreamingLineText 渲染
```

---

## 4. macOS App 模块详解

### 4.1 App 入口与全局状态

#### MyPilotApp.swift
- **职责**: App 入口点，配置窗口、菜单栏、深色模式
- **关键类型**: `MyPilotApp: App`、`WindowAccessor`、`WindowObserverView`
- **通知定义**: `.newConversation`、`.toggleSearch`、`.reconnectWebSocket`、`.cancelGeneration`、`.agentHasUnreadReply`

#### AppState.swift
- **职责**: 全局可观察状态，管理实例、会话、消息的持久化
- **关键类型**: `AppState` (@Observable)、`SearchResult`
- **核心属性**:
  - `instances: [Instance]` — 已配对实例列表
  - `currentInstance: Instance?` — 当前选中实例
  - `conversations: [Conversation]` — 所有会话
  - `currentConversationId: String` — 当前会话 ID
  - `currentWebSocket: WebSocketService?` — 当前 WebSocket 服务
  - `unreadAgentIds: Set<String>` — 未读 Agent 集合
- **持久化**: UserDefaults (instances) + Documents/Conversations/ (conversations) + Documents/Messages/ (messages)
- **关键方法**:
  - `conversationsForAgent(_:)` / `groupedConversationsForAgent(_:)` — 按时间分组
  - `createConversation(agentId:)` / `deleteConversation(_:)` — 会话 CRUD
  - `appendMessagesToConversation(_:convId:)` — 追加消息并更新预览
  - `searchMessages(query:)` — 全文搜索（扫描所有 conv-*.json 文件）

### 4.2 数据模型层

#### Agent.swift
```swift
struct Agent: Identifiable, Codable, Hashable {
    var id: String           // Agent 唯一标识 (如 "main", "coder")
    var name: String         // 远端名称
    var workspace: String?   // 工作空间路径
    var model: AgentModel?   // 当前使用的模型
    var isActive: Bool       // 是否活跃
    var avatarUrl: String?   // 头像 URL

    var displayName: String  // 优先本地自定义 > 远端名称 > ID
    var localAvatarPath: String?  // 本地头像路径
    var modelDisplayName: String  // 模型显示名
}

struct AgentNameOverrides  // 本地名称覆盖 (UserDefaults 持久化)
```

#### Message.swift
```swift
struct Message: Codable, Identifiable {
    var id: UUID
    var content: String
    var isFromUser: Bool
    var timestamp: Date
    var attachments: [MessageAttachment]
    var thinkingContent: String?    // AI 思考内容
    var isFailed: Bool
    var deliveryStatus: MessageDeliveryStatus?
    var isSystem: Bool              // 系统消息 (错误/超时等)
}

struct MessageAttachment: Codable, Identifiable {
    var id: String
    var filename: String
    var url: String
    var mimeType: String
    var size: Int
    var base64Data: String?
    // 计算属性: isImage, isVideo, isAudio, isDocument
}

enum MessageDeliveryStatus: String, Codable {
    case sending, sent, queued, running, delivered, failed, timedOut, cancelled, lost
    var isTerminal: Bool  // delivered/failed/timedOut/cancelled/lost
}
```

#### Conversation.swift
```swift
struct Conversation: Identifiable, Codable, Hashable {
    var id: String            // UUID 字符串
    var agentId: String       // 所属 Agent
    var title: String         // 会话标题
    var createdAt: Date
    var lastMessageAt: Date
    var lastMessagePreview: String  // 最近消息预览 (最多50字)
}
```

#### Instance.swift
```swift
struct Instance: Codable, Identifiable, Hashable {
    var id: UUID
    var name: String
    var serverURL: String       // HTTP 基础 URL
    var deviceId: String        // 配对设备 ID
    var token: String           // 认证令牌
    var addresses: [InstanceAddress]  // 多地址支持
    var activeAddressId: UUID?  // 当前活跃地址

    var effectiveServerURL: String  // 当前使用的 URL
    var wsURL: String               // WebSocket URL (http→ws 替换)
}
```

#### ScheduledTask.swift / AgentFileInfo.swift
- `ScheduledTask` — 定时任务模型
- `AgentFileInfo` — Agent 文件元数据 (id, path, missing, size, updatedAtMs)

### 4.3 服务层

#### WebSocketService.swift (核心)
- **职责**: WebSocket 通信总控，管理连接、消息、流式输出、Agent 状态
- **关键属性**:
  - `isConnected`, `isStreaming`, `isProcessing` — 连接与处理状态
  - `messages: [Message]` — 当前会话消息列表
  - `streamingContent` / `streamingBuffer` / `streamingDisplayContent` — 双层缓冲
  - `agents: [Agent]`, `currentAgentId`, `currentConversationId` — Agent 管理
  - `pendingMessages: [Message]` — 排队消息
  - `pendingRpcCallbacks: [String: callback]` — RPC 回调映射
  - `conversationStates: [String: (isProcessing, isStreaming, streamingContent)]` — 会话状态缓存
- **子模块** (通过 extension 拆分):
  - `WebSocketChatFrameHandler` — 聊天帧处理
  - `WebSocketSystemFrameHandler` — 系统帧处理
  - `WebSocketMessageSending` — 消息发送
  - `WebSocketRpcMethods` — RPC 方法封装
- **打字机效果**: `ensureTypewriterRunning()` — 30ms 定时器，每次从 buffer 取 1-2 字符到 displayContent

#### WebSocketFrameRouter.swift
- **职责**: 帧路由器，根据 `type` 字段分发到对应 handler
- **协议**: `WebSocketFrameHandling` — 定义 17 种帧处理方法
- **帧类型映射**:

| 帧类型 | Handler 方法 | 说明 |
|--------|-------------|------|
| `hello` | `handleHelloFrame` | 连接建立确认 |
| `chat.history` | `handleChatHistoryFrame` | 历史消息 |
| `gateway-rpc` | `handleGatewayRpcFrame` | RPC 响应 |
| `res` | `handleResFrame` | 通用响应 |
| `agent.model.set` | `handleAgentModelSetFrame` | 模型切换响应 |
| `processing` | `handleProcessingFrame` | AI 开始处理 |
| `stream` | `handleStreamFrame` | 流式增量 |
| `done` | `handleDoneFrame` | AI 回复完成 |
| `file.new` | `handleFileNewFrame` | 新文件通知 |
| `error` | `handleErrorFrame` | 错误 |
| `gateway.http` | `handleGatewayHttpFrame` | HTTP 代理响应 |
| `task.status` | `handleTaskStatusFrame` | 任务状态 |
| `task.notify` | `handleTaskNotifyFrame` | 任务完成通知 |
| `agent.created` | `handleAgentCreatedFrame` | 新 Agent 创建 |
| `agent.status` | `handleAgentStatusFrame` | Agent 执行状态 |
| `model.usage` | `handleModelUsageFrame` | Token 用量 |
| `message` | `handleMessageFrame` | 独立消息 |

#### ConnectionManager.swift
- **职责**: WebSocket 连接生命周期管理
- **关键功能**: 连接/断开/自动重连/心跳/Ping/发送队列
- **重连策略**: 指数退避 (2^n 秒, 最大 30s)
- **心跳**: 25s 间隔 WebSocket ping
- **发送队列**: 断连时缓存非 chat.send 帧，重连后 flush

#### ChatStreamHandler.swift
- **职责**: 流式内容解析与状态管理
- **核心方法**:
  - `parseDelta(_:isReasoning:thinkingDelta:)` — 解析增量，剥离 `<think/>` 标签
  - `appendToStream(_:)` — 追加可见内容并 flush
  - `abort()` / `clearAbort()` — 中止/恢复
  - `drainThinkingContent()` — 获取并清空思考内容
- **Think 标签剥离**: 支持不完整的 `<think/>` 标签 (缓冲 `thinkBuffer`)

#### AgentRpcClient.swift
- **职责**: Gateway RPC 调用封装，通过注入 `sendRpc` 闭包与 WebSocket 解耦
- **RPC 方法**:
  - `requestAgentsList()` / `requestModelsList()` — 列表查询
  - `requestAgentFile()` / `requestAgentFileList()` / `saveAgentFile()` — 文件操作
  - `createAgent()` / `updateAgent()` / `deleteAgent()` — Agent CRUD
  - `getConfig()` / `getConfigBatch()` / `setConfig()` — 配置读写
  - `scheduleList()` / `scheduleCreate()` / `scheduleUpdate()` / `scheduleDelete()` / `scheduleRun()` — 定时任务

#### AttachmentPreparationService.swift
- **职责**: 附件预处理（图片压缩、base64 编码）

#### AttachmentTransport.swift
- **职责**: 附件数据解析、组装、去重
- **关键方法**: `parseAttachments()`, `resolveAllAttachments()`, `buildAttachmentPayload()`, `dedupeAttachments()`

#### AvatarService.swift
- **职责**: Agent 头像本地存储 (Documents/AgentAvatars/{id}.png)
- **优先级**: 本地文件 > 远端 avatarUrl > 默认图标

#### SearchSettingsManager.swift
- **职责**: 搜索提供商配置管理 (HTTP API + config.set RPC)

#### ThinkingContentSanitizer.swift
- **职责**: 思考内容清洗与规范化

#### ServerDiagnostics.swift
- **职责**: 服务器诊断信息获取与展示

#### MenuBarManager.swift
- **职责**: macOS 菜单栏管理

### 4.4 视图层

#### 顶层视图

| 视图 | 职责 |
|------|------|
| `ContentView` | 主视图，NavigationSplitView (Sidebar + Chat/Welcome) |
| `SidebarView` | 侧边栏，Agent 列表 + 会话列表 + 搜索 |
| `ChatView` | 聊天主视图，组合 Header + Messages + Input |
| `WelcomeView` | 欢迎页，引导连接实例 |
| `AddInstanceView` | 添加实例 (QR 扫码/手动输入) |
| `InputBarView` | 输入栏 (文本输入 + 附件 + 发送/停止) |
| `SearchPanelView` | 搜索面板 (消息全文搜索) |
| `IMETextView` | 支持 IME 输入法的 NSTextView 包装 |

#### Chat 功能视图

| 视图 | 职责 |
|------|------|
| `ChatHeaderSection` | 聊天头部 (Agent 名称 + 模型选择 + 操作按钮) |
| `ChatMessageSection` | 消息列表渲染 (BouncingDots + 流式内容 + 历史消息) |
| `ChatInputSection` | 输入区域组合 |
| `MessageBubbleView` | 单条消息气泡 (用户/AI/系统) + 悬停操作栏 |
| `MarkdownRenderer` | Markdown 内容渲染 (标题/粗体/代码/表格) |
| `ModelPickerView` | 模型选择弹窗 |
| `SystemPromptView` | 系统提示词编辑 |
| `CommandPickerView` | 命令选择器 (/compact 等) |
| `QRScannerView` | 二维码扫描 |

#### Settings 功能视图

| 视图 | 职责 |
|------|------|
| `SettingsView` | 设置主页 (iOS 风格 inset grouped) |
| `AgentsManagementView` | Agent 管理页 (创建/编辑/删除) |
| `NetworkSettingsView` | 网络设置 |
| `AdvancedSettingsView` | 高级设置 (Verbose/Reasoning 模式) |
| `ScheduledTasksView` | 定时任务管理 |
| `AgentFilesView` | Agent 文件浏览器 |
| `DiagnosticsCenterView` | 诊断中心 |
| `IMChannelsView` | IM 通道配置 |
| `MemoryReadingView` | 记忆读取 |
| `UsageStatsView` | 用量统计 |
| `AboutView` | 关于页面 |

### 4.5 共享组件

| 组件 | 职责 |
|------|------|
| `AgentAvatarView` | Agent 头像 (本地 > 远端 > 默认) |
| `AvatarPickerView` | 头像选择器 |
| `CardContainer` | 卡片容器 (统一阴影/边框/圆角) |
| `CardStates` | 卡片状态 (加载/空/错误) |
| `CopyButton` | 复制按钮 |
| `DetailTitleView` | 详情页标题 |
| `IconBlock` | 图标块 (SF Symbol + 颜色背景) |
| `ModelPill` | 模型标签 |
| `SettingsRow` | 设置行 (图标 + 标题 + 值) |
| `StatusDot` | 状态点 (在线/离线/处理中) |

### 4.6 设计系统

#### AppColors.swift
- Apple 标准灰阶 (`ink50` ~ `ink900`)
- iMessage 风格气泡色 (`userBubbleBg`, `aiBubbleBg`)
- V10 语义色 (`primaryText`, `secondaryText`, `tertiaryText`)
- 状态色 (`success`, `danger`, `warning`, `info`) + Soft 背景
- 文件图标色、IM 通道色、模型提供商色
- 支持 Light/Dark 模式自动切换 (`Color(hex:darkHex:)`)

#### AppTypography.swift
```
heroNumber   = 28pt bold monospaced
pageTitle    = 24pt semibold
sectionTitle = 15pt semibold
listTitle    = 14pt medium
body         = 13pt regular      ← 消息正文统一字号
caption      = 12pt regular
badge        = 11pt semibold
data         = 11pt regular
captionMono  = 12pt mono
dataMono     = 11pt mono
nanoMono     = 10pt mono
```

#### Spacing.swift / AppRadius.swift
- 统一间距常量和圆角常量

### 4.7 网络层

#### GatewayClient.swift
- Gateway HTTP API 客户端协议

#### DTOs
- `MemoryDTO` — 记忆数据
- `SessionsDTO` — 会话数据
- `StatsDTO` — 统计数据

#### Repositories
- `MemoryRepository` — 记忆数据访问
- `SessionsRepository` — 会话数据访问
- `StatsRepository` — 统计数据访问

---

## 5. Node.js Daemon 模块详解

### 5.1 daemon.js (核心)

**职责**: Daemon 主文件，包含 HTTP 服务器、WebSocket 服务器、Gateway 连接、消息中继

**核心状态**:
```javascript
let httpServer, wss                    // HTTP + WebSocket 服务器
let appConnections = new Map()          // App 连接 (sessionId → ws)
let gatewayWs                          // Gateway WebSocket 连接
let gatewayReady = false               // Gateway 是否就绪
const pendingRequests = new Map()       // 待处理请求 (reqId → pending)
const devices = new Map()              // 已配对设备 (deviceId → device)
const sessionTokenUsage = new Map()     // Token 用量追踪
const scheduler = new Scheduler(...)    // 定时任务调度器
```

**HTTP API 端点**:

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 (含 Gateway 状态) |
| GET | `/api/info` | Daemon 信息 (packageName, flavor, pid, 错误日志) |
| POST | `/api/pair/generate` | 生成配对码 (12位, 5分钟有效) |
| POST | `/api/pair/verify` | 验证配对码 → 返回 deviceId + token |
| GET | `/api/logs` | 读取日志快照 |
| GET | `/api/config` | 读取 OpenClaw 配置 (脱敏) |
| GET | `/api/schedules` | 获取定时任务列表 |
| GET | `/api/workspace-files` | 获取工作空间文件列表 |
| POST | `/api/upload` | 上传文件 (base64) |
| GET | `/api/file/:id` | 下载上传的文件 |
| GET | `/api/workspace-file/:name` | 下载工作空间文件 (支持 SCP 回源) |
| GET | `/api/settings/search` | 获取搜索提供商配置 |
| POST | `/api/settings/search/provider/:id` | 保存搜索提供商 |
| DELETE | `/api/settings/search/provider/:id` | 删除搜索提供商 |
| PUT | `/api/settings/search/default` | 设置默认搜索提供商 |
| PUT | `/api/settings/search/toggles` | 切换搜索/自动导入 |
| GET/POST | `/stats/*` | 代理到 Gateway 统计 API |

**App WebSocket 帧处理** (`handleAppWsMessage`):

| 帧类型 | 处理逻辑 |
|--------|---------|
| `chat.send` | 转发到 Gateway，附带文件提示 |
| `chat.reset` | 清除会话，转发 `sessions.reset` |
| `chat.history` | 转发 `chat.history` RPC |
| `agents.list` / `models.list` | 转发对应 RPC |
| `agents.files.get/list/set` | Agent 文件操作 |
| `agents.create/update/delete` | Agent CRUD |
| `config.get/getBatch/set` | 配置读写 (带缓存) |
| `schedule.list/create/update/delete/run` | 定时任务 (本地处理) |
| `sessions.abort` | 清理 pending + 转发 |
| `gateway.http` | HTTP 代理到 Gateway |
| `agent.model.set` | 模型切换 (read-modify-write config) |

**Gateway 事件处理** (`handleGatewayEvent`):

| 事件 | 处理 |
|------|------|
| `chat` (delta) | 计算 visibleDelta/thinkingDelta → 推送 `stream` 给 App |
| `chat` (final) | 提取最终内容 + 附件 + Token 用量 → 推送 `done` |
| `chat.error` | 推送 `error` |
| `model.usage` | 转发 Token 用量统计 |
| `agent` (item) | 推送 `agent.status` (执行标题) |
| `agent` (model.usage) | 转发模型用量 |
| `agent` (assistant) | 记录累积内容 + LLM 调用计数 |
| `agent` (lifecycle end) | 检查新 Agent + 30s 兜底 done |

**Gateway 连接可靠性**:
- 心跳: 25s ping + 20s pong 超时
- 重连: 指数退避 (3s 基础, 60s 最大) + 20% 随机抖动
- 风暴检测: 5分钟内断连8次 → 冷却3分钟
- 进程锁: `daemon.lock` 防止多实例

**Token 用量追踪**:
- 优先使用 Gateway 提供的真实 usage 数据
- 无真实数据时估算: `SYSTEM_OVERHEAD_TOKENS(4500) + contextTokens * llmCalls`
- `/compact` 命令后重置 session 统计

**附件处理**:
- AI 回复中的图片 (data: URL) → 保存到 uploads 目录
- 工作空间文件路径匹配 → 自动附加为附件
- 文件变更检测: `snapshotWorkspace()` + `diffWorkspace()` 每 2s 检查

### 5.2 cli.js
- CLI 入口，解析命令行参数，调用 `runDaemon()` 启动守护进程

### 5.3 openclaw.js
- 检测本地 OpenClaw Gateway 配置 (端口、Token)
- 读取 `~/.openclaw/openclaw.json`

### 5.4 scheduler.js
- 定时任务调度器
- 支持 cron 表达式和一次性任务
- 持久化到 `~/.mypilot-link/schedules.json`
- `onFire` 回调通过 Gateway 发送消息

### 5.5 search-providers.js
- 搜索提供商管理 (初始化/列表/保存/删除/自定义)
- 通过 Gateway RPC 管理搜索配置

### 5.6 device-identity.js
- 设备身份签名 (使用 tweetnacl)
- 用于 Gateway challenge-response 认证

### 5.7 connect-token.js
- 连接令牌生成与验证

### 5.8 runtime.js
- 运行时工具: 日志、状态持久化、JSON 读写、目录管理、路径解析

### 5.9 constants.js
- 关键常量:
  - `LINK_PACKAGE_NAME` = `"@mypilot/link"`
  - `LINK_FLAVOR` = `"mypilot-link"`
  - `LINK_DIRECT_PORT` = `52378`
  - `OPENCLAW_GATEWAY_MIN/MAX_PROTOCOL_VERSION`
  - `LOCAL_GATEWAY_CLIENT_ID/PLATFORM/ROLE/SCOPES/CAPS`

---

## 6. 公共发布包 (package) 差异

| 特性 | mypilot-link | package |
|------|-------------|---------|
| 包名 | `@mypilot/link` | `@clawpilot-app/link` |
| CLI | `mypilot` | `clawlink` |
| Node 要求 | >=18 | >=22.14 |
| 连接模式 | 直连本地 Gateway | 支持 Relay 中继 |
| 定时任务 | `scheduler.js` | 无 |
| 搜索提供商 | `search-providers.js` | 无 |
| 国际化 | 无 | `i18n.js` |
| 自启动 | 无 | `autostart.js` |
| 版本兼容 | 无 | `version-support.js` |
| 服务器 API | 无 | `server-api.js` (Relay) |
| 附件补丁 | `patches/add_agents_intercept.py` | 无 |
| cron-parser | 有 | 无 |

---

## 7. 依赖关系

### 7.1 App 层依赖图

```
MyPilotApp.swift
  └── AppState (全局状态)
        ├── WebSocketService (通信核心)
        │     ├── ConnectionManager (连接管理)
        │     ├── ChatStreamHandler (流式解析)
        │     ├── WebSocketFrameRouter (帧路由)
        │     ├── AgentRpcClient (RPC 封装)
        │     └── SearchSettingsManager (搜索配置)
        ├── AvatarService (头像)
        └── AttachmentPreparationService (附件预处理)

ContentView
  ├── SidebarView → AppState, WebSocketService
  ├── ChatView → ChatViewModel → WebSocketService
  │     ├── ChatHeaderSection
  │     ├── ChatMessageSection → MessageBubbleView → MarkdownRenderer
  │     └── ChatInputSection → InputBarView
  └── WelcomeView → AddInstanceView
```

### 7.2 Daemon 层依赖图

```
daemon.js (主入口)
  ├── constants.js (常量)
  ├── runtime.js (运行时工具)
  ├── openclaw.js (Gateway 配置检测)
  ├── scheduler.js (定时任务)
  ├── device-identity.js (设备签名)
  ├── search-providers.js (搜索提供商)
  └── network.js (网络通信)

cli.js → daemon.js (runDaemon)
```

### 7.3 npm 依赖

**mypilot-link**:
- `ws` ^8.18.3 — WebSocket 服务器/客户端
- `tweetnacl` ^1.0.3 — 设备身份签名
- `json5` ^2.2.3 — JSON5 解析
- `qrcode-terminal` ^0.12.0 — 终端二维码
- `cron-parser` ^5.5.0 — Cron 表达式解析

**package** (无 cron-parser，其余相同)

---

## 8. 项目运行方式

### 8.1 Daemon 启动

```bash
# MyPilot 私有化 Daemon
cd 开发/mypilot-link
npm install
npm start          # 或: node src/cli.js daemon

# 验证 Daemon 运行
curl http://127.0.0.1:52378/api/info
# 预期: { "packageName": "@mypilot/link", "flavor": "mypilot-link", ... }
```

### 8.2 App 构建

```bash
# Xcode 构建 (需在 Xcode IDE 中操作)
cd MyPilotApp/MyPilot
open MyPilot.xcodeproj

# 命令行构建
xcodebuild -project MyPilot.xcodeproj -scheme MyPilot \
  -configuration Debug -destination 'platform=macOS' \
  -skipMacroValidation build
```

### 8.3 测试

```bash
# Daemon 测试
cd 开发/mypilot-link
npm run verify      # check + test + pack:dry-run

# App 测试
cd MyPilotApp/MyPilot
xcodebuild test -project MyPilot.xcodeproj -scheme MyPilot \
  -destination 'platform=macOS' -skipMacroValidation
```

### 8.4 验证运行线

```bash
curl http://127.0.0.1:52378/api/info
# MyPilot 主线预期:
# { "packageName": "@mypilot/link", "flavor": "mypilot-link" }
```

---

## 9. 关键设计决策

### 9.1 双层缓冲流式输出
- **接收层** (`streamingBuffer`): 累积所有 delta
- **显示层** (`streamingDisplayContent`): 30ms 定时器逐字符提取
- **优势**: 流畅的打字机效果，避免 UI 卡顿

### 9.2 会话状态缓存
- 切换会话时保存/恢复 `(isProcessing, isStreaming, streamingContent)`
- 限制最大缓存 20 个会话，防止内存增长

### 9.3 思考内容分离
- `ChatStreamHandler` 剥离 `<think/>` 标签
- Daemon 预分离 `thinkingDelta`，App 端不重复处理
- 思考内容与可见内容独立追踪

### 9.4 配置缓存
- Daemon 端 `configCache` (5s TTL) 避免频繁读取 100KB+ 的 openclaw.json
- `config.set` 后自动失效缓存

### 9.5 通知系统
- AI 回复完成 + 窗口不可见 → 触发通知
- Dock 图标弹跳 + 未读徽章 + 系统通知 (osascript)
- 点击通知 → 激活窗口 + 切换到对应 Agent 会话

### 9.6 @Observable 宏注意事项
- `lazy var` 闭包不能捕获 `self`，需改为 `private var` + 手动初始化
- Xcode 26.5 的 `swift-plugin-server` 有间歇性宏展开失败，需 Clean Build Folder

---

## 10. 协议参考

### 10.1 App ↔ Daemon WebSocket 协议

**App → Daemon**:
```json
{ "type": "chat.send", "content": "...", "agentId": "main", "conversationId": "default", "id": "uuid", "timestamp": 1234567890 }
{ "type": "chat.reset", "agentId": "main", "conversationId": "default", "id": "uuid" }
{ "type": "sessions.abort", "agentId": "main", "conversationId": "default", "id": "uuid" }
{ "type": "agents.list", "id": "uuid" }
{ "type": "models.list", "id": "uuid" }
{ "type": "config.get", "params": { "key": "..." }, "id": "uuid" }
{ "type": "config.set", "params": { "key": "...", "value": "..." }, "id": "uuid" }
{ "type": "agent.model.set", "agentId": "main", "modelId": "gpt-4", "id": "uuid" }
```

**Daemon → App**:
```json
{ "type": "hello", "connectionId": "...", "version": "0.8.0" }
{ "type": "processing" }
{ "type": "stream", "delta": "...", "thinkingDelta": "...", "conversationId": "...", "isReasoning": false }
{ "type": "done", "content": "...", "thinking": "...", "usage": {...}, "conversationId": "..." }
{ "type": "error", "payload": { "error": "..." }, "conversationId": "..." }
{ "type": "gateway-rpc", "id": "...", "method": "...", "ok": true, "payload": {...} }
{ "type": "agent.created", "agent": { "id": "...", "name": "..." } }
{ "type": "model.usage", "usage": {...}, "model": "..." }
```

### 10.2 Daemon ↔ Gateway WebSocket 协议

**Daemon → Gateway**:
```json
{ "type": "req", "id": "...", "method": "connect", "params": { "minProtocol": 1, "maxProtocol": 1, "client": {...}, "role": "backend", "scopes": [...], "auth": {...}, "device": {...} } }
{ "type": "req", "id": "...", "method": "chat.send", "params": { "sessionKey": "...", "message": "..." } }
{ "type": "req", "id": "...", "method": "agents.list", "params": {} }
```

**Gateway → Daemon**:
```json
{ "type": "event", "event": "connect.challenge", "payload": { "nonce": "..." } }
{ "type": "res", "id": "...", "ok": true, "payload": {...} }
{ "type": "event", "event": "chat", "payload": { "runId": "...", "state": "delta|final", "message": {...} } }
{ "type": "event", "event": "agent", "payload": { "runId": "...", "stream": "item|assistant|lifecycle|model.usage", "data": {...} } }
```

### 10.3 会话 ID 格式

- App 端: `UUID字符串` 或 `agentId:default`
- Daemon 端 sessionKey: `agent:{agentId}:mypilot:dm:{deviceId}:{conversationId}`
- 确保 Agent 间会话隔离，避免串台

---

## 11. 文件存储路径

| 用途 | 路径 |
|------|------|
| Agent 头像 | `~/Documents/AgentAvatars/{agentId}.png` |
| 会话数据 | `~/Documents/Conversations/conversations.json` |
| 消息数据 | `~/Documents/Messages/conv-{conversationId}.json` |
| 上传文件 | `~/.openclaw/plugins/mypilot-link/uploads/` |
| 媒体文件 | `~/.openclaw/mypilot-media/` |
| 工作空间 | `~/.openclaw/workspace/` |
| 定时任务 | `~/.mypilot-link/schedules.json` |
| 设备数据 | `~/.openclaw/plugins/mypilot-link/devices.json` |
| 进程锁 | `~/.openclaw/plugins/mypilot-link/daemon.lock` |
| Gateway 配置 | `~/.openclaw/openclaw.json` |
| 日志 | `~/.openclaw/plugins/mypilot-link/logs/` |
