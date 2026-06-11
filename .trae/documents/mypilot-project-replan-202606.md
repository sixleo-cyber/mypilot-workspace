# MyPilot 项目全面规划（2026-06-07 重建）

> 基于完整项目回顾和代码审查，重新梳理项目进度、待修复 Bug、待开发功能，制定清晰的开发路线图。

---

## 一、项目现状总览

### 1.1 项目架构

```
MyPilot App (SwiftUI/macOS) ←WS:52378→ mypilot-link Daemon ←WS:18789→ OpenClaw Gateway
```

- **MyPilotApp**: 51 个 Swift 文件，原生 macOS SwiftUI 应用
- **mypilot-link**: 9 个 JS 文件，Node.js 守护进程（配对/代理/文件服务/搜索管理）
- **设计系统**: v4 Nature Palette（自然色系），完整 Design Token 体系

### 1.2 整体进度（修正后）

| 优先级 | 完成度 | 说明 |
|--------|--------|------|
| 🔴 Must Have (8项) | **90%** | 消息操作缺失，其余基本完成 |
| 🟡 Should Have (9项) | **55%** | Agent管理/IM渠道/执行权限已完成，定时任务增强/网页解析待做 |
| 🟢 Nice to Have (9项) | **10%** | 大部分未开始 |
| **整体** | **约 55%** | |

### 1.3 已完成功能清单

**核心通信层** ✅
- WebSocket 双向通信 + 流式输出（30ms 节流）
- Gateway RPC 代理（agents/models/config/sessions）
- 停止生成（sessions.abort）
- lifecycle end 消息不丢失

**聊天界面** ✅
- 消息气泡（用户/AI 分侧，非对称圆角）
- Markdown 渲染（标题/代码块/表格/引用/分隔线）
- 系统提示词折叠查看
- AI 建议面板（6 条预设）
- 快速设置面板（模型/详细输出/推理/重启/连接状态）
- 角色切换面板
- / 命令菜单（8 条命令含 /search）
- 截屏发送 + 图片压缩
- Token 进度条（绿/黄/红三段）

**附件系统** ✅
- 图片/文档/视频/音频上传和展示
- 图片全屏预览（缩放/拖拽/保存）
- 文档富信息卡片
- AI 生成文件自动检测

**会话管理** ✅
- 创建/切换/删除对话
- 历史消息持久化（本地 JSON）
- 服务端历史加载
- 全文搜索

**多实例管理** ✅
- 添加/删除/切换实例
- 配对码输入 + QR 码配对
- 服务器健康检查

**模型切换** ✅
- 模型列表获取（按供应商分组）
- 模型选择器 UI + 切换执行

**设置页面** ✅
- 侧边栏设置入口
- 6 个子页面入口
- Agent 文件编辑（7 个 md 文件）
- 网络设置（隐私/记忆/搜索服务/执行权限/Gateway 状态）
- IM 通信渠道（7 种渠道展示/详情/添加）
- Agent 管理（列表/详情/创建/删除/文件编辑）
- 用量统计（CPU/RAM/Disk/Token）
- 记忆读取
- 高级设置（子页面导航）
- 2 个占位页面（文件浏览器/订阅）

**设计系统** ✅
- AppColors（Ink暖灰阶 + Amber/Lime/Leaf强调色 + 语义色 + 深色模式）
- AppRadius（sm/md/lg/xl/card/xxl/full）
- AppTypography（heroNumber~nano 共 12 级）
- Spacing（xxs~xxxl 共 8 级）
- 自定义 RoundedCorner Shape（macOS 跨平台非对称圆角）

---

## 二、待修复 Bug 清单（高优先级）

### Bug 1: AI 回复长内容渲染卡顿
- **现象**: AI 回复长内容时出现渲染卡顿，切换会话再回来后正常
- **根因推测**: 流式输出时 MarkdownRenderer 频繁重新解析整个内容，NSCache 虽有但每次 delta 变化导致 block id 变化，VStack 重建开销大
- **修复方案**: 
  1. 流式输出期间使用纯 Text 渲染（不走 Markdown 解析），done 后切换为 MarkdownRenderer
  2. 或对 MarkdownRenderer 添加增量解析：只解析新增 delta 部分
