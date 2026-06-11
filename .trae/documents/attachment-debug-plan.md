# 图片/文件发送修复计划 v2

## 一、诊断结论

1. **REST `/api/upload` 端点**：从外部无法连通（timeout），Gateway 只在内网/Tailscale 可用
2. **`message or attachment required` 错误**：Gateway 看到 `content` 字段为空字符串，但**完全没看到 `attachments` 字段**——说明 Gateway 的 schema 不认 `attachments` 这个字段名，或数组格式不对
3. **`at /message: must be string` 错误**：改为 `"message"` 字段后 Gateway 能看到它，但校验失败——说明 Gateway 确实期望某个特定字段名

## 二、修复策略

**Step 1**：添加 JSON 帧日志（一次性的诊断代码），让用户在 Xcode 控制台看到实际发给 Gateway 的完整 JSON。

**Step 2**：发送一个带图的消息 → 控制台打印实际 JSON → 根据实际内容与 Gateway 期望对比，调整帧格式。

## 三、具体修改

### 修改 1：在 WebSocketService.sendMessage 中添加帧日志

**文件**：`Services/WebSocketService.swift`

在 `task.send(.string(jsonString))` 之前加一行 `os_log` 打印完整的 jsonString，让用户能看到实际发出的内容。

### 修改 2（预期）：调整 attachments 的字段名或数据结构

根据日志和 Gateway 响应来调整。可能的方向：
- `"attachments"` → `"attachment"` (已经是这个方向但需验证)
- 将数组改为单个对象
- 改用 `"media"` 字段
- 使用新的 `req`/`res` 协议格式包裹

## 四、验证步骤

1. 编译运行
2. 发一条带图的 Xcode 控制台查看日志中的完整 JSON
3. 根据 JSON 和 Gateway 响应定位具体哪个字段不匹配
4. 修正后验证 AI 能识别图片内容
