# MyPilot 上线准备 (Mac + iPad) Spec

## Why
MyPilot 当前仅支持 macOS，且未做 App Store 上线准备。用户需要在 Mac 和 iPad 上同时使用，需要完成跨平台适配、App Store 合规、签名打包等上线前工作。

## What Changes
- 新增 iPadOS 目标平台支持 (macOS + iPadOS 双平台)
- 抽象 AppKit 依赖，用 `#if os(macOS)` / `#if os(iOS)` 条件编译隔离平台特定代码
- iPad 端 UI 适配 (NavigationSplitView → 适配紧凑尺寸、输入栏键盘适配、无菜单栏)
- iPad 端 Daemon 连接方式适配 (无本地 Daemon，需通过远程 Daemon 或 Relay 连接)
- App Store 上线准备 (App Icon、隐私描述、Sandbox、签名、版本号)
- iPad 端通知机制适配 (UNUserNotificationCenter 替代 osascript)

## Impact
- Affected specs: 跨平台架构、UI 布局、网络连接、通知系统、Daemon 通信
- Affected code:
  - `MyPilotApp.swift` — WindowAccessor (macOS only)
  - `MenuBarManager.swift` — 整个文件 (macOS only)
  - `IMETextView.swift` — NSViewRepresentable (macOS only)
  - `ChatMessageSection.swift` — BottomDetectorView, StreamingContentText (NSViewRepresentable)
  - `MarkdownRenderer.swift` — SelectableTextView (NSViewRepresentable)
  - `QRScannerView.swift` — NSViewRepresentable (macOS only)
  - `MessageBubbleView.swift` — NSImage, NSWorkspace
  - `WebSocketChatFrameHandler.swift` — NSApp 通知
  - `ChatView.swift` — NSApplication, Dock badge
  - `AvatarService.swift` — NSImage
  - `AttachmentPreparationService.swift` — NSImage
  - `AvatarPickerView.swift` — NSImage
  - `AgentAvatarView.swift` — NSImage
  - `AddInstanceView.swift` — NSImage
  - `AppColors.swift` — NSColor 动态色
  - `project.pbxproj` — 部署目标、支持平台、Sandbox
  - `MyPilot.entitlements` — 权限声明
  - `Info.plist` — 隐私描述

## ADDED Requirements

### Requirement: iPadOS 平台支持
系统 SHALL 支持 iPadOS 17.0+ 作为目标平台，与 macOS 共享同一代码库。

#### Scenario: iPad 上启动 App
- **WHEN** 用户在 iPad 上打开 MyPilot
- **THEN** App 正常启动，显示适配 iPad 的 UI 布局

#### Scenario: iPad 上连接 Daemon
- **WHEN** iPad 用户需要连接 Daemon
- **THEN** 用户可通过手动输入远程 Daemon 地址或扫码连接，无需本地运行 Daemon

### Requirement: AppKit 依赖条件编译
所有 AppKit (NS*) 依赖 SHALL 通过 `#if os(macOS)` 条件编译隔离，iPad 端使用 UIKit 对等实现。

#### Scenario: 编译 iPad 目标
- **WHEN** 为 iPadOS 目标编译项目
- **THEN** 所有 AppKit 引用被条件编译排除，不产生编译错误

### Requirement: iPad UI 适配
iPad 端 SHALL 提供适配触摸交互的 UI，包括：
- 输入栏适配软键盘和焦点管理
- 无菜单栏状态下的操作入口
- NavigationSplitView 在紧凑尺寸下的自适应
- 消息长按操作替代悬停操作栏

#### Scenario: iPad 竖屏使用
- **WHEN** 用户在 iPad 竖屏模式下使用
- **THEN** 侧边栏自动折叠为可滑出面板，聊天区全屏显示

### Requirement: iPad 通知机制
iPad 端 SHALL 使用 UNUserNotificationCenter 发送本地通知，替代 macOS 的 osascript 方案。

#### Scenario: iPad 后台收到 AI 回复
- **WHEN** App 在后台时 AI 回复完成
- **THEN** 系统推送本地通知，点击后回到对应对话

### Requirement: App Store 合规
App SHALL 满足 Mac App Store 和 iPad App Store 的审核要求。

#### Scenario: 提交 App Store 审核
- **WHEN** 提交 App 到 App Store
- **THEN** 通过所有自动验证检查 (签名、Sandbox、隐私描述、App Icon)

### Requirement: App Icon 完整
App Icon SHALL 包含 macOS 和 iPadOS 所有必需尺寸。

#### Scenario: App Icon 显示
- **WHEN** App 安装在设备上
- **THEN** 在 Launchpad/Dock/Home Screen 上正确显示 App Icon

## MODIFIED Requirements

### Requirement: Daemon 连接方式
原: 仅支持连接本地 Daemon (ws://127.0.0.1:52378)
改: 支持连接本地 Daemon 和远程 Daemon，iPad 端默认使用远程连接

### Requirement: 通知系统
原: 使用 osascript display notification + Dock badge
改: macOS 保留 osascript 方案，iPad 使用 UNUserNotificationCenter

## REMOVED Requirements

### Requirement: MenuBarManager iPad 支持
**Reason**: iPadOS 无系统菜单栏
**Migration**: iPad 端不初始化 MenuBarManager，功能入口移至 App 内 UI
