# MyPilot 功能清单与测试状态

> **用途**：每次开发前必读此文档，核对已测试通过的功能，避免把已工作的功能改坏。
> **更新规则**：每次功能测试通过/失败后，更新对应行状态。
> **状态定义**：✅ 已测试通过 | ⚠️ 有 bug | 🔧 开发中 | 🚫 占位未实现

---

## 一、聊天核心

| # | 功能 | 文件 | 测试状态 | 备注 |
|---|------|------|---------|------|
| 1 | WebSocket 连接/断开/重连 | ConnectionManager.swift | ✅ | 指数退避+心跳 |
| 2 | 发送文本消息 | ChatViewModel.swift → wsService.send() | ✅ | |
| 3 | 发送带附件消息 | ChatViewModel.swift → wsService.sendMessage() | ✅ | |
| 4 | 流式消息渲染（单路，无重复字符） | ChatStreamHandler.swift | ✅ | v6 修复 |
| 5 | AI 消息气泡（Markdown 渲染） | MessageBubbleView.swift / MarkdownRenderer.swift | ✅ | |
| 6 | 用户消息气泡 | MessageBubbleView.swift | ✅ | |
| 7 | 思考过程展示 + 坏数据过滤 | MessageBubbleView.swift (isLikelyCorruptThinking) | ✅ | v5 加防御 |
| 8 | 附件卡片（图片/文档/视频/音频） | MessageBubbleView.swift | ✅ | |
| 9 | 图片全屏预览（缩放/拖拽/保存） | MessageBubbleView.swift (ImagePreviewView) | ✅ | |
| 10 | 附件上传（HTTP 优先 + base64 fallback） | ChatView.swift + APIService | ✅ | |
| 11 | 图片压缩（>1024px） | ChatView.swift | ✅ | |
| 12 | 拖放文件上传 | ChatView.swift | ✅ | |
| 13 | AI 生成文件自动检测（workspace diff） | WebSocketService.swift | ✅ | |
| 14 | 停止生成 | wsService.stopGeneration() | ✅ | |
| 15 | 重置聊天 | wsService.resetChat() | ✅ | |
| 16 | 重试失败消息 | wsService.retryMessage() | ✅ | |
| 17 | 消息 ContextMenu（复制/删除/重发） | MessageBubbleView.swift | ✅ | |
| 18 | 投递状态图标 | MessageBubbleView.swift | ✅ | |
| 19 | 8 条 / 指令 | ChatInputSection.swift + CommandPickerView.swift | ✅ | /models /model /reasoning /verbose /status /commands /help /restart |
| 20 | AI 建议面板（6 条） | InputBarView.swift (SuggestionPanel) | ✅ | |
| 21 | 快速设置面板 | InputBarView.swift (QuickSettingsPanel) | ✅ | |
| 22 | Agent 切换面板 | InputBarView.swift (AgentSwitcherPanel) | ✅ | |
| 23 | Token 进度条 | ChatHeaderSection.swift (TokenUsageBar) | ✅ | |
| 24 | 模型选择器（按 provider 分组） | ModelPickerView.swift | ✅ | |
| 25 | 系统提示词折叠 | SystemPromptView.swift | ✅ | |
| 26 | 延迟监控 | ChatHeaderSection.swift | ✅ | REST /api/health |
| 27 | 导出聊天（Markdown/JSON） | ChatHeaderSection.swift | ✅ | |
| 28 | 断开连接横幅 | ChatView.swift (DisconnectedBanner) | ✅ | |
| 29 | 打字光标动画 | ChatMessageSection.swift (TypingCursor) | ✅ | |

---

## 二、会话与多实例

| # | 功能 | 文件 | 测试状态 | 备注 |
|---|------|------|---------|------|
| 30 | 创建/切换/删除会话 | AppState.swift + SidebarView.swift | ✅ | 删除会话清 WebSocket runtime state |
| 31 | 本地消息持久化 | AppState.swift (Messages/conv-{id}.json) | ✅ | 跨会话消息即时落盘 |
| 32 | 服务端历史加载 | wsService.requestHistory() | ✅ | 支持附件与 thinking 恢复 |
| 33 | 历史消息全文搜索 | AppState.swift + SearchPanelView.swift | ✅ | 过滤已删除会话 |
| 34 | 多实例添加/删除/切换 | AppState.swift + SidebarView.swift | ✅ | |
| 35 | 配对码输入 | AddInstanceView.swift | ✅ | |
| 36 | QR 码扫描配对 | QRScannerView.swift + AddInstanceView.swift | ✅ | |
| 37 | 服务器健康检查 | AddInstanceView.swift → /api/health | ✅ | |
| 38 | 对话重命名 | SidebarView.swift | ✅ | |

