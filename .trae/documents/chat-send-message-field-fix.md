# chat.send 帧字段名修复计划

## 一、问题诊断

### 症状
- 纯文本消息正常发送和回复 ✅
- 带附件消息发送后：`❌ invalid chat.send params: at /message: must be string`
- AI 收不到图片

### 根因

Gateway 的 `chat.send` 帧 schema 期望文本字段名为 **`message`**（string type），但 `WebSocketService` 发送的是 **`content`**。

纯文本消息可能通过 Gateway 的宽松回退逻辑被接受，但当帧包含 `attachments` 复杂结构时，Gateway 启用严格 schema 验证，发现 `message` 字段缺失（或类型不匹配），拒绝整个帧。

错误信息 `at /message: must be string` 证明 Gateway 在 `/message` 路径上做校验——它期望这个字段存在且为 string。

## 二、修复方案

**修改 WebSocketService.swift 的 `send(text:)` 和 `sendMessage(_:)` 方法**，将帧中的 `"content"` 改为 `"message"`，与 Gateway 协议对齐。

### 修改 1：send(text:) 

**文件**：`Services/WebSocketService.swift` L198

```swift
// 之前
let frame: [String: Any] = [
    "type": "chat.send",
    "content": text,  // ❌ 错误字段名
    ...
]
// 之后
let frame: [String: Any] = [
    "type": "chat.send",
    "message": text,  // ✅ 正确字段名
    ...
]
```

### 修改 2：sendMessage(_:)

**文件**：`Services/WebSocketService.swift` L221

```swift
// 之前
var frame: [String: Any] = [
    "type": "chat.send",
    "content": msg.content,  // ❌
    ...
]
// 之后
var frame: [String: Any] = [
    "type": "chat.send",
    "message": msg.content,  // ✅
    ...
]
```

## 三、关于反向发文件的说明（用户问题4）

用户询问 OpenClaw 是否能反向发文件给客户端。结论明确：**当前 webchat 渠道的消息工具不支持发送文件附件**。需要 `message` 工具 + 指定 channel recipient + webchat 作为 channel 被识别。目前不具备这些条件。

此项暂不纳入本次修复范围，作为未来增强功能。

## 四、文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `Services/WebSocketService.swift` | 修改 2 处 | `send` 和 `sendMessage` 中 `"content"` → `"message"` |

## 五、验证步骤

1. 编译通过
2. 发送纯文本消息 → 正常回复（验证不破坏现有功能）
3. 发送带附件消息 → 不再报 `must be string` 错误
4. 询问 AI "你能看到我发的图片吗" → 确认 AI 收到附件
