# 修复：头像/名称编辑后即时全局生效

## Summary

用户在 Agent 详情页编辑头像或名称后，点击「保存修改」应立即全局生效，无需退出 App。

## Current State Analysis

### 问题根因（两个）

**问题 1：只改头像时显示"无需修改"**
- `saveAgent()` 只检查 `nameChanged || modelChanged`
- 头像在 `AvatarPickerView.chooseImage()` 中已**立即保存到磁盘**
- 但 `saveAgent()` 不知道头像改了，显示"无需修改"，且不调用 `onSave()`

**问题 2：通知机制存在但不够可靠**
- 头像：`AvatarPickerView` 保存后发 `.agentAvatarDidChange` → `AgentAvatarView` 监听 ✅
- 名称：`saveAgent()` 保存后发 `.agentNameDidChange` → 各视图 `nameToken += 1` ✅
- 但 `onSave()` 在头像-only 场景不被调用 → 父视图不刷新 agents 列表
- 且部分视图可能因 SwiftUI 差量更新缓存而 missed 通知

## Proposed Changes

### 改动 1：AgentDetailView 追踪头像变更状态

**文件**: `MyPilotApp/MyPilot/MyPilot/Features/Settings/AgentsManagementView.swift`

**改动**: 添加 `@State private var avatarModified = false`

```swift
// AvatarPickerView 的回调中追踪变更
LabeledContent("头像") {
    AvatarPickerView(agentId: agent.id) { _ in
        self.avatarModified = true
    }
}
```

### 改动 2：saveAgent() 统一处理所有变更类型

**文件**: 同上，`saveAgent()` 方法

**改动**:
- 检查三种变更：名称、模型、头像
- 任一有变更都调用 `onSave()` 刷新父列表
- 显示准确的保存消息

```swift
private func saveAgent() {
    isSaving = true
    saveMessage = nil
    let newName = agentName.trimmingCharacters(in: .whitespacesAndNewlines)
    let newModel = selectedModel.isEmpty ? nil : selectedModel
    let latestAgent = currentAgent
    let originalName = latestAgent.displayName
    let originalModel = latestAgent.model?.primary ?? ""

    let nameChanged = newName != originalName
    let modelChanged = (newModel ?? "") != originalModel
    let hasAnyChange = nameChanged || modelChanged || avatarModified

    guard hasAnyChange else {
        saveMessage = "无需修改"
        isSaving = false
        return
    }

    // 名称：本地存储
    if nameChanged { /* ... 同现有逻辑 */ }

    // 模型：Gateway RPC
    if modelChanged { /* ... 同现有逻辑 */ }

    // 头像：已在选择时保存到磁盘，此处只需确认
    // （avatarModified 标记已在 AvatarPickerView 回调中设置）

    // 统一收尾：刷新父列表 + 显示成功
    if !modelChanged || nameChanged || avatarModified {
        saveMessage = "已保存"
        onSave()
        isSaving = false
    }
}
```

### 改动 3：确保通知在所有场景下传播

**核心思路**：除了现有的 NotificationCenter 方案，额外通过 `onSave()` 触发父视图的 `loadAgents()` 刷新列表。当 `ws.agents` 数组被替换时，SidebarView / ChatHeaderSection 等依赖它的视图会自动重新渲染。

当前 `onSave()` 已调用 `loadAgents()`：
```swift
// AgentsManagementView
private func loadAgents() {
    ws?.requestAgentsList()
}
```
这会触发 `WebSocketService.agents` 更新，进而驱动所有使用 `agent.displayName` 和 `AgentAvatarView` 的视图重渲染。

### 改动 4：重置 avatarModified 状态

**文件**: 同上

在 `.onAppear` 中重置：
```swift
.onAppear {
    agentName = currentAgent.displayName
    selectedModel = currentAgent.model?.primary ?? ""
    avatarModified = false       // 新增
    loadFileList()
}
```

## Verification

```bash
cd /Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot
xcodebuild -project MyPilot.xcodeproj -scheme MyPilot -configuration Debug \
  -destination 'platform=macOS' -skipMacroValidation build
```

**手动验证步骤**:
1. 进入 Agent 设置详情页
2. 只修改头像 → 点「保存修改」→ 显示"已保存"→ 返回聊天页/侧边栏 → 头像立即更新
3. 只修改名称 → 点「保存修改」→ 显示"已保存"→ 返回 → 名称立即更新
4. 同时修改头像+名称 → 点「保存修改」→ 显示"已保存"→ 两者都立即更新
5. 退出 App 重启 → 头像和名称仍然保持（持久化验证）
