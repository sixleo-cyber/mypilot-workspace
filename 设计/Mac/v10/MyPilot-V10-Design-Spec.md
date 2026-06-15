# MyPilot V10 iMessage 风格设计规范

> 基于 Apple HIG 与 iMessage 视觉风格，适用于 macOS SwiftUI App

---

## 1. 设计原则

- **极简**: 无多余装饰，无阴影，无渐变背景
- **清晰层级**: 靠间距和颜色区分层级，不靠边框和卡片
- **系统原生**: 使用系统字体、系统颜色、系统组件行为
- **柔和**: 大圆角、低对比度、自然过渡

---

## 2. 色彩系统

### 2.1 浅色模式 (Light)

| Token | 色值 | 用途 |
|-------|------|------|
| `bg` | `#FFFFFF` | 页面主背景 |
| `bg2` | `#F5F5F7` | 输入框背景、搜索框背景、按钮背景 |
| `bdr` | `#E5E5EA` | 分割线、边框（极少使用） |
| `tx` | `#000000` | 主文字 |
| `tx2` | `#8E8E93` | 次要文字、副标题 |
| `tx3` | `#C7C7CC` | 占位符文字、禁用状态 |
| `ub` / `ubg` | `#007AFF` | 用户气泡背景、系统强调色 |
| `ut` | `#FFFFFF` | 用户气泡文字 |
| `ab` | `#E5E5EA` | AI 气泡背景 |
| `at` | `#000000` | AI 气泡文字 |

### 2.2 深色模式 (Dark)

| Token | 色值 | 用途 |
|-------|------|------|
| `bg` | `#000000` | 页面主背景 |
| `bg2` | `#1C1C1E` | 输入框背景、搜索框背景 |
| `bdr` | `#2C2C2E` | 分割线 |
| `tx` | `#FFFFFF` | 主文字 |
| `tx2` | `#8E8E93` | 次要文字 |
| `tx3` | `#48484A` | 占位符文字 |
| `ub` / `ubg` | `#0A84FF` | 用户气泡背景、强调色 |
| `ut` | `#FFFFFF` | 用户气泡文字 |
| `ab` | `#2C2C2E` | AI 气泡背景 |
| `at` | `#FFFFFF` | AI 气泡文字 |

### 2.3 SwiftUI 实现

```swift
enum AppColors {
    // 页面背景
    static let pageBackground = Color(hex: "#FFFFFF", darkHex: "#000000")
    static let elevatedSurface = Color(hex: "#F5F5F7", darkHex: "#1C1C1E")
    static let separatorLine = Color(hex: "#E5E5EA", darkHex: "#2C2C2E")
    
    // 文字
    static let primaryText = Color(hex: "#000000", darkHex: "#FFFFFF")
    static let secondaryText = Color(hex: "#8E8E93", darkHex: "#8E8E93")
    static let tertiaryText = Color(hex: "#C7C7CC", darkHex: "#48484A")
    
    // 用户气泡
    static let userBubbleBg = Color(hex: "#007AFF", darkHex: "#0A84FF")
    static let userBubbleText = Color(hex: "#FFFFFF", darkHex: "#FFFFFF")
    
    // AI 气泡
    static let aiBubbleBg = Color(hex: "#E5E5EA", darkHex: "#2C2C2E")
    static let aiBubbleText = Color(hex: "#000000", darkHex: "#FFFFFF")
    
    // 状态色
    static let success = Color(hex: "#34C759", darkHex: "#30D158")
    static let danger = Color(hex: "#FF3B30", darkHex: "#FF453A")
    static let warning = Color(hex: "#FF9500", darkHex: "#FF9F0A")
}
```

---

## 3. 字体系统

使用系统字体 `-apple-system` / `SF Pro Text` / `Noto Sans SC`

| 用途 | 字号 | 字重 | 行高 |
|------|------|------|------|
| 页面标题 | 24px | Semibold (600) | 1.2 |
| 消息正文 | **13px** | Regular (400) | **1.4** |
| 消息元信息 (时间戳) | 11px | Regular | 1.2 |
| 侧边栏标题 | 15px | Semibold | 1.2 |
| 侧边栏副标题 | 13px | Regular | 1.2 |
| 输入框文字 | 16px | Regular | 1.3 |
| 按钮文字 | 13px | Semibold | 1.0 |
| 标签/徽章 | 11px | Semibold | 1.0 |

### SwiftUI 实现

