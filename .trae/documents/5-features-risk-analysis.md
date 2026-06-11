# 五个功能一次性开发的可行性分析

## 分析结论：不建议一次性开发全部 5 个

三个维度的问题：daemon 端缺失、Gateway 协议未知、以及多功能并行测试困难。

---

## 逐功能分析

### 1. Token 进度条
- **依赖**：需要获取当前对话的 token 用量（已用/上限）
- **daemon 现状**：不支持。当前 stream/done 事件不包含 token 信息
- **Gateway 现状**：未知。**需要先验证** Gateway 是否在 stream/chat 事件中附带 token 数据
- **复杂度**：如果 Gateway 有数据 → 纯客户端（简单）。如果 Gateway 无数据 → 需要 daemon 端添加计数逻辑（复杂）

### 2. 历史会话搜索 🔵 最可行
- **依赖**：本地存储的聊天记录
- **现状**：`AppState` 已有 `loadMessagesForConversation()` 从本地 JSON 文件读取消息，完全在客户端
- **复杂度**：**纯客户端功能**，不依赖 daemon 或 Gateway

### 3. Agent 管理（创建/编辑/删除）
- **依赖**：Gateway 的 Agent CRUD RPC
- **daemon 现状**：不支持。只支持 `agents.list` 和 `agent.model.set`
- **Gateway 现状**：需要验证 Gateway 是否暴露创建/编辑/删除 Agent 的 RPC 方法
- **复杂度**：需要 daemon 端新增代理方法（如 `agents.create`、`agents.update`、`agents.delete`），前置条件多

### 4. SOUL 设置
- **依赖**：读取 + 写入 SOUL.md 文件
- **daemon 现状**：已支持 `agents.files.get`（读取），但**不支持写入**（无 `agents.files.set`）
- **复杂度**：需要 daemon 端新增文件写入 RPC 代理

### 5. 能力插件开关
- **依赖**：Gateway 的 plugins RPC
- **daemon 现状**：不支持。没有 `plugins.list` 或 `plugins.toggle`
- **Gateway 现状**：OpenClaw Gateway 内部一定支持插件管理，但需要验证其 RPC 接口
- **复杂度**：需要 daemon 端新增 2 个代理方法

---

## 风险总结

### 🔴 严重依赖 daemon 端修改

5 个功能中，**4 个需要修改 daemon.js**，只有「历史会话搜索」是纯客户端的。

一次性开发意味着：
1. App 端写完无法测试——因为 daemon 还没实现对应的 RPC
2. 需要同步调试两端的代码，问题定位困难
3. daemon 新增代码可能影响现有聊天功能（单点故障）

### 🟡 Gateway 协议不确定

Token 数据、Agent CRUD、插件管理——这些 Gateway RPC 方法的具体参数和返回值我们并不确定。需要：
1. 先用 daemon 的 `gatewayRpc()` 试验调用
2. 确认返回格式后才能在 App 端实现对应 UI

### 🟢 唯一风险可控的功能

**历史会话搜索**：纯客户端功能，零依赖，风险最低。

---

## 建议方案：分两个步骤

### 步骤 1：先做纯客户端功能（无风险）

**历史会话搜索** — 在侧边栏添加搜索框，基于本地 JSON 文件搜索历史消息

### 步骤 2：逐个做需要 daemon 的功能

| 顺序 | 功能 | 前置动作 |
|------|------|---------|
| 1 | Token 进度条 | 先写 daemon 的 RPC 代理 → 验证 Gateway 返回格式 → 再写 App UI |
| 2 | 插件开关 | 先写 daemon 的 plugins.list/toggle → 再写 App UI |
| 3 | SOUL 设置 | 先写 daemon 的 agents.files.set → 再写 App UI |
| 4 | Agent 管理 | 先写 daemon 的 agents CRUD → 再写 App UI |

**每一步都需要**：daemon 修改 → 重启 daemon → 编译 App → 端到端测试。不能跳过 daemon 步骤直接写 App UI。

---

## 推荐：今天先做历史会话搜索

理由：
- 零依赖，不需要修改 daemon
- 可以先完成并测试
- 之后再做其他需要 daemon 的功能时，有稳定的代码基础
