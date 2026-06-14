# 输入栏+消息区 4 项 UI 微调计划

## 问题清单

| # | 问题 | 根因 | 修改文件 |
|---|------|------|----------|
| 1 | 消息气泡左右边距太窄，不协调 | MessageBubble HStack 无水平 padding | MessageBubbleView.swift |
| 2 | 气泡宽度无限制，长消息太宽 | 无 maxWidth 约束 | MessageBubbleView.swift |
| 3 | 输入栏按钮离框边缘太近，无悬浮感 | 工具栏 padding 不够 | InputBarView.swift |
| 4 | 输入栏底边离页面底部太近，应与侧边栏底边齐平 | InputBarView 外层 bottom padding 太小 | InputBarView.swift |

---

## Fix 1: 消息气泡左右边距加宽

**文件**: `Features/Chat/MessageBubbleView.swift`

当前 MessageBubble 的 `HStack` 无水平 padding，气泡紧贴列表边缘。

V10 规范 Section 5：页面内边距 16-20px。

```swift
// 修改前 (L74):
HStack {

// 修改后:
HStack(spacing: 0) {
```

在 MessageBubble 的 HStack 外层加 `.padding(.horizontal, 16)`：

```swift
// 在 .onHover 之前添加:
.padding(.horizontal, 16)
```

这样 AI 气泡左边距 16px，用户气泡右边距 16px，视觉更协调。

---

## Fix 2: 气泡最大宽度限制

**文件**: `Features/Chat/MessageBubbleView.swift`

V10 规范 Section 6.4：消息最大宽度 70%。

当前用户气泡和 AI 气泡都没有 maxWidth 限制。

```swift
// 用户气泡 (L81): 在 .background 之前添加
.frame(maxWidth: 420, alignment: .trailing)

// AI 气泡 (L126): 在 .background 之前添加
.frame(maxWidth: 520, alignment: .leading)
```

用固定值而非百分比（SwiftUI List 中百分比不精确），用户气泡 420px、AI 气泡 520px（AI 消息通常更长），约占聊天区 70% 左右。

---

## Fix 3: 输入栏按钮悬浮感 — 工具栏内边距加大

**文件**: `Views/InputBarView.swift`

当前 `inputToolbar` 无水平 padding，按钮紧贴卡片边缘。

```swift
// 修改前 inputToolbar:
HStack(spacing: 4) {
    HStack(spacing: 2) { ... }  // 左侧
    Spacer()
    HStack(spacing: 6) { ... }  // 右侧
}
.padding(.top, 8)

// 修改后:
HStack(spacing: 4) {
    HStack(spacing: 2) { ... }
    Spacer()
    HStack(spacing: 6) { ... }
}
.padding(.horizontal, 8)
.padding(.top, 8)
.padding(.bottom, 6)
```

加 `.padding(.horizontal, 8)` 让按钮离卡片左右边缘有间距，加 `.padding(.bottom, 6)` 让底部也有呼吸空间，产生悬浮感。

---

## Fix 4: 输入栏底边与侧边栏底边齐平

**文件**: `Views/InputBarView.swift`

当前外层 padding：`.padding(.bottom, 4)`，太贴近页面底边。

侧边栏底部按钮区用 `.padding()`（默认 16px）。输入栏底边应与侧边栏底边视觉齐平。

```swift
// 修改前:
.padding(.horizontal, 10)
.padding(.top, 6)
.padding(.bottom, 4)

// 修改后:
.padding(.horizontal, 10)
.padding(.top, 6)
.padding(.bottom, 12)
```

bottom padding 从 4 → 12，使输入栏卡片底边与侧边栏底部按钮区底边大致齐平，产生悬浮感。

---

## 修改文件清单

| 文件 | 修改内容 |
|------|----------|
| `Features/Chat/MessageBubbleView.swift` | 1. HStack 加 `.padding(.horizontal, 16)` 2. 用户气泡加 `.frame(maxWidth: 420)` 3. AI 气泡加 `.frame(maxWidth: 520)` |
| `Views/InputBarView.swift` | 1. inputToolbar 加 `.padding(.horizontal, 8)` + `.padding(.bottom, 6)` 2. 外层 `.padding(.bottom, 4)` → `.padding(.bottom, 12)` |

## 验证步骤

1. Xcode 编译通过
2. AI 气泡左边距、用户气泡右边距明显加宽（16px）
3. 长消息气泡宽度有上限，不会贴到对面边缘
4. 输入栏按钮离卡片边缘有间距，有悬浮感
5. 输入栏底边与侧边栏底边大致齐平
