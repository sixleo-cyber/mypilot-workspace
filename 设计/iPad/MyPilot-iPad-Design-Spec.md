# MyPilot iPad 设计规范文档

> **目标读者**：code agent / 工程师
> **目标产物**：基于 MyPilot Mac 端 SwiftUI 源码，按本规范 1:1 实现 iPad 版本
> **设计语言**：V10 iMessage-style · Apple HIG · iPadOS 17+ SwiftUI
> **版本**：v1.0 · 2026-06-14
> **源真值**：`/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/`

---

## 0. 30 秒速览

```
┌──────────────────────────────────────────────────────────────────┐
│ MyPilot iPad = 320pt 侧边栏 + 详情区 (NavigationSplitView)        │
│                                                                   │
│  • 设计语言：iMessage 蓝色气泡 + Apple HIG 灰阶                    │
│  • 字体：SF Pro + PingFang SC / Noto Sans SC                       │
│  • 圆角：用户气泡 18/18/4/18 · AI 气泡 4/18/18/18                  │
│  • 状态色：success #34C759 · danger #FF3B30 · warning #FF9500      │
│  • 设备目标：iPad Pro 13" 横屏 (1376×1024) / 纵屏 (1024×1366)      │
│  • 协议：OpenClaw Gateway via 本地 daemon (port 52378)             │
└──────────────────────────────────────────────────────────────────┘
```

**核心文件清单**（code agent 必须先读这些）：

| 路径 | 用途 |
|---|---|
| `Core/DesignSystem/AppColors.swift` | 颜色 token |
| `Core/DesignSystem/AppTypography.swift` | 字号 token |
| `Core/DesignSystem/AppRadius.swift` | 圆角 token |
| `Core/DesignSystem/Spacing.swift` | 间距 token |
| `Core/DesignSystem/AdaptiveLayout.swift` | 自适应布局 |
| `Views/ContentView.swift` | 根 NavigationSplitView |
| `Views/SidebarView.swift` | 侧边栏 |
| `Views/ChatView.swift` | 主聊天 |
| `Views/InputBarView.swift` | 输入栏 |
| `Features/Chat/MessageBubbleView.swift` | 消息气泡 |
| `Features/Settings/*` | 设置面板所有子页 |

---

## 1. 设计原则

### 1.1 五大原则（code agent 必须遵守）

1. **功能性优先**：每个 UI 元素必须能映射到 source 中的某个具体功能，不添加"装饰性"组件
2. **HIG 严格合规**：触控热区 ≥ 44pt，文本字号最小 13pt，左对齐优先
3. **iMessage 美学**：用户气泡蓝 #007AFF，AI 气泡灰 #E5E5EA，圆角 18pt
4. **状态明确**：每个交互必须有视觉反馈（hover / press / loading / success / error）
5. **本地优先**：所有用户数据存本地 Documents/，Avatar 优先读本地

### 1.2 不应做的事

- ❌ 添加紫色渐变（AI slop）
- ❌ 使用 Inter / Roboto 字体
- ❌ 玻璃拟态（frosted glass）效果
- ❌ Emoji 作为 logo / 品牌主标识
- ❌ 修改 `Core/DesignSystem/` 下的 token 值（除非有明确产品决策）
- ❌ 修改 `mypilot-link` daemon 的 `/api/info` 接口

---

## 2. 设计令牌（Design Tokens）

> **重要**：所有 token 都封装在 enum 中，code agent 必须使用 enum 引用，禁止硬编码。

### 2.1 AppColors（颜色系统）

**完整 Swift 代码**（直接复制到 `Core/DesignSystem/AppColors.swift`）：

```swift
import SwiftUI

// MARK: - V10 iMessage-style Color Tokens
enum AppColors {
    // Surfaces (Apple system gray scale)
    static let pageBackground    = Color(hex: "#FFFFFF")
    static let surfaceCard       = Color(hex: "#F5F5F7")
    static let elevatedSurface   = Color(hex: "#F5F5F7")
    static let separatorLine     = Color(hex: "#E5E5EA")

    // Ink scale (text)
    static let primaryText       = Color(hex: "#1C1C1E")
    static let secondaryText     = Color(hex: "#3A3A3C")
    static let tertiaryText      = Color(hex: "#8E8E93")
    static let quaternaryText    = Color(hex: "#C7C7CC")

    // Chat Bubbles (V10 iMessage)
    static let userBubbleBg      = Color(hex: "#007AFF")
    static let userBubbleText    = Color(hex: "#FFFFFF")
    static let aiBubbleBg        = Color(hex: "#E5E5EA")
    static let aiBubbleText      = Color(hex: "#000000")

    // System status colors
    static let success           = Color(hex: "#34C759")
    static let danger            = Color(hex: "#FF3B30")
    static let warning           = Color(hex: "#FF9500")
    static let info              = Color(hex: "#007AFF")

    // Soft variants (12% opacity for backgrounds)
    static let accentSoft        = info.opacity(0.14)
    static let successSoft       = success.opacity(0.14)
    static let dangerSoft        = danger.opacity(0.14)
    static let warningSoft       = warning.opacity(0.14)

    // Brand accents
    static let amber300          = Color(hex: "#F6AD02")  // for default agent
    static let leaf300           = Color(hex: "#0DA945")  // for coder agent
    static let lime300           = Color(hex: "#ACCE22")  // for writer agent

    // File type colors
    static let filePdf           = Color(hex: "#E53935")
    static let fileDoc           = Color(hex: "#1976D2")
    static let fileXls           = Color(hex: "#388E3C")
    static let filePpt           = Color(hex: "#F57C00")
    static let fileDefault       = Color(hex: "#8E8E93")

    // IM Channel brand colors
    static let channelFeishu     = Color(hex: "#3370FF")
    static let channelWecom      = Color(hex: "#2AAE67")
    static let channelDingtalk   = Color(hex: "#0089FF")
    static let channelQQ         = Color(hex: "#12B7F5")
    static let channelTelegram   = Color(hex: "#0088CC")
    static let channelSlack      = Color(hex: "#611F69")
    static let channelDiscord    = Color(hex: "#5865F2")
}

// Helper extension for hex colors
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default: (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(.sRGB, red: Double(r) / 255, green: Double(g) / 255, blue: Double(b) / 255, opacity: Double(a) / 255)
    }
}
```

**使用规则**：

```swift
// ✅ 正确
Text("Hello").foregroundColor(AppColors.userBubbleBg)
Text("Hello").foregroundColor(AppColors.tertiaryText)

// ❌ 错误
Text("Hello").foregroundColor(.blue)
Text("Hello").foregroundColor(Color(red: 0, green: 0.478, blue: 1))
```

### 2.2 AppTypography（字号系统）

**完整 Swift 代码**：

```swift
import SwiftUI

enum AppTypography {
    // 基础字号 (8级)
    static let heroNumber    = Font.system(size: 28, weight: .bold)
    static let pageTitle     = Font.system(size: 24, weight: .semibold)
    static let sectionTitle  = Font.system(size: 15, weight: .semibold)
    static let listTitle     = Font.system(size: 14, weight: .medium)
    static let body          = Font.system(size: 13, weight: .regular)
    static let caption       = Font.system(size: 12, weight: .regular)
    static let data          = Font.system(size: 11, weight: .regular)
    static let nano          = Font.system(size: 10, weight: .regular)

    // 标签字号
    static let badge         = Font.system(size: 11, weight: .semibold)
    static let labelMicro    = Font.system(size: 9,  weight: .semibold)

    // Action icons
    static let actionIcon    = Font.system(size: 16, weight: .regular)
    static let decorIcon     = Font.system(size: 20, weight: .regular)  // 32 / 48 / 64 也可
}

// MARK: - 字号使用矩阵
/*
 | 角色               | Token           | 字号 | 用途                              |
 |--------------------|-----------------|------|-----------------------------------|
 | 弹窗标题           | pageTitle       |  24  | Sheet 大标题                      |
 | 页面标题           | pageTitle       |  24  | 设置详情页标题                    |
 | Section header     | sectionTitle    |  15  | 列表分组标题                      |
 | 列表项主标题       | listTitle       |  14  | Agent row / 任务名                |
 | 正文 / 消息        | body            |  13  | 消息 / 设置项 label               |
 | 描述 / 副标题      | caption         |  12  | 任务描述 / 提示                   |
 | 数据 / metric      | data            |  11  | Token 统计 / 时间戳              |
 | 微标签             | nano            |  10  | 进度数字 / 超小 label            |
*/
```

### 2.3 AppRadius（圆角系统）

```swift
import SwiftUI

enum AppRadius {
    static let sm:   CGFloat = 8     // 小 chip / 紧凑按钮
    static let md:   CGFloat = 10    // 标准输入框 / 工具栏按钮
    static let lg:   CGFloat = 14    // 卡片 / 容器
    static let xl:   CGFloat = 16    // 大卡片
    static let xxl:  CGFloat = 18    // 消息气泡
    static let pill: CGFloat = 20    // 状态徽章
    static let full: CGFloat = 9999  // 圆形 (avatar / 发送按钮)
}

// MARK: - 圆角使用矩阵
/*
 | 角色                       | 数值  | 实际代码                                    |
 |----------------------------|-------|---------------------------------------------|
 | 消息气泡 (用户)            |  18   | .borderRadius(topLeading:18, topTrailing:18, bottomLeading:4, bottomTrailing:18) |
 | 消息气泡 (AI)              |  18   | .borderRadius(topLeading:4, topTrailing:18, bottomLeading:18, bottomTrailing:18) |
 | 卡片                       |  14   | .cornerRadius(AppRadius.lg)                 |
 | 输入框                     |  14   | .cornerRadius(AppRadius.lg)                 |
 | 设置行图标                 |   7   | .cornerRadius(7)                            |
 | 头像                       |  full | .clipShape(Circle())                        |
 | Toggle                     |  12   | .cornerRadius(12)                           |
*/
```

### 2.4 Spacing（间距系统）

```swift
enum Spacing {
    static let xxs:  CGFloat = 2   // 1pt icon 偏移
    static let xs:   CGFloat = 4   // 文本与 icon 紧贴
    static let sm:   CGFloat = 8   // 列表项垂直 padding
    static let md:   CGFloat = 12  // 卡片内 padding
    static let lg:   CGFloat = 16  // 区域边距
    static let xl:   CGFloat = 24  // 大区块间距
    static let xxl:  CGFloat = 32  // 页面顶部留白
    static let xxxl: CGFloat = 48  // 弹窗标题上下间距
}
```

### 2.5 AdaptiveLayout（自适应布局）

```swift
import SwiftUI

struct AdaptiveLayout {
    let isIPad:   Bool
    let isIPhone: Bool
    let screenWidth: CGFloat

    static var current: AdaptiveLayout {
        let width = UIScreen.main.bounds.width
        return AdaptiveLayout(
            isIPad: UIDevice.current.userInterfaceIdiom == .pad,
            isIPhone: UIDevice.current.userInterfaceIdiom == .phone,
            screenWidth: width
        )
    }

    // 气泡最大宽度：min(420pt 用户, 520pt AI, 屏宽 × 70%)
    var userBubbleMaxWidth: CGFloat {
        min(420, screenWidth * 0.70)
    }
    var aiBubbleMaxWidth: CGFloat {
        min(520, screenWidth * 0.70)
    }

    // 侧边栏宽度（iPad）
    var sidebarWidth: CGFloat {
        isIPad ? 320 : 280
    }
    var sidebarMinWidth: CGFloat { 180 }
    var sidebarMaxWidth: CGFloat { 320 }

    // 设置面板左侧 list
    var settingsListWidth: CGFloat { 360 }
}
```

---

## 3. 图标系统

### 3.1 品牌主标识（3-line + focus dot，Scheme A）

> 3 条递减胶囊 + 右下焦点圆点

