# P9: Agent 头像编辑 + 子 Agent 创建完善

## Summary

两个核心功能：
1. **Agent 头像本地编辑** — 用户可为任意 Agent 选择/裁剪头像图片，存储在 App 沙盒本地目录，纯本地体验不同步远端
2. **子 Agent 创建完善** — 增强 CreateAgentView，创建后自动拉取远端全套 markdown 文件同步到 App 端，子 Agent 也支持头像编辑

## Current State Analysis

### Agent 模型
- `Agent.swift` 已有 `avatarUrl: String?` 字段
- `AgentRpcClient.requestAgentsList` 已解析 `avatarUrl`/`avatar` 字段
- `SidebarView.AgentRow` 已通过 `AsyncImage` 渲染 `avatarUrl`，fallback 为彩色圆圈+图标
- `ChatHeaderSection.AgentHeaderView` **未使用 avatarUrl**，硬编码为 `Circle().fill(AppColors.amber300)` + `star.fill`/`cpu` 图标
- `AgentsManagementView` 列表行也硬编码为 `Circle().fill(...)` + 图标

### Agent 创建
- `CreateAgentView` 已实现：ID、名称、模型选择、预定义文件编辑
- `createAgent` RPC 已对接 Gateway，创建成功后保存文件
- **缺失**：创建后未自动拉取远端生成的 markdown 文件（如 SOUL.md 等由 Gateway 自动生成的内容）
- **缺失**：无头像选择功能

### 头像存储
- App 当前使用 `FileManager.documentDirectory` 存储消息和会话
- 无 Agent 头像存储目录
- 无头像选择/裁剪 UI 组件

---

## Proposed Changes

### P9-1: Agent 头像本地编辑

#### P9-1a: 头像存储服务

**文件**: `MyPilotApp/MyPilot/MyPilot/Services/AvatarService.swift`（新建）

**功能**:
- 头像存储目录：`Documents/AgentAvatars/`
- 文件命名：`{agentId}.png`
- 提供 `saveAvatar(agentId:imageData)` → 保存图片到本地，返回本地文件 URL
- 提供 `avatarURL(for:agentId)` → 返回本地文件 URL（用于 Agent.avatarUrl）
- 提供 `deleteAvatar(agentId:)` → 删除头像文件
- 图片压缩：限制最大尺寸 256x256，JPEG 质量 0.8

**关键代码**:
```swift
struct AvatarService {
    static let shared = AvatarService()
    private let fileManager = FileManager.default

    var avatarsDir: URL {
        let dir = fileManager.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("AgentAvatars")
        try? fileManager.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir
    }

    func saveAvatar(agentId: String, imageData: Data) -> String? {
        guard let nsImage = NSImage(data: imageData),
              let resized = resizeImage(nsImage, maxSize: 256),
              let pngData = resized else { return nil }
        let url = avatarsDir.appendingPathComponent("\(agentId).png")
        try? pngData.write(to: url)
        return url.path
    }

    func avatarPath(for agentId: String) -> String? {
        let url = avatarsDir.appendingPathComponent("\(agentId).png")
        return fileManager.fileExists(atPath: url.path) ? url.path : nil
    }

    func deleteAvatar(agentId: String) {
        let url = avatarsDir.appendingPathComponent("\(agentId).png")
        try? fileManager.removeItem(at: url)
    }

    private func resizeImage(_ image: NSImage, maxSize: CGFloat) -> Data? {
        let size = image.size
        let ratio = min(maxSize / size.width, maxSize / size.height, 1.0)
        let newSize = CGSize(width: size.width * ratio, height: size.height * ratio)
        // ... NSImage → CGImage → CGContext → PNG Data
    }
}
```

#### P9-1b: Agent 模型扩展

**文件**: `MyPilotApp/MyPilot/MyPilot/Models/Agent.swift`

**改动**:
- 新增计算属性 `localAvatarPath: String?` — 调用 `AvatarService.shared.avatarPath(for: id)`
- 保留 `avatarUrl: String?` 用于远端 URL（如从 Gateway 返回的）

```swift
var localAvatarPath: String? {
    AvatarService.shared.avatarPath(for: id)
}
```

#### P9-1c: 头像选择 UI 组件

**文件**: `MyPilotApp/MyPilot/MyPilot/SharedComponents/AvatarPickerView.swift`（新建）

