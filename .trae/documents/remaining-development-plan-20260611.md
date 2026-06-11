# MyPilot 剩余开发工作计划

## Summary

基于项目当前进度（P0-P4 + F-1~F-11 全部完成），梳理剩余开发工作。项目已从"补功能"阶段进入"打磨体验、补测试、准备发布"阶段。本计划按优先级组织，聚焦可自主完成的工程项。

## Current State Analysis

### 已完成
- **P0 稳定性**：连接恢复、附件统一、协议稳定、会话持久化、daemon 诊断 — 全部 ✅
- **P1 体验增强**：消息操作、定时任务、权限配置、文件浏览器 — 全部 ✅
- **P2 深度拆分**：WebSocketService 944→570 行、daemon 可靠性、Agent 工作台、远程访问 — 全部 ✅
- **P3 持续开发**：运行链路、回归集、诊断升级、发布清理、WS 二次拆分 — 全部 ✅
- **P4 推进**：WS 深度拆分、测试增强、诊断体验、占位页、发布脚本 — 全部 ✅
- **F-1~F-11**：e2e 测试修复 — 全部 ✅，已推送 GitHub

### 当前测试覆盖
- Swift: 13 个测试文件，85 tests
- daemon: 6 个 .test.js 文件，90 tests
- package: 3 个 .test.js 文件

### 当前文件结构
- WebSocketService.swift: 570 行（已拆出 6 个 extension 文件）
- Services 目录: 14 个文件（含 5 个从 WS 拆出的模块）
- parseMessage: 全部 7 个 case 已为单行方法调用

### 已知技术债（来自 FEATURE_CHECKLIST.md）
| # | 问题 | 优先级 |
|---|------|--------|
| T1 | WS 深度拆分完成，仍可拆 FrameRouter/runtime state | P3 |
| T2 | 需真实断网/重连端到端回归 | P2 |
| T3 | daemon HTTP/WS 协议层仍无测试 | P2 |
| T4 | 附件大文件/多文件端到端回归 | P3 |
| T5 | 双线同步防遗漏 | P3 |
| T6 | 诊断中心仍可迭代 | P2 |
| T7 | 缺 CI/CD 和 macOS 签名公证 | P2 |

---

## Proposed Changes

### P5：测试与回归基线（最高优先级）

#### P5-1：daemon HTTP API 协议测试
- **文件**: `mypilot-link/src/daemon-api.test.js`（新建）
- **内容**: 测试 daemon HTTP 端点的基础行为
  - `/api/health` 返回结构
  - `/api/info` 返回 packageName/flavor/version
  - `/api/config` 读取与默认值
  - `/api/logs` 基础解析
  - `/api/workspace-files` 路径边界
  - `/api/upload` 大文件/非法 mime 错误路径
- **目标**: 补齐 daemon HTTP 层测试空白
- **验收**: `npm run verify` 通过，测试数 ≥100

#### P5-2：Swift 核心服务测试增强
- **文件**: 新增 `ConnectionManagerTests.swift`、`AttachmentTransportTests.swift` 补充场景
- **内容**:
  - ConnectionManager: 重连退避计算、风暴检测逻辑、pending queue flush
  - AttachmentTransport: 多附件发送、base64 fallback 路径、media 指令解析
  - ChatStreamHandler: delta 合并、thinking 过滤、done 触发
- **验收**: xcodebuild test 通过，Swift tests ≥100

#### P5-3：端到端回归记录模板
- **文件**: `.trae/documents/e2e-regression-checklist.md`（新建）
- **内容**: 基于 P0-3 的 20 个场景，建立结构化回归记录模板
  - 每个场景：结果/环境/复现步骤/修复优先级
  - 不自动执行，仅作为人工回归时的记录工具
- **验收**: 模板文件创建完成

### P6：产品体验打磨

#### P6-1：AI 回传文件体验增强
- **文件**: `MessageBubbleView.swift`、`WebSocketService.swift`
- **问题**: AI 生成的文件（图片/文档）回传后，用户无法直接下载到本地
- **内容**:
  - DocumentFileCard 增加"下载"按钮，调用 `/api/file/*` 下载到本地
  - 图片附件增加"保存到相册"或"另存为"操作
  - 附件 URL 失效时显示"文件已过期"状态而非空白
- **验收**: AI 生成文件可下载，过期文件有明确提示

#### P6-2：会话管理体验优化
- **文件**: `SidebarView.swift`、`AppState.swift`
- **内容**:
  - 会话列表按"今天/昨天/更早"分组显示
  - 空会话（无消息）自动清理
  - 会话搜索结果高亮匹配关键词
- **验收**: 会话列表分组显示，空会话不堆积

#### P6-3：聊天输入体验优化
- **文件**: `InputBarView.swift`、`ChatView.swift`
- **内容**:
  - 输入框 Shift+Enter 换行，Enter 发送（当前行为需确认）
  - 发送中禁用输入框，防止重复发送
  - 长消息输入框自动扩展高度