---

## 三、Agent 管理

| # | 功能 | 文件 | 测试状态 | 备注 |
|---|------|------|---------|------|
| 39 | Agent 列表 | AgentsManagementView.swift → agents.list | ✅ | |
| 40 | Agent 切换 | ChatViewModel.swift → switchAgent() | ✅ | |
| 41 | Agent 创建 | AgentsManagementView.swift → agents.create | ✅ | |
| 42 | Agent 删除 | AgentsManagementView.swift | ✅ | |
| 43 | Agent 重命名 | AgentsManagementView.swift → agents.update | ✅ | |
| 44 | Agent 模型切换 | ModelPickerView.swift → agent.model.set | ✅ | |
| 45 | Agent 7 文件编辑保存 | AgentFilesView.swift → agents.files.get/set/list | ✅ | SOUL/AGENTS/IDENTITY/USER/TOOLS/HEARTBEAT/MEMORY.md |

---

## 四、网络设置

| # | 功能 | 文件 | 测试状态 | 备注 |
|---|------|------|---------|------|
| 46 | Gateway 地址配置 | NetworkSettingsView.swift | ✅ | |
| 47 | 多地址管理 | NetworkSettingsView.swift (InstanceAddress) | ✅ | |
| 48 | 连接测试 | NetworkSettingsView.swift → /api/health | ✅ | |
| 49 | 隐私模式开关 | NetworkSettingsView.swift → config.set privacyMode | ✅ | AppStorage fallback |
| 50 | 记忆功能开关 | NetworkSettingsView.swift → config.set memoryEnabled | ✅ | AppStorage fallback |
| 51 | 命令执行开关 | NetworkSettingsView.swift → config.set commands.native | ✅ | boolean 值，v4 修 |
| 52 | 网页抓取开关 | NetworkSettingsView.swift → config.set tools.web.fetch.enabled | ✅ | |
| 53 | 搜索服务配置 | NetworkSettingsView.swift + SearchSettingsManager | ✅ | v3 修 isConfigured |
| 54 | 搜索同步说明文案 | NetworkSettingsView.swift | ✅ | v4 加 |
| 55 | 服务器诊断 | NetworkSettingsView.swift → /api/info, /api/logs | ✅ | |
| 56 | 配置读取（REST /api/config） | NetworkSettingsView.swift | ✅ | |
| 57 | 危险区（重置配置） | NetworkSettingsView.swift | ✅ | |

---

## 五、IM 通信渠道

| # | 功能 | 文件 | 测试状态 | 备注 |
|---|------|------|---------|------|
| 58 | IM 渠道列表展示 | IMChannelsView.swift → /api/config | ✅ | v3 修解析 |
| 59 | 渠道详情 | IMChannelsView.swift (IMChannelDetailView) | ✅ | |

---

## 六、定时任务

| # | 功能 | 文件 | 测试状态 | 备注 |
|---|------|------|---------|------|
| 60 | 定时任务列表 | ScheduledTasksView.swift | ✅ | daemon 优先 + UserDefaults fallback |
| 61 | 创建定时任务 | ScheduledTasksView.swift → TaskEditSheet | ✅ | schedule.create |
| 62 | 编辑定时任务 | ScheduledTasksView.swift → TaskEditSheet | ✅ | schedule.update |
| 63 | 删除定时任务 | ScheduledTasksView.swift | ✅ | schedule.delete |
| 64 | 暂停/启用任务 | ScheduledTasksView.swift (toggleTask) | ✅ | schedule.update(isEnabled) |
| 65 | 手动触发任务 | ScheduledTasksView.swift → schedule.run | ✅ | daemon scheduler 执行路径 |
| 66 | Cron 预设频率选择 | TaskEditSheet.swift | ✅ | |
| 67 | 自定义 Cron 表达式 | TaskEditSheet.swift | ✅ | |
| 68 | Agent 选择 | TaskEditSheet.swift | ✅ | |
| 69 | daemon 定时调度执行 | scheduler.js | ✅ | schedule.run / cron 均走 scheduler |

---

## 七、其他设置页