```swift
struct MyPilotBrandMark: View {
    let size: CGFloat  // 16 / 24 / 32 / 48 / 64 / 96
    var body: some View {
        Canvas { ctx, size in
            // 三条递减胶囊（橙色渐变）
            let lineW = size.width * 0.85
            let startX = size.width * 0.075
            let unit = size.height / 4
            let radii: [CGFloat] = [1.0, 0.78, 0.56]  // 长度比
            let widths = radii.map { $0 * lineW }
            let yOffsets = [0.0, 1.0, 2.0].map { $0 * unit }
            let heights: [CGFloat] = [unit * 0.7, unit * 0.55, unit * 0.4]

            for i in 0..<3 {
                let rect = CGRect(
                    x: startX,
                    y: yOffsets[i] + (unit - heights[i]) / 2,
                    width: widths[i],
                    height: heights[i]
                )
                let path = Path(roundedRect: rect, cornerRadius: heights[i] / 2)
                // 渐变
                let colors: [Color] = [
                    Color(hex: "#FFD27D"), Color(hex: "#F6AD02"), Color(hex: "#E89500")
                ]
                ctx.fill(path, with: .linearGradient(
                    Gradient(colors: [colors[i].opacity(0.95), colors[min(i+1, 2)]]),
                    startPoint: CGPoint(x: rect.minX, y: rect.midY),
                    endPoint: CGPoint(x: rect.maxX, y: rect.midY)
                ))
            }

            // 焦点圆点（右下角实心 #F6AD02）
            let dotR = size.width * 0.10
            let dotCenter = CGPoint(x: size.width * 0.85, y: size.height * 0.85)
            let dotRect = CGRect(
                x: dotCenter.x - dotR,
                y: dotCenter.y - dotR,
                width: dotR * 2,
                height: dotR * 2
            )
            ctx.fill(Path(ellipseIn: dotRect), with: .color(Color(hex: "#F6AD02")))
        }
        .frame(width: size, height: size)
    }
}

// 使用
MyPilotBrandMark(size: 16)  // tab bar / 状态栏
MyPilotBrandMark(size: 32)  // 导航栏
MyPilotBrandMark(size: 64)  // Welcome 页主标识
MyPilotBrandMark(size: 96)  // App Icon
```

### 3.2 SF Symbols 映射

所有交互图标必须用 SF Symbols，禁止用 emoji：

| 用途 | Symbol |
|---|---|
| 添加 | `plus` |
| 删除 | `trash` |
| 编辑 | `pencil` |
| 发送 | `arrow.up` |
| 停止 | `stop.fill` |
| 复制 | `doc.on.doc` |
| 重新生成 | `arrow.clockwise` |
| 搜索 | `magnifyingglass` |
| 设置 | `gearshape` |
| 连接 | `antenna.radiowaves.left.and.right` |
| 模型 | `cpu` |
| 思考 | `brain` |
| 附件 | `paperclip` |
| 图片 | `photo` |
| 二维码 | `qrcode.viewfinder` |
| 服务器 | `server.rack` |
| 用户 | `person.crop.circle` |
| 退出 | `xmark.circle.fill` |

```swift
// 标准使用
Image(systemName: "plus")
    .font(AppTypography.actionIcon)
    .foregroundColor(AppColors.info)
```

---

## 4. 头像系统

```swift
struct AgentAvatar: View {
    let agent: Agent
    let size: CGFloat  // 20 / 24 / 30 / 36 / 48 / 64

    var body: some View {
        Group {
            if let customPath = AvatarService.shared.localAvatarPath(for: agent.id) {
                // 1. 优先：本地图片
                Image(uiImage: UIImage(contentsOfFile: customPath.path) ?? UIImage())
                    .resizable()
                    .scaledToFill()
            } else if let url = agent.avatarUrl.flatMap(URL.init) {
                // 2. 次选：远端 URL
                AsyncImage(url: url) { image in
                    image.resizable().scaledToFill()
                } placeholder: {
                    fallback
                }
            } else {
                // 3. 默认：字母/Emoji
                fallback
            }
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
        .overlay(
            Circle().strokeBorder(AppColors.separatorLine, lineWidth: 0.5)
        )
    }

    private var fallback: some View {
        ZStack {
            Circle().fill(agent.id == "main" ? AppColors.amber300 :
                          agent.id == "coder" ? AppColors.info :
                          AppColors.leaf300)
            Text(agent.displayInitial)
                .font(.system(size: size * 0.45, weight: .semibold))
                .foregroundColor(.white)
        }
    }
}

// 使用
AgentAvatar(agent: mainAgent, size: 30)   // chat header
AgentAvatar(agent: coderAgent, size: 24)  // sidebar row
```

**Avatar 关键约束**：
- 本地存储：`Documents/AgentAvatars/{agentId}.png`
- 优先级：本地 > 远端 > 默认
- 修改后即时生效，无需重启

---

## 5. 组件库

> **本节是本规范的核心**。每个组件给出：API、可视化示意、状态机、SwiftUI 实现。

### 5.1 BouncingDots（加载点）

**API**：

```swift
struct BouncingDots: View {
    let color: Color = AppColors.tertiaryText
    let size: CGFloat = 6
}
```

**可视化**：

```
● ● ●   ← 三点等距
```

**状态机**：始终运行 `bounce` 动画（无停止态）

**SwiftUI 实现**（直接复制）：

```swift
struct BouncingDots: View {
    let color: Color
    let size: CGFloat

    init(color: Color = AppColors.tertiaryText, size: CGFloat = 6) {
        self.color = color
        self.size = size
    }

    @State private var phase: Int = 0
    private let timer = Timer.publish(every: 0.18, on: .main, in: .common).autoconnect()

    var body: some View {
        HStack(alignment: .center, spacing: size * 0.66) {
            ForEach(0..<3) { i in
                Circle()
                    .fill(color)
                    .frame(width: size, height: size)
                    .offset(y: yOffset(for: i))
            }
        }
        .frame(height: size * 2.5)
        .onReceive(timer) { _ in phase = (phase + 1) % 3 }
    }

    private func yOffset(for index: Int) -> CGFloat {
        // 水流感：0.18s 切换，1.0 最高 → 0.5 半回落 → 0.15 即将静止
        let cycle = (phase - index + 3) % 3
        switch cycle {
        case 0: return -size * 1.0
        case 1: return -size * 0.5
        default: return -size * 0.15
        }
    }
}
```

### 5.2 MessageBubble（消息气泡）

**API**：

```swift
struct MessageBubble: View {
    let message: ChatMessage
    let isUser: Bool
    let isLastAi: Bool  // 控制最后一条 AI 消息是否显示 BouncingDots
}
```

**可视化（用户）**：

```
              ┌─────────────────────────┐
              │ 用户消息内容（蓝色 #007AFF）│  ← 18/18/4/18 圆角
              └─────────────────────────┘
```

**可视化（AI）**：

```
┌─────────────────────────┐
│ AI 消息内容（灰 #E5E5EA） │  ← 4/18/18/18 圆角
└─────────────────────────┘
        14:23 · 📋复制 · ↻重生成 · 🗑删除
```

**状态机**：

```
sending → sent → delivered → (idle)
            ↓
          failed ↔ retrying
            ↓
        cancelled (用户主动)
```

**SwiftUI 实现**：

```swift
struct MessageBubble: View {
    let message: ChatMessage
    let isUser: Bool
    let isLastAi: Bool
    @State private var showActions = false

    var body: some View {
        HStack(alignment: .bottom, spacing: Spacing.xs) {
            if isUser { Spacer() }

            VStack(alignment: isUser ? .trailing : .leading, spacing: 4) {
                bubbleContent
                metaRow
            }
            .frame(maxWidth: AdaptiveLayout.current.userBubbleMaxWidth,
                   alignment: isUser ? .trailing : .leading)

            if !isUser { Spacer() }
        }
        .padding(.horizontal, Spacing.lg)
        .onHover { showActions = $0 }
    }

    @ViewBuilder
    private var bubbleContent: some View {
        let bg = isUser ? AppColors.userBubbleBg : AppColors.aiBubbleBg
        let fg = isUser ? AppColors.userBubbleText : AppColors.aiBubbleText
        let radii: RectangleCornerRadii = isUser
            ? .init(topLeading: 18, topTrailing: 18, bottomLeading: 4, bottomTrailing: 18)
            : .init(topLeading: 4, topTrailing: 18, bottomLeading: 18, bottomTrailing: 18)

        VStack(alignment: .leading, spacing: 6) {
            if !isUser && !message.thinking.isEmpty {
                ThinkingSection(content: message.thinking)
            }

            if isLastAi && message.content.isEmpty {
                BouncingDots()
            } else {
                Text(LocalizedStringKey(message.content))  // 支持 **bold** / ## heading / `code`
                    .font(AppTypography.body)
                    .foregroundColor(fg)
                    .lineLimit(nil)
                    .fixedSize(horizontal: false, vertical: true)
                    .environment(\.openURL, OpenURLAction { url in .systemAction })
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 8)
        .background(bg)
        .clipShape(RoundedRectangle(cornerRadii: radii))
    }

    private var metaRow: some View {
        HStack(spacing: 6) {
            if !isUser { statusIcon }
            Text(message.timestamp, format: .dateTime.hour().minute())
                .font(AppTypography.nano)
                .foregroundColor(AppColors.tertiaryText)
            if showActions && !isUser {
                ActionBar(message: message)
            }
        }
    }

    private var statusIcon: some View {
        Group {
            switch message.status {
            case .sending: Image(systemName: "circle.dashed").foregroundColor(AppColors.tertiaryText)
            case .sent: Image(systemName: "checkmark").foregroundColor(AppColors.info)
            case .delivered: Image(systemName: "checkmark.circle.fill").foregroundColor(AppColors.success)
            case .running: Image(systemName: "arrow.clockwise").foregroundColor(AppColors.info)
            case .failed: Image(systemName: "xmark.octagon.fill").foregroundColor(AppColors.danger)
            case .cancelled: Image(systemName: "xmark.circle").foregroundColor(AppColors.tertiaryText)
            case .timedOut: Image(systemName: "exclamationmark.triangle.fill").foregroundColor(AppColors.warning)
            case .lost: Image(systemName: "wifi.slash").foregroundColor(AppColors.danger)
            }
        }
        .font(.system(size: 9))
    }
}
```

### 5.3 ThinkingSection（思考过程折叠块）

```swift
struct ThinkingSection: View {
    let content: String
    @State private var isExpanded = false

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header
            Button { withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                isExpanded.toggle()
            } } label: {
                HStack(spacing: 6) {
                    Image(systemName: isExpanded ? "chevron.down" : "chevron.right")
                        .font(.system(size: 9, weight: .semibold))
                    Image(systemName: "brain.head.profile")
                        .foregroundColor(AppColors.amber300)
                    Text("思考过程")
                        .font(AppTypography.badge)
                        .foregroundColor(AppColors.tertiaryText)
                    Spacer()
                }
            }
            .buttonStyle(.plain)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)

            // Body (expandable)
            if isExpanded {
                Text(content)
                    .font(.system(size: 11, design: .monospaced))
                    .foregroundColor(AppColors.tertiaryText)
                    .lineSpacing(2)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .background(AppColors.elevatedSurface)
        .clipShape(RoundedRectangle(cornerRadius: AppRadius.md))
    }
}
```

### 5.4 TokenUsageBar（Token 用量条）

```swift
struct TokenUsageBar: View {
    let stats: TokenStats  // in: Int, out: Int, cache: Int, cost: Double, total: Int64, max: Int64

    private var fillWidth: CGFloat {
        CGFloat(Double(stats.total) / Double(stats.max))
    }

    private var fillColor: Color {
        fillWidth > 0.7 ? AppColors.warning : AppColors.success
    }

    var body: some View {
        VStack(spacing: 4) {
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(AppColors.separatorLine)
                    Capsule()
                        .fill(fillColor.opacity(0.7))
                        .frame(width: geo.size.width * fillWidth)
                }
            }
            .frame(height: 4)

            HStack {
                HStack(spacing: 8) {
                    Label("\(stats.in.shortened)", systemImage: "arrow.down")
                        .foregroundColor(AppColors.info)
                    Label("\(stats.out.shortened)", systemImage: "arrow.up")
                        .foregroundColor(AppColors.leaf300)
                    Label("\(stats.cache.shortened)", systemImage: "bolt.fill")
                        .foregroundColor(AppColors.amber300)
                }
                .font(AppTypography.data)
                Spacer()
                Text(String(format: "$%.4f", stats.cost))
                    .font(AppTypography.data)
                    .foregroundColor(AppColors.tertiaryText)
                Text("\(stats.total.shortened) / \(stats.max.shortened)")
                    .font(AppTypography.data)
                    .foregroundColor(AppColors.tertiaryText)
            }
        }
    }
}
```

