# MyPilot 测试基础设施建设计划

## Summary

为 MyPilot 项目建立最小自动化回归集，覆盖 daemon（mypilot-link）核心纯函数和 Swift App 端关键逻辑，降低后续开发回归风险。

当前状态：mypilot-link 的 `npm test` 只是 `node --check` 语法检查，package/ 有 4 个测试但属于上游参考线，Swift 端完全没有测试 target。

## Current State Analysis

### daemon（mypilot-link）可测试模块

| 模块 | 文件 | 可测试的纯函数/逻辑 |
|------|------|-------------------|
| connect-token | `src/connect-token.js` | `parseConnectToken`（格式校验、过期、时钟偏移）、`generateLocalToken` |
| device-identity | `src/device-identity.js` | `sha256`、`signDetached`/`verifyDetached`、`generateDeviceKeyPair`、`buildSignedGatewayDeviceIdentity`（需 mock `loadCredentials`） |
| search-providers | `src/search-providers.js` | `encryptApiKey`/`decryptApiKey`（内部函数，需导出或间接测试）、`listProvidersSummary`、`getWebParsingEnabled`/`setWebParsingEnabled` |
| daemon 内部 | `src/daemon.js` | `stripThinkingTags`、`extractContentParts`、`setNestedValue`/`getNestedValue`（当前未 export） |
| scheduler | `src/scheduler.js` | `Scheduler` 类的 `create`/`update`/`delete`/`list`/`_getNextRun`（cron 解析、持久化、启用/禁用状态切换） |
| runtime | `src/runtime.js` | `readLinkLogSnapshot`（尾部读取逻辑）、`appendLogLine`（轮转逻辑）、`loadJson`/`saveJson` |

### Swift App 端可测试模块

| 模块 | 文件 | 可测试逻辑 |
|------|------|-----------|
| ChatStreamHandler | `Services/ChatStreamHandler.swift` | `parseDelta`（delta 解析、去重）、thinking 过滤、done/abort 清理 |
| AttachmentTransport | `Services/AttachmentTransport.swift` | `resolveAllAttachments`（相对 URL、base64、媒体指令解析） |
| Message 模型 | `Models/Message.swift` | `MessageAttachment` 编解码、`isLikelyCorruptThinking` |

### 约束
- `daemon.js` 中的 `stripThinkingTags`、`extractContentParts`、`setNestedValue`、`getNestedValue` 当前是模块内私有函数，需 export 才能测试
- `search-providers.js` 的加密函数也是私有的，需导出或通过公开 API 间接测试
- Swift 测试需要新建 `MyPilotTests` target

## Proposed Changes

### Step 1: mypilot-link 导出可测试函数

**文件**: `mypilot-link/src/daemon.js`

将以下私有函数改为 export：
- `stripThinkingTags` → `export function stripThinkingTags`
- `extractContentParts` → `export function extractContentParts`
- `setNestedValue` → `export function setNestedValue`
- `getNestedValue` → `export function getNestedValue`

**文件**: `mypilot-link/src/search-providers.js`

导出加密相关函数用于测试：
- `encryptApiKey` → `export function encryptApiKey`
- `decryptApiKey` → `export function decryptApiKey`

### Step 2: mypilot-link 新增测试文件

**新建文件**: `mypilot-link/src/connect-token.test.js`

测试用例：
1. `parseConnectToken` — 有效 token 解析
2. `parseConnectToken` — 格式错误（缺段、空值）
3. `parseConnectToken` — 过期 token
4. `parseConnectToken` — 时钟偏移边界
5. `generateLocalToken` — 格式正确性（4 段，hash 可验证）

**新建文件**: `mypilot-link/src/device-identity.test.js`

测试用例：
1. `sha256` — 一致性（同输入同输出）
2. `signDetached` + `verifyDetached` — 签名验证闭环
3. `generateDeviceKeyPair` — 返回合法 hex 公钥/私钥
4. `buildSignedGatewayDeviceIdentity` — 返回结构完整（id, publicKey, signature, signedAt, nonce）

**新建文件**: `mypilot-link/src/daemon-utils.test.js`

