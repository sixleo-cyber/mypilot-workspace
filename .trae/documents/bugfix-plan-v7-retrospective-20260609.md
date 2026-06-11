# MyPilot 项目复盘 + 下一阶段开发计划（2026-06-09）

## 一、项目愿景速览

**项目代号**：MyPilot
**最终目标**：构建 **100% 私有化、自部署、自掌控** 的 ClawPilot 等价物 — 在 iPad/Mac 原生 App 上对话和管理用户自己服务器上的多个 OpenClaw 实例，数据不经过任何第三方。
**架构**：
```
iPad/Mac App (SwiftUI)
   ↕ WebSocket
mypilot-link daemon (Node.js, 端口 52378)
   ↕ ws+http
OpenClaw Gateway (用户自有服务器)
```
**特色差异化**：多 OpenClaw 实例管理（ClawPilot 官方没有）。

---

## 二、开发进度复盘

### 2.1 整体完成度估算

| 优先级 | 完成度 | 备注 |
|--------|--------|------|
| Must Have（10 项） | **95%** | 仅"定时任务"未真正联通 |
| Should Have（9 项） | **60%** | 145 个能力插件未做、订阅/通话占位 |
| Nice to Have（9 项） | **15%** | 文件浏览器已实，其余基本未启动 |

### 2.2 已完成的功能模块（稳定可用）

**通信与流式**
- WebSocket 双向通信 + 30ms 节流流式输出 + heartbeat + 指数退避重连
- Gateway RPC 代理（agents.list / models.list / config.get|set / sessions.abort / chat.history）
- v6 修复后 stream 单路推送，无重复字符 ✅

**聊天界面**
- 用户/AI 非对称气泡 + Markdown 渲染（MarkdownUI）
- 8 条 `/` 指令（/models /model /reasoning /verbose /status /commands /help /restart）
- ContextMenu（复制内容/思考/附件链接 / 重发 / 删除）
- 系统提示词折叠、AI 建议、快速设置、角色切换
- Token 进度条三段着色
- 截屏/图片压缩、附件上传双协议（HTTP 优先 + base64 fallback）
- AI 生成文件自动检测（workspace diff）
- 思考过程渲染（含 v5 增加的 `isLikelyCorruptThinking` 防御过滤）

**会话与多实例**
- 创建/切换/删除会话、本地 JSON 持久化、服务端历史加载、全文搜索
- 多实例添加/删除/切换 + 配对码输入 + **QR 码扫描配对** + 健康检查

**模型与 Agent**
- 模型列表（按 provider 分组）+ 选择器 + 切换执行
- Agent 完整 CRUD（创建/删除/重命名/换模型 + 7 个 md 文件编辑）

**设置框架**（10 个页面）
- NetworkSettings（隐私/记忆/搜索/执行权限/Gateway/危险区） — v6 已修
- IMChannels（7 渠道展示/详情/添加） — v3 已修
- AgentsManagement（列表/详情/CRUD/文件编辑） — 稳定
- AgentFiles（7 md 文件编辑保存） — 稳定
- MemoryReading、UsageStats、AdvancedSettings、FileBrowser — 稳定
- 搜索服务同步说明文案（v4 已加） ✅

**Daemon（mypilot-link）**
- HTTP + WSS 服务、设备配对（pair token + signature）
- Gateway 握手（hello / connect / nonce / sig）
- chat 流式协议（v6 单路收敛） ✅
- config.get/set 支持 key-based 路径（v5 加 `case "res":` 修复回调链路）✅
- 搜索 provider 单向同步 OpenClaw（init 时一次）
- LAN IPv4 嗅探、autostart launch agent、heartbeat、pong timeout
- `/api/health`、`/api/upload`、`/api/workspace-file/*`

**设计系统**：Nature Palette v4（AppColors / AppRadius / AppTypography / Spacing 全套）

### 2.3 近期 Bug 修复历史（v3 → v6）

