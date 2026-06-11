# 部署边界与发布链路收敛计划

## Summary

当前核心功能已完成多轮收口并已提交，下一阶段优先做“部署边界与发布链路收敛”。目标是明确 `mypilot-link` 为当前 MyPilot 产品主线，`package` 作为 ClawPilot 发布包线只做必要同步；同时让 App 诊断、README/规则、验证门禁都能清晰识别当前运行的是哪条 daemon 线，降低后续“改错文件、部署错线”的风险。

用户已确认：

1. 下一阶段优先做部署边界。
2. 本轮做完整收敛：确认运行线、App 诊断增强、双线 README/规则、两条线 verify。
3. 双线策略采用 `mypilot-link` 为当前产品主线，`package` 只做必要同步。

本轮不修改服务器素材，不动 `SOUL.md`，不引入新依赖，不做功能大重构。

## Current State Analysis

### 1. 当前存在两条 daemon 线

#### mypilot-link 主线

文件：

- `/Users/liaoxing/Downloads/未命名文件夹/mypilot-link/package.json`
- `/Users/liaoxing/Downloads/未命名文件夹/mypilot-link/src/constants.js`

现状：

- package name：`@mypilot/link`
- version：`1.0.0`
- bin：`mypilot`
- flavor：`mypilot-link`
- Node engines：`>=18.0.0`
- verify：`npm run check && npm test && npm run pack:dry-run`

该线是近期功能收口的主线，包含：

- schedule.* RPC 与 scheduler。
- 附件协议 data URI / workspace 回归。
- 诊断 `/api/info` 与 `/api/health`。
- MyPilot 私有化 OpenClaw 连接流程。

#### package 发布包线

文件：

- `/Users/liaoxing/Downloads/未命名文件夹/package/package.json`
- `/Users/liaoxing/Downloads/未命名文件夹/package/src/constants.js`

现状：

- package name：`@clawpilot-app/link`
- version：`1.3.7`
- bin：`clawlink`
- flavor：`clawpilot-link`
- Node engines：`>=22.14.0`
- verify：`npm run check && npm test && npm run pack:dry-run`
- release：`npm run verify && npm pack`
- publish：`npm publish --access public`

该线更像 ClawPilot 公共发布包，包含更完整的 npm 发布与版本策略能力。后续不应无差别复制 MyPilot 私有化改动，除非明确需要同步公共能力。

### 2. daemon 运行线可通过诊断字段识别

`mypilot-link` 的 `/api/info` 和 `/api/health` 已返回：

- `packageName`
- `version`
- `flavor`
- `pid`
- `nodeVersion`
- `startedAt`
- `port`
- `gatewayConnected`
- `gatewayConnectedAt`
- `reconnectAttempt`
- `directories`

关键文件：

- `/Users/liaoxing/Downloads/未命名文件夹/mypilot-link/src/daemon.js`

`package` 线也有 `/api/info` / `/api/health`，并返回 `packageName/version/flavor/pid/nodeVersion` 等字段，但结构与 mypilot-link 不完全相同。

关键文件：

- `/Users/liaoxing/Downloads/未命名文件夹/package/src/daemon.js`

### 3. App 诊断中心已有基础展示，但主线识别不够明确

关键文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Settings/DiagnosticsCenterView.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/ServerDiagnostics.swift`

当前 `DiagnosticsCenterView.summaryGrid` 已展示：

- 连接质量
- 运行链路：`diag.flavor ?? "未知"`
- 版本
- 活跃连接

但它还没有明确告诉用户：

- `mypilot-link` 是当前主线。
- `clawpilot-link` 属于 package 发布包线，当前项目里属于非主线。
- 未知 flavor 时应提示“可能不是预期 Link”。

### 4. 功能清单仍把双线未标记列为技术债

文件：

- `/Users/liaoxing/Downloads/未命名文件夹/FEATURE_CHECKLIST.md`

当前技术债 T5：

- `package/ 和 mypilot-link/ 双线未明确标记`
- 影响：`容易改错文件`
- 优先级：`P3`

本轮完成后应更新 T5 状态：双线边界已标记，仍需发布前按主线规则执行 verify。

### 5. 当前 Git 状态提示

根目录 `/Users/liaoxing/Downloads/未命名文件夹` 不是 Git 仓库；实际 Git 仓库是：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot`
- `/Users/liaoxing/Downloads/未命名文件夹/mypilot-link`

根目录下的 `.trae/documents/*` 和 `FEATURE_CHECKLIST.md` 无法随这两个仓库提交，除非后续单独初始化或迁移到某个仓库内。

## Proposed Changes

### 1. App 诊断中心增强运行线识别

