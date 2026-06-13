# P13: 下一步开发规划

## 当前状态

### 已完成（P1-P12）
- P1-P4: 基础框架、消息流、WebSocket、测试
- P5-P7: Bug 修复、稳定性
- P8: AboutView、版本号、测试
- P9: Agent 头像本地编辑、子 Agent 创建
- P10: conversationId 隔离、删除修复
- P11: AGENTS.md 协作可视化、Agent 创建通知、工具调用状态
- P12: 消息可靠性 + 错误处理（统一 ErrorToast、RPC 超时/断连提示、重连补齐消息）
- 远端 daemon 部署到 118.145.240.41

### 待完成项（按优先级）

| # | 方向 | 优先级 | 说明 |
|---|------|--------|------|
| 1 | UI iMessage 风格落地 | 高 | HTML 原型 V10 已验证，需落地 SwiftUI |
| 2 | 历史会话搜索 UI 优化 | 中 | 功能已实现，UI 待优化 |
| 3 | 附件体验增强 | 中 | 拖拽上传、粘贴图片 |
| 4 | 用量统计 | 低 | Token 消耗图表 |
| 5 | 性能优化 | 低 | 长消息列表虚拟化 |
| 6 | App 打包 | 低 | 自签或 TestFlight |

## 建议下一步：P13 UI iMessage 风格落地

### 理由
- 用户在之前对话中明确偏好 iMessage 风格软 UI
- HTML 原型 V10 已完成验证，设计方向明确
- 这是体验核心，影响用户每天的使用感受
- 当前 SwiftUI 代码还是早期样式，与 iMessage 风格差距较大

### 已验证的设计规范（V10）
- 纯白背景 #FFFFFF（无渐变）
- iMessage 风格气泡圆角（用户: 18px 18px 4px 18px，AI: 18px 18px 18px 4px）
- 字号 16px，行高自然
- 无阴影、无毛玻璃
- 消息间距 gap 2px
- 侧边栏纯白，搜索框/按钮用 #F5F5F7
- 自然色系（leaf-300 #0DA945, lime-300 #ACCE22, amber-300 #F6AD02）
- 中英混排自然换行：`overflow-wrap: break-word; word-break: normal`

### 涉及文件
1. `MessageBubbleView.swift` — 气泡圆角、背景色、字号
2. `ChatMessageSection.swift` — 消息间距、布局
3. `SidebarView.swift` — 纯白背景、搜索框样式
4. `ChatHeaderSection.swift` — 标题栏样式
5. `InputBarView.swift` / `ChatInputSection.swift` — 输入区样式
6. `AppColors.swift` / `AppTypography.swift` — 色彩/字体常量

### 实施步骤
1. 更新 AppColors + AppTypography 常量匹配 iMessage 规范
2. 改造 MessageBubbleView 气泡样式
3. 改造 ChatMessageSection 消息列表布局
4. 改造 SidebarView 侧边栏样式
5. 改造 ChatHeaderSection + InputBarView
6. 编译验证 + 视觉对比
