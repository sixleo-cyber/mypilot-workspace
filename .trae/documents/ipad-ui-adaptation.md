# iPad + iPhone UI 适配优化计划

> 目标：让 MyPilot 在 iPad 和 iPhone 上获得原生 App 级别的视觉体验  
> 设计规范：V10 iMessage 风格  
> 设备范围：iPad（768pt+）+ iPhone（320pt~430pt）  
> 修复范围：全部 22 个已识别问题

---

## 当前状态分析

项目已完成 macOS 端 UI，iOS 端基础代码可编译运行但布局未适配。核心问题分为三类：

1. **硬编码尺寸溢出** — 多处 `frame(width: 500, height: 450)` / `maxWidth: 520` / `minWidth: 600` 在 iPhone 上超出屏幕
2. **iOS 功能缺失** — IMETextView 无 placeholder / 无 maxHeight / 无法换行；StreamingContentText 无 Markdown 渲染
3. **平台适配不完整** — popover 硬编码尺寸在 iOS 变 sheet 后布局异常；缺少权限请求；角标未清除

---

## 实施步骤

### 第 1 步：创建屏幕适配工具

**文件**：`MyPilot/Core/DesignSystem/AdaptiveLayout.swift`（新建）

**目的**：提供统一的屏幕适配查询，避免各处分散使用 `UIDevice` / `GeometryReader`

**内容**：
```swift
import SwiftUI

enum AdaptiveLayout {
    static var isIPad: Bool {
        #if os(iOS)
        UIDevice.current.userInterfaceIdiom == .pad
        #else
        false
        #endif
    }
    
    static var isIPhone: Bool {
        #if os(iOS)
        UIDevice.current.userInterfaceIdiom == .phone
        #else
        false
        #endif
    }
    
    static var screenWidth: CGFloat {
        #if os(iOS)
        UIScreen.main.bounds.width
        #else
        NSScreen.main?.frame.width ?? 800
        #endif
    }
    
    static var screenHeight: CGFloat {
        #if os(iOS)
        UIScreen.main.bounds.height
        #else
        NSScreen.main?.frame.height ?? 600
        #endif
    }
    
    static func bubbleMaxWidth(forUser isUser: Bool) -> CGFloat {
        #if os(iOS)
        return min(isUser ? 420 : 520, screenWidth * 0.75)
        #else
        return isUser ? 420 : 520
        #endif
    }
    
    static func popoverSize(fallback: CGSize) -> CGSize {
        #if os(iOS)
        let maxW = screenWidth - 32
        let maxH = screenHeight * 0.6
        return CGSize(
            width: min(fallback.width, maxW),
            height: min(fallback.height, maxH)
        )
        #else
        return fallback
        #endif
    }
    
    static var sheetMaxWidth: CGFloat {
        #if os(iOS)
        return isIPad ? 500 : screenWidth
        #else
        return 500
        #endif
    }
}
```

---

### 第 2 步：修复 AddInstanceView 硬编码尺寸（严重 #1）

**文件**：`MyPilot/Views/AddInstanceView.swift`

**问题**：`.frame(width: 500, height: 450)` 在 iPhone 上超出屏幕；QR Scanner sheet `.frame(width: 360, height: 440)` 在 iPhone SE 上溢出

**修改**：
- L42: `.frame(width: 500, height: 450)` → 使用条件编译：
  ```swift
  #if os(macOS)
  .frame(width: 500, height: 450)
  #else
  .frame(maxWidth: min(500, AdaptiveLayout.screenWidth - 32), maxHeight: min(450, AdaptiveLayout.screenHeight - 100))
  #endif
  ```
- L284: QR Scanner sheet 的 `.frame(width: 360, height: 440)` → iOS 上使用 `.presentationDetents([.medium])` 并去掉硬编码 frame

---

### 第 3 步：修复消息气泡 maxWidth（严重 #2）

**文件**：`MyPilot/Features/Chat/MessageBubbleView.swift`、`MyPilot/Features/Chat/ChatMessageSection.swift`

**问题**：
- MessageBubbleView L102: 用户气泡 `.frame(maxWidth: 420)` 在 iPhone 上占满宽度
- MessageBubbleView L149: AI 气泡 `.frame(maxWidth: 520)` 在 iPhone 上占满宽度
- ChatMessageSection L125: 流式输出 `.frame(maxWidth: 520)` 同上

