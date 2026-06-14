# MyPilot 项目下一步规划（执行计划）

## 优先级排序：B 体验打磨 > A 功能补全 > C 架构增强 > D 新功能

---

## 第一批：B 体验打磨（快速见效）

### B1. 键盘快捷键
- Cmd+Enter 发送消息
- Cmd+K 打开搜索
- Esc 取消流式输出
- 文件：InputBarView.swift, ChatView.swift, ChatViewModel.swift

### B2. 侧边栏未读标记
- AI 回复完成时，若当前不在该 Agent 对话，侧边栏对应 Agent 显示红点
- 切换到该 Agent 后清除红点
- 文件：SidebarView.swift, WebSocketChatFrameHandler.swift, AppState.swift

### B3. 对话清空
- 聊天页面添加"清空对话"按钮（在 ChatHeaderSection 或右键菜单）
- 调用 RPC 清空当前 Agent 对话历史
- 文件：ChatHeaderSection.swift, WebSocketRpcMethods.swift

### B5. 窗口记忆优化
- 记住侧边栏宽度
- 记住最后选中的 Agent，App 重启后恢复
- 文件：SidebarView.swift, AppState.swift

---

## 第二批：A 功能补全

### A1. 消息重新生成
- AI 回复气泡底部添加"重新生成"按钮
- 点击后重新发送最后一条用户消息
- 文件：ChatMessageSection.swift, WebSocketRpcMethods.swift

### A2. 消息复制
- AI 回复气泡底部添加复制按钮（CopyButton 组件已存在）
- 文件：ChatMessageSection.swift

### A3. 对话历史持久化
- 切换 Agent 后保留对话到本地
- App 重启后恢复对话历史
- 文件：AppState.swift, WebSocketService.swift

### A4. 搜索消息功能完善
- SearchPanelView 接入实际搜索 RPC
- 文件：SearchPanelView.swift, WebSocketRpcMethods.swift

---

## 第三批：C 架构增强

### C1. 通知点击跳转对话
- App 从后台激活时，自动跳转到有未读回复的 Agent
- 文件：ChatView.swift, WebSocketChatFrameHandler.swift

### C2. 死代码清理
- 清理未使用的 Repository、GatewayClient、APIService 等
- 文件：多个

### C3. 错误处理统一
- 全局错误提示风格统一
- 网络断连自动重连提示
- 文件：WebSocketService.swift, ConnectionManager.swift

---

## 第四批：D 新功能

### D1. 对话导出
- 导出当前对话为 Markdown 文件
- 文件：ChatView.swift, 新增导出逻辑

### D2. Agent 模板
- 预设 Agent 模板（翻译助手、代码审查等）
- 文件：AgentsManagementView.swift

### D3. 多实例支持
- 同时连接多个 OpenClaw 实例
- 文件：AppState.swift, ConnectionManager.swift（架构调整大）

---

## 执行策略

从第一批 B1 开始，每个任务独立提交。完成后自动进入下一个。
