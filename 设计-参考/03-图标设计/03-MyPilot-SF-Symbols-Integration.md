# MyPilot SF Symbols 集成指南

将 30 个页面图标接入 iOS SF Symbols 系统，统一通过 `Image(systemName:)` 调用，自动支持：
- 浅色/深色模式
- 多级渲染（monochrome / hierarchical / palette / multicolor）
- 动态尺寸（9pt ~ 1024pt）
- 局部变量（`imageScale`、颜色、字重）

---

## 1. 在 Xcode 中创建 Symbol Set

### 步骤 A：创建 SF Symbols 扩展工程

1. 打开 Xcode → File → New → Project → **iOS / App**
2. 命名：`MyPilotSymbols`
3. 关闭工程
4. 在 Finder 中打开工程目录
5. 新建文件夹 `Symbols.xcassets/Symbols.symbolset/`
6. 复制以下文件到 `Symbols.symbolset/`：
   - `Contents.json`（见下方模板）
   - 每个图标的 SVG 重命名为 `<name>.svg`，例如 `mp.chat.svg`

### 步骤 B：Contents.json 模板

为每个图标创建 `Contents.json`：

```json
{
  "info" : {
    "author" : "xcode",
    "version" : 1
  },
  "symbols" : [
    {
      "idiom" : "universal",
      "filename" : "mp.chat.svg"
    },
    {
      "idiom" : "universal",
      "filename" : "mp.chat.fill.svg",
      "display-name" : "Chat Fill",
      "display-priority" : 1
    }
  ]
}
```

### 步骤 C：在主工程引用

1. 打开 `MyPilot.xcodeproj`
2. 将 `MyPilotSymbols` 工程拖入 workspace
3. 主工程 Build Phases → Target Dependencies → 添加 `MyPilotSymbols`
4. 完成 — 所有 `mp.*` Symbol 在 Asset Catalog 中可用

---

## 2. Swift 调用方式

### 基础调用

```swift
Image(systemName: "mp.chat")
    .font(.system(size: 18))
    .foregroundStyle(Color.accentColor)
```

### 渲染模式

```swift
// 单色（默认）
Image(systemName: "mp.settings")
    .foregroundStyle(.primary)

// 多色
Image(systemName: "mp.heartbeat")
    .symbolRenderingMode(.multicolor)

// 调色板
Image(systemName: "mp.warning")
    .symbolRenderingMode(.palette)
    .foregroundStyle(.white, .orange)

// 层级
Image(systemName: "mp.agents")
    .symbolRenderingMode(.hierarchical)
    .foregroundStyle(.blue)
```

### Fill 变体（按状态切换）

```swift
// 默认态
Image(systemName: "mp.heartbeat")

// 激活态
Image(systemName: "mp.heartbeat.fill")
    .symbolEffect(.pulse, isActive: isActive)
```

### 动态效果

```swift
// 替换动画（侧边栏选中时图标填充切换）
withAnimation(.easeInOut) {
    selected = "agents"
}
Image(systemName: selected == "agents" ? "mp.agents.fill" : "mp.agents")
    .contentTransition(.symbolEffect(.replace))
```

### 列表项统一封装

```swift
struct MPNavIcon: View {
    let systemName: String
    let active: Bool

    var body: some View {
        Image(systemName: active ? "\(systemName).fill" : systemName)
            .font(.system(size: 18))
            .foregroundStyle(active ? Color.accentColor : Color.secondary)
            .frame(width: 28, height: 28)
            .contentTransition(.symbolEffect(.replace))
    }
}

// 使用
MPNavIcon(systemName: "mp.agents", active: isActive)
```

---

## 3. Symbol 命名规范

| 规则 | 示例 |
|------|------|
| 命名空间前缀 | `mp.*` |
| 多单词用 `.` 分隔 | `mp.task.create` |
| 激活态加 `.fill` 后缀 | `mp.heartbeat` / `mp.heartbeat.fill` |
| 方向用后缀 | `mp.back` / （如有 `mp.forward`） |
| 状态用后缀 | `mp.warning.fill` |

