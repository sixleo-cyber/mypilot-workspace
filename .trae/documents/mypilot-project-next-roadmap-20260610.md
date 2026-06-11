# MyPilot 全项目后续待办路线图

## Summary

本路线图用于记录 MyPilot 当前阶段之后还需要做什么。它基于当前代码、项目规则、功能清单、历史计划文档、测试验证状态和 Git 边界整理，覆盖：

- MyPilot App
- `mypilot-link` 当前 daemon 主线
- `package` ClawPilot 公共发布包线
- 测试与验证
- 技术债
- 发布准备
- Git/文档边界

当前项目状态可以概括为：核心功能基本可用，稳定性和诊断能力已明显增强，下一阶段重点应从“补功能”转向“做基线验证、真实端到端回归、继续降低核心复杂度、准备发布链路”。

## Current State Analysis

### 1. 项目边界

当前不是单一 monorepo，而是多个目录并行：

| 模块 | 路径 | 定位 |
|------|------|------|
| MyPilot App | `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot` | SwiftUI macOS App 主仓库 |
| mypilot-link | `/Users/liaoxing/Downloads/未命名文件夹/mypilot-link` | MyPilot 当前 daemon 主线 |
| package | `/Users/liaoxing/Downloads/未命名文件夹/package` | ClawPilot 公共 npm 发布包线 |
| 项目文档 | `/Users/liaoxing/Downloads/未命名文件夹/.trae/documents` | 当前规划与执行记录 |
| 功能清单 | `/Users/liaoxing/Downloads/未命名文件夹/FEATURE_CHECKLIST.md` | 全功能/技术债状态 |

当前规则明确：

- MyPilot 私有化体验、诊断、定时任务、附件协议、本地 OpenClaw 调试：优先修改 `mypilot-link`。
- 公共 npm 发布包、`clawlink` CLI、公共发布流程：修改 `package`。
- 不要把 MyPilot 专属能力无差别复制到 `package`。
- 修改 daemon 前先确认 `/api/info` 的 `packageName` 与 `flavor`。
- 不修改服务器素材，不动 `/root/.openclaw/agents/main/SOUL.md`。

### 2. 已完成的重要收口

近期已完成的关键闭环：

1. 会话稳定闭环
   - 跨会话 AI 回复即时落盘。
   - 删除会话清 WebSocket runtime state。
   - 搜索过滤已删除会话。

2. 部署边界收敛
   - `mypilot-link` 标为 MyPilot 主线。
   - `package` 标为 ClawPilot 公共发布包线。
   - App 诊断中心显示运行线。

3. 诊断脱敏增强
   - 页面展示和导出报告统一脱敏。
   - 覆盖 Bearer、API key、URL query、环境变量风格密钥。

4. 消息可靠性补测
   - 断线不 append。
   - disconnect 标 failed。
   - AI 响应中 queued。
   - `MessageDeliveryStatus.fromTaskStatus` 抽纯函数并测试。

5. WebSocketService 第一阶段保守小拆
   - 抽 `markNonTerminalUserMessagesFailed`。
   - 拆 `task.status` / `task.notify` / `message` handler。
   - 未触碰 `stream` / `done` / `error` 高风险分支。

### 3. 当前技术债基线

当前 `FEATURE_CHECKLIST.md` 中的技术债应作为后续待办的主要来源：

| 编号 | 当前问题 | 影响 | 优先级 |
|------|----------|------|--------|
| T1 | WebSocketService 已完成第一阶段保守小拆，仍需继续拆分 stream/done/error 与搜索设置管理 | 核心文件复杂度仍偏高 | P2 |
| T2 | 已有 Swift Tests target，消息可靠性与状态映射已补测试，仍需更多端到端回归 | 仍需真实断网/重连端到端回归 | P2 |
| T3 | 已有 daemon node:test，需覆盖更多协议边界 | 仍需持续补场景 | P2 |
| T4 | 附件协议已统一，需补真实端到端大文件/多文件场景 | 仍需持续覆盖复杂附件回归 | P3 |
| T5 | package/ 和 mypilot-link/ 双线边界已标记，需发布前持续执行主线确认 | 仍需防止跨线同步遗漏 | P3 |
| T6 | 诊断中心已产品化，日志脱敏已覆盖页面与导出，需持续补体验 | 排障能力仍可增强 | P2 |
| T7 | 发布脚本缺失 | 无法自动化打包 | P3 |

