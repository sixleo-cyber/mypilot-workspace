# 优化 App 端附件渲染

## 问题总结

1. **文档附件渲染不直观** — Word/PPT/Excel/PDF 只显示一个小图标+文件名，用户无法一眼看出是什么文件
2. **附件渲染位置错误** — 用户发送的附件（图片/文档）应该始终在用户侧（右侧），但目前 AI 回复中的附件（如 PDF 转 PNG）会渲染在 AI 侧
3. **AI 识别 PDF 后回传 PNG** — AI 在识别 PDF 后会将 PDF 转为 PNG 图片作为附件发回，这是 AI 的正常行为，App 端应正确渲染

## 当前状态分析

### MessageBubbleView.swift 布局逻辑

- `message.isFromUser == true` → 右对齐，附件在文本上方
- `message.isFromUser == false` → 左对齐，附件在文本下方
- 附件始终跟随消息的 `isFromUser` 属性渲染

### AttachmentCard 渲染逻辑

- 图片：异步加载缩略图（maxWidth: 200, maxHeight: 200）
- 视频/音频：固定图标（60×60）
- 其他文档：固定图标（60×60）+ 文件名（maxWidth: 100）

### 问题 2 的根因

用户发送文件时，`InputBarView.sendMessage()` 创建 `Message(content: text, isFromUser: true, attachments: attachments)`，附件正确标记为用户消息。但 AI 回复中如果包含附件（如 PDF 转 PNG），这些附件的 `isFromUser = false`，会渲染在 AI 侧——这其实是**正确行为**，因为那是 AI 生成的图片。

**用户反馈的问题 2 可能是指**：用户发送的文件在发送成功后，附件没有正确显示在用户消息气泡中。需要确认 `sendMessage` 是否正确保留了附件信息。

## 修改方案

### 1. 文档附件卡片重新设计 — `AttachmentCard`

将文档类附件从"小图标+文件名"改为信息更丰富的卡片样式：

**修改文件**: `MyPilotApp/MyPilot/MyPilot/Features/Chat/MessageBubbleView.swift`

**新设计**:
```
┌─────────────────────────────────┐
│  📄  document.pdf               │
│      PDF · 2.3 MB               │
│                      [⬇下载]    │
└─────────────────────────────────┘
```

- 左侧：大图标（根据文件类型着色）
- 中间：文件名（可显示更长）+ 文件类型标签 + 文件大小
- 右侧：下载/打开按钮
- 卡片宽度：自适应，最大 280pt
- 点击整个卡片：图片→预览，文档→系统默认应用打开

**文件类型颜色映射**:
| 类型 | 图标 | 颜色 |
|------|------|------|
| PDF | doc.richtext | 红色 #E53935 |
| Word | doc.text | 蓝色 #1976D2 |
| Excel | tablecells | 绿色 #388E3C |
| PPT | rectangle.on.rectangle | 橙色 #F57C00 |
| 文本/MD | doc.plaintext | 灰色 #616161 |
| 其他 | doc | 灰色 #9E9E9E |

### 2. 确保用户发送的附件渲染在用户侧

**修改文件**: `MyPilotApp/MyPilot/MyPilot/Features/Chat/MessageBubbleView.swift`

当前逻辑已经正确：附件跟随 `message.isFromUser` 渲染。需要确认的是 `sendMessage` 流程中附件信息不丢失。

**修改文件**: `MyPilotApp/MyPilot/MyPilot/Services/WebSocketService.swift`

在 `sendMessage` 中，当 HTTP 上传成功时，attachment 只有 `url` 没有 `base64Data`。消息被 append 到 `messages` 数组后，渲染时 `AttachmentCard` 需要通过 `serverURL + url` 拼接来加载缩略图。对于非图片文件，无法加载缩略图，所以需要用新的卡片设计来展示。

### 3. AI 回传的 PNG 图片正确渲染

