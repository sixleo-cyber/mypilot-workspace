# MyPilot UI 优化计划（P18 - 逐项调整）

## 概要

针对 `MyPilot-Design-Requirements.md` 中识别的 UI 痛点，本次优化按"逐项"原则：每次只动一个组件，确认效果后再进行下一个。**本次先做第 1 项：消息气泡入场动画**（用户感知最强、风险最低）。

---

## 当前状态分析（Phase 1 探索结果）

### 已有动画（基础）
- `SidebarView.swift:41-44` — 搜索面板用 `.move(edge: .top).combined(with: .opacity)` + `.easeInOut(duration: 0.2)`
- `ChatMessageSection.swift:159-181` — "新消息" 横幅用 `.move(edge: .bottom).combined(with: .opacity)` + `.easeInOut(duration: 0.3)`
- `ChatMessageSection.swift:315-318` — `TypingCursor` 用 `.easeInOut(duration: 0.5).repeatForever(autoreverses: true)` 呼吸灯
- `AgentsManagementView.swift:18` — 列表 `.transition + .animation`
- `AgentFilesView.swift:44-48` — 视图切换 `.transition + .animation`
- `SidebarView.swift:44` — `agentRefreshToken` 驱动 `sessionList.id` 重建

### 缺失动画（优化目标）
| # | 痛点 | 文件 | 修复点 |
|---|------|------|--------|
| 1 | 消息气泡无入场动画 | `ChatMessageSection.swift:45-64` | `.transition(.asymmetric(...))` + `.animation` 包裹 |
| 2 | 思考过程折叠/展开无动画 | `MessageBubbleView.swift` (ThinkingSection) | `withAnimation(.easeInOut)` 包裹展开 |
| 3 | 发送/停止按钮硬切换 | `InputBarView.swift:273-298` | 渐变 transition + 缩放 |
| 4 | 侧边栏选中无高亮动画 | `SidebarView.swift` | 选中项背景滑动 |
| 5 | Token 进度条跳变 | `ChatHeaderSection.swift` (TokenUsageBar) | `.animation(.easeInOut, value: ratio)` |
| 6 | ErrorToast 无动画 | `ChatView.swift:273-297` | slide-in transition |
| 7 | Agent 切换硬切 | `ChatView.swift:104` | 交叉淡入淡出 |
| 8 | 欢迎页步骤无入场 | `WelcomeView.swift` | 依次 fade+slide |
| 9 | 首次加载无整体淡入 | `MyPilotApp.swift` | `.opacity` 0→1 |
| 10 | 命令选择器硬显示 | `InputBarView.swift:260-270` | 淡入 + 缩放 |

---

## 改动方案

### 第 1 步（本次执行）：消息气泡入场动画

**目标**：用户发送或收到新消息时，气泡从底部滑入 + 淡入，带 spring 弹性。

**文件**：`Features/Chat/ChatMessageSection.swift`

**改动**：

1. 在 `MessageBubble` 的 `ForEach` 行添加 `.transition`：
```swift
.transition(
    .asymmetric(
        insertion: .scale(scale: 0.85, anchor: msg.isFromUser ? .bottomTrailing : .bottomLeading)
            .combined(with: .opacity)
            .combined(with: .offset(y: 12)),
        removal: .opacity
    )
)
```

2. 在 List 外层添加 `.animation`：
```swift
.animation(.spring(response: 0.35, dampingFraction: 0.78), value: wsService.messages.count)
```

3. 流式消息（`streaming-content` 行）使用平滑 append + 同一个动画。

**注意**：
- 翻页加载更多（`renderedCount` 变化）时，不应触发入场动画 — 用 `.id(renderedCount)` 或对加载更多按钮单独包一个 Group with `disabled` 动画
- 100 条/页性能已优化，新动画不会卡顿
- 用户/AI 气泡 anchor 不同：用户 `bottomTrailing`、AI `bottomLeading`，更自然

**风险**：低。`.transition` 是叠加层不影响性能；`Equatable` 已实现 (L69-71)，避免 SwiftUI 重建。

---

## 后续步骤（待本次验证后逐项推进）

| 步骤 | 内容 | 预计文件 |
|------|------|----------|
| 2 | 思考过程折叠/展开动画 | `MessageBubbleView.swift` |
| 3 | 发送/停止按钮渐变 | `InputBarView.swift:273-298` |
| 4 | 侧边栏选中高亮滑动 | `SidebarView.swift` |
| 5 | Token 进度条平滑 | `ChatHeaderSection.swift` |
| 6 | ErrorToast slide-in | `ChatView.swift:273-297` |
| 7 | Agent 切换交叉淡入 | `ChatView.swift` |
| 8 | 欢迎页步骤依次入场 | `WelcomeView.swift` |
| 9 | 首次加载淡入 | `MyPilotApp.swift` |
| 10 | 命令选择器淡入缩放 | `InputBarView.swift:260-270` |

每次只动 1 项，构建验证后确认效果，再继续下一步。

---

## 假设与决策

1. **动画曲线选择**：用 `.spring(response: 0.35, dampingFraction: 0.78)` — 既不僵硬也不拖沓，与 iMessage 风格匹配
2. **用户气泡 anchor**：`.bottomTrailing`（从右下角"发出"），AI 用 `.bottomLeading`（从左下角"出现"）
3. **保留现有性能优化**：分页 100 条/页 + `Equatable` 不变
4. **不修改设计系统文件**：本次只动视图，不引入新 token

## 验证步骤

1. `xcodebuild` 构建无错
2. 启动 App
3. 发送 3 条消息 + 等 AI 回复 2 条
4. 观察：每条新消息是否平滑滑入，无跳变，无卡顿
5. 切换 agent：旧消息是否平滑淡出（移除侧是 `.opacity`，不刺眼）
6. 加载更早消息：不应触发入场动画

---

## 假设前提

- 用户的 `/plan` 触发意味着希望"暂停执行确认"——本次计划写完后，**等用户确认再进入执行**
- "一个一个来调整 UI 设计" 说明用户希望细粒度控制节奏
