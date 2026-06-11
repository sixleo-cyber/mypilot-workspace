# 附件发送最终修复

## 一、诊断结论

发现了 `mypilot-link` daemon 桥接层：

```
Swift App ──(chat.send frame)──> mypilot-link Daemon ──(Gateway RPC)──> OpenClaw Gateway
```

Daemon 源码 [`daemon.js:L699-L703`] 中读取附件的代码：

```javascript
const attachments = frame.attachments || (frame.payload && frame.payload.attachments) || [];
```

**Bug 根因**：Daemon 查找 `frame.attachments`（**复数**），但 Swift 代码发送的是 `frame["attachment"]`（**单数**）。Daemon 找不到附件，只把 `"."` 文本转发给 Gateway，图片数据丢失。

## 二、修复方案

将 `frame["attachment"]` 改回 `frame["attachments"]`（复数数组），恢复原始正确的 attach 对象结构。

Daemon 期望的附件字段：
- `filename`, `mimeType`, `size` — 元数据
- `data` — base64 原始数据（不含 `data:` 前缀）
- `url` — 文件 URL（与 data 二选一）

## 三、具体修改

**文件**：`Services/WebSocketService.swift`

```swift
// 修复前
frame["attachment"] = obj   // 单数，Daemon 不识别

// 修复后
frame["attachments"] = msg.attachments.map { att in
    var obj: [String: Any] = ["filename": att.filename, "mimeType": att.mimeType, "size": att.size]
    if let data = att.base64Data { obj["data"] = data }
    else if !att.url.isEmpty { obj["url"] = att.url }
    return obj
}
```

同时移除 `frame["content"] = "."` 强制占位符。

## 四、文件变更

| 文件 | 操作 |
|------|------|
| `Services/WebSocketService.swift` | `"attachment"` → `"attachments"` 复数数组；移除 `.` 占位符 |

## 五、验证

1. 发送带图片消息 → AI 应能识别图片内容
2. 询问 "描述你看到的图片" → AI 应描述图片内容