测试用例：
1. `stripThinkingTags` — 移除 `<think...</think >` 包裹内容
2. `stripThinkingTags` — 无闭合标签时截断到末尾
3. `stripThinkingTags` — 无 thinking 标签时原样返回
4. `extractContentParts` — 字符串输入返回 text
5. `extractContentParts` — 数组输入：text + thinking + image + file
6. `extractContentParts` — data:image base64 图片处理（需 mock fs）
7. `setNestedValue` — 设置深层路径（如 "tools.web.fetch.enabled"）
8. `setNestedValue` — 中间路径不存在时自动创建
9. `getNestedValue` — 读取深层路径
10. `getNestedValue` — 路径不存在返回 undefined

**新建文件**: `mypilot-link/src/scheduler.test.js`

测试用例：
1. `create` — 创建任务，返回带 id 的 task
2. `create` — 空 content 返回错误
3. `create` — 无效 cron 表达式返回错误
4. `update` — 更新任务名称/cron
5. `update` — 切换 isEnabled
6. `delete` — 删除存在/不存在的任务
7. `list` — 返回带 nextRunAt 的列表
8. `_getNextRun` — 禁用任务返回 null
9. 持久化：创建后重新 load，任务仍在
10. `run` — 触发 onFire 回调

**新建文件**: `mypilot-link/src/search-providers.test.js`

测试用例：
1. `encryptApiKey` + `decryptApiKey` — 加解密闭环
2. `encryptApiKey` — 不同密钥解密失败
3. `listProvidersSummary` — 返回正确结构
4. `getWebParsingEnabled` / `setWebParsingEnabled` — 读写一致

### Step 3: 修复 mypilot-link 的 npm test 脚本

**文件**: `mypilot-link/package.json`

```json
"test": "node --test src/*.test.js"
```

替换当前的 `"test": "npm run check"`。

同时更新 `verify` 脚本：
```json
"verify": "npm run check && npm test && npm run pack:dry-run"
```

### Step 4: 新建 Swift 测试 target

在 Xcode 项目中新增 `MyPilotTests` target，覆盖纯逻辑模块。

**新建文件**: `MyPilotApp/MyPilot/MyPilotTests/ChatStreamHandlerTests.swift`

测试用例：
1. `parseDelta` — 普通 text delta
2. `parseDelta` — thinking delta
3. `parseDelta` — 连续 delta 拼接
4. done 状态清理
5. abort 状态清理

**新建文件**: `MyPilotApp/MyPilot/MyPilotTests/AttachmentTransportTests.swift`

测试用例：
1. `resolveAllAttachments` — 相对 URL 补全
2. `resolveAllAttachments` — base64 data URI
3. `resolveAllAttachments` — 媒体指令解析

**新建文件**: `MyPilotApp/MyPilot/MyPilotTests/MessageTests.swift`

测试用例：
1. `isLikelyCorruptThinking` — 正常 thinking 不误判
2. `isLikelyCorruptThinking` — 损坏数据正确识别
3. `MessageAttachment` 编解码 — base64Data 保留

> 注意：Swift 测试 target 需要在 Xcode IDE 中手动创建（File → New → Target → Unit Testing Bundle），因为 `project.pbxproj` 手动编辑风险高。本计划中我会生成测试文件代码，但 target 配置需你在 Xcode 中操作。

### Step 5: 验证与回归

1. 在 mypilot-link 目录运行 `npm run verify`，确认所有测试通过
2. 在 Xcode 中创建 MyPilotTests target，添加测试文件，Cmd+U 运行
3. 更新 FEATURE_CHECKLIST.md 中的技术债状态（T2、T3）

## Assumptions & Decisions

1. **只测 mypilot-link 线**：package/ 是上游参考，不投入测试资源
2. **优先纯函数测试**：不涉及网络/文件系统的逻辑优先，需要 mock 的其次，端到端暂不做
3. **daemon.js 导出私有函数**：通过 export 暴露，不影响运行时行为，仅增加可测试性
4. **Swift 测试 target 需手动创建**：Xcode 项目文件不适合脚本化修改，生成测试代码后由用户在 IDE 中添加 target
5. **使用 Node.js 内置 test runner**：`node:test`，不引入额外依赖（与 package/ 线一致）

## Verification Steps

1. `cd mypilot-link && npm run verify` — check + test + pack:dry-run 全部通过
2. `cd mypilot-link && npm test` — 所有新增测试用例通过
3. Xcode 中 MyPilotTests target Cmd+U — Swift 测试全部通过
4. 现有功能不受影响：App 正常连接、聊天、定时任务正常工作
