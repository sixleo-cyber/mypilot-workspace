# MyPilot Windows 端产品需求文档（PRD）

> 基于 MyPilot macOS v0.8.0 反向输出，供 Windows 端开发使用

---

## 1. 产品概述

### 1.1 产品定位
MyPilot 是一个桌面端 AI 助手客户端，通过本地 daemon（mypilot-link）连接 OpenClaw Gateway，实现与 AI Agent 的对话交互。用户可在本地管理多个远程服务器上的 AI Agent 实例。

### 1.2 核心架构
```
Windows App ←WebSocket→ mypilot-link daemon ←WebSocket→ OpenClaw Gateway ←→ AI Agent
     (客户端)              (本地/远程)              (服务器端)
```

- **App 端**：Windows 桌面应用（Electron + React + Vite），负责 UI 展示和用户交互
- **mypilot-link**：Node.js daemon，npm 包 `mypilot-link`，运行在服务器上，作为 App 和 Gateway 之间的桥梁
- **OpenClaw Gateway**：AI Agent 运行平台，提供 WebSocket RPC 接口

### 1.3 技术约束
- mypilot-link 是现成的 npm 包，**不需要重新开发**，Windows App 只需对接其协议
- App 与 daemon 之间通过 HTTP + WebSocket 通信，协议与平台无关
- daemon 默认端口：52378

---

## 2. 用户流程

### 2.1 首次使用流程
1. 用户安装 Windows App
2. 在服务器上安装 mypilot-link：`npm install -g mypilot-link`
3. 启动 daemon：`mypilot daemon`
4. 在 App 中添加实例，输入服务器地址（如 `http://192.168.1.100:52378`）
5. 在服务器终端执行 `mypilot pair` 获取配对码
6. 在 App 中输入配对码完成配对
7. 配对成功后自动连接，获取 Agent 列表
8. 选择 Agent 开始对话

### 2.2 日常使用流程
1. 打开 App，自动连接上次使用的实例
2. 选择 Agent 开始/继续对话
3. 发送消息、上传文件、使用命令
4. 接收 AI 流式回复
5. 切换实例或 Agent

---

## 3. 功能模块

### 3.1 实例管理

#### 3.1.1 添加实例
- 输入服务器地址（格式：`http://IP:52378`）
- 地址校验：必须是合法 HTTP/HTTPS URL
- 连接测试：点击"连接"后先调用 `/api/health` 验证 daemon 可达
- 配对流程：连接成功后进入配对码输入步骤
- 配对成功后保存实例信息（地址、deviceId、token）

#### 3.1.2 实例数据模型
```
Instance {
    id: UUID
    name: String                    // 实例名称（用户自定义）
    serverURL: String               // 服务器地址
    deviceId: String                // 配对后返回的设备 ID
    token: String                   // 配对后返回的认证 token
    pairedAt: Date                  // 配对时间
    lastUsedAt: Date               // 最后使用时间
    addresses: [InstanceAddress]    // 多地址支持
    activeAddressId: UUID?          // 当前活跃地址 ID
}

InstanceAddress {
    id: UUID
    label: String                   // 地址标签（如"默认"、"局域网"）
    url: String                     // 地址 URL
}
```

#### 3.1.3 实例列表
- 侧边栏显示所有已配对实例
- 显示连接状态（已连接/未连接/连接中）
- 支持切换实例
- 支持删除实例
- 支持编辑实例名称和地址

### 3.2 Agent 管理

#### 3.2.1 Agent 数据模型
```
Agent {
    id: String                      // Agent 唯一标识（如 "main"）
    name: String                    // Agent 名称
    workspace: String?              // 工作空间路径
    model: AgentModel?              // 当前使用的模型
    isActive: Bool                  // 是否活跃
    avatarUrl: String?              // 头像 URL
}

AgentModel {
    primary: String?                // 主模型标识（如 "doubao/pro-32k"）
}
```

#### 3.2.2 Agent 列表
- 从 daemon 的 WebSocket `agents.list` 命令获取
- 显示 Agent 名称、头像、模型信息
- 支持本地自定义名称（覆盖远端名称）
- 支持本地自定义头像（优先级：本地 > 远端 avatarUrl > 默认图标）
- 头像存储路径：`Documents/AgentAvatars/{agentId}.png`

#### 3.2.3 Agent 操作
- 创建 Agent（通过 `agents.create` WebSocket 命令）
- 删除 Agent（通过 `agents.delete` WebSocket 命令）
- 切换模型（通过 `agent.model.set` WebSocket 命令）

