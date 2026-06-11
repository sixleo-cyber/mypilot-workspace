# MyPilot × Parham OpenClaw-ios 全面融合计划

## 一、目标

基于 Parham-dev/OpenClaw-ios (MIT License, 135 文件/~11k 行) 的优秀架构和功能，对 MyPilot 进行全面重构。保留 MyPilot 已验证的核心优势（WebSocket 直连、多 Agent 切换、多会话管理、全文搜索、零外部依赖），引入 Parham 的 Clean Architecture 和全功能运维面板。

## 二、当前状态

### MyPilot 现状
| 维度 | 状态 |
|------|------|
| 文件数 | 15 个 .swift |
| 代码量 | ~2000 行 |
| 平台 | 仅 macOS 14+ |
| 架构 | MVVM 变异（AppState + 内嵌 WS 管理） |
| 状态管理 | ObservableObject(@Published) + @Observable 混用 |
| 通信 | WebSocket 直连 Gateway + REST APIService 单例 |
| 渲染 | 自研正则 Markdown 解析器（内存问题反复） |
| 设计系统 | 无（样式内联） |
| 外部依赖 | 零 |
| 优势功能 | 多 Agent 切换、多会话管理、全文搜索、本地消息持久化 |

### Parham OpenClaw-ios 现状
| 维度 | 状态 |
|------|------|
| 文件数 | 135 个 .swift |
| 代码量 | ~11000 行 |
| 平台 | iOS 17+ / macOS 14+ 双平台 |
| 架构 | Clean Architecture + MVVM + Repository + DTO |
| 状态管理 | @Observable + @MainActor（Swift 6 严格并发） |
| 通信 | HTTPS REST + SSE 流式 |
| 渲染 | MarkdownUI (SPM) |
| 设计系统 | 完整 Design System tokens |
| 外部依赖 | 1 个：swift-markdown-ui |
| 优势功能 | 仪表盘、Cron 管理、执行追踪、Figma 风格评论、Memory/Skills 浏览 |
| 后端依赖 | 需 stats-server skill |

## 三、核心技术决策

### 3.1 通信层：双通道并存
```
聊天通道：WebSocket（保留 MyPilot 现有 WebSocketService）
管理通道：HTTPS REST（引入 Parham GatewayClient 模式）
```

**理由**：WebSocket 对实时双向聊天是最佳方案（低延迟、双向推送）。管理类请求（stats、tools、cron 查询）更适合 REST。

### 3.2 Markdown 渲染：MarkdownUI 替代自研
**引入 SPM 依赖**：`https://github.com/gonzalezreal/swift-markdown-ui`

**理由**：自研正则 MarkdownText 是持续内存暴涨的根源。MarkdownUI 是苹果生态最成熟的开源 Markdown 库，Parham 验证了它在 OpenClaw 场景的可靠性。

### 3.3 架构：Clean Architecture (Parham 风格)
```
View → ViewModel (@Observable, @MainActor) → Repository Protocol → GatewayClientProtocol
                                                      ↓
                                               MemoryCache (actor, TTL)
```

### 3.4 状态管理：全部迁移到 @Observable
**废弃** `ObservableObject` + `@Published`，统一使用 `@Observable` + `@MainActor`（Swift 6 严格并发模式）。

## 四、实施阶段

### Phase 1: 基础设施层（1-3 天）

#### Step 1.1: 安装 stats-server skill（服务端）
```bash
ssh root@118.145.240.41
openclaw skills install skill-ios-setup
# 在 openclaw.json 中添加 tools sessions visibility 配置
# 重启 gateway
```

#### Step 1.2: 添加 MarkdownUI SPM 依赖
在 Xcode 中添加 Package: `https://github.com/gonzalezreal/swift-markdown-ui`

#### Step 1.3: 创建 Core/ 基础架构目录
```
MyPilot/
├── Core/
│   ├── DesignSystem/
│   │   ├── Spacing.swift          # 4pt 网格系统
│   │   ├── AppColors.swift        # 语义色 token
│   │   ├── AppTypography.swift    # 字体层级 token
│   │   └── AppRadius.swift        # 圆角 token
│   ├── Formatters.swift           # 日期/Token/模型名格式化器
│   ├── MemoryCache.swift          # actor-based 泛型缓存
│   ├── LoadableViewModel.swift    # @Observable 泛型 ViewModel 基类
│   └── Networking/
│       ├── GatewayClient.swift    # GatewayClientProtocol + 实现
│       └── DTOs/                  # API 响应 DTO（Stats/Token/Cron/MCP 等）
├── Repositories/                   # Repository 协议 + Remote* 实现
│   ├── StatsRepository.swift
│   ├── CronRepository.swift
│   ├── SessionsRepository.swift
│   └── MemoryRepository.swift
├── Features/
│   ├── Chat/                      # 重构现有聊天功能
│   ├── Dashboard/                 # 新增仪表盘
│   ├── Crons/                     # 新增 Cron 管理
│   ├── Traces/                    # 新增执行追踪
│   └── MemorySkills/              # 新增 Memory/Skills 浏览
├── SharedComponents/              # 共享 UI 组件库
└── [现有文件的迁移版本]
```