## Proposed Roadmap

## P0：马上做，建立干净基线

### P0-1：确认当前运行线

目标：避免后续测试或部署时跑错 daemon 线。

命令：

```bash
curl http://127.0.0.1:52378/api/info
```

预期至少包含：

```json
{
  "packageName": "@mypilot/link",
  "flavor": "mypilot-link"
}
```

验收：

- 如果返回 `@mypilot/link` + `mypilot-link`，继续后续验证。
- 如果返回 `@clawpilot-app/link` + `clawpilot-link`，说明跑到了公共发布包线，应先切回 `mypilot-link`。
- 如果无法访问，先确认 daemon 是否启动。

### P0-2：跑完整基线验证

目标：在继续拆分或回归前，确认当前代码处于可验证干净状态。

命令：

```bash
cd /Users/liaoxing/Downloads/未命名文件夹/mypilot-link
npm run verify
```

```bash
cd /Users/liaoxing/Downloads/未命名文件夹/package
npm run verify
```

```bash
cd /Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot
xcodebuild -project MyPilot.xcodeproj -scheme MyPilot -configuration Debug -destination 'platform=macOS' -skipMacroValidation build
```

```bash
cd /Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot
xcodebuild test -project MyPilot.xcodeproj -scheme MyPilot -destination 'platform=macOS' -skipMacroValidation
```

验收：

- `mypilot-link npm run verify` 通过。
- `package npm run verify` 通过。
- App build 通过。
- App tests 通过。

### P0-3：真实端到端回归清单

目标：补自动化测试之外的真实使用回归，尤其是断网、跨会话、附件、定时任务和诊断导出。

建议人工回归场景：

1. App 正常连接 daemon。
2. 新建会话发送文本，AI 完整回复。
3. 流式回复期间切换会话，再切回。
4. 断开 daemon/Gateway 后尝试发送，确认输入保留、不自动发送。
5. 重连后不会自动重复执行旧 `chat.send`。
6. failed 消息可以手动重试。
7. 发送图片附件。
8. 发送非图片文件。
9. 拖拽文件发送。
10. 多文件发送。
11. 大文件失败提示。
12. AI 生成图片/文档并回传附件。
13. 历史会话重载后附件仍可见。
14. 创建定时任务。
15. 手动运行定时任务。
16. 暂停/启用/删除定时任务。
17. 诊断中心刷新。
18. 导出诊断报告，确认脱敏。
19. 删除会话后搜索不出现旧会话结果。
20. 多实例切换后消息不会串线。

输出：

- 建议在后续新增一个端到端回归记录文档，记录每个场景的通过/失败、环境、时间、复现步骤。

## P1：短期工程收口

### P1-1：WebSocketService 第二阶段保守拆分

目标：继续降低 `WebSocketService.swift` 复杂度，但仍保持低风险。

建议顺序：

1. 把 `SearchSettingsManager` 移到独立文件：
   - 新文件：`/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/SearchSettingsManager.swift`
   - 从 `WebSocketService.swift` 移除末尾内嵌 class。
   - 不改变对外 API。

2. 抽 `stream` handler：
   - 新增私有方法 `handleStreamFrame(_:)`。
   - 保持 `ChatStreamHandler` 调用不变。

3. 抽 `processing` handler：
   - 新增私有方法 `handleProcessingFrame(_:)`。
   - 保持 timeout timer 行为不变。

4. 暂不拆 `done` / `error`，因为它们牵涉跨会话落盘和 pending flush。

验收：