### 3.3 聊天功能

#### 3.3.1 消息数据模型
```
Message {
    id: UUID
    content: String                 // 消息文本内容
    isFromUser: Bool                // 是否为用户发送
    timestamp: Date                 // 时间戳
    attachments: [MessageAttachment]// 附件列表
    thinkingContent: String?        // AI 思考过程内容
    isFailed: Bool                  // 是否发送失败
    deliveryStatus: MessageDeliveryStatus?  // 投递状态
    isSystem: Bool                  // 是否为系统消息
}

MessageAttachment {
    id: String
    filename: String                // 文件名
    url: String                     // 文件 URL
    mimeType: String                // MIME 类型
    size: Int                       // 文件大小（字节）
    base64Data: String?             // 图片 base64 数据
}

MessageDeliveryStatus: Enum {
    sending, sent, queued, running, delivered, failed, timedOut, cancelled, lost
    // 终态：delivered, failed, timedOut, cancelled, lost
}
```

#### 3.3.2 会话管理
- 会话 ID 格式：`{agentId}:default`（确保不同 Agent 会话隔离）
- 切换 Agent 时自动切换会话
- 支持清除当前会话（`/clear` 命令或 `chat.reset` WebSocket 命令）
- 支持压缩对话历史（`/compact` 命令）

#### 3.3.3 消息发送
- 文本消息：通过 WebSocket `chat.send` 命令发送
- 文件附件：先通过 HTTP `/api/upload` 上传，获取 URL 后附加到消息中
- 消息格式：
```json
{
    "type": "chat.send",
    "id": "unique-msg-id",
    "payload": {
        "sessionKey": "agentId:default",
        "message": "用户消息内容",
        "attachments": [{"id": "...", "filename": "...", "url": "...", "mimeType": "...", "size": 123}]
    }
}
```

#### 3.3.4 流式接收
- AI 回复通过 WebSocket 事件 `chat` 逐块推送
- 事件格式：
```json
{"type": "event", "name": "chat", "payload": {"content": "增量文本", "sessionId": "..."}}
```
- 结束事件：`chat.final` 或 `agent.lifecycle.end`
- 错误事件：`chat.error`
- 需实现双层缓冲：接收层（streamingBuffer）+ 显示层（streamingDisplayContent）
- 显示层以 30ms 定时器逐字符提取，实现打字机效果
- 流式输出期间显示加载动画（BouncingDots：三个圆点依次弹跳）

#### 3.3.5 消息渲染
- 用户消息：右对齐气泡，支持附件显示
- AI 消息：左对齐气泡，支持 Markdown 渲染（粗体、标题、代码块、列表等）
- AI 消息必须支持**跨行自由选择文本**（通过 contentEditable 或 Markdown 渲染为单个 HTML 块，非逐行独立 DOM）
- 附件渲染：
  - 图片：内联缩略图显示
  - 其他文件：文件名 + 大小 + 下载按钮
- 系统消息：居中显示，灰色小字

#### 3.3.6 命令系统
输入 `/` 触发命令面板，支持以下命令：

| 命令 | 说明 | 图标 |
|------|------|------|
| /help | 显示所有可用指令 | questionmark.circle |
| /compact | 压缩对话历史，释放上下文空间 | arrow.triangle.2.circlepath |
| /new | 开启全新会话 | arrow.uturn.right |
| /models | 查看可用 AI 模型列表 | cpu |
| /status | 查看服务器连接状态 | antenna.radiowaves.left.and.right |
| /clear | 清除当前对话历史 | trash |
| /agent | 查看当前 Agent 信息 | person.text.rectangle |
| /stop | 停止 AI 当前输出 | stop.circle |
| /model | 切换 AI 模型 | cpu |
| /search | 联网搜索并回答问题 | magnifyingglass |

命令面板交互：
- 输入 `/` 后自动弹出，显示前 6 个匹配命令
- 继续输入过滤命令列表
- Enter 选择命令，Escape 关闭面板

### 3.4 连接管理

#### 3.4.1 WebSocket 连接
- 连接地址：`ws://{serverURL}/ws`（HTTP→WS, HTTPS→WSS）
- 连接时携带认证信息：`{deviceId, token}`
- 心跳机制：每 30 秒发送 ping，超时 10 秒无响应则重连
- 自动重连：断线后指数退避重连（1s → 2s → 4s → 8s → 最大 30s）
- 重连风暴检测：短时间内多次断线则暂停重连

