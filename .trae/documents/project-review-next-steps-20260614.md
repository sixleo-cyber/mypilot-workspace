# MyPilot 项目回顾与下一步规划

## 项目现状总览

### 已完成的核心功能
| 模块 | 状态 | 说明 |
|---|---|---|
| WebSocket 通信 | ✅ 完整 | 拆分为 7 个文件，帧路由+序列化队列 |
| 聊天核心 | ✅ 完整 | 消息收发、流式输出（打字机效果）、BouncingDots 动画 |
| Markdown 渲染 | ✅ 完整 | ParaText/CodeBlock/Table，13px 统一字号+加粗规范 |
| 消息附件 | ✅ 完整 | 文件导入、图片粘贴、截图上传 |
| 多 Agent 管理 | ✅ 完整 | 切换 Agent、Agent 详情/文件/协作关系 |
| 模型选择 | ✅ 完整 | ModelPickerView、QuickSettingsPanel |
| 上下文管理 | ✅ 完整 | 上下文进度条、重启会话 |
| Token 用量统计 | ✅ 完整 | UsageStatsView、GaugeCard |
| 网络设置 | ✅ 完整 | 搜索引擎配置、自定义 Provider |
| IM 通信渠道 | ✅ 完整 | 飞书/企微/钉钉等渠道配置 |
| 诊断中心 | ✅ 完整 | 连接诊断、系统健康、诊断报告 |
| 设计系统 | ✅ 完整 | AppColors/AppTypography/Spacing/SharedComponents 全统一 |
| 消息分页渲染 | ✅ 完整 | 性能优化 |
| 错误处理 | ✅ 完整 | ErrorToast + RPC 超时提示 |

### 占位/未完成功能
| 页面 | 状态 | 说明 |
|---|---|---|
| 订阅管理 (SubscriptionView) | 🔶 占位 | "即将推出"，有 PlanCard UI 但无支付逻辑 |
| 文件浏览器 (FileBrowserSettingsView) | 🔶 半完成 | 有文件列表 UI，但 loadFiles() 可能未对接真实 API |
| 定时任务 (ScheduledTasksView) | 🔶 半完成 | 有 UI 框架，但可能未完全对接 daemon 的定时任务 API |
| 高级设置 (AdvancedSettingsView) | 🔶 导航页 | 仅是其他页面的 NavigationLink 集合 |

### 文件清单
```
Features/Chat/       — 10 文件 (ChatHeaderSection, ChatInputSection, ChatMessageSection, 
                        ChatViewModel, CommandPickerView, MarkdownRenderer, MessageBubbleView,
                        ModelPickerView, QRScannerView, SystemPromptView)
Features/Settings/   — 13 文件 (AboutView, AdvancedSettingsView, AgentFilesView, 
                        AgentsManagementView, DiagnosticsCenterView, DiagnosticsReportBuilder,
                        IMChannelsView, MemoryReadingView, NetworkSettingsView,
                        PlaceholderSettingsPages, ScheduledTasksView, SettingsView, UsageStatsView)
Views/               — 8 文件 (AddInstanceView, ChatView, ContentView, IMETextView,
                        InputBarView, SearchPanelView, SidebarView, WelcomeView)
Services/            — 18 文件 (WebSocket 拆分 7 + APIService, AgentRpcClient, 
                        AttachmentPreparationService, AttachmentTransport, AvatarService,
                        ChatStreamHandler, ConnectionManager, MenuBarManager, 
                        SearchSettingsManager, ServerDiagnostics, ThinkingContentSanitizer)
Models/              — 6 文件 (Agent, AgentFileInfo, Conversation, Instance, Message, ScheduledTask)
SharedComponents/    — ~8 文件 (CardContainer, IconBlock, StatusDot, SettingsRow, 
                        AvatarPickerView, CopyButton, CardStates, ModelPill, DetailTitleView)
Core/                — 3 文件 (AppColors, AppTypography, Spacing)
```

---

## 可选的下一步方向

### 方向 A：功能完善 — 补全占位页面
1. **定时任务完整对接**：ScheduledTasksView 对接 daemon 的 cron API，实现创建/编辑/删除/启停定时任务
2. **文件浏览器真实数据**：FileBrowserSettingsView 对接 daemon 的文件列表 API
3. **搜索面板增强**：SearchPanelView 搜索结果高亮、跳转定位

### 方向 B：体验打磨 — 交互细节优化
1. **消息操作**：长按/右键菜单（复制、重试、删除消息）
2. **键盘快捷键**：Cmd+K 搜索、Cmd+N 新会话、Cmd+, 设置
3. **拖拽排序**：侧边栏会话拖拽排序
4. **消息搜索**：全局搜索历史消息内容
5. **暗色模式验证**：所有 token 已支持 darkHex，但需实际验证暗色模式下的视觉效果

### 方向 C：架构增强 — 稳定性与扩展性
1. **离线消息缓存**：本地持久化消息历史，断线重连后恢复
2. **多窗口支持**：macOS 多窗口打开不同 Agent 会话
3. **通知系统**：Agent 回复完成时的系统通知
4. **自动更新**：Sparkle 集成或自建更新机制

### 方向 D：新功能 — 差异化能力
1. **Agent 市场或模板**：预设 Agent 配置快速创建
2. **对话导出**：导出为 Markdown/PDF
3. **语音输入**：Whisper 本地语音转文字
4. **多实例同时连接**：同时连接多个 OpenClaw 实例

---

## 建议优先级

**短期（立即可做）**：
- B1 消息右键菜单（复制/重试/删除）— 高频操作，体验提升明显
- B2 键盘快捷键 — macOS 用户基本期望
- B5 暗色模式验证 — 设计系统已支持但未实测

**中期（1-2 周）**：
- A1 定时任务完整对接 — 功能闭环
- A2 文件浏览器真实数据 — 功能闭环
- C1 离线消息缓存 — 稳定性基础

**长期**：
- D1-D4 按产品需求排期
