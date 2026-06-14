# 修复通知系统：彻底放弃 UNUserNotificationCenter

## 问题

`UNUserNotificationCenter` 在 macOS 26.5 上 ObjC 类初始化即崩溃（`+[UNUserNotificationCenter currentNotificationCenter]`），与调用时机、线程、Swift 并发隔离无关，是框架层面的 bug/不兼容。`nonisolated`、`DispatchQueue.main.async`、`@NSApplicationDelegateAdaptor` 均无法解决。

## 方案

**完全移除 `UNUserNotificationCenter`，使用 `osascript` 命令行发送系统通知 + Dock 弹跳**。

理由：
- `osascript -e 'display notification ...'` 是 macOS 原生 AppleScript 命令，不依赖任何 framework，不会崩溃
- 在所有 macOS 版本（包括 26.5）上可靠工作
- 系统通知中心正常显示，有声音提示
- 点击通知会激活 App（虽然无法直接跳转到特定对话，但 Dock 弹跳 + 激活窗口已足够）
- `NSUserNotificationCenter` 在 macOS 26 上可能也已失效（用户反馈未收到通知）

## 修改文件

### 1. `MyPilotApp.swift`

- 删除 `import UserNotifications`
- 删除 `@NSApplicationDelegateAdaptor(AppDelegate.self) var appDelegate`
- 删除 `NotificationDelegate` 类（UNUserNotificationCenterDelegate）
- 删除 `AppDelegate` 类
- `onAppear` 中无需初始化任何通知框架

### 2. `WebSocketChatFrameHandler.swift`

- 删除 `import UserNotifications`
- `sendReplyNotificationIfBackground` 改为：
  - 检查窗口可见性（`isVisible && !isMiniaturized`）
  - Dock 弹跳（`NSApp.requestUserAttention(.informationalRequest)`）
  - 通过 `Process` 调用 `osascript` 发送系统通知
  - 通知内容携带 agentId（通过标题或副标题传递）

### 具体实现

#### WebSocketChatFrameHandler.swift — sendReplyNotificationIfBackground

```swift
import Foundation
import AppKit

// ...

/// AI 回复完成时，若窗口不可见则弹通知 + Dock 弹跳
private func sendReplyNotificationIfBackground(content: String) {
    let isWindowVisible = NSApp.windows.contains { $0.isVisible && !$0.isMiniaturized }
    guard !isWindowVisible else { return }

    // Dock 图标弹跳
    NSApp.requestUserAttention(.informationalRequest)

    let agentName = self.agents.first(where: { $0.id == self.currentAgentId })?.displayName ?? "AI"
    let preview = String(content.prefix(80)).replacingOccurrences(of: "\n", with: " ")
    let body = preview.isEmpty ? "回复完成" : preview

    // 通过 osascript 发送系统通知（绕过 UNUserNotificationCenter 崩溃）
    let escapedTitle = "\(agentName) 已回复".replacingOccurrences(of: "\"", with: "\\\"")
    let escapedBody = body.replacingOccurrences(of: "\"", with: "\\\"")
    let script = "display notification \"\(escapedBody)\" with title \"\(escapedTitle)\""
    let process = Process()
    process.executableURL = URL(fileURLWithPath: "/usr/bin/osascript")
    process.arguments = ["-e", script]
    try? process.run()
}
```

#### MyPilotApp.swift — 移除所有通知相关代码

```swift
import SwiftUI

@main
struct MyPilotApp: App {
    @State private var appState = AppState()
    // ... 其他属性不变

    var body: some Scene {
        WindowGroup {
            ContentView()
                // ...
                .onAppear {
                    menuBar.start(appState: appState)
                }
                // ...
        }
        // ... commands 不变
    }
}

// ... WindowAccessor, WindowObserverView, Notification.Name 不变

// 删除 NotificationDelegate、AppDelegate 类
```

## 限制

- `osascript` 通知点击后只激活 App，无法直接跳转到特定 Agent 对话（因为无法拦截点击回调）
- 如需点击跳转功能，未来可在 App 激活后通过 `NSApplication.didBecomeActiveNotification` 检查是否有未读回复并自动跳转

## 验证

1. Xcode 编译通过（无 UNUserNotificationCenter 相关代码）
2. App 启动不崩溃
3. 发送消息后最小化窗口，AI 回复完成时弹出系统通知 + Dock 弹跳
4. 通知显示 Agent 名称和回复预览
