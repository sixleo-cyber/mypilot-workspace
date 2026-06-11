# 修复计划：三个用户反馈问题

## 概述
用户反馈了 3 个问题，需要逐一修复：
1. 定时任务在 App 端没有可见入口
2. AI 回复消息的气泡样式不够明显
3. 隐私模式应默认关闭，所有功能默认开启

---

## 当前状态分析

### 问题 1：定时任务无入口
- `ScheduledTasksView` 已实现，但入口藏在 `SettingsView` → 管理 → `AdvancedSettingsView` → 监控 → 定时任务，层级太深（3 层导航）
- `SettingsView` 主列表的"管理"分组中有 `AgentsManagementView` 的直接入口，但 `ScheduledTasksView` 没有
- **修复方案**：在 `SettingsView` 的"管理"分组中添加"定时任务"的直接 NavigationLink 入口

### 问题 2：AI 消息气泡不明显
- `MessageBubbleView.swift` 中 AI 消息使用 `Color(.controlBackgroundColor)` 作为气泡背景
- macOS 上 `controlBackgroundColor` 是非常浅的灰色，在浅色模式下几乎与背景融为一体
- 用户消息使用 `Color.blue` 蓝色背景，非常醒目；AI 消息的浅灰背景对比度太低
- **修复方案**：将 AI 气泡背景色改为更明显的颜色，如 `Color(.textBackgroundColor)` 或自定义浅色，并添加微妙的边框以增强视觉区分

### 问题 3：隐私模式默认值错误
- 当前 `@AppStorage("config.privacyMode") private var privacyMode = true` — 默认开启
- 用户明确表示之前选择了不要隐私模式，所有功能应默认开启
- `allowCommands` 当前默认 `false`，应改为 `true`
- `resetAllSettings()` 中的默认值也需要同步修改
- **修复方案**：
  - `privacyMode` 默认值改为 `false`
  - `allowCommands` 默认值改为 `true`
  - `resetAllSettings()` 中同步更新

---

## 具体修改

### 文件 1：`SettingsView.swift`
**路径**：`/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Settings/SettingsView.swift`

**修改内容**：在"管理"分组中，`AgentsManagementView` 之后添加"定时任务"的 NavigationLink

```swift
// 在 Section("管理") 中，AgentsManagementView 的 NavigationLink 之后添加：
NavigationLink {
    ScheduledTasksView()
} label: {
    Label("定时任务", systemImage: "clock.fill")
        .foregroundStyle(.orange)
}
```

### 文件 2：`MessageBubbleView.swift`
**路径**：`/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Chat/MessageBubbleView.swift`

**修改内容**：将 AI 消息气泡的背景色从 `Color(.controlBackgroundColor)` 改为更明显的颜色，并添加微妙边框

```swift
// 原来：
.background(Color(.controlBackgroundColor))
.cornerRadius(16)

// 改为：
.background(Color(nsColor: .textBackgroundColor))
.overlay(
    RoundedRectangle(cornerRadius: 16)
        .stroke(Color(.separatorColor).opacity(0.5), lineWidth: 0.5)
)
.clipShape(RoundedRectangle(cornerRadius: 16))
```

同时，`StreamingIndicator` 中也使用了 `Color(.controlBackgroundColor)`，需要同步修改。

### 文件 3：`NetworkSettingsView.swift`
**路径**：`/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Settings/NetworkSettingsView.swift`

**修改内容**：
1. 第 5 行：`privacyMode` 默认值从 `true` 改为 `false`
2. 第 16 行：`allowCommands` 默认值从 `false` 改为 `true`
3. 第 279-285 行：`resetAllSettings()` 中同步更新默认值

```swift
// 第 5 行：
@AppStorage("config.privacyMode") private var privacyMode = false

// 第 16 行：
@State private var allowCommands = true

// resetAllSettings() 中：
privacyMode = false; memoryEnabled = true
allowFilesystem = true; allowCommands = true; allowNetwork = true
```

---

## 验证步骤

1. **定时任务入口**：打开设置 → 管理 → 应能看到"定时任务"入口，点击可进入 `ScheduledTasksView`
2. **AI 气泡样式**：发送消息后，AI 回复应有明显的浅色背景和微妙边框，与页面背景形成视觉区分
3. **隐私模式默认值**：首次启动 App 或重置设置后，隐私模式应为关闭状态，命令执行权限应为开启状态
4. **编译验证**：`xcodebuild` 构建成功，无编译错误