- Swift build/test 全部通过。
- `WebSocketServiceReliabilityTests` 仍通过。
- `ChatStreamHandlerTests` 仍通过。

### P1-2：daemon 协议边界测试增强

目标：补 `mypilot-link` 主线协议边界，降低 daemon 回归风险。

优先补：

1. `/api/logs` 基础解析和返回结构。
2. `/api/config` 读取失败与大配置场景。
3. `config.getBatch` 正常/异常响应。
4. `schedule.*` 异常场景：非法 cron、缺失 task id、重复删除。
5. `/api/workspace-files` 路径边界。
6. Search provider toggle 默认值和持久化。
7. 上传大文件或非法 mime type 的错误路径。

目标测试目录：

- `/Users/liaoxing/Downloads/未命名文件夹/mypilot-link/src/*.test.js`

验收：

```bash
cd /Users/liaoxing/Downloads/未命名文件夹/mypilot-link
npm run verify
```

### P1-3：Swift AppState 与跨会话测试增强

目标：补真实会话状态和持久化边界测试。

优先补：

1. 会话 preview 回填。
2. 删除会话后 runtime state 清理。
3. 跨会话 pending AI 消息落盘。
4. 搜索过滤已删除会话。
5. 历史消息附件恢复。
6. 多实例切换后当前会话隔离。

约束：

- 必须使用临时目录或可注入 storage root。
- 不能污染真实 `Application Support` 数据。

验收：

```bash
cd /Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot
xcodebuild test -project MyPilot.xcodeproj -scheme MyPilot -destination 'platform=macOS' -skipMacroValidation
```

### P1-4：诊断中心体验继续增强

目标：让诊断中心不仅能显示问题，还能给出更明确的排查建议。

候选：

1. 一键复制关键信息。
2. 当前运行线警告更醒目。
3. Gateway 未连接时显示步骤化建议。
4. 端口占用检测提示。
5. 本地目录权限异常的具体修复建议。
6. App 与 daemon 版本不匹配提示。

验收：

- UI 不重复网络设置页。
- 导出报告仍脱敏。
- Swift build/test 通过。

## P2：产品体验与发布准备

### P2-1：附件真实端到端回归

目标：补自动化测试之外的真实附件使用覆盖。

场景：

1. 多图片发送。
2. 图片 + 文档混发。
3. 大文件上传失败提示。
4. base64 fallback 上限。
5. AI 多文件生成。
6. URL 失效后的显示状态。
7. 历史消息中附件恢复。
8. 拖拽上传和选择文件行为一致。

验收：

- App UI 显示正确。
- daemon 日志无未脱敏敏感信息。
- 历史重载后附件仍可见。

### P2-2：占位页收敛

目标：减少用户误解，明确未接入功能状态。