- **涉及文件**: `MessageBubbleView.swift`, `ChatMessageSection.swift`, `MarkdownRenderer.swift`

### Bug 2: Heartbeat 消息弹出
- **现象**: 会话中自动弹出 heartbeat 消息
- **根因**: WebSocketService 收到 heartbeat 类型的帧后没有过滤，直接作为消息显示
- **修复方案**: 在 WebSocketService 的消息接收处理中，过滤 `type: "heartbeat"` / `type: "ping"` / `type: "pong"` 帧
- **涉及文件**: `WebSocketService.swift`

### Bug 3: 搜索服务配置未同步显示
- **现象**: 网络设置中搜索服务显示"未配置"，但实际 openclaw.json 中已配置
- **根因推测**: `fetchSearchSettings()` 优先调用 `/api/settings/search`，该端点可能返回空；回退到 `/api/config` 时解析逻辑可能有问题
- **修复方案**: 
  1. 检查 daemon.js 的 `/api/settings/search` 端点是否正确读取 search-providers 加密存储
  2. 检查 App 端 `fetchSearchSettings` 回退逻辑是否正确解析 openclaw.json 中的 skills.entries
- **涉及文件**: `WebSocketService.swift`, `mypilot-link/src/daemon.js`, `mypilot-link/src/search-providers.js`

### Bug 4: Agent 模型显示"未知模型"
- **现象**: 设置中 Agent 模型显示"未知模型"
- **根因推测**: `Agent.modelDisplayName` 从 `model.primary` 提取短名，但 agents.list RPC 返回的数据结构可能不包含 model 字段，或字段名不匹配
- **修复方案**: 
  1. 检查 agents.list 返回的实际数据结构
  2. 修正 Agent 模型的解码逻辑，兼容多种字段名（model/llm/modelId）
- **涉及文件**: `Agent.swift`, `WebSocketService.swift`

### Bug 5: IM 通信渠道显示"未配置"
- **现象**: IM 通信渠道全部显示"未配置"
- **根因推测**: IMChannelsView 通过 `/api/config` 获取 channels 配置，但解析逻辑可能不匹配实际 openclaw.json 结构
- **修复方案**: 
  1. 检查 openclaw.json 中 channels 的实际结构
  2. 修正 IMChannelsView 的 `parseChannels()` 解析逻辑
- **涉及文件**: `IMChannelsView.swift`

### Bug 6: AI 回复出现在错误会话
- **现象**: 在新会话发消息后切换到别的会话，AI 回复出现在切换后的会话
- **根因**: WebSocketService 的 `pendingCrossConversationMessages` 机制可能未正确匹配 conversationId，或 stream/done 事件未携带 conversationId
- **修复方案**: 
  1. 确保 stream/done 事件携带 conversationId
  2. 在收到消息时严格匹配当前 conversationId，不匹配则存入 pendingCrossConversationMessages
  3. 切换会话时检查 pending 并恢复
- **涉及文件**: `WebSocketService.swift`

### Bug 7: 气泡渲染重叠
- **现象**: AI 回复完后气泡有渲染重叠
- **根因推测**: 流式输出结束后从 StreamingIndicator 切换到 MessageBubble，两者同时存在导致短暂重叠
- **修复方案**: 
  1. 在 done 事件处理中，先添加完整消息到 messages，再清除 streaming 状态
  2. 确保流式内容和最终消息不会同时渲染
- **涉及文件**: `ChatMessageSection.swift`, `WebSocketService.swift`

---

## 三、待开发功能清单

### 3.1 Must Have 剩余（约 10%）

| # | 功能 | 状态 | 工作量 | 说明 |
|---|------|------|--------|------|
| 1 | **消息操作** | 缺 contextMenu | 0.5天 | 右键消息：复制/删除（重新生成暂不做，需 Gateway 支持） |
| 2 | **定时任务增强** | 仅列表 | 1天 | 新建任务 Sheet：Cron 表达式 + 预设频率 + Agent 选择 + 任务内容 |

