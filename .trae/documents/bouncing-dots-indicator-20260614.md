# 优化「正在思考」指示器为三点跳动动画

## 当前状态

文件 `Features/Chat/ChatMessageSection.swift` L74-88：

```swift
if wsService.isProcessing && !wsService.isStreaming {
    HStack(spacing: 8) {
        ProgressView().scaleEffect(0.7)
        Text(wsService.processingStatusText ?? "正在输入...")
            .font(AppTypography.caption).foregroundStyle(AppColors.ink400)
    }
    .padding(.horizontal, 12)
    .padding(.vertical, 8)
    .background(AppColors.aiBubbleBg)
    .cornerRadius(18, corners: [.topRight, .bottomLeft, .bottomRight])
    .cornerRadius(4, corners: [.topLeft])
}
```

当前用 `ProgressView()` 旋转圈 + 文字"正在输入..."，体验平淡。

## 修改方案

### 新建 `BouncingDots` 组件

在 `ChatMessageSection.swift` 文件底部（TypingCursor 旁边）添加：

```swift
struct BouncingDots: View {
    @State private var activeIndex: Int = -1
    private let dotCount = 3
    private let dotSize: CGFloat = 6
    private let spacing: CGFloat = 4
    private let bounceHeight: CGFloat = 4
    private let animationDuration: Double = 0.4

    var body: some View {
        HStack(spacing: spacing) {
            ForEach(0..<dotCount, id: \.self) { index in
                Circle()
                    .fill(AppColors.ink400)
                    .frame(width: dotSize, height: dotSize)
                    .offset(y: activeIndex == index ? -bounceHeight : 0)
            }
        }
        .onAppear {
            // 依次跳动，循环播放
            withAnimation(
                .easeInOut(duration: animationDuration)
                .repeatForever(autoreverses: true)
            ) {
                startBouncing()
            }
        }
    }

    private func startBouncing() {
        // 每隔 animationDuration 秒切换到下一个点
        Timer.scheduledTimer(withTimeInterval: animationDuration, repeats: true) { _ in
            DispatchQueue.main.async {
                withAnimation(.easeInOut(duration: animationDuration * 0.6)) {
                    activeIndex = (activeIndex + 1) % dotCount
                }
            }
        }
    }
}
```

### 替换 ChatMessageSection 中的指示器

```swift
// 修改前:
HStack(spacing: 8) {
    ProgressView().scaleEffect(0.7)
    Text(wsService.processingStatusText ?? "正在输入...")
        .font(AppTypography.caption).foregroundStyle(AppColors.ink400)
}

// 修改后:
HStack(spacing: 8) {
    BouncingDots()
    if let status = wsService.processingStatusText {
        Text(status)
            .font(AppTypography.caption)
            .foregroundStyle(AppColors.ink400)
    }
}
```

变化：
1. `ProgressView()` → `BouncingDots()`（三点跳动动画）
2. 默认文字"正在输入..."移除（三点本身就表示正在处理）
3. 有 `processingStatusText` 时仍显示具体状态文字（如命令名）

## 修改文件

| 文件 | 修改 |
|------|------|
| `Features/Chat/ChatMessageSection.swift` | 1. 替换 ProgressView+文字 为 BouncingDots+条件文字 2. 新增 BouncingDots struct |

## 验证

1. 发送消息后，AI 气泡区域显示三个圆点依次跳动
2. 有 processingStatusText 时，圆点右侧显示具体状态文字
3. 流式输出开始后，跳动指示器消失，显示流式内容
