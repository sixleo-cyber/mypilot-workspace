# UI 优化计划 — 2 项修复

## 问题分析

### 1. BouncingDots 水流感不强，起跳时间不够紧密

**当前实现**：每 0.25s 切换一次 `phase`，只有当前点弹到最高，前一个点在回落（0.3 倍高度），第三个点完全静止。三个点之间只有 2 种状态（active/settling），没有过渡重叠，看起来像"一个跳完另一个跳"。

**问题**：缺少中间过渡态。三个点应该像水波一样，一个还没完全落下，下一个就已经开始弹起，形成连续的波浪感。

**修复方案**：给每个点分配连续的偏移值，而非离散的"跳/不跳"：
- phase 0: 点0=1.0, 点1=0.3, 点2=0.0  (点0最高，点1在回落)
- phase 1: 点0=0.3, 点1=1.0, 点2=0.0  (点1最高，点0在回落)
- phase 2: 点0=0.0, 点1=0.3, 点2=1.0  (点2最高，点1在回落)

改为三态连续偏移：
- 当前点: 1.0 (最高)
- 前一个点: 0.5 (半回落)
- 再前一个点: 0.15 (即将静止)

这样三个点始终有不同高度，形成连续波浪。同时加快间隔到 0.18s，让波浪更紧凑。

### 2. 生成内容时页面不会自动下滑

**当前实现**：`onChange(of: wsService.streamingDisplayContent)` 中有 `if isAtBottom` 守卫——只有当用户已经在底部时才自动滚动。

**问题**：`isAtBottom` 的检测可能不准确，或者用户在流式输出开始时不在底部（比如正在看历史消息），导致整个流式输出期间都不会自动滚动。

更关键的是：**打字机效果的 30ms 定时器更新 `streamingDisplayContent`，但 `onChange` 有 50ms 节流**，导致滚动频率跟不上内容更新频率。当内容增长导致气泡高度变化时，List 不会自动调整滚动位置。

**修复方案**：
- 流式输出期间，始终自动滚动到底部（移除 `isAtBottom` 守卫）
- 降低节流间隔到 30ms（匹配打字机定时器频率）
- `onChange(of: wsService.isStreaming)` 变为 true 时，强制滚动到底部并设置 `isAtBottom = true`

---

## 修改文件清单

### 文件 1: ChatMessageSection.swift — BouncingDots
- 三态连续偏移：当前=1.0, 前一个=0.5, 再前一个=0.15
- Timer 间隔 0.25s → 0.18s

### 文件 2: ChatMessageSection.swift — 自动滚动
- `onChange(streamingDisplayContent)` 移除 `isAtBottom` 守卫，始终滚动
- 节流间隔 50ms → 30ms
- `onChange(isStreaming)` 变为 true 时强制 `isAtBottom = true` + 滚动

---

## 具体改动

### BouncingDots

```swift
struct BouncingDots: View {
    @State private var phase: Int = 0
    private let dotCount = 3
    private let dotSize: CGFloat = 6
    private let spacing: CGFloat = 4
    private let bounceHeight: CGFloat = 5
    private let timer = Timer.publish(every: 0.18, on: .main, in: .common).autoconnect()

    var body: some View {
        HStack(spacing: spacing) {
            ForEach(0..<dotCount, id: \.self) { index in
                let currentPhase = phase % dotCount
                let prevPhase = (phase - 1 + dotCount) % dotCount
                let prevPrevPhase = (phase - 2 + dotCount) % dotCount

                let multiplier: CGFloat
                if index == currentPhase {
                    multiplier = 1.0
                } else if index == prevPhase {
                    multiplier = 0.5
                } else if index == prevPrevPhase {
                    multiplier = 0.15
                } else {
                    multiplier = 0
                }

                Circle()
                    .fill(AppColors.ink400)
                    .frame(width: dotSize, height: dotSize)
                    .offset(y: -bounceHeight * multiplier)
                    .animation(.easeInOut(duration: 0.15), value: phase)
            }
        }
        .frame(height: dotSize + bounceHeight)
        .onReceive(timer) { _ in
            phase += 1
        }
    }
}
```

### 自动滚动

```swift
.onChange(of: wsService.streamingDisplayContent) { _, _ in
    throttledScrollTo(proxy, id: "streaming-content")
}

.onChange(of: wsService.isStreaming) { _, newValue in
    if newValue {
        isAtBottom = true
        scrollToBottom(proxy)
    }
}
```

节流间隔改为 0.03s。
