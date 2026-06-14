# 输入栏 + 侧边栏 4 项 UI 微调

## 问题清单

| # | 问题 | 文件 | 位置 |
|---|------|------|------|
| 1 | 「速通」应改为「更多」 | InputBarView.swift | L258 `Text("速通")` |
| 2 | 发送按钮尺寸/位置与文件、更多按钮不协调 | InputBarView.swift | sendButton(30×30) vs fileButtonCompact(28×28) vs quickShortcutBtn |
| 3 | 对话框整体上移，底边线与左侧「添加实例」按钮底边齐平 | ChatView.swift / InputBarView.swift | 输入栏 padding 过大 |
| 4 | 「添加实例」按钮与「设置」按钮高度不一致 | SidebarView.swift | L49-66 |

---

## Fix 1: 「速通」→「更多」

**文件**: `Views/InputBarView.swift` L258

```swift
// 修改前:
Text("速通")

// 修改后:
Text("更多")
```

同时图标从 `bolt.fill` 改为 `ellipsis.circle`（更符合"更多"语义），help 改为"更多功能"：

```swift
Image(systemName: "ellipsis.circle")
    .font(.system(size: 14))
    .foregroundStyle(AppColors.ink400)
```

点击行为改为弹出 MoreActionsGrid（原来 moreButton 的 popover 内容）。

---

## Fix 2: 按钮尺寸统一

当前状态：
- `fileButtonCompact`: 28×28 纯图标，无背景
- `quickShortcutBtn`: HStack 图标+文字，padding 8/4
- `sendButton`: 30×30 Circle 背景

目标：底部工具栏所有交互元素视觉高度一致（~28-30px）。

**方案**：
- `fileButtonCompact`: 保持 28×28，改为带浅色圆角背景（与工具栏融合）
- `quickShortcutBtn`（改名为 `moreBtn`）: 图标+文字高度对齐到 ~26px
- `sendButton`: 保持 30×30 Circle（视觉焦点可略大）

具体调整：
```swift
// fileButtonCompact: 加回浅色背景，让视觉重量匹配
.frame(width: 28, height: 28)
.background(RoundedRectangle(cornerRadius: 6).fill(AppColors.ink100.opacity(0.5)))

// moreBtn: 减小 padding 让高度紧凑
.padding(.horizontal, 6)
.padding(.vertical, 2)
```

---

## Fix 3: 对话框上移 — 底边与「添加实例」对齐

**根因分析**：InputBarView 外层 `.padding(.vertical, 8)` 导致输入栏上下间距过大。SidebarView 底部按钮区域使用 `.padding()`（默认 16px），而输入栏额外加了 8px 上下 padding。

**文件**: `Views/InputBarView.swift` L68-69

```swift
// 修改前:
.padding(.horizontal, 10)
.padding(.vertical, 8)

// 修改后:
.padding(.horizontal, 10)
.padding(.top, 6)
.padding(.bottom, 4)
```

减少垂直 padding，使卡片底边与 sidebar 底部按钮区底边视觉对齐。同时检查 ChatView 中 ChatInputSection 的外层是否有额外 spacing 需要调整。

**文件**: `Views/ChatView.swift` — ChatInputSection 在 VStack(spacing: 0) 中，无额外 spacing，无需改动。

---

## Fix 4: 侧边栏底部按钮高度统一

**文件**: `Views/SidebarView.swift` L48-68

当前：
- **添加实例**: `.buttonStyle(.borderedProminent)` → macOS 默认 borderedProminent 高度约 24-26px（含 padding）
- **设置**: 32×32 Circle → 视觉高度 32px

两者差距约 6-8px，不协调。

**方案**：将设置按钮改为与添加实例等高的非圆形紧凑样式，或反过来让添加实例也用圆形。

参考截图中的设计意图——两个按钮应该等高。采用方案：**设置按钮改为紧凑方形/圆角矩形**，高度与 borderedProminent 一致：

```swift
// 修改前 (L57-64):
Button(action: { showSettings = true }) {
    Image(systemName: "gearshape.fill")
        .font(.system(size: 16))
        .foregroundStyle(AppColors.ink400)
        .frame(width: 32, height: 32)
        .background(Circle().fill(AppColors.elevatedSurface))
}

// 修改后:
Button(action: { showSettings = true }) {
    Image(systemName: "gearshape.fill")
        .font(.system(size: 14))
        .foregroundStyle(AppColors.ink400)
        .frame(width: 28, height: 28)
        .background(RoundedRectangle(cornerRadius: 6).fill(AppColors.elevatedSurface))
}
```

这样设置按钮从 32×32 Circle 变为 28×28 圆角矩形，与 borderedProminent 按钮的视觉高度接近（borderedProminent 默认高度 ~26-28px）。

---

## 修改文件清单

| 文件 | 修改内容 |
|------|----------|
| `Views/InputBarView.swift` | 1. "速通"→"更多"+图标改为ellipsis.circle 2. fileButtonCompact加浅背景 3. moreBtn减小padding 4. 垂直padding调整 8→上6下4 |
| `Views/SidebarView.swift` | 设置按钮 32×32 Circle → 28×28 圆角矩形 |

## 验证步骤

1. Xcode 编译通过
2. 底部工具栏显示 `[📎 | ⋯ 更多] ... [GLM-5.1 ▾ | ↑]`
3. 发送按钮、文件按钮、更多按钮视觉高度协调
4. 输入框底边与侧边栏「添加实例」按钮底边基本对齐
5. 侧边栏「添加实例」与「设置」按钮高度一致