### 5.5 ChatHeader（聊天头部）

```swift
struct ChatHeader: View {
    let agent: Agent
    let connectionState: ConnectionState  // .connected / .disconnected / .connecting
    let latencyMs: Int?
    let onAddTap: () -> Void
    let onSearchTap: () -> Void
    let onSettingsTap: () -> Void
    let onCollapseTap: () -> Void
    @Binding var showingQuickSettings: Bool

    var body: some View {
        HStack(spacing: 12) {
            AgentAvatar(agent: agent, size: 30)
            VStack(alignment: .leading, spacing: 2) {
                Button(action: { showingQuickSettings.toggle() }) {
                    HStack(spacing: 4) {
                        Text(agent.name).font(AppTypography.sectionTitle)
                        Image(systemName: "chevron.down").font(.system(size: 8))
                    }.foregroundColor(AppColors.primaryText)
                }
                .buttonStyle(.plain)

                Text("\(agent.provider) · \(agent.model)")
                    .font(AppTypography.data)
                    .foregroundColor(AppColors.tertiaryText)
            }

            Spacer()

            statusPill
            if let ms = latencyMs {
                Text("\(ms)ms").font(.system(size: 11, design: .monospaced))
                    .foregroundColor(AppColors.tertiaryText)
            }

            IconButton(icon: "plus", action: onAddTap)
            IconButton(icon: "magnifyingglass", action: onSearchTap)
            IconButton(icon: "gearshape", action: onSettingsTap)
            IconButton(icon: "chevron.up", action: onCollapseTap)
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 12)
        .background(AppColors.pageBackground)
        .overlay(Divider(), alignment: .bottom)
    }

    private var statusPill: some View {
        HStack(spacing: 4) {
            Circle().fill(connectionState.color).frame(width: 8, height: 8)
            Text(connectionState.label).font(AppTypography.nano)
        }
        .foregroundColor(AppColors.tertiaryText)
    }
}

struct IconButton: View {
    let icon: String
    let action: () -> Void
    @State private var isHovering = false

    var body: some View {
        Button(action: action) {
            Image(systemName: icon).font(.system(size: 14))
                .frame(width: 28, height: 28)
                .background(isHovering ? AppColors.surfaceCard : .clear)
                .clipShape(RoundedRectangle(cornerRadius: AppRadius.sm))
        }
        .buttonStyle(.plain)
        .onHover { isHovering = $0 }
    }
}
```

### 5.6 InputBar（输入栏）

```swift
struct InputBar: View {
    @Binding var text: String
    let model: String
    let isAiResponding: Bool
    let onSend: () -> Void
    let onStop: () -> Void
    let onAttach: () -> Void
    let onMore: () -> Void
    let onModelTap: () -> Void

    @State private var textHeight: CGFloat = 44

    var body: some View {
        VStack(spacing: 0) {
            Divider()
            VStack(spacing: 6) {
                // Text area
                AutoSizingTextView(text: $text, height: $textHeight)
                    .frame(height: min(textHeight, 200))
                    .padding(.horizontal, 12)
                    .padding(.top, 8)

                // Toolbar
                HStack {
                    HStack(spacing: 4) {
                        ToolbarIconButton(icon: "paperclip", action: onAttach)
                        Divider().frame(height: 14)
                        ToolbarTextButton(label: "更多", icon: "ellipsis", action: onMore)
                    }

                    Spacer()

                    HStack(spacing: 6) {
                        Button(action: onModelTap) {
                            HStack(spacing: 4) {
                                Text(model).font(AppTypography.caption)
                                Image(systemName: "chevron.down").font(.system(size: 8))
                            }
                            .foregroundColor(AppColors.tertiaryText)
                            .padding(.horizontal, 8).padding(.vertical, 4)
                        }
                        .buttonStyle(.plain)

                        Button(action: isAiResponding ? onStop : onSend) {
                            ZStack {
                                Circle().fill(isAiResponding ? AppColors.danger : AppColors.info)
                                Image(systemName: isAiResponding ? "stop.fill" : "arrow.up")
                                    .font(.system(size: 13, weight: .bold))
                                    .foregroundColor(.white)
                            }
                            .frame(width: 32, height: 32)
                        }
                        .buttonStyle(.plain)
                        .disabled(text.isEmpty && !isAiResponding)
                    }
                }
                .padding(.horizontal, 8)
            }
            .background(AppColors.surfaceCard)
            .clipShape(RoundedRectangle(cornerRadius: AppRadius.lg))
            .overlay(RoundedRectangle(cornerRadius: AppRadius.lg)
                .strokeBorder(text.isEmpty ? Color.clear : AppColors.info, lineWidth: 1))
            .padding(.horizontal, 16)
            .padding(.top, 12)
            .padding(.bottom, 14)
        }
        .background(AppColors.pageBackground)
    }
}

struct AutoSizingTextView: UIViewRepresentable {
    @Binding var text: String
    @Binding var height: CGFloat

    func makeUIView(context: Context) -> UITextView {
        let tv = UITextView()
        tv.font = UIFont.systemFont(ofSize: 15)
        tv.backgroundColor = .clear
        tv.delegate = context.coordinator
        tv.isScrollEnabled = false
        tv.textContainerInset = .zero
        tv.textContainer.lineFragmentPadding = 0
        return tv
    }
    func updateUIView(_ uiView: UITextView, context: Context) {
        if uiView.text != text { uiView.text = text }
    }
    func makeCoordinator() -> Coordinator { Coordinator(self) }

    class Coordinator: NSObject, UITextViewDelegate {
        let parent: AutoSizingTextView
        init(_ parent: AutoSizingTextView) { self.parent = parent }
        func textViewDidChange(_ textView: UITextView) {
            parent.text = textView.text
            let size = textView.sizeThatFits(CGSize(width: textView.bounds.width, height: .infinity))
            parent.height = max(44, size.height)
        }
    }
}
```

### 5.7 SidebarRow（侧边栏列表项）

```swift
struct SidebarAgentRow: View {
    let agent: Agent
    let isSelected: Bool
    let action: () -> Void
    @State private var isHovering = false

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                AgentAvatar(agent: agent, size: 24)
                VStack(alignment: .leading, spacing: 1) {
                    Text(agent.name)
                        .font(AppTypography.body)
                        .foregroundColor(isSelected ? .white : AppColors.primaryText)
                        .fontWeight(isSelected ? .semibold : .medium)
                    Text("\(agent.provider) · \(agent.model)")
                        .font(AppTypography.data)
                        .foregroundColor(isSelected ? .white.opacity(0.8) : AppColors.tertiaryText)
                        .lineLimit(1)
                }
                Spacer()
                if agent.unreadCount > 0 {
                    Circle().fill(AppColors.danger).frame(width: 8, height: 8)
                }
                if isSelected {
                    Image(systemName: "checkmark").font(.system(size: 10)).foregroundColor(.white)
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 6)
            .background(
                Group {
                    if isSelected { AppColors.userBubbleBg }
                    else if isHovering { AppColors.surfaceCard }
                    else { Color.clear }
                }
            )
        }
        .buttonStyle(.plain)
        .onHover { isHovering = $0 }
        .contextMenu {
            Button("重命名") { /* ... */ }
            Button("删除", role: .destructive) { /* ... */ }
        }
    }
}
```

### 5.8 Toggle（iOS 风格开关）

```swift
struct PillToggle: View {
    @Binding var isOn: Bool
    var width: CGFloat = 42
    var height: CGFloat = 24

    var body: some View {
        ZStack(alignment: isOn ? .trailing : .leading) {
            Capsule().fill(isOn ? AppColors.success : AppColors.tertiaryText)
            Circle().fill(.white)
                .frame(width: height - 4, height: height - 4)
                .padding(2)
                .shadow(color: .black.opacity(0.1), radius: 2, y: 1)
        }
        .frame(width: width, height: height)
        .onTapGesture { withAnimation(.easeInOut(duration: 0.2)) { isOn.toggle() } }
    }
}
```

### 5.9 StatusPill（状态徽章）

```swift
struct StatusPill: View {
    let text: String
    let kind: Kind

    enum Kind {
        case success, danger, warning, info, neutral
    }

    var body: some View {
        HStack(spacing: 4) {
            Circle().fill(color).frame(width: 6, height: 6)
            Text(text).font(AppTypography.badge)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 3)
        .background(color.opacity(0.14))
        .foregroundColor(color)
        .clipShape(RoundedRectangle(cornerRadius: AppRadius.sm))
    }

    private var color: Color {
        switch kind {
        case .success: AppColors.success
        case .danger: AppColors.danger
        case .warning: AppColors.warning
        case .info: AppColors.info
        case .neutral: AppColors.tertiaryText
        }
    }
}
```

### 5.10 ActionBar（消息操作条）

```swift
struct ActionBar: View {
    let message: ChatMessage
    @State private var showDeleteConfirm = false

    var body: some View {
        HStack(spacing: 2) {
            ActionButton(icon: "doc.on.doc", label: "复制") {
                UIPasteboard.general.string = message.content
            }
            ActionButton(icon: "arrow.clockwise", label: "重新生成") {
                // trigger regenerate
            }
            ActionButton(icon: "trash", label: "删除", kind: .danger) {
                showDeleteConfirm = true
            }
        }
        .confirmationDialog("删除这条消息？", isPresented: $showDeleteConfirm) {
            Button("删除", role: .destructive) { /* delete */ }
            Button("取消", role: .cancel) {}
        }
    }
}

struct ActionButton: View {
    let icon: String
    let label: String
    var kind: Kind = .default
    let action: () -> Void

    enum Kind { case `default`, danger }

    var body: some View {
        Button(action: action) {
            HStack(spacing: 3) {
                Image(systemName: icon).font(.system(size: 9))
                Text(label).font(AppTypography.labelMicro)
            }
            .foregroundColor(kind == .danger ? AppColors.danger : AppColors.tertiaryText)
            .padding(.horizontal, 6).padding(.vertical, 3)
        }
        .buttonStyle(.plain)
    }
}
```

### 5.11 WelcomeStep（引导步骤项）

```swift
struct WelcomeStep: View {
    let icon: String  // SF Symbol
    let title: String
    let sub: String

    var body: some View {
        HStack(spacing: 14) {
            ZStack {
                Circle().fill(AppColors.amber300.opacity(0.15))
                Image(systemName: icon).font(.system(size: 16))
                    .foregroundColor(AppColors.amber300)
            }
            .frame(width: 36, height: 36)

            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(AppTypography.listTitle)
                    .foregroundColor(AppColors.primaryText)
                Text(sub).font(AppTypography.caption)
                    .foregroundColor(AppColors.tertiaryText)
            }
        }
    }
}
```

### 5.12 AddInstanceSheet（添加实例 2 步弹窗）

**完整实现**（Step 1 + Step 2）：

