# AI 文件回传功能重设计

## Summary

重新设计 AI 生成文件从服务器到 App 的回传机制。当前问题：AI 生成的 markdown 等文本内容是自动推送到 App 的，但 AI 在工作区创建的二进制文件（图片、PDF、Office 文档等）没有可靠的回传通道。需要实现类似飞书 Bot 的文件发送体验：daemon 自动检测 AI 生成的二进制文件 → 推送通知到 App → App 展示文件卡片 → 用户点击下载。

## 飞书文件发送技术原理

飞书 Bot 发送文件的流程是两步走：

1. **上传阶段** — `POST /open-apis/im/v1/files`（或 `/images`）
   - Bot 调用上传 API，以 `multipart/form-data` 传输文件二进制
   - 飞书平台存储文件，返回 `file_key`（或 `image_key`）
   - 文件与 Bot 绑定，只有上传者才能发送

2. **发送阶段** — `POST /open-apis/im/v1/messages`
   - `msg_type: "file"`，`content: {"file_key": "file_xxx"}`
   - `msg_type: "image"`，`content: {"image_key": "img_v2_xxx"}`
   - 平台根据 key 从存储中取文件，渲染为文件卡片
   - 用户点击即可预览/下载

**核心模式：先注册（上传获取 key）→ 后引用（发送时用 key）**

## MyPilot 现有机制对比

| 维度 | 飞书 | MyPilot 现状 |
|------|------|-------------|
| 文件存储 | 飞书云端 CDN | daemon 本地 `~/.openclaw/workspace/` |
| 文件注册 | 上传 API 返回 file_key | `snapshotWorkspace` + `diffWorkspace` 对比检测 |
| 文件引用 | message 中传 file_key | done 帧 attachments 数组传相对 URL |
| 文件下载 | 飞书 CDN URL | `GET /api/workspace-file/:name` 或 `/api/file/:id` |
| 文件推送 | Bot 调发送消息 API | done 帧附带 attachments（已有但不完善） |
| 文件卡片 | 原生渲染（文件名、大小、预览） | DocumentFileCard / ImageAttachmentCard |

**关键差距：**
- 飞书是**主动推送**文件消息，MyPilot 是**被动附带**在 done 帧里
- 飞书文件与消息**独立关联**，MyPilot 文件**绑死在**对话结束帧
- 飞书支持**流式推送**（AI 生成过程中逐步发文件），MyPilot 只在对话结束后 diff 一次
- AI 在对话中途生成的文件，当前依赖正则扫描文本中的 `/root/.openclaw/workspace/xxx` 路径，不可靠

## Current State Analysis

### 现有文件检测机制（daemon.js）

1. `snapshotWorkspace()` — 对话开始前扫描 `~/.openclaw/workspace/` 目录
2. `diffWorkspace(snapshot)` — 对话结束后对比，返回新增/修改的文件
3. `extractContentParts(content)` — 从 AI 返回的 content parts 中提取：
   - `image` parts（data: URI → 保存到 uploads → 返回 /api/file/ URL）
   - `file` parts（直接传 URL）
   - 文本正则匹配 `/root/.openclaw/workspace/xxx.ext`

**问题：**
- diffWorkspace 只在 `state === "final"` 时执行一次，中途生成的文件无法实时推送
- 正则匹配依赖 AI 输出中包含完整路径，不可靠
- `file` content part 类型目前 Gateway 很少返回
- 用户反馈"AI 不会回传"——说明现有机制经常漏检

### 现有 App 端接收机制

- `handleDoneFrame` 解析 `attachments` 数组
- `AttachmentTransport.resolveAllAttachments` 合并 parseAttachments + parseMediaDirectives
- `MessageBubbleView` 中 `AttachmentGrid` 展示文件卡片
- 支持图片预览、文档下载/打开、过期状态

## Proposed Changes

### Phase 1: daemon 端 — 增强文件检测与推送

**文件**: `mypilot-link/src/daemon.js`

#### 1.1 新增流式文件检测（chat 事件处理中）

当前：只在 `state === "final"` 时 diffWorkspace 一次。

改为：在 `state === "stream"` 事件中也检测新文件：