```swift
enum AppTypography {
    static let pageTitle = Font.system(size: 24, weight: .semibold)
    static let body = Font.system(size: 13, weight: .regular)      // 消息正文
    static let caption = Font.system(size: 12, weight: .regular)
    static let badge = Font.system(size: 11, weight: .semibold)
    static let nano = Font.system(size: 11, weight: .regular)
}
```

---

## 4. 圆角系统

| 用途 | 圆角值 |
|------|--------|
| 消息气泡 (大圆角) | **18px** |
| 消息气泡 (小圆角/尾巴) | **4px** |
| 输入框 | 20px (pill shape) |
| 按钮 (圆形) | 50% |
| 卡片/弹窗 | 14-16px |
| 侧边栏行选中 | 10px |

### 消息气泡圆角规则

- **用户气泡**: `border-radius: 18px 18px 4px 18px`
  - 左上、右上、左下: 18px
  - 右下: 4px (尾巴)

- **AI 气泡**: `border-radius: 18px 18px 18px 4px`
  - 右上、右下、左下: 18px
  - 左上: 4px (尾巴)

### SwiftUI 实现

```swift
// 使用自定义 Shape
struct RoundedCorner: Shape {
    var radius: CGFloat = .infinity
    var corners: RectCorner = .all
    
    func path(in rect: CGRect) -> Path { ... }
}

// 用户气泡
.cornerRadius(18, corners: [.topLeft, .topRight, .bottomLeft])
.cornerRadius(4, corners: [.bottomRight])

// AI 气泡
.cornerRadius(18, corners: [.topRight, .bottomLeft, .bottomRight])
.cornerRadius(4, corners: [.topLeft])
```

---

## 5. 间距系统

| 用途 | 值 |
|------|-----|
| 页面内边距 | 16-20px |
| 消息间距 | **2px** (消息之间紧凑) |
| 消息组间距 | 8px |
| 气泡内边距 | 8px 14px |
| 输入栏内边距 | 10px 16px 14px |
| 侧边栏行内边距 | 7px 12px |
| Header 内边距 | 10px 20px |

---

## 6. 布局规范

### 6.1 整体布局

```
+------------------------------------------+
| Toolbar (38px)                           |
+----------+-------------------------------+
| Sidebar  | Chat Area                     |
| (280px)  |                               |
|          |  Header (auto)                |
|          |  -------------------------    |
|          |  Messages (flex)              |
|          |  -------------------------    |
|          |  Input Bar (auto)             |
+----------+-------------------------------+
```

### 6.2 侧边栏 (Sidebar)

- 宽度: 280px
- 背景: 纯白 (`#FFFFFF`)，与聊天区一致
- **无右边框线**，纯靠背景色区分
- 搜索框: 圆角 10px，背景 `#F5F5F7`
- 选中行: 背景 `#007AFF` (系统蓝)，文字白色
- 未选中行 hover: 背景 `#F5F5F7`

### 6.3 聊天区 Header

- 背景: 纯白
- **无底线/顶线**，纯靠间距与消息区隔开
- 左侧: Agent 头像 (30px) + 名称 (17px bold) + 模型信息 (13px)
- 右侧: 状态指示器 (绿色圆点 7px) + "已连接" 文字

### 6.4 消息区

- 背景: 纯白
- 消息最大宽度: 70%（用户气泡 maxWidth=420px，AI 气泡 maxWidth=520px）
- 消息水平边距: 16px（气泡离列表左右边缘）
- 消息间距: 2px (非常紧凑)
- 消息组间距: 8px

### 6.5 输入栏

- 背景: 卡片式容器 `#F5F5F7`，圆角 14px，0.5px 边框 `rgba(0,0,0,0.08)`
- **无顶线**，纯靠间距与消息区隔开
- 布局: 卡片式 VStack — 上部大文本区 + 底部工具栏
- 底部工具栏: `[📎文件按钮 | ⋯更多按钮] ... [模型选择▾ | ↑发送按钮]`
- 图标按钮: 32px 圆形，背景 `#F5F5F7`，图标 16px 灰色
- 更多按钮: 图标 + "更多" 文字，`ellipsis.circle` 图标
- 模型选择: 当前模型名 + chevron.down，弹出 QuickSettingsPanel
- 发送按钮: 32px 圆形，背景 `#007AFF`，图标白色
- 文本区: maxHeight=200，minHeight=60，fontSize=15
- 工具栏内边距: 水平 8px，顶部 8px，底部 6px
- 外层间距: 水平 10px，顶部 6px，底部 12px（与侧边栏底边齐平）