```swift
struct AddInstanceSheet: View {
    @Environment(\.dismiss) var dismiss
    @State private var step: Step = .serverURL
    @State private var serverURL: String = "http://127.0.0.1:52378"
    @State private var pairingCode: String = ""
    @State private var instanceName: String = "MyPilot 实例"
    @State private var isLoading = false
    @State private var errorMessage: String?

    enum Step { case serverURL, pairingCode }

    var body: some View {
        VStack(spacing: 0) {
            // Toolbar
            HStack {
                Text("添加实例").font(AppTypography.sectionTitle)
                Spacer()
                Button("取消") { dismiss() }
                    .foregroundColor(AppColors.info)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .overlay(Divider(), alignment: .bottom)

            // Body
            ScrollView {
                VStack(spacing: 16) {
                    Image(systemName: step == .serverURL ? "server.rack" : "key.horizontal")
                        .font(.system(size: 48))
                        .foregroundColor(AppColors.info)
                        .padding(.top, 8)

                    Text(step == .serverURL ? "输入服务器地址" : "输入配对码")
                        .font(AppTypography.pageTitle)

                    if step == .pairingCode {
                        Text("在服务器终端执行 mypilot pair 获取配对码，或扫描二维码")
                            .font(AppTypography.caption)
                            .foregroundColor(AppColors.tertiaryText)
                            .multilineTextAlignment(.center)
                    }

                    Group {
                        if step == .serverURL {
                            TextField("", text: $serverURL, prompt: Text("http://127.0.0.1:52378").font(.system(.body, design: .monospaced)))
                                .textFieldStyle(.roundedBorder)
                                .font(.system(.body, design: .monospaced))
                                .autocorrectionDisabled()
                                .textInputAutocapitalization(.never)
                        } else {
                            HStack {
                                TextField("XXXX-XXXX-XXXX", text: $pairingCode)
                                    .textFieldStyle(.roundedBorder)
                                    .font(.system(.body, design: .monospaced))
                                Button { /* open QR scanner */ } label: {
                                    Image(systemName: "qrcode.viewfinder").font(.system(size: 16))
                                        .frame(width: 38, height: 36)
                                        .background(AppColors.pageBackground)
                                        .clipShape(RoundedRectangle(cornerRadius: AppRadius.sm))
                                        .overlay(RoundedRectangle(cornerRadius: AppRadius.sm)
                                            .strokeBorder(AppColors.tertiaryText))
                                }
                            }
                            TextField("MyPilot 实例", text: $instanceName)
                                .textFieldStyle(.roundedBorder)

                            // QR Display
                            VStack {
                                Image(systemName: "qrcode").font(.system(size: 80))
                                    .frame(width: 120, height: 120)
                                    .background(.white)
                                Text(pairingCode)
                                    .font(.system(.body, design: .monospaced))
                                    .fontWeight(.medium)
                                Text("或使用此服务器生成的配对码")
                                    .font(AppTypography.caption)
                                    .foregroundColor(AppColors.tertiaryText)
                            }
                            .padding(12)
                            .background(AppColors.surfaceCard)
                            .clipShape(RoundedRectangle(cornerRadius: AppRadius.md))
                        }
                    }

                    if step == .serverURL {
                        infoBox
                    }

                    if let err = errorMessage {
                        Text(err).font(AppTypography.caption)
                            .foregroundColor(AppColors.danger)
                    }
                }
                .padding(24)
            }

            // Footer
            HStack(spacing: 8) {
                if step == .pairingCode {
                    Button("返回") { withAnimation { step = .serverURL } }
                        .frame(width: 100).padding(.vertical, 10)
                        .background(AppColors.surfaceCard)
                        .foregroundColor(AppColors.secondaryText)
                        .clipShape(RoundedRectangle(cornerRadius: AppRadius.md))
                }

                Button(step == .serverURL ? "继续" : "配对并连接") {
                    Task { await proceed() }
                }
                .frame(maxWidth: .infinity).padding(.vertical, 10)
                .background(AppColors.info)
                .foregroundColor(.white)
                .clipShape(RoundedRectangle(cornerRadius: AppRadius.md))
                .disabled(isLoading)
            }
            .padding(16)
            .overlay(Divider(), alignment: .top)
        }
        .frame(width: 500, height: 450)
    }

    private var infoBox: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("ℹ MyPilot 通过本地 daemon 连接 OpenClaw Gateway").font(AppTypography.data)
            Text("1. 在服务器上安装 mypilot-link：npm install -g @mypilot/link").font(AppTypography.data)
            Text("2. 启动 daemon：mypilot start").font(AppTypography.data)
            Text("3. 输入 daemon 地址（默认端口 52378）").font(AppTypography.data)
            Text("4. 在下一步输入终端显示的配对码完成配对").font(AppTypography.data)
        }
        .padding(10)
        .background(AppColors.surfaceCard)
        .clipShape(RoundedRectangle(cornerRadius: AppRadius.sm))
        .foregroundColor(AppColors.tertiaryText)
    }

    private func proceed() async {
        isLoading = true; defer { isLoading = false }
        do {
            if step == .serverURL {
                let ok = try await APIService.shared.healthCheck(url: serverURL)
                if ok { withAnimation { step = .pairingCode } }
                else { errorMessage = "无法连接，请检查地址" }
            } else {
                let instance = try await APIService.shared.pair(url: serverURL, code: pairingCode, name: instanceName)
                AppState.shared.addInstance(instance)
                dismiss()
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
```

### 5.13 QuickSettingsPanel（快速设置浮层）

```swift
struct QuickSettingsPanel: View {
    @Binding var showDetailedOutput: Bool
    @Binding var showReasoningMode: Bool
    @Binding var connectionState: ConnectionState
    let onSwitchModel: () -> Void
    let onRestartConversation: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            Text("快速设置")
                .font(AppTypography.sectionTitle)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(14)
                .overlay(Divider(), alignment: .bottom)

            VStack(spacing: 0) {
                row(icon: "gearshape", title: "切换模型", desc: "OpenAI · gpt-4o", control: .chevron) { onSwitchModel() }
                Divider().padding(.leading, 38)
                row(icon: "text.bubble", title: "详细输出", desc: "显示更多推理细节", control: .toggle($showDetailedOutput)) {}
                Divider().padding(.leading, 38)
                row(icon: "brain", title: "推理模式", desc: "深度思考后再回答", control: .toggle($showReasoningMode)) {}
                Divider().padding(.leading, 38)
                row(icon: "arrow.clockwise", title: "重启会话", desc: "清除上下文重新开始", control: .chevron) { onRestartConversation() }
                Divider().padding(.leading, 38)
                row(icon: "antenna.radiowaves.left.and.right", iconColor: AppColors.success, title: "连接状态", desc: "🟢 已连接 · 48ms", control: .none) {}
            }
        }
        .frame(width: 280)
        .background(AppColors.pageBackground)
        .clipShape(RoundedRectangle(cornerRadius: AppRadius.md))
        .shadow(color: .black.opacity(0.12), radius: 8, y: 4)
    }

    enum Control {
        case none, chevron
        case toggle(Binding<Bool>)
    }

    @ViewBuilder
    private func row(icon: String, iconColor: Color = AppColors.info, title: String, desc: String, control: Control, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 10) {
                Image(systemName: icon).font(.system(size: 12))
                    .frame(width: 24).foregroundColor(iconColor)
                VStack(alignment: .leading, spacing: 1) {
                    Text(title).font(AppTypography.listTitle)
                    Text(desc).font(AppTypography.caption).foregroundColor(AppColors.tertiaryText)
                }
                Spacer()
                switch control {
                case .none: EmptyView()
                case .chevron: Image(systemName: "chevron.right").font(.system(size: 11)).foregroundColor(AppColors.quaternaryText)
                case .toggle(let binding): PillToggle(isOn: binding)
                }
            }
            .padding(.horizontal, 14).padding(.vertical, 10)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}
```

### 5.14 ModelPickerPanel（模型选择）

```swift
struct ModelPickerPanel: View {
    let modelsByProvider: [String: [String]]  // ["OpenAI": ["gpt-4o", ...], ...]
    @Binding var selected: String
    let onSelect: (String) -> Void

    var body: some View {
        VStack(spacing: 0) {
            Text("选择模型").font(AppTypography.sectionTitle)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(12)
                .overlay(Divider(), alignment: .bottom)

            ScrollView {
                VStack(alignment: .leading, spacing: 6) {
                    ForEach(modelsByProvider.sorted(by: { $0.key < $1.key }), id: \.key) { provider, models in
                        Text(provider).font(AppTypography.badge)
                            .foregroundColor(AppColors.tertiaryText)
                            .padding(.horizontal, 8).padding(.top, 6)

                        ForEach(models, id: \.self) { model in
                            modelRow(provider: provider, name: model)
                        }
                    }
                }.padding(6)
            }
        }
        .frame(width: 320, height: 400)
        .background(AppColors.pageBackground)
        .clipShape(RoundedRectangle(cornerRadius: AppRadius.md))
        .shadow(color: .black.opacity(0.12), radius: 8, y: 4)
    }

    private func modelRow(provider: String, name: String) -> some View {
        let isSelected = name == selected
        return Button { onSelect(name) } label: {
            HStack(spacing: 8) {
                Circle().fill(providerColor(provider)).frame(width: 6, height: 6)
                Text(name).font(.system(.data, design: .monospaced))
                    .foregroundColor(AppColors.primaryText)
                Spacer()
                if isSelected { Image(systemName: "checkmark").font(.system(size: 11)).foregroundColor(AppColors.info) }
            }
            .padding(.horizontal, 10).padding(.vertical, 6)
            .background(AppColors.surfaceCard.opacity(isSelected ? 1 : 0))
            .clipShape(RoundedRectangle(cornerRadius: 4))
        }
        .buttonStyle(.plain)
    }

    private func providerColor(_ name: String) -> Color {
        switch name {
        case "OpenAI": AppColors.info
        case "Anthropic": AppColors.amber300
        case "DeepSeek": AppColors.leaf300
        case "Google": AppColors.danger
        default: AppColors.tertiaryText
        }
    }
}
```

### 5.15 AgentPickerPanel（Agent 切换）

```swift
struct AgentPickerPanel: View {
    let agents: [Agent]
    let activeId: String
    let onSelect: (Agent) -> Void
    let onAddNew: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            Text("切换 Agent").font(AppTypography.sectionTitle)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(12)
                .overlay(Divider(), alignment: .bottom)

            VStack(spacing: 0) {
                ForEach(agents) { agent in
                    row(agent)
                }
                Divider().padding(.vertical, 4)
                Button(action: onAddNew) {
                    HStack(spacing: 10) {
                        ZStack {
                            Circle().fill(AppColors.surfaceCard)
                            Image(systemName: "plus").foregroundColor(AppColors.info)
                        }.frame(width: 28, height: 28)
                        Text("添加新 Agent").font(AppTypography.listTitle)
                            .foregroundColor(AppColors.info)
                        Spacer()
                    }
                    .padding(.horizontal, 14).padding(.vertical, 8)
                }
                .buttonStyle(.plain)
            }
        }
        .frame(width: 300)
        .background(AppColors.pageBackground)
        .clipShape(RoundedRectangle(cornerRadius: AppRadius.md))
        .shadow(color: .black.opacity(0.12), radius: 8, y: 4)
    }

    private func row(_ agent: Agent) -> some View {
        let isActive = agent.id == activeId
        return Button { onSelect(agent) } label: {
            HStack(spacing: 10) {
                AgentAvatar(agent: agent, size: 28)
                VStack(alignment: .leading, spacing: 1) {
                    Text(agent.name).font(AppTypography.listTitle)
                    Text("\(agent.provider) · \(agent.model)")
                        .font(AppTypography.data).foregroundColor(AppColors.tertiaryText)
                }
                Spacer()
                if isActive { Image(systemName: "checkmark").font(.system(size: 11)).foregroundColor(AppColors.info) }
            }
            .padding(.horizontal, 14).padding(.vertical, 8)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}
```

### 5.16 AISuggestionsPanel（AI 建议操作）

```swift
struct AISuggestionsPanel: View {
    let suggestions: [Suggestion]  // 由 last message 动态生成
    let onSelect: (Suggestion) -> Void

    struct Suggestion: Identifiable {
        let id = UUID()
        let icon: String
        let iconColor: Color
        let title: String
        let prompt: String
    }

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 6) {
                Image(systemName: "lightbulb").foregroundColor(AppColors.amber300)
                Text("AI 建议操作").font(AppTypography.sectionTitle)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(12)
            .overlay(Divider(), alignment: .bottom)

            VStack(spacing: 0) {
                ForEach(suggestions) { s in
                    Button { onSelect(s) } label: {
                        HStack(spacing: 10) {
                            Image(systemName: s.icon).font(.system(size: 12))
                                .frame(width: 24).foregroundColor(s.iconColor)
                            VStack(alignment: .leading, spacing: 1) {
                                Text(s.title).font(AppTypography.listTitle)
                                Text(s.prompt).font(AppTypography.caption)
                                    .foregroundColor(AppColors.tertiaryText).lineLimit(1)
                            }
                            Spacer()
                            Image(systemName: "arrow.up.right").font(.system(size: 9))
                                .foregroundColor(AppColors.quaternaryText)
                        }
                        .padding(.horizontal, 14).padding(.vertical, 8)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .frame(width: 320)
        .background(AppColors.pageBackground)
        .clipShape(RoundedRectangle(cornerRadius: AppRadius.md))
        .shadow(color: .black.opacity(0.12), radius: 8, y: 4)
    }
}
```

