# MyPilot SwiftUI 组件参考

> 其他会话执行 UI 开发时使用。本文档基于 `/Users/liaoxing/Downloads/MyPilot/MyPilotApp/MyPilot/MyPilot/` 实际代码，所有组件均与项目代码对齐。
>
> **重要**：
> - 本项目使用 Apple SF Symbols（系统图标），不使用自定义 `mp.*` 图标
> - 本项目是 macOS App，使用 SwiftUI + `@Observable` 宏
> - 设计 Token 名称以 `AppColors` / `Spacing` / `AppRadius` / `AppTypography` 为准
> - 不使用 `HSplitView`（实际项目用 VStack 布局）
> - 不使用 `NSColor`（仅 macOS 私有 API，本项目用 `Color(hex:darkHex:)` 跨平台方案）

---

## 1. Design Tokens（直接使用现有 enum）

### 1.1 颜色 `AppColors`

```swift
import SwiftUI

// V10 iMessage-style 调色板
AppColors.pageBackground     // #FFFFFF / dark #000000
AppColors.surfaceCard        // #F5F5F7 / dark #1C1C1E
AppColors.elevatedSurface    // #F5F5F7
AppColors.separatorLine      // #E5E5EA / dark #38383A  ← 注意是 separatorLine 不是 divider

AppColors.primaryText        // #000000 / dark #FFFFFF
AppColors.secondaryText      // #8E8E93
AppColors.tertiaryText       // #C7C7CC

// V10 iMessage 气泡
AppColors.userBubbleBg       // #007AFF
AppColors.userBubbleText     // #FFFFFF
AppColors.aiBubbleBg         // #E5E5EA / dark #2C2C2E
AppColors.aiBubbleBorder     // #E5E5EA
AppColors.aiBubbleText       // #000000 / dark #FFFFFF

// 状态色 + soft 背景
AppColors.success            // #34C759
AppColors.danger             // #FF3B30
AppColors.warning            // #FF9500
AppColors.info               // #007AFF
AppColors.accentSoft         // info @ 10% opacity
AppColors.dangerSoft         // danger @ 10%
AppColors.successSoft        // success @ 10%
AppColors.warningSoft        // warning @ 10%

// V10 灰阶（Apple 标准）
AppColors.ink50 ... ink900   // #FAFAFA → #1C1C1E

// 品牌色
AppColors.amber300           // #F6AD02
AppColors.lime300            // #ACCE22
AppColors.leaf300            // #0DA945

// 文件图标色
AppColors.fileIconPdf / Doc / Xls / Ppt / Default

// 渠道色（飞书/企微/钉钉/QQ/Telegram/Slack/Discord）
AppColors.channelFeishu / Wecom / Dingtalk / QQ / Telegram / Slack / Discord

// 模型供应商色
AppColors.providerArk / Tencent / Zhipu / OpenAI / DeepSeek / Other

// 工具方法
AppColors.gauge(percent: 85)            // 自动返回 success/warning/danger
```

### 1.2 间距 `Spacing`

```swift
enum Spacing {
    static let xxs: CGFloat = 2
    static let xs:  CGFloat = 4
    static let sm:  CGFloat = 8
    static let md:  CGFloat = 12
    static let lg:  CGFloat = 16
    static let xl:  CGFloat = 24
    static let xxl: CGFloat = 32
    static let xxxl: CGFloat = 48
}
```

### 1.3 圆角 `AppRadius`

```swift
enum AppRadius {
    static let sm:   CGFloat = 8
    static let md:   CGFloat = 10
    static let lg:   CGFloat = 14
    static let xl:   CGFloat = 16
    static let card: CGFloat = 14
    static let xxl:  CGFloat = 18  // 消息气泡
    static let full: CGFloat = .infinity
}
```

### 1.4 字体 `AppTypography`

```swift
enum AppTypography {
    static let heroNumber     = Font.system(size: 28, weight: .bold).monospacedDigit()
    static let pageTitle      = Font.system(size: 24, weight: .semibold)
    static let sectionTitle   = Font.system(size: 15, weight: .semibold)
    static let listTitle      = Font.system(size: 14, weight: .medium)
    static let body           = Font.system(size: 13, weight: .regular)
    static let caption        = Font.system(size: 12, weight: .regular)
    static let badge          = Font.system(size: 11, weight: .semibold)
    static let data           = Font.system(size: 11, weight: .regular)
    static let captionMono    = Font.system(.caption, design: .monospaced)
    static let nano           = Font.system(size: 11, weight: .regular)
    static let statusIcon     = Font.caption
    static let actionIcon     = Font.system(size: 16, weight: .medium)
    static let cardTitle      = Font.headline
    static let sectionHeader  = Font.subheadline.weight(.semibold)
}
```