文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/ServerDiagnostics.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Settings/DiagnosticsCenterView.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/My PilotTests/MyPilotTests/DiagnosticsReportBuilderTests.swift` 或新增诊断模型测试

改动：

1. 在 `ServerDiagnostics` 增加运行线判断属性：
   - `isMyPilotMainline: Bool`，`flavor == "mypilot-link"` 或 `packageName == "@mypilot/link"`。
   - `isClawPilotPackageLine: Bool`，`flavor == "clawpilot-link"` 或 `packageName == "@clawpilot-app/link"`。
   - `lineLabel: String`，例如：
     - `MyPilot 主线`
     - `ClawPilot 发布包线`
     - `未知 Link`
   - `lineWarning: String?`，例如：
     - 对 `clawpilot-link`：`当前连接的是 ClawPilot 发布包线；MyPilot 开发主线为 mypilot-link。`
     - 对未知 flavor：`无法识别当前 Link 运行线，请检查 /api/info。`
2. 在 `DiagnosticsCenterView` 中新增或增强运行线卡片：
   - 展示 packageName。
   - 展示 flavor。
   - 展示 lineLabel。
   - 对非主线显示警告色说明。
3. 保持现有 summaryGrid，但把“运行链路”从原始 flavor 改为更可读的 `lineLabel`。
4. 诊断导出报告中也加入 lineLabel 和 packageName/flavor。

成功标准：

- 连接 `mypilot-link` 时，诊断中心明确显示“MyPilot 主线”。
- 连接 `clawpilot-link` 时，诊断中心明确提示这是发布包线，不是当前 MyPilot 主线。
- 未知 flavor 时给出检查建议。

### 2. mypilot-link README 明确主线身份和门禁

文件：

- `/Users/liaoxing/Downloads/未命名文件夹/mypilot-link/README.md`

改动：

1. 在 README 顶部或“开发说明”部分增加：
   - `mypilot-link 是当前 MyPilot 产品主线。`
   - package name：`@mypilot/link`
   - flavor：`mypilot-link`
   - bin：`mypilot`
   - direct port：`52378`
2. 增加“修改前确认”说明：
   - 若是 MyPilot App 当前私有化体验问题，优先修改 `mypilot-link`。
   - 若是 ClawPilot 公共 npm 发布包问题，才修改 `../package`。
3. 增加验证命令：

```bash
npm run verify
```

4. 增加诊断确认命令：

```bash
curl http://127.0.0.1:52378/api/info
```

预期看到：

```json
{
  "packageName": "@mypilot/link",
  "flavor": "mypilot-link"
}
```

### 3. package README 标记为发布包线，避免误改

文件：

- `/Users/liaoxing/Downloads/未命名文件夹/package/README.md`

改动：

1. 增加醒目说明：
   - `package 是 ClawPilot 公共发布包线，不是当前 MyPilot 私有化主线。`
   - package name：`@clawpilot-app/link`
   - flavor：`clawpilot-link`
   - bin：`clawlink`
2. 增加同步规则：
   - 只有通用 Link 能力、发布包能力或明确公共能力时才改这里。
   - MyPilot 专属 UI/本地私有化调试优先改 `../mypilot-link`。
3. 保留现有发布说明，但强化：

```bash
npm run verify
npm run release
```

4. 不把 mypilot-link 的私有化功能无差别复制到 package。

### 4. 根目录功能清单与技术债更新

文件：

- `/Users/liaoxing/Downloads/未命名文件夹/FEATURE_CHECKLIST.md`

改动：

1. 更新 T5：
   - 问题：`package/ 和 mypilot-link/ 双线边界已标记，需发布前持续执行主线确认`
   - 影响：`仍需防止跨线同步遗漏`
   - 优先级：`P3`
2. 增加修复历史：
   - `v12 | 06-10 | 部署边界收敛：mypilot-link 标为 MyPilot 主线，package 标为 ClawPilot 发布包线，诊断中心显示运行线 | T5`

### 5. 可选：添加项目规则文件，供后续自动遵守

文件：

- `/Users/liaoxing/Downloads/未命名文件夹/.trae/rules/project_rules.md`

改动：

1. 如果该目录不存在，创建 `.trae/rules/`。
2. 写入后续工作规则：
   - MyPilot 当前主线：`mypilot-link`。
   - App 仓库：`MyPilotApp/MyPilot`。
   - ClawPilot 发布包线：`package`。
   - 修改 daemon 前先确认 `/api/info` 的 `packageName/flavor`。
   - 不修改服务器素材，不动 `SOUL.md`。
   - 常用验证命令。

说明：

- 该文件在根目录下，不属于现有 Git 仓库，但能帮助后续 TRAE 会话遵守项目边界。
- 如果用户希望只改 Git 仓库内文件，可跳过该步骤。

### 6. 验证步骤

#### 6.1 mypilot-link verify

```bash
cd /Users/liaoxing/Downloads/未命名文件夹/mypilot-link
npm run verify
```

预期：

- check 通过。
- tests 通过。
- pack dry-run 通过。

#### 6.2 package verify

```bash
cd /Users/liaoxing/Downloads/未命名文件夹/package
npm run verify
```

预期：

- check 通过。
- tests 通过。
- pack dry-run 通过。

#### 6.3 Swift build/test

```bash
cd /Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot
xcodebuild -project MyPilot.xcodeproj -scheme MyPilot -configuration Debug -destination 'platform=macOS' -skipMacroValidation build
```

```bash
cd /Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot
xcodebuild test -project MyPilot.xcodeproj -scheme MyPilot -destination 'platform=macOS' -skipMacroValidation
```

预期：

- build succeeded。
- tests succeeded。

#### 6.4 人工验证

1. 启动当前 Link 后访问：

```bash
curl http://127.0.0.1:52378/api/info
```

2. 确认返回：
   - `packageName == "@mypilot/link"`
   - `flavor == "mypilot-link"`
3. 打开 App 诊断中心，确认显示：
   - `MyPilot 主线`
   - packageName
   - flavor
   - version
   - pid
4. 若连接到 `clawpilot-link`，诊断中心应显示非主线提醒。

## Assumptions & Decisions

1. 用户已确认本轮做部署边界完整收敛。
2. 用户已确认 `mypilot-link` 为当前 MyPilot 产品主线。
3. `package` 作为 ClawPilot 公共发布包线，只做必要同步。
4. 不修改服务器素材，不动 `SOUL.md`。
5. 不引入新依赖。
6. 不做功能大重构。
7. 不提交 git commit，除非用户明确要求。

## Out of Scope

本轮不做：

1. 发布到 npm。
2. 部署服务器代码。
3. 修改 OpenClaw agent 素材。
4. 合并 package 与 mypilot-link 两条线。
5. WebSocketService 大拆。
6. 通话设置/订阅管理真实功能。
