# 输入栏布局重构计划：卡片式大框 + 底部工具栏

## 目标布局（参考截图）

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  大文本输入区域（占主要空间，可扩展）                         │
│                                                          │
│                                                          │
│                                                          │
├──────────────────────────────────────────────────────────┤
│ 📎 | ⚡速通          GLM-5.1 ▾      🔊  🎤    ↑        │
└──────────────────────────────────────────────────────────┘
```

## 当前布局 vs 目标

| 维度 | 当前 | 目标 |
|------|------|------|
| 整体结构 | 扁平 `HStack`：[按钮][输入框][发送] | 卡片式 `VStack`：[大文本区][底部工具栏] |
| 文本框 | 小条形，maxHeight=100，独立圆角背景 | 填充上部空间，maxHeight=200+，无独立背景 |
| 按钮位置 | 与输入框同一行左右两侧 | 全部移到底部工具栏 |
| 外观 | 无容器边框 | 圆角卡片容器 + 边框 |

## 修改方案

### 文件：`Views/InputBarView.swift`

#### 1. body 结构重写（L37-66）

```swift
// 当前：
VStack(spacing: 0) {
    if !selectedAttachments.isEmpty { AttachmentPreviewBar }
    if let error = uploadError { Error bar }
    HStack(spacing: 6) {
        fileButton     // 左侧
        moreButton     // 左侧
        textField      // 中间
        sendButton     // 右侧
    }
}

// 目标：
VStack(spacing: 0) {
    // 上部：附件预览（如有）
    if !selectedAttachments.isEmpty { AttachmentPreviewBar }

    // 中部：大文本输入区
    textFieldExpanded

    // 下部：工具栏
    inputToolbar
}
.background(AppColors.elevatedSurface)
.cornerRadius(AppRadius.lg)
.overlay(
    RoundedRectangle(cornerRadius: AppRadius.lg)
        .stroke(AppColors.separatorLine.opacity(0.3), lineWidth: 0.5)
)
.padding(.horizontal, 10)
.padding(.vertical, 8)
```

#### 2. 新增 `textFieldExpanded`（替代原 `textField`）

```swift
private var textFieldExpanded: some View {
    IMETextView(
        text: $messageText,
        onSend: { handleSubmit() },
        placeholder: "发消息... 输入 / 查看指令",
        fontSize: 15,
        maxHeight: 200
    )
    .accessibilityLabel("消息输入框")
    .frame(minHeight: 60)
}
```

关键变化：
- 移除外层的 `.background()` 和 `.cornerRadius()`（由父容器统一提供）
- maxHeight 从 100 → 200（更大的文本区域）
- minHeight 从 40 → 60（默认更高）
- fontSize 从 16 → 15（大区域用稍小字号更协调）

#### 3. 新增 `inputToolbar`（底部工具栏）

```swift
private var inputToolbar: some View {
    HStack(spacing: 4) {
        // 左侧组
        HStack(spacing: 2) {
            fileButton          // 📎 附件
            Divider().frame(height: 16)  // 分隔线
            quickShortcutBtn    // ⚡ 速通（快捷指令入口）
        }

        Spacer()

        // 右侧组
        HStack(spacing: 6) {
            modelPickerBtn      // GLM-5.1 ▾
            voiceInputBtn       // 🔊 语音输入（预留）
            micBtn              // 🎤 麦克风（预留）
            sendButton          // ↑ 发送/停止
        }
    }
    .padding(.top, 8)
}
```

#### 4. 按钮样式调整

所有底部工具栏按钮改为紧凑型（28×28 或图标文字混合），不再使用独立的 Circle 背景：

- **fileButton**：保持 paperclip 图标，尺寸缩小到 28×28，无 Circle 背景
- **quickShortcutBtn**（新增）：⚡ 图标 + "速通" 文字，点击弹出 CommandPickerView
- **modelPickerBtn**（新增）：显示 `currentModelName` + chevron.down，点击打开 ModelPickerView
- **sendButton**：保持现有圆形样式（视觉焦点）
- **voiceInputBtn / micBtn**：纯图标按钮，预留功能（disabled 态）

#### 5. 删除的组件

以下组件从主视图移除（合并到新布局或保留为 popover 子面板）：

- ~~`moreButton`~~ → 功能分散到工具栏各按钮
- ~~`pluginButton`~~ → 未使用，删除
- 原 `textField` → 替换为 `textFieldExpanded`
- 原 `suggestionButton` / `settingsButton` / `cameraButton` / `imageButton` / `agentButton` → 保留为 popover 内容，通过 quickShortcutBtn 或更多入口访问

#### 6. 保留不变的部分

- 所有业务逻辑：sendMessage、handleSubmit、handleFileImport、uploadFileToServer、uploadImageData、captureScreenshot
- AttachmentPreviewBar 组件
- QuickSettingsPanel、AgentSwitcherPanel、SuggestionPanel、MoreActionsGrid 等 popover 面板
- 所有 @State 变量

## 具体代码变更清单

### InputBarView.body（L37-66）→ 完全重写
### 新增 textFieldExpanded computed property
### 新增 inputToolbar computed property
### 新增 quickShortcutBtn computed property
### 新增 modelPickerBtn computed property
### 修改 fileButton → 紧凑版（无 Circle 背景）
### 修改 sendButton → 尺寸微调（30×30）
### 删除 pluginButton（未使用）
### 修改 textField → 重命名为 textFieldExpanded，移除外层装饰

## 设计 Token 使用

| 属性 | 值 |
|------|-----|
| 容器背景 | `AppColors.elevatedSurface` |
| 容器圆角 | `AppRadius.lg` (14px) |
| 容器边框 | `AppColors.separatorLine.opacity(0.3)` 0.5px |
| 工具栏图标色 | `AppColors.ink400` |
| 工具栏文字 | `AppTypography.caption` |
| 发送按钮 | 保持 userBubbleBg 圆形 |
| 文本框字体 | 15px（比原来 16px 稍小） |
| 文本框 maxH | 200px |
| 文本框 minH | 60px |

## 验证步骤

1. Xcode 编译通过
2. 输入栏显示为大圆角卡片
3. 文本输入区占据卡片大部分高度
4. 底部工具栏显示：左侧文件+速通，右侧模型选择+发送
5. 点击各按钮功能正常（文件选择、发送、模型切换等）
6. 附件预览正常显示在顶部
7. 多行文本输入时卡片自动扩展
