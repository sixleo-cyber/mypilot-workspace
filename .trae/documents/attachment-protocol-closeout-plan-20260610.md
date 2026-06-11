# 附件协议收尾验证计划

## Summary

当前附件协议统一的主要实现已经落地，但还不能视为完全完成。本轮计划聚焦“收尾验证”，不再扩展新功能，目标是把附件协议从“实现基本完成”推进到“测试、历史恢复、daemon 回归、清单状态全部闭环”。

本轮明确包含：

1. 修正 Swift 附件测试中疑似失败的 `MY_PILOT_MEDIA_V1` 用例。
2. 补齐 daemon 附件回归，尤其是 data URI 与 workspace 文件路径。
3. 修复远端 `chat.history` 回灌时附件丢失的问题。
4. 更新 `FEATURE_CHECKLIST.md` 中 T4 技术债状态。
5. 执行完整门禁：`npm run verify`、Swift build、Swift tests。

## Current State Analysis

### 1. 已落地的附件统一实现

关键文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Models/Message.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/AttachmentPreparationService.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/AttachmentTransport.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/WebSocketService.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Views/ChatView.swift`
- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Views/InputBarView.swift`

已完成状态：

1. `MessageAttachment` 已支持 `url + base64Data` 共存，并实现 `Equatable`、`Hashable`。
2. `AttachmentPreparationService` 已抽出，统一 `prepareFile`、`prepareImageData`、`compressImageData` 和 5MB base64 fallback 常量。
3. `ChatView.prepareAttachment` 已改为调用 `AttachmentPreparationService`。
4. `InputBarView.uploadFileToServer` 和 `uploadImageData` 已改为调用 `AttachmentPreparationService`。
5. 拖拽附件已通过 `pendingExternalAttachments` 注入输入栏，不再自动发送。
6. `AttachmentTransport.parseAttachments` 已支持相对 URL、绝对 URL、`data/base64Data`、data URI 前缀剥离和最小去重。
7. `WebSocketService` 的 `done` 与 `message/message.send` 已统一使用 `AttachmentTransport.resolveAllAttachments(...)`。

### 2. 明确未收尾风险

#### 2.1 Swift 测试疑似失败

文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/My PilotTests/MyPilotTests/AttachmentTransportTests.swift`

当前 `resolveAllAttachmentsDeduplicates` 测试构造了 JSON 形式的 `MY_PILOT_MEDIA_V1`：

```swift
MY_PILOT_MEDIA_V1:{"id":"same",...}
```

但生产代码 `AttachmentTransport.parseMediaDirectives` 的正则只接受 base64url token：

```swift
MY_PILOT_MEDIA_V1:([A-Za-z0-9\-_]+)
```

因此该测试很可能失败。应按实际协议构造 base64 payload，或者明确扩展生产代码支持 JSON 形式。为避免扩大协议，本轮选择修测试为 base64 payload。

#### 2.2 daemon 附件回归不足

文件：

- `/Users/liaoxing/Downloads/未命名文件夹/mypilot-link/src/daemon-utils.test.js`
- `/Users/liaoxing/Downloads/未命名文件夹/mypilot-link/src/daemon.js`

当前 daemon 测试已覆盖 `extractContentParts` 的文本、thinking、file URL、image URL，但计划要求的这些还缺少覆盖：

1. image data URI → `/api/file/:id` 附件。
2. workspace 文件路径 → `/api/workspace-file/:filename` 附件。
3. data URI 的 MIME 与 base64 数据解析正确。

当前 `daemon-utils.test.js` 已新增 `fs/os/path` import，但未完成后续测试，因此本轮要补齐。

#### 2.3 远端 `chat.history` 仍丢附件

文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/WebSocketService.swift`

当前两处历史加载仍只恢复 `role/content`：

1. `requestHistory(agentId:conversationId:)` 处理 `chat.history` RPC payload。
2. `parseMessage` 中处理 `chat.history` / `gateway-rpc chat.history`。

这会导致远端历史回灌时丢失 `attachments`、`base64Data` 和内容中的 `MY_PILOT_MEDIA_V1` 指令解析结果。本轮将把历史消息映射也统一到 `AttachmentTransport.resolveAllAttachments(...)`。

#### 2.4 功能清单 T4 未校准

文件：

- `/Users/liaoxing/Downloads/未命名文件夹/FEATURE_CHECKLIST.md`

当前 T4 仍为：

```markdown
| T4 | MessageAttachment 编码冲突（url vs base64） | 历史消息图片可能丢失 | P3 |
```

实现与测试完成后，应改为反映真实状态：附件协议已统一，但仍建议未来补真实大文件/多文件端到端回归。

## Proposed Changes

### 1. 修正 Swift 附件测试

