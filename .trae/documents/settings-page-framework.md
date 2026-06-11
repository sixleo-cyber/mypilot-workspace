# 设置页面框架开发计划（含 Agent 文件编辑）

## Summary

为 MyPilot App 搭建完整的设置页面框架，包含侧边栏入口、主设置页面、6 个子页面入口，以及 4 个实际可用的子页面（Agent 文件编辑、定时任务、用量统计、记忆读取）。其余子页面先创建占位页面。

## Current State Analysis

### Agent 文件相关现状
- **读取**：`WebSocketService.requestAgentFile(agentId:name:)` 通过 `agents.files.get` RPC 读取，但只请求了 SOUL.md，且所有文件内容都写入同一个 `systemPrompt` 属性
- **列表**：daemon 端已支持 `agents.files.list` RPC，但 App 端未实现对应方法
- **写入**：Gateway 支持 `agents.files.set` RPC（已验证可用），但 daemon 和 App 端均未实现
- **7 个文件**：AGENTS.md、SOUL.md、TOOLS.md、IDENTITY.md、USER.md、HEARTBEAT.md、MEMORY.md（BOOTSTRAP.md 不在列表中）

### 设置相关现状
- 侧边栏无设置入口
- 无任何设置页面
- 后端 CronRepository、StatsRepository、MemoryRepository 已就绪

## Proposed Changes

### 1. 侧边栏添加设置入口

**文件**: `MyPilot/MyPilot/Views/SidebarView.swift`

底部 overlay 改为 HStack：
- 左侧："添加实例"按钮（主按钮，保持不变）
- 右侧：齿轮图标按钮，点击 `showSettings = true`
- 添加 `.sheet(isPresented: $showSettings)` 弹出 SettingsView

### 2. WebSocketService 扩展 Agent 文件方法

**文件**: `MyPilot/MyPilot/Services/WebSocketService.swift`

新增方法：

```swift
func requestAgentFileList(agentId: String) {
    _sendGatewayRpc(method: "agents.files.list", params: ["agentId": agentId]) { response in
        // 解析 files 数组，存入 self.agentFiles
    }
}

func requestAgentFileContent(agentId: String, name: String, callback: @escaping (String?) -> Void) {
    _sendGatewayRpc(method: "agents.files.get", params: ["agentId": agentId, "name": name]) { response in
        // 解析 file.content，通过 callback 返回
    }
}

func saveAgentFile(agentId: String, name: String, content: String, callback: @escaping (Bool) -> Void) {
    _sendGatewayRpc(method: "agents.files.set", params: ["agentId": agentId, "name": name, "content": content]) { response in
        callback(response["ok"] as? Bool == true)
    }
}
```

新增属性：
```swift
@Published var agentFiles: [AgentFileInfo] = []
```

### 3. 新增 AgentFileInfo 模型

**文件**: `MyPilot/MyPilot/Models/AgentFileInfo.swift`

```swift
struct AgentFileInfo: Codable, Identifiable {
    var name: String { id }
    let id: String
    let path: String
    let missing: Bool
    let size: Int
    let updatedAtMs: Int64
}
```

### 4. Daemon 端添加 agents.files.set 支持

**文件**: `mypilot-link/src/daemon.js`

在 `handleAppFrame` 中添加：

```javascript
} else if (frame.type === "agents.files.set") {
    sendGatewayRpc(ws, deviceIdParam, "agents.files.set", {
        agentId: frame.agentId || "main",
        name: frame.params?.name || frame.name || "",
        content: frame.params?.content || frame.content || ""
    }, frame.id);
}
```

### 5. 创建设置主页面

**新文件**: `MyPilot/MyPilot/Features/Settings/SettingsView.swift`

```
SettingsView（NavigationStack + List）
├── 用户状态区（实例名 + 连接状态指示灯）
├── Agent 文件 → AgentFilesView（实际 UI）
├── 网络设置 → NetworkSettingsView（占位）
├── 高级设置 → AdvancedSettingsView（含定时任务/用量统计/记忆读取入口）
├── 文件浏览器 → FileBrowserSettingsView（占位）
├── Agents 管理 → AgentsManagementView（占位）
└── 订阅管理 → SubscriptionView（占位）
```

### 6. 创建 Agent 文件编辑页面（核心功能）

**新文件**: `MyPilot/MyPilot/Features/Settings/AgentFilesView.swift`

这是本次最重要的新功能页面，对标 ClawPilot 的 Agent 文件 Tab：

```
AgentFilesView
├── 文件列表（左侧/顶部）
│   ├── AGENTS.md — 定义 Agent 协作关系
│   ├── SOUL.md — 定义 Agent 人格和行为模式
│   ├── TOOLS.md — 定义可用工具
│   ├── IDENTITY.md — 定义 Agent 身份信息
│   ├── USER.md — 定义用户偏好
│   ├── HEARTBEAT.md — 定义心跳检查逻辑
│   └── MEMORY.md — 存储 Agent 记忆
│
└── 文件编辑器（右侧/主区域）
    ├── 文件名标题 + 最后修改时间
    ├── Markdown 文本编辑器（TextEditor）
    ├── 底部工具栏：保存按钮 + 重置按钮
    └── 保存确认 Toast
```