### 5.17 MoreActionsGrid（更多操作 2×4 网格）

```swift
struct MoreActionsGrid: View {
    let onImage: () -> Void
    let onFile: () -> Void
    let onVoice: () -> Void
    let onCamera: () -> Void
    let onCommand: () -> Void
    let onMention: () -> Void
    let onClipboard: () -> Void
    let onMore: () -> Void

    private let items: [(String, String, Color, () -> Void)] = [
        // (icon, label, color, action)
    ]

    var body: some View {
        VStack {
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                item("photo", "插入图片", AppColors.info, onImage)
                item("paperclip", "附件文件", AppColors.success, onFile)
                item("mic", "语音输入", AppColors.amber300, onVoice)
                item("camera", "拍照", AppColors.danger, onCamera)
                item("slash.circle", "指令", AppColors.tertiaryText, onCommand)
                item("at", "@Agent", AppColors.tertiaryText, onMention)
                item("doc.on.clipboard", "剪贴板", AppColors.info, onClipboard)
                item("ellipsis.circle", "更多", AppColors.tertiaryText, onMore)
            }
            .padding(12)
        }
        .frame(width: 280)
        .background(AppColors.pageBackground)
        .clipShape(RoundedRectangle(cornerRadius: AppRadius.md))
        .shadow(color: .black.opacity(0.12), radius: 8, y: 4)
    }

    private func item(_ icon: String, _ label: String, _ color: Color, _ action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(spacing: 6) {
                Image(systemName: icon).font(.system(size: 16)).foregroundColor(color)
                Text(label).font(AppTypography.data).foregroundColor(AppColors.tertiaryText)
            }
            .frame(maxWidth: .infinity).padding(.vertical, 10)
            .background(AppColors.surfaceCard)
            .clipShape(RoundedRectangle(cornerRadius: 6))
        }
        .buttonStyle(.plain)
    }
}
```

### 5.18 CommandPalette（⌘K 命令面板）

```swift
struct CommandPalette: View {
    @State private var query: String = ""
    @State private var selection: Int = 0
    @Environment(\.dismiss) var dismiss
    let onExecute: (CommandItem) -> Void

    struct CommandItem: Identifiable {
        let id = UUID()
        let kind: Kind
        let name: String
        let desc: String?
    }
    enum Kind { case command, conversation, agent }

    let items: [CommandItem]  // 由 appState 提供

    var filtered: [CommandItem] {
        if query.isEmpty { return items }
        return items.filter { $0.name.localizedCaseInsensitiveContains(query) }
    }

    var body: some View {
        VStack(spacing: 0) {
            // Search bar
            HStack(spacing: 8) {
                Text("⌘K").font(.system(.body, design: .monospaced))
                    .foregroundColor(AppColors.tertiaryText)
                TextField("搜索指令、会话、Agent...", text: $query)
                    .textFieldStyle(.plain)
                    .font(AppTypography.body)
            }
            .padding(12)
            .overlay(Divider(), alignment: .bottom)

            // Results
            ScrollView {
                VStack(alignment: .leading, spacing: 4) {
                    ForEach(grouped(filtered)) { group in
                        Text(group.title).font(AppTypography.badge)
                            .foregroundColor(AppColors.tertiaryText)
                            .padding(.horizontal, 10).padding(.top, 4)
                        ForEach(group.items) { item in
                            row(item, isSelected: item.id == filtered[safe: selection]?.id)
                                .onTapGesture { onExecute(item) }
                        }
                    }
                }.padding(4)
            }
        }
        .frame(width: 540, height: 400)
        .background(AppColors.pageBackground)
        .clipShape(RoundedRectangle(cornerRadius: AppRadius.md))
        .shadow(color: .black.opacity(0.2), radius: 20, y: 8)
    }
}
```

### 5.19 EmptyStateView（空状态）

```swift
struct EmptyStateView: View {
    let icon: String
    let title: String
    let hint: String
    var action: (() -> Void)? = nil
    var actionLabel: String? = nil

    var body: some View {
        VStack(spacing: 8) {
            Text(icon).font(.system(size: 36))
            Text(title).font(AppTypography.listTitle)
            Text(hint).font(AppTypography.caption).foregroundColor(AppColors.tertiaryText)
            if let action = action, let label = actionLabel {
                Button(action: action) {
                    Text(label).font(AppTypography.body).fontWeight(.medium)
                        .foregroundColor(.white).padding(.horizontal, 16).padding(.vertical, 8)
                        .background(AppColors.info)
                        .clipShape(RoundedRectangle(cornerRadius: AppRadius.md))
                }
                .buttonStyle(.plain)
                .padding(.top, 8)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
```

### 5.20 AttachmentChip（附件 chip）

```swift
struct AttachmentChip: View {
    let attachment: Attachment
    let onRemove: () -> Void

    var body: some View {
        HStack(spacing: 4) {
            Text(attachment.emoji).font(.system(size: 12))
            Text(attachment.name).font(AppTypography.caption)
            Button(action: onRemove) {
                Image(systemName: "xmark").font(.system(size: 10))
                    .foregroundColor(AppColors.tertiaryText)
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 8).padding(.vertical, 4)
        .background(AppColors.surfaceCard)
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}
```

### 5.21 TaskRow（定时任务行）

```swift
struct TaskRow: View {
    let task: ScheduledTask
    @Binding var isEnabled: Bool
    let onRunNow: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                RoundedRectangle(cornerRadius: 8).fill(task.iconColor.opacity(0.14))
                Image(systemName: task.icon).font(.system(size: 14))
                    .foregroundColor(task.iconColor)
            }.frame(width: 32, height: 32)

            VStack(alignment: .leading, spacing: 2) {
                Text(task.name).font(AppTypography.listTitle)
                Text(task.content).font(AppTypography.caption)
                    .foregroundColor(AppColors.tertiaryText).lineLimit(1)
                HStack(spacing: 12) {
                    Label("⏰ \(task.cron)", systemImage: nil)
                    Label("🤖 \(task.agent)", systemImage: nil)
                    statusText
                }
                .font(AppTypography.nano).foregroundColor(AppColors.tertiaryText)
            }
            Spacer()
            PillToggle(isOn: $isEnabled)
            Button(action: onRunNow) {
                Image(systemName: "play.fill").font(.system(size: 18))
                    .foregroundColor(AppColors.leaf300)
                    .frame(width: 32, height: 32)
            }
            .buttonStyle(.plain)
        }
        .padding(12)
        .background(AppColors.surfaceCard)
        .overlay(Rectangle().fill(AppColors.separatorLine).frame(height: 0.5), alignment: .bottom)
    }

    private var statusText: some View {
        let (text, color): (String, Color) = {
            switch task.lastStatus {
            case .success: ("● 上次成功 · \(task.lastRunAgo)", AppColors.success)
            case .failed: ("● 上次失败 · \(task.lastRunAgo)", AppColors.danger)
            case .skipped: ("○ 上次跳过", AppColors.tertiaryText)
            case .paused: ("○ 暂停", AppColors.tertiaryText)
            }
        }()
        return Text(text).foregroundColor(color)
    }
}
```

### 5.22 ChannelRow（IM 渠道行）

```swift
struct ChannelRow: View {
    let channel: IMChannel
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 12) {
                Text(channel.shortName)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.white)
                    .frame(width: 32, height: 32)
                    .background(channel.brandColor)
                    .clipShape(RoundedRectangle(cornerRadius: 7))
                VStack(alignment: .leading, spacing: 2) {
                    Text(channel.name).font(AppTypography.listTitle)
                    Text(channel.statusText).font(AppTypography.caption)
                        .foregroundColor(AppColors.tertiaryText)
                }
                Spacer()
                if channel.isOnline {
                    StatusPill(text: "在线", kind: .success)
                } else {
                    StatusPill(text: "离线", kind: .neutral)
                }
            }
            .padding(12)
            .background(AppColors.surfaceCard)
        }
        .buttonStyle(.plain)
    }
}
```

### 5.23 SettingsRow（设置行）

```swift
struct SettingsRow: View {
    let icon: String
    let iconColor: IconColor
    let title: String
    let isActive: Bool
    let action: () -> Void

    enum IconColor { case blue, orange, green, red, gray
        var color: Color {
            switch self {
            case .blue: AppColors.info
            case .orange: AppColors.amber300
            case .green: AppColors.leaf300
            case .red: AppColors.danger
            case .gray: AppColors.tertiaryText
            }
        }
    }

    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
                Image(systemName: icon).font(.system(size: 14))
                    .foregroundColor(.white)
                    .frame(width: 30, height: 30)
                    .background(iconColor.color)
                    .clipShape(RoundedRectangle(cornerRadius: 7))
                Text(title).font(AppTypography.body)
                Spacer()
                Image(systemName: "chevron.right").font(.system(size: 11))
                    .foregroundColor(AppColors.quaternaryText)
            }
            .padding(.horizontal, 20).padding(.vertical, 10)
            .background(isActive ? AppColors.surfaceCard : .clear)
            .overlay(alignment: .trailing) {
                if isActive {
                    RoundedRectangle(cornerRadius: 3)
                        .fill(AppColors.info)
                        .frame(width: 3)
                        .padding(.vertical, 8)
                }
            }
        }
        .buttonStyle(.plain)
    }
}
```

### 5.24 FormCard + FormRow（表单卡片 + 行）

```swift
struct FormCard<Content: View>: View {
    @ViewBuilder let content: Content
    var body: some View {
        VStack(spacing: 0) { content }
            .background(AppColors.surfaceCard)
            .clipShape(RoundedRectangle(cornerRadius: AppRadius.md))
    }
}

struct FormRow: View {
    let label: String
    var iconColor: Color? = nil
    var icon: String? = nil
    var value: String? = nil
    var valueIsMono: Bool = false
    var trailing: AnyView? = nil

    var body: some View {
        HStack(alignment: .center, spacing: 12) {
            HStack(spacing: 10) {
                if let icon = icon, let c = iconColor {
                    Image(systemName: icon).font(.system(size: 13))
                        .foregroundColor(.white)
                        .frame(width: 28, height: 28)
                        .background(c)
                        .clipShape(RoundedRectangle(cornerRadius: 6))
                }
                Text(label).font(AppTypography.body)
            }
            Spacer()
            if let v = value {
                Text(v)
                    .font(valueIsMono ? .system(.data, design: .monospaced) : AppTypography.body)
                    .foregroundColor(AppColors.tertiaryText)
            }
            if let t = trailing { t }
        }
        .padding(12)
        .overlay(Rectangle().fill(AppColors.separatorLine).frame(height: 0.5), alignment: .bottom)
    }
}
```

### 5.25 Gauge + DiagMetric（仪表盘指标）

```swift
struct Gauge: View {
    let value: Double  // 0.0 ~ 1.0
    let displayValue: String
    let label: String
    let color: Color

    var body: some View {
        VStack(spacing: 4) {
            Text(displayValue).font(.system(size: 22, weight: .bold, design: .rounded))
                .foregroundColor(color)
            Text(label).font(AppTypography.data).foregroundColor(AppColors.tertiaryText)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
        .background(AppColors.surfaceCard)
        .clipShape(RoundedRectangle(cornerRadius: AppRadius.md))
    }
}

struct DiagMetric: View {
    let value: String
    let label: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(value).font(AppTypography.sectionTitle).foregroundColor(color)
            Text(label).font(AppTypography.caption).foregroundColor(AppColors.tertiaryText)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(AppColors.surfaceCard)
        .clipShape(RoundedRectangle(cornerRadius: AppRadius.card))
    }
}
```

