# 定时任务端到端闭环实施计划

## Summary

本轮聚焦“定时任务端到端闭环”，目标是把功能清单中仍标为开发中/未验证的定时任务项推进到可验证完成：

- #69 daemon 定时调度执行。
- #101 定时任务调度器。
- #102 schedule.* RPC。

当前 daemon 侧已有 `Scheduler` 和 `schedule.create/list/update/delete/run` RPC，但 App 侧仍以 `UserDefaults` 为主，并且新建任务错误地调用 `schedule.update`；手动触发也绕过 daemon，直接 `sendMessage`。本轮将 App 侧改成 daemon 优先、UserDefaults fallback，并补充测试与功能清单校准。

## Current State Analysis

### 1. App 侧现状

关键文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Settings/ScheduledTasksView.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Models/ScheduledTask.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/WebSocketService.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/AgentRpcClient.swift`

当前问题：

1. `ScheduledTasksView.loadTasks()` 只从 `@AppStorage("scheduledTasks")` 读取本地任务。
2. 新建任务时先写入本地，然后调用 `syncToDaemon(task)`。
3. `syncToDaemon(task)` 始终调用 `scheduleUpdate(id:updates:)`。
4. daemon 的 `Scheduler.update(id, params)` 对不存在任务返回 `not found`，所以新建任务并不会真正创建 daemon 任务。
5. 手动触发 `triggerTask(_:)` 当前创建 `Message` 并调用 `ws?.sendMessage(msg)`，没有调用 daemon 的 `schedule.run`，因此不会更新 daemon 任务的 `lastRunAt/lastRunStatus/lastRunError`。
6. UI 有 `lastRunAt`、`lastRunStatus`、`lastRunError` 和 `nextRunAt` 字段，但多数状态来自本地估计，没有从 daemon 真实状态同步。

### 2. daemon 侧现状

关键文件：

- `/Users/liaoxing/Downloads/未命名文件夹/mypilot-link/src/scheduler.js`
- `/Users/liaoxing/Downloads/未命名文件夹/mypilot-link/src/daemon.js`
- `/Users/liaoxing/Downloads/未命名文件夹/mypilot-link/src/scheduler.test.js`

当前能力：

1. `Scheduler.create(params)` 会创建任务、校验 cron、返回包含 `nextRunAt` 的 task。
2. `Scheduler.update(id, params)` 只更新已存在任务，不做 upsert。
3. `Scheduler.run(id)` 会触发 `_fireTask(id)`。
4. `_fireTask(id)` 会设置 `lastRunAt`、`lastRunStatus`、`lastRunError`。
5. daemon 已暴露 RPC：
   - `schedule.list`
   - `schedule.create`
   - `schedule.update`
   - `schedule.delete`
   - `schedule.run`
6. `scheduler.test.js` 已覆盖 create/update/delete/list/run，但还缺少失败执行状态、update 不存在、create 默认字段等部分状态展示边界。

### 3. 功能清单现状

文件：

- `/Users/liaoxing/Downloads/未命名文件夹/FEATURE_CHECKLIST.md`

当前定时任务相关条目：

- #60-68 多数 App 侧功能标为 ✅，但备注仍偏 UserDefaults。
- #69 `daemon 定时调度执行` 标为 🔧。
- #101 `定时任务调度器` 标为 🔧。
- #102 `schedule.* RPC` 标为 🔧。

技术债中 T2/T3/T6 已落后于当前状态：

- Swift Tests target 已存在并可跑。
- daemon 侧已有真实 `node:test`。
- 诊断中心已经产品化并消费 `/api/info`、`/api/logs`。

## Proposed Changes

### 1. App 侧定时任务改为 daemon 优先

#### 1.1 新增 daemon task 与本地 `ScheduledTask` 映射

文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Models/ScheduledTask.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Settings/ScheduledTasksView.swift`

改动：

1. 新增从 daemon task dictionary 转换为 `ScheduledTask` 的初始化/解析逻辑。
2. 支持字段：
   - `id`
   - `name`
   - `cronExpression`
   - `agentId`
   - `content`
   - `isEnabled`
   - `timezone`
   - `createdAt`
   - `lastRunAt`
   - `lastRunStatus`
   - `lastRunError`
   - `nextRunAt`
