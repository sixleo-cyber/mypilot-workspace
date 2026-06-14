# 实施计划：设计文档 → 代码落地

## Summary

将设计文件夹中已审查并同步的三份设计文档（Design Spec、SwiftUI Components、README）中的规范，落实到 `/Users/liaoxing/Downloads/MyPilot/MyPilotApp/MyPilot/MyPilot/` 的实际代码中。重点：补齐缺失的共享组件、统一现有视图的设计 Token 使用、补齐设计规范中描述但代码中缺失的 UI 元素。

## Current State Analysis

### 已存在的文件（75 个 Swift 文件）

**Design Token（4 个，已完整）：**
- `Core/DesignSystem/AppColors.swift` — 完整的 hex/darkHex 颜色系统
- `Core/DesignSystem/Spacing.swift` — xxs~xxxl 间距
- `Core/DesignSystem/AppRadius.swift` — sm~full 圆角
- `Core/DesignSystem/AppTypography.swift` — heroNumber~nano 字号

**已实现的视图/组件：**
- ChatView、ChatHeaderSection、ChatInputSection、ChatMessageSection、MessageBubbleView
- SidebarView、WelcomeView、AddInstanceView、SearchPanelView、ContentView
- SettingsView、NetworkSettingsView、AdvancedSettingsView、AgentsManagementView
- AgentFilesView、ScheduledTasksView、UsageStatsView、DiagnosticsCenterView
- IMChannelsView、AboutView、PlaceholderSettingsPages、MemoryReadingView
- CommandPickerView、ModelPickerView、QRScannerView、SystemPromptView
- AgentAvatarView、CardContainer、ModelPill、CopyButton、AvatarPickerView、DetailTitleView、CardStates

**已实现的业务功能：**
- ErrorToast、DisconnectedBanner（在 ChatView.swift 中）
- MessageDeliveryStatus（在 MessageBubbleView.swift 中，9 种状态）
- AvatarService（完整的本地头像存储）
- TokenUsageBar（在 ChatHeaderSection.swift 中，含上下文警告和操作面板）
- ThinkingSection（思考过程折叠）

### 缺失的共享组件（设计文档 §13 中描述但代码中不存在）

| 组件 | 设计文档位置 | 状态 |
|------|-------------|------|
| `SettingsRow` | §13.1 | 不存在独立组件，SettingsView 中内联实现 |
| `SettingsGroup` | §13.1 | 不存在独立组件，SettingsView 中内联实现 |
| `IconBlock` | §13.2 | 不存在 |
| `StatusDot` | §13.3 | 不存在独立组件，IMChannelsView 中内联实现 |
| `TokenProgressBar` | §13.4 | 不存在独立组件，ChatHeaderSection 中内联实现 |

### 缺失的页面/视图

| 页面 | 设计文档编号 | 状态 |
|------|-------------|------|
| AgentDetailView | E | 不存在（AgentsManagementView 中可能有内联） |
| IMChannelDetailView | K | 不存在（IMChannelsView 中引用了但未实现） |
| SubscriptionView | N | 不存在（PlaceholderSettingsPages 占位） |

### 现有代码中的设计不一致

1. `DocumentFileCard` 和 `VideoAttachmentCard` 使用 `Color(.controlBackgroundColor)` 而非 `AppColors.surfaceCard`
2. `ImagePreviewView` 使用 `Color(.windowBackgroundColor)` 而非 `AppColors` token
3. `IMETextView` 可能未使用 AppTypography
4. 部分视图直接使用 `.font(.system(size: X))` 而非 `AppTypography`

## Proposed Changes

### Change 1: 提取共享组件 SettingsRow / SettingsGroup

**文件**: 新建 `SharedComponents/SettingsRow.swift`
**Why**: 设计文档 §13.1 描述了标准化的设置行组件，当前 SettingsView 中是内联实现，无法复用
**What**: 
- 创建 `SettingsRow`（icon + title + value + chevron + tappable）
- 创建 `SettingsGroup`（section wrapper with surfaceCard background）
- 在 SettingsView 中替换内联实现

### Change 2: 提取共享组件 IconBlock

**文件**: 新建 `SharedComponents/IconBlock.swift`
**Why**: 设计文档 §13.2 描述了统一的图标块组件（soft 背景 + 主色图标），当前各视图自行实现
**What**:
- 创建 `IconBlock`（sfSymbolName + color + size 参数）
- 在 SettingsView、AboutView 等处替换内联图标块

### Change 3: 提取共享组件 StatusDot

**文件**: 新建 `SharedComponents/StatusDot.swift`
**Why**: 设计文档 §13.3 描述了状态指示灯组件（含脉冲动画），当前 IMChannelsView 和 SettingsView 中各自内联
**What**:
- 创建 `StatusDot`（status enum: connected/disconnected/warning + pulse animation）
- 在 IMChannelsView、SettingsView 连接状态处替换内联实现

### Change 4: 统一现有代码的 Design Token 使用

**文件**: 多个文件
**Why**: 部分视图仍使用 `Color(.controlBackgroundColor)`、`Color(.windowBackgroundColor)` 等非标准 token
**What**:
- `MessageBubbleView.swift`: `Color(.controlBackgroundColor)` → `AppColors.surfaceCard`（2 处）
- `ChatView.swift` ErrorToast: `AppColors.amber300.opacity(0.08)` → `AppColors.warningSoft`
- `ChatView.swift` DisconnectedBanner: `AppColors.danger.opacity(0.08)` → `AppColors.dangerSoft`
- `CommandPickerView.swift`: `Color(.controlBackgroundColor)` → `AppColors.surfaceCard`

### Change 5: 创建 IMChannelDetailView

**文件**: 新建 `Features/Settings/IMChannelDetailView.swift`
**Why**: IMChannelsView 中已有 `NavigationLink` 指向 `IMChannelDetailView`，但该视图不存在，编译会失败或显示空白
**What**:
- 实现设计文档 §11.2 中描述的频道详情页（配置信息、状态、操作按钮）

### Change 6: 创建 AgentDetailView

**文件**: 新建 `Features/Settings/AgentDetailView.swift`
**Why**: 设计文档 §8.2 描述了 Agent 详情页，当前 AgentsManagementView 中可能缺少完整的详情视图
**What**:
- 实现设计文档 §8.2 中的 Agent 详情页（头像编辑、名称、模型、文件列表、删除）

## Assumptions & Decisions

1. **不修改已部署素材**：SVG 图标文件、Asset Catalog 不动
2. **不修改 SOUL.md**
3. **优先改代码协议层**：先提取共享组件，再统一 token 使用
4. **SubscriptionView 暂不实现**：设计文档标记为"即将推出"，保持 PlaceholderSettingsPages 占位
5. **不创建 TokenProgressBar 独立组件**：当前 ChatHeaderSection 中的实现已足够，提取收益不大
6. **SettingsRow/SettingsGroup 提取为独立文件但不强制所有视图立即迁移**：先在 SettingsView 中验证，后续逐步推广

## Verification Steps

1. 编译通过：`xcodebuild build` 无错误
2. 共享组件存在且可编译：SettingsRow.swift、IconBlock.swift、StatusDot.swift
3. Token 统一：`grep -r "Color(.controlBackgroundColor)"` 和 `grep -r "Color(.windowBackgroundColor)"` 在 Swift 文件中无结果
4. IMChannelDetailView 和 AgentDetailView 存在且可导航
5. 设计文档中描述的所有 19 个页面均有对应的 Swift 文件实现
