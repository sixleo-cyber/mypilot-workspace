# 修复 iPadOS 编译错误

## 当前状态

macOS 编译通过，iPadOS 编译有 2 个错误：

### 错误 1: ChatMessageSection.swift:50 — "unable to type-check this expression in reasonable time"

**根因**：`BottomDetectorView` 的 iOS 版本初始化签名与 macOS 版本不一致：
- macOS: `BottomDetectorView(isAtBottom: Binding<Bool>, onVisibilityChange: () -> Void)`
- iOS: `BottomDetectorView(onReachBottom: () -> Void, onLeaveBottom: () -> Void)`

第 134 行调用 `BottomDetectorView(isAtBottom: $isAtBottom) { ... }` 在 iOS 上签名不匹配，导致 SwiftUI 类型推断失败，引发级联 type-check 超时。

**修复**：将 iOS 版 `BottomDetectorView` 的初始化签名改为与 macOS 版一致：
```swift
struct BottomDetectorView: UIViewRepresentable {
    @Binding var isAtBottom: Bool
    var onVisibilityChange: () -> Void
    // ...
}
```

### 错误 2: QRScannerView.swift:197 — "Extra argument 'size' in call"

**根因**：iOS SDK 中 `UIImage` 没有 `init(cgImage:size:)` 初始化器。iOS SDK 只提供：
- `UIImage(cgImage:)`
- `UIImage(cgImage:scale:orientation:)`

第 197 行 `UIImage(cgImage: cgImage, size: CGSize(width: size, height: size))` 使用了不存在的初始化器。

**修复**：改用 `UIImage(cgImage:scale:)` 并计算正确的 scale：
```swift
let scale = size / CGFloat(cgImage.width)
return UIImage(cgImage: cgImage, scale: scale, orientation: .up)
```

## 实施步骤

### Step 1: 修复 ChatMessageSection.swift 中 iOS BottomDetectorView 签名

文件: `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Chat/ChatMessageSection.swift`

将第 349-374 行的 iOS `BottomDetectorView` 从：
```swift
struct BottomDetectorView: UIViewRepresentable {
    var onReachBottom: () -> Void
    var onLeaveBottom: () -> Void
    ...
}
```
改为与 macOS 签名一致：
```swift
struct BottomDetectorView: UIViewRepresentable {
    @Binding var isAtBottom: Bool
    var onVisibilityChange: () -> Void
    ...
}
```

Coordinator 也要更新，在 scrollViewDidScroll 中根据滚动位置设置 isAtBottom 和调用 onVisibilityChange。

### Step 2: 修复 QRScannerView.swift 中 UIImage 初始化器

文件: `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Chat/QRScannerView.swift`

将第 197 行从：
```swift
return UIImage(cgImage: cgImage, size: CGSize(width: size, height: size))
```
改为：
```swift
let scale = size / CGFloat(cgImage.width)
return UIImage(cgImage: cgImage, scale: scale, orientation: .up)
```

### Step 3: 验证双平台编译

```bash
cd /Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot
xcodebuild -project MyPilot.xcodeproj -scheme MyPilot -configuration Debug -destination 'platform=macOS' -skipMacroValidation build
```

iPadOS 编译需从 Xcode IDE 执行（命令行有 swift-plugin-server bug）。
