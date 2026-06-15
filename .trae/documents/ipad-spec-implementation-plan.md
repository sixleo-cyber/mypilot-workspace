# MyPilot iPad 设计规范实施计划

> 按 §14 Implementation Checklist 顺序，完整复制 §2 设计令牌 + §5 的 26 个组件实现

## 概述

基于 `MyPilot-iPad-Design-Spec.md` 规范，将 iPad 端设计令牌和 26 个组件完整实施到 MyPilot 项目中。遵循 §14 七阶段顺序，每阶段完成后对照 §12 测试 Checklist 验证。

## 关键决策

| 决策项 | 选择 | 理由 |
|--------|------|------|
| AppColors 暗色模式 | 保留现有 darkHex 双模式 | macOS+iOS 均需暗色支持 |
| AdaptiveLayout | 双 struct 版本（条件编译） | iOS 用 UIScreen，macOS 用 NSScreen |
| 类型兼容 | 适配组件到现有类型 | 避免 AppState/Agent 等大范围回归 |
| 目录结构 | 按 §13 创建 Components/ 新目录 | 与 spec 对齐，保留 SharedComponents/ |

## 当前状态分析

### 已有基础设施
- `AppState.swift` — @Observable，含 instances/conversations/messages 管理
- `WebSocketService.swift` — @Observable，含流式输出/重连/Agent 管理
- `AvatarService.swift` — 跨平台，含本地头像存储
- `APIService.swift` — 网络请求服务
- `Models/` — Agent, Conversation, Instance, Message, ScheduledTask

### §2 设计令牌差距

| Token 文件 | 当前 vs Spec | 差距 |
|-----------|-------------|------|
| **AppColors** | 当前有 darkHex，spec 纯 light | 补充 spec 新增 token（quaternaryText, soft variants），保留 darkHex |
| **AppTypography** | 当前比 spec 多 captionMono/dataMono/nanoMono/nano/statusIcon/badgeMini/decorIconMd/Lg/Xl | spec 缺少这些，但项目在用；保留现有+补 spec 缺失的 nano(10pt) |
| **AppRadius** | 当前 full=.infinity, 有 card=14 | spec full=9999, 无 card；修改 full=9999, 保留 card |
| **Spacing** | 完全匹配 | 无差距 |
| **AdaptiveLayout** | 当前跨平台，缺 userBubbleMaxWidth/aiBubbleMaxWidth/sidebarWidth 等属性 | 双 struct 版本，补充所有 spec 属性 |

### §5 组件差距

26 个组件中，当前项目已有的对应实现：

| Spec 组件 | 当前位置 | 差距程度 |
|----------|---------|---------|
| BouncingDots | ChatMessageSection.swift 内联 | 需提取到独立文件+按 spec 重写 |
| MessageBubble | MessageBubbleView.swift | 需按 spec 重写（圆角/布局/状态） |
| ThinkingSection | MessageBubbleView.swift 内联 | 需按 spec 重写（折叠/动画） |
| TokenUsageBar | ChatHeaderSection.swift 内联 | 需提取+按 spec 重写 |
| ChatHeader | ChatHeaderSection.swift | 需按 spec 重写 |
| InputBar | InputBarView.swift | 需按 spec 重写（含 AutoSizingTextView） |
| SidebarAgentRow | SidebarView.swift 内联 | 需提取+按 spec 重写 |
| PillToggle | 无 | 全新 |
| StatusPill | SharedComponents/StatusDot.swift | 需按 spec 重写 |
| ActionBar | MessageBubbleView.swift (MessageActionBar) | 需按 spec 重写 |
| WelcomeStep | WelcomeView.swift (StepRow) | 需按 spec 重写 |
| AddInstanceSheet | AddInstanceView.swift | 需按 spec 重写 |
| QuickSettingsPanel | InputBarView.swift 内联 | 需提取+按 spec 重写 |
| ModelPickerPanel | ModelPickerView.swift + InputBarView 内联 | 需提取+按 spec 重写 |
| AgentPickerPanel | InputBarView.swift 内联 | 需提取+按 spec 重写 |
| AISuggestionsPanel | InputBarView.swift (SuggestionPanel) | 需提取+按 spec 重写 |
| MoreActionsGrid | InputBarView.swift 内联 | 需提取+按 spec 重写 |
| CommandPalette | CommandPickerView.swift | 需按 spec 重写 |
| EmptyStateView | 无 | 全新 |
| AttachmentChip | 无 | 全新 |
| TaskRow | 无 | 全新 |
| ChannelRow | 无 | 全新 |
| SettingsRow | SharedComponents/SettingsRow.swift | 需按 spec 重写 |
| FormCard+FormRow | SharedComponents/CardContainer.swift | 需按 spec 重写 |
| Gauge+DiagMetric | 无 | 全新 |
| ConnectionState | 无 | 全新 |