---

## 4. 与现有代码的集成

### ChatView 顶栏

```swift
HStack {
    Image(systemName: "mp.agents")
        .font(.system(size: 18))
    Text(currentAgent.name)
}
```

### SidebarView 导航项

```swift
ForEach(items) { item in
    Label {
        Text(item.title)
    } icon: {
        Image(systemName: "mp.\(item.icon)")
    }
}
```

### InputBarView 操作按钮

```swift
Button {
    sendMessage()
} label: {
    Image(systemName: isProcessing ? "mp.stop.fill" : "mp.send.fill")
        .symbolRenderingMode(.hierarchical)
        .contentTransition(.symbolEffect(.replace))
}
```

### TokenUsageBar 警告

```swift
HStack {
    Image(systemName: "mp.warning.fill")
        .symbolRenderingMode(.multicolor)
    Text("上下文使用 75%")
}
```

---

## 5. 设计对应表（30 个图标 → 8 大模块）

| 模块 | 图标 ID |
|------|------|
| **对话核心** | chat, send, stop, attach, search |
| **智能体管理** | agents, files, workflow, tool, memory, permission |
| **任务调度** | task.create, scheduled, heartbeat |
| **数据分析** | usage, diagnostics |
| **系统设置** | settings, network, channels, advanced |
| **状态反馈** | info, warning, warning.fill, success, empty, connection |
| **导航操作** | back, close, menu, add, delete, edit, refresh |

---

## 6. Asset Catalog 目录结构

```
MyPilotSymbols/
└── Symbols.xcassets/
    └── Symbols.symbolset/
        ├── Contents.json
        ├── mp.chat.svg
        ├── mp.chat.fill.svg
        ├── mp.agents.svg
        ├── mp.agents.fill.svg
        ├── mp.settings.svg
        ├── ...
        └── mp.menu.svg
```

---

## 7. 验证方式

```swift
// 在 SwiftUI Preview 中验证全部图标
struct MPNavIconGallery: View {
    let icons = [
        "mp.chat", "mp.agents", "mp.settings", "mp.network",
        "mp.scheduled", "mp.usage", "mp.diagnostics", "mp.channels",
        "mp.files", "mp.task.create", "mp.advanced", "mp.empty",
        "mp.workflow", "mp.memory", "mp.permission", "mp.heartbeat",
        "mp.send", "mp.stop", "mp.attach", "mp.search",
        "mp.add", "mp.delete", "mp.edit", "mp.refresh",
        "mp.connection", "mp.info", "mp.warning", "mp.success",
        "mp.close", "mp.back", "mp.menu"
    ]

    var body: some View {
        LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 6), spacing: 24) {
            ForEach(icons, id: \.self) { name in
                VStack {
                    Image(systemName: name)
                        .font(.system(size: 32))
                        .foregroundStyle(.blue)
                    Text(name).font(.caption2)
                }
            }
        }
        .padding()
    }
}
```

---

## 8. 配色规范（与图标 SVG 一致）

```swift
extension Color {
    // 主色
    static let mpAccent = Color(light: .init(hex: "007AFF"), dark: .init(hex: "0A84FF"))

    // 状态色
    static let mpSuccess = Color(light: .init(hex: "34C759"), dark: .init(hex: "30D158"))
    static let mpWarning = Color(light: .init(hex: "FF9500"), dark: .init(hex: "FF9F0A"))
    static let mpDanger  = Color(light: .init(hex: "FF3B30"), dark: .init(hex: "FF453A"))
}
```

---

## 9. SF Symbols 版本要求

- **iOS 16+**：`contentTransition(.symbolEffect(.replace))` 等现代 API
- **iOS 17+**：`symbolEffect(.bounce)`、`symbolEffect(.pulse)`、Variable Color
- **iOS 18+**：`ZoomTransition` + Symbol 配合

App 当前最低支持版本如低于 iOS 16，建议回退到 `withAnimation` 手动切换 `.fill` 变体。
