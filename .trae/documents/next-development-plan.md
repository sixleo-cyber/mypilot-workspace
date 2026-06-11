# MyPilot 下一步开发计划（2026-06-06 更新）

## 当前完成状态

### Phase 1 ✅ 全部完成
- ✅ `/search` 命令
- ✅ Token 进度条
- ✅ 设置页面收尾
- ✅ QR 码配对

### Phase 2 部分完成
- ✅ IM 通信渠道显示和配置添加（替代原"能力插件开关"）
- ❌ Agent 管理页面（仍为占位）
- ❌ 执行权限配置
- ❌ 网页解析配置
- ❌ 定时任务增强

### 仍为占位的页面
1. **AgentsManagementView** — "创建、编辑和删除 Agent，配置 SOUL 文件和能力插件。此功能即将推出"
2. **FileBrowserSettingsView** — "浏览和管理 OpenClaw workspace 目录中的文件。需要安装 node-bridge 插件"
3. **SubscriptionView** — "管理订阅计划和付费功能。此功能即将推出"

---

## 推荐开发顺序

### 优先级 1：Agent 管理页面（Phase 2.1）
**理由**：这是 Should Have 中完成度最低（5%）且最重要的功能。用户需要通过 App 管理 Agent，而不是只能通过命令行。

**实现内容**：
1. 替换 `PlaceholderSettingsPages.swift` 中的 `AgentsManagementView` 占位
2. Agent 列表页：展示所有 Agent（名称 + 模型 + 状态），从 `agents.list` RPC 获取
3. Agent 详情页：查看/编辑 Agent 名称、模型、SOUL 文件
4. 创建 Agent：输入名称 + 选择模型 + 选择 SOUL 模板
5. 删除 Agent：确认弹窗后删除
6. Daemon 侧：新增 `agents.create` / `agents.update` / `agents.delete` RPC 转发

**涉及文件**：
- `Features/Settings/AgentsManagementView.swift` — 新建，替换占位
- `Features/Settings/PlaceholderSettingsPages.swift` — 删除 AgentsManagementView 占位
- `Services/WebSocketService.swift` — 新增 agents CRUD RPC 方法
- `mypilot-link/src/daemon.js` — 新增 3 个 RPC 帧类型转发

### 优先级 2：执行权限配置（Phase 2.3）
**理由**：安全相关功能，用户需要控制 Agent 的文件读写/命令执行/网络访问权限。

**实现内容**：
1. 在 `NetworkSettingsView` 新增"执行权限"Section
2. 从 `config.get` 读取 `agents.defaults.permissions`
3. Toggle 开关：文件读取、文件写入、命令执行、网络访问
4. 修改后通过 `config.set` 写回

**涉及文件**：
- `Features/Settings/NetworkSettingsView.swift` — 新增 Section
- `Services/WebSocketService.swift` — 复用现有 config.get/set

### 优先级 3：定时任务增强（Phase 2.5）
**理由**：当前定时任务列表展示可用，但新建任务 Sheet 功能不完整。

**实现内容**：
1. 完善新建任务 Sheet：Cron 表达式输入 + 预设频率选择（每小时/每天/每周/自定义）
2. Agent 选择下拉
3. 任务内容文本框
4. 调用 CronRepository 提交

**涉及文件**：
- `Features/Settings/ScheduledTasksView.swift` — 完善新建 Sheet

### 优先级 4：消息操作（Phase 3.1）
**理由**：体验优化，用户最常用的操作。

**实现内容**：
1. 右键/长按消息弹出上下文菜单
2. 复制内容（剪贴板）
3. 重新生成（重新发送该消息）
4. 删除（本地 + Gateway 两端）

**涉及文件**：
- `Features/Chat/MessageBubbleView.swift` — 添加 .contextMenu
- `Features/Chat/ChatViewModel.swift` — 新增 regenerate/delete 方法

### 优先级 5：断线重连补发（Phase 3.2）
**理由**：网络稳定性优化，提升用户体验。

**涉及文件**：
- `Services/WebSocketService.swift` — 重连逻辑 + pending 请求补发

---

## 建议立即开发：Agent 管理页面

这是当前最大的功能缺口，完成后 Should Have 完成度将从 41% 提升到约 55%。
