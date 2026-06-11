# Agent 管理页面修正计划

## 摘要

修正 4 个问题：
1. 模型选择 popover 不能滚动
2. 模型选择中每个模型未显示 provider 名称
3. 创建新 Agent 时模型选择也未显示 provider
4. 创建新 Agent 时只有 SOUL 模板，没有 7 个文件编辑

额外需求：删除创建新 Agent 中的模板选择功能，改为让用户完全自定义 7 个文件内容。

## 当前状态分析

### 问题 1：Popover 不能滚动
当前 `modelPopover` 使用 `VStack` + `ForEach`，内容超出 `maxHeight: 400` 时无法滚动。macOS SwiftUI 的 `VStack` 不会自动滚动，需要包裹 `ScrollView`。

### 问题 2：模型未显示 provider
当前每个模型行只显示完整 id（如 `ark/doubao-seed-2.0-pro`），没有额外显示 provider 中文名。用户看到 `ark/xxx` 不知道 ark 是火山引擎。

**方案**：在每个模型行中，将 provider 部分替换为中文名显示。格式：`火山引擎 / doubao-seed-2.0-pro`，而不是原始的 `ark/doubao-seed-2.0-pro`。

### 问题 3：创建 Agent 模型选择同样的问题
`CreateAgentView` 的 `modelPopover` 与 `AgentDetailView` 结构相同，同样的问题。

### 问题 4：创建 Agent 只有 SOUL 模板
当前 `CreateAgentView` 只有 `Section("SOUL 模板")`，包含模板选择 Menu 和一个 TextEditor。用户要求删除模板功能，改为展示 7 个文件编辑器。

**方案**：将 SOUL 模板 Section 替换为 7 个文件的编辑区域。每个文件一个 TextEditor，用户可以自由填写任意文件内容。创建时，非空文件通过 `saveAgentFile` 保存。

## 提议变更

### 文件：`Features/Settings/AgentsManagementView.swift`

#### 变更 1：模型 Popover 添加 ScrollView + 显示 provider 中文名

**AgentDetailView.modelPopover**（第 258-308 行）：

改为：
```swift
@ViewBuilder
private var modelPopover: some View {
    ScrollView {
        VStack(alignment: .leading, spacing: 0) {
            // "未选择" 按钮
            Button { ... } label: { ... }
            Divider()
            
            ForEach(groupedModels, id: \.provider) { group in
                // provider 分组标题
                Text(group.name)
                    .font(.caption2).fontWeight(.semibold)
                    ...
                
                ForEach(group.models, id: \.self) { m in
                    Button { ... } label: {
                        HStack {
                            // 显示 "provider中文名 / 模型名" 格式
                            let parts = m.split(separator: "/", maxSplits: 1)
                            if parts.count > 1 {
                                Text(providerNames[String(parts[0])] ?? String(parts[0]))
                                    .foregroundStyle(.secondary)
                                Text("/")
                                    .foregroundStyle(.tertiary)
                                Text(String(parts[1]))
                            } else {
                                Text(m)
                            }
                            .font(.system(.caption, design: .monospaced))
                            Spacer()
                            if m == selectedModel { Image(systemName: "checkmark") }
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 4)
                    }
                    .buttonStyle(.plain)
                }
                Divider()
            }
        }
    }
    .frame(width: 360).frame(maxHeight: 400)
}
```

**CreateAgentView.modelPopover**（第 609-659 行）：同样的修改。

#### 变更 2：CreateAgentView 删除模板，改为 7 个文件编辑

删除 `soulTemplates` 常量和 `soulContent` 状态。

新增状态：
```swift
@State private var fileContents: [String: String] = [:]
```

将 `Section("SOUL 模板")` 替换为：
```swift
Section("Agent 文件") {
    ForEach(predefinedFiles, id: \.self) { fileName in
        DisclosureGroup {
            TextEditor(text: Binding(
                get: { fileContents[fileName] ?? "" },
                set: { fileContents[fileName] = $0 }
            ))
            .font(.system(.caption, design: .monospaced))
            .frame(minHeight: 80)
            .border(Color(.separatorColor))
        } label: {
            HStack(spacing: 6) {
                Image(systemName: fileIcon(fileName))
                    .foregroundStyle(fileColor(fileName))
                Text(fileDisplayName(fileName))
                    .font(.subheadline)
            }
        }
    }
}
```

修改 `createAgent()` 方法：遍历 `fileContents`，对每个非空内容调用 `saveAgentFile` 保存。使用 DispatchGroup 等待所有文件保存完成后再回调。

## 验证步骤

1. 打开 Agent 详情 → 点击模型选择 → popover 应可滚动，每个模型显示 "火山引擎 / doubao-seed-2.0-pro" 格式
2. 创建新 Agent → 模型选择 popover 同样可滚动且显示 provider 中文名
3. 创建新 Agent → 应看到 7 个文件（SOUL/AGENTS/IDENTITY/USER/TOOLS/HEARTBEAT/MEMORY），每个可展开编辑
4. 创建新 Agent → 不再有"选择模板"功能
5. 填写部分文件内容 → 创建 → 对应文件应保存到 Gateway
