# 文件上传修复计划

## 一、问题诊断

### 症状
点击附件/图片按钮 → 选择文件后 → 无任何反应，附件列表为空。

### 根因

**`APIService.uploadFile()` 和 `InputBarView.uploadImageData()` 都没有携带认证凭据。**

WebSocket 连接通过 URL 查询参数 `?deviceId=xxx&token=xxx` 认证，而 REST API 调用到 `/api/upload` 时完全没有 `Authorization` header。如果 Gateway 的 `/api/upload` 端点要求认证（大概率），请求返回 401/403，被三层静默掩盖：

| 层 | 位置 | 问题 |
|----|------|------|
| 1 | APIService.swift L100-103 | 401/403/500 统一抛 `APIError.serverError`，无具体状态码 |
| 2 | InputBarView.swift L261-263 | catch 只 `print()`，无用户反馈 |
| 3 | InputBarView.swift L250 | `Task {}` 内错误无法传播到 UI |

### 附加问题
- `uploadImageData` (PhotosPicker 入口) 重复了上传逻辑，同样缺失认证
- Gateway 官方文档未列出 `/api/upload` 端点，可能需要改用 WebSocket `chat.send` 帧直接携带 base64 文件数据（需验证服务端支持）

## 二、修复方案

### 方案选择：优先 REST 认证修复，若不可用则走 WebSocket

**Step A** — 为 REST 上传添加认证（主方案）

**Step B** — 添加用户可见的错误提示

**Step C** — 若 REST 端点不可用，改为 WebSocket 直传

### 具体修改

#### 修改 1：APIService.uploadFile 添加 token 参数 + Auth header

**文件**：`Services/APIService.swift`

修改 `uploadFile` 方法签名，新增 `token` 参数，在请求中添加 `Authorization: Bearer <token>` header。同时改进错误信息，区分 HTTP 状态码。

```swift
func uploadFile(serverURL: String, token: String, fileURL: URL) async throws -> FileUploadResponse {
    // ... 
    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    // ...
    guard let httpResponse = response as? HTTPURLResponse,
          (200...299).contains(httpResponse.statusCode) else {
        let code = (response as? HTTPURLResponse)?.statusCode ?? -1
        throw APIError.uploadError("上传失败 (HTTP \(code))")
    }
}
```

新增 `APIError.uploadError(String)` case。

#### 修改 2：InputBarView 传入 token

**文件**：`Views/InputBarView.swift`

`handleFileImport` 方法调用 `uploadFile` 时传入 `instance.token`。

同样修改 `uploadImageData` 方法，添加 token header。

#### 修改 3：添加用户可见的错误反馈

**文件**：`Views/InputBarView.swift`

添加 `@State private var uploadError: String?` 和对应的 alert/overlay 提示。

在 `handleFileImport` 的 catch 分支中设置 `uploadError`，让用户知道上传失败。

#### 修改 4（备选）：WebSocket 直传

如果 REST 端点 `/api/upload` 在 Gateway 上不存在（官方文档没有提到它），则修改 WebSocket `sendMessage` 方法，允许 `attachments` 中直接携带 base64 数据字段：

```swift
frame["attachments"] = msg.attachments.map {
    var dict: [String: Any] = ["id": $0.id, "filename": $0.filename, "mimeType": $0.mimeType, "size": $0.size]
    if let data = $0.base64Data {
        dict["data"] = data
    } else {
        dict["url"] = $0.url
    }
    return dict
}
```

`MessageAttachment` 模型中添加 `base64Data: String?` 可选字段。

## 三、文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `Services/APIService.swift` | 修改 | `uploadFile` 添加 token 参数 + Auth header |
| `Models/Message.swift` | 修改 | `MessageAttachment` 添加 `base64Data` 可选字段 |
| `Views/InputBarView.swift` | 修改 | 传入 token；添加错误提示；`uploadImageData` 添加认证 |

## 四、验证步骤

1. 编译通过
2. 点击附件按钮 → 选择一张图片 → 确认出现 "上传中" 或附件出现在列表中
3. 若 REST 上传失败，自动回退到 WebSocket 直传
4. 若全部失败，用户可见错误提示（非静默失败）

## 五、不涉及范围

- 搜索跳转功能（用户标记为"重要不紧急"）
- 图片预览/缩略图优化
- 大文件分片上传
