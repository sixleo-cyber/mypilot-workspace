# Phase 3 续行 + 剩余阶段实施计划

## 当前状态

### 已完成
- **Phase 1** ✅ 设计令牌 + 基础设施（AppColors/AppTypography/AppRadius/AdaptiveLayout/AppState/ConnectionState/7个Common组件）
- **Phase 2** ✅ 核心视图（ContentView/WelcomeView/SidebarView）
- **Phase 3 部分** ⚠️ Chat组件部分完成（SpecMessageBubble/ThinkingSection/TokenUsageBar/ChatHeader/ActionBar/AutoSizingTextView）

### 当前编译错误（2个）

1. **`MessageRow` 在 `#if os(iOS)` 块内**（ChatMessageSection.swift:488-520）
   - `MessageRow` 定义在 `#else`（即 iOS）分支内，macOS 编译时找不到
   - 修复：将 `MessageRow` 移出 `#if os(iOS)` 块，放到文件末尾（`#endif` 之后），使其跨平台可见

2. **ForEach 表达式过于复杂**（ChatMessageSection.swift:47-58）
   - 即便提取了 MessageRow，ForEach 的闭包参数中仍含复杂计算（`wsService.messages.last(where:)` 和 `visibleMessages[...]` 索引）
   - 修复：在 ForEach 之前预计算 `isLastAi` 和 `isGroupStart`，用辅助方法或简化表达式

### 占位符/冲突文件需处理

- `Components/Chat/MessageBubbleView.swift` — 已清空为 `import SwiftUI`，产生 .stringsdata 冲突
- `Components/Chat/MessageBubble.swift` — 仅含 `SpecMessageBubblePlaceholder`
- `Components/Chat/ChatBubblePlaceholder.swift` — 空文件
- 这三个文件可以整合：将 SpecMessageBubbleView.swift 的内容移入 MessageBubbleView.swift（删除 SpecMessageBubble 前缀），清理另外两个占位文件的内容使其不含冲突符号

## 修复计划

### Step 1: 修复 ChatMessageSection.swift 编译错误

**1a. 移动 MessageRow 到跨平台位置**

将 MessageRow struct（当前在 #else 块内 488-520 行）移到文件最末尾（最后一个 `#endif` 之后），确保 macOS/iOS 均可见。

**1b. 简化 ForEach 表达式**

在 ChatMessageSection body 中，将 ForEach 的复杂内联计算替换为预计算值：

```swift
// 在 ForEach 之前
let lastAiId = wsService.messages.last(where: { !$0.isFromUser && !$0.isSystem })?.id
let msgArray = Array(visibleMessages)

ForEach(Array(msgArray.enumerated()), id: \.element.id) { index, msg in
    MessageRow(
        msg: msg,
        isLastAi: !msg.isFromUser && !msg.isSystem && msg.id == lastAiId,
        isGroupStart: index > 0 && msg.isFromUser != msgArray[index - 1].isFromUser,
        serverURL: serverURL,
        isHighlighted: appState.highlightedMessageId == msg.id,
        onDelete: { wsService.messages.removeAll { $0.id == msg.id }; wsService.onMessagePersist?() },
        onRetry: { wsService.retryMessage(msg) },
        onRegenerate: nil
    )
}
```

### Step 2: 整合 Components/Chat/ 占位文件

- 将 `SpecMessageBubbleView.swift` 的 `SpecMessageBubble` 重命名为 `SpecMessageBubble`（保持不变，避免与 Features/Chat/MessageBubbleView.swift 的 `MessageBubble` 冲突）
- 清空 `MessageBubble.swift` 和 `ChatBubblePlaceholder.swift` 的结构体体（只保留空 View），避免未使用符号警告
- 保持 membershipExceptions 配置不变

### Step 3: macOS 构建验证

运行 `xcodebuild -project MyPilot.xcodeproj -scheme MyPilot -configuration Debug -destination 'platform=macOS' -skipMacroValidation build`

### Step 4: Phase 3 剩余 — InputBar 集成

当前 InputBarView.swift 使用 IMETextView，spec §5.6 要求使用 AutoSizingTextView。修改方案：

- 保留 IMETextView 作为 macOS 的主文本输入（IMETextView 有更好的 macOS 输入法支持）
- 在 InputBarView 中添加 `#if os(iOS)` 分支，iOS 使用 AutoSizingTextView
- 或者更简单：在现有 InputBarView 基础上，将 spec 的 InputBar 样式（圆角容器、边框变色、ToolbarIconButton）逐步应用到现有代码

**具体修改**：
1. `inputToolbar` 中的按钮样式：应用 spec 的 `ToolbarIconButton` / `ToolbarTextButton` 样式
2. 发送按钮：32×32 Circle + stop/arrow 切换动画（现有已实现）
3. 模型选择按钮：应用 spec 样式（Text + chevron.down + padding）
4. 外框：确保 `clipShape(RoundedRectangle(cornerRadius: AppRadius.lg))` + `strokeBorder` 边框变色

### Step 5: Phase 4 — 弹窗与浮层组件

在 `Components/Popovers/` 目录创建 6 个组件：

1. **QuickSettingsPanel.swift** — 从 InputBarView.swift 中的 QuickSettingsPanel 迁移+按 spec §5.13 重写
2. **ModelPickerPanel.swift** — 从 ModelPickerView + InputBarView 迁移+按 spec §5.14 重写
3. **AgentPickerPanel.swift** — 从 InputBarView 中的 AgentSwitcherPanel 迁移+按 spec §5.15 重写
4. **AISuggestionsPanel.swift** — 从 InputBarView 中的 SuggestionPanel 迁移+按 spec §5.16 重写
5. **MoreActionsGrid.swift** — 从 InputBarView 中的 MoreActionsGrid 迁移+按 spec §5.17 重写
6. **CommandPalette.swift** — 从 CommandPickerView 迁移+按 spec §5.18 重写

**注意**：由于这些组件已在 InputBarView.swift 中定义（QuickSettingsPanel/AgentSwitcherPanel/SuggestionPanel/MoreActionsGrid），迁移时需要：
- 在 Components/Popovers/ 中创建新的 spec 版本（用 Spec 前缀或新命名）
- 将 InputBarView.swift 中的旧版本保留（因为 ChatView 仍在使用）
- 逐步替换引用

### Step 6: Phase 5 — 设置面板

按 spec §6.6 重写 SettingsView + 更新 9 个子页面。关键变化：
- SettingsView 使用 HSplitView 布局（macOS）/ NavigationStack（iOS）
- 使用新的 SettingsRow/FormCard/FormRow 组件
- 创建 Components/Common/ 中的 SettingsRow.swift、FormCard.swift、FormRow.swift

### Step 7: Phase 6 — 完善

- 通知服务、错误处理、Reduce Motion、Dynamic Type
- Slide Over/Split View 适配
- iPad 外接键盘快捷键
- 暗色模式验证

### Step 8: Phase 7 — 全量验证

- iOS Simulator 构建
- macOS 构建
- 视觉对比 MyPilot-iPad-UI-Preview.html

## 风险与约束

1. **不能删除文件** — 用户明确拒绝删除 Components/Chat/ 下的占位文件
2. **同名文件冲突** — Components/Chat/MessageBubbleView.swift 与 Features/Chat/MessageBubbleView.swift 产生 Xcode .stringsdata 冲突，需通过 membershipExceptions 处理
3. **IMETextView vs AutoSizingTextView** — macOS 上 IMETextView 有更好的输入法支持，不应完全替换
4. **现有功能不回归** — 所有修改必须保持现有 WebSocket/消息/附件功能完整