### 5.26 ConnectionState（连接状态枚举）

```swift
enum ConnectionState {
    case connected(latencyMs: Int)
    case connecting
    case disconnected(reason: String?)

    var label: String {
        switch self {
        case .connected: "已连接"
        case .connecting: "连接中…"
        case .disconnected(let r): r ?? "未连接"
        }
    }

    var color: Color {
        switch self {
        case .connected: AppColors.success
        case .connecting: AppColors.warning
        case .disconnected: AppColors.danger
        }
    }
}
```

---

## 6. 屏幕规范

### 6.1 屏幕清单

| # | 屏幕 | NavigationSplitView 列 | iPad 适配 |
|---|---|---|---|
| 1 | Welcome | - | 居中弹窗 |
| 2 | AddInstance (Step 1) | sheet | 500×450 |
| 3 | AddInstance (Step 2) | sheet | 500×450 |
| 4 | Main (Sidebar + Chat) | sidebar | 320pt + flex |
| 5 | Chat (Active) | detail | full |
| 6 | Settings Root | sheet (left split) | 360 + flex |
| 7 | NetworkSettings | settingsDetail | flex |
| 8 | AgentFiles | settingsDetail | flex |
| 9 | AgentsManagement | settingsDetail | flex |
| 10 | IMChannels | settingsDetail | flex |
| 11 | ScheduledTasks | settingsDetail | flex |
| 12 | MemoryReading | settingsDetail | flex |
| 13 | DiagnosticsCenter | settingsDetail | flex |
| 14 | UsageStats | settingsDetail | flex |
| 15 | WebSearchProviders | settingsDetail | flex |

### 6.2 根视图 (ContentView)

```swift
struct ContentView: View {
    @State private var appState = AppState.shared
    @State private var selectedConversationId: String?
    @State private var columnVisibility: NavigationSplitViewVisibility = .all

    var body: some View {
        if appState.instances.isEmpty {
            WelcomeView()
        } else {
            NavigationSplitView(columnVisibility: $columnVisibility) {
                SidebarView(selectedId: $selectedConversationId)
                    .navigationSplitViewColumnWidth(min: 180, ideal: 280, max: 320)
            } detail: {
                if let id = selectedConversationId,
                   let conv = appState.conversations.first(where: { $0.id == id }) {
                    ChatView(conversation: conv)
                } else {
                    WelcomeChatView()
                }
            }
            .navigationSplitViewStyle(.balanced)
        }
    }
}
```

### 6.3 侧边栏 (SidebarView)

**结构**（自上而下）：

```
┌──────────────────────────┐
│  ⌕ 搜索历史消息...         │  ← SearchField
├──────────────────────────┤
│  OPENCLAW 实例             │  ← Section header
│  ● 生产服务器              │  ← InstanceRow
│  ● 本地调试                │
├──────────────────────────┤
│  默认助手            ⊕    │  ← Agents section
│  ● Main · OpenAI gpt-4o   │  ← AgentRow
│    MyPilot 架构讨论       │  ← ConvRow
│    帮我写登录页            │
│    翻译需求文档            │
│  本周                     │
│    数据库表结构            │
│    API 错误码整理          │
│  更早                     │
│    CI 配置优化             │
├──────────────────────────┤
│  [+ 添加实例]    [⚙]      │  ← Footer
└──────────────────────────┘
```

**SwiftUI 实现**：

```swift
struct SidebarView: View {
    @Binding var selectedId: String?
    @State private var searchText = ""
    @State private var showingAddInstance = false
    @State private var showingSettings = false
    @State private var appState = AppState.shared

    var body: some View {
        VStack(spacing: 0) {
            // Search
            HStack(spacing: 6) {
                Image(systemName: "magnifyingglass").foregroundColor(AppColors.tertiaryText)
                TextField("搜索历史消息...", text: $searchText).textFieldStyle(.plain)
                if !searchText.isEmpty {
                    Button { searchText = "" } label: {
                        Image(systemName: "xmark").font(.system(size: 11))
                    }.foregroundColor(AppColors.tertiaryText).buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 10).padding(.vertical, 6)
            .background(AppColors.elevatedSurface)
            .clipShape(RoundedRectangle(cornerRadius: AppRadius.md))
            .padding(.horizontal, 14).padding(.top, 14).padding(.bottom, 8)

            // Content
            List(selection: $selectedId) {
                Section("OPENCLAW 实例") {
                    ForEach(appState.instances) { inst in
                        InstanceRow(instance: inst).tag(Optional(inst.id))
                    }
                }
                ForEach(appState.agentGroups) { group in
                    Section {
                        ForEach(group.agents) { agent in
                            SidebarAgentRow(agent: agent, isSelected: agent.id == appState.activeAgentId) {
                                appState.selectAgent(agent)
                            }.tag(Optional(agent.id))
                        }
                        ForEach(group.conversations) { conv in
                            ConversationRow(conversation: conv, isSelected: conv.id == selectedId) {
                                selectedId = conv.id
                            }.tag(Optional(conv.id))
                        }
                    } header: {
                        HStack {
                            Text(group.title.uppercased())
                            Spacer()
                            if group.canAdd { Image(systemName: "plus.circle").foregroundColor(AppColors.info) }
                        }
                    }
                }
            }
            .listStyle(.sidebar)

            Spacer()

            // Footer
            HStack(spacing: 12) {
                Button { showingAddInstance = true } label: {
                    HStack { Image(systemName: "plus"); Text("添加实例") }
                        .frame(maxWidth: .infinity).padding(.vertical, 9)
                        .background(AppColors.info)
                        .foregroundColor(.white)
                        .clipShape(RoundedRectangle(cornerRadius: AppRadius.md))
                }.buttonStyle(.plain)
                Button { showingSettings = true } label: {
                    Image(systemName: "gearshape").font(.system(size: 14))
                        .frame(width: 32, height: 32)
                        .background(AppColors.elevatedSurface)
                        .clipShape(Circle())
                        .foregroundColor(AppColors.tertiaryText)
                }.buttonStyle(.plain)
            }
            .padding(14)
            .overlay(Divider(), alignment: .top)
        }
        .background(AppColors.surfaceCard)
        .sheet(isPresented: $showingAddInstance) { AddInstanceSheet() }
        .sheet(isPresented: $showingSettings) { SettingsView() }
    }
}
```

### 6.4 主聊天 (ChatView)

```swift
struct ChatView: View {
    let conversation: Conversation
    @State private var viewModel: ChatViewModel
    @State private var showQuickSettings = false

    init(conversation: Conversation) {
        self.conversation = conversation
        _viewModel = State(initialValue: ChatViewModel(conversation: conversation))
    }

    var body: some View {
        VStack(spacing: 0) {
            ChatHeader(
                agent: viewModel.agent,
                connectionState: viewModel.connectionState,
                latencyMs: viewModel.latencyMs,
                showingQuickSettings: $showQuickSettings,
                onAddTap: { /* new conversation */ },
                onSearchTap: { /* search */ },
                onSettingsTap: { /* agent settings */ },
                onCollapseTap: { /* back to welcome */ }
            )

            TokenUsageBar(stats: viewModel.tokenStats)

            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(viewModel.messages) { msg in
                            MessageBubble(
                                message: msg,
                                isUser: msg.role == .user,
                                isLastAi: msg.id == viewModel.lastAiMessageId
                            ).id(msg.id)
                        }
                    }
                    .padding(.vertical, 24)
                }
                .onChange(of: viewModel.messages.count) { _ in
                    if let last = viewModel.messages.last {
                        withAnimation { proxy.scrollTo(last.id, anchor: .bottom) }
                    }
                }
            }

            InputBar(
                text: $viewModel.inputText,
                model: viewModel.agent.model,
                isAiResponding: viewModel.isAiResponding,
                onSend: viewModel.send,
                onStop: viewModel.stop,
                onAttach: viewModel.attachFile,
                onMore: { /* show more actions */ },
                onModelTap: { /* show model picker */ }
            )
        }
        .popover(isPresented: $showQuickSettings) {
            QuickSettingsPanel(/* bindings */)
        }
    }
}
```

### 6.5 欢迎页 (WelcomeView)

```swift
struct WelcomeView: View {
    @State private var showingAddInstance = false

    var body: some View {
        ZStack {
            AppColors.pageBackground.ignoresSafeArea()
            VStack(spacing: 24) {
                Image(systemName: "antenna.radiowaves.left.and.right")
                    .font(.system(size: 64)).foregroundColor(AppColors.amber300)
                Text("MyPilot").font(.system(size: 32, weight: .semibold))
                Text("私有化 OpenClaw 客户端").font(AppTypography.caption)
                    .foregroundColor(AppColors.tertiaryText)

                VStack(alignment: .leading, spacing: 16) {
                    WelcomeStep(icon: "server.rack", title: "部署 OpenClaw",
                                sub: "在服务器上安装 OpenClaw Gateway")
                    WelcomeStep(icon: "terminal", title: "安装 MyPilot Link",
                                sub: "npm i -g @mypilot/link && mypilot start")
                    WelcomeStep(icon: "plus.circle", title: "添加实例",
                                sub: "输入服务器地址和配对码连接")
                }
                .padding(.vertical, 16)

                Button { showingAddInstance = true } label: {
                    HStack {
                        Image(systemName: "plus")
                        Text("添加实例").fontWeight(.medium)
                    }
                    .padding(.horizontal, 24).padding(.vertical, 12)
                    .background(AppColors.info)
                    .foregroundColor(.white)
                    .clipShape(RoundedRectangle(cornerRadius: AppRadius.md))
                }.buttonStyle(.plain)

                Text("v1.0.0 · 数据完全私有").font(AppTypography.nano)
                    .foregroundColor(AppColors.quaternaryText)
            }
            .frame(maxWidth: 520)
            .padding(64)
        }
        .sheet(isPresented: $showingAddInstance) { AddInstanceSheet() }
    }
}
```

### 6.6 设置面板 (SettingsView + 9 子页)

```swift
struct SettingsView: View {
    @State private var path: [SettingsDest] = []
    @State private var appState = AppState.shared

    enum SettingsDest: Hashable {
        case network, agentFiles, agentsMgmt, imChannels, memory, usage, diagnostics, searchProviders
    }

    var body: some View {
        NavigationStack(path: $path) {
            HSplitView {
                settingsList
                    .frame(width: 360)
                settingsDetailPlaceholder
            }
            .navigationTitle("设置")
            .navigationDestination(for: SettingsDest.self) { dest in
                switch dest {
                case .network: NetworkSettingsView()
                case .agentFiles: AgentFilesView()
                case .agentsMgmt: AgentsManagementView()
                case .imChannels: IMChannelsView()
                case .memory: MemoryReadingView()
                case .usage: UsageStatsView()
                case .diagnostics: DiagnosticsCenterView()
                case .searchProviders: SearchProvidersView()
                }
            }
        }
    }

    private var settingsList: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("⚙ 设置").font(.system(size: 17, weight: .semibold))
                .padding(.horizontal, 20).padding(.vertical, 14)
                .overlay(Divider(), alignment: .bottom)

            // Status
            HStack {
                Circle().fill(connectionColor).frame(width: 8, height: 8)
                VStack(alignment: .leading, spacing: 2) {
                    Text(appState.activeInstance?.name ?? "未连接")
                        .font(AppTypography.sectionTitle)
                    Text(appState.activeInstance?.url ?? "")
                        .font(AppTypography.caption).foregroundColor(AppColors.tertiaryText)
                }
            }
            .padding(16)
            .overlay(Divider(), alignment: .bottom)

            ScrollView {
                VStack(spacing: 0) {
                    sectionHeader("配置")
                    SettingsRow(icon: "network", iconColor: .blue, title: "网络与连接", isActive: false) {
                        path.append(.network)
                    }
                    SettingsRow(icon: "magnifyingglass", iconColor: .blue, title: "联网搜索", isActive: false) {
                        path.append(.searchProviders)
                    }
                    SettingsRow(icon: "cpu", iconColor: .blue, title: "模型与并发", isActive: false) { }
                    SettingsRow(icon: "alarm", iconColor: .orange, title: "定时任务", isActive: false) { }

                    sectionHeader("管理")
                    SettingsRow(icon: "doc.text", iconColor: .green, title: "Agent 文件", isActive: false) {
                        path.append(.agentFiles)
                    }
                    SettingsRow(icon: "person.2", iconColor: .green, title: "Agent 管理", isActive: false) {
                        path.append(.agentsMgmt)
                    }
                    SettingsRow(icon: "bubble.left.and.bubble.right", iconColor: .blue, title: "IM 渠道", isActive: false) {
                        path.append(.imChannels)
                    }
                    SettingsRow(icon: "book", iconColor: .blue, title: "记忆与技能", isActive: false) {
                        path.append(.memory)
                    }
                    SettingsRow(icon: "chart.bar", iconColor: .orange, title: "用量统计", isActive: false) {
                        path.append(.usage)
                    }

                    sectionHeader("其他")
                    SettingsRow(icon: "stethoscope", iconColor: .gray, title: "诊断中心", isActive: false) {
                        path.append(.diagnostics)
                    }
                    SettingsRow(icon: "info.circle", iconColor: .gray, title: "关于 MyPilot", isActive: false) { }
                }
            }
        }
        .background(AppColors.surfaceCard)
    }

    private func sectionHeader(_ text: String) -> some View {
        Text(text.uppercased()).font(AppTypography.data).fontWeight(.semibold)
            .foregroundColor(AppColors.tertiaryText)
            .padding(.horizontal, 20).padding(.top, 16).padding(.bottom, 6)
            .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var settingsDetailPlaceholder: some View {
        VStack {
            Text("从左侧选择设置项").font(AppTypography.title3)
                .foregroundColor(AppColors.tertiaryText)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(AppColors.pageBackground)
    }

    private var connectionColor: Color {
        appState.connectionState == .connected ? AppColors.success : AppColors.tertiaryText
    }
}
```

