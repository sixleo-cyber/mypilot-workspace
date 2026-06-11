# MyPilot 第三轮修复计划

## 问题概览

1. **流式输出中不应展示 AI 思考过程**，只展示最终回复结果
2. **AI 生成文件后无法回传到 App 端**（done 帧无附件）

---

## 问题1：流式输出隐藏思考过程

### 现状分析

- **OpenClaw Gateway 行为**（来自官方文档）：
  - WebChat 场景下，`isReasoning: true` 标记的回复负载会被自动排除，不会出现在 WebChat 助手内容中
  - 思考内容通过 `done` 帧的 `thinking` / `reasoning_content` 字段传递（当前代码已处理，[WebSocketService.swift:751](file:///Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/WebSocketService.swift#L751)）
  - `/reasoning` 指令支持 `on|off|stream` 三个级别：
    - `off`：不显示思考内容（默认）
    - `on`：思考内容作为单独消息发送，前缀 "Thinking"
    - `stream`：生成时流式推送推理内容，然后发送不含推理的最终答案

- **当前客户端代码**：
  - `stream` 帧处理（[WebSocketService.swift:719-747](file:///Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/WebSocketService.swift#L719)）：只处理 `delta` 字段，没有检查 `isReasoning` 标记
  - `done` 帧处理（[WebSocketService.swift:749-808](file:///Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/WebSocketService.swift#L749)）：提取 `thinking`/`reasoning_content` 存入 `Message.thinkingContent`
  - UI 显示（[MessageBubbleView.swift:123-125](file:///Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Chat/MessageBubbleView.swift#L123)）：当 `thinkingContent` 非空时显示 `ThinkingSection` 可展开区域
  - `reasoningMode` 开关（[WebSocketService.swift:21](file:///Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/WebSocketService.swift#L21)）：发送 `chat.send` 时附加 `"reasoning": ["enabled": true]`

- **问题根因**：
  - 当 `reasoningMode = true` 时，`chat.send` 帧包含 `"reasoning": ["enabled": true]`，这会触发服务端在 `stream` 帧中发送思考内容
  - 当前 `stream` 帧处理没有区分思考内容和最终回复内容——所有 `delta` 都直接累加到 `streamingContent` 中
  - 根据 OpenClaw 文档，`/reasoning stream` 模式下，推理内容会以 `isReasoning: true` 标记的流式帧发送，最终答案不含推理
  - 如果 `stream` 帧带有 `isReasoning: true`，这些 delta 应被过滤掉，不累加到 `streamingContent`

### 修改方案

#### 文件1: `WebSocketService.swift` — stream 帧过滤思考内容

在 `stream` 帧处理中，检查 `isReasoning` 字段，如果为 `true` 则将 delta 累加到 `streamingThinkingContent` 而非 `streamingContent`：

```swift
// 新增属性
private var streamingThinkingContent = ""

case "stream":
    let convId = json["conversationId"] as? String ?? ""
    let effectiveConvId = convId.isEmpty ? (self.activeGenerationConversationId ?? "") : convId
    let isReasoning = json["isReasoning"] as? Bool ?? false
    if let delta = json["delta"] as? String, !delta.isEmpty {
        let filteredDelta = delta
            .replacingOccurrences(of: "HEARTBEAT", with: "")
            .replacingOccurrences(of: "<heartbeat/>", with: "")
            .replacingOccurrences(of: "[HEARTBEAT]", with: "")
            .replacingOccurrences(of: "{\"type\":\"heartbeat\"}", with: "")
        guard !filteredDelta.isEmpty else { return }
        mainAsync { [weak self] in
            guard let self = self else { return }
            guard !self.abortedGeneration else { return }
            self.processingTimeoutTimer?.invalidate()

            if isReasoning {
                // 思考内容 → 累加到 streamingThinkingContent，不显示在主回复中
                self.streamingThinkingContent += filteredDelta
                return
            }

            // 正常回复内容 → 累加到 streamingContent
            guard effectiveConvId == self.currentConversationId else { ... }
            self.streamAccumulator += filteredDelta
            self.scheduleStreamFlush()
        }
    }
```

#### 文件2: `WebSocketService.swift` — done 帧合并思考内容

在 `done` 帧处理中，将流式累积的思考内容与 done 帧的 thinking 字段合并：

```swift
case "done":
    let content = json["content"] as? String ?? ""
    var thinkingContent = json["thinking"] as? String ?? json["reasoning_content"] as? String
    // 合并流式累积的思考内容
    if thinkingContent == nil || thinkingContent!.isEmpty {
        thinkingContent = self.streamingThinkingContent.isEmpty ? nil : self.streamingThinkingContent
    }
    // ... 其余不变
    self.streamingThinkingContent = ""  // 重置
```

#### 文件3: `WebSocketService.swift` — 停止生成和断开时重置

在 `stopGeneration()` 和 `disconnect()` 中重置 `streamingThinkingContent`。

#### 文件4: `MessageBubbleView.swift` — 默认折叠思考过程

当前 `ThinkingSection` 已支持展开/折叠，默认 `isThinkingExpanded = false`，这已经符合需求（思考过程默认折叠，用户可手动展开查看）。

无需修改 UI 代码。

---

## 问题2：AI 生成文件后无法回传到 App 端

### 现状分析

- **已实现的功能**：
  - `chat.send` 帧支持 `attachments` 字段（[WebSocketService.swift:474-481](file:///Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/WebSocketService.swift#L474)）
  - `done` 帧附件 URL 拼接逻辑（[WebSocketService.swift:755-768](file:///Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/WebSocketService.swift#L755)）
  - `MessageAttachment` 模型（[Message.swift:3-49](file:///Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Models/Message.swift#L3)）
  - `ImageAttachmentCard` / `DocumentFileCard` 显示和下载（[MessageBubbleView.swift:288-491](file:///Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Chat/MessageBubbleView.swift#L288)）

- **问题根因**：
  - 用户确认：**done 帧无附件**——AI 生成文件后，`done` 帧的 `attachments` 数组为空
  - 根据 OpenClaw WebChat 文档：`Harnesses that require visible replies through tools.message still use WebChat as a current-run internal source reply sink. A targetless message.send from that active WebChat run is projected into the same chat and mirrored to the session transcript; WebChat does not become a reusable outbound channel and never inherits lastChannel.`
  - 这意味着 AI 通过 `message` 工具发送文件时，文件附件不会出现在 `done` 帧中，而是通过 `message.send` 作为单独的消息投影到聊天中

- **OpenClaw 文档关键信息**：
  - WebChat 使用 `chat.history`、`chat.send`、`chat.inject` 协议
  - AI 的 `message` 工具发送的文件通过 `message.send` 投影，可能作为独立的流式帧或 done 帧到达
  - 文件附件可能通过 `chat.inject` 或独立的 `message` 类型帧发送

### 修改方案

#### 方案：处理 `message` 类型的 WebSocket 帧

OpenClaw Gateway 在 AI 使用 `message` 工具发送文件时，可能通过独立的帧类型（如 `message` 或 `message.send`）推送附件信息。当前代码只处理了 `done` 帧中的 `attachments`，没有处理独立的消息帧。

**文件1: `WebSocketService.swift`** — 新增 `message` 帧类型处理

在 `parseMessage` 的 switch 中新增：

```swift
case "message":
    // AI 通过 message 工具发送的文件/消息
    let content = json["content"] as? String ?? ""
    let rawAttachments = json["attachments"] as? [[String: Any]] ?? []
    var attachments: [MessageAttachment] = []
    let baseURL = self.instance?.effectiveServerURL ?? ""
    for att in rawAttachments {
        let id = att["id"] as? String ?? UUID().uuidString
        let filename = att["filename"] as? String ?? "file"
        var url = att["url"] as? String ?? ""
        if !url.isEmpty && !url.hasPrefix("http") {
            url = baseURL.hasSuffix("/") ? "\(baseURL)\(url)" : "\(baseURL)/\(url)"
        }
        let mimeType = att["mimeType"] as? String ?? "application/octet-stream"
        let size = att["size"] as? Int ?? 0
        attachments.append(MessageAttachment(id: id, filename: filename, url: url, mimeType: mimeType, size: size))
    }
    if !content.isEmpty || !attachments.isEmpty {
        mainAsync { [weak self] in
            guard let self = self else { return }
            self.messages.append(Message(content: content, isFromUser: false, attachments: attachments))
            self.onMessagePersist?()
        }
    }
```

**文件2: `WebSocketService.swift`** — 增加日志以诊断实际帧格式

在 `parseMessage` 入口添加未识别帧类型的日志，以便诊断 AI 发送文件时 Gateway 实际推送的帧格式：

```swift
default:
    print("[WS] ← unhandled frame type: \(type), keys: \(json.keys.sorted().joined(separator: ", "))")
```

这样当 AI 生成文件时，可以在控制台看到实际的帧类型和字段，便于后续精确处理。

---

## 实施步骤

1. **WebSocketService.swift** — 新增 `streamingThinkingContent` 属性
2. **WebSocketService.swift** — `stream` 帧处理：检查 `isReasoning`，分流思考内容
3. **WebSocketService.swift** — `done` 帧处理：合并流式思考内容，重置 `streamingThinkingContent`
4. **WebSocketService.swift** — `stopGeneration()` 和断开连接时重置 `streamingThinkingContent`
5. **WebSocketService.swift** — 新增 `message` 帧类型处理（文件回传）
6. **WebSocketService.swift** — 未识别帧类型添加日志
7. **验证**：编译通过 + 测试思考内容过滤 + 测试文件回传帧捕获

## 假设与决策

- **假设1**：OpenClaw Gateway 在 `/reasoning stream` 模式下，思考内容的 stream 帧带有 `isReasoning: true` 字段。如果实际帧格式不同（如使用 `thinking` 字段或 `type: "reasoning"`），需要根据日志调整。
- **假设2**：AI 生成文件后，Gateway 通过 `message` 类型帧推送附件。如果实际帧类型不同（如 `message.send`、`tool.result` 等），需要根据日志调整。
- **决策**：思考过程仍然保存在 `Message.thinkingContent` 中，UI 默认折叠，用户可展开查看。不删除思考内容，只是不在流式输出中展示。

## 验证步骤

1. 编译通过（`⌘B`）
2. 开启 `reasoningMode`，发送消息，验证流式输出中不显示思考内容
3. 查看控制台日志，确认思考内容被正确分流到 `streamingThinkingContent`
4. AI 回复完成后，验证 `ThinkingSection` 可展开查看思考过程
5. 让 AI 生成文件（如图片），查看控制台日志中 `unhandled frame type` 或 `message` 帧的输出
6. 根据实际帧格式调整 `message` 帧处理逻辑