| 版本 | 日期 | 主要修复 |
|------|------|---------|
| v3 | 06-09 | 权限路径改 Gateway 真实字段；思考过程 thinking content 处理；搜索服务 `isConfigured` 判断 |
| v4 | 06-09 | `commands.native` 值映射错误（"allow" → boolean）；隐藏 `tools.profile` 无效开关；搜索区底部加同步提示 |
| v5 | 06-09 | **根因**：App 缺 `case "res":` 帧处理 → daemon res 响应被丢弃；增加 `isLikelyCorruptThinking` 渲染过滤 |
| v6 | 06-09 | **根因**：daemon `agent.stream` 与 `chat.delta` 双路推送同样内容 → 词级重复；关闭 agent.stream 推送、lifecycle end 超时 5s→30s |

### 2.4 进行中 / 未完成功能

| 功能 | 状态 | 缺失部分 |
|------|------|---------|
| **定时任务** | 占位 | daemon 完全无 cron/scheduled 模块；App 端只本地存储+手动触发 |
| 网页解析配置 | UI 有，无后端联动 | 需对接 `tools.web.fetch.*` 配置 |
| 断线重连补发 | 部分 | reconnect 有，pending 队列补发未完整 |
| Agent 真实头像 | 未做 | agents.list 已有 avatar 字段未消费 |
| Agent 最后消息预览 | 未做 | 侧边栏摘要 |
| **145 个能力插件开关** | 基本未做 | 配置面板未生成 |
| 执行权限完整联动 | 80% | 文件系统访问开关已隐藏（schema 缺字段） |
| 通话设置 | 占位 | UI 仅 PlaceholderSettingsPage |
| 订阅管理 | 占位 | UI 仅展示 |
| 自定义服务商 | 未启动 | — |
| 隐私模式联动 | 未启动 | — |
| 插件库（App Store） | 未启动 | — |
| 深度思考模式切换 | 未启动 | — |
| 多网络地址管理 | 未启动 | — |

### 2.5 技术债 / 稳定性问题

1. **双 daemon 线漂移**：`package/`（v1.3.7 上游参考，有 4 个单测）vs `mypilot-link/`（v1.0.0 自研主线，无单测）— 当前以 `mypilot-link/` 为主，但 `package/` 未明确标记为"参考"
2. **无 Swift Tests target**：MyPilot.xcodeproj 中**完全没有** XCTest target；ENABLE_TESTABILITY=YES 但无测试文件
3. **mypilot-link 无单测**：`npm test` 实际是 `node --check` 语法校验；只有手工 `e2e-test.mjs`
4. **WebSocketService 仍是状态聚合中心**：拆出 4 个子类后仍承担消息状态、会话状态、Agent 状态、RPC 回调、附件解析、Gateway HTTP 共 6 项职责
5. **诊断未产品化**：daemon 已有 `readLinkLogSnapshot` 和 `/link/logs`，App 设置页未消费
6. **MessageAttachment 编码冲突**：当前 `encode` 只在 url 为空时存 base64，重载历史时小图片可能丢 base64 只剩失效 URL
7. **发布脚本缺失**：`package/package.json` 引用不存在的 `./scripts/release.mjs`
8. **没有自动化回归基线**：当前每次改动靠人工对话验证，回归成本高

### 2.6 累计文档

- 39 份 `.trae/documents/` 计划文档（v1~v6 修复 + 各功能规划）
- 5 份根目录方案文档（已被 FINAL/ARCHITECTURE 取代）

---

## 三、下一阶段开发计划（建议四阶段）

### 阶段 P4-A：核心功能补齐（最高 ROI，2 周内）

按"用户能直接看到/使用"的优先级排序：

**A1. 定时任务真正联通（3-5 天）**
- daemon 新增 `src/scheduler.js`：基于 `node-cron` 或原生 setTimeout 实现 cron 调度
- 新增 RPC：`schedule.list / schedule.create / schedule.update / schedule.delete / schedule.run`
- 持久化：`~/.mypilot-link/schedules.json`
- 执行时通过 `chat.send` 触发指定 agent
- App 端 ScheduledTasksView 接入新 RPC，移除 UserDefaults 占位

**A2. Agent 头像与最后消息预览（1 天）**
- AgentsList 从 `agents.list` payload 提取 `avatar`，SidebarView 渲染
- 最近消息从 `chat.history maxChars=200` 取末条预览

