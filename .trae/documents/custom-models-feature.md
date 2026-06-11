# P6-4: 自定义模型添加功能

## Summary

允许用户在 App 中添加自定义云端模型，包括：
1. 现有提供商（火山方舟/腾讯云/百炼/智谱）未在 models.list 中列出的新模型 ID
2. 其他云端提供商（硅基流动、零一万物等）的模型

## Current State Analysis

### 现有模型架构

```
Gateway openclaw.json → config.get/set → models.list (只读)
                                         ↓
                              mypilot-link daemon (纯代理)
                                         ↓
                                    MyPilot App
                              ModelPickerView (展示 models.list)
                              AgentDetailView (模型选择)
```

**关键限制**：
- `models.list` 是 Gateway 只读 API，只返回 Gateway 配置中已注册的模型
- 没有模型 CRUD API（无 `models.create`/`models.update`）
- `setAgentModel` 通过 `config.set` 修改全局 `agents.defaults.model.primary`，但只能设置 models.list 中已有的模型 ID
- `models` 在 App 中是 `[[String: Any]]` 无类型数组

### Gateway config 中模型配置的位置

```json
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "ark/doubao-1.5-pro-32k",
        "fallbacks": []
      }
    }
  }
}
```

### Gateway models.list 返回格式

```json
{
  "models": [
    { "id": "doubao-1.5-pro-32k", "provider": "ark", "name": "Doubao 1.5 Pro 32K", "contextWindow": 32000 },
    { "id": "qwen-max", "provider": "qwencloud-token-plan", "name": "Qwen Max", "contextWindow": 32000 }
  ]
}
```

## Proposed Changes

### 核心思路

**在 daemon 端维护一个 `custom-models.json` 文件**，与 Gateway 的 `models.list` 合并后返回给 App。切换自定义模型时，通过 `config.set` 将模型 ID 写入 Gateway 配置。

### 数据流

```
1. App 请求 models.list
2. Daemon 从 Gateway 获取 models.list
3. Daemon 合并本地 custom-models.json
4. 返回合并后的模型列表给 App

5. 用户选择自定义模型
6. App 发送 agent.model.set (modelId = "siliconflow/deepseek-v3")
7. Daemon 通过 config.set 写入 Gateway
8. Gateway 使用配置的模型提供商路由请求
```

### 关键前提

自定义模型能在 Gateway 中工作，前提是 Gateway 的 `openclaw.json` 配置了对应提供商的 API key 和 endpoint。用户需要先在服务器上配置提供商，然后才能在 App 中使用。

### 文件修改

#### 1. `mypilot-link/src/daemon.js` — 自定义模型管理

**新增函数**：

- `loadCustomModels()` — 从 `~/.openclaw/plugins/mypilot-link/custom-models.json` 加载自定义模型列表
- `saveCustomModels(models)` — 保存自定义模型列表
- `mergeModelLists(gatewayModels, customModels)` — 合并 Gateway 模型列表和自定义模型列表（去重）

**修改 models.list 处理**：

当前 `models.list` 是纯代理到 Gateway。改为：
1. 先向 Gateway 请求 `models.list`
2. 再从本地加载 `custom-models.json`
3. 合并两个列表，去重（按 `provider/id` 去重，自定义模型优先）
4. 返回合并后的列表

**新增 custom-models RPC**：

- `custom-models.list` — 返回自定义模型列表
- `custom-models.add` — 添加自定义模型（参数：id, provider, name, contextWindow, apiKeyHint）
- `custom-models.remove` — 删除自定义模型

**修改 setAgentModel**：

当前 `setAgentModel` 只能设置 Gateway 已有的模型。当用户选择自定义模型时，需要：
1. 检查模型是否在 Gateway models.list 中
2. 如果不在，检查是否在 custom-models.json 中
3. 如果是自定义模型，通过 config.set 写入模型配置（包括 provider 路由信息）
4. 返回成功/失败

#### 2. `MyPilotApp/MyPilot/MyPilot/Features/Settings/` — 自定义模型 UI

**新增文件**：`CustomModelsView.swift`

功能：
- 显示当前自定义模型列表
- 添加自定义模型表单：
  - 提供商选择（预置：硅基流动/零一万物/DeepSeek/月之暗面/自定义）
  - 模型 ID 输入（如 `deepseek-v3`）
  - 显示名称（如 `DeepSeek V3`）
  - Context Window 大小（可选，默认 32K）
- 删除自定义模型（滑动删除）
- 从自定义模型列表切换到对话

**修改文件**：`NetworkSettingsView.swift`

- 在设置页面添加"自定义模型"入口

**修改文件**：`ModelPickerView.swift`

- 合并自定义模型到模型选择列表
- 自定义模型显示不同样式（如标注"自定义"标签）

#### 3. `mypilot-link/src/daemon.js` — custom-models.json 格式

```json
{
  "models": [
    {
      "id": "deepseek-v3",
      "provider": "siliconflow",
      "name": "DeepSeek V3 (硅基流动)",
      "contextWindow": 64000,
      "addedAt": 1781193600000
    },
    {
      "id": "yi-large",
      "provider": "lingyiwanyi",
      "name": "Yi Large (零一万物)",
      "contextWindow": 32000,
      "addedAt": 1781193600000
    }
  ]
}
```

#### 4. `MyPilotApp/MyPilot/MyPilot/Services/WebSocketRpcMethods.swift`

新增 RPC 方法：
- `requestCustomModelsList()` — 获取自定义模型列表
- `addCustomModel(params:)` — 添加自定义模型
- `removeCustomModel(id:)` — 删除自定义模型

#### 5. `MyPilotApp/MyPilot/MyPilot/Services/AgentRpcClient.swift`

新增 RPC 方法：
- `customModelsList(onResult:)`
- `addCustomModel(params:onResult:)`
- `removeCustomModel(id:onResult:)`

## 修改文件清单

| 文件 | 改动 |
|------|------|
| `mypilot-link/src/daemon.js` | models.list 合并 + custom-models RPC + setAgentModel 扩展 |
| `MyPilotApp/.../CustomModelsView.swift` | 新增：自定义模型管理 UI |
| `MyPilotApp/.../NetworkSettingsView.swift` | 添加自定义模型入口 |
| `MyPilotApp/.../ModelPickerView.swift` | 合并自定义模型到选择器 |
| `MyPilotApp/.../WebSocketRpcMethods.swift` | 新增自定义模型 RPC |
| `MyPilotApp/.../AgentRpcClient.swift` | 新增自定义模型 RPC |

## Assumptions & Decisions

1. **自定义模型的 provider 路由由 Gateway 配置决定** — 用户需要在服务器 `openclaw.json` 中配置对应提供商的 API key。App 端只是告诉 Gateway 用哪个模型 ID，不负责 API key 管理。
2. **custom-models.json 存储在 daemon 本地** — 不写入 Gateway 配置，避免与 Gateway 冲突。
3. **模型 ID 格式为 `provider/model-id`** — 与 Gateway 现有格式一致，如 `siliconflow/deepseek-v3`。
4. **预置提供商列表**：硅基流动、零一万物、DeepSeek、月之暗面、Minimax、自定义
5. **不实现 API key 管理** — API key 仍在服务器 `openclaw.json` 中配置，App 端只管理模型列表

## Verification Steps

1. daemon 测试：`npm run verify` 通过
2. 在 App 设置中添加自定义模型 → 保存成功
3. 在聊天模型选择器中看到自定义模型 → 带有"自定义"标签
4. 切换到自定义模型 → 模型切换成功
5. 删除自定义模型 → 从列表中移除
6. 重启 daemon → 自定义模型列表持久化
