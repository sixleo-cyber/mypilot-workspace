# 同步设计文档到代码库 Spec

## Why

设计文件夹中的三份文档（README.md、MyPilot-Complete-UI-Design-Spec.md、MyPilot-Complete-UI-SwiftUI-Components.md）目前与实际代码库脱节。实际代码库位于 `/Users/liaoxing/Downloads/MyPilot/`，包含完整的 SwiftUI 项目结构。本任务旨在将设计文档中的规范同步到实际代码中，确保设计意图被正确实现，并消除文档与代码之间的不一致。

## What Changes

- 审查实际代码库中已存在的 Design Token 文件（AppColors、Spacing、AppRadius、AppTypography），与设计文档对比并同步差异
- 审查实际代码库中的视图和组件实现，修正与设计文档不一致的地方
- 删除设计文档中已回滚的自定义图标（MPSymbol / mp.*）相关描述，同步为当前使用的 SF Symbols
- 修正设计文档中发现的代码问题（NSColor 跨平台问题、SettingsGroup 背景色、ChatView 的 HSplitView 等）
- 补充设计文档中缺失的已有业务功能描述（上下文管理、ErrorToast、MessageDeliveryStatus、AvatarService 等）
- **不修改**已部署素材（图标 SVG 文件、Asset Catalog 中的图标资源）

## Impact

- Affected specs: 设计系统、聊天界面、设置页面、Agent 管理、侧边栏
- Affected code: `MyPilotApp/MyPilot/MyPilot/Core/DesignSystem/`、`Features/`、`Views/`、`SharedComponents/`
- Affected docs: `设计/MyPilot-Complete-UI-Design-Spec.md`、`设计/MyPilot-Complete-UI-SwiftUI-Components.md`、`设计/README.md`

## ADDED Requirements

### Requirement: 设计文档与代码一致性
The system SHALL 确保设计文档中描述的视觉规范、组件行为与实际 SwiftUI 代码实现保持一致。

#### Scenario: Design Token 同步
- **WHEN** 设计文档中的颜色、间距、圆角、字体定义与代码不一致
- **THEN** 以代码实现为准更新设计文档，或以设计意图为准修正代码

#### Scenario: 业务功能完整性
- **WHEN** 设计文档缺少代码中已实现的业务功能
- **THEN** 在设计文档的对应章节补充该功能的描述和 UI 规范

## MODIFIED Requirements

### Requirement: 图标系统文档
设计文档 SHALL 反映当前代码中实际使用的图标方案（Apple 内置 SF Symbols），删除已回滚的 MPSymbol / mp.* 自定义图标描述。

### Requirement: 组件代码正确性
设计文档中的 SwiftUI 组件参考代码 SHALL 修正以下问题：
- `AppColors` 中 `NSColor` 的使用需注明仅适用于 macOS 或改用 SwiftUI 跨平台方案
- `SettingsGroup` 背景色需与页面背景有区分
- `ChatView` 中的 `HSplitView` 建议改用 `NavigationSplitView`
- `Sheet` 的 `presentationDetents` 等 iOS-only API 在 macOS 文档中需移除

## REMOVED Requirements

### Requirement: MPSymbol 自定义图标
**Reason**: 项目记忆 P22 已完成回滚，所有 `mp.*` 自定义图标已替换为 Apple 内置 SF Symbols。
**Migration**: 设计文档中所有 `mp.*` 引用替换为对应的 SF Symbol 名称。