文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/My PilotTests/MyPilotTests/AttachmentTransportTests.swift`

改动：

1. 将 `resolveAllAttachmentsDeduplicates` 中的 JSON 文本指令改为生产代码实际接受的 base64url token。
2. 构造 payload 字段使用生产代码真实字段：
   - `id`
   - `fn`
   - `mt`
   - `sz`
3. 预期：
   - `clean == "hello"`
   - attachments 去重后只有 1 个。
   - URL 补全或媒体 URL 生成符合当前协议。
4. 如现有测试难以表达“与 raw attachment 同 id 去重”，可拆成两个测试：
   - `parseMediaDirectives` 可解析并清理 base64 token。
   - `resolveAllAttachments` 对同 id raw/directive 去重。

### 2. 补 daemon 附件回归测试

文件：

- `/Users/liaoxing/Downloads/未命名文件夹/mypilot-link/src/daemon-utils.test.js`

改动：

1. 补 `extractContentParts handles image data URI`：
   - 构造 `data:image/png;base64,...`。
   - 调用 `extractContentParts`。
   - 断言返回 1 个附件。
   - 断言 `mimeType == "image/png"`。
   - 断言 `url` 以 `/api/file/` 开头。
   - 如可安全读取，断言上传目录文件存在且内容匹配。
2. 补 `extractContentParts detects workspace file references`：
   - 在测试可控的 workspace 目录创建一个临时文件。
   - 文本包含 `/root/.openclaw/workspace/<filename>`。
   - 断言返回 `/api/workspace-file/<filename>` 附件。
3. 测试必须避免写用户真实素材目录。若当前 `extractContentParts` 强依赖 `os.homedir()`，可使用测试进程的临时 HOME 或在测试前创建/清理 `~/.openclaw/workspace` 下仅测试文件，文件名带唯一前缀，测试结束删除。
4. 不引入新依赖。

### 3. 修复远端历史附件恢复

文件：

- `/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/WebSocketService.swift`

改动：

1. 新增私有 helper，例如：
   - `private func mapHistoryMessages(_ rawMessages: [[String: Any]]) -> [Message]`
   - `private func mapHistoryMessage(_ raw: [String: Any]) -> Message`
2. helper 逻辑：
   - 读取 `role` 判断 `isFromUser`。
   - 读取 `content`。
   - 读取 `attachments`。
   - 调用 `AttachmentTransport.resolveAllAttachments(rawAttachments:content:serverURL:token:)`。
   - 创建 `Message(content: cleanContent, isFromUser: role == "user", attachments: attachments)`。
   - 如远端存在 `thinking` 或 `reasoning_content`，填入 `thinkingContent`。
3. 替换三处历史映射：
   - `requestHistory(...)` callback。
   - `case "chat.history"`。
   - `case "gateway-rpc"` 中 `method == "chat.history"`。
4. 保持现有“只有 history count >= current messages count 才覆盖”的安全策略。

成功标准：

- 远端历史中带 attachments 时 App 恢复附件。
- 远端历史 content 中带 `MY_PILOT_MEDIA_V1` 时 App 清理指令并恢复附件。
- 本地 Codable 历史行为不受影响。

### 4. 更新功能清单

文件：

- `/Users/liaoxing/Downloads/未命名文件夹/FEATURE_CHECKLIST.md`

改动：

1. 更新 T4 为：
   - 问题：`附件协议已统一，需补真实端到端大文件/多文件场景`
   - 影响：`仍需持续覆盖复杂附件回归`
   - 优先级：`P3`
2. 如验证完成，可在 Bug 修复历史新增一行：
   - `v10 | 06-10 | 附件协议统一收尾：拖拽/选择一致、done/message/history 附件解析统一、daemon 附件回归 | T4`

### 5. 验证步骤

#### 5.1 Node 完整验证

```bash
cd /Users/liaoxing/Downloads/未命名文件夹/mypilot-link
npm run verify
```

预期：

- `node --check` 通过。
- `node:test` 通过。
- `npm pack --dry-run` 通过。

#### 5.2 Swift 构建

```bash
cd /Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot
xcodebuild -project MyPilot.xcodeproj -scheme MyPilot -configuration Debug -destination 'platform=macOS' -skipMacroValidation build
```

预期：

- `BUILD SUCCEEDED`。

#### 5.3 Swift 测试

```bash
cd /Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot
xcodebuild test -project MyPilot.xcodeproj -scheme MyPilot -destination 'platform=macOS' -skipMacroValidation
```

预期：

- `TEST SUCCEEDED`。

## Assumptions & Decisions

1. 用户已确认下一步优先“附件收尾”。
2. 用户已确认纳入远端 `chat.history` 附件恢复。
3. 用户已确认执行完整门禁。
4. 不新增附件协议格式；`MY_PILOT_MEDIA_V1` 继续使用当前 base64url token 协议。
5. 不修改 Gateway 协议。
6. 不修改服务器素材、不修改 `SOUL.md`。
7. 不引入第三方依赖。
8. 不提交 git commit，除非用户明确要求。

## Out of Scope

本轮不做：

1. 新 UI 能力。
2. 大文件分片上传。
3. 多文件上传进度条。
4. package 与 mypilot-link 双线发布治理。
5. 消息可靠性专项。
6. 通话设置/订阅管理占位页处理。
