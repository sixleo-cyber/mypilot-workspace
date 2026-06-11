# 非图片文件上传 + AI 生成图片下行修复

## 一、问题诊断

### 问题 2：Markdown 文件发送后 AI 只收到 "."

**根因**：[daemon.js L526-L528](file:///Users/liaoxing/Downloads/未命名文件夹/mypilot-link/src/daemon.js#L526-L528)

```javascript
} else if (att.url) {
    parts.push(`[${att.filename}](${att.url})`);
}
```

非图片文件有两个路径进入 daemon：
- **有 url**：`att.url` 有值 → 生成 `[filename](url)` 链接 ✅
- **有 data（base64）但无 url**：Swift 端 REST 上传失败后回退到 base64 直传，`url: ""` → 完全不处理 ❌

Markdown 文件走第二条路径，到 daemon 后被静默丢弃，只有 "." 文本送到 Gateway。

### 问题 3：AI 生成的图片在 App 中不显示

**根因**：两层问题

**层 1** — AI 用 `message` 工具发图，但 webchat 不在支持 channel 列表中，Gateway 拒绝：
> "webchat不在支持的channel列表里"

**层 2** — 即使 Gateway 通过 `chat` 事件下发图片 ContentPart，`extractContentParts` 能保存到 `uploadsDir` 并返回 `/api/file/:id` URL。但实际测试中图片没有出现，说明 Gateway 在当前协议版本下**不会**把图片作为 ContentPart 内联到 chat 事件中。

**解决办法**：既然图片文件已经在 workspace 磁盘上（如 `/root/.openclaw/workspace/generated_image_xxx.png`），最可靠的方式是让 daemon **额外提供 workspace 文件服务**，同时让 App 自动识别 AI 消息中的文件路径引用并渲染。

## 二、修复方案

### 修复 A：非图片文件（Markdown 等）支持 base64 上传

[daemon.js `sendToGateway` 函数](file:///Users/liaoxing/Downloads/未命名文件夹/mypilot-link/src/daemon.js#L508-L529)

将非图片文件也保存到 `inboundMediaDir`，并通过 `file://` 路径引用告诉 AI：

```javascript
for (const att of attachments) {
  if (att.mimeType?.startsWith("image/")) {
    // ... 现有图片处理逻辑不变
  } else if (att.data) {
    // 新增：非图片文件（如 markdown、pdf 等）——保存到磁盘并引用
    const filePath = path.join(inboundMediaDir, `${Date.now()}-${att.filename}`);
    fs.writeFileSync(filePath, Buffer.from(att.data, "base64"));
    imagePaths.push(filePath);
    log.info(`File saved: ${filePath}`);
  } else if (att.url) {
    parts.push(`[${att.filename}](${att.url})`);
  }
}
```

### 修复 B：AI 生成图片 —— 添加 workspace 文件服务端点

[daemon.js 文件处理函数](file:///Users/liaoxing/Downloads/未命名文件夹/mypilot-link/src/daemon.js) — 在 HTTP 路由中添加 `/api/workspace-file/*` 端点：

```javascript
// GET /api/workspace-file/*
if (path.startsWith("/api/workspace-file/") && req.method === "GET") {
  const workspaceDir = path.join(os.homedir(), ".openclaw", "workspace");
  const filePath = path.join(workspaceDir, path.replace("/api/workspace-file/", ""));
  // 安全检查 + 返回文件
}
```

### 修复 C：App 端识别 AI 消息中的文件路径

在 [MessageBubbleView.swift](file:///Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Chat/MessageBubbleView.swift) 或 [MarkdownRenderer.swift](file:///Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Chat/MarkdownRenderer.swift) 中，当 AI 回复包含 `/root/.openclaw/workspace/` 或 `/api/workspace-file/` 路径时，自动渲染为可点击的图片/文件链接。

## 三、文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `mypilot-link/src/daemon.js` | 修改 | 非图片 base64 文件处理 + `/api/workspace-file/*` 端点 |
| `MyPilot/Features/Chat/MarkdownRenderer.swift` | 修改 | 识别文件路径并渲染 |

## 四、部署

1. 修改 daemon.js → scp 上传 → 重启 daemon
2. Swift 端编译验证
3. 测试：发 markdown 文件 → AI 能读取；AI 生成图片 → App 能显示

## 五、验证

1. 发送 .md 文件 → AI 回复文件内容摘要（不再只有 "."）
2. 让 AI "生成一张图片发给我" → App 聊天界面显示该图片