**修改**：
- 所有 `.frame(maxWidth: 420, ...)` → `.frame(maxWidth: AdaptiveLayout.bubbleMaxWidth(forUser: true), ...)`
- 所有 `.frame(maxWidth: 520, ...)` → `.frame(maxWidth: AdaptiveLayout.bubbleMaxWidth(forUser: false), ...)`

涉及 3 处修改：
1. `MessageBubbleView.swift` L102
2. `MessageBubbleView.swift` L149
3. `ChatMessageSection.swift` L125

---

### 第 4 步：修复 IMETextView iOS 缺陷（严重 #3）

**文件**：`MyPilot/Views/IMETextView.swift`

**问题**：iOS 版本缺少 placeholder、maxHeight 不生效、无法换行

**修改**：

4a. 添加 placeholder 支持：
```swift
func makeUIView(context: Context) -> UITextView {
    let textView = UITextView()
    // ... 现有设置 ...
    textView.text = text
    textView.textColor = text.isEmpty ? UIColor.placeholderText : UIColor.label
    // 添加 placeholder label
    let placeholderLabel = UILabel()
    placeholderLabel.text = placeholder
    placeholderLabel.textColor = UIColor.placeholderText
    placeholderLabel.font = UIFont.systemFont(ofSize: fontSize)
    placeholderLabel.isHidden = !text.isEmpty
    placeholderLabel.tag = 999
    textView.addSubview(placeholderLabel)
    placeholderLabel.translatesAutoresizingMaskIntoConstraints = false
    NSLayoutConstraint.activate([
        placeholderLabel.topAnchor.constraint(equalTo: textView.topAnchor, constant: 8),
        placeholderLabel.leadingAnchor.constraint(equalTo: textView.leadingAnchor, constant: 9),
        placeholderLabel.trailingAnchor.constraint(equalTo: textView.trailingAnchor, constant: -9)
    ])
    return textView
}
```

4b. 在 `textViewDidChange` 中更新 placeholder 可见性：
```swift
func textViewDidChange(_ textView: UITextView) {
    text.wrappedValue = textView.text ?? ""
    if let placeholderLabel = textView.viewWithTag(999) as? UILabel {
        placeholderLabel.isHidden = !textView.text.isEmpty
    }
    // 限制最大高度
    let maxSize = CGSize(width: textView.frame.width, height: .greatestFiniteMagnitude)
    let fittingSize = textView.sizeThatFits(maxSize)
    if fittingSize.height > maxHeight {
        textView.isScrollEnabled = true
    } else {
        textView.isScrollEnabled = false
    }
}
```

4c. 修改换行逻辑 — 在 iOS 上 Shift+Return 换行（iPad 外接键盘），普通 Return 发送：
```swift
func textView(_ textView: UITextView, shouldChangeTextIn range: NSRange, replacementText text: String) -> Bool {
    if text == "\n" {
        #if os(iOS)
        let isShiftPressed = UIApplication.shared.windows.first?.windowScene?.keyboardModifierKeys.contains(.shift) ?? false
        if isShiftPressed {
            return true
        }
        #endif
        onSend?()
        return false
    }
    return true
}
```

注意：iOS 上检测 Shift 键需要通过 `UIPressesEvent`，上面的 `keyboardModifierKeys` 不可用。改为更简单的方案——在 toolbar 上加换行按钮，Return 始终发送。

---

### 第 5 步：修复 StreamingContentText iOS Markdown 渲染（严重 #4）

**文件**：`MyPilot/Features/Chat/ChatMessageSection.swift`

**问题**：iOS 版 `StreamingContentText` 只设置 `uiView.text = rawContent`，没有 Markdown 渲染

**修改**：
```swift
struct StreamingContentText: UIViewRepresentable {
    let rawContent: String
    
    func makeUIView(context: Context) -> UITextView {
        let textView = UITextView()
        textView.isEditable = false
        textView.isScrollEnabled = false
        textView.backgroundColor = .clear
        textView.textContainerInset = UIEdgeInsets(top: 0, left: 0, bottom: 0, right: 0)
        return textView
    }
    
    func updateUIView(_ uiView: UITextView, context: Context) {
        if let attributed = try? AttributedString(markdown: rawContent, options: .init(interpretedSyntax: .inlineOnlyPreservingWhitespace)) {
            uiView.attributedText = NSAttributedString(attributed)
        } else {
            uiView.text = rawContent
        }
    }
}
```

---

### 第 6 步：修复 ImagePreviewView 硬编码最小尺寸（严重 #5）

