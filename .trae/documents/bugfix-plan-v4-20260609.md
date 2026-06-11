# Bug 修复计划 v4 — 2026-06-09（迭代2）

## 用户报告的问题（v3 修复后剩余问题）

1. **mypilot-link 是否会自动同步 openclaw 配置**（确认问题，不是 bug）
2. **思考过程仍然胡言乱语**：「举个举个举个举个举个...实例给你...看看看看看看」
3. **命令执行权限切换仍不持久化**：切开 → 退出 → 再进入显示关闭

## Phase 1 探索发现（关键事实）

### 事实 A：Gateway 不发独立 thinking 内容部分
抓取服务器 `nohup.out` 中真实的 chat event，确认 Gateway 发送的 `message.content` **只有** `[{type: "text", text: "..."}]`，**从不包含** `type: "thinking"` 的内容部分。所以 daemon 中 `extractContentParts` 的 thinking 分支永远拿不到内容；用户看到的"思考过程"内容**只可能**来自历史持久化的旧消息（v3 修复前的 bug 数据）。

### 事实 B：Gateway 拒绝 `commands.native = "allow"`
服务器日志明确报错：
```
"invalid config: commands.native: Invalid input (allowed: true, false, \"auto\")"
```
即 `commands.native` 字段**只接受** `true | false | "auto"` 三种值。v3 我用了 `"allow"` / `"auto"`，写入被 Gateway 拒绝 → 配置未变更 → 下次读回仍是默认 `"auto"` → UI 显示关闭。

### 事实 C：openclaw.json 中 `tools` 当前只有 `web` 子树
```json
"tools": { "web": { "search": { "enabled": true }, "fetch": { "enabled": true } } }
```
**没有** `tools.profile`、`tools.alsoAllow`。但用户没切换"文件系统访问"开关，未触发该路径校验，是否合法未知。**保守策略**：不冒险用未在当前 schema 中出现的字段。