**A3. Agent 断线重连后 pending 队列补发（2 天）**
- WebSocketService 维护 `outboundQueue: [PendingMessage]`
- onReconnect → 顺序重发（去重：检查 chat.history 是否已包含）

**A4. 网页解析配置真实联动（半天）**
- NetworkSettingsView 中的"网页解析"Toggle 接入 `tools.web.fetch.maxBytes / timeout` 等子项

### 阶段 P4-B：稳定性 & 可观测性（1-2 周）

**B1. App 内诊断中心（2-3 天）**
- 新建 `Features/Settings/DiagnosticsView.swift`
- 展示：daemon flavor / version / pid / startedAt / 连接状态 / 最近 100 行日志 / autostart stderr
- 一键脱敏导出（token/refreshToken/accessToken/配对码/本地路径）

**B2. mypilot-link 单元测试（3-5 天）**
- 引入 `node:test`
- 至少覆盖：connect-token、device-identity、search-providers 同步、setNestedValue（配置写入）、extractContentParts、stripThinkingTags
- 修复 `npm test` 脚本（移除 `--check` 占位，实际跑测试）

**B3. Swift Test target（2 天）**
- Xcode 中新增 `MyPilotTests` target
- 覆盖：`isLikelyCorruptThinking`、`stripThinkTags`、`AttachmentTransport.resolveAllAttachments`、ChatStreamHandler.parseDelta 去重

**B4. WebSocketService 二次拆分（3 天，可选）**
- 拆 `MessageProtocolParser`（switch 帧解析）、`ConversationMessageStoreAdapter`（消息持久化）、`AgentStateStore`、`GatewayHttpBridge`
- 单 service 文件控制在 400 行内

### 阶段 P4-C：145 能力插件 + 自定义服务商（3-4 周）

**C1. 能力插件面板（2 周）**
- daemon 新增 `skills.list` RPC（已有同步，需对外暴露列表 + enabled 状态）
- App 新建 `Features/Settings/SkillsManagementView.swift`：按分类展示 + 搜索 + 开关
- 数据持久化：openclaw.json `skills.entries[*].enabled`

**C2. 自定义服务商（1-2 周）**
- 新建 `Features/Settings/ModelProvidersView.swift`
- 支持添加/编辑 14 个内置服务商 + 自定义 OpenAI 兼容端点
- 接入 `models.list` 后端 API key 字段

### 阶段 P4-D：发布与分发（按需）

**D1. mypilot-link npm 包发布链路（1-2 天）**
- 实现 `scripts/release.mjs`：版本号校验 + tgz 打包 + dry-run
- README 增加 `npm install -g @mypilot/link` 安装路径
- `/api/info` 增加 flavor 字段标识自研版本

**D2. macOS App 签名 + Sparkle 更新（按需，3-5 天）**
- Developer ID 签名 + notarize
- Sparkle SDK 集成自动更新

---

## 四、推荐立刻执行的"下一步"

基于"已经稳定 + 用户高频使用 + 投入小回报大"原则，推荐 **P4-A1（定时任务真正联通）** 作为下一个迭代目标：
- 当前 ScheduledTasksView 已有完整 UI 和数据模型，**只差 daemon 调度**
- 用户对"定时打卡 / 定时回顾 / 定时数据采集"等场景有明确需求
- 完成后能让 MyPilot 在产品力上超过 ClawPilot 官方（官方有但实现简单）

如果用户更关心"先稳定不再出 bug"，则推荐先做 **P4-B1（诊断中心）+ P4-B2（daemon 单测）**：
- 减少未来"边修边坏"的回归成本
- 让用户能自助诊断而非每次都需手动 SSH

---

## 五、规划决策点（已确认 ✅）