#### 3.4.2 连接状态
- 未连接 / 连接中 / 已连接 / 重连中 / 连接失败
- 状态变化时更新 UI 指示器
- 连接断开时显示提示横幅

### 3.5 设置模块

#### 3.5.1 设置页面结构
```
设置
├── 连接状态卡片（实例名 + 连接状态）
├── 配置
│   ├── 网络设置（搜索服务配置）
│   ├── Agent 文件（工作空间文件管理）
│   └── IM 通信渠道（消息渠道管理）
├── 管理
│   ├── Agents 管理（Agent 列表、创建、删除、模型切换）
│   ├── 定时任务（cron 任务管理）
│   ├── 文件浏览器（服务器文件浏览）
│   └── 诊断中心（连接诊断、日志查看）
└── 其他
    ├── 高级设置（占位，后续实现）
    └── 订阅管理（占位，后续实现）
```

#### 3.5.2 诊断中心
- 连接状态总览：daemon 连接、Gateway 连接、Agent 数量
- Daemon 诊断：进程状态、端口检查、日志查看
- Gateway 诊断：连接状态、认证状态、重连次数
- 目录检查：工作空间、配置文件、日志文件是否存在
- 一键导出诊断报告（Markdown 格式）

#### 3.5.3 网络设置
- 搜索服务提供商管理（添加/删除/设为默认）
- Web 解析开关
- 自动导入开关

#### 3.5.4 定时任务
- 任务列表（名称、cron 表达式、下次执行时间、启用状态）
- 创建/编辑/删除任务
- 立即执行任务
- 启用/禁用任务

### 3.6 通知系统

#### 3.6.1 通知触发条件
- AI 回复完成时（收到 `chat.final` 或 `agent.lifecycle.end` 事件）
- **仅当窗口不可见时触发**（最小化/隐藏/切换到其他应用）

#### 3.6.2 通知方式
- 任务栏图标闪烁/高亮
- 系统通知（Toast 通知）：显示 Agent 名称 + 回复预览（截断），带声音
- 未读徽章：未读回复计数，App 回到前台时自动清除

### 3.7 欢迎页
- 首次打开 App 时显示（无已配对实例时）
- 显示 App 版本号
- 引导步骤：
  1. 准备一台服务器
  2. 安装 MyPilot Link：`npm i -g mypilot-link && mypilot daemon`
  3. 在 App 中添加实例并配对
- 提供"添加实例"按钮

---

## 4. 通信协议

### 4.1 HTTP API

所有 HTTP 请求需携带 Header：`Authorization: Bearer {token}`（配对后获取的 token）

| 端点 | 方法 | 说明 | 关键参数/返回 |
|------|------|------|-------------|
| `/api/health` | GET | 健康检查 | 返回：`{version, pid, gatewayConnected, knownAgentIds, uptime}` |
| `/api/pair/generate` | POST | 生成配对码 | 返回：`{code, expiresAt}` |
| `/api/pair/verify` | POST | 验证配对码 | 参数：`{code}`，返回：`{deviceId, token, success}` |
| `/api/info` | GET | 获取完整信息 | 返回：daemon 状态、配置、连接信息 |
| `/api/logs` | GET | 获取日志 | 参数：`?lines=100&filter=error` |
| `/api/upload` | POST | 上传文件 | multipart/form-data，返回：`{id, filename, url, mimeType, size}` |
| `/api/file/{id}` | GET | 下载上传的文件 | |
| `/api/workspace-files` | GET | 列出工作空间文件 | 返回：文件列表 |
| `/api/workspace-file/{filename}` | GET | 下载工作空间文件 | |
| `/api/config` | GET | 获取 OpenClaw 配置 | |
| `/api/schedules` | GET | 获取定时任务列表 | |
| `/api/settings/search` | GET | 获取搜索设置 | |
| `/api/settings/search/provider/{id}` | POST/DELETE | 添加/删除搜索提供商 | |
| `/api/settings/search/default` | PUT | 设置默认搜索提供商 | |
| `/api/settings/search/toggles` | PUT | 控制搜索功能开关 | |
| `/stats/*` | GET | 代理 Gateway 统计接口 | |

### 4.2 WebSocket 消息协议

连接地址：`ws://{serverURL}/ws`

#### 4.2.1 App → Daemon