---

## 2. 核心 UI 模式（项目实际用法）

### 2.1 iMessage 风格聊天气泡

**项目使用** `UnevenRoundedRectangle` 实现 iMessage 风格（18-18-18-4 或 18-4-18-18），参考 `MessageBubbleView.swift`：

```swift
// 用户气泡（右对齐，朝向左侧的角收窄）
UnevenRoundedRectangle(
    topLeadingRadius: 18,
    bottomLeadingRadius: 4,
    bottomTrailingRadius: 18,
    topTrailingRadius: 18
)

// AI 气泡（左对齐，朝向右侧的角收窄）
UnevenRoundedRectangle(
    topLeadingRadius: 18,
    bottomLeadingRadius: 18,
    bottomTrailingRadius: 4,
    topTrailingRadius: 18
)
```

### 2.2 Sidebar 230px + ChatView VStack 布局

**项目使用** `VStack` 横向布局侧边栏（不是 `NavigationSplitView`）：

```swift
HStack(spacing: 0) {
    SidebarView()
        .frame(width: 230)
        .background(AppColors.surfaceCard)

    Divider()
        .background(AppColors.separatorLine)

    ChatView()
        .frame(maxWidth: .infinity)
}
```

### 2.3 StatusDot 状态点 + 脉冲呼吸

参考 `StatusDot.swift`：

```swift
struct StatusDot: View {
    let color: Color
    let isPulsing: Bool

    var body: some View {
        Circle()
            .fill(color)
            .frame(width: 6, height: 6)
            .overlay {
                if isPulsing {
                    Circle()
                        .stroke(color, lineWidth: 1.5)
                        .scaleEffect(1.0)
                        .opacity(0.6)
                        .animation(
                            .easeInOut(duration: 1.4).repeatForever(autoreverses: true),
                            value: isPulsing
                        )
                }
            }
    }
}

// 用法
HStack(spacing: Spacing.xs) {
    StatusDot(color: AppColors.leaf300, isPulsing: true)
    Text("已连接 · 42ms")
        .font(AppTypography.caption)
        .foregroundStyle(AppColors.secondaryText)
}
```

### 2.4 IconBlock 图标块（soft 背景 + 彩色图标）

参考 `IconBlock.swift`：

```swift
struct IconBlock: View {
    let systemName: String
    let color: Color
    var size: CGFloat = 32

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: AppRadius.md)
                .fill(color.opacity(0.10))     // ← V10 关键：透明度 0.10
                .frame(width: size, height: size)
            Image(systemName: systemName)
                .font(.system(size: size * 0.5, weight: .medium))
                .foregroundStyle(color)
        }
    }
}

// 用法
IconBlock(systemName: "antenna.radiowaves.left.and.right", color: AppColors.amber300)
IconBlock(systemName: "gearshape.fill", color: AppColors.info)
IconBlock(systemName: "exclamationmark.triangle.fill", color: AppColors.warning)
```

### 2.5 SettingsRow 设置行

参考 `SettingsRow.swift`：

```swift
struct SettingsRow<Content: View>: View {
    let title: String
    let systemImage: String
    let tint: Color
    @ViewBuilder let content: Content

    var body: some View {
        HStack(spacing: Spacing.md) {
            IconBlock(systemName: systemImage, color: tint, size: 28)
            Text(title)
                .font(AppTypography.listTitle)
                .foregroundStyle(AppColors.primaryText)
            Spacer()
            content
        }
        .padding(.vertical, Spacing.sm)
    }
}

// 用法
SettingsRow(title: "网络设置", systemImage: "network", tint: AppColors.info) {
    Image(systemName: "chevron.right")
        .font(.caption)
        .foregroundStyle(AppColors.tertiaryText)
}
```

### 2.6 CardContainer 卡片容器

参考 `CardContainer.swift`：

```swift
struct CardContainer<Content: View>: View {
    @ViewBuilder let content: Content

    var body: some View {
        content
            .padding(Spacing.lg)
            .background(
                RoundedRectangle(cornerRadius: AppRadius.card)
                    .fill(AppColors.surfaceCard)
            )
            .overlay(
                RoundedRectangle(cornerRadius: AppRadius.card)
                    .stroke(AppColors.separatorLine, lineWidth: 0.5)
            )
    }
}
```

### 2.7 InputBar 单行输入栏（V10 紧凑版）

参考 `InputBarView.swift`：