| # | 功能 | 文件 | 测试状态 | 备注 |
|---|------|------|---------|------|
| 70 | 记忆文件列表 | MemoryReadingView.swift | ✅ | |
| 71 | 技能列表与查看 | MemoryReadingView.swift | ✅ | |
| 72 | 运行统计（系统健康） | UsageStatsView.swift | ✅ | |
| 73 | Token 用量统计 | UsageStatsView.swift | ✅ | |
| 74 | 文件浏览器 | PlaceholderSettingsPages.swift | ✅ | /api/workspace-files |
| 75 | 通话设置 | PlaceholderSettingsPages.swift | ⏳ | 占位页（即将推出徽标） |
| 76 | 订阅管理 | PlaceholderSettingsPages.swift | ⏳ | 占位页（即将推出徽标+免责文案） |

---

## 八、App 基础设施

| # | 功能 | 文件 | 测试状态 | 备注 |
|---|------|------|---------|------|
| 77 | 深色模式 | MyPilotApp.swift | ✅ | AppStorage("mypilot-dark-mode") |
| 78 | 窗口尺寸记忆 | MyPilotApp.swift | ✅ | |
| 79 | 菜单栏状态图标 | MenuBarManager.swift | ✅ | |
| 80 | 菜单快捷键（Cmd+N/F/R） | MyPilotApp.swift | ✅ | |
| 81 | 欢迎引导页 | WelcomeView.swift | ✅ | |
| 82 | 设计系统 Nature Palette v4 | AppColors/AppTypography/AppRadius/Spacing | ✅ | |

---

## 九、daemon 端功能

