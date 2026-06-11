# 输入栏紧凑布局重设计

## Summary

当前输入栏有两个问题：
1. ChatView 中 `Divider()` 分隔线让整个输入区域看起来像固定大尺寸区域
2. 按钮行 + 输入框分两行，整体高度不随内容动态收缩/扩展

用户建议方案：**将 7 个功能按钮收拢为一个"更多"入口，仅保留文件上传按钮在输入框左侧**。这样输入栏变回单行紧凑布局。

## Current State Analysis

**ChatView.swift 第29-32行：**
```swift
Divider()
ChatMessageSection(...)
Divider()          // ← 这条线
ChatInputSection(...) // ← 整个区域固定大
```

**InputBarView.swift 当前布局（两行）：**
```
[插件 附件 建议 设置 截屏 图片 角色        ]   ← 按钮行（固定高度）
[输入框                        发送]     ← 输入行
```

**7个按钮功能：**
| 按钮 | 图标 | 功能 | 使用频率 |
|------|------|------|---------|
| pluginButton | square.grid.2x2 | 插件库 | 低 |
| fileButton | paperclip | 添加附件 | **高** |
| suggestionButton | lightbulb | AI 建议 | 中 |
| settingsButton | gearshape | 快速设置 | 中 |
| cameraButton | camera | 截屏 | 低 |
| imageButton | photo | 选择图片 | 中 |
| agentButton | person.crop.circle | 切换角色 | 中 |

## Proposed Changes

### Step 1: InputBarView 改为单行布局

**文件**: `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Views/InputBarView.swift`

将 body 从两行改为单行：

```
[📎 更多] [输入框                    ] [发送]
```

- **文件上传按钮** (`paperclip`) — 直接显示在输入框左侧
- **更多按钮** (`ellipsis.circle`) — 点击弹出 popover 包含其余 6 个功能
- **输入框** — 占据剩余空间，单行时紧凑，多行时向下扩展
- **发送按钮** — 右侧

### Step 2: 移除分隔线

**文件**: `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Views/ChatView.swift`

移除第31行的 `Divider()`（ChatMessageSection 和 ChatInputSection 之间的那条线）

### Step 3: "更多"Popover 内容

popover 内展示 6 个功能入口（2列网格或列表）：
- 插件库、AI 建议、快速设置、截屏、选择图片、切换角色

每个入口保持原有功能不变。

## 具体代码变更

### InputBarView.body 重写

```swift
var body: some View {
    VStack(spacing: 0) {
        if !selectedAttachments.isEmpty {
            AttachmentPreviewBar(attachments: $selectedAttachments)
        }
        if let error = uploadError { /* error bar 保持 */ }

        // 单行：[文件] [更多] [输入框] [发送]
        HStack(spacing: 6) {
            fileButton          // 📎 文件上传
            moreButton          // ⋯ 更多功能弹出

            textField           // 输入框（占据剩余空间）
            sendButton          // 发送/停止
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
    }
}
```

### 新增 moreButton

```swift
private var moreButton: some View {
    Button(action: { showMorePanel.toggle() }) {
        Image(systemName: "ellipsis.circle")
            .font(.system(size: 18))
            .foregroundStyle(showMorePanel ? AppColors.info : AppColors.ink400)
    }
    .buttonStyle(.plain)
    .help("更多")
    .popover(isPresented: $showMorePanel, arrowEdge: .bottom) {
        MoreActionsGrid(
            onPlugin: {},
            onSuggestion: { showSuggestions = true; showMorePanel = false },
            onSettings: { showQuickSettings = true; showMorePanel = false },
            onCamera: captureScreenshot,
            onSelectImage: { selectedPhotoItem = nil; showMorePanel = false }, // 需特殊处理
            onSwitchAgent: { showAgentSwitcher = true; showMorePanel = false }
        )
    }
}
```

### MoreActionsGrid 视图

6 个功能以 2×3 网格排列：
```
[插件库] [AI 建议]
[设置]   [截屏]
[图片]   [角色]
```

### ChatView.swift 移除 Divider

删除第31行的 `Divider()` 调用。

## Assumptions & Decisions

1. 文件上传是最高频操作，保留为独立按钮
2. 其余 6 个功能收进"更多"，降低视觉噪音
3. 输入框恢复单行紧凑布局，多行时自然向下扩展
4. 不改变任何功能逻辑，仅调整 UI 布局

## Verification Steps

1. `xcodebuild build` 通过
2. 空状态：输入栏应为一行紧凑高度（~44px）
3. 输入多行文字：输入框向下扩展，按钮行保持不动
4. 点击"更多"：弹出 6 功能面板
5. 各功能正常工作（文件上传、AI建议、设置等）