```swift
HStack(spacing: Spacing.sm) {
    // 32x32 圆形按钮
    Button { /* attach */ } label: {
        Image(systemName: "paperclip")
            .font(.system(size: 16, weight: .medium))
            .frame(width: 32, height: 32)
            .background(Circle().fill(AppColors.surfaceCard))
    }
    .buttonStyle(.plain)

    Button { /* menu */ } label: {
        Image(systemName: "ellipsis")
            .font(.system(size: 16, weight: .medium))
            .frame(width: 32, height: 32)
            .background(Circle().fill(AppColors.surfaceCard))
    }
    .buttonStyle(.plain)

    // 输入框（高度 36-40，圆角 20）
    TextField("输入消息", text: $text, axis: .vertical)
        .textFieldStyle(.plain)
        .font(AppTypography.body)
        .padding(.horizontal, Spacing.md)
        .padding(.vertical, Spacing.sm)
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(AppColors.surfaceCard)
        )
        .lineLimit(1...6)

    // 32x32 发送/停止按钮（带 symbolEffect 动画）
    Button { /* send/stop */ } label: {
        Image(systemName: isProcessing ? "stop.fill" : "arrow.up")
            .font(.system(size: 16, weight: .semibold))
            .foregroundStyle(.white)
            .frame(width: 32, height: 32)
            .background(Circle().fill(isProcessing ? AppColors.danger : AppColors.info))
            .contentTransition(.symbolEffect(.replace))
    }
    .buttonStyle(.plain)
}
.padding(.horizontal, Spacing.md)
.padding(.vertical, Spacing.sm)
.background(AppColors.pageBackground)
```

### 2.8 Avatar 头像组件

参考 `AgentAvatarView.swift`：

```swift
struct AgentAvatarView: View {
    let agent: Agent
    var size: CGFloat = 24

    var body: some View {
        Group {
            if let path = agent.localAvatarPath,
               let nsImage = NSImage(contentsOf: path) {
                Image(nsImage: nsImage)
                    .resizable()
                    .scaledToFill()
            } else if let url = agent.avatarUrl,
                      let data = try? Data(contentsOf: url) {
                if let nsImage = NSImage(data: data) {
                    Image(nsImage: nsImage).resizable().scaledToFill()
                } else {
                    placeholder
                }
            } else {
                placeholder
            }
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
    }

    private var placeholder: some View {
        Circle()
            .fill(AppColors.accentSoft)
            .overlay {
                Image(systemName: "person.fill")
                    .foregroundStyle(AppColors.info)
                    .font(.system(size: size * 0.5))
            }
    }
}
```

---

## 3. 19 个页面的核心规范

完整设计稿查看 `02-UI展示/00-mypilot-complete-ui-showcase.html` 和 `00-设计规范/01-MyPilot-Complete-UI-Design-Spec.md`。

| 区域 | 页面 | 关键组件 |
|------|------|----------|
| **核心** | 欢迎页 | 72x72 IconBlock + 3 步骤 + 底部 v1.0.0 文字 |
| **核心** | 聊天主页 | Sidebar 230px + ChatView VStack |
| **核心** | 添加实例 | 2 步 Sheet：URL → 配对码+QR |
| **设置** | 设置主页 | SettingsRow 列表 + StatusDot |
| **设置** | 网络设置 | iOS Inset Form 风格 |
| **设置** | 智能体管理 | List + AgentAvatarView |
| **设置** | IM 渠道 | 渠道色 IconBlock + StatusDot |
| **设置** | 诊断中心 | monospaced log + filter chips |
| **设置** | 用量统计 | TokenUsageBar 4px + 数据 card |
| **设置** | 关于 | IconBlock 缩放淡入 + 列表逐项入场 |
| **智能体** | Agent 详情 | 头像 + 名称 + 文件列表 + 删除确认 |
| **智能体** | Agent 文件 | 文件图标色 + 选中背景渐变 |
| **任务** | 定时任务 | List + Schedule icon + toggle |
| **任务** | 占位/高级 | PlaceholderSettingsPages |
| **数据** | 内存读取 | MemoryRepository + 搜索面板 |
| **数据** | 会话历史 | SessionList + ConversationRow |
| **数据** | 统计 | StatsRepository + 图表 |
| **通信** | IM 渠道详情 | channel color + StatusDot |
| **订阅** | 占位 | 订阅卡片 + 即将推出徽标 |

---

## 4. 关键约束

### 4.1 禁止事项

- ❌ 不要使用 `mp.*` 自定义图标（已回滚，用 SF Symbols）
- ❌ 不要使用 `HSplitView`（项目用 VStack + HStack）
- ❌ 不要使用 `NSColor(windowBackgroundColor)` 等 macOS-only API
- ❌ 不要修改 `AppColors` 已有的 token 名称
- ❌ 不要修改已部署的图标 SVG 和 Asset Catalog

