# UI 优化计划 — 2 项修复

## 问题分析

### 1. 流式输出做不到一个字一个字显示，没有打字机效果

**根因分析**：整个流式管道是：

```
Gateway → daemon(delta) → WebSocket → handleStreamFrame → parseDelta → appendToStream → scheduleFlush(16ms) → onFlush → streamingContent += → SwiftUI 渲染
```

问题出在 **`scheduleFlush` 的 `guard flushTimer == nil` 机制**：当多个 delta 快速到达时，只有第一个 delta 触发 Timer，后续 delta 全部堆积在 `accumulator` 中，等 16ms 后一次性 flush 出来。这意味着如果 Gateway 在 16ms 内发了 5 个 delta（每个 1-2 个字），用户看到的是 5 个字同时出现，而不是逐字出现。

**修复方案**：取消 Timer 延迟，改为**立即 flush**。每次 `appendToStream` 直接调用 `onFlush`，不做 16ms 延迟。SwiftUI 的 `@Observable` 机制本身会自动合并同一渲染帧内的多次属性变更，不需要我们在应用层再做合并。

这样 delta 到达后立即更新 `streamingContent`，SwiftUI 在下一个渲染帧（~16ms）自动刷新 UI，实现真正的打字机效果。

### 2. 思考过程的 BouncingDots 动画没了

**根因分析**：`TimelineView(.animation)` 在 macOS 上有已知问题——当放在 `List` 的条件分支中时，如果条件状态频繁变化（如 `isProcessing` 切换），`TimelineView` 可能不会正确启动动画，或者被 SwiftUI 的视图 diff 机制回收。

更可能的原因是：**`TimelineView(.animation)` 在 macOS 的 `List` 行中不被正确刷新**。macOS 的 `List` 基于 NSTableView，对 SwiftUI 动画视图的支持有限，`TimelineView(.animation)` 需要持续触发视图更新，但 `List` 行可能不会持续重绘。

**修复方案**：回退到 Timer 驱动方案，但优化动画曲线。使用 `CADisplayLink` 风格的 Timer（用 `Timer.publish` 替代），配合更流畅的动画参数：
- 使用 `@State` 存储每个点的独立偏移量
- 用连续的 `withAnimation` 驱动，而非离散的 `activeIndex` 切换
- 三个点有 120° 相位差，但用平滑的 `withAnimation(.easeInOut(duration:))` 过渡

具体实现：用 `Timer.publish` 每 0.4s 触发一次，每次让三个点依次弹起（带 overlap），用 `withAnimation` 确保过渡平滑。

---

## 修改文件清单

### 文件 1: ChatStreamHandler.swift
- `appendToStream` 改为立即 flush，移除 Timer 延迟
- 删除 `scheduleFlush` / `flushTimer` 相关代码

### 文件 2: ChatMessageSection.swift (BouncingDots)
- 将 `TimelineView(.animation)` 替换为 Timer + withAnimation 驱动的水波动画
- 三个点共享时间轴但有相位偏移，每次 Timer 触发时更新所有点的偏移

---

## 具体改动

### ChatStreamHandler.swift — 立即 flush

```swift
func appendToStream(_ content: String) {
    accumulator += content
    // 立即 flush，不做延迟
    // SwiftUI @Observable 会自动合并同一渲染帧内的多次变更
    performFlush()
}
```

删除 `scheduleFlush`、`flushTimer` 属性、`flushNow` 中对 Timer 的引用（保留 `flushNow` 方法本身用于 done 帧）。

### ChatMessageSection.swift — BouncingDots 重写

```swift
struct BouncingDots: View {
    @State private var phase: Int = 0
    private let dotCount = 3
    private let dotSize: CGFloat = 6
    private let spacing: CGFloat = 4
    private let bounceHeight: CGFloat = 4
    private let timer = Timer.publish(every: 0.4, on: .main, in: .common).autoconnect()

    var body: some View {
        HStack(spacing: spacing) {
            ForEach(0..<dotCount, id: \.self) { index in
                let isActive = (phase % dotCount) == index
                let isSettling = ((phase - 1 + dotCount) % dotCount) == index
                Circle()
                    .fill(AppColors.ink400)
                    .frame(width: dotSize, height: dotSize)
                    .offset(y: isActive ? -bounceHeight : (isSettling ? -bounceHeight * 0.3 : 0))
                    .animation(.easeInOut(duration: 0.25), value: phase)
            }
        }
        .frame(height: dotSize + bounceHeight)
        .onReceive(timer) { _ in
            phase += 1
        }
    }
}
```

这个方案：
- 每 0.4s phase 递增一次
- 当前点弹到最高 (-4px)
- 前一个点还在回落途中 (-1.2px)
- 其他点静止 (0)
- `withAnimation(.easeInOut)` 让过渡平滑
- 三个点有重叠的运动，产生水波流动感

---

## 验证步骤

1. 发送消息触发 AI 回复，观察流式输出是否逐字/逐词出现（打字机效果）
2. AI 处理中时，观察 BouncingDots 是否有水波流动的跳动效果
