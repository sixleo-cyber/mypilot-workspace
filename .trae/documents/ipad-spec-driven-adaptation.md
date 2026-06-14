# iPad 适配计划（基于项目设计规范）

> 基于项目内三份设计规范 + 已有代码实际状态，生成差异对照与修改方案

---

## 一、规范来源

| 规范 | 文件 | 关键内容 |
|------|------|----------|
| **V10 iMessage 设计规范**（当前主线） | `设计/MyPilot-V10-Design-Spec.md` | 色彩/字体/圆角/间距/布局/组件，适用 "macOS SwiftUI · iOS iPadOS" |
| **V4 自然调色板设计系统** | `设计/MyPilot-Design-System.md` | iPad 跨平台布局策略：iPad 气泡 65%、按钮 44px、Sidebar+Detail |
| **Mac+iPad 发布规范** | `.trae/specs/prepare-for-release-mac-ipad/spec.md` | iPad 技术要求：iPadOS 17+、软键盘避让、无菜单栏、NavigationSplitView 紧凑适配、长按代 hover |

**规范优先级**: V10（当前主线）> Mac+iPad 发布规范 > V4（补充 iPad 细节）

---

## 二、当前代码 vs 规范差异对照

### 2.1 设计 Token 偏差

| 项目 | V10 规范 | 当前代码 | 差异 |
|------|----------|----------|------|
| 消息最大宽度百分比 | **70%** | `screenWidth * 0.75`（75%） | ❌ 偏大 5% |
| 侧边栏默认宽度 | **280px** | `sidebarWidth: Double = 220` | ❌ 偏窄 60px |
| 输入框圆角 | **20px (pill shape)** | IMETextView 无显式圆角，外层容器 14px | ❌ 内部文本域缺少 pill 圆角 |
| AppRadius 缺 pill | 20px | 最大 xxl=18px | ❌ 缺 20px token |
| 消息间距 | **2px** | List 默认间距（约 8-12px） | ❌ 偏大 |
| 消息组间距 | **8px** | List 默认分组 | ❌ 需显式设置 |

### 2.2 iPad 布局/交互偏差（Mac+iPad 规范）

| 项目 | 规范要求 | 当前状态 | 差异 |
|------|----------|----------|------|
| NavigationSplitView 紧凑适配 | iPad 竖屏侧边栏折叠为滑出面板 | 使用 `.automatic`，SwiftUI 自动处理 | ✅ 基本正确 |
| iPad 无菜单栏入口 | MenuBarManager 不初始化 | `#if os(macOS)` 隔离 | ✅ 已实现 |
| 长按代 hover | iOS 用 onLongPressGesture | MessageBubbleView 已有 `#if os(iOS)` 长按 | ✅ 已实现 |
| UNUserNotificationCenter | iOS 用系统通知 API | ChatView 已用 `setBadgeCount` | ✅ 已实现 |
| 软键盘避让 | 输入栏随键盘上推 | SwiftUI 默认处理，需确认无 `ignoresSafeArea(.keyboard)` | ⚠️ 需验证 |
| 远程 Daemon Only | iPad 仅远程连接 | AddInstanceView 有条件判断 | ⚠️ 需验证默认值 |

### 2.3 V4 iPad 补充细则

| 项目 | V4 规范 | 当前代码 | 差异 |
|------|---------|----------|------|
| iPad 气泡宽度 65% | iPad 屏幕更宽，需更窄比例 | 无 iPad/iPhone 区分 | ⚠️ V10 说 70% 统一；iPad 上绝对上限 420/520 已是实际约束 |
| 按钮 44px (iOS) | Apple HIG 推荐触控高度 | 图标按钮 32px，主按钮无显式高度 | ⚠️ 图标按钮 32px 符合 V10；主按钮需确认 |
| iPad = Sidebar + Detail | NavigationSplitView | ✅ 已实现 | ✅ |

> **关于气泡宽度的决策**: V10 是当前主线规范，明确规定 70% + 绝对上限 420/520。iPad 上 `820×0.70=574px > 520px`，所以绝对上限已起约束作用，无需另设 iPad 65%。但 **0.75 → 0.70 的修正影响 iPhone 在窄屏下的气泡宽度**，必须修正。

---

## 三、修改方案

### 修改 1: 修正气泡最大宽度百分比 0.75 → 0.70

**文件**: `Core/DesignSystem/AdaptiveLayout.swift`

**原因**: V10 规范 §6.4 明确 "消息最大宽度: 70%"

**改动**:
```swift
// Before
static var bubbleMaxWidth: CGFloat {
    min(isUser ? 420 : 520, screenWidth * 0.75)
}

// After
static var bubbleMaxWidth: CGFloat {
    min(isUser ? 420 : 520, screenWidth * 0.70)
}
```

---

### 修改 2: AppRadius 新增 pill = 20

**文件**: `Core/DesignSystem/AppRadius.swift`

**原因**: V10 规范 §4 "输入框: 20px (pill shape)"

**改动**: 在 AppRadius 中新增:
```swift
static let pill: CGFloat = 20
```

---