3. 因 daemon 返回的 `id` 是字符串 UUID，App 模型当前 `id` 为 `UUID`。若 daemon 生成 id 不是 UUID 格式，需要二选一：
   - 推荐：将 `ScheduledTask.id` 从 `UUID` 改成 `String`，彻底兼容 daemon id。
   - 保守：解析失败时用 `UUID(uuidString:) ?? UUID()`，但会导致 update/delete/run 找不到 daemon 原 id。
4. 本轮推荐把 `ScheduledTask.id` 改为 `String`，并在本地创建时用 `UUID().uuidString`，避免 daemon id 兼容问题。

兼容处理：

- 旧 UserDefaults 中 `ScheduledTask.id` 曾是 UUID，Swift `UUID` 编码为字符串。把模型改成 `String` 后，旧 JSON 大概率可直接解码为 String；如失败，再实现兼容 decoder。

#### 1.2 `loadTasks()` daemon 优先、UserDefaults fallback

文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Settings/ScheduledTasksView.swift`

改动：

1. 页面 `onAppear` 调用 `loadTasks()`。
2. `loadTasks()` 行为：
   - 如果 `appState.currentWebSocket` 存在，先调用 `scheduleList`。
   - 如果返回非空或成功，则将 daemon tasks 映射为 `ScheduledTask`，更新 UI，并写入 UserDefaults 缓存。
   - 如果 RPC 失败或无连接，则回退读取 UserDefaults。
3. 需要区分“RPC 成功但任务为空”和“RPC 失败”。当前 `AgentRpcClient.scheduleList` 只返回 `[]`，无法区分失败和空列表。建议新增一个更明确的回调或在 `WebSocketService` 加轻量包装：
   - `scheduleListDetailed(callback: @escaping (Bool, [[String: Any]]) -> Void)`。
   - 或修改 `AgentRpcClient.scheduleList` 返回 `nil` 表示失败。
4. 本轮推荐新增 `scheduleListDetailed`，保留旧 `scheduleList` 兼容其它调用。

成功标准：

- daemon 有任务时，进入页面显示 daemon 任务。
- daemon 空任务时，页面显示空状态，不错误回填旧本地任务。
- daemon 不可用时，回退显示 UserDefaults 缓存。

#### 1.3 新建任务使用 `schedule.create`

文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Settings/ScheduledTasksView.swift`

改动：

1. 新建任务时不再先本地 append 后 `schedule.update`。
2. 新建任务流程：
   - 先构造 params。
   - 调用 `scheduleCreate(params:)`。
   - 如果 daemon 返回 task，映射为 `ScheduledTask` 并 append/update UI，写入 UserDefaults。
   - 如果 daemon 不可用或 create 失败，允许 fallback 到本地保存，并显示状态提示或保留现有体验。
3. 本轮不新增复杂 toast 系统；失败状态可先通过 `lastRunError` 或本地列表显示。

成功标准：

- 新建任务后 daemon `schedule.list` 能查到该任务。
- 新建任务的 id 使用 daemon 返回 id。

#### 1.4 编辑、启停、删除使用 daemon 真实 id

文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Settings/ScheduledTasksView.swift`

改动：

1. 编辑任务继续使用 `schedule.update(id:updates:)`，但 id 应为 daemon id 字符串。
2. 启停任务继续走 `schedule.update(id, isEnabled)`。
3. 删除任务继续走 `schedule.delete(id:)`。
4. daemon 返回 task 后用返回值更新 UI，而不是只更新本地对象。
5. daemon 失败时本地 UI 可保持原状态并显示错误；不要假装成功。

成功标准：

- 编辑后刷新页面仍显示更新后的 daemon 状态。
- 暂停/启用后 `nextRunAt` 正确变化。
- 删除后 daemon list 不再返回该任务。

#### 1.5 手动触发使用 `schedule.run`

文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Settings/ScheduledTasksView.swift`

改动：

1. `triggerTask(_:)` 不再直接 `ws.sendMessage(msg)`。
2. 改为调用 `scheduleRun(id:)`。
3. 点击时本地可先标记 `.running`。
4. RPC 返回成功后延迟短时间刷新 `schedule.list`，获取 daemon 更新后的 `lastRunAt/lastRunStatus/lastRunError`。
5. 如果 RPC 返回失败，标记 `.failed` 并展示错误。

成功标准：

- 手动触发走 daemon 的 scheduler 执行路径。
- 失败时显示 daemon 返回错误或 fallback 错误。

### 2. daemon 侧测试补强

文件：