---

## 实施计划（按 §14 七阶段）

### Phase 1：基础设施

#### 1.1 复制 5 个 Token 文件

**AppColors.swift** — 保留 darkHex，补充 spec 新增 token
- 新增 `quaternaryText = Color(hex: "#C7C7CC", darkHex: "#48484A")`
- 新增 `accentSoft = info.opacity(0.14)` (当前 0.10 → 0.14)
- 新增 `warningSoft = warning.opacity(0.14)` (当前 0.10 → 0.14)
- 新增 `successSoft = success.opacity(0.14)` (当前 0.10 → 0.14)
- 新增 `dangerSoft = danger.opacity(0.14)` (当前 0.10 → 0.14)
- 保留所有现有 token（ink50-900, amber/lime/leaf 系列, provider 系列, gauge()）
- 保留 `Color(hex:darkHex:)` 扩展

**AppTypography.swift** — 补齐 spec 缺失项
- 将 `nano` 从 11pt 改为 10pt（spec 定义 nano=10pt）
- 将 `labelMicro` weight 从 .regular 改为 .semibold（spec 定义）
- 将 `actionIcon` weight 从 .medium 改为 .regular（spec 定义）
- 保留现有额外 token（captionMono, dataMono, nanoMono, statusIcon, badgeMini, decorIconMd/Lg/Xl）

**AppRadius.swift** — 对齐 spec
- `full` 从 `.infinity` 改为 `9999`（CGFloat 值）
- 保留 `card: 14`（spec 无此项但项目在用）

**Spacing.swift** — 无需修改（已匹配）

**AdaptiveLayout.swift** — 双 struct 版本
- 重构为条件编译：iOS 用 UIScreen，macOS 用 NSScreen
- 新增 `userBubbleMaxWidth` / `aiBubbleMaxWidth` 计算属性
- 新增 `sidebarWidth` (iPad=320, else=280)
- 新增 `sidebarMinWidth` = 180
- 新增 `sidebarMaxWidth` = 320
- 新增 `settingsListWidth` = 360
- 保留现有 `popoverSize(fallback:)` / `sheetMaxWidth`

**文件**：
- `Core/DesignSystem/AppColors.swift`
- `Core/DesignSystem/AppTypography.swift`
- `Core/DesignSystem/AppRadius.swift`
- `Core/DesignSystem/Spacing.swift`
- `Core/DesignSystem/AdaptiveLayout.swift`

#### 1.2 实现 AppState / ChatViewModel 骨架

AppState 已存在且功能完整，只需补充 spec 所需属性：
- 新增 `activeAgentId: String?`
- 新增 `connectionState` 属性（待 ConnectionState 枚举创建后添加）
- 新增 `unreadCount: Int`

ChatViewModel 已存在于 `Features/Chat/ChatViewModel.swift`，检查并补充：
- 确认 `isAiResponding`, `inputText` 属性存在
- 确认 streaming 双缓冲机制存在

**文件**：`AppState.swift`, `Features/Chat/ChatViewModel.swift`

#### 1.3 WebSocketService

已存在且功能完整，无需修改。

#### 1.4 AvatarService

已存在且功能完整，无需修改。`localAvatarPath(for:)` 方法需确认接口与 spec AgentAvatar 组件兼容。

#### 1.5 实现 MyPilotBrandMark 组件

从 spec §3.1 复制 `MyPilotBrandMark` View，创建新文件。

**文件**：`Components/Common/MyPilotBrandMark.swift`

#### 1.6 实现 BouncingDots / AgentAvatar / PillToggle