**文件**：`MyPilot/Features/Chat/MessageBubbleView.swift`

**问题**：L885 `.frame(minWidth: 600, minHeight: 450)` 在 iPhone 上溢出

**修改**：
```swift
.frame(
    minWidth: AdaptiveLayout.isIPhone ? 0 : 600,
    minHeight: AdaptiveLayout.isIPhone ? 0 : 450
)
```

并在 iOS 上使用 `.presentationDetents([.large])` 替代固定尺寸。

---

### 第 7 步：修复 Popover 硬编码尺寸（中等 #6）

**文件**：`MyPilot/Views/InputBarView.swift`、`MyPilot/Features/Chat/ChatHeaderSection.swift`

**问题**：10 个 `.popover()` 调用都有硬编码 frame，在 iOS 上变成全屏 sheet 后布局异常

**修改策略**：所有 popover 内容的 `.frame(width: W, height: H)` 改为使用 `AdaptiveLayout.popoverSize`：

涉及文件和行号：

| 文件 | 行号 | 当前值 | 修改方式 |
|------|------|--------|----------|
| InputBarView.swift | L113 | 280×320 | `.frame(width: AdaptiveLayout.popoverSize(fallback: CGSize(width: 280, height: 320)).width, height: AdaptiveLayout.popoverSize(fallback: CGSize(width: 280, height: 320)).height)` |
| InputBarView.swift | L139 | 260×280 | 同上模式 |
| InputBarView.swift | L195 | 240×300 | 同上 |
| InputBarView.swift | L280 | 210×200 | 同上 |
| InputBarView.swift | L324 | 260×280 | 同上 |
| ChatHeaderSection.swift | L92 | 280×350 | 同上 |
| ChatHeaderSection.swift | L432 | width: 240 | 同上 |

优化写法：在 `AdaptiveLayout` 中增加 `static func popoverFrame(_ fallback: CGSize) -> some View` 修饰符，避免重复代码。

---

### 第 8 步：添加 iOS 粘贴图片支持（中等 #7）

**文件**：`MyPilot/Views/ChatView.swift`

**问题**：L81-85 仅 macOS 有 `.onPasteCommand`，iOS 上无法粘贴图片

**修改**：在 iOS 上使用 `UIPasteboard.general.image` 检测：

```swift
#if os(iOS)
.onReceive(NotificationCenter.default.publisher(for: UIResponder.keyboardDidShowNotification)) { _ in
    // 不做操作，仅占位用于后续扩展
}
.simultaneousGesture(
    LongPressGesture(minimumDuration: 0.2).onEnded { _ in
        if let image = UIPasteboard.general.image {
            viewModel.handlePastedImage(image)
        }
    }
)
#endif
```

注意：更好的方案是在 InputBarView 中添加粘贴按钮。

---

### 第 9 步：添加 iOS 相册保存权限请求（中等 #8）

**文件**：`MyPilot/Features/Chat/MessageBubbleView.swift`、`Info.plist`

**问题**：L495 / L923 使用 `UIImageWriteToSavedPhotosAlbum` 但未请求 `NSPhotoLibraryAddUsageDescription` 权限

**修改**：
1. Info.plist 中添加 `NSPhotoLibraryAddUsageDescription`：`MyPilot 需要访问相册以保存图片`
2. 在保存前检查授权：
```swift
#if os(iOS)
private func saveImageToPhotos(_ image: UIImage) {
    PHPhotoLibrary.requestAuthorization(for: .addOnly) { status in
        guard status == .authorized || status == .limited else { return }
        DispatchQueue.main.async {
            UIImageWriteToSavedPhotosAlbum(image, nil, nil, nil)
        }
    }
}
#endif
```

---

### 第 10 步：修复 ChatHeader 按钮 iPhone 溢出（中等 #9）

**文件**：`MyPilot/Features/Chat/ChatHeaderSection.swift`

**问题**：iOS 上 header 右侧有 4 个按钮（新建、搜索、设置、导出）+ 左侧信息，在 iPhone 窄屏上挤在一起

**修改**：
- 在 iPhone 上将新建、搜索、设置按钮收进一个 `Menu` 下拉菜单中
- 或改为在 header 下方添加一行工具栏