### 4.2 必须遵守

- ✅ 颜色用 `AppColors.xxx`（不要硬编码 hex）
- ✅ 间距用 `Spacing.xxx`
- ✅ 圆角用 `AppRadius.xxx`
- ✅ 字体用 `AppTypography.xxx`
- ✅ 视图状态用 `@Observable` 宏（项目统一使用）
- ✅ 消息气泡用 `UnevenRoundedRectangle`
- ✅ 用户/AI 气泡色固定：`userBubbleBg` / `aiBubbleBg`
- ✅ 状态指示用 `StatusDot` + pulse 动画
- ✅ 侧边栏宽度 230px
- ✅ ChatView 用 VStack + HStack 布局

### 4.3 关键文件路径

```
/Users/liaoxing/Downloads/MyPilot/MyPilotApp/MyPilot/MyPilot/
├── Core/DesignSystem/
│   ├── AppColors.swift
│   ├── Spacing.swift
│   ├── AppRadius.swift
│   └── AppTypography.swift
├── Features/Chat/
│   ├── ChatViewModel.swift
│   ├── ChatHeaderSection.swift
│   ├── ChatInputSection.swift
│   ├── ChatMessageSection.swift
│   └── MessageBubbleView.swift
├── Features/Settings/
│   ├── SettingsView.swift
│   ├── NetworkSettingsView.swift
│   ├── AgentsManagementView.swift
│   ├── IMChannelsView.swift
│   ├── DiagnosticsCenterView.swift
│   ├── UsageStatsView.swift
│   ├── AboutView.swift
│   └── PlaceholderSettingsPages.swift
├── SharedComponents/
│   ├── AgentAvatarView.swift
│   ├── CardContainer.swift
│   ├── CopyButton.swift
│   └── ModelPill.swift
└── Views/
    ├── SidebarView.swift
    ├── ChatView.swift
    ├── AddInstanceView.swift
    └── WelcomeView.swift
```

---

## 5. 常用 SF Symbols 速查

```swift
// 导航
"chevron.left" / "chevron.right" / "chevron.up" / "chevron.down"
"xmark" / "plus" / "minus" / "arrow.up" / "arrow.down"
"arrow.up.right" / "arrow.uturn.left"

// 状态
"checkmark" / "exclamationmark.triangle.fill" / "info.circle.fill"
"wifi" / "wifi.exclamationmark" / "antenna.radiowaves.left.and.right"

// 通信
"paperclip" / "ellipsis" / "arrow.up.circle.fill" / "stop.fill"
"envelope" / "bubble.left" / "bubble.left.fill"
"magnifyingglass" / "mic.fill" / "speaker.wave.2.fill"

// 智能体/任务
"person.fill" / "person.crop.circle" / "person.2.fill"
"gearshape.fill" / "slider.horizontal.3"
"calendar" / "clock" / "alarm" / "play.fill" / "pause.fill"
"bolt.fill" / "wand.and.stars"

// 数据/分析
"chart.bar.fill" / "chart.line.uptrend.xyaxis" / "gauge.with.needle"
"memorychip" / "cpu" / "doc.text" / "tray.full.fill"
"server.rack" / "externaldrive" / "icloud"

// 网络/连接
"network" / "globe" / "link" / "qrcode.viewfinder"
"shield.fill" / "lock.fill" / "key.fill"
"arrow.triangle.2.circlepath" / "arrow.clockwise"

// 渠道
"message.fill" / "bubble.left.and.bubble.right.fill"
"phone.fill" / "video.fill" / "envelope.fill"
"bell.fill" / "megaphone.fill"
```

---

## 6. 动画模式（项目实际使用）

| 元素 | 动画 | 时长/曲线 |
|------|------|-----------|
| 消息气泡入场 | spring 缩放+淡入+偏移 | 0.4s spring(0.7) |
| 思考过程折叠 | chevron + 内容淡入滑出 | 0.25s easeInOut |
| 发送/停止按钮 | symbolEffect + ZStack 切换 | 0.3s spring |
| Token 进度条 | 宽度平滑 + 数字 transition | 0.6s / 0.3s |
| ErrorToast | 顶部滑入 + 淡入 | 0.3s spring |
| 侧边栏选中 | 背景渐显 + checkmark 缩放 | 0.2s |
| Agent 切换 | 消息列表淡入淡出 | 0.3s |
| StatusDot 脉冲 | stroke 缩放+opacity | 1.4s easeInOut repeatForever |
| 文件选中背景 | 渐变 | 0.15s easeInOut |