---

## 7. 组件规范

### 7.1 消息气泡

```swift
HStack {
    if message.isFromUser {
        Spacer()
        Text(message.content)
            .font(AppTypography.body)           // 13px
            .foregroundStyle(AppColors.userBubbleText)
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(AppColors.userBubbleBg)
            .cornerRadius(18, corners: [.topLeft, .topRight, .bottomLeft])
            .cornerRadius(4, corners: [.bottomRight])
    } else {
        // AI 消息同理，背景用 aiBubbleBg
        // 圆角: 18px 18px 18px 4px
    }
}
```

### 7.2 状态指示器

- 在线: `#34C759` (绿色) 7px 圆点
- 离线: `#FF3B30` (红色)
- 同步中: `#FF9500` (橙色)

### 7.3 按钮

**圆形图标按钮 (输入栏)**:
- 尺寸: 32x32px
- 背景: `#F5F5F7`
- 图标: 16px，颜色 `#8E8E93`
- 圆角: 50%

**发送按钮**:
- 尺寸: 32x32px
- 背景: `#007AFF`
- 图标: 16px，白色
- 圆角: 50%

**主要按钮 (侧边栏底部)**:
- 高度: 32px
- 圆角: 10px
- 背景: `#007AFF`
- 文字: 13px Semibold，白色

### 7.4 搜索框

```swift
HStack(spacing: 6) {
    Image(systemName: "magnifyingglass")
        .font(.caption)
        .foregroundStyle(AppColors.tertiaryText)
    
    TextField("搜索...", text: $searchQuery)
        .textFieldStyle(.plain)
        .font(.subheadline)
}
.padding(.horizontal, 10)
.padding(.vertical, 6)
.background(AppColors.elevatedSurface)
.cornerRadius(10)
```

### 7.5 弹窗/Popover

- 背景: 纯白
- 圆角: 14px
- 阴影: `0 4px 24px rgba(0,0,0,0.12)`
- 边框: 0.5px `rgba(0,0,0,0.08)`

### 7.6 Sheet

- 背景: 纯白
- 圆角: 16px
- 遮罩: `rgba(0,0,0,0.3)`
- 阴影: `0 20px 60px rgba(0,0,0,0.2)`

---

## 8. 动画规范

| 动画 | 时长 | 缓动函数 |
|------|------|----------|
| 消息入场 | 0.3s | ease |
| Tab 切换 | 0.2s | easeInOut |
| 按钮按下 | 0.1s | scale(0.97) |
| 发送按钮 | 0.1s | scale(0.93) |
| Toggle 开关 | 0.25s | cubic-bezier(0.34, 1.56, 0.64, 1) |
| 页面切换 | 0.3s | ease (slideInRight) |

### 消息入场动画

```swift
@keyframes messageIn {
    from { opacity: 0; transform: translateY(8px) }
    to { opacity: 1; transform: none }
}
```

---

## 9. 深色模式适配

所有颜色使用 `Color(hex:darkHex:)` 初始化，自动跟随系统外观。

```swift
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
}
```

---

## 10. 文件对应关系

| 设计元素 | SwiftUI 文件 | 关键代码位置 |
|---------|-------------|-------------|
| 色彩系统 | `AppColors.swift` | 全局 |
| 字体系统 | `AppTypography.swift` | 全局 |
| 圆角系统 | `AppRadius.swift` | 全局 |
| 消息气泡 | `MessageBubbleView.swift` | L61-L270 |
| 聊天 Header | `ChatHeaderSection.swift` | L24-L212 |
| 输入栏 | `InputBarView.swift` | L37-L306 |
| 侧边栏 | `SidebarView.swift` | L15-L309 |
| 消息列表 | `ChatMessageSection.swift` | L26-L202 |
| 主布局 | `ChatView.swift` | L23-L117 |
| 设置主页 | `Features/Settings/SettingsView.swift` | — |
| 网络设置 | `Features/Settings/NetworkSettingsView.swift` | — |
| Agents 管理 | `Features/Settings/AgentsManagementView.swift` | — |
| 定时任务 | `Features/Settings/ScheduledTasksView.swift` | — |
| 运行统计 | `Features/Settings/UsageStatsView.swift` | — |
| 诊断中心 | `Features/Settings/DiagnosticsCenterView.swift` | — |
| IM 渠道 | `Features/Settings/IMChannelsView.swift` | — |
| Agent 文件 | `Features/Settings/AgentFilesView.swift` | — |
| 高级设置 | `Features/Settings/AdvancedSettingsView.swift` | — |