#### Step 1.4: 创建设计系统 tokens (Spacing.swift)
```swift
enum Spacing {
    static let xxs: CGFloat = 4
    static let xs: CGFloat = 8
    static let sm: CGFloat = 12
    static let md: CGFloat = 16
    static let lg: CGFloat = 20
    static let xl: CGFloat = 24
    static let xxl: CGFloat = 32
    static let xxxl: CGFloat = 48
}
```

#### Step 1.5: 创建 GatewayClient（管理通道）
```swift
protocol GatewayClientProtocol {
    func stats() async throws -> StatsResponse
    func statsPost<T: Decodable>(path: String, body: Encodable) async throws -> T
    func invoke(tool: String, params: [String: Any]) async throws -> ToolResponse
    func streamChat(...) -> AsyncThrowingStream<String, Error>
}
```

#### Step 1.6: 创建 MemoryCache actor
```swift
actor MemoryCache<T> {
    private var storage: [String: (value: T, timestamp: Date)] = [:]
    private let ttl: TimeInterval
    
    func get(_ key: String) -> T? { ... }
    func set(_ key: String, value: T) { ... }
    func invalidate() { ... }
}
```

### Phase 2: 共享组件 + 聊天重构（3-5 天）

#### Step 2.1: 创建共享 UI 组件
- `CardContainer` — 仪表盘卡片外壳
- `CardLoadingView` / `CardErrorView` — 加载/错误状态
- `CopyButton` — 通用复制按钮
- `ModelPill` — 模型名胶囊徽标
- `ProviderIcon` — Provider 图标映射
- `DetailTitleView` — 导航栏标题 + 副标题
- `ElapsedTimer` — 实时计时器

#### Step 2.2: 重构 ChatViewModel
将 ChatView 中的 WebSocket 管理逻辑提取为 `ChatViewModel`：
```swift
@Observable @MainActor
final class ChatViewModel {
    let wsService: WebSocketService
    var messages: [Message] { wsService.messages }
    var isStreaming: Bool { wsService.isStreaming }
    var isProcessing: Bool { wsService.isProcessing }
    var agents: [Agent] { wsService.agents }
    // ... 所有暴露的属性
    
    func switchConversation(convId: String, agentId: String) { ... }
    func sendMessage(_ msg: Message) { ... }
    func stopGeneration() { ... }
    // ... 所有方法
}
```

#### Step 2.3: 用 MarkdownUI 替换 MarkdownText
删除 ChatView.swift 中的 MarkdownText/ParaText/MarkdownTable 等 ~200 行自定义解析器，改为：
```swift
Markdown(message.content)
    .markdownTheme(.openClaw)  // 自定义主题
    .padding(12)
    .background(Color(.controlBackgroundColor))
    .cornerRadius(16)
```

**注意**：MarkdownUI v2 不内置 `.table` 主题 API，需要自定义表格样式。

#### Step 2.4: 消息脱敏处理
参照官方 WebChat 规范，在 ChatViewModel 中添加 `sanitizeMessage()`:
- 剥离 `tool_call` / `tool_calls` / `function_call` / `function_calls` XML 块
- 剥离 control token（`NO_REPLY`、`no_reply` 等）
- 剥离 `isReasoning: true` 的推理载荷
- 剥离 `[[reply_to_*]]`、`[[audio_as_voice]]` 等指令标签

#### Step 2.5: 拆分 ChatView
将当前 1148 行 ChatView.swift 拆分为：
```
Features/Chat/
├── ChatView.swift              # ~80 行，组装子视图
├── ChatViewModel.swift         # ~200 行，业务逻辑
├── ChatHeaderSection.swift     # ~60 行
├── ChatMessageSection.swift    # ~80 行
├── ChatInputSection.swift      # ~60 行
├── MessageBubble.swift         # ~80 行
├── StreamingIndicator.swift    # ~40 行
├── ModelPickerView.swift       # ~150 行
├── CommandPickerView.swift     # ~100 行
└── SystemPromptView.swift      # ~200 行
```

### Phase 3: 管理功能（5-8 天）

#### Step 3.1: 导航重构（NavigationSplitView → TabView）
```
TabView {
    ChatTab()           # 聊天（现有核心功能）
    DashboardTab()      # 仪表盘（新增）
    CronsTab()          # Cron 管理（新增）
    MemorySkillsTab()   # Memory/Skills 浏览（新增）
    SettingsTab()       # 设置（新增）
}
```