### 6.7-6.15 设置子页（精简规范）

每个子页的统一模板：

```swift
struct SubSettingsView: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                Text("页面标题").font(AppTypography.pageTitle)
                // 各 form section
            }
            .padding(24)
        }
        .background(AppColors.pageBackground)
    }
}
```

**6.7 NetworkSettings**：Gateway 状态 / RTT / WS 协议 / 诊断数据
**6.8 AgentFiles**：7 个 .md 文件列表，SOUL 标记只读
**6.9 AgentsManagement**：4 个 Agent 卡片 + AGENTS.md 解析区
**6.10 IMChannels**：7 个 IM 渠道卡片（飞书/企微/钉钉/QQ/Telegram/Slack/Discord）
**6.11 ScheduledTasks**：4 行 TaskRow，含 toggle 和 run now 按钮
**6.12 MemoryReading**：MEMORY.md 只读显示 + SKILLS.md 列表
**6.13 DiagnosticsCenter**：4 个 DiagMetric + 3 个 Gauge + 目录列表 + 导出按钮
**6.14 UsageStats**：3 个 hero Gauge + 7-day 柱状图 + 按 Agent 拆分
**6.15 SearchProviders**：9 个服务商 + 4 个行为 toggle

---

## 7. 状态管理

### 7.1 @Observable 模式（Swift 5.9+）

```swift
@Observable
final class AppState {
    static let shared = AppState()

    var instances: [Instance] = []
    var agents: [Agent] = []
    var conversations: [Conversation] = []
    var activeAgentId: String?
    var activeInstanceId: String?
    var connectionState: ConnectionState = .disconnected(reason: nil)
    var settings: AppSettings = .default

    func addInstance(_ instance: Instance) { /* ... */ }
    func removeInstance(_ id: String) { /* ... */ }
    func selectAgent(_ agent: Agent) { /* ... */ }
    func createConversation(agentId: String) -> Conversation { /* ... */ }
}
```

**关键约束**（避免常见陷阱）：
- ❌ `@Observable` 类的 `lazy var` 闭包不能捕获 `self` → ✅ 用 `private var` + 手动初始化
- ❌ 避免在 `@Observable` 中使用 `@Published`（重复）
- ✅ 子 View 通过 `@Bindable` 接收 binding：`@Bindable var vm: ChatViewModel`

### 7.2 ChatViewModel

```swift
@Observable
final class ChatViewModel {
    let conversation: Conversation
    var messages: [ChatMessage] = []
    var inputText: String = ""
    var isAiResponding: Bool = false
    var agent: Agent
    var connectionState: ConnectionState = .connected(latencyMs: 48)
    var latencyMs: Int? = 48
    var tokenStats: TokenStats = .init(in: 0, out: 0, cache: 0, cost: 0, total: 0, max: 128_000)

    // 流式输出：双缓冲
    private var streamingBuffer: String = ""
    private var streamingDisplayContent: String = ""
    private var streamTimer: Timer?

    var lastAiMessageId: String? { messages.last(where: { !$0.isUser })?.id }

    init(conversation: Conversation) { /* load from disk */ }

    func send() {
        let userMsg = ChatMessage(role: .user, content: inputText)
        messages.append(userMsg)
        inputText = ""
        isAiResponding = true
        // 通过 WebSocket 发送
        WebSocketService.shared.sendMessage(userMsg, agent: agent) { [weak self] chunk in
            self?.appendChunk(chunk)
        }
    }

    func stop() {
        WebSocketService.shared.cancelStream()
        isAiResponding = false
    }

    private func appendChunk(_ chunk: String) {
        streamingBuffer += chunk
        if streamTimer == nil {
            streamTimer = Timer.scheduledTimer(withTimeInterval: 0.03, repeats: true) { [weak self] _ in
                self?.drainBuffer()
            }
        }
    }

    private func drainBuffer() {
        // 30ms 内逐字符提取到 displayContent
        if !streamingBuffer.isEmpty {
            let char = streamingBuffer.removeFirst()
            streamingDisplayContent.append(char)
            // 找到或创建最后一条 AI 消息
            if var last = messages.last, !last.isUser {
                last.content = streamingDisplayContent
                messages[messages.count - 1] = last
            } else {
                let ai = ChatMessage(role: .assistant, content: streamingDisplayContent)
                messages.append(ai)
            }
        } else if !isAiResponding {
            streamTimer?.invalidate()
            streamTimer = nil
        }
    }
}
```

---

## 8. 动画规范

### 8.1 标准时长

| 用途 | 时长 | 曲线 |
|---|---|---|
| 弹窗出现 | 0.25s | `.easeOut` |
| 弹窗消失 | 0.20s | `.easeIn` |
| 状态切换 | 0.20s | `.easeInOut` |
| 折叠展开 | 0.30s | `.spring(response: 0.3, dampingFraction: 0.8)` |
| BouncingDots 周期 | 0.18s/step | linear |
| 气泡出现 | 0.20s | `.spring(response: 0.2, dampingFraction: 0.9)` |
| Sidebar row hover | 0.15s | `.easeOut` |

### 8.2 标准动画

```swift
extension Animation {
    static let uiStandard: Animation = .easeInOut(duration: 0.20)
    static let uiSheet: Animation = .easeOut(duration: 0.25)
    static let uiSpring: Animation = .spring(response: 0.3, dampingFraction: 0.8)
}
```

### 8.3 受尊重偏好的设置

```swift
// 在 ChatView 出现时检查
@State private var reduceMotion = UIAccessibility.isReduceMotionEnabled

if reduceMotion {
    // 禁用装饰性动画，仅保留功能性
} else {
    // 完整动画
}
```

---

## 9. WebSocket 协议

### 9.1 消息类型

| 方向 | type | 含义 |
|---|---|---|
| → server | `chat.send` | 发送用户消息 |
| ← server | `chat.chunk` | 流式响应块 |
| ← server | `chat.final` | 响应完成（含 usage） |
| ← server | `chat.error` | 错误 |
| → server | `chat.cancel` | 取消流式 |
| → server | `agent.list` | 获取 Agent 列表 |
| ← server | `agent.lifecycle.start` | Agent 启动 |
| ← server | `agent.lifecycle.end` | Agent 结束 |

### 9.2 消息结构

```swift
struct WSMessage: Codable {
    let type: String
    let id: String?
    let conversationId: String?
    let agentId: String?
    let payload: Payload?

    enum Payload: Codable {
        case chatSend(text: String, attachments: [Attachment])
        case chatChunk(delta: String, finished: Bool)
        case chatFinal(usage: TokenUsage, totalCost: Double)
        case chatError(code: String, message: String)
    }
}
```

### 9.3 重连策略

```swift
class WebSocketService {
    private var retryCount = 0
    private let maxRetries = 10

    func connect() {
        // exponential backoff: 0.5s, 1s, 2s, 4s, 8s, max 30s
        let delay = min(30, pow(2, Double(retryCount)) * 0.5)
        DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in
            self?.retryCount += 1
            self?.openSocket()
        }
    }
}
```

---

## 10. 边界条件

### 10.1 Empty States

| 场景 | 组件 | 文案 |
|---|---|---|
| 首次启动无实例 | `WelcomeView` | "添加实例" |
| 无 Agent | `EmptyStateView` | "尚未添加 Agent" + "添加 Agent" 按钮 |
| 无会话 | `EmptyStateView` | "暂无会话" + "开始新对话" 按钮 |
| 无搜索结果 | `EmptyStateView` | "未找到匹配消息" |
| 队列空 | `BouncingDots` | "正在加载" |

### 10.2 Error States

| 场景 | 颜色 | 文案 | 行动 |
|---|---|---|---|
| WebSocket 断开 | `AppColors.danger` | "连接已断开" | 显示重连按钮 |
| API 4xx | `AppColors.danger` | "请求错误" | 重试 |
| API 5xx | `AppColors.danger` | "服务器错误" | 重试 + 报告 |
| 配对码错误 | `AppColors.danger` | "配对码无效" | 重新输入 |
| 网络超时 | `AppColors.warning` | "请求超时" | 重试 |
| 流式中断 | `AppColors.warning` | "响应中断" | 重新生成 |

### 10.3 长内容处理

```swift
// 消息超过 5000 字：截断 + 展开
if message.content.count > 5000 {
    VStack {
        Text(message.content.prefix(2000))
            .lineLimit(isExpanded ? nil : 8)
        Button(isExpanded ? "收起" : "展开全部") {
            withAnimation { isExpanded.toggle() }
        }
    }
}

// Token 超过上下文上限：警告 + 截断
if stats.total > stats.max * 0.85 {
    HStack {
        Image(systemName: "exclamationmark.triangle.fill")
            .foregroundColor(AppColors.warning)
        Text("上下文接近上限，建议 /compact")
            .font(AppTypography.caption)
    }
}
```

### 10.4 iPad 特殊处理

- **横屏（默认）**：NavigationSplitView 320pt + 详情区
- **纵屏**：NavigationSplitView 自动 stack 模式
- **Slide Over / Split View**：
  - 宽度 < 500pt → 隐藏 sidebar，detail 满屏
  - 宽度 500-900pt → sidebar 240pt
  - 宽度 > 900pt → sidebar 320pt
- **外接键盘**：⌘K 唤起命令面板，⌘N 新建会话，⌘/ 切换侧边栏

```swift
struct ContentView: View {
    @State private var appState = AppState.shared
    @Environment(\.horizontalSizeClass) var sizeClass

    var body: some View {
        if appState.instances.isEmpty {
            WelcomeView()
        } else {
            NavigationSplitView {
                SidebarView()
                    .navigationSplitViewColumnWidth(min: 180, ideal: sizeClass == .regular ? 320 : 240, max: 360)
            } detail: {
                ChatView()
            }
        }
    }
}
```

---

## 11. 通知与系统集成

### 11.1 AI 回复完成时

```swift
func postCompletionNotification(agent: Agent, preview: String) {
    guard UIApplication.shared.applicationState != .active else { return }
    // 1. 系统通知
    let content = UNMutableNotificationContent()
    content.title = agent.name
    content.body = preview
    content.sound = .default
    let req = UNNotificationRequest(identifier: UUID().uuidString, content: content, trigger: nil)
    UNUserNotificationCenter.current().add(req)
    // 2. Dock 弹跳
    NSApp.requestUserAttention(.informationalRequest)
    // 3. 未读计数
    AppState.shared.unreadCount += 1
    NSApp.dockTile.badgeLabel = "\(AppState.shared.unreadCount)"
}
```