- **BouncingDots** — 从 spec §5.1 复制，创建 `Components/Common/BouncingDots.swift`。删除 ChatMessageSection.swift 中的旧实现。
- **AgentAvatar** — 从 spec §4 复制，适配到现有 `Agent` 模型。创建 `Components/Common/AgentAvatar.swift`。需检查 `AvatarService.shared.localAvatarPath(for:)` 接口。
- **PillToggle** — 从 spec §5.8 复制，创建 `Components/Common/PillToggle.swift`

**文件**：
- `Components/Common/BouncingDots.swift`
- `Components/Common/AgentAvatar.swift`
- `Components/Common/PillToggle.swift`

#### Phase 1 验证（§12 测试）

- [ ] 所有 token 引用正确（AppColors/AppTypography/AppRadius/Spacing）
- [ ] macOS 编译通过（xcodebuild macOS target）
- [ ] iOS 编译通过（xcodebuild iOS Simulator target）
- [ ] 新组件无硬编码颜色/字号/圆角

---

### Phase 2：核心视图

#### 2.1 ContentView (NavigationSplitView)

按 spec §6.2 / §10.4 重写 ContentView：
- 使用 `@Environment(\.horizontalSizeClass)` 适配
- sidebar 宽度：`.navigationSplitViewColumnWidth(min: 180, ideal: sizeClass == .regular ? 320 : 240, max: 360)`
- 保留现有 `columnVisibility` / `selectedConversationId` 状态
- 保留 macOS 兼容：`#if os(macOS)` 处理 sidebar frame

**文件**：`Views/ContentView.swift`

#### 2.2 WelcomeView

按 spec §6.5 重写 WelcomeView：
- 使用 `MyPilotBrandMark` 替换 SF Symbol 天线图标
- 使用 `WelcomeStep` 组件替换当前 StepRow
- 居中布局，maxWidth: 520
- 保留 `showingAddInstance` sheet 触发

**文件**：`Views/WelcomeView.swift`

#### 2.3 AddInstanceView (Step 1 + Step 2 + QR)

按 spec §5.12 重写为 `AddInstanceSheet`：
- 2 步流程（serverURL → pairingCode）
- 使用 spec 的布局和样式
- 保留现有 QR 扫描功能
- Frame: 500×450

**文件**：`Views/AddInstanceView.swift`

#### 2.4 SidebarView (含 SearchField / Instance / Agent / Conv rows)

按 spec §6.3 重写 SidebarView：
- 搜索框样式按 spec
- 使用 `SidebarAgentRow` (spec §5.7) 替换当前 AgentRow
- Footer：添加实例按钮 + 设置按钮
- 背景：`AppColors.surfaceCard`
- 保留现有实例/Agent/会话数据绑定逻辑

**文件**：`Views/SidebarView.swift`

#### 2.5 ChatView 骨架

按 spec §6.4 重写 ChatView 骨架：
- ChatHeader → TokenUsageBar → ScrollView(LazyVStack) → InputBar
- 使用 spec 的组件名称和布局
- 保留现有 viewModel 数据绑定
- popover 展示 QuickSettingsPanel

**文件**：`Views/ChatView.swift`

#### Phase 2 验证（§12 测试）

- [ ] NavigationSplitView 在 iPad 横屏/纵屏正确显示
- [ ] WelcomeView 居中显示，步骤清晰
- [ ] AddInstanceView 2 步流程完整
- [ ] SidebarView 搜索/实例/Agent/会话正确
- [ ] ChatView 骨架加载无崩溃

---

### Phase 3：聊天组件

#### 3.1 ChatHeaderSection

按 spec §5.5 重写为 `ChatHeader`：
- AgentAvatar + 名称 + chevron + 模型 + 状态 + 延迟 + IconButton 组
- 使用 spec 的 IconButton 组件
- 保留现有连接状态、延迟数据绑定

**文件**：`Components/Chat/ChatHeaderSection.swift`

#### 3.2 InputBarView (含 AutoSizingTextView)