保留 SidebarView 的部分功能（实例列表）迁移到 SettingsTab。

#### Step 3.2: DashboardTab
- `SystemHealthCard` — CPU/RAM/磁盘 环形仪表（15s 轮询）
- `CommandsCard` — 快捷命令（doctor/logs/status 等）
- `TokenUsageCard` — Token 用量图表
- `CronSummaryCard` — Cron 概览

数据源：`StatsRepository` → `GET /stats/system`、`GET /stats/tokens`

#### Step 3.3: CronsTab
- 分段选择器：Cron Jobs / History
- 任务列表 + 状态徽标
- 24h 时间线
- 详情页：purpose/model/schedule/stats
- "AI 调查"按钮

数据源：`CronRepository` → `POST /stats/exec` with `cron-list` command

#### Step 3.4: MemorySkillsTab
- 分段选择器：Memory / Skills
- Memory：段落级 Markdown 查看器
- Skills：文件夹树浏览 + SKILL.md 阅读

数据源：`MemoryRepository` → `POST /stats/exec` with `memory-list`/`skills-list`/`skill-read`

#### Step 3.5: 执行追踪（Traces）
- 步骤级追踪：system prompt → thinking → tool_call → tool_result → response
- 元数据标签（模型 + provider 图标 + tokens）
- 追踪步骤评论（Figma 风格注释）

数据源：`SessionsRepository` → `POST /tools/invoke` with `sessions_history`

### Phase 4: 保留的 MyPilot 独有功能（2-3 天）

这些功能 Parham 没有或实现较弱，必须保留：

#### Step 4.1: 多 Agent 切换
Parham 固定使用 `orchestrator` agent。MyPilot 的 `agents.list` + 动态切换是核心差异点。

实现：`AgentSwitcher` 组件从 ChatHeaderSection 移到 ChatTab 工具栏。

#### Step 4.2: 多会话管理
MyPilot 的客户端会话管理（创建/切换/删除/重命名）是独有功能。

实现：`ConversationList` 组件从 SidebarView 移到 ChatTab 侧边面板。

#### Step 4.3: 全文搜索
当前 `appState.searchMessages()` 扫描所有 conv-*.json 文件。

实现：保留逻辑，重构为 `SearchViewModel` + `SearchRepository`。

#### Step 4.4: 本地消息持久化
当前 `Documents/Messages/conv-{id}.json` 持久化方案。

保持不变，作为服务端会话的本地缓存。

### Phase 5: 清理与优化（1-2 天）

#### Step 5.1: 删除根目录过时副本
删除 `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/` 下的过时文件（MyPilotApp.swift、AppState.swift、Models/、Services/、Views/ 等），只保留 Xcode 项目结构。

#### Step 5.2: 统一为 @Observable
删除 `AppState` 中的 `ObservableObject` + `@Published`，全部改为 `@Observable @MainActor`:
```swift
@Observable @MainActor
final class AppState {
    var instances: [Instance] = []
    var currentInstance: Instance?
    // ...
}
```

#### Step 5.3: 引入 os.Logger
替换所有 `print()` 为 `os.Logger`（subsystem: `com.mypilot.app`）。

#### Step 5.4: 文件大小规范
每个文件不超过 300 行，ChatView.swift 从 1148 行拆到 ~80 行。

## 五、文件变更清单

### 新增文件（~30 个）
| 文件 | 归属 | 行数估计 |
|------|------|---------|
| `Core/DesignSystem/Spacing.swift` | 设计系统 | 20 |
| `Core/DesignSystem/AppColors.swift` | 设计系统 | 40 |
| `Core/DesignSystem/AppTypography.swift` | 设计系统 | 30 |
| `Core/DesignSystem/AppRadius.swift` | 设计系统 | 15 |
| `Core/Formatters.swift` | 工具 | 60 |
| `Core/MemoryCache.swift` | 缓存 | 50 |
| `Core/LoadableViewModel.swift` | ViewModel 基类 | 80 |
| `Core/Networking/GatewayClient.swift` | 网络层 | 150 |
| `Core/Networking/DTOs/StatsDTO.swift` | DTO | 40 |
| `Core/Networking/DTOs/CronDTO.swift` | DTO | 50 |
| `Core/Networking/DTOs/SessionsDTO.swift` | DTO | 40 |
| `Core/Networking/DTOs/MemoryDTO.swift` | DTO | 30 |
| `Repositories/StatsRepository.swift` | 数据层 | 60 |
| `Repositories/CronRepository.swift` | 数据层 | 80 |
| `Repositories/SessionsRepository.swift` | 数据层 | 60 |
| `Repositories/MemoryRepository.swift` | 数据层 | 60 |
| `SharedComponents/CardContainer.swift` | UI 组件 | 50 |
| `SharedComponents/CardLoadingView.swift` | UI 组件 | 20 |
| `SharedComponents/CardErrorView.swift` | UI 组件 | 20 |
| `SharedComponents/CopyButton.swift` | UI 组件 | 30 |
| `SharedComponents/ModelPill.swift` | UI 组件 | 40 |
| `SharedComponents/ProviderIcon.swift` | UI 组件 | 50 |
| `SharedComponents/DetailTitleView.swift` | UI 组件 | 30 |
| `SharedComponents/ElapsedTimer.swift` | UI 组件 | 30 |
| `SharedComponents/CommandButton.swift` | UI 组件 | 40 |
| `Features/Chat/ChatViewModel.swift` | 聊天 | 200 |
| `Features/Chat/StreamingIndicator.swift` | 聊天（从 ChatView 拆出） | 40 |
| `Features/Dashboard/DashboardViewModel.swift` | 仪表盘 | 80 |
| `Features/Crons/CronListViewModel.swift` | Cron | 100 |
| `Features/MemorySkills/MemoryViewModel.swift` | Memory | 80 |

