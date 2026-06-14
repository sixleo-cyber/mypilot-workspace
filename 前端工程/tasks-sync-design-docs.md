# Tasks

- [x] Task 1: 读取实际代码库中的 Design Token 文件并与设计文档对比
  - [x] SubTask 1.1: 读取 `Core/DesignSystem/AppColors.swift`
  - [x] SubTask 1.2: 读取 `Core/DesignSystem/Spacing.swift`
  - [x] SubTask 1.3: 读取 `Core/DesignSystem/AppRadius.swift`
  - [x] SubTask 1.4: 读取 `Core/DesignSystem/AppTypography.swift`
  - [x] SubTask 1.5: 对比设计文档中的 Token 定义，记录差异

- [x] Task 2: 读取实际代码库中的关键视图/组件并与设计文档对比
  - [x] SubTask 2.1: 读取 `Features/Chat/ChatHeaderSection.swift`
  - [x] SubTask 2.2: 读取 `Features/Chat/ChatInputSection.swift`
  - [x] SubTask 2.3: 读取 `Views/InputBarView.swift`
  - [x] SubTask 2.4: 读取 `Views/SidebarView.swift`
  - [x] SubTask 2.5: 读取 `Features/Settings/SettingsView.swift`
  - [x] SubTask 2.6: 读取 `SharedComponents/AgentAvatarView.swift`
  - [x] SubTask 2.7: 记录组件实现与设计文档的差异

- [x] Task 3: 更新设计文档中的 Design Token 章节
  - [x] SubTask 3.1: 同步 `AppColors.swift` 的实际内容到 `MyPilot-Complete-UI-SwiftUI-Components.md`
  - [x] SubTask 3.2: 修正 `NSColor` 跨平台问题描述
  - [x] SubTask 3.3: 同步 `Spacing.swift`、`AppRadius.swift`、`AppTypography.swift`

- [x] Task 4: 更新设计文档中的组件代码
  - [x] SubTask 4.1: 修正 `SettingsGroup` 背景色问题
  - [x] SubTask 4.2: 修正 `ChatView` 的 `HSplitView` 为 `VStack`（实际代码使用 VStack）
  - [x] SubTask 4.3: 移除 macOS 文档中 iOS-only 的 Sheet API
  - [x] SubTask 4.4: 更新 `AgentAvatarView` 代码以反映实际实现（本地 > 远端 > 默认）

- [x] Task 5: 删除/替换设计文档中的 MPSymbol 自定义图标描述
  - [x] SubTask 5.1: 在 `MyPilot-Complete-UI-Design-Spec.md` 中更新 15.2 和 15.3 为回滚说明
  - [x] SubTask 5.2: 在 `MyPilot-Complete-UI-SwiftUI-Components.md` 中替换所有 `AppColors.divider` 为 `AppColors.separatorLine`
  - [x] SubTask 5.3: 在 `README.md` 中更新图标资源说明

- [x] Task 6: 在设计文档中补充缺失的业务功能
  - [x] SubTask 6.1: 补充 `/compact` 和 `/new` 命令及上下文管理 UI
  - [x] SubTask 6.2: 补充 `ErrorToast` 错误提示组件
  - [x] SubTask 6.3: 补充 `MessageDeliveryStatus` 发送状态 UI
  - [x] SubTask 6.4: 补充 `AvatarService` 头像本地存储逻辑
  - [x] SubTask 6.5: 补充 Token 用量警告及操作面板

# Task Dependencies

- Task 3 depends on Task 1
- Task 4 depends on Task 2
- Task 5 可独立执行
- Task 6 可独立执行
