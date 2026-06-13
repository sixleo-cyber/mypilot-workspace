# 🚀 MyPilot 完整开发方案（V3 最终版）

> **项目代号**：MyPilot（自研版 ClawPilot）
> **核心目标**：私有化的 ClawPilot 替代品，iPad/Mac 原生 App 管理多个云端 OpenClaw 实例
> **技术原则**：借鉴 OpenClaw OS 的技术原理，但产品形态完全对标 ClawPilot App
> **版本**：V3 最终版
> **日期**：2026-05-26

---

## 📑 目录

1. [项目背景](#一项目背景)
2. [总体架构](#二总体架构)
3. [技术原理（借鉴 OpenClaw OS）](#三技术原理借鉴-openclaw-os)
4. [云端：MyPilot Plugin](#四云端mypilot-plugin)
5. [客户端：MyPilot App](#五客户端mypilot-app)
6. [通信协议设计](#六通信协议设计)
7. [开发阶段规划](#七开发阶段规划)
8. [部署与使用](#八部署与使用)
9. [项目结构](#九项目结构)
10. [风险与对策](#十风险与对策)

---

## 一、项目背景

### 1.1 用户需求
- 拥有多个云端 OpenClaw 实例（不同业务场景）
- 需要在 iPad 和 Mac 上随时和云端 OpenClaw 对话、管理配置
- **隐私要求高**：数据完全自主可控，不经过第三方
- **不愿用 ClawPilot 官方 App**（担心数据收集、公司倒闭、隐私泄露）

### 1.2 产品定位
**完全对标 ClawPilot**，但是**自研、自部署、自掌控**：

| 维度 | ClawPilot 官方 | MyPilot（我们）|
|------|--------------|---------------|
| **App 形态** | iOS/iPadOS/macOS App | iPad/Mac 原生 App |
| **云端组件** | `@clawpilot-app/link` | `@my-pilot/plugin`（我们的）|
| **部署命令** | `clawlink pair` | `mypilot pair` |
| **数据流向** | 经过 ClawPilot 服务器 | **只在你自己的服务器** |
| **代码所有权** | 闭源 | **完全自研、自有** |

### 1.3 参考项目
- **ClawPilot**：产品形态参考（[https://site.clawpilot.me/openclaw/clawpilot-link](https://site.clawpilot.me/openclaw/clawpilot-link)）
- **OpenClaw OS**：技术原理参考（[https://github.com/thesysdev/openclaw-os](https://github.com/thesysdev/openclaw-os)）

---

## 二、总体架构

### 2.1 三层架构图

```
┌─────────────────────────────────────────────────────────────┐
│                  Layer 1：终端设备                          │
│                  （iPad / Mac）                              │
│  ┌───────────────────────────────────────────────────────┐ │
│  │            MyPilot App（SwiftUI 原生 App）             │ │
│  │                                                       │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │ │
│  │  │ 实例列表  │  │ 侧边栏    │  │ 主聊天窗口        │   │ │
│  │  │ 多实例切换 │ │ Agents   │  │ 流式消息          │   │ │
│  │  └──────────┘  └──────────┘  └──────────────────┘   │ │
│  │                                                       │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │ │
│  │  │ 设置面板  │  │ 配对扫码  │  │ 配置管理          │   │ │
│  │  │ 145功能 │  │ QR Code  │  │ 完整 ClawPilot v2 │   │ │
│  │  └──────────┘  └──────────┘  └──────────────────┘   │ │
│  └─────────┬─────────────────────────────────────────────┘ │
└────────────┼─────────────────────────────────────────────────┘
             │ WebSocket（流式）+ HTTP（管理）
             ↓
┌─────────────────────────────────────────────────────────────┐
│                Layer 2：云服务器（多个）                     │
│                                                             │
│  ┌─────────────────────┐    ┌─────────────────────┐       │
│  │  云服务器 A          │    │  云服务器 B          │       │
│  │ ┌─────────────────┐│    │ ┌─────────────────┐ │       │
│  │ │ OpenClaw Gateway││    │ │ OpenClaw Gateway│ │       │
│  │ │ ┌─────────────┐ ││    │ │ ┌─────────────┐ │ │       │
│  │ │ │MyPilot      │ ││    │ │ │MyPilot      │ │ │       │
│  │ │ │ Plugin      │ ││    │ │ │ Plugin      │ │ │       │
│  │ │ │（我们写的） │ ││    │ │ │（我们写的） │ │ │       │
│  │ │ └─────────────┘ ││    │ │ └─────────────┘ │ │       │
│  │ │      ↓           ││    │ │      ↓          │ │       │
│  │ │ Agents 系统       ││    │ │ Agents 系统     │ │       │
│  │ └─────────────────┘│    │ └─────────────────┘ │       │
│  └─────────────────────┘    └─────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
                            ↓
                     调用 LLM API
              （智谱/豆包/Claude 等）
```

### 2.2 核心组件清单

| 组件 | 类型 | 角色 | 部署位置 |
|------|------|------|---------|
| **MyPilot App** | SwiftUI 原生 App | 终端 UI 和用户交互 | iPad / Mac |
| **MyPilot Plugin** | OpenClaw 插件（Node.js）| 服务端逻辑、HTTP 路由、配对、协议适配 | 每个 OpenClaw Gateway |
| **OpenClaw Gateway** | 现有组件（不改）| Agent 执行、LLM 调用、WebSocket | 云服务器 |

### 2.3 关键设计决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 云端架构 | **OpenClaw 插件**（不是独立服务）| 借鉴 OpenClaw OS，部署极简，对标 ClawPilot |
| 客户端架构 | **SwiftUI 原生 App** | iPad/Mac 体验最佳，离线可用 |
| 多实例管理 | **客户端本地存储 + 每实例独立连接** | 数据不集中存储，更安全 |
| 通信协议 | **OpenClaw 原生 WebSocket 协议** | 直接和 Gateway 对话，不加中间层 |
| 会话隔离 | **`:my-pilot` 后缀** | 不影响 CLI 和其他客户端 |

---

## 三、技术原理（借鉴 OpenClaw OS）

### 3.1 五大技术借鉴

#### 借鉴 1：插件化部署（核心！）

**OpenClaw OS 原理**：
```typescript
api.registerHttpRoute('/plugins/openclawos', ...)
api.registerHook('before_prompt_build', ...)
api.registerCli('os url', ...)
```

**我们的实现**：
```typescript
// MyPilot Plugin 入口
api.registerHttpRoute('/plugins/mypilot/*', handleMyPilotAPI)
api.registerHook('before_prompt_build', injectMyPilotContext)
api.registerCli('mypilot pair', generatePairingCode)
api.registerCli('mypilot status', showStatus)
```

**带来的好处**：
- ✅ 无需独立部署 Node.js 服务
- ✅ 复用 Gateway 的 HTTP/WebSocket/认证
- ✅ 无 CORS、无端口冲突、无防火墙烦恼
- ✅ 用户安装：`openclaw plugins install @my-pilot/plugin` 一行命令

#### 借鉴 2：会话 Key 后缀

**OpenClaw OS 设计**：
```
agent:main:main:openclaw-os
```

**我们的实现**：
```
agent:<agentId>:main:my-pilot
                       ↑
                我们 App 的标识
```

**好处**：
- ✅ 不与 OpenClaw CLI 冲突
- ✅ 不与飞书/Slack 渠道冲突
- ✅ 多个 MyPilot App 实例共享同一历史

#### 借鉴 3：协议类型复制

**OpenClaw OS 做法**：
> "OpenClaw 不公开导出 Gateway 协议类型，需要从源码复制"

**我们的做法**：
1. 从 OpenClaw 源码复制类型定义
2. 转换成 Swift 结构体
3. 维护一个 `GatewayProtocol.swift` 文件
4. 注释指向源码

#### 借鉴 4：流式 WebSocket

**OpenClaw OS 做法**：
- LLM 输出 token 即推送
- 前端边接收边渲染

**我们的做法**：
- SwiftUI 用 `@Published` 实现响应式
- 消息气泡支持"打字机效果"
- WebSocket 流式帧处理

#### 借鉴 5：钩子机制扩展

**OpenClaw OS 做法**：
- `before_prompt_build` 注入提示词
- `before_tool_call` 门控工具调用

**我们的做法**：
- `before_prompt_build`：检测 `:my-pilot` 后缀，注入"你正在和 MyPilot 移动客户端对话"上下文
- `after_message_complete`：记录会话历史
- `before_tool_call`：权限校验（参考 ClawPilot 的执行权限配置）

---

## 四、云端：MyPilot Plugin

### 4.1 功能职责

| 功能模块 | 说明 |
|---------|------|
| **配对管理** | 生成/验证配对码（类似 `clawlink pair`）|
| **设备注册** | iPad/Mac 设备列表管理 |
| **HTTP API** | 提供给客户端的管理接口 |
| **WebSocket 代理** | 客户端 ↔ Gateway 的消息中转 |
| **CLI 命令** | `openclaw mypilot pair/status/devices` |
| **会话钩子** | 注入 MyPilot 上下文 |

### 4.2 技术栈

| 项 | 选择 |
|----|------|
| 语言 | TypeScript |
| 运行时 | Node.js（OpenClaw 自带）|
| 构建 | esbuild |
| 测试 | Vitest |
| 插件 API | `openclaw/plugin-sdk` |

### 4.3 插件清单

```json
{
  "id": "my-pilot-plugin",
  "name": "MyPilot - 自研 ClawPilot 服务端",
  "description": "为 MyPilot iPad/Mac 客户端提供配对、管理和消息中转",
  "version": "1.0.0",
  "enabledByDefault": true,
  "activation": { "onStartup": true },
  "contracts": {
    "tools": [
      "mypilot_register_device",
      "mypilot_list_devices",
      "mypilot_revoke_device"
    ]
  },
  "configSchema": {
    "jsonSchema": {
      "type": "object",
      "properties": {
        "pairingCodeTTL": { "type": "number", "default": 300 },
        "maxDevicesPerUser": { "type": "number", "default": 10 }
      }
    }
  }
}
```

### 4.4 核心代码结构

```typescript
// src/index.ts - 插件入口
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { registerHttpRoutes } from "./http-routes";
import { registerWebSocket } from "./websocket";
import { registerHooks } from "./hooks";
import { registerCli } from "./cli";

export default definePluginEntry({
  async onLoad(api) {
    registerHttpRoutes(api);
    registerWebSocket(api);
    registerHooks(api);
    registerCli(api);
    
    api.logger.info("MyPilot Plugin loaded");
  }
});
```

### 4.5 HTTP API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/plugins/mypilot/pair/generate` | 生成配对码 |
| `POST` | `/plugins/mypilot/pair/verify` | 验证配对码 |
| `GET` | `/plugins/mypilot/devices` | 列出已配对设备 |
| `DELETE` | `/plugins/mypilot/devices/:id` | 撤销设备 |
| `GET` | `/plugins/mypilot/agents` | 获取 Agent 列表 |
| `GET` | `/plugins/mypilot/sessions` | 获取会话列表 |
| `GET` | `/plugins/mypilot/info` | 获取实例信息 |

### 4.6 WebSocket 协议

**连接方式**：
```
wss://your-gateway.com/plugins/mypilot/ws?deviceId=xxx&token=xxx
```

**消息格式**（参考 OpenClaw 协议）：
```typescript
// 客户端 → 服务端
interface ClientFrame {
  id: string;
  type: 'chat.send' | 'chat.history' | 'agents.list' | ...;
  payload: any;
}

// 服务端 → 客户端
interface ServerFrame {
  id: string;
  type: 'chat.stream' | 'chat.complete' | 'error' | ...;
  payload: any;
}
```

### 4.7 CLI 命令（对标 ClawPilot）

| ClawPilot 命令 | MyPilot 命令 | 说明 |
|--------------|-------------|------|
| `clawlink pair` | `openclaw mypilot pair` | 生成配对二维码 |
| `clawlink status` | `openclaw mypilot status` | 查看服务状态 |
| `clawlink doctor` | `openclaw mypilot doctor` | 健康检查 |
| - | `openclaw mypilot devices` | 列出已配对设备 |
| - | `openclaw mypilot revoke <id>` | 撤销设备 |

---

## 五、客户端：MyPilot App

### 5.1 完整功能清单（按 ClawPilot v2 100% 实现）

#### 🔴 核心功能（Must Have）
1. **多实例管理**（特色功能）
   - 添加/删除 OpenClaw 实例
   - 实例间快速切换
   - 实例状态监控
2. **Agent 列表 + 切换**
3. **聊天对话**（消息发送/接收）
4. **流式消息渲染**
5. **系统提示词展示**
6. **消息输入框**（含 7 个图标按钮）
7. **发送附件**（文件/图片/拍照）
8. **模型切换**
9. **配对扫码**
10. **内置指令**（/models, /status, /help 等 8 个）

#### 🟡 重要功能（Should Have）
11. **历史会话搜索**
12. **定时任务**（创建/管理）
13. **Agent 管理**（创建/编辑/删除）
14. **SOUL 设置**（输出模式/思维深度）
15. **能力插件开关**（145个）
16. **用量统计**（Token 消耗图表）
17. **记忆读取配置**
18. **执行权限配置**
19. **搜索及网页解析**

#### 🟢 增强功能（Nice to Have）
20. **语音通话设置**
21. **文件浏览器**
22. **自定义服务商**
23. **订阅管理**
24. **隐私模式**
25. **插件库**（App Store）
26. **建议功能**（AI 主动推荐）
27. **深度思考模式切换**
28. **多网络地址管理**

### 5.2 技术栈

| 项 | 选择 | 说明 |
|----|------|------|
| 语言 | Swift 5.9+ | |
| UI 框架 | SwiftUI | 跨 iPad/Mac |
| 架构 | MVVM + Clean Architecture | |
| 数据持久化 | SwiftData | iOS 17+ |
| 网络层 | URLSession + URLSessionWebSocketTask | 系统原生 |
| 依赖管理 | Swift Package Manager | |
| 目标平台 | iPadOS 17+ / macOS 14+ | |
| 二维码 | AVFoundation（扫码）| 系统 API |

### 5.3 项目结构

```
MyPilotApp/
├── MyPilotApp.swift                    # App 入口
│
├── Models/                             # 数据模型
│   ├── Instance.swift                  # OpenClaw 实例
│   ├── Agent.swift
│   ├── Message.swift
│   ├── Conversation.swift
│   ├── ModelProvider.swift
│   ├── Plugin.swift                    # 能力插件
│   └── Settings.swift
│
├── ViewModels/
│   ├── InstanceListViewModel.swift
│   ├── ChatViewModel.swift             # 流式消息处理
│   ├── AgentListViewModel.swift
│   ├── SettingsViewModel.swift
│   ├── PairingViewModel.swift          # 配对扫码
│   └── ConfigViewModel.swift
│
├── Views/
│   ├── Main/
│   │   ├── ContentView.swift           # 三栏布局（实例|侧边栏|聊天）
│   │   ├── InstanceSwitcher.swift
│   │   ├── SidebarView.swift
│   │   └── ChatView.swift
│   │
│   ├── Instance/
│   │   ├── InstanceListView.swift
│   │   ├── AddInstanceView.swift
│   │   ├── PairingView.swift           # 扫码配对
│   │   └── InstanceDetailView.swift
│   │
│   ├── Chat/
│   │   ├── MessageListView.swift
│   │   ├── MessageBubble.swift         # 支持流式渲染
│   │   ├── InputBar.swift              # 7个图标按钮
│   │   ├── SystemPromptView.swift
│   │   ├── TokenProgressBar.swift
│   │   ├── AttachmentPicker.swift
│   │   └── CommandMenu.swift           # / 触发的指令菜单
│   │
│   ├── Settings/
│   │   ├── SettingsView.swift
│   │   ├── NetworkSettingsView.swift   # 网络设置（含 145 插件）
│   │   ├── AdvancedSettingsView.swift  # 高级设置
│   │   ├── AgentsManagementView.swift  # Agents 管理
│   │   ├── SOULSettingsView.swift      # SOUL 设置
│   │   ├── PluginsView.swift           # 145 个能力插件
│   │   ├── UsageStatsView.swift        # 用量统计
│   │   ├── ScheduledTasksView.swift    # 定时任务
│   │   ├── ExecutionPermsView.swift    # 执行权限
│   │   ├── MemoryReadingView.swift     # 记忆读取
│   │   ├── SearchServicesView.swift    # 搜索服务
│   │   ├── VoiceSettingsView.swift     # 语音通话
│   │   └── SubscriptionView.swift
│   │
│   └── Components/
│       ├── AgentCard.swift
│       ├── LoadingIndicator.swift
│       ├── QRCodeScanner.swift
│       └── ToastView.swift
│
├── Services/
│   ├── APIService.swift                # REST API 调用
│   ├── WebSocketService.swift          # 流式 WebSocket
│   ├── GatewayProtocol.swift           # ⚠️ 从 OpenClaw 源码复制
│   ├── InstanceManager.swift           # 实例管理（本地存储）
│   ├── PairingService.swift            # 配对逻辑
│   ├── SessionKeyBuilder.swift         # 会话 key 构造
│   ├── MessageRouter.swift             # 消息路由
│   ├── StorageService.swift            # SwiftData 封装
│   └── QRCodeService.swift             # 扫码/生成
│
├── Utils/
│   ├── Constants.swift                 # 常量（含 :my-pilot 后缀）
│   ├── Extensions.swift
│   ├── KeychainHelper.swift            # 安全存储 Token
│   └── Logger.swift
│
└── Resources/
    ├── Assets.xcassets
    ├── Localizable.strings
    └── Info.plist
```

### 5.4 关键技术实现要点

#### 5.4.1 多实例管理

```swift
// Instance.swift
@Model
class Instance {
    var id: UUID
    var name: String                  // "火虾服务器"
    var gatewayUrl: String           // "https://server.com:18789"
    var deviceId: String             // 本设备在该实例的 ID
    var authToken: String            // 存在 Keychain
    var status: InstanceStatus       // online/offline/connecting
    var createdAt: Date
    var lastUsedAt: Date
    
    @Relationship(deleteRule: .cascade)
    var conversations: [Conversation] = []
}
```

#### 5.4.2 会话 Key 构造

```swift
// SessionKeyBuilder.swift
enum SessionKeyBuilder {
    static let MY_PILOT_SUFFIX = "my-pilot"
    
    static func build(agentId: String, channel: String = "main") -> String {
        return "agent:\(agentId):\(channel):\(MY_PILOT_SUFFIX)"
    }
}

// 使用
let sessionKey = SessionKeyBuilder.build(agentId: "main")
// 结果："agent:main:main:my-pilot"
```

#### 5.4.3 流式 WebSocket

```swift
// WebSocketService.swift
@MainActor
class WebSocketService: ObservableObject {
    @Published var streamingMessage: String = ""
    @Published var isStreaming: Bool = false
    
    private var task: URLSessionWebSocketTask?
    
    func send(_ frame: ClientFrame) async throws { ... }
    
    private func receiveLoop() async {
        guard let task = task else { return }
        
        while task.state == .running {
            do {
                let message = try await task.receive()
                if case .string(let text) = message {
                    handleFrame(text)
                }
            } catch {
                logger.error("WS receive error: \(error)")
                break
            }
        }
    }
    
    private func handleFrame(_ text: String) {
        guard let frame = decodeFrame(text) else { return }
        
        switch frame.type {
        case "chat.stream":
            // 流式追加
            streamingMessage += frame.payload.delta
            isStreaming = true
            
        case "chat.complete":
            // 消息完成
            isStreaming = false
            
        case "error":
            // 错误处理
            ...
        }
    }
}
```

#### 5.4.4 配对扫码流程

```
[iPad/Mac]                    [服务器]
    │                            │
    │  1. 用户点击"添加实例"      │
    │                            │
    │  2. 打开扫码界面            │
    │                            │
    │                            │  3. 用户在服务器跑：
    │                            │     openclaw mypilot pair
    │                            │
    │                            │  4. 终端显示二维码
    │                            │
    │  5. 扫描二维码              │
    │     (URL + pairingCode)    │
    │                            │
    │  6. POST /plugins/mypilot/ │
    │     pair/verify            │
    │     {code: "LK-XXXX..."}   │
    │  ─────────────────────────>│
    │                            │
    │                            │  7. 验证配对码
    │                            │     生成 deviceId + token
    │                            │
    │  8. 返回 {deviceId, token} │
    │  <─────────────────────────│
    │                            │
    │  9. 保存到 Keychain         │
    │     建立 WebSocket 连接    │
    │  ─────────────────────────>│
    │                            │
```

#### 5.4.5 完整功能映射

每个 ClawPilot v2 功能 → 对应的 Swift 实现：

| ClawPilot 功能 | MyPilot 实现 | API 调用 |
|--------------|--------------|---------|
| Agent 列表 | `AgentListViewModel` | `agents.list` |
| 切换模型 | `ModelPicker` | `chat.config.set` |
| 发送消息 | `ChatViewModel.send()` | `chat.send` |
| 流式接收 | `WebSocketService` | `chat.stream` 帧 |
| 历史会话 | `Conversation` model + SwiftData | `chat.history` |
| 定时任务 | `ScheduledTasksView` | `tasks.list/create` |
| 145 插件 | `PluginsView` | `plugins.list/enable` |
| SOUL 设置 | `SOULSettingsView` | `agents.config.set` |
| 用量统计 | `UsageStatsView` | `usage.stats` |

---

## 六、通信协议设计

### 6.1 RPC 帧结构

```typescript
// 基础帧
interface Frame {
  id: string;          // UUID，用于关联请求和响应
  type: string;        // RPC 方法名
  payload: any;        // 数据载荷
  timestamp: number;   // 时间戳
}
```

### 6.2 RPC 方法清单

#### 实例和设备
| 方法 | 方向 | 说明 |
|------|------|------|
| `info.get` | C→S | 获取实例信息 |
| `device.register` | C→S | 注册设备 |
| `device.heartbeat` | C→S | 心跳 |

#### Agent 和会话
| 方法 | 方向 | 说明 |
|------|------|------|
| `agents.list` | C→S | 获取 Agent 列表 |
| `chat.send` | C→S | 发送消息 |
| `chat.history` | C→S | 拉取历史 |
| `chat.stream` | S→C | 流式响应（多次）|
| `chat.complete` | S→C | 响应完成 |

#### 配置和插件
| 方法 | 方向 | 说明 |
|------|------|------|
| `config.get` | C→S | 获取配置 |
| `config.set` | C→S | 更新配置 |
| `plugins.list` | C→S | 列出插件 |
| `plugins.toggle` | C→S | 启用/禁用插件 |
| `models.list` | C→S | 列出模型 |
| `models.switch` | C→S | 切换模型 |

#### 任务和工具
| 方法 | 方向 | 说明 |
|------|------|------|
| `tasks.list` | C→S | 列出定时任务 |
| `tasks.create` | C→S | 创建任务 |
| `tools.invoke` | S→C | 工具调用通知 |

### 6.3 错误处理

```typescript
interface ErrorFrame {
  id: string;
  type: 'error';
  payload: {
    code: string;        // 'INVALID_TOKEN' | 'INSTANCE_OFFLINE' | ...
    message: string;     // 人类可读
    retryable: boolean;  // 是否可重试
  };
}
```

---

## 七、开发阶段规划

### 阶段 0：准备阶段（已完成）
- [x] 需求分析
- [x] 技术调研（OpenClaw OS）
- [x] 架构设计
- [x] 文档编写

### 阶段 1：MyPilot Plugin 开发（Week 1-2）

#### Week 1：基础框架
- [ ] 插件项目搭建
- [ ] 注册 HTTP 路由框架
- [ ] 注册 WebSocket 处理器
- [ ] 注册 CLI 命令
- [ ] 配对码服务（生成/验证）

#### Week 2：核心功能
- [ ] 设备管理（注册/列表/撤销）
- [ ] 消息中转
- [ ] 会话钩子（注入 `:my-pilot` 上下文）
- [ ] Token 认证
- [ ] 测试和发布到 npm

**交付物**：
- 可通过 `openclaw plugins install @my-pilot/plugin` 安装
- 支持 `openclaw mypilot pair` 命令
- HTTP API 完整可用

### 阶段 2：MyPilot App 框架（Week 3-4）

#### Week 3：基础 UI 框架
- [ ] Xcode 项目创建
- [ ] 三栏布局（实例|侧边栏|聊天）
- [ ] 实例列表 + 添加界面
- [ ] 二维码扫描功能
- [ ] 基础聊天界面

#### Week 4：核心交互
- [ ] WebSocket 服务封装
- [ ] 流式消息渲染
- [ ] 协议类型实现
- [ ] 本地数据存储
- [ ] 简单设置页面

**交付物**：
- App 能扫码连接到 MyPilot Plugin
- 能发送和接收消息（流式）
- 多实例切换可用

### 阶段 3：完整功能实现（Week 5-7）

#### Week 5：聊天和 Agent 功能
- [ ] 完整侧边栏（Agent 列表、搜索、底部栏）
- [ ] 消息输入栏（7 个图标按钮）
- [ ] 内置指令菜单（/models, /status 等）
- [ ] 系统提示词展示
- [ ] Token 进度条
- [ ] 文件/图片附件
- [ ] 历史会话搜索

#### Week 6：管理功能
- [ ] Agents 管理（创建/编辑/删除）
- [ ] SOUL 设置（输出模式、思维深度）
- [ ] 模型切换（多服务商）
- [ ] 145 能力插件开关
- [ ] 自定义服务商
- [ ] 网络设置（隐私、记忆、权限）

#### Week 7：高级功能
- [ ] 定时任务管理
- [ ] 用量统计图表
- [ ] 文件浏览器
- [ ] 语音通话设置
- [ ] 订阅管理

### 阶段 4：打磨上线（Week 8）
- [ ] 完整测试（功能、性能、安全）
- [ ] UI/UX 完善
- [ ] 错误处理
- [ ] 离线模式
- [ ] 性能优化
- [ ] 用户文档
- [ ] App 打包（自签或 TestFlight）

---

## 八、部署与使用

### 8.1 用户视角的完整流程（对标 ClawPilot）

#### 第一次使用（对每个 OpenClaw 实例）

**Step 1：在服务器安装插件**
```bash
ssh root@你的服务器
openclaw plugins install @my-pilot/plugin
openclaw gateway restart
```

**Step 2：生成配对码**
```bash
openclaw mypilot pair
```
**终端会显示**：
```
┌─────────────────────────────┐
│  ████  ███  ████  ███      │
│  ████  ███  ████  ███      │  ← 二维码
│  ████  ███  ████  ███      │
└─────────────────────────────┘

配对码：LK-XXXX-XXXX
有效期：5 分钟
```

**Step 3：在 iPad/Mac 上**
1. 打开 MyPilot App
2. 点击"添加实例"
3. 选择"扫描配对码"
4. 用相机扫描二维码（或手动输入配对码）
5. 自动连接成功

**Step 4：日常使用**
- 打开 App，自动连接所有已配对的实例
- 在左侧切换实例
- 在中间选择 Agent
- 在右侧聊天

### 8.2 完整命令清单

| 服务器端命令 | 作用 |
|------------|------|
| `openclaw plugins install @my-pilot/plugin` | 安装 |
| `openclaw mypilot pair` | 生成配对码 |
| `openclaw mypilot status` | 查看状态 |
| `openclaw mypilot devices` | 列出已配对设备 |
| `openclaw mypilot revoke <id>` | 撤销设备 |
| `openclaw mypilot doctor` | 健康检查 |
| `openclaw plugins uninstall @my-pilot/plugin` | 卸载 |

### 8.3 升级和维护

```bash
# 升级插件
openclaw plugins install @my-pilot/plugin@latest
openclaw gateway restart

# App 升级
通过 TestFlight 或自签证书更新
```

---

## 九、项目结构

### 9.1 仓库组织（Monorepo）

```
mypilot/
├── packages/
│   ├── plugin/                  # MyPilot Plugin（Node.js）
│   │   ├── src/
│   │   ├── package.json
│   │   ├── openclaw.plugin.json
│   │   └── README.md
│   │
│   └── ios-app/                 # MyPilot App（Xcode 项目）
│       ├── MyPilotApp.xcodeproj
│       ├── MyPilotApp/
│       └── README.md
│
├── docs/                        # 文档
│   ├── architecture.md
│   ├── deployment.md
│   ├── api-reference.md
│   └── development.md
│
├── FINAL_DEVELOPMENT_PLAN.md   # 本文档
├── README.md
└── LICENSE
```

### 9.2 命名空间

| 项 | 命名 |
|----|------|
| npm 包 | `@my-pilot/plugin` |
| OpenClaw 插件 ID | `my-pilot-plugin` |
| HTTP 路由前缀 | `/plugins/mypilot/*` |
| CLI 命令组 | `openclaw mypilot ...` |
| 会话 key 后缀 | `:my-pilot` |
| App Bundle ID | `com.yourname.mypilot` |

---

## 十、风险与对策

### 10.1 技术风险

| 风险 | 概率 | 影响 | 对策 |
|------|------|------|------|
| OpenClaw API 变更 | 中 | 高 | 锁定 OpenClaw 版本，关注 CHANGELOG |
| 协议类型变化 | 中 | 中 | 定期同步类型定义，做版本兼容 |
| WebSocket 不稳定 | 低 | 中 | 重连机制、心跳检测 |
| iPad/Mac 适配问题 | 中 | 中 | 早期就在两个平台测试 |

### 10.2 部署风险

| 风险 | 概率 | 影响 | 对策 |
|------|------|------|------|
| 影响现有 OpenClaw | 高 | 极高 | **先在测试服务器试** |
| 插件冲突 | 低 | 中 | 命名空间隔离 |
| 端口冲突 | 低 | 低 | 复用 Gateway 端口 |

### 10.3 安全风险

| 风险 | 概率 | 影响 | 对策 |
|------|------|------|------|
| Token 泄露 | 中 | 高 | Keychain 存储、HTTPS、定期轮换 |
| 配对码暴力破解 | 低 | 高 | 5 分钟过期、限流 |
| 中间人攻击 | 低 | 高 | 强制 HTTPS、证书校验 |

### 10.4 项目风险

| 风险 | 概率 | 影响 | 对策 |
|------|------|------|------|
| 开发周期延长 | 高 | 中 | MVP 优先、分阶段交付 |
| 一个人开发吃力 | 中 | 中 | 利用 AI 辅助开发 |
| 用户需求变化 | 中 | 低 | 模块化设计、易扩展 |

---

## 十一、总结

### 11.1 方案核心
1. **云端 = OpenClaw 插件**（借鉴 OpenClaw OS）
   - 部署极简（`openclaw plugins install`）
   - 完美对标 ClawPilot Link
   
2. **客户端 = SwiftUI 原生 App**
   - 完整功能（按 ClawPilot v2 100% 实现）
   - 多实例管理（特色功能）
   - 流式消息体验
   
3. **隐私 100% 保证**
   - 数据只在你自己的服务器
   - 代码完全自有
   - 不依赖任何第三方

### 11.2 时间估算
| 阶段 | 时间 | 累计 |
|------|------|------|
| 准备 | 已完成 | - |
| MyPilot Plugin | 2 周 | 2 周 |
| MyPilot App 框架 | 2 周 | 4 周 |
| 完整功能 | 3 周 | 7 周 |
| 打磨上线 | 1 周 | 8 周 |

**总计：8 周（2 个月）**

### 11.3 下一步行动

```
[✓] 完整开发方案（本文档）
[ ] ⏸ 购买测试服务器       ← 你在这里
[ ] 测试服务器装 OpenClaw
[ ] 开发 MyPilot Plugin
[ ] 在测试服务器部署验证
[ ] 开发 MyPilot App
[ ] 整体测试
[ ] 正式上线
```

---

**文档版本**：V3 最终版
**创建日期**：2026-05-26
**最后更新**：2026-05-26
**适用范围**：基于 OpenClaw 2026.4.x 及以上版本

---

## 附录 A：参考资料

- [ClawPilot Features v2](./ClawPilot_Features_v2.md) - 产品功能清单
- [OpenClaw OS 技术分析](./OPENCLAW_OS_ANALYSIS.md) - 技术原理
- [ClawPilot Link 文档](https://site.clawpilot.me/openclaw/clawpilot-link)
- [OpenClaw OS GitHub](https://github.com/thesysdev/openclaw-os)
- [OpenClaw 官方](https://openclaw.ai)

## 附录 B：术语表

| 术语 | 解释 |
|------|------|
| **MyPilot** | 我们的项目代号 |
| **Plugin** | OpenClaw 插件（云端组件）|
| **App** | iPad/Mac 客户端 |
| **Gateway** | OpenClaw 网关进程 |
| **Session Key** | 会话标识，格式：`agent:<id>:<channel>:<senderId>` |
| **Pairing Code** | 配对码，5 分钟有效 |
| **Device** | 已配对的客户端设备 |
| **Streaming** | 流式消息推送 |
| **Hook** | OpenClaw 插件钩子机制 |
