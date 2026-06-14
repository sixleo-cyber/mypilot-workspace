# MyPilot 项目下一步规划

## 现状总结

### 已完成
- **设计规范落地**：AppColors/AppTypography/AppRadius/Spacing token 体系，全页面审计通过
- **流式输出体验**：打字机效果、BouncingDots 水流感动画、自动滚动、Markdown 实时渲染
- **通知系统**：osascript 通知 + Dock 弹跳 + 未读徽章 + 侧边栏未读红点
- **键盘快捷键**：Cmd+Enter 发送、Cmd+K 搜索、Esc 取消流式
- **对话管理**：清空对话、侧边栏宽度/最后 Agent 记忆
- **文件浏览器**：刷新按钮同步远端文件列表
- **消息持久化**：按 conversationId 存 JSON，切换时保存/恢复
- **上下文菜单**：右键复制内容/思考内容/附件链接，删除消息

### 待完成（按优先级排序）

---

## P1：体验打磨（高价值、低成本）

### 1. AI 消息重新生成
**现状**：`retryMessage()` 仅处理用户消息失败重试（`guard msg.isFailed`），AI 回复无重新生成入口
**方案**：
- 在 `MessageBubble` 的 AI 消息区域，hover 时显示"重新生成"按钮（仅最后一条 AI 消息）
- 点击后：删除该 AI 回复 → 重新发送其前一条用户消息
- 新增 `regenerateLastReply()` 方法到 `WebSocketMessageSending.swift`
- **文件**：`MessageBubbleView.swift`、`WebSocketMessageSending.swift`、`ChatMessageSection.swift`

### 2. AI 消息复制按钮（hover 显示）
**现状**：右键菜单有"复制内容"，但无 hover 可见的快捷按钮；`CopyButton` 组件已存在但未在气泡中使用
**方案**：
- AI 气泡 hover 时在右下角显示 CopyButton（与时间戳同行）
- 用户气泡同理
- **文件**：`MessageBubbleView.swift`

### 3. 消息操作栏（hover 浮层）
**现状**：操作分散在右键菜单，不够直观
**方案**：
- AI 消息 hover 时显示轻量操作栏：复制 + 重新生成（最后一条）+ 删除
- 用户消息 hover 时显示：复制 + 重试（失败时）+ 删除
- 操作栏样式：半透明背景，紧贴气泡底部
- **文件**：`MessageBubbleView.swift`

---

## P2：功能补全

### 4. 对话导出
**现状**：无导出功能
**方案**：
- ChatHeaderSection 菜单添加"导出对话"选项
- 支持 Markdown 格式导出（含思考内容折叠块）
- 使用 NSSavePanel 选择保存位置
- **文件**：`ChatHeaderSection.swift`、新增 `ConversationExporter.swift`

### 5. 搜索消息功能完善
**现状**：SearchPanelView 存在但功能有限，Cmd+K 可触发
**方案**：
- 搜索范围：当前对话消息内容（本地搜索）
- 搜索结果高亮定位（已有 `highlightedMessageId` 机制）
- 支持搜索思考内容
- **文件**：`SearchPanelView.swift`、`ChatMessageSection.swift`

---

## P3：架构增强

### 6. 通知点击跳转对话
**现状**：通知 userInfo 包含 agentId，但 `switchConversation` 通知处理未完整实现
**方案**：
- 确认 `MyPilotApp.swift` 中 `didReceive` 处理是否正确触发 `.switchConversation`
- 确保 `ContentView` 监听 `.switchConversation` 后切换到对应 Agent
- **文件**：`MyPilotApp.swift`、`ContentView.swift`

### 7. 错误处理统一
**现状**：错误处理分散，部分用 print，部分用 showError
**方案**：
- 统一错误展示：连接断开、发送失败、RPC 超时等场景
- 错误消息内联显示在对话中（类似系统消息样式）
- **文件**：`WebSocketService.swift`、`WebSocketChatFrameHandler.swift`

### 8. 死代码清理
**方案**：
- 检查未使用的 import、方法、属性
- 清理调试 print 语句（保留关键日志）
- **文件**：全项目扫描

---

## P4：新功能（远期）

### 9. Agent 模板/预设
- 预定义 Agent 配置模板，快速创建新 Agent

### 10. 多实例支持
- 同时连接多个 OpenClaw 实例

---

## 推荐执行顺序

**第一批**（1-3，体验打磨，约 2-3 小时）：
1. AI 消息重新生成
2. AI 消息复制按钮
3. 消息操作栏（hover 浮层）

**第二批**（4-5，功能补全，约 2 小时）：
4. 对话导出
5. 搜索消息完善

**第三批**（6-8，架构，约 1-2 小时）：
6. 通知点击跳转
7. 错误处理统一
8. 死代码清理

---

## 实施细节

### 1. AI 消息重新生成

**WebSocketMessageSending.swift** 新增：
```swift
func regenerateLastReply() {
    mainAsync {
        guard !self.isAiResponding else { return }
        // 找到最后一条 AI 回复
        guard let lastAiIdx = self.messages.lastIndex(where: { !$0.isFromUser && !$0.isSystem }) else { return }
        // 找到该 AI 回复之前的用户消息
        let userMessages = self.messages[..<lastAiIdx].filter { $0.isFromUser }
        guard let lastUserMsg = userMessages.last else { return }
        // 删除 AI 回复
        self.messages.remove(at: lastAiIdx)
        self.onMessagePersist?()
        // 重新发送用户消息
        self.send(text: lastUserMsg.content)
    }
}
```

**MessageBubbleView.swift** AI 消息区域新增：
- 传入 `isLastAiMessage: Bool` 参数
- hover 时在时间戳旁显示"重新生成"按钮（仅最后一条 AI 消息且非流式中）

### 2. AI 消息复制按钮

**MessageBubbleView.swift** 修改：
- AI 气泡 hover 时在时间戳行显示 `CopyButton(text: message.content)`
- 用户气泡同理

### 3. 消息操作栏

**MessageBubbleView.swift** 修改：
- 提取 `MessageActionBar` 组件
- hover 时在气泡下方显示半透明操作栏
- AI 消息：复制 + 重新生成（最后一条）+ 删除
- 用户消息：复制 + 重试（失败时）+ 删除