| 决策点 | 用户决策 | 执行口径 |
|--------|---------|---------|
| **下一阶段重心** | **AB 并行** | 先做 P4-A1 定时任务（3-5天）→ 紧接 P4-B1 诊断中心（2-3天）→ 再回 P4-A2/A3/A4 |
| **package/ 目录** | **保留 + 加 README 标记** | 在 `package/` 根添加 `README.md` 说明：「此目录为上游 @clawpilot-app/link v1.3.7 参考源码，**不在用**，主线在 `mypilot-link/`」 |
| **定时任务实现方式** | **由我决定** | **采用 `cron-parser` + 原生 setTimeout 方案**：理由（1）零原生 cron 依赖减小包体积；（2）`cron-parser` 仅做表达式 → next-fire-time 解析，纯函数易测；（3）setTimeout 配合 30s pong 心跳已有的 keep-alive 容错；（4）daemon 重启时可基于持久化状态精确恢复下一次触发 |
| 145 能力插件 | 待 P4-A/B 完成后再讨论 | 推迟决策 |
| Swift Tests target | P4-B3 自然包含 | 跟随 B 阶段 |

---

## 六、下一阶段确认后的执行顺序（AB 并行版）

按已确认决策，**未来 2-3 周**滚动执行顺序：

### Sprint 1（本周）— 定时任务最小可用版
1. **P4-A1.1** daemon 新增 `src/scheduler.js`：基于 `cron-parser` 计算 next fire time，setTimeout 调度
2. **P4-A1.2** 持久化 `~/.mypilot-link/schedules.json`（任务列表 + 上次执行时间）
3. **P4-A1.3** 新增 RPC：`schedule.list / create / update / delete / run`
4. **P4-A1.4** 任务执行：通过现有 `chat.send` 链路触发指定 agent
5. **P4-A1.5** App 端 ScheduledTasksView 替换 UserDefaults → 调用新 RPC
6. **P4-A1.6** 简单回归：创建一个每分钟跑的任务，验证执行 3 次后正常 + daemon 重启后能恢复

### Sprint 2（紧接）— 诊断中心
1. **P4-B1.1** App 新建 `Features/Settings/DiagnosticsView.swift`
2. **P4-B1.2** daemon 暴露 `/api/diagnostics`（聚合 flavor/version/pid/startedAt/连接状态/最近 100 行日志/autostart stderr）
3. **P4-B1.3** App 端展示 + 一键脱敏导出（脱敏字段：token / refreshToken / accessToken / 配对码 / 用户本地路径）
4. **P4-B1.4** 入口放在「高级设置」内

### Sprint 3 — package/ 标记 + daemon 单测
1. **P4-D0**（顺手）在 `package/` 根新增 README 标记参考性质
2. **P4-B2.1** mypilot-link 引入 `node:test`，先覆盖 5 个关键模块：connect-token、device-identity、search-providers、setNestedValue、extractContentParts
3. **P4-B2.2** 修复 `npm test` 脚本（移除 `--check` 占位）

### Sprint 4 — 收尾 A 阶段剩余
- P4-A2 Agent 头像与最后消息预览
- P4-A3 断线重连补发
- P4-A4 网页解析配置联动

---

## 六、约束与原则（贯穿后续所有开发）

1. 不修改 `/root/.openclaw/agents/main/SOUL.md` 等已部署的素材
2. 任何 daemon 改动必须保持 App 端协议兼容（必要时做 v2 类型并存）
3. 修复 Bug 前先抓真实日志确认根因（v3-v6 的成功经验）
4. 日志/诊断导出必须脱敏 token / refreshToken / accessToken / 配对码 / 用户本地路径
5. 新功能必须有"验证步骤"和"回退方案"
6. 不在 agent prompt 或素材里塞稳定性依赖

---

## 七、文档地图（供后续查阅）

| 主题 | 文档 |
|------|------|
| 终极愿景 | [FINAL_DEVELOPMENT_PLAN.md](file:///Users/liaoxing/Downloads/未命名文件夹/FINAL_DEVELOPMENT_PLAN.md) |
| 架构最终方案 | [CLAWPILOT_ARCHITECTURE_ANALYSIS.md](file:///Users/liaoxing/Downloads/未命名文件夹/CLAWPILOT_ARCHITECTURE_ANALYSIS.md) |
| 功能蓝图 | [ClawPilot_Features_v2.md](file:///Users/liaoxing/Downloads/未命名文件夹/ClawPilot_Features_v2.md) |
| 最近 6 轮修复 | [bugfix-plan-v1~v6](file:///Users/liaoxing/Downloads/未命名文件夹/.trae/documents/) |
| 此份计划 | bugfix-plan-v7-retrospective-20260609.md（本文件） |
