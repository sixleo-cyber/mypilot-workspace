# MyPilot 项目全面回顾：待办清单

## Summary

基于 2026-06-10 对整个项目的深度回顾，整理当前已完成、待完成、以及需要持续关注的事项。本计划不做新设计，仅记录现状和待办。

---

## 一、项目边界与规则速查

| 模块 | 路径 | 定位 | Git |
|------|------|------|-----|
| MyPilot App | `MyPilotApp/MyPilot` | SwiftUI macOS App | ✅ 独立 repo |
| mypilot-link | `mypilot-link` | MyPilot daemon 主线 | ✅ 独立 repo |
| package | `package` | ClawPilot 公共 npm 发布包线 | ❌ 无 .git |
| 项目文档 | `.trae/documents` | 规划与执行记录 | ❌ 根目录非 repo |
| 功能清单 | `FEATURE_CHECKLIST.md` | 全功能/技术债状态 | ❌ 根目录非 repo |

核心规则：
- mypilot-link 是产品主线；package 是公共发布线
- 不把 MyPilot 专属能力无差别复制到 package
- 修改 daemon 前先确认 `/api/info` 的 packageName 与 flavor
- 不修改服务器素材，不动 SOUL.md
- 不自动 commit git

---

## 二、已完成的重要收口

| # | 收口项 | 涉及文件 | 状态 |
|---|--------|----------|------|
| 1 | 跨会话 AI 回复即时落盘 | AppState.swift, WebSocketService.swift, ChatView.swift | ✅ |
| 2 | 删除会话清 WebSocket runtime state | WebSocketService.swift, AppState.swift | ✅ |
| 3 | 搜索过滤已删除会话 | AppState.swift | ✅ |
| 4 | 部署双线边界标记 | README.md × 2, ServerDiagnostics.swift, DiagnosticsCenterView.swift | ✅ |
| 5 | 诊断脱敏统一 | DiagnosticsReportBuilder.swift, DiagnosticsCenterView.swift | ✅ |
| 6 | 消息可靠性补测 | WebSocketServiceReliabilityTests.swift, MessageDeliveryStatusTests.swift | ✅ |
| 7 | MessageDeliveryStatus.fromTaskStatus 纯函数 | Message.swift | ✅ |
| 8 | WS 第一阶段保守拆分（3 handler + 1 helper） | WebSocketService.swift | ✅ |

---

## 三、当前技术债基线

来源：FEATURE_CHECKLIST.md T1–T7

| 编号 | 问题 | 风险 | 优先级 |
|------|------|------|--------|
| T1 | WebSocketService 仍需继续拆分（SearchSettingsManager 内嵌 199 行；stream/done/error 未拆） | 核心文件 1131 行，复杂度高 | P1 |
| T2 | 仍需真实断网/重连端到端回归 | 无法确认线上稳定性 | P1 |
| T3 | daemon node:test 需覆盖更多协议边界 | daemon 回归风险 | P1 |
| T4 | 需补真实端到端大文件/多文件附件场景 | 附件场景覆盖不足 | P2 |
| T5 | 双线边界需发布前持续执行主线确认 | 跨线同步遗漏 | P2 |
| T6 | 诊断中心体验仍可增强 | 排障效率 | P1 |
| T7 | 发布脚本缺失 | 无法自动化打包 | P2 |

---

## 四、功能清单占位项

FEATURE_CHECKLIST 102 项中仅 2 项占位未实现：

| # | 功能 | 位置 |
|---|------|------|
| 75 | 通话设置 | PlaceholderSettingsPages.swift |
| 76 | 订阅管理 | PlaceholderSettingsPages.swift |

→ 建议 P2-2 收敛文案，不做真实功能。

---

## 五、WebSocketService.swift 现状拆解

文件总行数：**1131 行**

| 区域 | 行号范围 | 行数 | 状态 |
|------|----------|------|------|
| 属性声明 | 1–43 | 43 | ✅ |
| 连接/断开/辅助 | 45–131 | 87 | ✅ |
| Agent/会话切换 | 132–208 | 77 | ✅ |
| RPC 封装 | 210–338 | 129 | ✅ |
| 消息发送 | 340–568 | 229 | ✅ |
| **parseMessage 核心 switch** | 586–843 | **258** | ⚠️ 待拆 |
| 已拆出 handler | 845–906 | 62 | ✅ |
| **SearchSettingsManager** | 908–1131 | **224** | ⚠️ 待移出 |

**待拆核心内容（482 行，占 42%）：**

1. **SearchSettingsManager**（224 行）— 整个 class 内嵌在文件末尾 → 移到独立文件
2. **stream handler**（约 28 行）— 内联在 parseMessage case "stream" → 抽 handleStreamFrame
3. **processing handler**（约 20 行）— 内联在 parseMessage case "processing" → 抽 handleProcessingFrame
4. **done handler**（约 63 行）— 内联，牵涉跨会话落盘 + pending flush → **P3 再拆**
5. **error handler**（约 38 行）— 内联，牵涉跨会话落盘 → **P3 再拆**

---

## 六、测试覆盖现状

### Swift 测试（11 个文件）

| 文件 | 覆盖领域 | 状态 |
|------|----------|------|
| WebSocketServiceReliabilityTests.swift | 断线/failed/queued | ✅ 已增强 |
| MessageDeliveryStatusTests.swift | 投递状态映射 | ✅ 新增 |
| DiagnosticsReportBuilderTests.swift | 诊断报告+脱敏 | ✅ 已增强 |
| ConversationPersistenceTests.swift | 会话持久化 | ✅ 新增 |
| AppStateTests.swift | AppState CRUD/搜索/幂等创建/消息持久化 | ✅ 新增 |
| AttachmentTransportTests.swift | 附件传输 | ✅ |
| AttachmentPreparationServiceTests.swift | 附件准备 | ✅ |
| MessageAttachmentTests.swift | 消息附件模型 | ✅ |
| ScheduledTaskMappingTests.swift | 定时任务映射 | ✅ |
| ThinkingContentSanitizerTests.swift | 思考内容过滤 | ✅ |
| ChatStreamHandlerTests.swift | 流式处理 | ✅ |

