# 修复：App→AI 非图片文件无法识别

## 问题分析

### 当前流程（有 bug）

1. App 上传 PDF/Word/Excel/PPT → `POST /api/upload` → daemon 保存到 `uploads/{uuid}`
2. App 发送 `chat.send`，attachment 只有 `url: "/api/file/{uuid}"`，**没有 base64 data**
3. daemon 的 `sendToGateway` 处理逻辑：
   - `att.mimeType?.startsWith("image/")` → false（非图片）
   - `att.data` → undefined（HTTP 上传成功时不带 base64）
   - `att.url` → `"/api/file/{uuid}"` → **只生成 Markdown 链接**
4. AI 收到的消息是 `[document.pdf](/api/file/xxx)`，但 AI 无法访问 daemon 的 HTTP 端点 → "Not Found"

### 根因

**非图片文件通过 HTTP 上传后，daemon 没有将文件内容传递给 AI**。图片之所以能工作，是因为图片走的是另一条路径：App 将图片 base64 嵌入 attachment.data，daemon 解码后保存到 `inbound-media/` 并注入 `file://` 路径提示。

### 对比：图片为什么能工作

图片上传有两种路径：
1. HTTP 上传成功 → attachment 有 url 无 data → daemon 从 `uploads/` 读取文件 → 解码 base64 → 保存到 `inbound-media/` → 注入 `file://` 路径
2. HTTP 上传失败（fallback）→ attachment 有 data 无 url → daemon 直接解码 base64 → 保存到 `inbound-media/` → 注入 `file://` 路径

非图片文件只走路径 1，但 daemon 的代码在 `att.mimeType?.startsWith("image/")` 分支内才从 `uploads/` 读取文件，非图片文件被跳过了。

## 修改方案

### 核心思路

在 `sendToGateway` 中，对所有带 `url` 但无 `data` 的附件（无论是否图片），都从 `uploads/` 目录读取文件内容，然后保存到 workspace 目录，并注入 workspace 路径提示给 AI。

### 为什么保存到 workspace 而不是 inbound-media

- AI 的 `read_file` 工具只能读取 workspace 目录下的文件
- `inbound-media/` 不在 AI 的可访问范围内
- 保存到 workspace 后，AI 可以用 `read_file` 读取文本文件，用 `exec` 处理二进制文件

### 修改文件

#### 1. `mypilot-link/src/daemon.js` — `sendToGateway` 函数

修改附件处理逻辑，统一处理所有文件类型：

```javascript
// 修改前：只处理图片的 base64 data
if (att.mimeType?.startsWith("image/")) {
    let base64Data = att.data;
    if (!base64Data && att.url) {
        const fileId = att.url.split("/").pop();
        const filePath = path.join(uploadsDir, fileId);
        if (fs.existsSync(filePath)) {
            base64Data = fs.readFileSync(filePath).toString("base64");
        }
    }
    if (base64Data) {
        // 保存到 inbound-media
        imagePaths.push(mediaPath);
    }
} else if (att.data) {
    // 非图片有 base64 data
    imagePaths.push(filePath);
} else if (att.url) {
    // 只有 URL → 生成 Markdown 链接（AI 无法访问！）
    parts.push(`[${att.filename}](${att.url})`);
}

// 修改后：统一处理所有文件类型
let fileData = att.data;
if (!fileData && att.url) {
    const fileId = att.url.split("/").pop();
    const uploadPath = path.join(uploadsDir, fileId);
    if (fs.existsSync(uploadPath)) {
        fileData = fs.readFileSync(uploadPath).toString("base64");
    }
}
if (fileData) {
    // 所有文件都保存到 workspace 目录
    const workspaceDir = path.join(os.homedir(), ".openclaw", "workspace");
    const safeName = `${Date.now()}-${att.filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const wsPath = path.join(workspaceDir, safeName);
    fs.writeFileSync(wsPath, Buffer.from(fileData, "base64"));
    filePaths.push(wsPath);
    log.info(`File saved to workspace: ${wsPath} (${Buffer.from(fileData, "base64").length} bytes)`);
} else if (att.url) {
    parts.push(`[${att.filename}](${att.url})`);
}
```

同时修改注入提示文本，区分图片和文档：

```javascript
if (filePaths.length > 0) {
    const imageFiles = filePaths.filter(p => /\.(png|jpe?g|gif|webp|svg)$/i.test(p));
    const docFiles = filePaths.filter(p => !/\.(png|jpe?g|gif|webp|svg)$/i.test(p));
    
    const fileList = filePaths.map(p => `file://${p}`).join("\n");
    if (text && text.trim()) parts.push(text);
    
    let hint = `\n[用户发送了 ${filePaths.length} 个文件`;
    if (imageFiles.length > 0) hint += `（其中 ${imageFiles.length} 个图片）`;
    if (docFiles.length > 0) hint += `（其中 ${docFiles.length} 个文档）`;
    hint += `。请使用 read_file 工具读取以下文件并分析内容：]\n${fileList}`;
    
    parts.push(hint);
}
```

#### 2. `MyPilotApp/MyPilot/MyPilot/Services/APIService.swift` — 补全 MIME 类型映射

当前缺少 Word/Excel/PPT 的映射，非图片非 PDF 文件会以 `application/octet-stream` 上传：

```swift
static func mimeTypeFor(filename: String) -> String {
    let ext = filename.lowercased()
    // ... 现有的图片/PDF/视频/音频映射 ...
    if ext.hasSuffix(".doc") { return "application/msword" }
    if ext.hasSuffix(".docx") { return "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }
    if ext.hasSuffix(".xls") { return "application/vnd.ms-excel" }
    if ext.hasSuffix(".xlsx") { return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }
    if ext.hasSuffix(".ppt") { return "application/vnd.ms-powerpoint" }
    if ext.hasSuffix(".pptx") { return "application/vnd.openxmlformats-officedocument.presentationml.presentation" }
    if ext.hasSuffix(".txt") { return "text/plain" }
    if ext.hasSuffix(".csv") { return "text/csv" }
    if ext.hasSuffix(".md") { return "text/markdown" }
    if ext.hasSuffix(".json") { return "application/json" }
    return "application/octet-stream"
}
```

## 验证步骤

1. 从 App 发送一个 PDF 文件 → AI 应能读取并分析内容
2. 从 App 发送一个 Word 文件 → AI 应能读取并分析内容
3. 从 App 发送一个 Excel 文件 → AI 应能读取并分析内容
4. 从 App 发送一个 PPT 文件 → AI 应能读取并分析内容
5. 从 App 发送一张图片 → 仍然正常工作
6. 检查 workspace 目录，确认文件被正确保存