AI 识别 PDF 后回传的 PNG 图片，通过 daemon 的 `done` 事件中的 `attachments` 数组传递，`mimeType` 为 `image/png`，`url` 为 `/api/workspace-file/xxx.png`。当前 `AttachmentCard` 已经能正确加载和渲染图片附件，无需额外修改。

## 具体修改

### 文件 1: `MessageBubbleView.swift`

#### 1.1 重写 `AttachmentCard` 的文档渲染部分

将 `else` 分支（非图片/视频/音频）从简单图标改为富信息卡片：

```swift
} else {
    DocumentFileCard(attachment: attachment, serverURL: serverURL)
}
```

#### 1.2 新增 `DocumentFileCard` 组件

```swift
struct DocumentFileCard: View {
    let attachment: MessageAttachment
    let serverURL: String
    @State private var showPreview = false

    var downloadURL: URL? { ... }

    var body: some View {
        HStack(spacing: 12) {
            RoundedRectangle(cornerRadius: 8)
                .fill(iconColor.opacity(0.12))
                .frame(width: 44, height: 44)
                .overlay {
                    Image(systemName: fileIcon)
                        .font(.system(size: 20))
                        .foregroundStyle(iconColor)
                }

            VStack(alignment: .leading, spacing: 2) {
                Text(attachment.filename)
                    .font(.body).lineLimit(1)
                HStack(spacing: 4) {
                    Text(fileTypeLabel)
                        .font(.caption2)
                        .padding(.horizontal, 4).padding(.vertical, 1)
                        .background(iconColor.opacity(0.1))
                        .cornerRadius(3)
                    Text(formatFileSize(attachment.size))
                        .font(.caption2).foregroundStyle(.secondary)
                }
            }

            Spacer()

            Button(action: openFile) {
                Image(systemName: "arrow.down.circle")
                    .font(.system(size: 20))
                    .foregroundStyle(.secondary)
            }
            .buttonStyle(.plain)
        }
        .padding(10)
        .frame(maxWidth: 280)
        .background(Color(.controlBackgroundColor))
        .cornerRadius(10)
        .onTapGesture { openFile() }
    }
}
```

#### 1.3 新增辅助计算属性和函数

```swift
private var iconColor: Color {
    let ext = (attachment.filename.split(separator: ".").last?.lowercased() ?? "")
    switch ext {
    case "pdf": return .red
    case "doc", "docx": return .blue
    case "xls", "xlsx": return .green
    case "ppt", "pptx": return .orange
    default: return .gray
    }
}

private var fileTypeLabel: String {
    let ext = (attachment.filename.split(separator: ".").last?.lowercased() ?? "")
    switch ext {
    case "pdf": return "PDF"
    case "doc", "docx": return "Word"
    case "xls", "xlsx": return "Excel"
    case "ppt", "pptx": return "PPT"
    case "txt": return "TXT"
    case "md": return "Markdown"
    case "csv": return "CSV"
    case "json": return "JSON"
    default: return ext.uppercased()
    }
}

private func formatFileSize(_ bytes: Int) -> String {
    if bytes < 1024 { return "\(bytes) B" }
    if bytes < 1048576 { return String(format: "%.1f KB", Double(bytes) / 1024) }
    return String(format: "%.1f MB", Double(bytes) / 1048576)
}
```

### 文件 2: `Message.swift`

#### 2.1 新增 `isDocument` 计算属性

```swift
var isDocument: Bool {
    !isImage && !isVideo && !isAudio
}
```

## 验证步骤

1. 发送 PDF 文件 → 用户侧显示富信息卡片（红色图标 + 文件名 + PDF标签 + 大小 + 下载按钮）
2. 发送 Word 文件 → 用户侧显示蓝色图标卡片
3. 发送 Excel 文件 → 用户侧显示绿色图标卡片
4. 发送 PPT 文件 → 用户侧显示橙色图标卡片
5. 发送图片 → 用户侧显示缩略图（不变）
6. AI 回复中的 PNG 附件 → AI 侧显示缩略图，可点击预览
7. 点击文档卡片 → 系统默认应用打开文件