---

## 11. 其他页面设计规范

> 12 个二级/三级页面的统一设计语言，详见 `mypilot-ui-showcase-pages-v10.html`

### 11.1 设计 Token（CSS 变量）

```css
:root {
  /* 颜色 */
  --bg: #FFFFFF;        --bg2: #F5F5F7;
  --bdr: #E5E5EA;
  --tx: #000000;        --tx2: #8E8E93;     --tx3: #C7C7CC;
  --accent: #007AFF;    --accent-soft: #007AFF1A;
  --danger: #FF3B30;    --danger-soft: #FF3B301A;
  --success: #34C759;   --success-soft: #34C7591A;
  --warning: #FF9500;   --warning-soft: #FF95001A;

  /* Ink 灰阶 */
  --ink-50:  #FAFAFA;   --ink-100: #F5F5F7;  --ink-200: #E5E5EA;
  --ink-300: #D1D1D6;   --ink-400: #8E8E93;  --ink-500: #636366;
  --ink-700: #3A3A3C;   --ink-900: #1C1C1E;

  /* 圆角 */
  --radius-sm: 8px;     --radius-md: 10px;
  --radius-lg: 14px;    --radius-xl: 18px;

  /* 阴影 */
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.04);
  --shadow-md: 0 4px 16px rgba(0,0,0,0.06);
  --shadow-lg: 0 8px 32px rgba(0,0,0,0.08);
}
```

### 11.2 通用页面卡片（Page Card）

每个页面外层统一容器：

```swift
struct MPPageCard<Content: View>: View {
    let title: String
    let badge: String?
    @ViewBuilder var content: Content

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack(spacing: 10) {
                Text(title)
                    .font(.system(size: 15, weight: .semibold))
                    .frame(maxWidth: .infinity, alignment: .leading)
                if let badge {
                    Text(badge)
                        .font(.system(size: 11, weight: .semibold))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(AppColors.accentSoft, in: Capsule())
                        .foregroundStyle(AppColors.accent)
                }
            }
            .padding(16, 20)
            .overlay(alignment: .bottom) {
                Divider().background(AppColors.separatorLine)
            }

            // Content
            content
                .background(AppColors.pageBackground)
                .frame(minHeight: 360)
        }
        .background(AppColors.pageBackground)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(AppColors.separatorLine, lineWidth: 0.5)
        }
        .shadow(color: .black.opacity(0.06), radius: 16, y: 4)
    }
}
```

**规范要点**：
- 背景：`#FFFFFF`
- 圆角：`14px`（连续曲线 `continuous`）
- 边框：`0.5px` `rgba(0,0,0,0.08)`
- 阴影：`0 4px 16px rgba(0,0,0,0.06)`
- 悬停：`translateY(-2px)` + `shadow-lg`

### 11.3 页面 Header

```css
.page-header {
  padding: 16px 20px;
  border-bottom: 0.5px solid var(--bdr);
  display: flex;
  align-items: center;
  gap: 10px;
}
.page-header h2 { font-size: 15px; font-weight: 600; flex: 1; }
```

| 元素 | 规范 |
|------|------|
| 内边距 | `16px 20px` |
| 标题 | 15px / Semibold |
| Badge | 11px / Semibold，圆角 100px（胶囊） |
| 分割线 | `0.5px` `var(--bdr)` 底部 |

### 11.4 设置主页（Settings Home）

**结构**：分组 Section + 行列表（iOS Inset Grouped 风）

```css
.settings-section { margin-bottom: 16px; }
.settings-section-title {
  font-size: 12px; font-weight: 600;
  color: var(--tx2);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 8px 20px 4px;
}
.settings-row {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 20px;
  cursor: pointer; transition: background 0.15s;
}
.settings-row:hover { background: var(--bg2); }
```

| 元素 | 规范 |
|------|------|
| Section 标题 | 12px / Semibold / 大写 / `0.5px` letter-spacing |
| 行内边距 | `10px 20px` |
| 行 hover 背景 | `#F5F5F7` |
| 行高 | 28px（icon）+ 12px gap + 文字 |
| 状态文字 | 13px / `var(--tx2)` |
| Chevron | 12px / `var(--tx3)` |

**彩色图标块**：
- 28×28px，圆角 8px
- 5 种语义色：`blue / green / orange / red / gray`
- 背景用 `--*-soft`（10% 透明色），图标用主色