### 缺口

- ❌ **stream/done/error handler 测试** — 无独立测试
- ❌ **SearchSettingsManager 测试** — 无独立测试（已移到独立文件但未补测试）

### daemon 测试

- mypilot-link：6 个 node:test 文件（83 tests passing）
- package：4 个 node:test 文件（9 tests passing）
- 新增：search-providers-business.test.js（15 项）+ daemon-utils 边界扩展（10 项）

---

## 七、完整待办清单

### P0：马上做 — 建立干净基线

| # | 待办 | 命令/方式 | 验收标准 | 状态 |
|---|------|-----------|----------|------|
| P0-1 | 确认运行线 | `curl http://127.0.0.1:52378/api/info` | 返回 @mypilot/link + mypilot-link | 需启动 daemon |
| P0-2 | 跑完整基线验证 | npm run verify × 2 + xcodebuild build/test | 全部通过 | ⚠️ Swift tests 上次未跑完 |
| P0-3 | 20 项真实端到端回归 | 人工操作 | 记录通过/失败 | ❌ 未开始 |

### P1：短期工程收口

| # | 待办 | 内容 | 验收 |
|---|------|------|------|
| P1-1 | WS 第二阶段拆分 | ① 移出 SearchSettingsManager 到独立文件 ② 抽 handleStreamFrame ③ 抽 handleProcessingFrame ④ 不碰 done/error | Swift build/test 通过 |
| P1-2 | daemon 协议边界测试 | 补 7 项场景（日志/配置/调度/工作区/搜索/大文件/错误路径） | npm run verify 通过 |
| P1-3 | AppState 与跨会话测试 | 补 6 项场景（preview 回填/删除清理/跨会话落盘/搜索过滤/附件恢复/多实例隔离） | Swift test 通过 |
| P1-4 | 诊断中心体验增强 | 一键复制/运行线警告/Gateway 步骤化建议/端口占用/权限修复/版本不匹配 | Swift build/test 通过 |

### P2：产品体验与发布准备

| # | 待办 | 内容 |
|---|------|------|
| P2-1 | 附件端到端回归 | 8 项场景（多图片/混发/大文件/base64/AI 生成/URL 失效/历史恢复/拖拽） |
| P2-2 | 占位页收敛 | 通话设置/订阅管理文案明确 |
| P2-3 | 发布脚本整理 | MyPilot 内测发布流程 + ClawPilot 公共包发布流程 |
| P2-4 | package 仓库归属 | 确认独立 repo / subtree / 快照 |

### P3：长期维护

| # | 待办 | 内容 |
|---|------|------|
| P3-1 | WS 深度拆分 | done/error/FrameRouter/ChatFrameHandler/runtime state 移出 |
| P3-2 | 自动化端到端 | App 逻辑 E2E + daemon 集成测试 + 回归 fixture |
| P3-3 | 版本与迁移策略 | 版本号/最低兼容/schema 迁移/历史消息格式 |

---

## 八、推荐执行顺序

```
Step 1: 基线验证（P0-2 完成 Swift tests）
    ↓
Step 2: 真实端到端回归（P0-3，需人工启动 App+daemon）
    ↓
Step 3: WS 第二阶段拆分（P1-1，最安全最高收益）
    ↓
Step 4: daemon 测试增强 + AppState 测试增强（P1-2 + P1-3）
    ↓
Step 5: 诊断中心体验增强（P1-4）
    ↓
Step 6+: P2/P3 按需推进
```

**Step 3 的具体拆分步骤（P1-1）：**

1. 新建 `Services/SearchSettingsManager.swift`，将 WebSocketService.swift 末尾 224 行 SearchSettingsManager class 移出
2. 在 WebSocketService.swift 中添加 `private let searchSettingsManager = SearchSettingsManager()` 属性
3. 抽 `private func handleStreamFrame(_ frame: [String: Any])` — 从 parseMessage case "stream" 提取
4. 抽 `private func handleProcessingFrame(_ frame: [String: Any])` — 从 parseMessage case "processing" 提取
5. **不碰** done / error handler
6. 跑 Swift build/test + mypilot-link npm run verify

---

## Assumptions & Decisions

1. mypilot-link 是当前产品主线，package 是公共发布线
2. 服务器素材和 SOUL.md 不修改
3. 不自动 commit git
4. 不自动发布 npm
5. 根目录非 git repo，.trae/documents 和 FEATURE_CHECKLIST.md 不随 App/mypilot-link 提交
6. 继续以"先验证、再小步拆分、再验证"节奏推进
7. 每次改 App 后必须跑 xcodebuild build + test
8. 每次改 mypilot-link 后必须跑 npm run verify

## Verification Policy

改 App：
```bash
cd /Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot
xcodebuild -project MyPilot.xcodeproj -scheme MyPilot -configuration Debug -destination 'platform=macOS' -skipMacroValidation build
xcodebuild test -project MyPilot.xcodeproj -scheme MyPilot -destination 'platform=macOS' -skipMacroValidation
```

改 mypilot-link：
```bash
cd /Users/liaoxing/Downloads/未命名文件夹/mypilot-link && npm run verify
```

改 package：
```bash
cd /Users/liaoxing/Downloads/未命名文件夹/package && npm run verify
```