**功能**:
- 圆形头像展示 + 点击编辑
- `NSOpenPanel` 选择图片文件（支持 png/jpg/jpeg/gif/bmp）
- 选择后自动裁剪为正方形、压缩、保存到本地
- 支持删除头像（恢复默认图标）
- 回调 `onAvatarChanged: (String?) -> Void` 返回本地文件路径

**UI 设计**:
```
┌─────────────────┐
│   ┌───────┐     │
│   │ 圆形  │ 📷  │  ← 点击 📷 或头像触发选择
│   │ 头像  │     │
│   └───────┘     │
│  [删除头像]      │  ← 仅已有头像时显示
└─────────────────┘
```

#### P9-1d: 头像渲染统一

**文件改动**:

1. `AgentsManagementView.swift` 第 72-77 行 — 列表行头像改为使用 `AgentAvatarView`
2. `SidebarView.swift` 第 377-401 行 — `AgentRow` 改为使用 `AgentAvatarView`
3. `ChatHeaderSection.swift` 第 39-43 行 — `AgentHeaderView` 改为使用 `AgentAvatarView`

**新建共享组件**: `MyPilotApp/MyPilot/MyPilot/SharedComponents/AgentAvatarView.swift`

**统一头像渲染逻辑**:
```swift
struct AgentAvatarView: View {
    let agent: Agent
    var size: CGFloat = 32

    var body: some View {
        Group {
            // 优先级：本地头像 > 远端 avatarUrl > 默认图标
            if let localPath = agent.localAvatarPath,
               let nsImage = NSImage(contentsOfFile: localPath) {
                Image(nsImage: nsImage)
                    .resizable().scaledToFill()
            } else if let avatarUrl = agent.avatarUrl, let url = URL(string: avatarUrl) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image): image.resizable().scaledToFill()
                    default: defaultIcon
                    }
                }
            } else {
                defaultIcon
            }
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
    }

    private var defaultIcon: some View {
        Circle()
            .fill(agent.id == "main" ? AppColors.amber300 : AppColors.lime300)
            .overlay(
                Image(systemName: agent.id == "main" ? "star.fill" : "cpu")
                    .font(.caption2)
                    .foregroundStyle(AppColors.userBubbleText)
            )
    }
}
```

#### P9-1e: AgentDetailView 添加头像编辑

**文件**: `MyPilotApp/MyPilot/MyPilot/Features/Settings/AgentsManagementView.swift` — `AgentDetailView`

**改动**: 在 "基本信息" Section 顶部添加头像编辑行

```swift
Section("基本信息") {
    // 新增头像行
    LabeledContent("头像") {
        AvatarPickerView(agentId: agent.id) { newPath in
            // 头像已保存到本地，UI 自动刷新（Agent.localAvatarPath 是计算属性）
        }
    }
    LabeledContent("ID") { ... }
    LabeledContent("名称") { ... }
    LabeledContent("模型") { ... }
}
```

---

### P9-2: 子 Agent 创建完善

#### P9-2a: 增强 CreateAgentView

**文件**: `MyPilotApp/MyPilot/MyPilot/Features/Settings/AgentsManagementView.swift` — `CreateAgentView`

**改动**:

1. **添加头像选择** — 在 "基本信息" Section 添加 `AvatarPickerView`
2. **创建后自动拉取远端文件** — 创建成功后，自动调用 `requestAgentFileList` + `requestAgentFileContent` 拉取全套 markdown 文件
3. **完善创建流程** — 创建成功后刷新 agents 列表，自动导航到新 Agent 的详情页

**创建流程改进**:
```
用户填写信息 → 点击创建 →
  1. createAgent RPC 注册到 Gateway
  2. 保存用户编辑的文件到 Gateway
  3. 等待 2s（Gateway 生成默认文件）
  4. requestAgentFileList 拉取文件列表
  5. 逐个 requestAgentFileContent 拉取文件内容（缓存到本地）
  6. 保存头像到本地
  7. 刷新 agents 列表
  8. dismiss 创建页
```

