# 所有页面设计规范优化计划

## Summary

基于 V10 设计规范逐页审计，发现 3 类问题：硬编码系统颜色（9 处）、系统字体未统一为 AppTypography（~100 处但大部分在 Form/List 系统组件内无需替换）、以及组件细节差异。聚焦高价值修改。

## Current State Analysis

### 已完成（前两轮修复）
- ✅ AI 气泡边框移除
- ✅ sidebar 右边框线移除
- ✅ CardContainer 阴影 + 边框修正
- ✅ StatusDot/IconBlock/SettingsRow 共享组件集成
- ✅ 按钮尺寸统一 32×32 Circle
- ✅ 搜索框图标颜色 tertiaryText
- ✅ Section 标题 uppercase
- ✅ AppTypography monospaced token
- ✅ DiagnosticsCenterView 字体统一

### 需修复的差异

#### 类别 A: 硬编码系统颜色（应使用 AppColors token）

| # | 文件 | 行号 | 当前 | 应改为 |
|---|------|------|------|--------|
| A1 | AgentFilesView.swift | L105 | `Color(.textBackgroundColor)` | `AppColors.elevatedSurface` |
| A2 | SystemPromptView.swift | L96 | `Color(.textBackgroundColor)` | `AppColors.elevatedSurface` |
| A3 | SystemPromptView.swift | L107 | `Color(.textBackgroundColor)` | `AppColors.elevatedSurface` |
| A4 | SystemPromptView.swift | L40 | `Color(.separatorColor).opacity(0.3)` | `AppColors.separatorLine.opacity(0.3)` |
| A5 | SystemPromptView.swift | L73 | `Color(.separatorColor).opacity(0.3)` | `AppColors.separatorLine.opacity(0.3)` |
| A6 | SystemPromptView.swift | L97 | `Color(.separatorColor).opacity(0.3)` | `AppColors.separatorLine.opacity(0.3)` |
| A7 | CommandPickerView.swift | L66 | `Color(.separatorColor)` | `AppColors.separatorLine` |
| A8 | AgentsManagementView.swift | L605 | `Color(.separatorColor)` | `AppColors.separatorLine` |
| A9 | AgentsManagementView.swift | L714 | `Color(.separatorColor)` | `AppColors.separatorLine` |

#### 类别 B: 空状态页不符合规范

V10 规范 Section 11.16：
- 图标 64px，标题 17px Semibold，描述 13px secondaryText，maxWidth 280px

| # | 文件 | 差异 | 修复 |
|---|------|------|------|
| B1 | ScheduledTasksView.swift L79 | 图标 48px | → 64px |
| B2 | ScheduledTasksView.swift L84 | 标题 sectionTitle (15px) | → `AppTypography.pageTitle` (24px) 或 `.font(.system(size: 17, weight: .semibold))` |
| B3 | ScheduledTasksView.swift L87 | 描述 caption (12px) | → `AppTypography.body` (13px) |
| B4 | AgentFilesView.swift L140 | 图标 40px | → 64px |
| B5 | AgentFilesView.swift L143 | 描述 ink400 | → `AppTypography.body` + `AppColors.secondaryText` |

#### 类别 C: AdvancedSettingsView 图标颜色未用 IconBlock

V10 规范 Section 11.4 要求设置行使用 28×28 彩色图标块（IconBlock）。

| # | 文件 | 差异 | 修复 |
|---|------|------|------|
| C1 | AdvancedSettingsView.swift L11 | `Label` + `.foregroundStyle(AppColors.leaf300)` | → `Label` + IconBlock 样式 |

**注意**: AdvancedSettingsView 使用 `Label` 在 `NavigationLink` 内，macOS List 会自动渲染图标。直接替换为 IconBlock 会破坏 List 原生布局。建议保持 `Label` 但统一颜色为 V10 规范的 5 种语义色（blue/green/orange/red/gray）。

#### 类别 D: AgentFilesView 文件行样式

V10 规范 Section 11.13：
- 文件名 13px Medium → 当前 `.font(.subheadline)` (≈15px)
- 路径 12px secondaryText → 当前 `.font(.caption2)` (≈11px)

| # | 文件 | 行号 | 差异 | 修复 |
|---|------|------|------|------|
| D1 | AgentFilesView.swift L231 | 文件名 `.font(.subheadline)` | → `AppTypography.listTitle` |
| D2 | AgentFilesView.swift L234/239 | 副标题 `.font(.caption2)` | → `AppTypography.caption` |
| D3 | AgentFilesView.swift L160 | 文件头 `.font(.headline)` | → `AppTypography.sectionTitle` |
| D4 | AgentFilesView.swift L166 | 元信息 `.font(.caption)` | → `AppTypography.caption` |

#### 类别 E: SystemPromptView 边框宽度

V10 规范要求边框 0.5px，当前多处为 1px。

| # | 文件 | 行号 | 差异 |
|---|------|------|------|
| E1 | SystemPromptView.swift L40 | `lineWidth: 1` | → `lineWidth: 0.5` |
| E2 | SystemPromptView.swift L97 | `lineWidth: 1` | → `lineWidth: 0.5` |

#### 类别 F: 不修改的项目

- **系统字体 (.font(.caption), .font(.subheadline) 等)**: 约 100 处，但大部分在 Form/List/Sheet 系统组件内，macOS 会自动调整样式，替换反而破坏原生体验。仅在非系统容器内的自定义视图中替换。
- **AdvancedSettingsView Label 图标**: List NavigationLink 内的 Label 由系统渲染，无法自定义 IconBlock
- **Toggle tint 颜色**: 系统默认即可，不强制 .tint(.green)

## Proposed Changes

### Change 1: 替换 9 处硬编码系统颜色 (A1-A9)

**文件**: AgentFilesView.swift, SystemPromptView.swift, CommandPickerView.swift, AgentsManagementView.swift

- `Color(.textBackgroundColor)` → `AppColors.elevatedSurface` (3 处)
- `Color(.separatorColor)` → `AppColors.separatorLine` (6 处，含 opacity 和 lineWidth)

### Change 2: 空状态页规范统一 (B1-B5)

**文件**: ScheduledTasksView.swift, AgentFilesView.swift

ScheduledTasksView emptyState:
- 图标 48→64px
- 标题 sectionTitle → `.font(.system(size: 17, weight: .semibold))`
- 描述 caption → `AppTypography.body`

AgentFilesView 空状态:
- 图标 40→64px
- 描述 ink400 → `AppTypography.body` + `AppColors.secondaryText`

### Change 3: AgentFilesView 文件行字体统一 (D1-D4)

**文件**: AgentFilesView.swift

- L160: `.font(.headline)` → `.font(AppTypography.sectionTitle)`
- L166: `.font(.caption)` → `.font(AppTypography.caption)`
- L231: `.font(.subheadline)` → `.font(AppTypography.listTitle)`
- L234/239: `.font(.caption2)` → `.font(AppTypography.caption)`

### Change 4: SystemPromptView 边框宽度修正 (E1-E2)

**文件**: SystemPromptView.swift

- L40: `lineWidth: 1` → `lineWidth: 0.5`
- L97: `lineWidth: 1` → `lineWidth: 0.5`

## Assumptions & Decisions

1. Form/List/Sheet 内的系统字体不替换 — macOS 原生体验优先
2. AdvancedSettingsView Label 图标保持系统渲染
3. Toggle tint 保持系统默认
4. 不修改已部署素材
5. 不修改 SOUL.md

## Verification Steps

1. `grep -r "Color(.separatorColor)" *.swift` — 无结果
2. `grep -r "Color(.textBackgroundColor)" *.swift` — 无结果
3. Git commit
