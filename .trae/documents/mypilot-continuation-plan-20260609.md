# MyPilot 继续开发计划（P3：可测试、可诊断、可发布）

## Summary

上一轮 P0/P1/P2 稳定化工作已经把 MyPilot 从“能跑通核心功能”推进到“App + daemon 具备基础稳定性、Agent 工作台可用、诊断页初步成型”的状态。下一阶段不建议继续直接堆功能，而应进入 P3：把当前能力固化为可回归、可诊断、可发布、可安全内测的产品形态。

本阶段核心目标：

1. 明确真实运行链路，解决 `package` 与 `mypilot-link` 两条 daemon 线并存带来的部署不确定性。
2. 建立最小自动化回归集，让后续每次修改都有稳定验收方式。
3. 把 daemon 日志和运行状态产品化到 App 设置页，降低排障成本。
4. 清理打包发布链路，保证源码、版本号、tgz、发布脚本一致。
5. 继续收敛 `WebSocketService` 的职责边界，为后续多端和远程访问打基础。

硬性约束：

1. 不修改 `/root/.openclaw/agents/main/SOUL.md`，除非后续明确授权。
2. 修改已部署在服务器的代码时，不得修改已部署代码的素材文件。
3. 优先在 App、daemon、协议转换层解决稳定性问题，不把稳定性依赖放到 agent prompt 或素材文件上。
4. 本计划确认前不进入实现阶段。
5. 涉及 token、refreshToken、accessToken、配对码、用户本地路径等信息时，不得在日志和诊断导出中明文暴露。

## Current State Analysis

### 已完成基线

旧规划 `mypilot-next-stability-roadmap.md` 中的核心 P0/P1/P2 已基本完成：

- App 端 WebSocket 连接、流式消息、done 状态收敛已修复多轮。
- `WebSocketService` 已拆出 `ConnectionManager`、`ChatStreamHandler`、`AgentRpcClient`、`AttachmentTransport`。
- 附件收发已支持上传优先、base64 fallback、`done.attachments`、`MY_PILOT_MEDIA_V1` 兼容解析。
- Agent 管理页已修复创建、保存、模型选择、文件编辑等问题。
- daemon 侧已增加 heartbeat、pong timeout、指数退避、风暴检测、进程锁与 `/api/health` 增强。
- 设置页已有初步网络诊断、连接质量、Gateway 连接时间、重连次数和诊断导出。
- 用户已确认最近两轮 Xcode 构建验证成功。

### 当前主要风险

#### 风险 1：两条 daemon 线并存

当前仓库同时存在：

- `/Users/liaoxing/Downloads/未命名文件夹/package`
- `/Users/liaoxing/Downloads/未命名文件夹/mypilot-link`

其中 `package` 是较完整的发布包线，包含 Relay、CLI、日志、自动启动、测试文件和 npm 发布配置；`mypilot-link` 是更贴近 MyPilot 私有化流程的本地实现线，但测试与发布能力较弱。

如果不先明确实际部署使用哪条线，后续会出现“本地改了但运行不生效”或“修了 mypilot-link，但发布包 package 没同步”的问题。

#### 风险 2：测试入口不完整

`package/src` 下已有测试文件：

- `openclaw-protocol.test.js`
- `daemon-access-token.test.js`
- `daemon-relay-http.test.js`
- `version-support.test.js`

但 `package/package.json` 目前只有 `check`，没有 `test` 脚本。`mypilot-link/package.json` 的 `test` 仍是占位失败脚本。

Swift App 侧暂未发现独立 `MyPilotTests` / `MyPilotUITests` target，纯逻辑模块如 `ChatStreamHandler`、`AttachmentTransport`、`MessageAttachment` 暂时无法自动回归。

#### 风险 3：日志能力已有后端基础，但 App 侧未产品化

`package/src/runtime.js` 已有 `readLinkLogSnapshot`，`package/src/daemon.js` 已支持 `/link/logs` Relay HTTP 日志读取，并有对应测试。但 App 设置页目前只读取 `/api/info`，尚未显示最近日志、最近错误、autostart stderr、Relay 状态等高价值诊断信息。

