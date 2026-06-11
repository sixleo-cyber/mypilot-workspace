# Bug 修复计划 v3 — 2026-06-09

## 问题清单

1. **Gateway 报错 `agents.defaults.permissions` 无效** — 权限配置路径错误
2. **思考过程重复/胡言乱语** — daemon 未正确分离 thinking 内容
3. **搜索服务全部显示已配置** — App 端 `isConfigured` 判断逻辑错误
4. **权限切换不持久** — 权限配置路径无效导致写入失败

## 根因分析

### Bug 1 & 4：权限配置路径无效

**根因**：App 使用 `agents.defaults.permissions.allowCommands` 等路径，但 Gateway 的配置 schema 中 `agents.defaults` 下没有 `permissions` 键。Gateway 报错：`Unrecognized key: "permissions"`。

**Gateway 实际配置结构**（从服务器 openclaw.json 确认）：
- `agents.defaults.model` — 模型配置 ✅
- `agents.defaults.models` — 模型列表 ✅
- `agents.defaults.workspace` — 工作目录 ✅
- `agents.defaults.permissions` — ❌ 不存在
- `tools.profile` — 工具权限模式（"full"/"custom"）✅
- `tools.alsoAllow` — 额外允许的工具 ✅
- `tools.web.search.enabled` — 网页搜索开关 ✅
- `commands.native` — 命令执行权限（"auto"/"allow"/"deny"）✅

**正确路径**：
- 命令执行权限 → `commands.native`（值："auto"/"allow"/"deny"）
- 文件系统权限 → `tools.profile`（值："full" 表示全部允许，"custom" 表示自定义）
- 网络权限 → `tools.web.fetch.enabled`（布尔值）

**修复方案**：将 App 中的权限配置改为使用 Gateway 实际支持的路径，并在 daemon 端做路径映射。

### Bug 2：思考过程重复

**根因**：daemon 的 `extractContentParts` 函数只处理 `part.type === "text"` 的内容部分。如果 Gateway 通过 `part.type === "thinking"` 发送思考内容，这些内容会被完全忽略。当前依赖 `<think>` 标签的正则提取方式只在思考内容嵌入文本时有效，但 Gateway 很可能使用独立的内容部分发送思考内容。

**修复方案**：修改 `extractContentParts` 函数，同时处理 `type: "thinking"` 内容部分，将其与 `type: "text"` 分离返回。delta 处理中不再需要 `<think>` 标签正则。

### Bug 3：搜索服务全部显示已配置

**根因**：`NetworkSettingsView.loadSearchSettings()` 中的逻辑错误：

```swift
let configuredIds = Set(rawProviders.compactMap { $0["id"] as? String })
```

这行代码提取了所有 provider 的 id（包括 `isConfigured: false` 的），然后用 `configuredIds.contains(p.id)` 来判断是否已配置，导致所有服务都被标记为已配置。

**修复方案**：只提取 `isConfigured: true` 的 provider id。

## 修复方案

### 修复 1：daemon.js — extractContentParts 支持 thinking 类型

**文件**：`mypilot-link/src/daemon.js`

修改 `extractContentParts` 函数，增加对 `type: "thinking"` 内容部分的处理：

```js
function extractContentParts(content) {
  let text = "";
  let thinking = "";
  const attachments = [];
  if (Array.isArray(content)) {
    for (const part of content) {
      if (part.type === "text" && part.text) {
        text += part.text;
      } else if (part.type === "thinking" && part.text) {
        thinking += part.text;
      } else if (part.type === "image" && part.image) {
        // ... 保持不变
      } else if (part.type === "file" && part.url) {
        // ... 保持不变
      }
    }
  } else if (typeof content === "string") {
    text = content;
  }
  // ... workspace file pattern matching 保持不变
  return { text, thinking, attachments };
}
```

修改 delta 处理逻辑，使用 `extractContentParts` 返回的 `thinking` 字段：

```js
if (state === "delta" && message?.role === "assistant") {
  const { text, thinking } = extractContentParts(message.content);
  // 优先使用 content parts 中的 thinking，回退到 <think> 标签
  const thinkingText = thinking || extractThinking(text);
  const visibleText = thinking ? text : stripThinkingTags(text);
  // ... 增量计算逻辑保持不变
}
```

修改 final 处理逻辑同理。

### 修复 2：NetworkSettingsView.swift — 修复 isConfigured 判断

**文件**：`MyPilotApp/MyPilot/MyPilot/Features/Settings/NetworkSettingsView.swift`

修改 `loadSearchSettings()` 中的 `configuredIds` 提取逻辑：

```swift
// 修改前：提取所有 id
let configuredIds = Set(rawProviders.compactMap { $0["id"] as? String })

// 修改后：只提取 isConfigured 为 true 的 id
let configuredIds = Set(rawProviders.compactMap { provider -> String? in
    guard (provider["isConfigured"] as? Bool ?? false) else { return nil }
    return provider["id"] as? String
})
```

### 修复 3：权限配置路径修正

**文件**：`MyPilotApp/MyPilot/MyPilot/Features/Settings/NetworkSettingsView.swift`

将权限配置改为使用 Gateway 实际支持的路径：

- `allowCommands` → 改用 `commands.native`，值映射：true → "allow"，false → "auto"
- `allowFilesystem` → 改用 `tools.profile`，值映射：true → "full"，false → "custom"
- `allowNetwork` → 改用 `tools.web.fetch.enabled`（布尔值，直接映射）

修改 `permissionRow` 的 `onChange` 回调，使用新的配置路径和值映射。

修改 `loadPermissions()` 使用新的路径读取配置。

**文件**：`mypilot-link/src/daemon.js`

在 `handleConfigSetByKey` 中添加路径验证，对无效路径提前返回错误而不是透传给 Gateway。

### 修复 4：上传 daemon.js 到服务器并重启

修改完成后，将 daemon.js 上传到服务器 `/root/mypilot-link/src/daemon.js`，重启 daemon。

## 文件变更清单

| 文件 | 变更内容 |
|------|----------|
| `mypilot-link/src/daemon.js` | 1. `extractContentParts` 增加 thinking 类型处理<br>2. delta/final 处理使用分离的 thinking<br>3. 添加配置路径验证 |
| `MyPilotApp/MyPilot/MyPilot/Features/Settings/NetworkSettingsView.swift` | 1. 修复 `configuredIds` 提取逻辑<br>2. 权限配置路径改为 Gateway 支持的路径<br>3. `loadPermissions` 使用新路径 |

## 验证步骤

1. 重新编译 App，确认无编译错误
2. 上传 daemon.js 到服务器，重启 daemon
3. 测试思考过程：发送消息，观察思考内容是否不再重复
4. 测试搜索服务：进入设置页面，确认只有 tavily 显示为已配置
5. 测试权限持久化：切换命令执行权限，退出后重新进入，确认状态保持
6. 测试 Gateway 无报错：检查 daemon 日志，确认无 `agents.defaults.permissions` 错误

## 约束

- 不修改 SOUL.md
- 不修改已部署素材
- 不影响已开发和已测试通过的功能
- 优先改代码协议层
