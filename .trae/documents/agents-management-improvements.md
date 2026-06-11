# Agent 管理页面修改计划

## 摘要

对 `AgentsManagementView.swift` 做两项修改：
1. 模型选择增加 provider 信息显示
2. Agent 文件编辑从仅 SOUL.md 扩展为全部 7 个 Markdown 文件

## 当前状态分析

### 模型选择问题
- 当前 `availableModels` 只提取 `id` 字段：`ws?.models.compactMap { $0["id"] as? String }`
- 模型 id 格式为 `ark/doubao-seed-2.0-pro`、`tencent-tokenplan/glm-5` 等，`/` 前面就是 provider
- 用户看到 `ark/doubao-seed-2.0-pro` 不知道 ark 是火山引擎
- Gateway 的 `models.list` 返回的每个模型字典可能包含 `provider` 字段，但当前未使用

### Agent 文件编辑问题
- 当前 `AgentDetailView` 只有一个 "SOUL 文件" Section，硬编码加载/保存 `SOUL.md`
- `AgentFileInfo` 已定义 7 种文件：SOUL.md、AGENTS.md、IDENTITY.md、USER.md、TOOLS.md、HEARTBEAT.md、MEMORY.md
- `WebSocketService` 已有 `requestAgentFileContent` 和 `saveAgentFile` 方法，支持任意文件名
- 但 UI 没有暴露这些文件的编辑入口

## 提议变更

### 文件：`Features/Settings/AgentsManagementView.swift`

#### 变更 1：模型选择增加 provider 显示

**AgentDetailView 和 CreateAgentView 的 `availableModels`**：

当前：
```swift
private var availableModels: [String] {
    ws?.models.compactMap { $0["id"] as? String }.sorted() ?? []
}
```

改为按 provider 分组的结构：
```swift
private var groupedModels: [(provider: String, models: [String])] {
    let modelIds = ws?.models.compactMap { $0["id"] as? String } ?? []
    var groups: [String: [String]] = [:]
    for id in modelIds {
        let parts = id.split(separator: "/", maxSplits: 1)
        let provider = parts.count > 1 ? String(parts[0]) : "other"
        groups[provider, default: []].append(id)
    }
    return groups.keys.sorted().map { (provider: $0, models: groups[$0]!.sorted()) }
}
```

**provider 名称映射**（在文件顶部添加）：
```swift
private let providerNames: [String: String] = [
    "ark": "火山引擎",
    "deepseek": "DeepSeek",
    "doubao-seedream5": "火山引擎(图像)",
    "gitee": "Gitee AI",
    "minimax": "MiniMax",
    "tencent-tokenplan": "腾讯云",
    "zhipu": "智谱 AI",
]
```

**Picker 改为按 provider 分组**：

AgentDetailView 和 CreateAgentView 中的 Picker 从：
```swift
Picker("", selection: $selectedModel) {
    Text("未选择").tag("")
    ForEach(availableModels, id: \.self) { m in
        Text(m).tag(m)
    }
}
```

改为：
```swift
Picker("", selection: $selectedModel) {
    Text("未选择").tag("")
    ForEach(groupedModels, id: \.provider) { group in
        Section(header: Text(providerNames[group.provider] ?? group.provider)) {
            ForEach(group.models, id: \.self) { m in
                Text(m).tag(m)
            }
        }
    }
}
```

#### 变更 2：Agent 文件编辑扩展为 7 个文件

**AgentDetailView 重构**：

删除当前硬编码的 "SOUL 文件" Section，替换为动态的文件列表 + 编辑器：

1. 新增状态变量：
```swift
@State private var agentFiles: [AgentFileInfo] = []
@State private var selectedFileName: String?
@State private var fileContents: [String: String] = [:]
@State private var isLoadingFiles = false
@State private var currentEditFile: String = ""
@State private var currentEditContent: String = ""
```

2. 新增 "Agent 文件" Section：
- 列出 7 个预定义文件，每个显示：图标（带颜色）+ displayName + 文件大小/缺失状态
- 点击文件 → 加载内容 → 显示编辑器
- 使用 NavigationLink 进入文件编辑子页面

3. 新增 `AgentFileEditorView` 子视图：
- 接收文件名和初始内容
- TextEditor 编辑
- 保存按钮（调用 `saveAgentFile`）

4. 加载逻辑：
- `onAppear` 时调用 `requestAgentFileList(agentId:)` 获取文件列表
- 点击文件时调用 `requestAgentFileContent(agentId:name:)` 加载内容
- 保存时调用 `saveAgentFile(agentId:name:content:)`

**AgentFileInfo 的颜色映射**：

`AgentFileInfo.iconColor` 返回字符串，需要转为 Color。添加辅助扩展：
```swift
extension AgentFileInfo {
    var color: Color {
        switch iconColor {
        case "orange": return .orange
        case "blue": return .blue
        case "purple": return .purple
        case "teal": return .teal
        case "gray": return .gray
        case "pink": return .pink
        case "indigo": return .indigo
        default: return .gray
        }
    }
}
```

#### 变更 3：CreateAgentView 的 SOUL 模板改为文件模板

CreateAgentView 中保留 SOUL.md 模板选择（创建时只需 SOUL.md），其余 6 个文件在 Agent 创建后通过详情页编辑。

## 假设与决策

| 决策 | 选择 | 理由 |
|------|------|------|
| provider 名称来源 | 从模型 id 的 `/` 前缀提取 + 本地映射 | Gateway 不一定返回 provider 字段，但 id 格式固定 |
| 文件编辑交互 | NavigationLink 进入子页面 | 与现有 Agent 详情页风格一致 |
| 创建 Agent 时是否编辑全部文件 | 否，只编辑 SOUL.md | 创建流程应简洁，其余文件后续编辑 |
| 文件列表数据来源 | `agents.files.list` RPC | 已有现成 API，返回完整文件元信息 |

## 验证步骤

1. 打开 Agent 详情页 → 模型 Picker 应按 provider 分组显示（如"火山引擎"分组下有 ark/xxx 模型）
2. 打开 Agent 详情页 → 应看到 7 个文件行（SOUL/AGENTS/IDENTITY/USER/TOOLS/HEARTBEAT/MEMORY）
3. 点击任一文件 → 进入编辑页 → 显示文件内容
4. 编辑内容 → 点保存 → 提示"已保存"
5. 创建新 Agent → 模型 Picker 同样按 provider 分组