#### 风险 4：发布脚本引用缺失

`package/package.json` 中存在：

```json
"release": "node ./scripts/release.mjs"
```

但 `package/scripts` 目录当前只发现：

- `check-node-version.mjs`
- `postinstall.mjs`

未发现 `release.mjs`。这会导致发布链路看起来存在但实际不可用。

#### 风险 5：`WebSocketService` 仍是状态聚合中心

虽然已经完成第一轮拆分，但 `WebSocketService.swift` 仍同时承担消息状态、会话状态、Agent 状态、RPC 回调、附件解析、Gateway HTTP 处理等职责。下一阶段应继续按边界拆分，但不应在没有测试保护的情况下大改。

## Proposed Changes

## P3-0：真实运行链路确认与 daemon 线收敛

目标：先确定当前本机/服务器/发布包实际使用哪条 daemon 线，避免后续修错位置。

涉及文件：

- `/Users/liaoxing/Downloads/未命名文件夹/package/package.json`
- `/Users/liaoxing/Downloads/未命名文件夹/package/src/cli.js`
- `/Users/liaoxing/Downloads/未命名文件夹/package/src/daemon.js`
- `/Users/liaoxing/Downloads/未命名文件夹/mypilot-link/package.json`
- `/Users/liaoxing/Downloads/未命名文件夹/mypilot-link/src/cli.js`
- `/Users/liaoxing/Downloads/未命名文件夹/mypilot-link/src/daemon.js`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/APIService.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Settings/NetworkSettingsView.swift`

实施内容：

1. 确认当前 App 实例连接地址、WebSocket 地址与本机/服务器运行命令。
2. 在 daemon `/api/info` 中加入或核对 `packageName`、`version`、`flavor`、`startedAt`、`pid`、`nodeVersion` 等字段。
3. 在 App 诊断页展示 daemon flavor，明确当前连接的是 `package` 线还是 `mypilot-link` 线。
4. 决策后续主线：
   - 如果以发布和 Relay 为目标，以 `package` 为主线，把 MyPilot 私有化能力迁入或适配。
   - 如果以本地私有化快速可用为目标，以 `mypilot-link` 为主线，但补齐测试与发布能力。
5. 对非主线目录只做最小同步，避免双线长期漂移。

验收标准：

1. App 设置页可以明确显示当前连接 daemon 的 flavor 与版本。
2. 通过 `/api/info` 可以判断运行代码来自哪条线。
3. 开发、测试、部署三者使用的 daemon 路径明确记录在计划执行结果中。
4. 后续任务不再同时无差别修改两条 daemon 线。

## P3-1：建立最小自动化回归集

目标：让已有稳定性成果可持续验证，避免继续开发时反复引入老问题。

涉及文件：

- `/Users/liaoxing/Downloads/未命名文件夹/package/package.json`
- `/Users/liaoxing/Downloads/未命名文件夹/package/src/*.test.js`
- `/Users/liaoxing/Downloads/未命名文件夹/mypilot-link/package.json`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot.xcodeproj/project.pbxproj`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/ChatStreamHandler.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/AttachmentTransport.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Models/Message.swift`

实施内容：

1. 给 `package/package.json` 补齐 `test` 脚本，运行现有 `node --test src/*.test.js`。
2. 将 Node 侧最小验收顺序固定为：
   - `npm run check`
   - `npm test`
   - `npm run pack:dry-run`
3. 补充 Relay / daemon 状态机测试：
   - Relay 401/403/410 后状态收敛。
   - access token 过期刷新。
   - reconnect storm 触发 cooldown。
   - `/link/logs` 不泄露敏感字段。
4. 评估是否新增 Swift 测试 target；若新增，优先测试纯逻辑：
   - `ChatStreamHandler` 的 delta、thinking、abort、done 清理。
   - `AttachmentTransport` 的相对 URL、base64、媒体指令解析。
   - `MessageAttachment` 编解码是否保留必要字段。
5. 如果暂不新增 Swift 测试 target，则先记录 Xcode 手动回归清单，并把最关键的纯逻辑保持低耦合，方便后续加测试。

验收标准：

1. `package` 目录下可以一键运行 Node 静态检查与测试。
2. 现有 Node 测试全部通过。
3. `npm run pack:dry-run` 可以暴露发布包包含文件是否正确。
4. 至少有一组针对 daemon 日志或 Relay 状态的新增回归测试。
5. Swift 侧测试策略明确：要么新增 test target，要么形成短期手动回归清单。

## P3-2：App 诊断中心升级

目标：把“出了问题要翻终端日志”的排障方式，升级为 App 内可见、可导出、可定位的诊断中心。

涉及文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Settings/NetworkSettingsView.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/APIService.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/package/src/runtime.js`
- `/Users/liaoxing/Downloads/未命名文件夹/package/src/daemon.js`
- `/Users/liaoxing/Downloads/未命名文件夹/mypilot-link/src/daemon.js`

实施内容：

1. 设计 `LinkDiagnostics` / `LinkLogSnapshot` 模型，解析 daemon 返回的状态与日志快照。
2. 给 daemon 增加本地 HTTP 日志接口，例如 `/api/logs?source=current.log&limit=100`，或在既有 `/link/logs` 能力上适配 App 访问。
3. App 设置页增加诊断分区：
   - daemon flavor / version / startedAt / pid。
   - WebSocket 连接状态。
   - Gateway / Relay 连接状态。
   - 重连次数与最近错误。
   - 上传目录、媒体目录、workspace 目录可写性。
   - 最近 100 行 current.log。
   - 最近 50 行 autostart stderr。
4. 诊断导出报告中加入日志摘要，但必须脱敏 token、refreshToken、accessToken、Authorization、配对码等字段。
5. 对日志为空、daemon 不支持日志接口、接口超时等情况显示清晰降级状态。

验收标准：

1. App 中可以看到 daemon 基础信息、连接状态和最近日志。
2. 断开 Gateway/Relay 后，诊断页能反映异常状态或最近错误。
3. 导出的诊断报告不包含敏感 token。
4. 老版本 daemon 不支持日志接口时，App 不崩溃，并显示“不支持该诊断项”。
5. 诊断页刷新不会阻塞聊天主界面。

## P3-3：发布链路清理与内测包一致性

目标：让 Node link 包可以稳定打包、检查、测试，并且版本号、源码、tgz 内容一致。

涉及文件：

- `/Users/liaoxing/Downloads/未命名文件夹/package/package.json`
- `/Users/liaoxing/Downloads/未命名文件夹/package/README.md`
- `/Users/liaoxing/Downloads/未命名文件夹/package/scripts`
- `/Users/liaoxing/Downloads/未命名文件夹/clawpilot-app-link-1.3.7.tgz`
- `/Users/liaoxing/Downloads/未命名文件夹/mypilot-link/package.json`
- `/Users/liaoxing/Downloads/未命名文件夹/mypilot-link/README.md`

实施内容：

1. 修复或移除 `package.json` 中缺失的 `release` 脚本引用。
2. 确认 `files` 字段包含运行所需文件，不包含无关素材、临时文件、构建产物或敏感文件。
3. 运行并记录 `npm pack --dry-run` 输出。
4. 确认 `clawpilot-app-link-1.3.7.tgz` 是否与当前源码版本一致；不一致则后续重新打包，不直接假设旧 tgz 可用。
5. 给发布包增加最小发布前检查命令，例如 `npm run check && npm test && npm run pack:dry-run`。
6. 明确 `mypilot-link` 的定位：主线、私有 flavor、实验线或待合并线。

验收标准：

1. `npm run release` 不再指向不存在的文件，或明确改为可用流程。
2. `npm run pack:dry-run` 输出符合预期。
3. 发布包不会包含本地构建缓存、用户数据、token、素材文件或无关文档。
4. 版本号、包名、README 描述与实际功能一致。
5. 能明确说明当前内测应安装哪个包、运行哪个 CLI 命令。

## P3-4：WebSocketService 二次拆分前置保护

目标：在不破坏现有稳定性的前提下，继续降低 `WebSocketService` 的复杂度。

涉及文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/WebSocketService.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/ConnectionManager.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/ChatStreamHandler.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/AgentRpcClient.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/AttachmentTransport.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/AppState.swift`

实施内容：

1. 先列出 `WebSocketService` 当前职责清单与状态变量清单。
2. 不直接大改主类，优先把纯函数或无状态逻辑迁移出去。
3. 候选拆分方向：
   - `MessageProtocolParser`：解析 `hello`、`delta`、`done`、`error`、`gateway-rpc`。
   - `ConversationMessageStoreAdapter`：协调会话切换和跨会话消息缓存。
   - `AgentStateStore`：维护 agents、models、currentAgentId。
   - `GatewayHttpBridge`：处理 gateway.http 相关逻辑。
4. 每次拆分只移动一个边界，并用 Xcode 构建验证。
5. 保持对外接口尽量不变，避免连锁修改 UI 层。

验收标准：

1. `WebSocketService` 行数和职责减少，但聊天、Agent、附件、会话功能保持可用。
2. 每次拆分后 Xcode 构建通过。
3. 不引入 `@Observable` 与 lazy/self capture 相关问题。
4. UI 层调用方式不发生大范围破坏性变化。

## P3-5：端到端内测清单

目标：建立每次发内测前必跑的人工/半自动验收流程。

建议验收场景：

1. 启动 daemon，App 连接成功。
2. 新建会话，发送普通文本，收到完整回复。
3. 流式回复中切换会话再切回，状态正确。
4. 中止回复后再次发送消息，状态不残留。
5. 上传图片，AI 能收到。
6. 上传非图片文件，AI 能收到。
7. AI 生成图片或文件，App 显示附件卡片。
8. 退出 App 重开，历史会话和附件仍可见。
9. 断开 daemon 或 Gateway，App 诊断页显示异常。
10. daemon 恢复后，App 能继续发送新消息。
11. Agent 切换、创建、保存模型、保存文件可用。
12. 导出诊断包，确认不含 token。
13. Node `npm run check`、`npm test`、`npm run pack:dry-run` 通过。
14. Xcode Clean Build 通过。

验收标准：

1. 所有 P3 任务完成后，至少跑通一次完整内测清单。
2. 内测清单中失败项必须记录成后续 bug，不允许只口头跳过。
3. 每次发布前能明确说明构建版本、daemon flavor、测试结果。

## Recommended Execution Order

建议按以下顺序执行：

1. P3-0：真实运行链路确认与 daemon 线收敛。
2. P3-1：建立最小自动化回归集。
3. P3-2：App 诊断中心升级。
4. P3-3：发布链路清理与内测包一致性。
5. P3-4：WebSocketService 二次拆分前置保护。
6. P3-5：端到端内测清单执行。

原因：先确定改哪条线，再建立测试，再增强诊断，然后清理发布，最后再做风险较高的结构拆分。

## Open Decisions

开始实现前建议确认两个决策：

1. 下一阶段 daemon 主线选择：
   - 方案 A：以 `package` 为主线，适合发布、Relay、CLI、内测包。
   - 方案 B：以 `mypilot-link` 为主线，适合私有化快速迭代，但需要补测试和发布能力。

2. Swift 测试策略：
   - 方案 A：本阶段新增 `MyPilotTests` target，优先覆盖纯逻辑。
   - 方案 B：暂不新增测试 target，先用 Node 自动测试 + Xcode 手动回归清单。

## Implementation Guardrails

执行本计划时必须遵守：

1. 每个阶段只改必要文件，不触碰素材文件。
2. 修改 daemon 时先确认主线，避免双线同时漂移。
3. 任何日志和诊断导出都必须脱敏。
4. 任何发布包清理都不得误删运行所需文件。
5. 每次实现后按项目实际命令执行检查；Swift 构建若受 Xcode 宏插件问题影响，应优先用 Xcode IDE 验证并记录结果。
6. 未经明确要求不提交 git commit。