范围：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Settings/AdvancedSettingsView.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Settings/PlaceholderSettingsPages.swift`

建议：

1. 通话设置明确为“依赖语音插件/未启用”。
2. 订阅管理明确“本地私有化版本当前无需订阅”。
3. 不做真实订阅、支付、通话功能。
4. 功能清单中继续标记为未完全实现，避免误判。

### P2-3：发布脚本与发布边界整理

目标：明确 MyPilot 内测发布和 ClawPilot 公共发布包线的区别。

MyPilot 内测发布建议包括：

1. App build。
2. mypilot-link pack dry-run。
3. `/api/info` 运行线确认。
4. 诊断中心版本确认。
5. 手动端到端回归记录。

ClawPilot 公共包发布：

1. 只在 `package` 线执行。
2. 使用 `npm run release` 和 `publish:npm`。
3. 不带 MyPilot 私有能力。

### P2-4：package 仓库归属确认

目标：避免 `package` 长期处于“有发布脚本但无 git 边界”的模糊状态。

需要明确：

1. 它是否应是独立 repo。
2. 是否应作为 subtree/submodule。
3. 是否只是参考快照。
4. 与 `mypilot-link` 的同步策略是什么。

## P3：长期维护项

### P3-1：WebSocketService 深度拆分

在 P1 的保守拆分稳定后，再考虑：

1. 拆 `done` handler。
2. 拆 `error` handler。
3. 拆 `WebSocketFrameRouter`。
4. 拆 `ChatFrameHandler`。
5. 将会话 runtime state 管理从 `WebSocketService` 移出。

前置条件：

- 端到端回归已完成。
- 消息可靠性测试继续扩展。
- 每次拆分后必须跑 Swift build/test。

### P3-2：自动化端到端测试体系

长期目标：减少人工回归成本。

候选方向：

1. App 纯逻辑 E2E：模拟 daemon frame。
2. daemon 集成测试：启动本地 HTTP/WebSocket server。
3. 回归 fixture：固定消息/附件/诊断数据。
4. UI 层快照或最小交互测试。

### P3-3：版本与迁移策略

后续发布前需要明确：

1. App 版本号。
2. daemon 版本号。
3. App 与 daemon 最低兼容版本。
4. 配置文件 schema 迁移。
5. 历史消息格式迁移。
6. 诊断报告版本字段。

## 下一步马上做什么

推荐下一步固定为以下三步：

### Step 1：确认运行线并跑完整基线验证

先执行：

```bash
curl http://127.0.0.1:52378/api/info
```

然后执行：

```bash
cd /Users/liaoxing/Downloads/未命名文件夹/mypilot-link && npm run verify
cd /Users/liaoxing/Downloads/未命名文件夹/package && npm run verify
cd /Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot && xcodebuild -project MyPilot.xcodeproj -scheme MyPilot -configuration Debug -destination 'platform=macOS' -skipMacroValidation build
cd /Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot && xcodebuild test -project MyPilot.xcodeproj -scheme MyPilot -destination 'platform=macOS' -skipMacroValidation
```

### Step 2：做真实端到端回归并记录结果

新建或更新一个回归记录文档，按 P0-3 的 20 个场景逐项记录：

- 结果：通过 / 失败 / 未测。
- 环境：App 版本、daemon 版本、运行线。
- 失败复现步骤。
- 后续修复优先级。

### Step 3：继续 WebSocketService 第二阶段保守拆分

如果 Step 1 和 Step 2 没有发现 P0 级问题，则执行：

1. 移出 `SearchSettingsManager` 到独立文件。
2. 抽 `handleStreamFrame(_:)`。
3. 抽 `handleProcessingFrame(_:)`。
4. 不碰 `done/error`。
5. 跑 Swift build/test 和 `mypilot-link npm run verify`。

## Assumptions & Decisions

1. 当前 MyPilot 主线是 `mypilot-link`。
2. `package` 是 ClawPilot 公共发布包线，不承接 MyPilot 私有能力。
3. 服务器素材和 `/root/.openclaw/agents/main/SOUL.md` 不修改。
4. 不提交 git commit，除非用户明确要求。
5. 不发布 npm，除非单独确认发布计划。
6. 根目录不是 git 仓库，`.trae/documents` 和 `FEATURE_CHECKLIST.md` 当前不会随 App/mypilot-link 提交。
7. 后续继续以“先验证、再小步拆分、再验证”的节奏推进。

## Verification Policy

凡是改 App：

```bash
cd /Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot
xcodebuild -project MyPilot.xcodeproj -scheme MyPilot -configuration Debug -destination 'platform=macOS' -skipMacroValidation build
xcodebuild test -project MyPilot.xcodeproj -scheme MyPilot -destination 'platform=macOS' -skipMacroValidation
```

凡是改 `mypilot-link`：

```bash
cd /Users/liaoxing/Downloads/未命名文件夹/mypilot-link
npm run verify
```

凡是改 `package`：

```bash
cd /Users/liaoxing/Downloads/未命名文件夹/package
npm run verify
```

凡是涉及运行线：

```bash
curl http://127.0.0.1:52378/api/info
```

预期：

```json
{
  "packageName": "@mypilot/link",
  "flavor": "mypilot-link"
}
```