```javascript
// 在 stream 事件处理中（delta/content 增量后）
if (state === "stream" && pending.workspaceSnapshot) {
    const newFiles = diffWorkspace(pending.workspaceSnapshot);
    if (newFiles.length > 0) {
        // 立即推送 file.new 帧
        pending.appWs.send(JSON.stringify({
            type: "file.new",
            files: newFiles.map(f => ({
                id: crypto.randomUUID(),
                filename: f.filename,
                mimeType: f.mimeType,
                url: `/api/workspace-file/${f.filename}`,
                size: f.size
            })),
            conversationId: pending.conversationId,
            agentId: pending.agentId
        }));
        // 更新 snapshot 防止重复推送
        pending.workspaceSnapshot = snapshotWorkspace();
    }
}
```

#### 1.2 增强文件类型过滤

在 `diffWorkspace` 返回结果中，仅包含二进制文件类型：

```javascript
const BINARY_EXTENSIONS = new Set([
    'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico',
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    'zip', 'tar', 'gz', '7z', 'rar',
    'mp4', 'mov', 'avi', 'mkv',
    'mp3', 'wav', 'ogg', 'flac',
    'sqlite', 'db'
]);
```

文本文件（.md, .txt, .py, .js, .html, .css, .json, .csv 等）不作为附件推送，仅在对话文本中引用。

#### 1.3 新增 WebSocket 帧类型 `file.new`

```
方向: daemon → App
时机: 对话流式进行中，检测到新文件时
格式:
{
    "type": "file.new",
    "files": [{
        "id": "<uuid>",
        "filename": "chart.png",
        "mimeType": "image/png",
        "url": "/api/workspace-file/chart.png",
        "size": 12345
    }],
    "conversationId": "default",
    "agentId": "main"
}
```

与 `done` 帧的 `attachments` 字段格式一致，App 可以复用现有解析逻辑。

#### 1.4 确保文件可下载

`/api/workspace-file/:name` 端点已存在，但需要确认：
- AI 生成的文件确实写入 `~/.openclaw/workspace/`（已确认是默认行为）
- 大文件需要流式传输（当前是 `fs.readFileSync`，大文件可能 OOM）

改为流式响应：

```javascript
if (urlPath.startsWith("/api/workspace-file/") && req.method === "GET") {
    // ... path validation ...
    const stat = fs.statSync(filePath);
    res.writeHead(200, {
        "Content-Type": mimeType,
        "Content-Length": stat.size,
        "Content-Disposition": `inline; filename="${encodeURIComponent(subPath)}"`,
        "Cache-Control": "public, max-age=86400",
    });
    fs.createReadStream(filePath).pipe(res);
}
```

### Phase 2: App 端 — 接收文件推送 + 展示

**文件**: `MyPilotApp/MyPilot/MyPilot/Services/WebSocketService.swift`

#### 2.1 处理 `file.new` 帧

在 `parseMessage` 的 switch 中新增 case：

```swift
case "file.new":
    handleFileNewFrame(json)
```

实现：

```swift
private func handleFileNewFrame(_ json: [String: Any]) {
    let rawFiles = json["files"] as? [[String: Any]] ?? []
    guard !rawFiles.isEmpty else { return }

    let attachments = AttachmentTransport.parseAttachments(
        from: rawFiles,
        baseURL: self.instance?.effectiveServerURL ?? ""
    )

    // 找到当前 AI 消息，追加附件
    if let lastMsg = messages.last, !lastMsg.isFromUser {
        let updatedMsg = Message(
            id: lastMsg.id,
            content: lastMsg.content,
            isFromUser: false,
            attachments: lastMsg.attachments + attachments,
            thinkingContent: lastMsg.thinkingContent,
            timestamp: lastMsg.timestamp
        )
        if let idx = messages.indices.last {
            messages[idx] = updatedMsg
        }
    }
}
```

#### 2.2 Message 模型调整

**文件**: `MyPilotApp/MyPilot/MyPilot/Models/Message.swift`

当前 `Message` struct 没有 `attachments` 的 mutating 方法。需要确保：
- `Message` 是 struct（值类型），修改后需要整体替换
- 或将 `attachments` 改为可变（当前已有 `var` 声明）

检查：当前 Message 的 attachments 声明是 `var attachments: [MessageAttachment]`，已可变 ✅

#### 2.3 去重逻辑