### 修改文件（~10 个）
| 文件 | 变更 |
|------|------|
| `AppState.swift` | ObservableObject → @Observable @MainActor |
| `MyPilotApp.swift` | @StateObject → @State（@Observable 不需要 @StateObject） |
| `ChatView.swift` | 拆分为 ~10 个子文件（从 1148 行 → ~80 行） |
| `InputBarView.swift` | 迁移到 Features/Chat/ChatInputSection.swift |
| `SidebarView.swift` | 搜索功能保留，实例列表迁移到 Settings |
| `ContentView.swift` | NavigationSplitView → TabView |
| `WebSocketService.swift` | 保持 WebSocket 通信不变 |
| `APIService.swift` | 配对功能迁移到 GatewayClient |
| `SearchPanelView.swift` | 迁移到 Features/Chat/ |
| `AddInstanceView.swift` | 迁移到 Features/Settings/ |

### 删除内容
| 文件/代码段 | 原因 |
|------|------|
| 根目录过时文件 | 重复且不完整 |
| `ChatView.swift` 中的 MarkdownText/ParaText/MarkdownTable/SystemPromptContent（~500 行） | MarkdownUI 替代 |
| `ChatView.swift` 中的 `executeCommand` 方法 | 迁移到 ChatViewModel |

## 六、风险与注意事项

### 6.1 stats-server skill 安全风险
`/stats/exec` 端点可执行 allowlisted 命令。需确保：
- 仅内网/LAN 访问
- Bearer token 认证
- 不允许从公网直接暴露

### 6.2 MarkdownUI 表格限制
MarkdownUI v2 无内置表格主题 API。需自定义 `BlockStyle` 或保留 MarkdownTable 作为后备。

### 6.3 @Observable 迁移
从 `ObservableObject` + `@Published` 迁移到 `@Observable` 需注意：
- `@StateObject` → `@State`
- `@EnvironmentObject` → 直接传参或 `@Environment`
- `onChange(of:)` 语法变化

### 6.4 双通信通道协调
WebSocket（聊天）和 HTTPS REST（管理）需共享认证状态。GatewayClient 需复用 WebSocket 连接中的 token。

### 6.5 重新配对
架构重构后，AppState 的 `instances` 持久化格式不变，用户已配对的实例不需要重新配对。

## 七、验证计划

### Phase 1 验证
- [ ] `openclaw skills list` 确认 skill-ios-setup 已安装
- [ ] `curl http://localhost:18789/stats/system` 返回 200
- [ ] 项目编译通过
- [ ] Design system tokens 可在新代码中使用

### Phase 2 验证
- [ ] MarkdownUI 渲染效果对比——代码块、表格、列表与之前一致
- [ ] 消息脱敏后 tool_call XML 等不显示
- [ ] ChatView 拆分后原有功能正常（发送/接收/中止/模型切换）

### Phase 3 验证
- [ ] Dashboard 仪表数据正确（CPU/RAM/Token 与实际匹配）
- [ ] Cron 列表与 `openclaw cron list` 输出一致
- [ ] Memory/Skills 文件列表与实际工作区一致

### Phase 4 验证
- [ ] 多 Agent 切换正常，模型跟随切换
- [ ] 多会话创建/切换/删除正常
- [ ] 全文搜索结果可点击跳转
- [ ] 本地消息持久化在重启后仍可加载

### Phase 5 验证
- [ ] 无 print() 残留（全部 os.Logger）
- [ ] 无大于 300 行文件
- [ ] 编译无 warning
- [ ] 长时间运行无内存暴涨