| # | 功能 | 文件 | 测试状态 | 备注 |
|---|------|------|---------|------|
| 83 | HTTP + WSS 服务 (port 52378) | daemon.js | ✅ | |
| 84 | Gateway 握手认证 | daemon.js (challenge-response) | ✅ | |
| 85 | 设备配对（生成/验证码） | connect-token.js + /api/pair/* | ✅ | |
| 86 | 心跳保活 (25s ping / 20s pong timeout) | daemon.js | ✅ | |
| 87 | 指数退避重连 | daemon.js | ✅ | |
| 88 | 风暴检测（5min 8次 → 3min 冷却） | daemon.js | ✅ | |
| 89 | chat.send 流式推送（单路） | daemon.js | ✅ | v6 修双路 |
| 90 | config.get/set key-based | daemon.js (handleConfigSetByKey) | ✅ | v5 修 |
| 91 | App 端 res 帧识别 | WebSocketService.swift (case "res":) | ✅ | v5 修 |
| 92 | 搜索 provider 单向同步 | search-providers.js | ✅ | |
| 93 | 文件上传/下载 | daemon.js /api/upload, /api/file/* | ✅ | |
| 94 | 工作区文件浏览 | daemon.js /api/workspace-files | ✅ | |
| 95 | /api/health | daemon.js | ✅ | |
| 96 | /api/info | daemon.js | ✅ | |
| 97 | /api/logs | daemon.js | ✅ | |
| 98 | /api/config | daemon.js | ✅ | |
| 99 | 搜索服务 HTTP API | daemon.js /api/settings/search/* | ✅ | |
| 100 | Gateway Stats HTTP 代理 | daemon.js /stats/* | ✅ | |
| 101 | 定时任务调度器 (cron-parser + setTimeout) | scheduler.js | ✅ | node:test 覆盖 create/update/delete/list/run 成功/失败 |
| 102 | schedule.* RPC | daemon.js | ✅ | App 已对接 list/create/update/delete/run |

---

## 十、已知技术债

| # | 问题 | 影响 | 优先级 |
|---|------|------|--------|
| T1 | WebSocketService 深度拆分完成：SearchSettingsManager 移出独立文件 + 7 个 handler 方法（processing/stream/done/error/taskStatus/taskNotify/message），parseMessage 全部 case 为单行调用，核心文件 944 行 | 仍可继续拆 FrameRouter/runtime state | P3 |
| T2 | Swift Tests 已覆盖 AppState/消息可靠性/状态映射/会话持久化/诊断脱敏，仍需真实断网/重连端到端回归 | 仍需真实端到端回归 | P2 |
| T3 | daemon node:test 已覆盖 search-providers 业务逻辑（83 tests），HTTP API 和 WebSocket 协议层仍无测试 | 需持续补 HTTP/WS 协议场景 | P2 |
| T4 | 附件协议已统一，需补真实端到端大文件/多文件场景 | 仍需持续覆盖复杂附件回归 | P3 |
| T5 | package/ 和 mypilot-link/ 双线边界已标记，需发布前持续执行主线确认 | 仍需防止跨线同步遗漏 | P3 |
| T6 | 诊断中心已增强：一键复制/Gateway步骤化建议/daemon连接排查/目录修复建议/运行线警告醒目化，仍可迭代 | 排障能力仍可增强 | P2 |
| T7 | mypilot-link 已补齐 release/preinstall/check-node-version 脚本，仍缺 CI/CD 和 macOS 签名公证流程 | 需 CI 自动化 + macOS 分发链路 | P2 |

---

## 十一、Bug 修复历史

| 版本 | 日期 | 修复内容 | 影响 |
|------|------|---------|------|
| v3 | 06-09 | 权限路径改 Gateway 真实字段；搜索 isConfigured 判断 | #49-53 |
| v4 | 06-09 | commands.native boolean 映射；隐藏 tools.profile；搜索同步文案 | #51, #54 |
| v5 | 06-09 | App 加 case "res": 帧处理；isLikelyCorruptThinking 过滤 | #7, #91 |
| v6 | 06-09 | daemon 关闭 agent.stream 双路推送；lifecycle end 超时 30s | #4, #89 |
| v7 | 06-10 | ScheduledTasksView 恢复 UserDefaults + sendMessage 触发 | #60-68 |
| v10 | 06-10 | 附件协议统一收尾：拖拽/选择一致、done/message/history 附件解析统一、daemon 附件回归 | T4 |
| v11 | 06-10 | 会话稳定闭环：跨会话即时落盘、删除会话清 runtime state、搜索过滤已删除会话 | #30-33 |
| v12 | 06-10 | 部署边界收敛：mypilot-link 标为 MyPilot 主线，package 标为 ClawPilot 发布包线，诊断中心显示运行线 | T5 |
| v13 | 06-10 | 诊断脱敏增强：页面展示与导出报告统一脱敏 Bearer、API key、URL query 和环境变量风格密钥 | T6 |
| v14 | 06-10 | 消息可靠性补测：断线 failed 标记、AI 响应中 queued、MessageDeliveryStatus terminal 与 task.status 映射 | T2 |
| v15 | 06-10 | WebSocketService 保守小拆：抽非终态失败标记 helper，拆 task.status/task.notify/message handler | T1 |
| v16 | 06-10 | WS 第二阶段拆分：移出 SearchSettingsManager 到独立文件、抽 handleStreamFrame/handleProcessingFrame | T1 |
| v17 | 06-10 | AppState 测试增强：新增 AppStateTests.swift（11 项：CRUD/preview/搜索/幂等创建/消息持久化往返） | T2 |
| v18 | 06-10 | daemon 测试增强：search-providers 业务逻辑测试 15 项 + daemon-utils 边界测试 10 项（83 total） | T3 |
| v19 | 06-10 | 诊断中心体验增强：一键复制关键信息、Gateway 未连接步骤化建议、daemon 无法连接排查卡片、目录问题修复建议、运行线警告醒目化 | T6 |
| v20 | 06-10 | 占位页收敛：通话设置/订阅管理添加"即将推出"醒目徽标 + 免责文案 | #75-76 |
| v21 | 06-10 | mypilot-link 发布脚本补齐：release/preinstall/check-node-version.mjs | T7 |
| v22 | 06-10 | WS 深度拆分：抽取 handleDoneFrame + handleErrorFrame，parseMessage 全部 7 个 case 均为单行调用 | T1 |
| v23 | 06-10 | SearchSettingsManager 测试补齐：新增 SearchSettingsManagerTests.swift（10 项：fallback 路径/已知 provider 映射/往返测试） | T2 |

---

## 十二、UserDefaults / AppStorage Key 汇总

| Key | 类型 | 用途 | 文件 |
|-----|------|------|------|
| `instances` | Data | 实例列表 | AppState.swift |
| `mypilot-dark-mode` | Bool | 深色模式 | MyPilotApp.swift |
| `mypilot-window-width/height/x/y` | Double | 窗口尺寸 | MyPilotApp.swift |
| `config.privacyMode` | Bool | 隐私模式 | NetworkSettingsView.swift |
| `config.memoryEnabled` | Bool | 记忆功能 | NetworkSettingsView.swift |
| `scheduledTasks` | Data | 定时任务 | ScheduledTasksView.swift |