交互流程：
1. 页面加载 → 调用 `requestAgentFileList` 获取文件列表
2. 点击文件名 → 调用 `requestAgentFileContent` 获取内容
3. 编辑内容 → TextEditor 实时编辑
4. 点击保存 → 调用 `saveAgentFile` 写入
5. 保存成功 → 显示 Toast 提示 + 刷新文件列表

UI 设计：
- macOS: 左右分栏（文件列表 | 编辑器），使用 `NavigationSplitView`
- iPad: 上下布局或全屏编辑器 + 返回按钮
- 文件列表项：文件图标 + 文件名 + 文件大小 + 修改时间
- 编辑器：使用 `TextEditor`，支持等宽字体显示 Markdown
- 保存按钮：右上角，有未保存变更时高亮显示

### 7. 创建高级设置页面

**新文件**: `MyPilot/MyPilot/Features/Settings/AdvancedSettingsView.swift`

```
AdvancedSettingsView
├── 搜索引擎与服务（占位）
├── 通话设置（占位）
├── 运行统计 → UsageStatsView（实际 UI）
└── 定时任务 → ScheduledTasksView（实际 UI）
```

### 8. 创建定时任务页面（实际 UI）

**新文件**: `MyPilot/MyPilot/Features/Settings/ScheduledTasksView.swift`

使用 `CronRepository.listJobs()`：
- 任务列表（CardContainer 卡片）
- 每个卡片：任务名、Agent、周期、启用状态、上次执行
- 新建任务 Sheet

### 9. 创建用量统计页面（实际 UI）

**新文件**: `MyPilot/MyPilot/Features/Settings/UsageStatsView.swift`

使用 `StatsRepository.systemHealth()` + `tokenUsage()`：
- 系统健康卡片（CPU/RAM/Disk 仪表盘）
- Token 使用量卡片

### 10. 创建记忆读取页面（实际 UI）

**新文件**: `MyPilot/MyPilot/Features/Settings/MemoryReadingView.swift`

使用 `MemoryRepository`：
- 记忆文件列表
- 技能列表（可展开查看内容）

### 11. 创建占位页面

**新文件**: `MyPilot/MyPilot/Features/Settings/NetworkSettingsView.swift` — "即将推出"
**新文件**: `MyPilot/MyPilot/Features/Settings/FileBrowserSettingsView.swift` — "需要安装 node-bridge 插件"
**新文件**: `MyPilot/MyPilot/Features/Settings/AgentsManagementView.swift` — "即将推出"
**新文件**: `MyPilot/MyPilot/Features/Settings/SubscriptionView.swift` — "即将推出"

## 文件清单

| 操作 | 文件路径 |
|------|---------|
| 修改 | `Views/SidebarView.swift` — 添加设置按钮 |
| 修改 | `Services/WebSocketService.swift` — 添加文件列表/读取/保存方法 |
| 修改 | `mypilot-link/src/daemon.js` — 添加 agents.files.set 转发 |
| 新建 | `Models/AgentFileInfo.swift` — 文件信息模型 |
| 新建 | `Features/Settings/SettingsView.swift` — 设置主页面 |
| 新建 | `Features/Settings/AgentFilesView.swift` — Agent 文件编辑（核心） |
| 新建 | `Features/Settings/AdvancedSettingsView.swift` — 高级设置 |
| 新建 | `Features/Settings/ScheduledTasksView.swift` — 定时任务 |
| 新建 | `Features/Settings/UsageStatsView.swift` — 用量统计 |
| 新建 | `Features/Settings/MemoryReadingView.swift` — 记忆读取 |
| 新建 | `Features/Settings/NetworkSettingsView.swift` — 网络设置（占位） |
| 新建 | `Features/Settings/FileBrowserSettingsView.swift` — 文件浏览器（占位） |
| 新建 | `Features/Settings/AgentsManagementView.swift` — Agents 管理（占位） |
| 新建 | `Features/Settings/SubscriptionView.swift` — 订阅管理（占位） |

## Assumptions & Decisions

1. **Agent 文件编辑器使用 TextEditor** — SwiftUI 原生组件，支持纯文本编辑。后续可升级为带语法高亮的 Markdown 编辑器。
2. **设置页面以 Sheet 弹出** — 不影响当前聊天上下文，对标 ClawPilot 的设置入口方式。
3. **Agent 文件编辑是核心功能** — 这是用户最需要的配置能力，优先实现完整功能。
4. **网络设置/执行权限等先占位** — 这些配置项需要对接 Gateway config API，复杂度高，先创建入口页面。
5. **文件保存通过 Gateway RPC** — `agents.files.set` 已验证可用，直接写入 workspace 目录，无需额外文件服务。
6. **BOOTSTRAP.md 不在列表中** — Gateway `agents.files.list` 返回的 7 个文件不包含 BOOTSTRAP.md，只编辑实际存在的文件。

## Verification Steps

1. 侧边栏底部出现齿轮图标，点击弹出设置页面
2. 设置主页面显示 6 个导航入口
3. Agent 文件页面能加载并显示 7 个文件列表
4. 点击文件名能加载并显示文件内容
5. 编辑文件内容后点击保存，文件成功更新
6. 定时任务页面能加载并显示任务列表
7. 用量统计页面能显示 CPU/RAM/Disk 和 Token 数据
8. 记忆读取页面能显示记忆文件和技能列表
9. 占位页面显示"即将推出"提示
10. 构建无错误