```swift
// iOS 化实现
enum MPNavIconColor { case blue, green, orange, red, gray }

var bg: Color {
    switch self {
    case .blue: return Color.blue.opacity(0.1)
    case .green: return Color.green.opacity(0.1)
    case .orange: return Color.orange.opacity(0.1)
    case .red: return Color.red.opacity(0.1)
    case .gray: return Color.gray.opacity(0.1)
    }
}
```

### 11.5 网络设置（Network Settings）

**结构**：连接状态卡 + 地址行 + 开关行

```css
.network-card { padding: 16px 20px; border-bottom: 0.5px solid var(--bdr); }
.connection-status { display: flex; align-items: center; gap: 12px; }
.status-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--success); }
.status-dot.offline { background: var(--danger); }
```

| 元素 | 规范 |
|------|------|
| 状态圆点 | 10px 直径 |
| 在线色 | `#34C759` |
| 离线色 | `#FF3B30` |
| 状态标题 | 15px / Semibold |
| 状态副标题 | 12px / `var(--tx2)` |
| 地址标签 | 13px / Medium |
| 地址 URL | 12px / `var(--tx2)` |

**Toggle 开关**：

```css
.toggle-switch {
  width: 44px; height: 26px;
  border-radius: 13px;
  background: var(--ink-200);
  position: relative;
  transition: background 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.toggle-switch.on { background: var(--success); }
.toggle-switch::after {
  content: '';
  width: 22px; height: 22px;
  border-radius: 50%;
  background: white;
  top: 2px; left: 2px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.toggle-switch.on::after { transform: translateX(18px); }
```

```swift
Toggle("", isOn: $isOn)
    .toggleStyle(.switch)
    .tint(.green)  // 用绿色而非蓝色表示"已启用"
```

> 建议：网络/连接类开关用 `green` tint，其他功能开关用 `accent`

### 11.6 Agents 管理

```css
.agent-row { display: flex; align-items: center; gap: 12px; padding: 10px 20px; }
.agent-avatar {
  width: 36px; height: 36px; border-radius: 50%;
  background: linear-gradient(135deg, #007AFF, #5856D6);
  color: white; font-size: 14px; font-weight: 600;
}
```

| 元素 | 规范 |
|------|------|
| 头像 | 36×36px，渐变 `#007AFF → #5856D6` |
| 名称 | 14px / Medium |
| 副标题 | 12px / `var(--tx2)` |
| 状态徽章 | 11px / 圆角 100px / 绿底绿字 |
| 行内边距 | `10px 20px` |

### 11.7 按钮系统

```css
.btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 14px;
  border-radius: var(--radius-md);
  font-size: 13px; font-weight: 500;
  border: none; cursor: pointer;
  transition: all 0.15s;
}
.btn-primary { background: var(--accent); color: white; }
.btn-secondary { background: var(--bg2); color: var(--tx); }
.btn-danger { background: var(--danger-soft); color: var(--danger); }
```

| 类型 | 背景 | 文字 | 圆角 |
|------|------|------|------|
| Primary | `#007AFF` | `#FFFFFF` | 10px |
| Secondary | `#F5F5F7` | `#000000` | 10px |
| Danger | `#FF3B301A` | `#FF3B30` | 10px |
| Ghost | 透明 | `#007AFF` | 10px |

**统一规范**：
- 高度：32px
- 内边距：`6px 14px`
- 字号：13px / Medium
- 圆角：10px
- 间距：6px（图标与文字）

### 11.8 Agent 详情页

- 顶部：返回箭头 + 标题 + 右上角编辑按钮
- 内容：头像 + 名称 + 描述 + 配置项（模型/工作区/温度）
- 底部：操作按钮（保存/删除）

```css
.back-row { display: flex; align-items: center; gap: 8px; padding: 10px 20px; }
.back-row .back-btn { width: 28px; height: 28px; border-radius: 8px; }
```

### 11.9 定时任务页

**结构**：分类筛选条 + 任务列表 + 状态徽章

| 元素 | 规范 |
|------|------|
| 任务卡 | 内边距 `14px 20px`，底部分割线 |
| 时间 | 12px / `var(--tx2)` |
| 任务名 | 14px / Medium |
| 状态徽章 | running / success / failed / pending |

### 11.10 运行统计页

**结构**：Hero 数字 + 趋势图表 + 详细列表