- `/Users/liaoxing/Downloads/未命名文件夹/mypilot-link/src/scheduler.test.js`
- `/Users/liaoxing/Downloads/未命名文件夹/mypilot-link/src/scheduler.js`

改动：

1. 补测试：`run` 成功后 `lastRunStatus` 最终为 `success`。
2. 补测试：`onFire` throw 时 `lastRunStatus` 为 `failed`，`lastRunError` 有值。
3. 补测试：`update` 不存在任务返回 false/error。
4. 补测试：禁用任务 `nextRunAt == null` 已有，可保留。
5. 如测试需要等待 `_fireTask` async 完成，使用小延迟或直接 await 内部状态，不引入新依赖。

成功标准：

- `npm run verify` 通过。

### 3. Swift 测试补强

候选文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/My PilotTests/MyPilotTests/ScheduledTaskMappingTests.swift`

改动：

1. 测试 daemon dictionary → `ScheduledTask` 映射：
   - id 字符串保留。
   - cron、agent、content、enabled、timezone 正确。
   - ISO8601 日期解析到 Date。
   - `lastRunStatus` 字符串映射到 enum。
2. 测试本地创建的 `ScheduledTask` id 是 String 且非空。
3. 如果新增 helper 纯函数生成 params，测试 `scheduleCreate` params 不包含 App-only 字段，且包含 daemon 所需字段。

成功标准：

- `xcodebuild test -skipMacroValidation` 通过。

### 4. 功能清单校准

文件：

- `/Users/liaoxing/Downloads/未命名文件夹/FEATURE_CHECKLIST.md`

改动：

1. 更新 #60-69：
   - #60 列表改为 daemon 优先 + UserDefaults fallback。
   - #61 创建改为 `schedule.create`。
   - #65 手动触发改为 `schedule.run`。
   - #69 若验证通过，标记 ✅。
2. 更新 #101/#102：若 `npm run verify` 和 Swift 回归通过，标记 ✅。
3. 更新技术债：
   - T2 从“无 Swift Tests target”改为“已有 Swift Tests，需继续扩展覆盖”。
   - T3 从“daemon 无单测”改为“已有 node:test，需覆盖端到端边界”。
   - T6 从“诊断未产品化”改为“诊断中心已产品化，需持续补日志脱敏/体验”。

成功标准：

- 清单反映当前真实状态，不再误导后续开发。

### 5. 验证步骤

#### 5.1 Node 验证

```bash
cd /Users/liaoxing/Downloads/未命名文件夹/mypilot-link
npm run verify
```

预期：

- check 通过。
- node:test 通过。
- pack dry-run 通过。

#### 5.2 Swift 构建与测试

```bash
cd /Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot
xcodebuild -project MyPilot.xcodeproj -scheme MyPilot -configuration Debug -destination 'platform=macOS' -skipMacroValidation build
```

```bash
cd /Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot
xcodebuild test -project MyPilot.xcodeproj -scheme MyPilot -destination 'platform=macOS' -skipMacroValidation
```

预期：

- Build succeeded。
- Test succeeded。

#### 5.3 人工回归

1. 打开设置 → 定时任务。
2. daemon 可用时，列表从 daemon 加载。
3. 新建任务后，刷新页面仍显示任务。
4. 编辑任务后，刷新页面仍显示新内容。
5. 暂停任务后，`nextRunAt` 为空或 UI 显示已暂停。
6. 启用任务后，`nextRunAt` 恢复。
7. 手动触发任务走 `schedule.run`，状态从 running 到 success/failed。
8. 删除任务后，刷新页面不再出现。
9. App 重启后任务仍存在。
10. daemon 不可用时，页面回退显示本地缓存。

## Assumptions & Decisions

1. 用户已确认本轮聚焦“定时任务端到端闭环”。
2. 用户已确认 App 侧任务数据源采用 daemon 优先、UserDefaults fallback。
3. 用户已确认 FEATURE_CHECKLIST 校准纳入本轮。
4. 不修改 daemon/Gateway 协议语义，只修 App 使用方式与测试。
5. 不引入新第三方依赖。
6. 不修改服务器素材、不修改 `SOUL.md`。
7. 不提交 git commit，除非用户明确要求。

## Out of Scope

本轮不做：

1. 文件附件协议统一。
2. 会话持久化跨会话稳定性。
3. 通话设置/订阅管理占位页处理。
4. package 与 mypilot-link 双线发布治理。
5. WebSocketService 大规模重构。