按 spec §5.6 重写为 `InputBar`：
- AutoSizingTextView (UIViewRepresentable) 替换 IMETextView
- Toolbar：paperclip + 更多 + 模型选择 + 发送/停止按钮
- 圆角容器：AppRadius.lg, 边框随输入状态变色
- 保留附件功能绑定

**文件**：`Components/Input/InputBarView.swift`, `Components/Input/AutoSizingTextView.swift`

#### 3.3 MessageBubbleView (含 Thinking / Action / Status)

按 spec §5.2 重写为 `MessageBubble`：
- 用户气泡：18/18/4/18 圆角，蓝色
- AI 气泡：4/18/18/18 圆角，灰色
- 包含 ThinkingSection (spec §5.3) 和 ActionBar (spec §5.10)
- statusIcon 按 spec 状态机实现
- 保留现有附件显示功能（集成到 spec 布局中）

**文件**：
- `Components/Chat/MessageBubbleView.swift`
- `Components/Chat/ThinkingSection.swift`

#### 3.4 TokenUsageBar

按 spec §5.4 提取并重写：
- 进度条 + in/out/cache 标签 + 费用 + 上下文比
- 使用 spec 布局和颜色

**文件**：`Components/Chat/TokenUsageBar.swift`

#### 3.5 MarkdownRenderer

检查现有 `Features/Chat/MarkdownRenderer.swift`，确保与 spec 兼容。无需大改。

**文件**：`Features/Chat/MarkdownRenderer.swift`（保留现有）

#### Phase 3 验证（§12 测试）

- [ ] 消息气泡圆角正确（用户 vs AI）
- [ ] ThinkingSection 折叠/展开动画正常
- [ ] ActionBar 复制/重新生成/删除功能正常
- [ ] TokenUsageBar 进度条颜色随百分比变化
- [ ] InputBar 自动增高，发送按钮状态正确
- [ ] BouncingDots 动画三点错位 0.18s

---

### Phase 4：弹窗与浮层

#### 4.1 QuickSettingsPanel

按 spec §5.13 创建：
- 切换模型 / 详细输出 / 推理模式 / 重启会话 / 连接状态
- 使用 PillToggle 组件

**文件**：`Components/Popovers/QuickSettingsPanel.swift`

#### 4.2 ModelPickerPanel

按 spec §5.14 创建：
- 按 provider 分组的模型列表
- 选中项高亮 + checkmark

**文件**：`Components/Popovers/ModelPickerPanel.swift`

#### 4.3 AgentPickerPanel

按 spec §5.15 创建：
- Agent 列表 + 添加新 Agent 按钮
- 使用 AgentAvatar 组件

**文件**：`Components/Popovers/AgentPickerPanel.swift`

#### 4.4 AISuggestionsPanel

按 spec §5.16 创建：
- AI 建议操作列表
- Suggestion 结构体定义

**文件**：`Components/Popovers/AISuggestionsPanel.swift`

#### 4.5 MoreActionsGrid

按 spec §5.17 创建：
- 2×4 网格：图片/文件/语音/拍照/指令/@Agent/剪贴板/更多

**文件**：`Components/Popovers/MoreActionsGrid.swift`

#### 4.6 CommandPalette

按 spec §5.18 创建：
- ⌘K 搜索栏 + 分组结果列表
- CommandItem / Kind 定义

**文件**：`Components/Popovers/CommandPalette.swift`

#### Phase 4 验证（§12 测试）

- [ ] 所有 popover 出现有 fade + scale 动画
- [ ] ModelPickerPanel 选中项高亮
- [ ] MoreActionsGrid 2×4 布局正确
- [ ] CommandPalette 搜索过滤正常

---

### Phase 5：设置面板

#### 5.1 SettingsView (NavigationStack + HSplitView)

按 spec §6.6 重写：
- NavigationStack + HSplitView 布局
- 左侧 360pt 设置列表，右侧详情
- 使用 SettingsRow 组件
- 连接状态头部
- 三个分区：配置/管理/其他

**文件**：`Features/Settings/SettingsView.swift`

#### 5.2 NetworkSettingsView

保留现有实现，确保使用 spec token。

**文件**：`Features/Settings/NetworkSettingsView.swift`

#### 5.3 AgentFilesView

保留现有实现，确保使用 spec token。

**文件**：`Features/Settings/AgentFilesView.swift`