```css
.stat-card {
  padding: 16px 20px;
  background: var(--bg);
  border-radius: var(--radius-md);
}
.stat-value { font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }
.stat-label { font-size: 12px; color: var(--tx2); }
```

| 元素 | 规范 |
|------|------|
| 大数字 | 28px / Bold / `letter-spacing: -0.5px` |
| 标签 | 12px / `var(--tx2)` |
| 趋势色 | up=`#34C759` / down=`#FF3B30` |

### 11.11 诊断中心页

- 日志列表，每条 12px 字体
- 级别标签：info / warn / error（不同语义色）
- 时间戳右对齐，13px / `var(--tx2)`

### 11.12 IM 通信渠道页

- 渠道卡片：图标 + 名称 + 状态 + 配置按钮
- 支持渠道：飞书、企业微信、钉钉、Telegram、Slack、Discord
- 已连接徽章：绿色 / 未配置：灰色

### 11.13 Agent 文件页

- 文件树 + 选中文件预览
- 文件名：13px / Medium
- 路径：12px / `var(--tx2)`
- 同步按钮：右上角 ghost button

### 11.14 新建任务 Sheet

- 从底部弹起，圆角 16px
- 遮罩：`rgba(0,0,0,0.3)`
- 表单：标签 + 输入框
- 输入框：`#F5F5F7` 背景，圆角 10px

```css
.sheet {
  background: var(--bg);
  border-radius: 16px 16px 0 0;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
}
```

### 11.15 高级设置页

- 分组列表 + 危险区域（红色）
- Toggle 开关（参考 11.5）
- 重置按钮：danger 样式

### 11.16 空状态页

- 居中插画（图标 64px）
- 标题：17px / Semibold
- 描述：13px / `var(--tx2)`，最大宽度 280px 居中
- 主操作按钮：Primary 样式

```swift
VStack(spacing: 16) {
    Image(systemName: "mp.empty")
        .font(.system(size: 64))
        .foregroundStyle(.tertiary)
    Text("暂无数据")
        .font(.system(size: 17, weight: .semibold))
    Text("添加你的第一个项目开始使用")
        .font(.system(size: 13))
        .foregroundStyle(.secondary)
        .multilineTextAlignment(.center)
    Button("创建") { ... }
        .buttonStyle(.borderedProminent)
}
.frame(maxWidth: .infinity, minHeight: 360)
```

---

## 12. 与 V10 HTML 的已知差异

| 项目 | V10 HTML | 当前 SwiftUI | 建议 |
|------|----------|-------------|------|
| 正文字号 | 13px | 15px | 统一为 13px 更贴近 iMessage |
| 侧边栏选中色 | `#007AFF` 系统蓝 | `#F6AD02` 麦穗金 | 改为系统蓝 |
| ChatView Divider | 无 | 有 | 删除 Divider |
| 输入栏布局 | 单行 HStack | 卡片式 VStack（大文本区+底部工具栏） | 已实现，更新规范 |
| 输入栏按钮背景 | `#F5F5F7` 圆形 | 32×32 Circle elevatedSurface | 已统一 |
| 消息气泡边框 | 无边框 | AI 气泡无边框 | 已移除 |
| 消息气泡宽度 | 70% | 用户 420px / AI 520px | 已限制 |
| 消息水平边距 | 无 | 16px | 已添加 |
| 设置 Section 标题 | 大写 12px | 13px 普通 | 保持大写小字号风格 |
| Toggle 颜色 | `green` 强调 | 系统蓝 | 保留语义化（连接类用绿） |

---

## 13. 跨页面一致性 Checklist

- [ ] 所有页面使用相同的 5 种语义色（blue/green/orange/red/gray）
- [ ] 所有页面 Header 都是 `16px 20px` 内边距，15px Semibold 标题
- [ ] 所有卡片圆角统一 `14px continuous`
- [ ] 所有行列表 hover 背景 `#F5F5F7`
- [ ] 所有按钮高度 32px，圆角 10px
- [ ] 所有状态徽章用 11px 胶囊
- [ ] 所有弹窗圆角 16px，遮罩 `rgba(0,0,0,0.3)`
- [ ] 所有图标用 SF Symbols `mp.*` 命名空间

---

*文档版本: V10 · 含其他页面扩展*  
*生成日期: 2026-06-13*  
*适用平台: macOS SwiftUI · iOS iPadOS*  
*配套文件：`mypilot-ui-showcase-v10.html`、`mypilot-ui-showcase-pages-v10.html`*  