```swift
#if os(iOS)
if AdaptiveLayout.isIPhone {
    Menu {
        Button(action: createNewChat) { Label("新建对话", systemImage: "plus.circle") }
        Button(action: searchMessages) { Label("搜索", systemImage: "magnifyingglass") }
        Button(action: openSettings) { Label("设置", systemImage: "gearshape") }
    } label: {
        Image(systemName: "ellipsis.circle")
            .frame(width: 30, height: 30)
    }
} else {
    // 现有的独立按钮
}
#endif
```

---

### 第 11 步：添加 iOS 角标清除（中等 #10）

**文件**：`MyPilot/Views/ChatView.swift`

**问题**：L124-126 仅 macOS 清角标 `NSApp.dockTile.badgeLabel = ""`，iOS 缺失

**修改**：
```swift
#if os(iOS)
UNUserNotificationCenter.current().setBadgeCount(0)
#endif
```

---

### 第 12 步：修复 BottomDetectorView iOS scrollView 查找逻辑（中等 #11）

**文件**：`MyPilot/Features/Chat/ChatMessageSection.swift`

**问题**：`findEnclosingScrollView` 通过 tag + responder 链查找，多窗口场景可能出错

**修改**：改用直接从 UIView 的 superview 链查找：

```swift
private func findEnclosingScrollView(from view: UIView) -> UIScrollView? {
    var current: UIView? = view
    while let v = current {
        if let sv = v as? UIScrollView { return sv }
        current = v.superview
    }
    return nil
}
```

在 `makeUIView` 中保存 host view 引用，在 `scheduleCheck` 中传入。

---

### 第 13 步：添加 QRScanner 摄像头权限请求（中等 #12）

**文件**：`MyPilot/Features/Chat/QRScannerView.swift`

**问题**：Info.plist 已有 `NSCameraUsageDescription`，但代码中未检查/请求授权

**修改**：在 `AVCaptureSession` 配置前检查授权：

```swift
private func checkCameraAuthorization() {
    switch AVCaptureDevice.authorizationStatus(for: .video) {
    case .authorized:
        setupSession()
    case .notDetermined:
        AVCaptureDevice.requestAccess(for: .video) { granted in
            DispatchQueue.main.async {
                if granted { setupSession() }
            }
        }
    default:
        break
    }
}
```

---

### 第 14 步：修复 Message onTapGesture 与 contextMenu 冲突（中等 #13）

**文件**：`MyPilot/Features/Chat/MessageBubbleView.swift`

**问题**：iOS 上 `onTapGesture`（hover 模拟）与 `contextMenu` 可能冲突

**修改**：在 iOS 上使用 `.contextMenu` 代替 `onTapGesture` 的操作菜单，长按显示菜单，短按忽略。如果需要在 iOS 上显示操作按钮，使用滑动操作（swipe actions）代替。

---

### 第 15 步：修复 ActionButton onHover 在 iOS 无反馈（中等 #14）

**文件**：`MyPilot/Features/Chat/MessageBubbleView.swift`

**问题**：`ActionButton` 的 `onHover` 在 iOS 上无效，用户点击无视觉反馈

**修改**：
```swift
.buttonStyle(AdaptiveButtonStyle())

struct AdaptiveButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.95 : 1.0)
            .opacity(configuration.isPressed ? 0.7 : 1.0)
            .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
    }
}
```

---

### 第 16 步：修复 "iPad" 措辞（轻微 #15）

**文件**：`MyPilot/Views/AddInstanceView.swift`

**问题**：L63 "iPad 无法运行本地 Daemon" 应该改为更通用的措辞

**修改**：
```swift
"iOS 设备无法运行本地 Daemon，请输入远程 Daemon 地址"
```

---

### 第 17 步：修复 SidebarView 重命名对话框硬编码宽度（轻微 #16）

**文件**：`MyPilot/Views/SidebarView.swift`

**问题**：L99 `.frame(width: 320)` 在 iPhone SE 上溢出

**修改**：
```swift
#if os(macOS)
.frame(width: 320)
#else
.frame(maxWidth: min(320, AdaptiveLayout.screenWidth - 48))
#endif
```

---

### 第 18 步：修复 Sidebar 底部按钮区 iOS 安全区域（轻微 #17）

**文件**：`MyPilot/Views/SidebarView.swift`

**问题**：底部按钮区未处理 iOS safe area

**修改**：在底部按钮 HStack 后添加：
```swift
#if os(iOS)
.safeAreaInset(edge: .bottom) { Color.clear.frame(height: 0) }
#endif
```

---

### 第 19 步：IMETextView iOS 发送后收起键盘（轻微 #18）

**文件**：`MyPilot/Views/IMETextView.swift`