#### 5.4 AgentsManagementView

检查并适配，确保使用 spec token 和 FormCard/FormRow 组件。

**文件**：`Features/Settings/AgentsManagementView.swift`

#### 5.5 IMChannelsView

按 spec §5.22 ChannelRow 样式更新，使用 StatusPill 组件。

**文件**：`Features/Settings/IMChannelsView.swift`

#### 5.6 ScheduledTasksView

按 spec §5.21 TaskRow 样式更新，使用 PillToggle 组件。

**文件**：`Features/Settings/ScheduledTasksView.swift`

#### 5.7 MemoryReadingView

保留现有实现，确保使用 spec token。

**文件**：`Features/Settings/MemoryReadingView.swift`

#### 5.8 DiagnosticsCenterView

按 spec §5.25 Gauge/DiagMetric 样式更新。

**文件**：`Features/Settings/DiagnosticsCenterView.swift`

#### 5.9 UsageStatsView

按 spec §5.25 Gauge 样式更新。

**文件**：`Features/Settings/UsageStatsView.swift`

#### 5.10 SearchProvidersView

检查 `PlaceholderSettingsPages.swift` 中是否有占位实现，补充完整页面。

**文件**：`Features/Settings/PlaceholderSettingsPages.swift` 或新建

#### Phase 5 验证（§12 测试）

- [ ] SettingsView HSplitView 布局正确
- [ ] 设置列表 360pt，详情区自适应
- [ ] 所有子页面加载无崩溃
- [ ] SettingsRow 图标颜色正确
- [ ] TaskRow toggle 和 run now 功能正常

---

### Phase 6：完善

#### 6.1 通知服务

按 spec §11 实现 iPad 端通知：
- 系统通知 (UNUserNotificationCenter)
- 未读计数 (AppState.unreadCount)

#### 6.2 错误处理

按 spec §10.2 Error States 检查现有错误处理是否完备。

#### 6.3 Reduce Motion / Dynamic Type 适配

按 spec §8.3 实现：
- 检查 `UIAccessibility.isReduceMotionEnabled`
- Dynamic Type：所有字号使用 AppTypography 而非硬编码

#### 6.4 Slide Over / Split View 适配

按 spec §10.4 iPad 特殊处理：
- 宽度 < 500pt → 隐藏 sidebar
- 宽度 500-900pt → sidebar 240pt
- 宽度 > 900pt → sidebar 320pt

#### 6.5 iPad 外接键盘快捷键

- ⌘K → 唤起 CommandPalette
- ⌘N → 新建会话
- ⌘/ → 切换侧边栏

#### 6.6 暗色模式

已通过 AppColors darkHex 支持基础暗色。检查所有组件在暗色模式下视觉正确。

#### Phase 6 验证（§12 测试）

- [ ] Reduce Motion 模式下动画正确降级
- [ ] Slide Over / Split View 各尺寸正确
- [ ] ⌘K/⌘N/⌘/ 快捷键响应
- [ ] 暗色模式下所有 token 正确翻转

---

### Phase 7：验证

#### 7.1 iOS Simulator 构建

```bash
xcodebuild -project MyPilot.xcodeproj -scheme MyPilot \
  -destination 'platform=iOS Simulator,name=iPad Pro 13-inch (M4)' \
  -skipMacroValidation build
```

#### 7.2 macOS 构建（确保跨平台不回归）

```bash
xcodebuild -project MyPilot.xcodeproj -scheme MyPilot \
  -configuration Debug -destination 'platform=macOS' \
  -skipMacroValidation build
```

#### 7.3 视觉对比

在 iPad Pro 13" / 11" / Air / mini 模拟器逐屏截图，对比 `MyPilot-iPad-UI-Preview.html`

#### 7.4 §12 测试 Checklist 全量验证

- [ ] §12.1 视觉测试（5 项）
- [ ] §12.2 状态机测试（4 项）
- [ ] §12.3 动画测试（4 项）
- [ ] §12.4 性能测试（4 项）
- [ ] §12.5 兼容性测试（6 项）

---

## 需创建的新文件清单