### 事实 D：mypilot-link 单向同步 openclaw（init 时一次性）
[`search-providers.js#L91-152`](file:///Users/liaoxing/Downloads/未命名文件夹/mypilot-link/src/search-providers.js#L91-L152) 中 `initSearchProviders` 在 daemon 启动时调用 `config.get` 读 Gateway 配置，把 `skills.entries` 中有 apiKey 的条目**单向同步**到本地 `search-providers.json`：
- 内置服务（brave/tavily/...）：apiKey 解密后写入，`isConfigured = true`
- 非内置服务（如 byted-web-search）：新增条目，`isConfigured = true`
- **不反向**覆盖（不会因 mypilot-link 状态影响 openclaw.json）

**含义**：用户在 OpenClaw 端新增/删除 skill apiKey 后，需要**重启 daemon** 才能反映到 App。不会出现"所有服务都已配置"（除非 openclaw.json 里真有所有 skill）。本次的"全部已配置" bug 在 v3 已修（App 端 `configuredIds` 提取逻辑）。

## Bug 修复方案

### 修复 1：命令执行权限值映射改正（Bug 3）

**文件**：[`NetworkSettingsView.swift`](file:///Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Settings/NetworkSettingsView.swift)

**核心改动**：把 v3 中的 `"allow"` / `"auto"` 字符串映射改为 Gateway 实际接受的 **boolean**：

`permissionsSection` 中：
- 命令执行：`valueOn: "true"` → 改为发送 `true` (boolean)，`valueOff` → 发送 `false` (boolean)
- 由于 `permissionRow` 当前只支持 String 类型的 valueOn/valueOff，需要扩展支持任意 `Any?` 类型，或为命令执行单独写专门的 Toggle

**实现选择（最小改动）**：
1. 将 `permissionRow` 的 `valueOn` / `valueOff` 参数类型从 `String?` 改为 `Any?`
2. `commands.native`: `valueOn: true`, `valueOff: false` （boolean）
3. `tools.web.fetch.enabled`: `valueOn: nil, valueOff: nil` → 沿用 boolean 直接映射
4. **`tools.profile` 路径暂不动**（不在当前 schema 中，高风险）。"文件系统访问"开关保留为本地状态（不写 Gateway），加 UI 标注"将在后续版本启用"，或直接**隐藏该开关**避免误导用户

**loadPermissions 改动**：
- `commands.native` 读回值是 boolean 或 "auto"；映射规则：`true` → 开；`false` 或 `"auto"` → 关
- `tools.web.fetch.enabled` 读 boolean
- 不再读 `tools.profile`

### 修复 2：思考过程残留历史显示（Bug 2）

**根因**：v3 daemon 修复后新会话已不会产生重复 thinking 内容；用户看到的"举个举个..."来自旧消息持久化数据（保存在 App 本地 conversations.json）。

**修复策略**（2 选 1）：

**方案 A（推荐，最低破坏）**：daemon 端额外保险——`finalThinking` 计算时增加去重逻辑，且当 finalThinking 与 finalVisible 高度相似（例如 finalThinking 是 finalVisible 的子串/包含/前缀）时，**不发送 thinking**。这样彻底杜绝 thinking 复读正文。

```js
// daemon.js extractContentParts 之后
let finalThinking = contentThinking || extractThinking(finalText);
const finalVisible = contentThinking ? finalText : stripThinkingTags(finalText);
// 防御：thinking 不应等于/包含/被包含于 visible
if (finalThinking && finalVisible && (
  finalThinking === finalVisible ||
  finalVisible.includes(finalThinking.substring(0, 50)) ||
  finalThinking.includes(finalVisible.substring(0, 50))
)) {
  finalThinking = "";
}
```

**方案 B（清理历史）**：App 启动时扫描已持久化的 messages，把明显是字符级重复的 thinkingContent 清空。

**选择方案 A**（daemon 侧防御 + 不清历史，让用户自行用"清空当前对话"按钮处理旧消息）。

### 修复 3：搜索服务同步说明（用户问题 1）

**不是 bug**，但加日志提示用户："Gateway 搜索服务配置已在 daemon 启动时同步到 App。若 OpenClaw 端新增了 skill apiKey，需重启 daemon 后才能在 App 看到。"

**可选优化**：在 App 设置页"联网搜索"区域底部添加一行说明文案：
> 💡 搜索服务配置从 OpenClaw 同步而来。若在 OpenClaw 端新增/修改了密钥，请重启 mypilot-link 服务。

**实现位置**：[`NetworkSettingsView.swift`](file:///Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Settings/NetworkSettingsView.swift) 的 `searchSection` 末尾添加一个 footer Text。

## 文件变更清单

| 文件 | 变更 |
|------|------|
| `MyPilotApp/.../Settings/NetworkSettingsView.swift` | 1. `permissionRow` 的 `valueOn/valueOff` 改为 `Any?` 类型<br>2. 命令执行权限映射改为 boolean (true/false)<br>3. 文件系统权限：**隐藏开关**（避免误导）<br>4. `loadPermissions` 读 commands.native 兼容 boolean + "auto"<br>5. 搜索区底部加同步说明文案 |
| `mypilot-link/src/daemon.js` | final 处理增加 thinking ≈ visible 的去重防御 |

## 假设与决策

- **假设**：用户当前模型不是 reasoning 模型，Gateway 不会发独立 thinking 部分。已通过抓取真实 chat event 确认。
- **决策**：保守对待 `tools.profile` —— 不在当前 openclaw.json schema 中，暂不暴露文件系统开关，避免再次出现"配置写入失败"。
- **决策**：思考过程历史残留**不主动清理本地存储**，因为用户规则禁止破坏已部署/已存数据；新会话不会再出现该问题。
- **决策**：mypilot-link 自动同步是单向、init 一次性。本次不改同步策略，仅加 UI 提示。

## 验证步骤

1. **命令执行权限持久化**：进入网络设置 → 切开"命令执行" → 退出再进 → 应保持开启
2. **文件系统开关**：应被隐藏（暂时不可见）
3. **网络访问开关**：切换后再进入应保持
4. **思考过程**：**新发起**一次对话，AI 回复区下方应**不再出现**"思考过程"折叠区（除非用户开了 reasoning 模式且模型真返回 thinking 内容）
5. **服务器配置**：SSH 上去检查 `commands.native` 值确实被更新为 `true`
6. **daemon 日志**：不再出现 `Config set failed for commands.native: Invalid input` 错误

## 约束

- 不修改 SOUL.md
- 不修改已部署素材
- 不影响已开发和已测试通过的功能
- 不破坏用户本地持久化数据