`file.new` 推送的文件和 `done` 帧的 `attachments` 可能重复（同一个文件在流式和最终帧都出现）。

`AttachmentTransport.dedupeAttachments` 已有按 id + url + filename+size 的去重逻辑 ✅

但 `handleFileNewFrame` 是追加到现有消息的 `attachments` 上，而 `handleDoneFrame` 会创建新消息。需要确保：

- `handleDoneFrame` 在创建 Message 时，去重合并 `done.attachments` 和已有附件
- 或：在 `handleDoneFrame` 中排除已在 `file.new` 中推送过的文件

推荐方案：`handleDoneFrame` 创建新 Message 时，合并去重：

```swift
// handleDoneFrame 中
let existingAttachments = messages.last?.attachments ?? []
let allAttachments = AttachmentTransport.dedupeAttachments(existingAttachments + newAttachments)
```

### Phase 3: 增强 diffWorkspace 检测可靠性

**文件**: `mypilot-link/src/daemon.js`

#### 3.1 使用 fs.watch 替代 snapshot diff（可选增强）

当前方案（snapshot + diff）在每次 stream 事件时调用，对磁盘 IO 有压力。

优化方案：在 chat 开始时启动 `fs.watch` 监听 workspace 目录，文件创建/修改时实时推送：

```javascript
// chat 开始时
const watcher = fs.watch(workspaceDir, { persistent: false }, (eventType, filename) => {
    if (!filename || filename.startsWith('.')) return;
    const ext = path.extname(filename).slice(1).toLowerCase();
    if (!BINARY_EXTENSIONS.has(ext)) return;
    // 推送 file.new
});
// chat 结束时
watcher.close();
```

**决策**：先用方案 1.1（stream 事件中 diff），因为 `fs.watch` 在不同 OS 上行为不一致且有性能问题。后续如有性能问题再优化。

#### 3.2 检查频率控制

在 stream 事件中每次都 diff 可能太频繁。增加节流：

```javascript
// 最少间隔 2 秒检查一次
if (!pending.lastFileCheck || Date.now() - pending.lastFileCheck > 2000) {
    const newFiles = diffWorkspace(pending.workspaceSnapshot);
    pending.lastFileCheck = Date.now();
    // ...
}
```

## 修改文件清单

| 文件 | 改动 |
|------|------|
| `mypilot-link/src/daemon.js` | stream 事件中增加文件检测 + `file.new` 帧推送 + 文件类型过滤 + 流式文件响应 + 节流 |
| `MyPilotApp/MyPilot/MyPilot/Services/WebSocketService.swift` | 新增 `handleFileNewFrame` + parseMessage 新增 case + done 帧去重合并 |
| `MyPilotApp/MyPilot/MyPilot/Services/AttachmentTransport.swift` | 无需修改（复用 parseAttachments + dedupeAttachments） |
| `MyPilotApp/MyPilot/MyPilot/Features/Chat/MessageBubbleView.swift` | 无需修改（复用现有卡片组件） |

## Assumptions & Decisions

1. **仅推送二进制文件** — 文本文件（.md, .py, .js 等）不作为附件推送，仅在对话中引用
2. **推送 + 手动下载** — daemon 主动推送文件信息，App 展示卡片，用户点击下载
3. **复用现有端点** — 文件通过 `/api/workspace-file/:name` 下载，不新增端点
4. **先 snapshot diff 后 fs.watch** — 先用成熟的 diff 方案，后续按需优化
5. **file.new 帧与 done 帧格式对齐** — 附件结构一致，App 端复用解析代码
6. **节流 2 秒** — stream 事件中文件检测最少间隔 2 秒
7. **不修改 SOUL.md 和已部署素材** — 遵循项目规则

## Verification Steps

1. `npm run verify` — daemon 测试通过
2. `xcodebuild build` — App 编译通过
3. 手动测试：让 AI 生成一张图片 → 检查 App 中是否实时显示图片卡片
4. 手动测试：让 AI 生成一个 PDF → 检查 App 中是否显示文档卡片，点击可下载
5. 手动测试：让 AI 生成一个 .py 文件 → 不应作为附件推送，仅在文本中引用
6. 手动测试：done 帧与 file.new 帧的附件不重复
7. 回归：现有的图片上传、文件上传功能不受影响