**关键代码**:
```swift
// 在 createAgent() 方法中，注册成功后添加文件拉取逻辑
ws?.createAgent(id: cleanId, name: name, model: model) { result in
    DispatchQueue.main.async {
        guard let result = result, result["ok"] as? Bool == true else {
            errorMessage = "创建失败，Gateway 注册失败"
            isCreating = false
            return
        }

        // 1. 保存用户编辑的文件
        let group = DispatchGroup()
        for (fileName, content) in fileContents where !content.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            group.enter()
            ws?.saveAgentFile(agentId: cleanId, name: fileName, content: content) { _ in group.leave() }
        }

        // 2. 等待 Gateway 生成默认文件后拉取
        group.notify(queue: .main) {
            DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                self.syncAgentFilesFromRemote(agentId: cleanId)
            }
        }
    }
}

private func syncAgentFilesFromRemote(agentId: String) {
    // 拉取文件列表
    ws?.requestAgentFileList(agentId: agentId)
    DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
        // 文件列表已在 ws.agentFiles 中，逐个拉取内容
        if let files = ws?.agentFiles {
            let syncGroup = DispatchGroup()
            for file in files where !file.missing {
                syncGroup.enter()
                ws?.requestAgentFileContent(agentId: agentId, name: file.id) { _ in syncGroup.leave() }
            }
            syncGroup.notify(queue: .main) {
                // 3. 保存头像
                if let avatarData = self.selectedAvatarData {
                    _ = AvatarService.shared.saveAvatar(agentId: agentId, imageData: avatarData)
                }
                // 4. 刷新列表并关闭
                var model: Agent.AgentModel?
                if !selectedModel.isEmpty { model = Agent.AgentModel(primary: selectedModel) }
                let newAgent = Agent(id: agentId, name: name, model: model, isActive: false)
                onCreated(newAgent)
                isCreating = false
                dismiss()
            }
        } else {
            isCreating = false
            dismiss()
        }
    }
}
```

3. **添加头像 State**:
```swift
@State private var selectedAvatarData: Data?
```

4. **UI 添加头像行**:
```swift
Section("基本信息") {
    // 新增
    LabeledContent("头像") {
        AvatarPickerView(agentId: "__new__\(UUID().uuidString.prefix(8))") { _ in
            // 预览用，实际保存在创建时
        }
    }
    TextField("Agent ID（英文，如 coder）", text: $agentId)
    TextField("显示名称（如 代码专家）", text: $agentName)
}
```

注意：CreateAgentView 中头像选择的处理需要特殊处理，因为 agentId 在创建前还不存在。方案：先暂存图片 Data，创建成功后再用实际 agentId 保存。

#### P9-2b: AgentDetailView 文件同步增强

**文件**: `MyPilotApp/MyPilot/MyPilot/Features/Settings/AgentsManagementView.swift` — `AgentDetailView`

**改动**: 添加"从远端同步文件"按钮，手动触发拉取远端文件列表和内容

```swift
Section("Agent 文件") {
    HStack {
        Text("Agent 文件")
        Spacer()
        Button { syncFilesFromRemote() } label: {
            Image(systemName: "arrow.triangle.2.circlepath")
        }
        .buttonStyle(.borderless)
        .help("从远端同步文件")
    }

    ForEach(predefinedFiles, id: \.self) { ... }
}

private func syncFilesFromRemote() {
    isLoadingFiles = true
    ws?.requestAgentFileList(agentId: agent.id)
    DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
        if let files = ws?.agentFiles { agentFiles = files }
        isLoadingFiles = false
    }
}
```

---

## Assumptions & Decisions

1. **头像纯本地存储** — 存入 `Documents/AgentAvatars/{agentId}.png`，不同步远端
2. **头像优先级** — 本地文件 > 远端 avatarUrl > 默认图标
3. **子 Agent = 普通 Agent** — 无专门父子层级，通过 AGENTS.md 定义协作关系
4. **创建后自动拉取** — 创建 Agent 后等待 2s 再拉取远端生成的文件，确保 Gateway 有时间生成默认内容
5. **图片压缩** — 头像最大 256x256，PNG 格式，控制文件大小
6. **CreateAgentView 头像** — 先暂存 Data，创建成功后用实际 agentId 保存
7. **不修改 daemon** — 头像编辑纯 App 端，不涉及 daemon 或 Gateway 协议变更

## Verification

```bash
# App 编译
cd /Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot
xcodebuild -project MyPilot.xcodeproj -scheme MyPilot -configuration Debug -destination 'platform=macOS' -skipMacroValidation build

# daemon 验证（无改动，确认不破坏）
cd /Users/liaoxing/Downloads/未命名文件夹/mypilot-link
npm run verify
```

**功能验证**:
1. Agent 列表/侧边栏/聊天头部 — 有本地头像时显示头像，无则显示默认图标
2. Agent 详情页 — 点击头像可选择/更换/删除本地头像
3. 创建 Agent — 可选头像、创建后自动拉取远端 markdown 文件
4. 创建后 — 新 Agent 在列表中显示自定义头像