### 3.2 Should Have 剩余（约 45%）

| # | 功能 | 状态 | 工作量 | 说明 |
|---|------|------|--------|------|
| 3 | **网页解析配置** | 未开始 | 0.5天 | NetworkSettingsView 已有 Toggle，需对接 config.set |
| 4 | **断线重连补发** | 未开始 | 1天 | WebSocket 断线后自动重连 + 补发 pending 请求 |
| 5 | **Agent 真实头像** | 未开始 | 0.5天 | 从 agents.list 提取 avatar URL 并显示 |
| 6 | **Agent 最后消息预览** | 未开始 | 0.5天 | 侧边栏 Agent 行显示最后一条消息摘要 |

### 3.3 Nice to Have（按需开发）

| # | 功能 | 工作量 | 依赖 |
|---|------|--------|------|
| 7 | 文件浏览器 | 2天 | node-bridge 插件 |
| 8 | 深度思考模式 | 1天 | Gateway reasoning RPC |
| 9 | 隐私模式联动 | 0.5天 | Gateway config |
| 10 | 自定义模型服务商 | 1天 | search providers API |
| 11 | 语音通话设置 | 2天 | TTS/STT 插件 |
| 12 | 插件库 | 2天 | Gateway plugins RPC |
| 13 | 订阅管理 | 1天 | 无（占位已有） |
| 14 | 多网络地址管理 | 1天 | 无 |

---

## 四、UI 规范遗留项

以下组件仍使用系统色（`.blue`/`.green`/`.purple`等），需根据 Design System v4 决定是否替换：

| 组件 | 当前颜色 | 建议替换 |
|------|---------|---------|
| ModelPickerView 选中 checkmark | `.blue` | `AppColors.leaf300` |
| ModelPickerView Provider 标签 | `.orange`/`.blue`/`.purple`/`.green` | 保留（功能色，非品牌色） |
| AgentDetailView 模型 popover checkmark | `.blue` | `AppColors.leaf300` |
| QuickSettingsPanel 图标 | `.blue` | `AppColors.leaf300` |
| SuggestionPanel 图标 | `.blue` | `AppColors.amber300` |
| AgentSwitcherPanel 选中圆圈/checkmark | `.blue`/`.gray` | `AppColors.amber300`/`AppColors.ink200` |
| IMChannelDetailView 状态 | `.green`/`.secondary` | `AppColors.leaf300`/`AppColors.ink400` |
| AgentsManagementView Agent 圆圈 | `.blue`/`.purple` | `AppColors.amber300`/`AppColors.lime300` |
| AgentsManagementView 活跃标签 | `.green` | `AppColors.leaf300` |
| DocumentFileCard 图标色 | 硬编码 RGB | 保留（文件类型功能色） |
| VideoAttachmentCard 图标色 | `.purple` | `AppColors.ink500` |
| AudioAttachmentCard 图标色 | `.pink` | `AppColors.amber300` |
| AttachmentPreviewBar 背景 | `Color(.controlBackgroundColor)` | `AppColors.elevatedSurface` |

---

## 五、开发路线图

### Phase 0: Bug 修复（1-2 天）⚡ 最高优先级

```
Day 1:
  ├── Bug 2: Heartbeat 过滤（0.5h）
  ├── Bug 7: 气泡渲染重叠（1h）
  ├── Bug 6: AI 回复错乱会话（2h）
  └── Bug 4: Agent 模型显示"未知"（1h）

Day 2:
  ├── Bug 5: IM 渠道显示"未配置"（1.5h）
  ├── Bug 3: 搜索服务未同步显示（1.5h）
  └── Bug 1: 长内容渲染卡顿（2h）
```

### Phase 1: Must Have 收尾（1.5 天）

```
Day 3:
  ├── 消息操作：复制/删除 contextMenu（0.5天）
  └── UI 规范遗留项修复（0.5天）

Day 4:
  └── 定时任务增强：新建任务 Sheet（1天）
       ├── Cron 表达式输入
       ├── 预设频率选择（每小时/每天/每周/自定义）
       ├── Agent 选择下拉
       └── 任务内容文本框
```