### 修改 3: IMETextView iOS 端添加 pill 圆角

**文件**: `Views/IMETextView.swift`

**原因**: V10 规范 §4 "输入框: 20px (pill shape)"；当前 IMETextView 在 iOS 端无显式圆角

**改动**: 在 iOS 端 `makeUIView` 中为 `textView` 设置:
```swift
#if os(iOS)
textView.layer.cornerRadius = AppRadius.pill
textView.clipsToBounds = true
#endif
```

---

### 修改 4: 侧边栏默认宽度 220 → 280

**文件**: `Views/ContentView.swift`

**原因**: V10 规范 §6.2 "宽度: 280px"

**改动**:
```swift
// Before
@AppStorage("mypilot-sidebar-width") private var sidebarWidth: Double = 220

// After
@AppStorage("mypilot-sidebar-width") private var sidebarWidth: Double = 280
```

---

### 修改 5: 消息间距修正为 2px

**文件**: `Features/Chat/ChatMessageSection.swift`

**原因**: V10 规范 §5 "消息间距: 2px (消息之间紧凑)"；当前 List 默认行间距约 8-12px

**改动**: 在消息列表的 List/ForEach 中，将消息行间距显式设置为 2px:
```swift
.listRowSpacing(2)
```

> 注意: `.listRowSpacing` 是 iOS 17+ / macOS 14+ API，与 iPadOS 17.0+ 最低部署目标兼容。

---

### 修改 6: 消息组间距 8px

**文件**: `Features/Chat/ChatMessageSection.swift`

**原因**: V10 规范 §5 "消息组间距: 8px"

**改动**: 在不同发送者的消息组之间添加 8px 间距（通过 section header 或 `listRowSeparator` 控制），或在分组逻辑中添加:
```swift
// 当发送者变化时（新的消息组开始），添加额外间距
if index > 0 && messages[index].isFromUser != messages[index - 1].isFromUser {
    Color.clear.frame(height: 6) // 2px 默认 + 6px 额外 = 8px 总组间距
}
```

---

### 修改 7: 软键盘避让验证与修正

**文件**: `Views/ChatView.swift`

**原因**: Mac+iPad 规范要求 "iPad 软键盘避让"

**改动**: 检查 ChatView 是否存在 `.ignoresSafeArea(.keyboard)`，如有则移除或改为条件编译:
```swift
// 确保没有以下代码（或仅在 macOS 下使用）
// .ignoresSafeArea(.keyboard)
```

SwiftUI 默认行为会自动避让键盘，只要不手动覆盖即可。

---

### 修改 8: iPad 默认远程连接验证

**文件**: `Views/AddInstanceView.swift` 或连接逻辑

**原因**: Mac+iPad 规范要求 "iPad 端仅使用远程连接"

**改动**: 检查 AddInstanceView 中 iPad 端是否隐藏/移除了本地连接选项（QR 码扫描应仅用于扫描远程 Daemon 的二维码）。确保:
- iPad 端不显示 "本地模式" 选项
- 连接地址默认指向远程 Daemon

---

## 四、不修改的项目（已合规）

| 项目 | 说明 |
|------|------|
| 气泡圆角 18/4px | MessageBubbleView 已实现，符合 V10 §4 |
| 气泡内边距 8×14 | 已实现，符合 V10 §5 |
| 页面水平内边距 16-20px | 各 View 已实现 |
| 32px 图标按钮 | InputBarView 已实现，符合 V10 §7.3 |
| 侧边栏行圆角 10px | SidebarView 已实现，符合 V10 §4 |
| AppColors / AppTypography | 已实现，符合 V10 §2-3 |
| 长按代 hover | MessageBubbleView 已有 `#if os(iOS)` 长按 |
| UNUserNotificationCenter | ChatView 已用系统 API |
| MenuBarManager 隔离 | 已有 `#if os(macOS)` |
| NavigationSplitView | 已使用 `.automatic` 自动适配 |
| iOS 粘贴图片 | ChatView 已实现 UIPasteboard |
| iOS 文件保存 | MessageBubbleView 已实现 UIActivityViewController |
| iOS 图片保存 | MessageBubbleView 已实现 PHPhotoLibrary |
| Header 按钮适配 | iPhone Menu / iPad 独立按钮 |

---

## 五、验证步骤

1. **macOS 编译**: `xcodebuild -project MyPilot.xcodeproj -scheme MyPilot -configuration Debug -destination 'platform=macOS' -skipMacroValidation build`
2. **iPad 编译**: 需在 Xcode IDE 中构建（swift-plugin-server bug 限制命令行构建）
3. **视觉验证**: 
   - iPhone: 气泡宽度 ≈ 70% 屏幕宽
   - iPad: 气泡宽度受 420/520px 上限约束
   - 输入框 pill 圆角 20px
   - 侧边栏 280px
   - 消息间距紧凑（2px）
4. **交互验证**:
   - iPad 竖屏侧边栏自动折叠
   - 长按气泡弹出操作菜单
   - 软键盘弹出时输入栏上推
   - iPad 仅显示远程连接选项