| 消息类型 | 说明 | Payload |
|----------|------|---------|
| `chat.send` | 发送聊天消息 | `{sessionKey, message, attachments?}` |
| `chat.reset` | 清除会话历史 | `{sessionKey}` |
| `agents.list` | 获取 Agent 列表 | `{}` |
| `agents.create` | 创建 Agent | `{name, workspace?}` |
| `agents.delete` | 删除 Agent | `{agentId}` |
| `agent.model.set` | 设置 Agent 模型 | `{agentId, model}` |
| `config.get` | 获取配置 | `{key?}` |
| `config.set` | 设置配置 | `{key, value}` |

消息格式：
```json
{
    "type": "chat.send",
    "id": "unique-msg-id",
    "payload": { ... }
}
```

#### 4.2.2 Daemon → App

| 消息类型 | 说明 | Payload |
|----------|------|---------|
| `res` | 命令响应 | `{id, payload, error?}` |
| `event` | 事件推送 | `{name, payload}` |

事件名称：
| 事件 | 说明 |
|------|------|
| `chat` | 流式文本增量 |
| `chat.final` | AI 回复完成 |
| `chat.error` | AI 回复出错 |
| `agent.lifecycle.end` | Agent 生命周期结束 |
| `model.usage` | 模型 token 使用统计 |
| `agent.detected` | 检测到新 Agent |

#### 4.2.3 Daemon → Gateway 协议（参考，App 不直接对接）

| 消息类型 | 说明 |
|----------|------|
| `connect.challenge` | Gateway 认证握手 |
| `chat.send` | 转发聊天消息 |
| `res` | Gateway 响应 |

---

## 5. UI 设计规范

### 5.1 整体布局
- 左侧边栏（240px）：实例列表 + Agent 列表
- 右侧主区域：聊天界面
- 设置以独立窗口/弹窗形式打开

### 5.2 色彩系统
```
primaryText:       #1D1D1F
secondaryText:     #86868B
tertiaryText:      #AEAEB2
accentSoft:        #E8F0FE
dangerSoft:        #FFE5E5
successSoft:       #E8F5E9
warningSoft:       #FFF3E0
surfaceCard:       #F5F5F7
pageBackground:    #FFFFFF
aiBubbleBg:        #E5E5EA
userBubbleBg:      #007AFF
success:           #34C759
danger:            #FF3B30
warning:           #FF9500
info:              #007AFF
```

### 5.3 字体规范
- 正文：13px
- 标题：加粗区分
- 代码：等宽字体
- AI 消息和用户消息字号统一

### 5.4 间距规范
- 气泡内边距：水平 14px，垂直 8px
- AI 气泡最大宽度：520px
- 气泡间水平边距：16px

### 5.5 动画规范
- BouncingDots：三个圆点依次弹跳，间隔 0.18s，动画时长 0.15s
- 流式输出：30ms 定时器逐字符显示
- 命令面板：spring 动画弹出

---

## 6. 数据持久化

### 6.1 当前实现（macOS）
- 实例配置：UserDefaults（Windows 对应：本地 JSON 文件或 SQLite）
- Agent 自定义名称：UserDefaults
- Agent 头像：Documents/AgentAvatars/{id}.png
- 聊天记录：**当前未持久化**（App 重启后丢失，Windows 版建议实现）

### 6.2 Windows 端建议
- 实例配置 + Agent 名称：`%APPDATA%/MyPilot/config.json`（Electron 通过 `app.getPath('userData')` 获取）
- Agent 头像：`%APPDATA%/MyPilot/AgentAvatars/{id}.png`
- 聊天记录：SQLite 数据库 `%APPDATA%/MyPilot/chat.db`（推荐 better-sqlite3 或 sql.js）

---

## 7. 安全要求

### 7.1 认证流程
1. App 连接 daemon 的 HTTP API `/api/health` 确认可达
2. 用户在服务器执行 `mypilot pair` 生成 6 位配对码（60 秒有效）
3. App 调用 `/api/pair/verify` 验证配对码
4. 验证成功获取 `deviceId` + `token`
5. 后续所有 HTTP 请求携带 `Authorization: Bearer {token}`
6. WebSocket 连接时携带 `{deviceId, token}` 认证

### 7.2 安全建议（Windows 版优先实现）
- Token 存储应使用 Electron safeStorage API（`electron.safeStorage.encryptString()`）或 Windows Credential Manager，而非明文文件
- daemon API 访问控制（当前无认证，配对后任何本地进程可访问）

---

## 8. 系统要求

### 8.1 服务器端
- Node.js 18+
- npm install -g mypilot-link
- 端口 52378 开放防火墙

### 8.2 Windows 客户端
- Windows 10 1903+ / Windows 11
- Electron 28+（Chromium 内核）
- Node.js 18+（Electron 内置）
- 网络连接

