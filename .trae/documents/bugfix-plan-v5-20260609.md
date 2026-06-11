# Bug 修复计划 v5 — 2026-06-09（迭代3）

## 问题清单（v4 修复后剩余 + 新发现）

1. ✅ 编译已通过（之前 Section 错误已修）
2. ❌ **命令执行权限切换仍不持久化**：切开 → 退出 → 显示关闭
3. ❌ **思考过程仍胡言乱语** —— 用户建议参考飞书插件实现
4. ✅ 同步说明文案已显示
5. ❌ **服务器验证 `commands.native` 仍为 `"auto"`** —— setConfig 根本没生效

## Phase 1 探索发现（关键真相）

### 真相 A：daemon 的 res 帧类型 App 端不识别（Bug 2、5）

daemon 中 `handleConfigSetByKey` 和 `handleConfigGetByKey` 发送的是：
```js
ws.send(JSON.stringify({ type: "res", id: frameId, ok: true, payload: {...} }));
```

但 App 端 [`WebSocketService.parseMessage`](file:///Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/WebSocketService.swift#L566-L599) 的 switch case **只识别**：
- `gateway-rpc`（透传 RPC 用）
- `agent.model.set`
- `gateway.http`

**完全没有 `case "res":` 分支**！所以：
- App 发 `config.set` → daemon 处理写入 Gateway（如果 commands.native 用 boolean 这一步成功）→ daemon 回 `{type:"res", ok:true}` → **App 端 switch 无匹配 → callback 永不调用 → pendingRpcCallbacks 永久积压**
- App 的 `setConfig` callback 也不会调用（看不到任何确认/失败）
- 下次进入页面 `loadPermissions` 调 `config.get` → 同样回 `type:"res"` → callback 不调用 → UI 默认 `false`

**这是 Bug 2 和 Bug 5 的真正根因！** 我之前的 v3/v4 修改其实在 daemon 层做对了，但响应消息类型不对，App 收不到，导致功能完全失效。

### 真相 B：commands.native 值检查

服务器仍为 `"auto"` 说明 **set 请求要么没到 Gateway，要么 Gateway 拒绝了**。即使 App 现在用 boolean 发，因为 res 不被识别 callback 不调用，App 可能也以为成功。需要查 daemon 日志确认 set 是否真的被发送到 Gateway。

但即使日志显示 Gateway 接收并成功了，App 端 callback 也收不到 → UI 状态混乱（看起来"开了"但下次显示"关"）。

### 真相 C：思考过程胡言乱语来源

抓取 daemon 真实日志确认 Gateway **从不发** `type: "thinking"` 部分；文本中也没有 `<think>` 标签。所以**新会话**理论上 thinking 永远为空。

**但用户仍看到胡言乱语**，原因：
- **历史消息**：v3 之前的 daemon bug 数据已持久化到 `conv-{convId}.json`，message.thinkingContent 中保存了重复内容
- 用户每次进入旧会话都会渲染这些旧数据

### 真相 D：飞书插件做法（用户提示）

飞书插件的流式只展示最终结果，**不展示思考过程的中间状态**——避免突然从"思考"切到"回答"的违和感。我们当前的实现**也是只在 done 后显示 thinking**，符合飞书风格。问题不在显示策略，而在数据来源。

## 修复方案

### 修复 1：App 增加 `case "res":` 帧处理（Bug 2、5 根因）

**文件**：[`WebSocketService.swift`](file:///Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Services/WebSocketService.swift#L566)

在 `parseMessage` switch 中增加：
```swift
case "res":
    let id = json["id"] as? String ?? ""
    mainAsync { [weak self] in
        guard let self = self else { return }
        if let callback = self.pendingRpcCallbacks.removeValue(forKey: id) {
            callback(json)
        }
    }
```

这样 daemon 的 `{type:"res", id, ok, payload, error}` 帧能被正确分发给 callback。

### 修复 2：daemon 启动时打 schema/values 检查日志（防御）

**文件**：[`daemon.js`](file:///Users/liaoxing/Downloads/未命名文件夹/mypilot-link/src/daemon.js)

在 `handleConfigSetByKey` 调用 gateway `config.set` 前后增加更详细日志（写入前的 key/value，Gateway 返回的 ok/error），方便用户验证写入是否到达 Gateway。

### 修复 3：清理历史消息中的异常 thinkingContent（Bug 3）

**文件**：[`AppState.swift`](file:///Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/AppState.swift)

在 `loadMessages` 时增加一次性的"thinkingContent 健康检查"：
- 如果 message.thinkingContent 非空，且其字符长度 > 20 且**字符种类极少**（重复字符占比 > 60%）→ 判定为旧 bug 数据，清空 thinkingContent
- 或者更保守：**只在加载时检测**，不修改文件；仅运行时不展示

**保守做法**（不破坏用户数据）：
- 在 [`MessageBubbleView`](file:///Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Chat/MessageBubbleView.swift#L123) 的 thinking 渲染判断处增加"内容质量检查"：如果 thinking 是字符重复模式（如同一字符连续出现 5+ 次以上占比超 40%），则**不展示**

实现一个工具函数 `isLikelyCorruptThinking(_ text: String) -> Bool`：
- 统计文本中"连续重复 ≥5 字符"段落的总长度
- 若占比 > 40% → 返回 true（认为是坏数据，不展示）

**优势**：
- 不修改持久化数据（符合用户规则）
- 仅在渲染时过滤，对正常 thinking 无影响
- 对未来可能真发生的"模型卡顿吐重复字符"也有保护

### 修复 4：Toggle 状态本地优先（防护 UX）

**文件**：[`NetworkSettingsView.swift`](file:///Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Settings/NetworkSettingsView.swift)

将权限切换状态用 `@AppStorage` 本地存储作为 fallback：
- onChange → setConfig 写远端 + 本地存储（双写）
- loadPermissions → 先读远端，失败则用本地存储

这样即使远端写失败/读失败，UI 状态也能保持一致。但**不推荐**——可能掩盖真实问题。

**决策**：暂不实施修复 4，先做 1-3，让 Bug 5 真相暴露。

## 文件变更清单

| 文件 | 变更 | 优先级 |
|------|------|--------|
| `WebSocketService.swift` | 增加 `case "res":` 帧处理（修复 5 + 完整修复 4 的 setConfig 回调链路） | P0 |
| `daemon.js` | 增强 `handleConfigSetByKey` 日志（写入前后 + Gateway 响应） | P1 |
| `MessageBubbleView.swift` | 增加 `isLikelyCorruptThinking` 渲染过滤 | P0 |

## 假设与决策

- **假设 A**：daemon 修改后 `commands.native` 用 boolean 写入会被 Gateway 接受（基于日志 `allowed: true, false, "auto"`）。如果仍失败，下一轮需查 Gateway schema。
- **决策 A**：不修改用户已持久化的历史消息文件（符合"不修改已部署素材"规则），仅在渲染层过滤。
- **决策 B**：飞书风格——保持当前"仅 done 后显示 thinking"的策略，不改流式展示策略。
- **决策 C**：不引入 `@AppStorage` 双写 fallback，避免掩盖真实问题。

## 验证步骤

1. **重启 daemon、重新编译 App**
2. **命令执行权限持久化**：进入设置 → 切开 → 退出再进 → 应保持开启
3. **服务器验证**：
   ```bash
   ssh root@118.145.240.41 "python3 -c \"import json; print(json.load(open('/root/.openclaw/openclaw.json'))['commands']['native'])\""
   ```
   切换后应为 `True` (boolean true)
4. **daemon 日志**：
   ```bash
   ssh root@118.145.240.41 "tail -20 /root/mypilot-link/nohup.out | grep 'Config set'"
   ```
   应看到 `Config set: commands.native = true`
5. **思考过程**：进入旧会话 → 应**不再显示**胡言乱语 thinking 区
6. **网络访问开关**：切换后持久化（同样依赖 res 帧修复）

## 约束

- 不修改 SOUL.md
- 不修改已部署素材
- 不影响已开发和已测试通过的功能
- 不破坏用户本地持久化数据（仅渲染层过滤）