### Phase 2: Should Have 补全（2 天）

```
Day 5:
  ├── 网页解析配置对接（0.5天）
  └── 断线重连补发（1天）
       ├── WebSocket 自动重连（指数退避）
       ├── pending 请求队列
       └── 重连后补发

Day 6:
  ├── Agent 真实头像（0.5天）
  └── Agent 最后消息预览（0.5天）
```

### Phase 3: 体验优化（按需）

```
  ├── 深色模式全面测试
  ├── 消息搜索高亮跳转
  ├── 代码块语法高亮
  ├── 文件拖拽上传
  └── 全局快捷键
```

### Phase 4: Nice to Have（按需开发）

根据实际使用需求，优先级排序：
1. 隐私模式联动（最简单，0.5天）
2. 自定义模型服务商（1天）
3. 深度思考模式（1天）
4. 文件浏览器（2天，需 node-bridge）
5. 插件库（2天）
6. 语音通话（2天，需 TTS/STT）

---

## 六、关键文件索引

### App 端（SwiftUI）
| 文件 | 职责 | 行数 |
|------|------|------|
| `AppState.swift` | 全局状态管理 @Observable | ~300 |
| `WebSocketService.swift` | WS 通信核心 | ~800 |
| `APIService.swift` | HTTP API（配对/上传/配置） | ~200 |
| `ChatView.swift` | 聊天主视图 | ~200 |
| `MessageBubbleView.swift` | 消息气泡+附件+非对称圆角 | ~530 |
| `MarkdownRenderer.swift` | Markdown 解析渲染 | ~330 |
| `InputBarView.swift` | 输入栏（7按钮+药丸输入框） | ~620 |
| `SidebarView.swift` | 侧边栏（实例/Agent/对话） | ~340 |
| `NetworkSettingsView.swift` | 网络设置（隐私/权限/搜索） | ~510 |
| `AgentsManagementView.swift` | Agent CRUD | ~650 |
| `IMChannelsView.swift` | IM 渠道管理 | ~350 |
| `UsageStatsView.swift` | 运行统计 | ~165 |
| `AppColors.swift` | 颜色 Design Token | ~120 |

### Daemon 端（Node.js）
| 文件 | 职责 | 行数 |
|------|------|------|
| `daemon.js` | HTTP+WS 服务 + Gateway 代理 | ~1200 |
| `search-providers.js` | 搜索服务管理（加密存储） | ~300 |
| `device-identity.js` | ED25519 设备密钥 | ~150 |
| `openclaw.js` | OpenClaw 配置检测 | ~100 |

---

## 七、风险与注意事项

1. **Bug 修复需真机验证**: Bug 3/4/5/6 都涉及 daemon ↔ Gateway 协议，需要在实际服务器上测试
2. **定时任务需 CronRepository**: 当前代码中未找到 CronRepository 实现，需新建
3. **断线重连需谨慎**: 重连逻辑不能影响现有正常连接，需充分测试边界情况
4. **UI 规范项需逐个确认**: 部分 Provider 颜色（如文件类型图标色）是功能色而非品牌色，替换需谨慎
5. **不修改已部署代码的素材**: 遵守用户规则，daemon.js 的修改只涉及逻辑，不涉及素材文件

---

## 八、验证标准

### Bug 修复验证
- [ ] Heartbeat 消息不再出现在聊天界面
- [ ] AI 长内容回复无卡顿（>2000字）
- [ ] 切换会话后 AI 回复出现在正确会话
- [ ] 气泡无渲染重叠
- [ ] Agent 模型正确显示（非"未知模型"）
- [ ] IM 渠道正确显示配置状态
- [ ] 搜索服务正确显示配置状态

### 功能验证
- [ ] 右键消息可复制/删除
- [ ] 定时任务可新建（Cron + Agent + 内容）
- [ ] 断线后自动重连并补发
- [ ] 所有页面符合 Design System v4

### 构建验证
- [ ] `xcodebuild` 编译通过，无 error
- [ ] 深色模式下所有页面正常显示
- [ ] 窗口缩放无挤占/溢出