**问题**：发送消息后键盘不自动收起

**修改**：在 `onSend` 回调中添加键盘收起：
```swift
func textView(_ textView: UITextView, shouldChangeTextIn range: NSRange, replacementText text: String) -> Bool {
    if text == "\n" {
        onSend?()
        #if os(iOS)
        textView.resignFirstResponder()
        #endif
        return false
    }
    return true
}
```

---

### 第 20 步：修复消息气泡 maxWidth 在 iPhone 上无效（轻微 #19）

**问题**：已在第 3 步中通过 `AdaptiveLayout.bubbleMaxWidth` 修复

无需额外操作，标记为已完成。

---

### 第 21 步：移除 iOS 上无用的 `.help()` 修饰符（轻微 #20）

**文件**：全局搜索

**问题**：`.help()` 在 iOS 上无效果

**修改**：全局搜索 `.help(` 并用 `#if os(macOS)` 包裹。涉及文件需搜索确认。

---

### 第 22 步：移除 iOS 上无用的 `onDrop`（轻微 #21）

**文件**：搜索 `onDrop` 使用位置

**问题**：iPhone 上无拖放操作

**修改**：全局搜索 `.onDrop(` 并用 `#if os(macOS)` 包裹。

---

### 第 23 步：修复 DocumentFileCard iOS 保存不可见（轻微 #22）

**文件**：`MyPilot/Features/Chat/MessageBubbleView.swift`

**问题**：iOS 上保存文件后用户看不到反馈

**修改**：使用 `UIActivityViewController` 替代直接保存：
```swift
#if os(iOS)
let activityVC = UIActivityViewController(activityItems: [fileURL], applicationActivities: nil)
if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
   let rootVC = windowScene.windows.first?.rootViewController {
    rootVC.present(activityVC, animated: true)
}
#endif
```

---

## 实施顺序总结

按优先级分组，每组可并行实施：

| 批次 | 步骤 | 严重度 | 涉及文件 |
|------|------|--------|----------|
| 1 | 步骤 1（工具类） | 基础 | AdaptiveLayout.swift（新建） |
| 2 | 步骤 2-6 | 严重 | AddInstanceView / MessageBubbleView / ChatMessageSection / IMETextView |
| 3 | 步骤 7-15 | 中等 | InputBarView / ChatHeaderSection / ChatView / QRScannerView |
| 4 | 步骤 16-23 | 轻微 | AddInstanceView / SidebarView / 全局搜索 |

---

## 验证步骤

1. **macOS 编译验证**：
   ```bash
   cd /Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot
   xcodebuild -project MyPilot.xcodeproj -scheme MyPilot -configuration Debug -destination 'platform=macOS' -skipMacroValidation build
   ```

2. **iPadOS 编译验证**（需在 Xcode IDE 中进行，因 swift-plugin-server bug）：
   - 选择 iPad 模拟器目标
   - Build & Run

3. **视觉验证清单**：
   - [ ] iPhone SE（320pt）：AddInstanceView 不溢出
   - [ ] iPhone SE：消息气泡有合理宽度，不全占满
   - [ ] iPhone SE：ImagePreview 可正常打开
   - [ ] iPhone SE：header 按钮不溢出
   - [ ] iPad：侧边栏正常宽度
   - [ ] iPad：Popover 不变全屏 sheet
   - [ ] 所有 iOS 设备：IMETextView 有 placeholder
   - [ ] 所有 iOS 设备：StreamingContentText 渲染 Markdown
   - [ ] 所有 iOS 设备：发送后键盘收起
   - [ ] 所有 iOS 设备：保存图片请求相册权限

---

## 关键假设与决策

1. **不引入第三方库** — Markdown 渲染使用 `AttributedString(markdown:)`（iOS 15+），不引入 SwiftMarkdown 等库
2. **iOS 16+ 最低版本** — 使用 `.presentationDetents` 等 iOS 16 API
3. **Popover 在 iOS 上的行为** — 不改用 sheet 替代 popover，仅限制 popover 内容尺寸适配屏幕
4. **气泡宽度策略** — iPhone 上使用 `screenWidth * 0.75`，iPad 和 macOS 保持 420/520 固定值
5. **IMETextView 换行方案** — Return 发送 + 提供 toolbar 换行按钮，不依赖 Shift 键检测
6. **遵循项目规则** — 不修改服务器素材，不动 SOUL.md；修改范围在 `开发/mypilot-link` 对应的 App 代码