### 11.2 应用回到前台时

```swift
.onChange(of: scenePhase) { phase in
    if phase == .active {
        AppState.shared.unreadCount = 0
        NSApp.dockTile.badgeLabel = nil
    }
}
```

---

## 12. 测试 Checklist

### 12.1 视觉测试

- [ ] 所有 token 来自 `AppColors` / `AppTypography` / `AppRadius` / `Spacing`
- [ ] 字号最小 13pt (无 11pt 用于正文)
- [ ] 触控热区 ≥ 44pt
- [ ] 圆角使用 enum 而非硬编码数字
- [ ] 暗色模式 (若支持) 所有 token 都正确翻转

### 12.2 状态机测试

- [ ] 消息状态：sending → sent → delivered / failed / cancelled 全路径
- [ ] 连接状态：disconnected → connecting → connected 全路径
- [ ] 输入栏：empty → typing → streaming → idle 全路径
- [ ] 配对流程：step1 → step2 → success / failure 全路径

### 12.3 动画测试

- [ ] BouncingDots 三个点不同时弹起（错位 0.18s）
- [ ] 气泡出现有 spring 动画
- [ ] 折叠展开 chevron 旋转 0→90°
- [ ] 弹窗出现有 fade + scale

### 12.4 性能测试

- [ ] 1000 条消息列表滚动 FPS ≥ 55
- [ ] 5MB 附件上传不阻塞主线程
- [ ] 连续 5 次切换 Agent 不内存泄漏
- [ ] 长时间运行（>1h）CPU 占用 < 5%

### 12.5 兼容性测试

- [ ] iPad Pro 13" 横屏 (1376×1024)
- [ ] iPad Pro 11" 横屏 (1194×834)
- [ ] iPad Air 10.9" 横屏 (1180×820)
- [ ] iPad mini 8.3" 横屏 (1133×744)
- [ ] 全部 iPad 纵屏 (反叠模式)
- [ ] Slide Over / Split View 1/3, 1/2, 2/3 比例

---

## 13. 文件结构（建议）

```
MyPilotApp/
├── MyPilot/
│   ├── MyPilotApp.swift                    # @main
│   ├── Core/
│   │   ├── DesignSystem/
│   │   │   ├── AppColors.swift
│   │   │   ├── AppTypography.swift
│   │   │   ├── AppRadius.swift
│   │   │   ├── Spacing.swift
│   │   │   └── AdaptiveLayout.swift
│   │   ├── State/
│   │   │   ├── AppState.swift
│   │   │   ├── ChatViewModel.swift
│   │   │   └── ConversationManager.swift
│   │   ├── Services/
│   │   │   ├── WebSocketService.swift
│   │   │   ├── APIService.swift
│   │   │   ├── AvatarService.swift
│   │   │   └── NotificationService.swift
│   │   └── Models/
│   │       ├── Agent.swift
│   │       ├── ChatMessage.swift
│   │       ├── Conversation.swift
│   │       ├── Instance.swift
│   │       ├── WSMessage.swift
│   │       └── TokenStats.swift
│   ├── Views/
│   │   ├── ContentView.swift
│   │   ├── SidebarView.swift
│   │   ├── ChatView.swift
│   │   ├── WelcomeView.swift
│   │   ├── AddInstanceView.swift
│   │   └── QRScannerSheet.swift
│   ├── Components/                        # 本规范 §5 的所有组件
│   │   ├── Chat/
│   │   │   ├── ChatHeaderSection.swift
│   │   │   ├── MessageBubbleView.swift
│   │   │   ├── ThinkingSection.swift
│   │   │   ├── TokenUsageBar.swift
│   │   │   └── MarkdownRenderer.swift
│   │   ├── Input/
│   │   │   ├── InputBarView.swift
│   │   │   ├── AttachmentChip.swift
│   │   │   └── AutoSizingTextView.swift
│   │   ├── Common/
│   │   │   ├── AgentAvatar.swift
│   │   │   ├── BouncingDots.swift
│   │   │   ├── PillToggle.swift
│   │   │   ├── StatusPill.swift
│   │   │   ├── ActionBar.swift
│   │   │   ├── FormCard.swift
│   │   │   ├── FormRow.swift
│   │   │   ├── SettingsRow.swift
│   │   │   ├── IconButton.swift
│   │   │   ├── EmptyStateView.swift
│   │   │   └── MyPilotBrandMark.swift
│   │   └── Popovers/
│   │       ├── QuickSettingsPanel.swift
│   │       ├── ModelPickerPanel.swift
│   │       ├── AgentPickerPanel.swift
│   │       ├── AISuggestionsPanel.swift
│   │       ├── MoreActionsGrid.swift
│   │       └── CommandPalette.swift
│   └── Features/
│       └── Settings/
│           ├── SettingsView.swift
│           ├── NetworkSettingsView.swift
│           ├── AgentFilesView.swift
│           ├── AgentsManagementView.swift
│           ├── IMChannelsView.swift
│           ├── ScheduledTasksView.swift
│           ├── MemoryReadingView.swift
│           ├── DiagnosticsCenterView.swift
│           ├── UsageStatsView.swift
│           └── SearchProvidersView.swift
```

---

## 14. 实施 Checklist（Code Agent 按此顺序开发）

### Phase 1：基础设施
- [ ] 1.1 复制 `Core/DesignSystem/` 5 个 token 文件
- [ ] 1.2 实现 `AppState` / `ChatViewModel` 骨架
- [ ] 1.3 实现 `WebSocketService`（含重连）
- [ ] 1.4 实现 `AvatarService`（含本地存储）
- [ ] 1.5 实现 `MyPilotBrandMark` 组件
- [ ] 1.6 实现 `BouncingDots` / `AgentAvatar` / `PillToggle` 3 个基础组件

### Phase 2：核心视图
- [ ] 2.1 `ContentView` (NavigationSplitView)
- [ ] 2.2 `WelcomeView`
- [ ] 2.3 `AddInstanceView` (Step 1 + Step 2 + QR)
- [ ] 2.4 `SidebarView` (含 SearchField / Instance / Agent / Conv rows)
- [ ] 2.5 `ChatView` 骨架

### Phase 3：聊天组件
- [ ] 3.1 `ChatHeaderSection`
- [ ] 3.2 `InputBarView` (含 AutoSizingTextView)
- [ ] 3.3 `MessageBubbleView` (含 Thinking / Action / Status)
- [ ] 3.4 `TokenUsageBar`
- [ ] 3.5 `MarkdownRenderer`

### Phase 4：弹窗与浮层
- [ ] 4.1 `QuickSettingsPanel`
- [ ] 4.2 `ModelPickerPanel`
- [ ] 4.3 `AgentPickerPanel`
- [ ] 4.4 `AISuggestionsPanel`
- [ ] 4.5 `MoreActionsGrid`
- [ ] 4.6 `CommandPalette`

### Phase 5：设置面板
- [ ] 5.1 `SettingsView` (NavigationStack + HSplitView)
- [ ] 5.2 `NetworkSettingsView`
- [ ] 5.3 `AgentFilesView`
- [ ] 5.4 `AgentsManagementView`
- [ ] 5.5 `IMChannelsView`
- [ ] 5.6 `ScheduledTasksView`
- [ ] 5.7 `MemoryReadingView`
- [ ] 5.8 `DiagnosticsCenterView`
- [ ] 5.9 `UsageStatsView`
- [ ] 5.10 `SearchProvidersView`

### Phase 6：完善
- [ ] 6.1 通知服务（系统通知 + Dock 徽章 + 弹跳）
- [ ] 6.2 错误处理（重试 / 降级 / 用户提示）
- [ ] 6.3 Reduce Motion / Dynamic Type 适配
- [ ] 6.4 Slide Over / Split View 适配
- [ ] 6.5 iPad 外接键盘快捷键（⌘K / ⌘N / ⌘/）
- [ ] 6.6 暗色模式（如果产品决策需要）

### Phase 7：验证
- [ ] 7.1 运行 `xcodebuild -project MyPilot.xcodeproj -scheme MyPilot -destination 'platform=iOS Simulator' build`
- [ ] 7.2 运行单元测试
- [ ] 7.3 在 iPad Pro 13" / 11" / Air / mini 模拟器逐屏截图对比 HTML 预览
- [ ] 7.4 按 §12 测试 Checklist 全量验证

---

## 附录 A：源真值文件清单

code agent 必须在动手前 **完整阅读** 这些文件：

```
MyPilotApp/MyPilot/MyPilot/Core/DesignSystem/AppColors.swift
MyPilotApp/MyPilot/MyPilot/Core/DesignSystem/AppTypography.swift
MyPilotApp/MyPilot/MyPilot/Core/DesignSystem/AppRadius.swift
MyPilotApp/MyPilot/MyPilot/Core/DesignSystem/Spacing.swift
MyPilotApp/MyPilot/MyPilot/Core/DesignSystem/AdaptiveLayout.swift
MyPilotApp/MyPilot/MyPilot/Views/ContentView.swift
MyPilotApp/MyPilot/MyPilot/Views/SidebarView.swift
MyPilotApp/MyPilot/MyPilot/Views/ChatView.swift
MyPilotApp/MyPilot/MyPilot/Views/WelcomeView.swift
MyPilotApp/MyPilot/MyPilot/Views/AddInstanceView.swift
MyPilotApp/MyPilot/MyPilot/Views/InputBarView.swift
MyPilotApp/MyPilot/MyPilot/Features/Chat/ChatHeaderSection.swift
MyPilotApp/MyPilot/MyPilot/Features/Chat/MessageBubbleView.swift
MyPilotApp/MyPilot/MyPilot/Features/Chat/ChatMessageSection.swift
MyPilotApp/MyPilot/MyPilot/Features/Settings/SettingsView.swift
MyPilotApp/MyPilot/MyPilot/Features/Settings/NetworkSettingsView.swift
MyPilotApp/MyPilot/MyPilot/Features/Settings/AgentFilesView.swift
MyPilotApp/MyPilot/MyPilot/Features/Settings/AgentsManagementView.swift
MyPilotApp/MyPilot/MyPilot/Features/Settings/IMChannelsView.swift
MyPilotApp/MyPilot/MyPilot/Features/Settings/ScheduledTasksView.swift
MyPilotApp/MyPilot/MyPilot/Features/Settings/MemoryReadingView.swift
MyPilotApp/MyPilot/MyPilot/Features/Settings/DiagnosticsCenterView.swift
MyPilotApp/MyPilot/MyPilot/Features/Settings/UsageStatsView.swift
```

## 附录 B：参考预览

完整的 iPad UI 视觉参考：[MyPilot-iPad-UI-Preview.html](file:///Users/liaoxing/Downloads/未命名文件夹/设计/MyPilot-iPad-UI-Preview.html)

本地预览 URL：http://127.0.0.1:8090/MyPilot-iPad-UI-Preview.html

## 附录 C：术语表

| 术语 | 含义 |
|---|---|
| OpenClaw | MyPilot 后端的 Gateway 服务器，提供 AI Agent 服务 |
| mypilot-link | Node.js daemon，运行在服务器上，桥接 OpenClaw 与客户端 |
| clawpilot / clawlink | ClawPilot 公共发布包，私有修改不应回流入此线 |
| daemon | 本地 Node 进程，监听 52378 端口 |
| Agent | OpenClaw 上的独立 AI 人格，main / coder / writer 等 |
| 配对码 | 服务器终端执行 mypilot pair 时生成的 XXXX-XXXX-XXXX 格式字符串 |
| Conversation | 与单个 Agent 的对话会话，ID 格式 `agentId:default` |
| 配对流程 | 添加实例的两步：URL 健康检查 → 配对码验证 |

---

**文档完成日期**：2026-06-14
**对应源码版本**：MyPilot Mac v1.0.0
**下版本规划**：v1.1.0 增加 iPad 多任务 / 桌面扩展 / Stage Manager 适配
