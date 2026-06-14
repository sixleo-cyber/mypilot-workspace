# 修复 UNUserNotificationCenter 崩溃 + 通知点击跳转

## 问题分析

`UNUserNotificationCenter.current()` 在 App 启动时崩溃，崩溃点在 `+[UNUserNotificationCenter currentNotificationCenter]`（ObjC 类方法层）。

**根因**：项目配置 `SWIFT_DEFAULT_ACTOR_ISOLATION = MainActor` + `SWIFT_APPROACHABLE_CONCURRENCY = YES`（Swift 6 严格并发模式）。`AppDelegate` 继承自 `NSObject`，在 Swift 6 默认 MainActor 隔离下，`applicationDidFinishLaunching` 被隐式标记为 `@MainActor`，但 `UNUserNotificationCenter` 的 ObjC 类初始化可能在这个隔离上下文中有问题。

**更可能的根因**：macOS 26.5 beta 上，`UNUserNotificationCenter` 需要应用有有效的 code signing 才能初始化。项目 `CODE_SIGN_STYLE = Automatic` 但没有显式设置 `CODE_SIGN_IDENTITY`，在 Xcode CLI build 时可能签名不完整，导致 `UNUserNotificationCenter` 类加载失败。

## 方案

**放弃 `UNUserNotificationCenter`，改用 `NSUserNotificationCenter`（macOS 10.8+ 原生通知 API）**。

理由：
- `NSUserNotificationCenter` 是 macOS 原生 API，不依赖 code signing，不会崩溃
- 虽然 deprecated（macOS 11.0），但在 macOS 26 上仍然可用
- 我们只需要本地通知，不需要远程推送，`NSUserNotificationCenter` 完全够用
- 点击通知跳转通过 `NSUserNotificationCenterDelegate` 的 `userNotificationCenter:didActivateNotification:` 实现

## 修改文件

### 1. `MyPilotApp.swift`
- 删除 `import UserNotifications`
- 删除 `@NSApplicationDelegateAdaptor(AppDelegate.self) var appDelegate`
- 删除 `NotificationDelegate` 类
- 删除 `AppDelegate` 类
- 恢复 `onAppear` 中初始化通知（使用 `NSUserNotificationCenter`）
- 新增 `AppNotificationDelegate` 类，实现 `NSUserNotificationCenterDelegate`

### 2. `WebSocketChatFrameHandler.swift`
- 删除 `import UserNotifications` 和 `import AppKit`
- 将 `sendReplyNotificationIfBackground` 方法改为使用 `NSUserNotificationCenter`
- 通知 userInfo 携带 `agentId`

## 具体实现

### MyPilotApp.swift

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
                    NSUserNotificationCenter.default.delegate = AppNotificationDelegate.shared
                }
                // ...
        }
        // ... commands 不变
    }
}

// ... WindowAccessor, WindowObserverView, Notification.Name 不变

/// 前台时不弹通知，点击通知时跳转到对应 Agent 对话
final class AppNotificationDelegate: NSObject, NSUserNotificationCenterDelegate {
    static let shared = AppNotificationDelegate()

    func userNotificationCenter(_ center: NSUserNotificationCenter, shouldPresent notification: NSUserNotification) -> Bool {
        // App 不在前台时才显示通知
        return !NSApp.isActive
    }

    func userNotificationCenter(_ center: NSUserNotificationCenter, didActivate notification: NSUserNotification) {
        guard let agentId = notification.userInfo?["agentId"] as? String else { return }
        let convId = "\(agentId):default"
        NSApp.activate(ignoringOtherApps: true)
        NotificationCenter.default.post(name: .switchConversation, object: nil, userInfo: [
            "conversationId": convId,
            "agentId": agentId,
        ])
    }
}
```

### WebSocketChatFrameHandler.swift

```swift
import Foundation

// 删除 import AppKit 和 import UserNotifications

// sendReplyNotificationIfBackground 改为：
private func sendReplyNotificationIfBackground(content: String) {
    guard !NSApp.isActive else { return }
    let agentName = self.agents.first(where: { $0.id == self.currentAgentId })?.displayName ?? "AI"
    let preview = String(content.prefix(80)).replacingOccurrences(of: "\n", with: " ")
    let notification = NSUserNotification()
    notification.title = "\(agentName) 已回复"
    notification.informativeText = preview.isEmpty ? "回复完成" : preview
    notification.soundName = NSUserNotificationDefaultSoundName
    notification.userInfo = ["agentId": self.currentAgentId]
    NSUserNotificationCenter.default.deliver(notification)
}
```

## 验证

1. Xcode 编译通过
2. App 启动不崩溃
3. App 在后台时收到 AI 回复弹出系统通知
4. 点击通知跳转到对应 Agent 对话
5. App 在前台时不弹通知
