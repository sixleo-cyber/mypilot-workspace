# 实施计划：设计规范落地 — 第二阶段

## Summary

上一阶段已完成：3 个共享组件创建（SettingsRow、IconBlock、StatusDot）、6 个文件的 Design Token 统一。本阶段聚焦：将新组件集成到现有视图中替换内联实现、统一硬编码字体为 AppTypography。

## Current State Analysis

### 新组件未被集成

| 组件 | 当前状态 | 应替换的内联实现 |
|------|---------|-----------------|
| `IconBlock` | 仅被 SettingsRow 引用 | `SettingsIconLabelStyle`（SettingsView.swift L121-138）功能与 IconBlock 完全重复 |
| `StatusDot` | 未被任何视图引用 | IMChannelsView L47-51 内联 Circle + 脉冲动画；SettingsView L17-22 内联 Circle + 脉冲动画 |
| `SettingsRow` | 未被任何视图引用 | SettingsView 中使用 NavigationLink + SettingsIconLabelStyle 组合 |

### 硬编码字体统计

73 处 `.font(.system(size: X))` 分布在 22 个文件中。按优先级分类：

**高优先级（设置/管理页面，用户高频访问）：**
- SettingsView.swift: 1 处（SettingsIconLabelStyle 内）
- IMChannelsView.swift: 1 处
- AgentsManagementView.swift: 1 处
- NetworkSettingsView.swift: 2 处
- DiagnosticsCenterView.swift: 7 处
- ScheduledTasksView.swift: 1 处
- UsageStatsView.swift: 1 处

**中优先级（聊天核心页面）：**
- ChatHeaderSection.swift: 2 处
- ChatView.swift: 4 处
- InputBarView.swift: 15 处
- MessageBubbleView.swift: 18 处（大部分是 deliveryStatus 图标，尺寸特殊，不适合替换）

**低优先级（辅助页面）：**
- AboutView.swift: 1 处
- PlaceholderSettingsPages.swift: 5 处
- AgentFilesView.swift: 3 处
- AddInstanceView.swift: 3 处
- SearchPanelView.swift: 2 处
- MemoryReadingView.swift: 1 处
- WelcomeView.swift: 1 处
- SidebarView.swift: 1 处
- ModelPickerView.swift: 1 处

### 判断：哪些 .font(.system(size:)) 应该替换

**应该替换的**：文本类字体（标题、正文、说明文字），这些有对应的 AppTypography token
**不应替换的**：图标/装饰性元素的特殊尺寸（如 deliveryStatus 的 9pt 图标、IconBlock 的动态尺寸），这些没有对应 token，硬编码是合理的

## Proposed Changes

### Change 1: SettingsView 集成 IconBlock，删除 SettingsIconLabelStyle

**文件**: `Features/Settings/SettingsView.swift`
**Why**: SettingsIconLabelStyle 与 IconBlock 功能完全重复，应统一使用 IconBlock
**What**:
- 将 `SettingsIconLabelStyle` 的 `ZStack { RoundedRectangle + Image }` 替换为 `IconBlock(icon:color:)`
- 删除 `SettingsIconLabelStyle` 结构体定义
- 保持 NavigationLink + Label 的组合不变（macOS Form 中 Label + LabelStyle 是标准模式，改为 SettingsRow 会破坏 NavigationLink 行为）

### Change 2: SettingsView 和 IMChannelsView 集成 StatusDot

**文件**: `Features/Settings/SettingsView.swift`, `Features/Settings/IMChannelsView.swift`
**Why**: 两处内联的 Circle + 脉冲动画与 StatusDot 组件功能重复
**What**:
- SettingsView L17-22: 替换内联 Circle 为 `StatusDot(status: isConnected ? .success : .warning)`
- IMChannelsView L47-51: 替换内联 Circle 为 `StatusDot(status: channel.isEnabled ? .success : .idle)`

### Change 3: 高优先级文件统一 AppTypography

**文件**: 7 个设置/管理页面文件
**Why**: 设置页面是用户高频访问的界面，字体一致性最明显
**What**: 将文本类的 `.font(.system(size: X))` 替换为对应的 AppTypography token

映射关系：
| .font(.system(size:)) | 替换为 |
|---|---|
| `.font(.system(size: 14, weight: .medium))` | `AppTypography.listTitle` |
| `.font(.system(size: 13))` | `AppTypography.body` |
| `.font(.system(size: 12))` | `AppTypography.caption` |
| `.font(.system(size: 11, weight: .semibold))` | `AppTypography.badge` |
| `.font(.system(size: 11))` | `AppTypography.data` |

涉及文件（仅替换文本类字体，不替换图标尺寸）：
- SettingsView.swift: 1 处
- IMChannelsView.swift: 1 处
- AgentsManagementView.swift: 1 处
- NetworkSettingsView.swift: 2 处
- DiagnosticsCenterView.swift: ~3 处（文本类）
- ScheduledTasksView.swift: 1 处
- UsageStatsView.swift: 1 处

### Change 4: 中优先级文件统一 AppTypography

**文件**: ChatHeaderSection.swift, ChatView.swift
**Why**: 聊天核心页面的字体一致性
**What**: 替换文本类字体（ChatView 中 ErrorToast/DisconnectedBanner 的字体、ChatHeaderSection 中的状态文字）

注意：InputBarView（15 处）和 MessageBubbleView（18 处）大部分是图标/按钮尺寸，不适合替换，跳过。

## Assumptions & Decisions

1. **SettingsView 不改用 SettingsRow**：macOS Form 中 NavigationLink + Label + LabelStyle 是标准模式，改为自定义 SettingsRow 会破坏 Form 的导航行为。仅将 LabelStyle 内部实现替换为 IconBlock。
2. **图标/装饰性字体不替换**：deliveryStatus 的 9pt 图标、IconBlock 的动态尺寸等没有对应 AppTypography token，保持 `.font(.system(size:))` 是合理的。
3. **InputBarView 和 MessageBubbleView 跳过**：这两个文件中绝大多数硬编码字体是图标/按钮尺寸，不是文本类字体，替换收益极低。
4. **不修改已部署素材**

## Verification Steps

1. `SettingsIconLabelStyle` 不再存在（被 IconBlock 替代）
2. SettingsView 和 IMChannelsView 使用 `StatusDot` 组件
3. 高/中优先级文件中的文本类字体使用 AppTypography token
4. `grep -r "SettingsIconLabelStyle" *.swift` 无结果