```
Components/
├── Chat/
│   ├── ChatHeaderSection.swift      (从 Features/Chat/ 迁移重写)
│   ├── MessageBubbleView.swift      (从 Features/Chat/ 迁移重写)
│   ├── ThinkingSection.swift        (从 MessageBubbleView 中提取)
│   └── TokenUsageBar.swift          (从 ChatHeaderSection 中提取)
├── Input/
│   ├── InputBarView.swift           (从 Views/ 迁移重写)
│   ├── AttachmentChip.swift         (全新)
│   └── AutoSizingTextView.swift     (全新)
├── Common/
│   ├── AgentAvatar.swift            (全新, spec §4)
│   ├── BouncingDots.swift           (从 ChatMessageSection 提取重写)
│   ├── PillToggle.swift             (全新, spec §5.8)
│   ├── StatusPill.swift             (全新, spec §5.9)
│   ├── ActionBar.swift              (全新, spec §5.10)
│   ├── IconButton.swift             (全新, spec §5.5)
│   ├── FormCard.swift               (全新, spec §5.24)
│   ├── FormRow.swift                (全新, spec §5.24)
│   ├── SettingsRow.swift            (全新, spec §5.23, 替代 SharedComponents/)
│   ├── EmptyStateView.swift         (全新, spec §5.19)
│   └── MyPilotBrandMark.swift       (全新, spec §3.1)
└── Popovers/
    ├── QuickSettingsPanel.swift     (从 InputBarView 提取重写)
    ├── ModelPickerPanel.swift       (从 ModelPickerView + InputBarView 提取重写)
    ├── AgentPickerPanel.swift       (从 InputBarView 提取重写)
    ├── AISuggestionsPanel.swift     (从 InputBarView 提取重写)
    ├── MoreActionsGrid.swift        (从 InputBarView 提取重写)
    └── CommandPalette.swift         (从 CommandPickerView 重写)
```

## 需修改的现有文件清单

| 文件 | 修改内容 |
|------|---------|
| `Core/DesignSystem/AppColors.swift` | 补充 quaternaryText, soft variants opacity 值 |
| `Core/DesignSystem/AppTypography.swift` | nano 11→10pt, labelMicro .regular→.semibold, actionIcon .medium→.regular |
| `Core/DesignSystem/AppRadius.swift` | full .infinity→9999 |
| `Core/DesignSystem/AdaptiveLayout.swift` | 双 struct 版本 + 新增属性 |
| `AppState.swift` | 补充 activeAgentId, connectionState, unreadCount |
| `Views/ContentView.swift` | 按 spec §6.2 重写 NavigationSplitView |
| `Views/WelcomeView.swift` | 按 spec §6.5 重写 |
| `Views/AddInstanceView.swift` | 按 spec §5.12 重写为 AddInstanceSheet |
| `Views/SidebarView.swift` | 按 spec §6.3 重写，使用新组件 |
| `Views/ChatView.swift` | 按 spec §6.4 重写骨架 |
| `Features/Chat/ChatMessageSection.swift` | 移除内联 BouncingDots，引用新组件 |
| `Features/Settings/SettingsView.swift` | 按 spec §6.6 重写 HSplitView 布局 |

## 假设与风险

1. **@Observable 宏** — Xcode CLI 构建可能有 @Observable 宏展开问题（swift-plugin-server bug），最终验证可能需要在 Xcode IDE 中完成
2. **组件数据适配** — spec 组件使用的 Agent/ChatMessage 属性可能与现有模型不完全匹配，需要逐个适配
3. **现有功能回归** — SidebarView/ChatView/InputBarView 重写后，需确保现有 WebSocket 连接、消息发送、附件等核心功能不回归
4. **SharedComponents/ 共存** — 新 Components/ 目录与旧 SharedComponents/ 共存期间，需避免命名冲突

## 验证命令

```bash
# macOS 构建
xcodebuild -project MyPilot.xcodeproj -scheme MyPilot \
  -configuration Debug -destination 'platform=macOS' \
  -skipMacroValidation build

# iOS Simulator 构建
xcodebuild -project MyPilot.xcodeproj -scheme MyPilot \
  -destination 'platform=iOS Simulator,name=iPad Pro 13-inch (M4)' \
  -skipMacroValidation build
```