- **验收**: 输入行为符合预期

#### P6-4：自定义添加模型
- **文件**: `NetworkSettingsView.swift`、`WebSocketRpcMethods.swift`、`AgentRpcClient.swift`
- **问题**: 当前只能使用 Gateway 返回的模型列表，无法自定义添加模型（如本地 Ollama、第三方 API）
- **内容**:
  - 设置页增加"自定义模型"区域，支持添加模型名称 + API base URL + API key
  - 自定义模型通过 `setConfig` RPC 写入 Gateway 配置
  - Agent 详情页模型选择器合并 Gateway 模型 + 自定义模型
  - 自定义模型支持编辑和删除
  - 模型列表按来源分组显示（Gateway / 自定义）
- **验收**: 可添加自定义模型，Agent 可切换到自定义模型对话

### P7：daemon 能力增强

#### P7-1：daemon WebSocket 协议测试
- **文件**: `mypilot-link/src/daemon-ws.test.js`（新建）
- **内容**:
  - WebSocket 连接握手
  - chat.send → stream → done 完整流程模拟
  - config.get/set RPC 往返
  - schedule.* RPC 异常场景（非法 cron、缺失 id、重复删除）
  - 断线重连行为
- **验收**: `npm run verify` 通过

#### P7-2：daemon 日志与监控增强
- **文件**: `daemon.js`
- **内容**:
  - `/api/logs` 支持日志级别过滤（error/warn/info）
  - `/api/logs` 支持时间范围查询
  - 增加连接事件日志（客户端连接/断开/重连）
- **验收**: 日志 API 可按级别和时间过滤

### P8：发布准备

#### P8-1：App 版本号与 About 页面
- **文件**: `MyPilotApp.swift`、新建 `AboutView.swift`
- **内容**:
  - App 版本号定义（从 Info.plist 读取）
  - About 页面显示 App 版本、daemon 版本、运行线
  - 菜单栏"关于 MyPilot"打开 About 页面
- **验收**: About 页面显示完整版本信息

#### P8-2：package 仓库归属确认
- **性质**: 产品决策，需用户确认
- **选项**:
  1. 独立 GitHub repo
  2. mypilot-link 的分支
  3. 保留当前目录结构，仅标记边界
- **验收**: 明确归属方案

#### P8-3：CI/CD 基础搭建
- **内容**:
  - GitHub Actions: mypilot-link npm run verify
  - GitHub Actions: package npm run verify
  - Xcode Cloud 或 GitHub Actions: Swift build + test
- **验收**: PR 提交自动触发验证

### P9：长期维护项（低优先级）

#### P9-1：WebSocketService FrameRouter 抽取
- **文件**: 新建 `WebSocketFrameRouter.swift`
- **内容**: 将 parseMessage 的 switch 逻辑抽取为独立路由器
- **前置**: P5 端到端回归通过

#### P9-2：会话 runtime state 管理移出
- **文件**: 新建 `ConversationStateManager.swift`
- **内容**: 将 conversationStates、activeGenerationConversationId 等状态管理移出
- **前置**: P9-1 完成并稳定

#### P9-3：版本与迁移策略
- **内容**:
  - App 版本号规范
  - daemon 版本号规范
  - 最低兼容版本
  - 配置文件 schema 迁移
  - 历史消息格式迁移
- **前置**: P8-1 完成

---

## 实施顺序建议

```
P5-1 (daemon API 测试) ─┐
P5-2 (Swift 测试增强)  ─┼─→ P5-3 (回归模板) → 人工回归
P6-1 (AI 文件下载)     ─┤
P6-2 (会话管理优化)    ─┤
P6-3 (输入体验优化)    ─┘
                          ↓
P7-1 (daemon WS 测试) ─→ P7-2 (日志增强)
                          ↓
P8-1 (About 页面) ─→ P8-2 (package 归属) ─→ P8-3 (CI/CD)
                          ↓
                   P9-1~P9-3 (长期维护)
```

**建议先做 P5-1 + P5-2 + P6-1**，这三个可并行且价值最高：
- P5-1/P5-2 补测试基线，降低后续改动风险
- P6-1 解决用户最高频痛点（AI 生成文件无法下载）

## Assumptions & Decisions

1. 不修改 SOUL.md 和已部署素材
2. MyPilot 主线是 mypilot-link，package 是 ClawPilot 公共发布包线
3. P8-2 package 归属需用户决策，不自行决定
4. P8-3 CI/CD 需 GitHub repo 配置权限
5. P9 长期项需 P5 回归通过后再启动
6. 代码中无 TODO/FIXME/HACK 标记，技术债来源为 FEATURE_CHECKLIST.md

## Verification Policy

- 改 App: `xcodebuild build` + `xcodebuild test`
- 改 mypilot-link: `npm run verify`
- 改 package: `npm run verify`
- 运行线确认: `curl http://127.0.0.1:52378/api/info`
