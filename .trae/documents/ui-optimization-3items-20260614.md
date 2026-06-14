# UI 优化计划 — 3 项修复

## 问题分析

### 1. BouncingDots 动画不流畅，太机械

**根因**：当前实现用 `Timer` + `activeIndex` 逐个切换，每个点只有"上/下"两态，切换时硬跳，没有水波流动感。

**当前代码**（ChatMessageSection.swift:355-382）：
- `Timer.scheduledTimer` 每 0.35s 切换 `activeIndex`
- 每个点只在 `activeIndex == index` 时偏移 -4px
- 动画 `easeInOut(duration: 0.21)` 只在 offset 变化时触发
- 结果：一个点跳完 → 下一个点跳，像开关一样机械

**修复方案**：改用 `TimelineView` + 连续相位动画，三个点共享同一个时间轴但有相位偏移，产生水波涟漪效果：
- 每个点的 Y 偏移 = `sin(phase + index * 2π/3)` 的平滑曲线
- 使用 `TimelineView(.animation)` 驱动连续更新
- 弹跳高度和节奏更自然（正弦波而非硬切换）

### 2. 流式光标不跟随最新内容，卡在第二/三行

**根因**：流式内容使用 `Text(verbatim: wsService.streamingContent)` + `TypingCursor()` 的 HStack 布局。当内容换行后，SwiftUI 的 `Text` 会自动换行，但 `TypingCursor` 作为 HStack 的第二个元素，始终紧跟在 Text 的最后一个字符后面——这在视觉上是对的，但问题在于 `.lineLimit(8)` 限制了行数，且 `scrollTo("streaming-content", anchor: .bottom)` 滚动到的是整个流式行的底部而非光标位置。

更关键的是：**`Text(verbatim:)` 不支持 Markdown 渲染**，当内容包含换行符时，SwiftUI Text 的布局可能不会正确换行，导致光标位置计算错误。

**修复方案**：
- 移除 `.lineLimit(8)`，让流式内容自然展开
- 确保滚动跟随光标位置而非气泡底部

### 3. 流式输出卡住后整段突然出现

**根因**：`ChatStreamHandler.scheduleFlush()` 使用 30ms 延迟的 Timer，但 `guard flushTimer == nil` 导致在 Timer 触发前，新 delta 到达时不会重新调度——这是正确行为（合并多个 delta 到一次 flush）。但问题在于：

1. **`@Observable` 的批量更新**：`streamingContent` 是 `@Observable` 属性，SwiftUI 不会对每次 `+=` 都触发视图更新，而是合并到下一个渲染帧。当 delta 到达速度很快时，SwiftUI 可能跳过中间状态。

2. **`List` 的动画冲突**：`.animation(.spring(...), value: wsService.messages.count)` 会对 List 内所有变更应用弹簧动画，包括 `streamingContent` 的变化，导致 SwiftUI 延迟渲染以计算动画。

3. **`onChange(of: wsService.streamingContent)` 滚动**：每次 streamingContent 变化都触发 `proxy.scrollTo`，高频调用可能导致滚动和渲染争抢主线程。

**修复方案**：
- 移除 List 上的全局 `.animation` 修饰符对流式内容的影响
- 将流式内容的 `onChange` 滚动改为节流（throttle），避免高频 scrollTo 争抢
- 考虑将流式内容从 List 中独立出来，避免 List 的 diff 开销

---

## 修改文件清单

### 文件 1: ChatMessageSection.swift — BouncingDots 重写

**改动**：将 Timer + activeIndex 方案替换为 TimelineView + 正弦波相位动画

```swift
struct BouncingDots: View {
    private let dotCount = 3
    private let dotSize: CGFloat = 6
    private let spacing: CGFloat = 4
    private let bounceHeight: CGFloat = 4
    private let cycleDuration: Double = 1.2 // 一个完整波浪周期

    var body: some View {
        TimelineView(.animation) { timeline in
            let elapsed = timeline.date.timeIntervalSinceReferenceDate
            let phase = elapsed / cycleDuration * .pi * 2

            HStack(spacing: spacing) {
                ForEach(0..<dotCount, id: \.self) { index in
                    let offset = phase + Double(index) * (.pi * 2 / Double(dotCount))
                    let bounce = sin(offset) > 0 ? sin(offset) * bounceHeight : 0
                    Circle()
                        .fill(AppColors.ink400)
                        .frame(width: dotSize, height: dotSize)
                        .offset(y: -bounce)
                }
            }
        }
        .frame(height: dotSize + bounceHeight)
    }
}
```

### 文件 2: ChatMessageSection.swift — 流式光标跟随

**改动**：
- 移除 `.lineLimit(8)` 限制
- 流式内容区域确保自然展开

### 文件 3: ChatMessageSection.swift — 流式输出卡顿修复

**改动**：
- 将 List 上的 `.animation(.spring(...), value: wsService.messages.count)` 缩小作用范围，仅应用于 messages.count 变化时的消息插入/删除动画，不影响流式内容更新
- 将 `onChange(of: wsService.streamingContent)` 的滚动改为节流（每 100ms 最多一次 scrollTo）

---

## 验证步骤

1. 发送消息触发 AI 回复，观察 BouncingDots 是否呈现水波涟漪效果
2. 流式输出多行内容时，光标是否始终跟随在最后一行末尾
3. 长文本流式输出时，内容是否平滑更新，不会卡住后整段出现
