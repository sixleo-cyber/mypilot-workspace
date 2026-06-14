# UI 优化计划 — 2 项修复

## 问题分析

### 1. BouncingDots 跳动太慢

**当前**：`Timer.publish(every: 0.4)` → 每 0.4s 切换一次 phase，一个完整周期 1.2s

**修复**：加快到 0.25s 间隔，完整周期 0.75s，增加弹跳高度到 5px 增强流动感

### 2. 流式输出没有打字机效果

**用户洞察**：当前实现是直接将 daemon 发来的 delta 拼接到 `streamingContent`，然后用 `Text(verbatim:)` 显示。问题：
- delta 大小不均匀（有时 1 个字，有时一整段），导致显示忽快忽慢
- `Text(verbatim:)` 显示原始 markdown（`**` 等标记可见），不是渲染后的内容
- 没有"逐字流动"的节奏感

**修复方案**：实现客户端打字机效果（Typewriter Effect）

核心思路：将流式管道分为两层：
1. **接收层**：daemon delta 到达 → 累积到 `streamingBuffer`（不直接显示）
2. **显示层**：定时器每 30ms 从 `streamingBuffer` 取出 1-2 个字符 → 追加到 `streamingDisplayContent`（实际显示的内容）

这样无论 delta 大小如何，用户看到的都是匀速逐字输出。

**具体实现**：

#### WebSocketService 新增属性
```swift
var streamingBuffer: String = ""          // 接收缓冲区（不直接显示）
var streamingDisplayContent: String = ""  // 显示内容（打字机效果输出）
private var typewriterTimer: Timer?
```

#### onFlush 回调改为写入 buffer
```swift
streamHandler.onFlush = { [weak self] content in
    self?.streamingBuffer += content  // 写入缓冲区，不直接显示
    self?.isStreaming = true
    self?.ensureTypewriterRunning()
}
```

#### 打字机定时器
```swift
func ensureTypewriterRunning() {
    guard typewriterTimer == nil else { return }
    typewriterTimer = Timer.scheduledTimer(withTimeInterval: 0.03, repeats: true) { [weak self] _ in
        guard let self = self else { return }
        guard !self.streamingBuffer.isEmpty else {
            // 缓冲区空了，停止定时器
            self.typewriterTimer?.invalidate()
            self.typewriterTimer = nil
            return
        }
        // 每次取出 1-2 个字符（CJK 字符取 1 个，ASCII 可取 2 个）
        let chars = self.streamingBuffer
        let take = chars.count >= 2 && chars.first!.asciiValue != nil ? 2 : 1
        let index = chars.index(chars.startIndex, offsetBy: min(take, chars.count))
        self.streamingDisplayContent += String(chars[..<index])
        self.streamingBuffer = String(chars[index...])
    }
}
```

#### UI 层改为显示 streamingDisplayContent
ChatMessageSection 中将 `wsService.streamingContent` 替换为 `wsService.streamingDisplayContent`

#### done 帧处理
当 done 帧到达时，将 buffer 中剩余内容全部刷入 displayContent，停止定时器：
```swift
// 在 handleDoneFrame 中
self.streamingDisplayContent += self.streamingBuffer
self.streamingBuffer = ""
self.typewriterTimer?.invalidate()
self.typewriterTimer = nil
```

#### reset 清理
```swift
streamingBuffer = ""
streamingDisplayContent = ""
typewriterTimer?.invalidate()
typewriterTimer = nil
```

---

## 修改文件清单

### 文件 1: ChatMessageSection.swift
- BouncingDots: Timer 0.4s→0.25s, bounceHeight 4→5
- 流式内容显示：`wsService.streamingContent` → `wsService.streamingDisplayContent`
- onChange 监听改为 `wsService.streamingDisplayContent`

### 文件 2: WebSocketService.swift
- 新增 `streamingBuffer`、`streamingDisplayContent`、`typewriterTimer`
- onFlush 回调改为写入 `streamingBuffer`
- 新增 `ensureTypewriterRunning()` 方法
- done 帧处理：刷空 buffer → displayContent
- reset/disconnect 清理新属性

---

## 验证步骤

1. BouncingDots 跳动更快更有流动感
2. 流式输出逐字出现，有打字机节奏感
3. AI 回复完成后，所有内容完整显示（无遗漏）