### 8.3 推荐技术栈
| 层 | 技术 | 说明 |
|---|------|------|
| 桌面框架 | **Electron 28+** | 跨平台桌面应用，Chromium 渲染 + Node.js 主进程 |
| UI 框架 | **React 18+** | 组件化 UI 开发，Hooks 状态管理 |
| 构建工具 | **Vite 5+** | 快速 HMR 开发体验，electron-vite 集成 |
| TypeScript | **TypeScript 5+** | 类型安全 |
| 状态管理 | **Zustand** 或 **Jotai** | 轻量级，适合中等复杂度应用 |
| Markdown 渲染 | **react-markdown** + **rehype-highlight** | Markdown + 代码高亮 |
| WebSocket | **原生 WebSocket** 或 **ws** | 主进程 WebSocket，IPC 转发渲染进程 |
| 样式 | **Tailwind CSS** 或 **CSS Modules** | 原子化 CSS 或模块化 |
| 数据持久化 | **better-sqlite3** | 聊天记录 SQLite 存储 |
| IPC 通信 | **Electron contextBridge** | 安全的主进程↔渲染进程通信 |
| 打包 | **electron-builder** | 生成 Windows 安装包（NSIS/便携版） |

### 8.4 项目结构建议
```
mypilot-win/
├── electron.vite.config.ts
├── package.json
├── src/
│   ├── main/                 # Electron 主进程
│   │   ├── index.ts          # 主进程入口
│   │   ├── ipc/              # IPC 通道定义
│   │   ├── services/
│   │   │   ├── ws.ts         # WebSocket 连接管理
│   │   │   ├── http.ts       # HTTP API 调用
│   │   │   └── store.ts      # 持久化存储
│   │   └── tray.ts           # 系统托盘
│   ├── preload/              # 预加载脚本
│   │   └── index.ts          # contextBridge 暴露 API
│   └── renderer/             # React 渲染进程
│       ├── src/
│       │   ├── App.tsx
│       │   ├── components/
│       │   ├── views/
│       │   │   ├── WelcomeView.tsx
│       │   │   ├── ChatView.tsx
│       │   │   ├── SettingsView.tsx
│       │   │   └── AddInstanceView.tsx
│       │   ├── stores/       # Zustand stores
│       │   ├── hooks/        # 自定义 hooks
│       │   ├── services/     # 渲染进程服务
│       │   └── styles/       # 全局样式
│       └── index.html
├── resources/                # 图标等资源
└── dist/                     # 构建输出
```

---

## 9. 版本规划建议

### Phase 1 — MVP
- 实例管理（添加/删除/切换）
- 配对流程
- WebSocket 连接与重连
- 聊天（发送/接收/流式输出）
- Agent 列表与切换
- 基础 Markdown 渲染

### Phase 2 — 体验完善
- 聊天记录持久化
- 命令面板
- 文件上传/附件
- 通知系统
- 诊断中心

### Phase 3 — 功能完善
- Agent 创建/删除/模型切换
- 定时任务管理
- 网络设置/搜索配置
- IM 通信渠道

### Phase 4 — 优化
- Markdown 代码高亮
- 消息搜索
- 拖拽文件发送
- 快捷键
- 深色模式

---

## 10. 关键文件参考

Windows 开发者可参考以下 macOS 源码理解具体实现：

| 功能 | 参考文件 |
|------|---------|
| WebSocket 通信 | `MyPilot/Services/WebSocketService.swift` |
| 连接管理 | `MyPilot/Services/ConnectionManager.swift` |
| RPC 调用 | `MyPilot/Services/AgentRpcClient.swift` |
| 流式输出 | `MyPilot/Services/ChatStreamHandler.swift` |
| 聊天逻辑 | `MyPilot/Features/Chat/ChatViewModel.swift` |
| 消息渲染 | `MyPilot/Features/Chat/MarkdownRenderer.swift` |
| 命令面板 | `MyPilot/Features/Chat/CommandPickerView.swift` |
| 实例管理 | `MyPilot/Views/AddInstanceView.swift` |
| 设置页面 | `MyPilot/Features/Settings/SettingsView.swift` |
| 诊断中心 | `MyPilot/Features/Settings/DiagnosticsCenterView.swift` |
| daemon 协议 | `开发/mypilot-link/src/daemon.js` |
| CLI 命令 | `开发/mypilot-link/src/cli.js` |
| 定时任务 | `开发/mypilot-link/src/scheduler.js` |
| 搜索配置 | `开发/mypilot-link/src/search-providers.js` |
