# MyPilot SwiftUI 组件参考

> 19 个核心页面 / 组件的 SwiftUI 实现参考
> 复制即用，遵循项目设计 token（`AppColors` / `AppTypography` / `Spacing` / `AppRadius`）
> 版本：v1.0 · 2026-06-13

---

## 目录

1. [Design Tokens](#1-design-tokens)
2. [基础组件](#2-基础组件)
3. [主聊天页（ChatView）](#3-主聊天页chatview)
4. [欢迎页（WelcomeView）](#4-欢迎页welcomeview)
5. [添加实例（AddInstanceView）](#5-添加实例addinstanceview)
6. [设置主页（SettingsView）](#6-设置主页settingsview)
7. [网络设置（NetworkSettingsView）](#7-网络设置networksettingsview)
8. [Agents 管理（AgentsManagementView）](#8-agents-管理agentsmanagementview)
9. [Agent 详情（AgentDetailView）](#9-agent-详情agentdetailview)
10. [Agent 文件（AgentFilesView）](#10-agent-文件agentfilesview)
11. [定时任务（ScheduledTasksView）](#11-定时任务scheduledtasksview)
12. [运行统计（UsageStatsView）](#12-运行统计usagestatsview)
13. [诊断中心（DiagnosticsCenterView）](#13-诊断中心diagnosticscenterview)
14. [IM 渠道（IMChannelsView）](#14-im-渠道imchannelsview)
15. [频道详情（ChannelDetailView）](#15-频道详情channeldetailview)
16. [高级设置（AdvancedSettingsView）](#16-高级设置advancedsettingsview)
17. [订阅页（SubscriptionView）](#17-订阅页subscriptionview)
18. [SidebarView](#18-sidebarview)
19. [侧边栏实例行 + Agent 行 + 对话行](#19-侧边栏实例行--agent-行--对话行)

---

## 1. Design Tokens

### 1.1 AppColors.swift

```swift
// Core/DesignSystem/AppColors.swift
import SwiftUI

enum AppColors {
    static let white = Color(hex: "#FFFFFF", darkHex: "#E8EBE0")
    static let black = Color(hex: "#000000", darkHex: "#1C1C1E")

    // V10 标准灰阶（自动适配深色模式）
    static let ink50  = Color(hex: "#FAFAFA", darkHex: "#1C1C1E")
    static let ink100 = Color(hex: "#F5F5F7", darkHex: "#2C2C2E")
    static let ink200 = Color(hex: "#E5E5EA", darkHex: "#3A3A3C")
    static let ink300 = Color(hex: "#D1D1D6", darkHex: "#48484A")
    static let ink400 = Color(hex: "#8E8E93", darkHex: "#8E8E93")
    static let ink500 = Color(hex: "#636366", darkHex: "#A8A8AD")
    static let ink600 = Color(hex: "#48484A", darkHex: "#C7C7CC")
    static let ink700 = Color(hex: "#3A3A3C", darkHex: "#D1D1D6")
    static let ink800 = Color(hex: "#1C1C1E", darkHex: "#E5E5EA")
    static let ink900 = Color(hex: "#1C1C1E", darkHex: "#F5F5F7")

    // 品牌色（保留）
    static let amber50  = Color(hex: "#FFFBF0", darkHex: "#322400")
    static let amber100 = Color(hex: "#FFF3D6", darkHex: "#322400")
    static let amber300 = Color(hex: "#F6AD02", darkHex: "#F6C842")
    static let amber900 = Color(hex: "#322400", darkHex: "#FFF3D6")

    static let lime50  = Color(hex: "#FAFDF0", darkHex: "#222C04")
    static let lime300 = Color(hex: "#ACCE22", darkHex: "#C4E040")
    static let lime900 = Color(hex: "#222C04", darkHex: "#D4E8A0")

    static let leaf50  = Color(hex: "#F0FBF2", darkHex: "#01190B")
    static let leaf300 = Color(hex: "#0DA945", darkHex: "#30D060")
    static let leaf900 = Color(hex: "#01190B", darkHex: "#A0E8B0")

    // V10 iMessage-style: 纯白背景
    static let pageBackground = Color(hex: "#FFFFFF", darkHex: "#000000")
    static let surfaceCard  = Color(hex: "#F5F5F7", darkHex: "#1C1C1E")
    static let elevatedSurface = Color(hex: "#F5F5F7", darkHex: "#1C1C1E")
    static let separatorLine = Color(hex: "#E5E5EA", darkHex: "#38383A")

    // V10 文字色
    static let primaryText   = Color(hex: "#000000", darkHex: "#FFFFFF")
    static let secondaryText = Color(hex: "#8E8E93", darkHex: "#8E8E93")
    static let tertiaryText  = Color(hex: "#C7C7CC", darkHex: "#48484A")

    // V10 iMessage-style: 用户气泡用系统蓝
    static let userBubbleBg   = Color(hex: "#007AFF", darkHex: "#0A84FF")
    static let userBubbleText = Color(hex: "#FFFFFF", darkHex: "#FFFFFF")

    // V10 iMessage-style: AI 气泡用浅灰
    static let aiBubbleBg    = Color(hex: "#E5E5EA", darkHex: "#2C2C2E")
    static let aiBubbleBorder = Color(hex: "#E5E5EA", darkHex: "#2C2C2E")
    static let aiBubbleText  = Color(hex: "#000000", darkHex: "#FFFFFF")

    static let codeBlockBg   = Color(hex: "#1C1C1E", darkHex: "#2C2C2E")
    static let codeBlockText = Color(hex: "#F5F5F7", darkHex: "#E5E5EA")

    // V10 状态色
    static let success = Color(hex: "#34C759", darkHex: "#30D158")
    static let danger  = Color(hex: "#FF3B30", darkHex: "#FF453A")
    static let warning = Color(hex: "#FF9500", darkHex: "#FF9F0A")
    static let info    = Color(hex: "#007AFF", darkHex: "#0A84FF")

    // V10 语义色 soft 背景
    static let accentSoft  = Color(hex: "#007AFF").opacity(0.1)
    static let dangerSoft  = Color(hex: "#FF3B30").opacity(0.1)
    static let successSoft = Color(hex: "#34C759").opacity(0.1)
    static let warningSoft = Color(hex: "#FF9500").opacity(0.1)

    // 文件图标色
    static let fileIconPdf     = Color(hex: "#E53935", darkHex: "#EF5350")
    static let fileIconDoc     = Color(hex: "#1976D2", darkHex: "#42A5F5")
    static let fileIconXls     = Color(hex: "#388E3C", darkHex: "#66BB6A")
    static let fileIconPpt     = Color(hex: "#F57C00", darkHex: "#FFA726")
    static let fileIconDefault = Color(hex: "#8E8E93", darkHex: "#A8A8AD")

    // 渠道色
    static let channelFeishu   = Color(hex: "#3370FF", darkHex: "#5B8FFF")
    static let channelWecom    = Color(hex: "#2AAE67", darkHex: "#4DC98A")
    static let channelDingtalk = Color(hex: "#0089FF", darkHex: "#4DAFFF")
    static let channelQQ       = Color(hex: "#12B7F5", darkHex: "#5CCFFF")
    static let channelTelegram = Color(hex: "#0088CC", darkHex: "#4DB8E5")
    static let channelSlack    = Color(hex: "#611F69", darkHex: "#9B59B6")
    static let channelDiscord  = Color(hex: "#5865F2", darkHex: "#7983F5")

    // 模型提供商色
    static let providerArk     = Color(hex: "#F57C00", darkHex: "#FFA726")
    static let providerTencent = Color(hex: "#0066FF", darkHex: "#4D94FF")
    static let providerZhipu   = Color(hex: "#4A3AFF", darkHex: "#7B6AFF")
    static let providerOpenAI  = Color(hex: "#10A37F", darkHex: "#34C5A5")
    static let providerDeepSeek = Color(hex: "#4D6BFE", darkHex: "#7B93FE")
    static let providerOther   = Color(hex: "#8E8E93", darkHex: "#A8A8AD")

    static func gauge(percent: Double, warn: Double = 70, critical: Double = 90) -> Color {
        if percent >= critical { return danger }
        if percent >= warn { return warning }
        return success
    }
}

// macOS 专用：根据当前外观自动切换 light/dark 的 Color 构造器
extension Color {
    init(hex: String, darkHex: String? = nil) {
        let lightColor = Color(hexString: hex)
        guard let darkHex = darkHex else {
            self = lightColor
            return
        }
        let darkColor = Color(hexString: darkHex)
        self = Color(NSColor(name: nil) { appearance in
            appearance.name == .darkAqua ||
            appearance.name == .vibrantDark ||
            appearance.name == .accessibilityHighContrastDarkAqua ||
            appearance.name == .accessibilityHighContrastVibrantDark
            ? NSColor(darkColor) : NSColor(lightColor)
        })
    }

    private init(hexString: String) {
        let hex = hexString.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let r, g, b, a: UInt64
        switch hex.count {
        case 6: (r, g, b, a) = ((int >> 16) & 0xFF, (int >> 8) & 0xFF, int & 0xFF, 255)
        case 8: (r, g, b, a) = ((int >> 24) & 0xFF, (int >> 16) & 0xFF, (int >> 8) & 0xFF, int & 0xFF)
        default: (r, g, b, a) = (0, 0, 0, 255)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
```

### 1.2 Spacing & Radius

```swift
// Core/DesignSystem/Spacing.swift
import Foundation

enum Spacing {
    static let xxs: CGFloat = 2
    static let xs: CGFloat = 4
    static let sm: CGFloat = 8
    static let md: CGFloat = 12
    static let lg: CGFloat = 16
    static let xl: CGFloat = 24
    static let xxl: CGFloat = 32
    static let xxxl: CGFloat = 48
}

// Core/DesignSystem/AppRadius.swift
import Foundation

enum AppRadius {
    static let sm: CGFloat = 8
    static let md: CGFloat = 10
    static let lg: CGFloat = 14
    static let xl: CGFloat = 16
    static let card: CGFloat = 14
    static let xxl: CGFloat = 18
    static let full: CGFloat = .infinity
}
```

---

## 2. 基础组件

### 2.1 IconBlock

```swift
struct IconBlock: View {
    let icon: String
    let color: Color
    var size: CGFloat = 28

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: size * 0.25)
                .fill(color.opacity(0.10))
            Image(systemName: icon)
                .font(.system(size: size * 0.5, weight: .medium))
                .foregroundStyle(color)
        }
        .frame(width: size, height: size)
    }
}
```

### 2.2 SettingsRow

```swift
struct SettingsRow: View {
    let icon: String
    let color: Color
    let title: String
    let subtitle: String?
    var action: () -> Void = {}

    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
                IconBlock(icon: icon, color: color)
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.system(size: 13))
                        .foregroundStyle(.primary)
                    if let subtitle {
                        Text(subtitle)
                            .font(.system(size: 11))
                            .foregroundStyle(.secondary)
                    }
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: 12))
                    .foregroundStyle(AppColors.tertiaryText)
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}
```

### 2.3 SettingsGroup（Inset Grouped）

```swift
struct SettingsGroup<Content: View>: View {
    let title: String
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Text(title.uppercased())
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(AppColors.secondaryText)
                .padding(.horizontal, Spacing.lg)
                .padding(.top, Spacing.xs)

            VStack(spacing: 0) {
                content
            }
            .background(AppColors.surfaceCard)
            .clipShape(RoundedRectangle(cornerRadius: AppRadius.md))
            .overlay(
                RoundedRectangle(cornerRadius: AppRadius.md)
                    .stroke(AppColors.separatorLine, lineWidth: 0.5)
            )
            .padding(.horizontal, Spacing.lg)
        }
    }
}
```

### 2.4 StatusDot

```swift
struct StatusDot: View {
    let status: Status
    @State private var isPulsing = false

    enum Status { case success, warning, danger, idle }

    var color: Color {
        switch status {
        case .success: return AppColors.success
        case .warning: return AppColors.warning
        case .danger: return AppColors.danger
        case .idle: return AppColors.ink300
        }
    }

    var body: some View {
        Circle()
            .fill(color)
            .frame(width: 8, height: 8)
            .overlay(
                Circle()
                    .stroke(color.opacity(0.3), lineWidth: 4)
                    .scaleEffect(isPulsing ? 1.5 : 1)
                    .opacity(isPulsing ? 0 : 1)
            )
            .onAppear {
                withAnimation(.easeOut(duration: 1.5).repeatForever(autoreverses: false)) {
                    isPulsing = true
                }
            }
    }
}
```

---

## 3. 主聊天页（ChatView）

```swift
// Views/ChatView.swift
import SwiftUI

struct ChatView: View {
    @ObservedObject var viewModel: ChatViewModel

    var body: some View {
        VStack(spacing: 0) {
            ChatHeaderSection(viewModel: viewModel.headerVM)
            TokenUsageBar(viewModel: viewModel.tokenVM)
            SystemPromptBar(prompt: viewModel.systemPrompt)
            ChatMessageSection(messages: viewModel.messages)
            InputBarView(viewModel: viewModel.inputVM)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(AppColors.pageBackground)
    }
}
```

### 3.1 ChatHeaderSection

```swift
// Features/Chat/ChatHeaderSection.swift
struct ChatHeaderSection: View {
    @ObservedObject var viewModel: ChatHeaderVM

    var body: some View {
        HStack {
            HStack(spacing: 10) {
                AgentAvatarView(agent: viewModel.agent, size: 30)
                VStack(alignment: .leading, spacing: 1) {
                    HStack(spacing: 4) {
                        Text(viewModel.agent.displayName)
                            .font(.system(size: 15, weight: .semibold))
                        Image(systemName: "chevron.down")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundStyle(AppColors.tertiaryText)
                    }
                    HStack(spacing: 3) {
                        Text("\(viewModel.modelProvider) / \(viewModel.modelName)")
                            .font(.system(size: 11))
                            .foregroundStyle(AppColors.secondaryText)
                        Image(systemName: "chevron.down")
                            .font(.system(size: 8, weight: .bold))
                            .foregroundStyle(AppColors.tertiaryText)
                    }
                }
            }

            Spacer()

            HStack(spacing: 8) {
                StatusDot(status: .success)
                Text("\(viewModel.latencyMs)ms")
                    .font(.system(size: 11, design: .monospaced))
                    .foregroundStyle(AppColors.success)
                Text("已连接")
                    .font(.system(size: 11))
                    .foregroundStyle(AppColors.secondaryText)

                Button {
                    viewModel.showExportMenu = true
                } label: {
                    Image(systemName: "square.and.arrow.up")
                        .font(.system(size: 12))
                        .foregroundStyle(AppColors.secondaryText)
                }
                .buttonStyle(.plain)
                .frame(width: 22, height: 22)
            }
        }
        .padding(.horizontal, Spacing.lg)
        .padding(.vertical, Spacing.md)
        .background(AppColors.pageBackground)
        .overlay(
            Rectangle()
                .frame(height: 0.5)
                .foregroundStyle(AppColors.separatorLine),
            alignment: .bottom
        )
    }
}
```

### 3.2 TokenUsageBar

```swift
struct TokenUsageBar: View {
    @ObservedObject var viewModel: TokenVM
    @State private var showContextActions = false

    var color: Color {
        if viewModel.percentage >= 90 { return AppColors.danger }
        if viewModel.percentage >= 75 { return AppColors.warning }
        return AppColors.leaf300
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 2)
                        .fill(Color.gray.opacity(0.15))
                    RoundedRectangle(cornerRadius: 2)
                        .fill(color)
                        .frame(width: geo.size.width * viewModel.percentage / 100)
                        .animation(.easeInOut(duration: 0.6), value: viewModel.percentage)
                }
            }
            .frame(height: 4)

            HStack(spacing: 8) {
                Text("↓\(viewModel.inputTokens.formatted())")
                    .foregroundStyle(.blue)
                Text("↑\(viewModel.outputTokens.formatted())")
                    .foregroundStyle(AppColors.leaf300)
                Text(String(format: "$%.4f", viewModel.cost))
                    .foregroundStyle(.secondary)
                Spacer()
                if viewModel.percentage >= 75 {
                    Button { showContextActions = true } label: {
                        HStack(spacing: 2) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .font(.system(size: 9))
                            Text("上下文偏高")
                                .font(.system(size: 10))
                        }
                        .foregroundStyle(AppColors.warning)
                    }
                    .buttonStyle(.plain)
                }
                Text("\(viewModel.contextSize.formatted()) / \(viewModel.contextLimit.formatted())")
                    .foregroundStyle(.secondary)
            }
            .font(.system(size: 11, design: .monospaced))
        }
        .padding(.horizontal, Spacing.lg)
        .padding(.bottom, Spacing.sm)
        .popover(isPresented: $showContextActions) {
            ContextActionPopover(viewModel: viewModel)
        }
    }
}

struct ContextActionPopover: View {
    @ObservedObject var viewModel: TokenVM

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("上下文管理")
                .font(.system(size: 14, weight: .semibold))
            Text("当前上下文已使用 \(Int(viewModel.percentage))%，建议压缩或新建会话以释放空间。")
                .font(.system(size: 12))
                .foregroundStyle(.secondary)
            HStack(spacing: 12) {
                Button("压缩上下文") { viewModel.compactContext() }
                    .buttonStyle(.borderedProminent)
                Button("新建会话") { viewModel.newSession() }
                    .buttonStyle(.bordered)
            }
        }
        .padding()
        .frame(width: 280)
    }
}
```

### 3.3 ChatBubble

```swift
struct ChatBubble: View {
    let message: Message

    var body: some View {
        HStack {
            if message.role == .user { Spacer(minLength: 60) }
            VStack(alignment: message.role == .user ? .trailing : .leading, spacing: 2) {
                Text(message.content)
                    .font(.system(size: 13))
                    .padding(.horizontal, 13)
                    .padding(.vertical, 8)
                    .foregroundStyle(message.role == .user ? AppColors.userBubbleText : AppColors.primaryText)
                    .background(
                        message.role == .user
                            ? AppColors.userBubbleBg
                            : AppColors.aiBubbleBg
                    )
                    .clipShape(
                        UnevenRoundedRectangle(
                            topLeadingRadius: 18,
                            bottomLeadingRadius: message.role == .user ? 18 : 4,
                            bottomTrailingRadius: message.role == .user ? 4 : 18,
                            topTrailingRadius: 18
                        )
                    )

                HStack(spacing: 4) {
                    if let status = message.deliveryStatus {
                        DeliveryStatusIcon(status: status)
                    }
                    Text(message.timestamp.formatted(date: .omitted, time: .shortened))
                        .font(.system(size: 10))
                        .foregroundStyle(AppColors.tertiaryText)
                }
            }
            if message.role == .assistant { Spacer(minLength: 60) }
        }
        .transition(.scale.combined(with: .opacity))
    }
}

struct DeliveryStatusIcon: View {
    let status: MessageDeliveryStatus

    var body: some View {
        switch status {
        case .sending:
            ProgressView()
                .scaleEffect(0.6)
        case .sent:
            Image(systemName: "checkmark")
                .font(.system(size: 8, weight: .bold))
                .foregroundStyle(AppColors.tertiaryText)
        case .failed:
            Image(systemName: "exclamationmark.circle.fill")
                .font(.system(size: 8))
                .foregroundStyle(AppColors.danger)
        }
    }
}
```

### 3.4 ChatMessageSection

```swift
struct ChatMessageSection: View {
    let messages: [Message]

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 6) {
                ForEach(messages) { msg in
                    ChatBubble(message: msg)
                }
            }
            .padding(Spacing.lg)
        }
    }
}
```

### 3.5 InputBarView（V10 单行）

```swift
// Views/InputBarView.swift
struct InputBarView: View {
    @ObservedObject var viewModel: InputVM
    @State private var text: String = ""

    var body: some View {
        HStack(spacing: 6) {
            Button { viewModel.attachFile() } label: {
                Image(systemName: "paperclip")
                    .font(.system(size: 16))
                    .foregroundStyle(.secondary)
            }
            .buttonStyle(CircleIconButtonStyle())

            Button { viewModel.showMore() } label: {
                Image(systemName: "ellipsis")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(.secondary)
            }
            .buttonStyle(CircleIconButtonStyle())

            TextField("发消息... 输入 / 查看指令", text: $text, axis: .vertical)
                .textFieldStyle(.plain)
                .lineLimit(1...5)
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(AppColors.surfaceCard)
                .clipShape(Capsule())
                .onSubmit { send() }

            Button { send() } label: {
                Image(systemName: viewModel.isProcessing ? "stop.fill" : "arrow.up")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(.white)
            }
            .buttonStyle(CircleAccentButtonStyle(isActive: !text.isEmpty))
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .background(AppColors.pageBackground)
        .overlay(
            Rectangle()
                .frame(height: 0.5)
                .foregroundStyle(AppColors.separatorLine),
            alignment: .top
        )
    }

    private func send() {
        guard !text.isEmpty else { return }
        viewModel.send(text)
        text = ""
    }
}

struct CircleIconButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .frame(width: 32, height: 32)
            .background(AppColors.surfaceCard)
            .clipShape(Circle())
            .scaleEffect(configuration.isPressed ? 0.95 : 1.0)
            .animation(.spring(response: 0.2, dampingFraction: 0.7), value: configuration.isPressed)
    }
}

struct CircleAccentButtonStyle: ButtonStyle {
    let isActive: Bool

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .frame(width: 32, height: 32)
            .background(isActive ? AppColors.userBubbleBg : Color.gray.opacity(0.3))
            .clipShape(Circle())
            .scaleEffect(configuration.isPressed ? 0.95 : 1.0)
            .animation(.spring(response: 0.2, dampingFraction: 0.7), value: configuration.isPressed)
    }
}
```

---

## 4. 欢迎页（WelcomeView）

```swift
// Views/WelcomeView.swift
struct WelcomeView: View {
    @State private var showAddInstance = false

    var body: some View {
        VStack(spacing: 0) {
            Spacer()

            // 图标
            ZStack {
                RoundedRectangle(cornerRadius: 18)
                    .fill(AppColors.amberSoft)
                Image(systemName: "antenna.radiowaves.left.and.right")
                    .font(.system(size: 36, weight: .light))
                    .foregroundStyle(AppColors.amber300)
            }
            .frame(width: 72, height: 72)
            .padding(.bottom, 18)

            Text("MyPilot")
                .font(.system(size: 22, weight: .bold))
                .padding(.bottom, 4)

            Text("私有化 OpenClaw 客户端")
                .font(.system(size: 12))
                .foregroundStyle(.secondary)
                .padding(.bottom, 28)

            // 三步引导
            VStack(spacing: 8) {
                WelcomeStep(
                    number: 1,
                    title: "部署 OpenClaw",
                    subtitle: "在服务器上安装 OpenClaw Gateway",
                    icon: "server.rack"
                )
                WelcomeStep(
                    number: 2,
                    title: "安装 MyPilot Link",
                    subtitle: "npm i -g @mypilot/link && mypilot start",
                    icon: "terminal"
                )
                WelcomeStep(
                    number: 3,
                    title: "添加实例",
                    subtitle: "输入服务器地址和配对码连接",
                    icon: "plus.circle"
                )
            }
            .frame(maxWidth: 360)
            .padding(.bottom, 24)

            // 添加实例按钮
            Button { showAddInstance = true } label: {
                HStack(spacing: 6) {
                    Image(systemName: "plus")
                    Text("添加实例")
                }
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(.white)
                .padding(.horizontal, 20)
                .padding(.vertical, 10)
                .background(AppColors.userBubbleBg)
                .clipShape(RoundedRectangle(cornerRadius: AppRadius.md))
            }
            .buttonStyle(.plain)

            Spacer()

            Text("v1.0.0 · 数据完全私有")
                .font(.system(size: 11))
                .foregroundStyle(AppColors.tertiaryText)
                .padding(.bottom, 16)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(AppColors.pageBackground)
        .sheet(isPresented: $showAddInstance) {
            AddInstanceView()
        }
    }
}

struct WelcomeStep: View {
    let number: Int
    let title: String
    let subtitle: String
    let icon: String

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle().fill(AppColors.userBubbleBg)
                Text("\(number)")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(.white)
            }
            .frame(width: 22, height: 22)

            VStack(alignment: .leading, spacing: 1) {
                Text(title)
                    .font(.system(size: 13, weight: .medium))
                Text(subtitle)
                    .font(.system(size: 11))
                    .foregroundStyle(.secondary)
            }
            Spacer()

            Image(systemName: icon)
                .font(.system(size: 14))
                .foregroundStyle(.secondary)
                .frame(width: 24, height: 24)
                .background(AppColors.surfaceCard)
                .clipShape(RoundedRectangle(cornerRadius: 6))
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(AppColors.surfaceCard)
        .clipShape(RoundedRectangle(cornerRadius: AppRadius.md))
    }
}
```

---

## 5. 添加实例（AddInstanceView）

```swift
// Views/AddInstanceView.swift
struct AddInstanceView: View {
    @Environment(\.dismiss) var dismiss
    @State private var step: Step = .server
    @State private var serverURL: String = "http://127.0.0.1:52378"
    @State private var pairingCode: String = ""
    @State private var instanceName: String = ""

    enum Step { case server, pairing }

    var body: some View {
        VStack(spacing: 12) {
            // Icon
            ZStack {
                RoundedRectangle(cornerRadius: 14)
                    .fill(AppColors.accentSoft)
                Image(systemName: step == .server ? "server.rack" : "key.fill")
                    .font(.system(size: 28, weight: .light))
                    .foregroundStyle(AppColors.info)
            }
            .frame(width: 56, height: 56)
            .padding(.top, 8)

            Text(step == .server ? "输入服务器地址" : "输入配对码")
                .font(.system(size: 18, weight: .semibold))

            if step == .pairing {
                Text("在服务器终端执行 mypilot pair 获取配对码，或扫描二维码")
                    .font(.system(size: 12))
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 24)
            }

            // Input
            if step == .server {
                CustomTextField(text: $serverURL, placeholder: "例如: http://118.145.240.41:52378")
            } else {
                HStack(spacing: 8) {
                    CustomTextField(text: $pairingCode, placeholder: "XXXX-XXXX-XXXX", monospace: true)
                    Button {} label: {
                        Image(systemName: "qrcode.viewfinder")
                            .font(.system(size: 18))
                            .frame(width: 38, height: 38)
                            .background(AppColors.pageBackground)
                            .clipShape(RoundedRectangle(cornerRadius: AppRadius.sm))
                            .overlay(
                                RoundedRectangle(cornerRadius: AppRadius.sm)
                                    .stroke(AppColors.separatorLine, lineWidth: 0.5)
                            )
                    }
                    .buttonStyle(.plain)
                }

                CustomTextField(text: $instanceName, placeholder: "实例名称（可选）")
            }

            // Hints (Step 1) / QR (Step 2)
            if step == .server {
                installHints
            } else {
                qrCard
            }

            Spacer()

            // Actions
            HStack(spacing: 10) {
                Button(step == .server ? "取消" : "返回") {
                    if step == .server {
                        dismiss()
                    } else {
                        withAnimation { step = .server }
                    }
                }
                .buttonStyle(SecondaryButtonStyle())

                Button(step == .server ? "继续" : "配对并连接") {
                    if step == .server {
                        withAnimation { step = .pairing }
                    } else {
                        pairAndConnect()
                    }
                }
                .buttonStyle(PrimaryButtonStyle())
            }
        }
        .padding(24)
        .frame(width: 460, height: 580)
        .background(AppColors.pageBackground)
    }

    private var installHints: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 6) {
                Image(systemName: "info.circle")
                Text("MyPilot 通过本地 daemon 连接 OpenClaw Gateway")
            }
            .font(.system(size: 12))
            .foregroundStyle(.primary)
            .padding(.bottom, 8)

            Text("1. 在服务器上安装 mypilot-link: npm install -g @mypilot/link")
            Text("2. 启动 daemon: mypilot start")
            Text("3. 输入 daemon 地址（默认端口 52378）")
            Text("4. 在下一步输入终端显示的配对码完成配对")
        }
        .font(.system(size: 11))
        .foregroundStyle(.secondary)
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AppColors.surfaceCard)
        .clipShape(RoundedRectangle(cornerRadius: AppRadius.md))
    }

    private var qrCard: some View {
        VStack(spacing: 8) {
            Text("或使用此服务器生成的配对码：")
                .font(.system(size: 11))
                .foregroundStyle(.secondary)
            // QR Image placeholder
            ZStack {
                RoundedRectangle(cornerRadius: 6)
                    .fill(.white)
                    .frame(width: 120, height: 120)
                    .overlay(
                        RoundedRectangle(cornerRadius: 6)
                            .stroke(AppColors.separatorLine, lineWidth: 0.5)
                    )
                Image(systemName: "qrcode")
                    .font(.system(size: 80))
                    .foregroundStyle(.primary)
            }
            Text("MQ4F-N8L2-9A7B")
                .font(.system(size: 14, weight: .semibold, design: .monospaced))
        }
        .frame(maxWidth: .infinity)
        .padding(12)
        .background(AppColors.surfaceCard)
        .clipShape(RoundedRectangle(cornerRadius: AppRadius.md))
    }

    private func pairAndConnect() {
        viewModel.pairAndConnect(serverURL: serverURL, code: pairingCode, name: instanceName)
        dismiss()
    }
}

struct CustomTextField: View {
    @Binding var text: String
    let placeholder: String
    var monospace: Bool = false

    var body: some View {
        TextField(placeholder, text: $text)
            .textFieldStyle(.plain)
            .font(.system(size: 13, design: monospace ? .monospaced : .default))
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(AppColors.pageBackground)
            .clipShape(RoundedRectangle(cornerRadius: AppRadius.sm))
            .overlay(
                RoundedRectangle(cornerRadius: AppRadius.sm)
                    .stroke(AppColors.separatorLine, lineWidth: 0.5)
            )
    }
}

struct PrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 14, weight: .medium))
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 9)
            .background(AppColors.userBubbleBg)
            .clipShape(RoundedRectangle(cornerRadius: AppRadius.sm))
            .opacity(configuration.isPressed ? 0.85 : 1.0)
    }
}

struct SecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 14, weight: .medium))
            .foregroundStyle(.primary)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 9)
            .background(AppColors.surfaceCard)
            .clipShape(RoundedRectangle(cornerRadius: AppRadius.sm))
            .overlay(
                RoundedRectangle(cornerRadius: AppRadius.sm)
                    .stroke(AppColors.separatorLine, lineWidth: 0.5)
            )
            .opacity(configuration.isPressed ? 0.85 : 1.0)
    }
}
```

---

## 6. 设置主页（SettingsView）

```swift
// Features/Settings/SettingsView.swift
struct SettingsView: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                Text("设置")
                    .font(.system(size: 28, weight: .semibold))
                    .padding(.horizontal, Spacing.lg)
                    .padding(.top, Spacing.xl)
                    .padding(.bottom, Spacing.lg)

                SettingsGroup(title: "通用") {
                    VStack(spacing: 0) {
                        SettingsRow(icon: "paintbrush", color: AppColors.info,
                                    title: "外观", subtitle: "主题、字体、显示")
                        Divider().opacity(0.5).padding(.leading, 50)
                        SettingsRow(icon: "globe", color: AppColors.leaf300,
                                    title: "语言", subtitle: "界面语言与时区")
                    }
                }

                SettingsGroup(title: "网络") {
                    SettingsRow(icon: "network", color: AppColors.info,
                                title: "连接设置", subtitle: "服务器地址与端口")
                }

                SettingsGroup(title: "Agents") {
                    SettingsRow(icon: "person.2", color: AppColors.leaf300,
                                title: "管理 Agents", subtitle: "智能体与协作关系")
                }

                SettingsGroup(title: "高级") {
                    SettingsRow(icon: "gearshape.2", color: AppColors.ink400,
                                title: "高级设置", subtitle: "日志、诊断、实验功能")
                }
            }
        }
        .background(AppColors.pageBackground)
    }
}
```

---

## 7. 网络设置（NetworkSettingsView）

```swift
// Features/Settings/NetworkSettingsView.swift
struct NetworkSettingsView: View {
    @ObservedObject var viewModel: NetworkVM

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                Text("网络")
                    .font(.system(size: 28, weight: .semibold))
                    .padding(.horizontal, Spacing.lg)
                    .padding(.top, Spacing.xl)
                    .padding(.bottom, Spacing.lg)

                // 状态卡
                HStack(spacing: 10) {
                    StatusDot(status: .success)
                    Text("已连接")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(AppColors.success)
                    Spacer()
                    Text(viewModel.serverURL)
                        .font(.system(size: 11, design: .monospaced))
                        .foregroundStyle(.secondary)
                }
                .padding(12)
                .background(AppColors.successSoft)
                .clipShape(RoundedRectangle(cornerRadius: AppRadius.md))
                .overlay(
                    RoundedRectangle(cornerRadius: AppRadius.md)
                        .stroke(AppColors.success.opacity(0.2), lineWidth: 0.5)
                )
                .padding(.horizontal, Spacing.lg)
                .padding(.bottom, Spacing.lg)

                SettingsGroup(title: "连接") {
                    VStack(spacing: 0) {
                        ConfigRow(label: "服务器地址", value: viewModel.serverURL)
                        Divider().opacity(0.5).padding(.leading, 16)
                        ConfigRow(label: "端口", value: "\(viewModel.port)")
                        Divider().opacity(0.5).padding(.leading, 16)
                        ConfigRow(label: "API 路径", value: viewModel.apiPath)
                    }
                }

                SettingsGroup(title: "安全") {
                    VStack(spacing: 0) {
                        ConfigRow(label: "Token", value: "••••••••••••")
                        Divider().opacity(0.5).padding(.leading, 16)
                        ConfigRow(label: "配对码", value: "••••••••••••")
                    }
                }

                HStack(spacing: 10) {
                    Button("测试连接", action: viewModel.testConnection)
                        .buttonStyle(SecondaryButtonStyle())
                    Button("重置", action: viewModel.reset)
                        .buttonStyle(PrimaryButtonStyle())
                }
                .padding(.horizontal, Spacing.lg)
                .padding(.top, Spacing.md)
            }
        }
    }
}

struct ConfigRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(label)
                .font(.system(size: 13))
                .foregroundStyle(.secondary)
            Spacer()
            Text(value)
                .font(.system(size: 12, design: .monospaced))
                .foregroundStyle(.primary)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
    }
}
```

---

## 8. Agents 管理（AgentsManagementView）

```swift
// Features/Settings/AgentsManagementView.swift
struct AgentsManagementView: View {
    @ObservedObject var viewModel: AgentsVM
    @State private var showCreate = false

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header
            HStack {
                Text("Agents")
                    .font(.system(size: 28, weight: .semibold))
                Spacer()
                Button { showCreate = true } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "plus")
                        Text("创建 Agent")
                    }
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(AppColors.userBubbleBg)
                    .clipShape(RoundedRectangle(cornerRadius: AppRadius.sm))
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, Spacing.lg)
            .padding(.top, Spacing.xl)
            .padding(.bottom, Spacing.lg)

            // Agent 列表
            List {
                ForEach(viewModel.agents) { agent in
                    AgentRow(agent: agent)
                        .listRowInsets(EdgeInsets())
                        .listRowSeparator(.visible)
                }
            }
            .listStyle(.plain)
        }
        .sheet(isPresented: $showCreate) {
            CreateAgentView()
        }
    }
}

struct AgentRow: View {
    let agent: Agent
    @State private var showingMenu = false

    var body: some View {
        HStack(spacing: 12) {
            AgentAvatarView(agent: agent, size: 32)

            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 6) {
                    Text(agent.displayName)
                        .font(.system(size: 13))
                    if agent.isActive {
                        Text("活跃")
                            .font(.system(size: 11, weight: .medium))
                            .padding(.horizontal, 6)
                            .padding(.vertical, 1)
                            .background(AppColors.leafSoft)
                            .foregroundStyle(AppColors.leaf300)
                            .clipShape(Capsule())
                    }
                }
                Text(agent.modelName)
                    .font(.system(size: 11))
                    .foregroundStyle(.secondary)
                Text("\(agent.conversationCount) 个对话")
                    .font(.system(size: 11))
                    .foregroundStyle(.secondary)
            }

            Spacer()

            Button { showingMenu = true } label: {
                Image(systemName: "ellipsis")
                    .font(.system(size: 14))
                    .foregroundStyle(.secondary)
                    .frame(width: 24, height: 24)
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, Spacing.lg)
        .padding(.vertical, 10)
        .confirmationDialog("", isPresented: $showingMenu) {
            Button("编辑") {}
            Button("删除", role: .destructive) {}
            Button("取消", role: .cancel) {}
        }
    }
}

struct AgentAvatarView: View {
    let agent: Agent
    var size: CGFloat = 32

    var body: some View {
        Group {
            if let path = agent.localAvatarPath,
               let nsImage = NSImage(contentsOfFile: path) {
                Image(nsImage: nsImage)
                    .resizable()
                    .scaledToFill()
            } else if let url = agent.avatarUrl, !url.isEmpty {
                AsyncImage(url: URL(string: url)) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().scaledToFill()
                    default:
                        defaultAvatar
                    }
                }
            } else {
                defaultAvatar
            }
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
    }

    private var defaultAvatar: some View {
        ZStack {
            Circle().fill(agent.color.opacity(0.10))
            Text(agent.initial)
                .font(.system(size: size * 0.4, weight: .medium))
                .foregroundStyle(agent.color)
        }
    }
}
```

---

## 9. Agent 详情（AgentDetailView）

```swift
// Features/Settings/AgentDetailView.swift
struct AgentDetailView: View {
    @ObservedObject var viewModel: AgentDetailVM

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                // Header
                HStack {
                    Button { viewModel.dismiss() } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 14))
                            .foregroundStyle(.secondary)
                    }
                    .buttonStyle(.plain)
                    .frame(width: 28, height: 28)

                    Spacer()

                    Button("编辑") { viewModel.startEditing() }
                        .buttonStyle(SecondaryButtonStyle())
                        .frame(width: 80)
                }
                .padding(.horizontal, Spacing.lg)
                .padding(.top, Spacing.lg)

                // Avatar + name
                HStack(spacing: 14) {
                    AgentAvatarView(agent: viewModel.agent, size: 56)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(viewModel.agent.displayName)
                            .font(.system(size: 18, weight: .semibold))
                        Text(viewModel.agent.modelName)
                            .font(.system(size: 12))
                            .foregroundStyle(.secondary)
                    }
                    Spacer()
                }
                .padding(.horizontal, Spacing.lg)
                .padding(.top, Spacing.lg)
                .padding(.bottom, Spacing.xl)

                SettingsGroup(title: "基本信息") {
                    VStack(spacing: 0) {
                        InfoRow(label: "名称", value: viewModel.agent.displayName)
                        Divider().opacity(0.5).padding(.leading, 16)
                        InfoRow(label: "模型", value: viewModel.agent.modelName)
                        Divider().opacity(0.5).padding(.leading, 16)
                        InfoRow(label: "工作区", value: viewModel.agent.workspace)
                        Divider().opacity(0.5).padding(.leading, 16)
                        InfoRow(label: "创建时间", value: viewModel.agent.createdAt.formatted())
                        Divider().opacity(0.5).padding(.leading, 16)
                        InfoRow(label: "状态", value: viewModel.agent.isActive ? "活跃" : "禁用")
                    }
                }

                SettingsGroup(title: "操作") {
                    VStack(spacing: 0) {
                        ActionRow(icon: "pencil", color: AppColors.info, title: "重命名")
                        Divider().opacity(0.5).padding(.leading, 50)
                        ActionRow(icon: "person.crop.circle", color: AppColors.amber300, title: "更换头像")
                        Divider().opacity(0.5).padding(.leading, 50)
                        ActionRow(icon: "arrow.triangle.2.circlepath", color: AppColors.leaf300, title: "同步远端文件")
                        Divider().opacity(0.5).padding(.leading, 50)
                        ActionRow(icon: "trash", color: AppColors.danger, title: "删除 Agent", isDestructive: true)
                    }
                }
            }
        }
    }
}

struct InfoRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(label)
                .font(.system(size: 13))
                .foregroundStyle(.secondary)
            Spacer()
            Text(value)
                .font(.system(size: 13))
                .foregroundStyle(.primary)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
    }
}

struct ActionRow: View {
    let icon: String
    let color: Color
    let title: String
    var isDestructive: Bool = false

    var body: some View {
        HStack(spacing: 12) {
            IconBlock(icon: icon, color: color)
            Text(title)
                .font(.system(size: 13))
                .foregroundStyle(isDestructive ? AppColors.danger : .primary)
            Spacer()
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 11)
    }
}
```

---

## 10. Agent 文件（AgentFilesView）

```swift
// Features/Settings/AgentFilesView.swift
struct AgentFilesView: View {
    @ObservedObject var viewModel: AgentFilesVM
    @State private var selectedFile: AgentFile = .soul

    var body: some View {
        HSplitView {
            // 左侧文件列表
            VStack(spacing: 0) {
                HStack {
                    Text("Agent 文件")
                        .font(.system(size: 17, weight: .semibold))
                    Spacer()
                    Button {} label: {
                        Image(systemName: "arrow.triangle.2.circlepath")
                    }
                    .buttonStyle(.plain)
                }
                .padding(Spacing.lg)

                List(AgentFile.allCases, id: \.self, selection: $selectedFile) { file in
                    HStack {
                        Image(systemName: file.icon)
                            .frame(width: 20)
                            .foregroundStyle(file.color)
                        Text(file.displayName)
                            .font(.system(size: 13))
                    }
                    .padding(.vertical, 4)
                }
                .listStyle(.sidebar)
            }
            .frame(width: 220)

            // 右侧编辑器
            VStack(spacing: 0) {
                HStack {
                    Text(selectedFile.displayName)
                        .font(.system(size: 17, weight: .semibold))
                    Spacer()
                    Button("保存") {}
                        .buttonStyle(PrimaryButtonStyle())
                        .frame(width: 80)
                }
                .padding(Spacing.lg)

                TextEditor(text: $viewModel.content)
                    .font(.system(size: 13, design: .monospaced))
                    .padding(Spacing.lg)
                    .background(AppColors.surfaceCard)
            }
        }
    }
}

enum AgentFile: String, CaseIterable {
    case soul, identity, agents, user, tools, heartbeat, memory

    var displayName: String {
        switch self {
        case .soul: return "SOUL.md"
        case .identity: return "IDENTITY.md"
        case .agents: return "AGENTS.md"
        case .user: return "USER.md"
        case .tools: return "TOOLS.md"
        case .heartbeat: return "HEARTBEAT.md"
        case .memory: return "MEMORY.md"
        }
    }

    var icon: String {
        switch self {
        case .soul: return "heart"
        case .identity: return "person"
        case .agents: return "person.2"
        case .user: return "person.circle"
        case .tools: return "wrench"
        case .heartbeat: return "waveform.path"
        case .memory: return "brain"
        }
    }

    var color: Color {
        switch self {
        case .soul: return AppColors.danger
        case .identity: return AppColors.info
        case .agents: return AppColors.leaf300
        case .user: return AppColors.amber300
        case .tools: return AppColors.lime300
        case .heartbeat: return AppColors.warning
        case .memory: return AppColors.info
        }
    }
}
```

---

## 11. 定时任务（ScheduledTasksView）

```swift
// Features/Settings/ScheduledTasksView.swift
struct ScheduledTasksView: View {
    @ObservedObject var viewModel: ScheduledTasksVM
    @State private var showEdit = false
    @State private var editingTask: ScheduledTask?

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header
            HStack {
                Text("定时任务")
                    .font(.system(size: 28, weight: .semibold))
                Spacer()
                Button { editingTask = nil; showEdit = true } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "plus")
                        Text("新建任务")
                    }
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(AppColors.userBubbleBg)
                    .clipShape(RoundedRectangle(cornerRadius: AppRadius.sm))
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, Spacing.lg)
            .padding(.top, Spacing.xl)
            .padding(.bottom, Spacing.lg)

            // 任务列表
            ScrollView {
                VStack(spacing: 8) {
                    ForEach(viewModel.tasks) { task in
                        TaskCard(task: task)
                            .onTapGesture {
                                editingTask = task
                                showEdit = true
                            }
                    }
                }
                .padding(.horizontal, Spacing.lg)
            }
        }
        .sheet(isPresented: $showEdit) {
            TaskEditSheet(task: editingTask)
        }
    }
}

struct TaskCard: View {
    let task: ScheduledTask

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: task.enabled ? "checkmark.circle.fill" : "circle")
                .font(.system(size: 18))
                .foregroundStyle(task.enabled ? AppColors.userBubbleBg : .secondary)

            VStack(alignment: .leading, spacing: 4) {
                Text(task.name)
                    .font(.system(size: 14, weight: .medium))
                HStack(spacing: 6) {
                    Text(task.cronDisplay)
                        .font(.system(size: 11))
                        .padding(.horizontal, 6)
                        .padding(.vertical, 1)
                        .background(AppColors.accentSoft)
                        .foregroundStyle(AppColors.info)
                        .clipShape(Capsule())
                    Text("·")
                        .foregroundStyle(.secondary)
                    Text(task.modelName)
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                }
                if let desc = task.description {
                    Text(desc)
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                }
            }
            Spacer()
            Image(systemName: "ellipsis")
                .font(.system(size: 14))
                .foregroundStyle(.secondary)
        }
        .padding(Spacing.md)
        .background(AppColors.surfaceCard)
        .clipShape(RoundedRectangle(cornerRadius: AppRadius.md))
    }
}

struct TaskEditSheet: View {
    let task: ScheduledTask?
    @Environment(\.dismiss) var dismiss
    @State private var name: String = ""
    @State private var cron: String = "0 9 * * *"
    @State private var enabled: Bool = true

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Button("取消") { dismiss() }
                    .buttonStyle(SecondaryButtonStyle())
                Spacer()
                Text(task == nil ? "新建任务" : "编辑任务")
                    .font(.system(size: 14, weight: .medium))
                Spacer()
                Button("保存") { dismiss() }
                    .buttonStyle(PrimaryButtonStyle())
            }
            .padding(Spacing.lg)
            .overlay(
                Rectangle().frame(height: 0.5).foregroundStyle(AppColors.separatorLine),
                alignment: .bottom
            )

            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    FormField(label: "任务名称") {
                        TextField("每日简报", text: $name)
                    }
                    FormField(label: "Agent") {
                        // Picker
                    }
                    FormField(label: "触发方式") {
                        // Picker: 每天/每周/每月/Cron
                    }
                    FormField(label: "Cron 表达式") {
                        TextField("0 9 * * *", text: $cron)
                            .font(.system(size: 13, design: .monospaced))
                    }
                    FormField(label: "执行指令") {
                        TextEditor(text: .constant(""))
                            .frame(height: 80)
                    }
                    HStack {
                        Text("启用")
                        Spacer()
                        Toggle("", isOn: $enabled).toggleStyle(.switch)
                    }
                }
                .padding(Spacing.lg)
            }
        }
        .frame(width: 480, height: 540)
    }
}

struct FormField<Content: View>: View {
    let label: String
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(.system(size: 12))
                .foregroundStyle(.secondary)
            content
        }
    }
}
```

---

## 12. 运行统计（UsageStatsView）

```swift
// Features/Settings/UsageStatsView.swift
struct UsageStatsView: View {
    @ObservedObject var viewModel: UsageStatsVM
    @State private var range: Range = .today

    enum Range: String, CaseIterable { case today = "今日", week = "本周", month = "本月", all = "全部" }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                HStack {
                    Text("运行统计")
                        .font(.system(size: 28, weight: .semibold))
                    Spacer()
                    Picker("", selection: $range) {
                        ForEach(Range.allCases, id: \.self) { r in
                            Text(r.rawValue).tag(r)
                        }
                    }
                    .pickerStyle(.segmented)
                    .frame(width: 280)
                }
                .padding(.horizontal, Spacing.lg)
                .padding(.top, Spacing.xl)
                .padding(.bottom, Spacing.lg)

                // 4 个 KPI
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                    MetricCard(value: "1,247", label: "对话", color: AppColors.info)
                    MetricCard(value: "2,486", label: "消息", color: AppColors.leaf300)
                    MetricCard(value: "$12.84", label: "成本", color: AppColors.warning)
                    MetricCard(value: "85%", label: "成功率", color: AppColors.success)
                }
                .padding(.horizontal, Spacing.lg)
                .padding(.bottom, Spacing.lg)

                // Token 使用
                SettingsGroup(title: "Token 使用") {
                    VStack(spacing: 12) {
                        GaugeRow(label: "Anthropic", percent: 0.68, color: AppColors.leaf300)
                        GaugeRow(label: "OpenAI", percent: 0.42, color: AppColors.info)
                        GaugeRow(label: "Gemini", percent: 0.18, color: AppColors.amber300)
                    }
                }

                SettingsGroup(title: "按 Agent") {
                    VStack(spacing: 12) {
                        GaugeRow(label: "MyPilot", percent: 0.78, color: AppColors.leaf300)
                        GaugeRow(label: "Coder", percent: 0.32, color: AppColors.amber300)
                        GaugeRow(label: "Researcher", percent: 0.12, color: AppColors.info)
                    }
                }
            }
        }
    }
}

struct MetricCard: View {
    let value: String
    let label: String
    let color: Color

    var body: some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.system(size: 24, weight: .semibold))
                .foregroundStyle(.primary)
            Text(label)
                .font(.system(size: 11))
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(Spacing.lg)
        .background(AppColors.surfaceCard)
        .clipShape(RoundedRectangle(cornerRadius: AppRadius.md))
    }
}

struct GaugeRow: View {
    let label: String
    let percent: Double
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(label)
                    .font(.system(size: 12))
                Spacer()
                Text("\(Int(percent * 100))%")
                    .font(.system(size: 12, design: .monospaced))
                    .foregroundStyle(.secondary)
            }
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 2)
                        .fill(Color.gray.opacity(0.15))
                    RoundedRectangle(cornerRadius: 2)
                        .fill(color)
                        .frame(width: geo.size.width * percent)
                }
            }
            .frame(height: 4)
        }
    }
}
```

---

## 13. 诊断中心（DiagnosticsCenterView）

```swift
// Features/Settings/DiagnosticsCenterView.swift
struct DiagnosticsCenterView: View {
    @ObservedObject var viewModel: DiagnosticsVM

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                HStack {
                    Text("诊断中心")
                        .font(.system(size: 28, weight: .semibold))
                    Spacer()
                    Button("运行诊断", action: viewModel.runDiagnostics)
                        .buttonStyle(PrimaryButtonStyle())
                    Button("导出报告", action: viewModel.exportReport)
                        .buttonStyle(SecondaryButtonStyle())
                }
                .padding(.horizontal, Spacing.lg)
                .padding(.top, Spacing.xl)
                .padding(.bottom, Spacing.lg)

                // 网关连接
                SettingsGroup(title: "网关连接") {
                    HStack {
                        HStack(spacing: 8) {
                            StatusDot(status: .success)
                            Text("正常")
                                .font(.system(size: 13, weight: .medium))
                                .foregroundStyle(AppColors.success)
                        }
                        Spacer()
                        Text(viewModel.gatewayURL)
                            .font(.system(size: 12, design: .monospaced))
                            .foregroundStyle(.secondary)
                        Button("重连", action: viewModel.reconnect)
                            .buttonStyle(SecondaryButtonStyle())
                            .frame(width: 70)
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                }

                // 性能指标
                SettingsGroup(title: "性能指标") {
                    VStack(spacing: 0) {
                        HStack(spacing: 0) {
                            MetricBox(value: "12ms", label: "延迟")
                            Divider().frame(height: 40)
                            MetricBox(value: "8.2", label: "QPS")
                        }
                        Divider()
                        HStack(spacing: 0) {
                            MetricBox(value: "0.3%", label: "错误率")
                            Divider().frame(height: 40)
                            MetricBox(value: "99%", label: "成功率")
                        }
                    }
                }

                // 最近日志
                SettingsGroup(title: "最近日志") {
                    VStack(alignment: .leading, spacing: 0) {
                        ForEach(viewModel.logs) { log in
                            LogRow(log: log)
                        }
                    }
                }
            }
        }
    }
}

struct MetricBox: View {
    let value: String
    let label: String

    var body: some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.system(size: 16, weight: .medium))
            Text(label)
                .font(.system(size: 10))
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
    }
}

struct LogRow: View {
    let log: LogEntry

    var color: Color {
        switch log.level {
        case .info: return AppColors.info
        case .warn: return AppColors.warning
        case .error: return AppColors.danger
        }
    }

    var body: some View {
        HStack(spacing: 8) {
            Text(log.time)
                .font(.system(size: 10, design: .monospaced))
                .foregroundStyle(color)
            Text(log.level.rawValue.uppercased())
                .font(.system(size: 10, weight: .medium))
                .foregroundStyle(color)
                .frame(width: 40, alignment: .leading)
            Text(log.message)
                .font(.system(size: 11, design: .monospaced))
                .foregroundStyle(.secondary)
            Spacer()
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 5)
        .overlay(
            Rectangle()
                .frame(height: 0.5)
                .foregroundStyle(AppColors.separatorLine),
            alignment: .bottom
        )
    }
}
```

---

## 14. IM 渠道（IMChannelsView）

```swift
// Features/Settings/IMChannelsView.swift
struct IMChannelsView: View {
    @ObservedObject var viewModel: ChannelsVM

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                HStack {
                    Text("IM 通信渠道")
                        .font(.system(size: 28, weight: .semibold))
                    Spacer()
                    Button { } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "plus")
                            Text("添加渠道")
                        }
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(AppColors.userBubbleBg)
                        .clipShape(RoundedRectangle(cornerRadius: AppRadius.sm))
                    }
                    .buttonStyle(.plain)
                }
                .padding(.horizontal, Spacing.lg)
                .padding(.top, Spacing.xl)
                .padding(.bottom, Spacing.lg)

                // 3 列网格
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                    ChannelCard(channel: .feishu, status: "已连接", detail: "12 人在线")
                    ChannelCard(channel: .wecom, status: "未配置", detail: nil)
                    ChannelCard(channel: .dingtalk, status: "未配置", detail: nil)
                    ChannelCard(channel: .telegram, status: "未配置", detail: nil)
                    ChannelCard(channel: .slack, status: "未配置", detail: nil)
                    ChannelCard(channel: .discord, status: "未配置", detail: nil)
                }
                .padding(.horizontal, Spacing.lg)
            }
        }
    }
}

struct ChannelCard: View {
    let channel: Channel
    let status: String
    let detail: String?

    var color: Color {
        switch channel {
        case .feishu: return AppColors.chFeishu
        case .wecom: return AppColors.chWecom
        case .dingtalk: return AppColors.chDingtalk
        case .telegram: return AppColors.chTelegram
        case .slack: return AppColors.chSlack
        case .discord: return AppColors.chDiscord
        }
    }

    var statusColor: Color {
        if status == "已连接" { return AppColors.success }
        if status == "异常" { return AppColors.danger }
        return .secondary
    }

    var body: some View {
        VStack(spacing: 12) {
            ZStack {
                RoundedRectangle(cornerRadius: 12)
                    .fill(color.opacity(0.1))
                Image(systemName: channel.icon)
                    .font(.system(size: 28))
                    .foregroundStyle(color)
            }
            .frame(width: 64, height: 64)

            VStack(spacing: 2) {
                Text(channel.displayName)
                    .font(.system(size: 14, weight: .medium))
                Text(status)
                    .font(.system(size: 11))
                    .foregroundStyle(statusColor)
                if let detail {
                    Text(detail)
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                }
            }
        }
        .frame(maxWidth: .infinity)
        .padding(Spacing.lg)
        .background(AppColors.pageBackground)
        .clipShape(RoundedRectangle(cornerRadius: AppRadius.md))
        .overlay(
            RoundedRectangle(cornerRadius: AppRadius.md)
                .stroke(AppColors.separatorLine, lineWidth: 0.5)
        )
    }
}

enum Channel {
    case feishu, wecom, dingtalk, telegram, slack, discord

    var displayName: String {
        switch self {
        case .feishu: return "飞书"
        case .wecom: return "企业微信"
        case .dingtalk: return "钉钉"
        case .telegram: return "Telegram"
        case .slack: return "Slack"
        case .discord: return "Discord"
        }
    }

    var icon: String {
        switch self {
        case .feishu: return "message.badge"
        case .wecom: return "person.2"
        case .dingtalk: return "bell"
        case .telegram: return "paperplane"
        case .slack: return "number"
        case .discord: return "gamecontroller"
        }
    }
}
```

---

## 15. 频道详情（ChannelDetailView）

```swift
struct ChannelDetailView: View {
    @ObservedObject var viewModel: ChannelDetailVM

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                // Header
                HStack {
                    Button { viewModel.dismiss() } label: {
                        Image(systemName: "chevron.left")
                    }
                    .buttonStyle(.plain)
                    Spacer()
                    Button {} label: {
                        Image(systemName: "ellipsis")
                    }
                    .buttonStyle(.plain)
                }
                .padding(Spacing.lg)

                // 频道概要
                HStack(spacing: 14) {
                    ZStack {
                        RoundedRectangle(cornerRadius: 12)
                            .fill(viewModel.color.opacity(0.1))
                        Image(systemName: viewModel.icon)
                            .font(.system(size: 32))
                            .foregroundStyle(viewModel.color)
                    }
                    .frame(width: 64, height: 64)

                    VStack(alignment: .leading, spacing: 4) {
                        Text(viewModel.name)
                            .font(.system(size: 17, weight: .semibold))
                        Text(viewModel.description)
                            .font(.system(size: 12))
                            .foregroundStyle(.secondary)
                        HStack(spacing: 4) {
                            StatusDot(status: .success)
                            Text("已连接  \(viewModel.onlineCount) 人在线")
                                .font(.system(size: 11))
                                .foregroundStyle(.secondary)
                        }
                    }
                    Spacer()
                }
                .padding(.horizontal, Spacing.lg)
                .padding(.bottom, Spacing.lg)

                SettingsGroup(title: "配置") {
                    VStack(spacing: 0) {
                        ConfigRow(label: "App ID", value: viewModel.appID)
                        Divider().opacity(0.5).padding(.leading, 16)
                        ConfigRow(label: "App Secret", value: "••••••••••")
                        Divider().opacity(0.5).padding(.leading, 16)
                        ConfigRow(label: "机器人", value: viewModel.botName)
                    }
                }

                SettingsGroup(title: "权限") {
                    VStack(spacing: 0) {
                        ToggleRow(label: "接收消息", isOn: $viewModel.receiveEnabled)
                        Divider().opacity(0.5).padding(.leading, 16)
                        ToggleRow(label: "发送消息", isOn: $viewModel.sendEnabled)
                        Divider().opacity(0.5).padding(.leading, 16)
                        ToggleRow(label: "@提及响应", isOn: $viewModel.mentionEnabled)
                        Divider().opacity(0.5).padding(.leading, 16)
                        ToggleRow(label: "私聊支持", isOn: $viewModel.dmEnabled)
                    }
                }

                HStack(spacing: 10) {
                    Button("测试发送", action: viewModel.testSend)
                        .buttonStyle(SecondaryButtonStyle())
                    Button("断开", action: viewModel.disconnect)
                        .buttonStyle(PrimaryButtonStyle())
                }
                .padding(.horizontal, Spacing.lg)
                .padding(.top, Spacing.md)
            }
        }
    }
}

struct ToggleRow: View {
    let label: String
    @Binding var isOn: Bool

    var body: some View {
        HStack {
            Text(label)
                .font(.system(size: 13))
            Spacer()
            Toggle("", isOn: $isOn)
                .toggleStyle(.switch)
                .labelsHidden()
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
    }
}
```

---

## 16. 高级设置（AdvancedSettingsView）

```swift
// Features/Settings/AdvancedSettingsView.swift
struct AdvancedSettingsView: View {
    @ObservedObject var viewModel: AdvancedVM

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                Text("高级")
                    .font(.system(size: 28, weight: .semibold))
                    .padding(.horizontal, Spacing.lg)
                    .padding(.top, Spacing.xl)
                    .padding(.bottom, Spacing.lg)

                SettingsGroup(title: "日志") {
                    VStack(spacing: 0) {
                        ToggleRow(label: "调试日志", isOn: $viewModel.debugLog)
                        Divider().opacity(0.5).padding(.leading, 16)
                        StepperRow(label: "日志保留", value: $viewModel.logRetentionDays, range: 1...30, unit: "天")
                        Divider().opacity(0.5).padding(.leading, 16)
                        ActionRow(icon: "square.and.arrow.up", color: AppColors.info, title: "导出日志")
                    }
                }

                SettingsGroup(title: "性能") {
                    VStack(spacing: 0) {
                        StepperRow(label: "并发请求", value: $viewModel.concurrentRequests, range: 1...16, unit: "")
                        Divider().opacity(0.5).padding(.leading, 16)
                        StepperRow(label: "请求超时", value: $viewModel.requestTimeout, range: 5...120, unit: "s")
                        Divider().opacity(0.5).padding(.leading, 16)
                        StepperRow(label: "重试次数", value: $viewModel.retryCount, range: 0...5, unit: "")
                    }
                }

                SettingsGroup(title: "实验功能") {
                    VStack(spacing: 0) {
                        ToggleRow(label: "上下文压缩", isOn: $viewModel.contextCompression)
                        Divider().opacity(0.5).padding(.leading, 16)
                        ToggleRow(label: "流式响应", isOn: $viewModel.streamingResponse)
                        Divider().opacity(0.5).padding(.leading, 16)
                        ToggleRow(label: "本地缓存", isOn: $viewModel.localCache)
                    }
                }
            }
        }
    }
}

struct StepperRow: View {
    let label: String
    @Binding var value: Int
    let range: ClosedRange<Int>
    let unit: String

    var body: some View {
        HStack {
            Text(label)
                .font(.system(size: 13))
            Spacer()
            HStack(spacing: 8) {
                Button { value = max(range.lowerBound, value - 1) } label: {
                    Image(systemName: "minus")
                        .font(.system(size: 11, weight: .bold))
                        .frame(width: 22, height: 22)
                        .background(AppColors.surfaceCard)
                        .clipShape(Circle())
                }
                .buttonStyle(.plain)

                Text("\(value) \(unit)")
                    .font(.system(size: 13, design: .monospaced))
                    .frame(width: 50)

                Button { value = min(range.upperBound, value + 1) } label: {
                    Image(systemName: "plus")
                        .font(.system(size: 11, weight: .bold))
                        .frame(width: 22, height: 22)
                        .background(AppColors.surfaceCard)
                        .clipShape(Circle())
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
    }
}
```

---

## 17. 订阅页（SubscriptionView）

```swift
// Features/Settings/SubscriptionView.swift
struct SubscriptionView: View {
    @ObservedObject var viewModel: SubscriptionVM

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                Text("订阅")
                    .font(.system(size: 28, weight: .semibold))
                    .padding(.horizontal, Spacing.lg)
                    .padding(.top, Spacing.xl)
                    .padding(.bottom, Spacing.lg)

                // 当前计划
                SettingsGroup(title: "当前计划") {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Pro 月付")
                                .font(.system(size: 15, weight: .medium))
                            Text("$19/月")
                                .font(.system(size: 12))
                                .foregroundStyle(.secondary)
                            Text("下次扣费 2026-07-13")
                                .font(.system(size: 11))
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                        Button("管理订阅", action: viewModel.openSubscriptionPortal)
                            .buttonStyle(SecondaryButtonStyle())
                    }
                    .padding(14)
                }

                // 用量
                SettingsGroup(title: "用量") {
                    VStack(spacing: 14) {
                        GaugeRow(label: "对话", percent: 0.25, color: AppColors.userBubbleBg)
                        GaugeRow(label: "Token", percent: 0.21, color: AppColors.leaf300)
                        GaugeRow(label: "Agent", percent: 0.30, color: AppColors.amber300)
                        GaugeRow(label: "渠道", percent: 0.20, color: AppColors.info)
                    }
                }

                // 账单
                SettingsGroup(title: "账单历史") {
                    VStack(spacing: 0) {
                        BillRow(date: "2026-06-13", plan: "Pro 月付", amount: "$19.00")
                        Divider().opacity(0.5).padding(.leading, 16)
                        BillRow(date: "2026-05-13", plan: "Pro 月付", amount: "$19.00")
                        Divider().opacity(0.5).padding(.leading, 16)
                        BillRow(date: "2026-04-13", plan: "Pro 月付", amount: "$19.00")
                    }
                }

                HStack(spacing: 10) {
                    Button("升级到团队版", action: viewModel.upgrade)
                        .buttonStyle(PrimaryButtonStyle())
                    Button("取消订阅", action: viewModel.cancel)
                        .buttonStyle(SecondaryButtonStyle())
                }
                .padding(.horizontal, Spacing.lg)
                .padding(.top, Spacing.md)
            }
        }
    }
}

struct BillRow: View {
    let date: String
    let plan: String
    let amount: String

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(date)
                    .font(.system(size: 13))
                Text(plan)
                    .font(.system(size: 11))
                    .foregroundStyle(.secondary)
            }
            Spacer()
            Text(amount)
                .font(.system(size: 13, design: .monospaced))
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
    }
}
```

---

## 18. SidebarView

```swift
// Views/SidebarView.swift
struct SidebarView: View {
    @ObservedObject var viewModel: SidebarVM
    @State private var search: String = ""

    var body: some View {
        VStack(spacing: 0) {
            // 搜索
            HStack(spacing: 6) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 12))
                    .foregroundStyle(.secondary)
                TextField("搜索历史消息...", text: $search)
                    .textFieldStyle(.plain)
                    .font(.system(size: 12))
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .background(AppColors.pageBackground)
            .clipShape(RoundedRectangle(cornerRadius: AppRadius.sm))
            .overlay(
                RoundedRectangle(cornerRadius: AppRadius.sm)
                    .stroke(AppColors.separatorLine, lineWidth: 0.5)
            )
            .padding(10)

            // 列表
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    // OpenClaw 实例
                    Section {
                        VStack(spacing: 1) {
                            ForEach(viewModel.instances) { instance in
                                InstanceRow(instance: instance)
                            }
                        }
                    } header: {
                        SidebarSectionTitle(title: "OpenClaw 实例")
                    }

                    // 智能体
                    Section {
                        VStack(spacing: 1) {
                            ForEach(viewModel.agents) { agent in
                                AgentSidebarRow(agent: agent,
                                                 isSelected: viewModel.currentAgent?.id == agent.id)
                                if viewModel.currentAgent?.id == agent.id {
                                    ForEach(agent.conversations) { conv in
                                        ConversationRow(conv: conv)
                                    }
                                }
                            }
                        }
                    } header: {
                        SidebarSectionTitle(title: "智能体")
                    }
                }
            }

            // 底部按钮
            HStack(spacing: 8) {
                Button { viewModel.showAddInstance() } label: {
                    HStack(spacing: 5) {
                        Image(systemName: "plus")
                        Text("添加实例")
                    }
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background(AppColors.userBubbleBg)
                    .clipShape(RoundedRectangle(cornerRadius: AppRadius.sm))
                }
                .buttonStyle(.plain)

                Button { viewModel.openSettings() } label: {
                    Image(systemName: "gearshape")
                        .font(.system(size: 13))
                        .foregroundStyle(.secondary)
                        .frame(width: 36)
                        .padding(.vertical, 8)
                        .background(AppColors.pageBackground)
                        .clipShape(RoundedRectangle(cornerRadius: AppRadius.sm))
                        .overlay(
                            RoundedRectangle(cornerRadius: AppRadius.sm)
                                .stroke(AppColors.separatorLine, lineWidth: 0.5)
                        )
                }
                .buttonStyle(.plain)
            }
            .padding(10)
            .background(AppColors.surfaceCard)
            .overlay(
                Rectangle().frame(height: 0.5).foregroundStyle(AppColors.separatorLine),
                alignment: .top
            )
        }
        .background(AppColors.surfaceCard)
        .frame(width: 230)
    }
}

struct SidebarSectionTitle: View {
    let title: String

    var body: some View {
        Text(title.uppercased())
            .font(.system(size: 10, weight: .semibold))
            .foregroundStyle(.secondary)
            .padding(.horizontal, 8)
            .padding(.top, 12)
            .padding(.bottom, 4)
    }
}
```

---

## 19. 侧边栏实例行 + Agent 行 + 对话行

```swift
// Views/Sidebar/InstanceRow.swift
struct InstanceRow: View {
    let instance: OpenClawInstance

    var body: some View {
        HStack(spacing: 8) {
            ZStack {
                Circle()
                    .fill(AppColors.lime300)
                Text(instance.name.prefix(1).uppercased())
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(.primary)
            }
            .frame(width: 24, height: 24)

            VStack(alignment: .leading, spacing: 1) {
                Text(instance.name)
                    .font(.system(size: 12, weight: .medium))
                    .lineLimit(1)
                Text(instance.url)
                    .font(.system(size: 10))
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
            Spacer()
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 6)
        .background(Color.clear)
        .contentShape(Rectangle())
    }
}

// Views/Sidebar/AgentSidebarRow.swift
struct AgentSidebarRow: View {
    let agent: Agent
    let isSelected: Bool

    var body: some View {
        HStack(spacing: 8) {
            AgentAvatarView(agent: agent, size: 24)
            VStack(alignment: .leading, spacing: 1) {
                Text(agent.displayName)
                    .font(.system(size: 12, weight: .medium))
                    .lineLimit(1)
                Text(agent.modelName)
                    .font(.system(size: 10))
                    .foregroundStyle(isSelected ? .white.opacity(0.8) : .secondary)
                    .lineLimit(1)
            }
            Spacer()
            if isSelected {
                Image(systemName: "checkmark")
                    .font(.system(size: 11))
                    .foregroundStyle(.white)
                    .transition(.scale.combined(with: .opacity))
            }
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 6)
        .background(
            isSelected
                ? AppColors.userBubbleBg
                : Color.clear
        )
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .contentShape(Rectangle())
        .foregroundStyle(isSelected ? .white : .primary)
    }
}

// Views/Sidebar/ConversationRow.swift
struct ConversationRow: View {
    let conv: Conversation

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "bubble.left")
                .font(.system(size: 12))
                .foregroundStyle(.secondary)
                .frame(width: 14)
            VStack(alignment: .leading, spacing: 1) {
                Text(conv.title)
                    .font(.system(size: 12))
                    .lineLimit(1)
                if let preview = conv.lastMessage {
                    Text(preview)
                        .font(.system(size: 10))
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
            }
            Spacer()
        }
        .padding(.leading, 32)
        .padding(.trailing, 8)
        .padding(.vertical, 5)
        .contentShape(Rectangle())
    }
}
```

---

## 附录：常见模式

### A.1 页面头部

```swift
HStack {
    Text("页面标题")
        .font(.system(size: 28, weight: .semibold))
    Spacer()
    Button { } label: {
        // 右上角操作
    }
    .buttonStyle(PrimaryButtonStyle())
}
.padding(.horizontal, Spacing.lg)
.padding(.top, Spacing.xl)
.padding(.bottom, Spacing.lg)
```

### A.2 Section Header

```swift
Text(title.uppercased())
    .font(.system(size: 12, weight: .semibold))
    .foregroundStyle(.secondary)
    .padding(.horizontal, Spacing.lg)
    .padding(.top, Spacing.xs)
```

### A.3 Sheet 标准

```swift
.sheet(isPresented: $showSheet) {
    SheetContent()
}
```

> **注意**：`presentationDetents` 和 `presentationDragIndicator` 是 iOS 16+ 专用 API，在 macOS 上无效。macOS 的 Sheet 直接使用 `.sheet` 即可，无需额外修饰符。

### A.4 圆按钮样式

```swift
struct CircleIconButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .frame(width: 32, height: 32)
            .background(AppColors.surfaceCard)
            .clipShape(Circle())
            .scaleEffect(configuration.isPressed ? 0.95 : 1.0)
            .animation(.spring(response: 0.2, dampingFraction: 0.7), value: configuration.isPressed)
    }
}
```

### A.5 主题适配

```swift
@Environment(\.colorScheme) var colorScheme

var bgColor: Color {
    colorScheme == .dark
        ? Color.black
        : AppColors.pageBackground
}
```

---

## 完整文件清单

| 文件 | 路径 |
|------|------|
| `AppColors.swift` | `Core/DesignSystem/AppColors.swift` |
| `AppTypography.swift` | `Core/DesignSystem/AppTypography.swift` |
| `Spacing.swift` | `Core/DesignSystem/Spacing.swift` |
| `AppRadius.swift` | `Core/DesignSystem/AppRadius.swift` |
| `IconBlock.swift` | `Components/IconBlock.swift` |
| `SettingsRow.swift` | `Components/SettingsRow.swift` |
| `SettingsGroup.swift` | `Components/SettingsGroup.swift` |
| `StatusDot.swift` | `Components/StatusDot.swift` |
| `ChatBubble.swift` | `Features/Chat/ChatBubble.swift` |
| `ChatHeaderSection.swift` | `Features/Chat/ChatHeaderSection.swift` |
| `TokenUsageBar.swift` | `Features/Chat/TokenUsageBar.swift` |
| `InputBarView.swift` | `Views/InputBarView.swift` |
| `ChatView.swift` | `Views/ChatView.swift` |
| `WelcomeView.swift` | `Views/WelcomeView.swift` |
| `AddInstanceView.swift` | `Views/AddInstanceView.swift` |
| `SidebarView.swift` | `Views/SidebarView.swift` |
| `SettingsView.swift` | `Features/Settings/SettingsView.swift` |
| `NetworkSettingsView.swift` | `Features/Settings/NetworkSettingsView.swift` |
| `AgentsManagementView.swift` | `Features/Settings/AgentsManagementView.swift` |
| `AgentDetailView.swift` | `Features/Settings/AgentDetailView.swift` |
| `AgentFilesView.swift` | `Features/Settings/AgentFilesView.swift` |
| `ScheduledTasksView.swift` | `Features/Settings/ScheduledTasksView.swift` |
| `UsageStatsView.swift` | `Features/Settings/UsageStatsView.swift` |
| `DiagnosticsCenterView.swift` | `Features/Settings/DiagnosticsCenterView.swift` |
| `IMChannelsView.swift` | `Features/Settings/IMChannelsView.swift` |
| `ChannelDetailView.swift` | `Features/Settings/ChannelDetailView.swift` |
| `AdvancedSettingsView.swift` | `Features/Settings/AdvancedSettingsView.swift` |
| `SubscriptionView.swift` | `Features/Settings/SubscriptionView.swift` |

---

## 20. 补充业务组件

### 20.1 ErrorToast

```swift
struct ErrorToast: View {
    let message: String
    let isShowing: Bool

    var body: some View {
        if isShowing {
            HStack(spacing: 8) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.system(size: 12))
                    .foregroundStyle(AppColors.danger)
                Text(message)
                    .font(.system(size: 12))
                    .foregroundStyle(AppColors.danger)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(AppColors.dangerSoft)
            .clipShape(RoundedRectangle(cornerRadius: AppRadius.md))
            .transition(.move(edge: .top).combined(with: .opacity))
        }
    }
}
```

### 20.2 DisconnectedBanner

```swift
struct DisconnectedBanner: View {
    let onReconnect: () -> Void

    var body: some View {
        Button(action: onReconnect) {
            HStack(spacing: 6) {
                StatusDot(status: .danger)
                Text("连接已断开 · 点击重连")
                    .font(.system(size: 12))
                    .foregroundStyle(AppColors.danger)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 6)
            .background(AppColors.dangerSoft)
        }
        .buttonStyle(.plain)
    }
}
```

### 20.3 CommandPickerView（/ 命令选择器）

```swift
struct CommandPickerView: View {
    let onSelect: (String) -> Void

    let commands = [
        CommandItem(name: "/compact", description: "压缩上下文，释放 token 空间", icon: "arrow.triangle.2.circlepath"),
        CommandItem(name: "/new", description: "新建会话，清空当前对话", icon: "plus.circle")
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ForEach(commands) { cmd in
                Button { onSelect(cmd.name) } label: {
                    HStack(spacing: 10) {
                        Image(systemName: cmd.icon)
                            .font(.system(size: 14))
                            .foregroundStyle(AppColors.info)
                            .frame(width: 24)
                        VStack(alignment: .leading, spacing: 1) {
                            Text(cmd.name)
                                .font(.system(size: 13, weight: .medium))
                            Text(cmd.description)
                                .font(.system(size: 11))
                                .foregroundStyle(.secondary)
                        }
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }
        }
    }
}

struct CommandItem: Identifiable {
    let id = UUID()
    let name: String
    let description: String
    let icon: String
}
```
