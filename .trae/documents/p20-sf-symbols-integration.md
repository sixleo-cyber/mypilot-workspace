# P20: MyPilot SF Symbols 自定义图标集成

## 概述
将 `mypilot-icons-svg/` 中的 32 个 SVG 图标集成到 Xcode Asset Catalog，创建 `mp.*` 命名空间的自定义 Symbol Set，并替换项目中关键位置的系统 SF Symbols 为自定义图标。

## 当前状态
- **SVG 文件**：32 个，位于 `/Users/liaoxing/Downloads/未命名文件夹/mypilot-icons-svg/`
- **格式**：全部为 stroke-based（`fill="none" stroke="currentColor"`），无 `.fill` 变体
- **项目**：macOS 26.5，完全支持 SF Symbols 现代 API
- **Asset Catalog**：当前仅有 `Assets.xcassets/`，无自定义 Symbol Set
- **现有图标**：全部使用系统原生 SF Symbols（`paperclip`, `gearshape.fill` 等）

## SVG 文件清单（32 个）
```
mp.chat, mp.send, mp.stop, mp.attach, mp.search,
mp.agents, mp.files, mp.workflow, mp.tool, mp.memory, mp.permission,
mp.task.create, mp.scheduled, mp.heartbeat,
mp.usage, mp.diagnostics,
mp.settings, mp.network, mp.channels, mp.advanced,
mp.info, mp.warning, mp.success, mp.empty, mp.connection,
mp.back, mp.close, mp.menu, mp.add, mp.delete, mp.edit, mp.refresh
```

注意：无 `.fill` 变体 SVG 文件。

---

## Step 1: 创建 Asset Catalog Symbol Set

### 1.1 在 Assets.xcassets 中创建 Symbols 目录结构

在 `MyPilot/Assets.xcassets/` 下创建 `Symbols.symbolset/` 目录，为每个图标创建子目录：

```
Assets.xcassets/
└── Symbols.symbolset/
    ├── Contents.json          (顶层索引)
    ├── mp.chat.symbolset/
    │   ├── Contents.json
    │   └── mp.chat.svg
    ├── mp.send.symbolset/
    │   ├── Contents.json
    │   └── mp.send.svg
    ├── ... (每个图标一个 .symbolset 目录)
    └── mp.menu.symbolset/
        ├── Contents.json
        └── mp.menu.svg
```

### 1.2 每个 .symbolset 的 Contents.json 模板

```json
{
  "info" : {
    "author" : "xcode",
    "version" : 1
  },
  "symbols" : [
    {
      "idiom" : "universal",
      "filename" : "mp.chat.svg"
    }
  ]
}
```

### 1.3 顶层 Contents.json

更新 `Assets.xcassets/Contents.json`，添加 `:symbols` property：

```json
{
  "info" : {
    "author" : "xcode",
    "version" : 1
  },
  "properties" : {
    "provides-namespace" : true
  }
}
```

**文件操作**：
- 复制 32 个 SVG 文件到对应的 `.symbolset/` 目录
- 为每个目录创建 `Contents.json`
- 更新顶层 `Contents.json`

---

## Step 2: 创建 MPSymbol 枚举（集中管理图标名）

**新建文件**: `MyPilot/Core/DesignSystem/MPSymbol.swift`

```swift
enum MPSymbol {
    // 对话核心
    static let chat = "mp.chat"
    static let send = "mp.send"
    static let stop = "mp.stop"
    static let attach = "mp.attach"
    static let search = "mp.search"

    // 智能体管理
    static let agents = "mp.agents"
    static let files = "mp.files"
    static let workflow = "mp.workflow"
    static let tool = "mp.tool"
    static let memory = "mp.memory"
    static let permission = "mp.permission"

    // 任务调度
    static let taskCreate = "mp.task.create"
    static let scheduled = "mp.scheduled"
    static let heartbeat = "mp.heartbeat"

    // 数据分析
    static let usage = "mp.usage"
    static let diagnostics = "mp.diagnostics"

    // 系统设置
    static let settings = "mp.settings"
    static let network = "mp.network"
    static let channels = "mp.channels"
    static let advanced = "mp.advanced"

    // 状态反馈
    static let info = "mp.info"
    static let warning = "mp.warning"
    static let success = "mp.success"
    static let empty = "mp.empty"
    static let connection = "mp.connection"

    // 导航操作
    static let back = "mp.back"
    static let close = "mp.close"
    static let menu = "mp.menu"
    static let add = "mp.add"
    static let delete = "mp.delete"
    static let edit = "mp.edit"
    static let refresh = "mp.refresh"
}
```

---

## Step 3: 替换关键位置的图标

只替换**语义明确的导航/功能图标**，保留系统通用图标（如 chevron、checkmark 等）。

### 3.1 SettingsView.swift — 设置导航图标

| 当前 | 替换为 |
|------|--------|
| `Label("网络设置", systemImage: "network")` | `Label("网络设置", systemImage: MPSymbol.network)` |
| `Label("Agent 文件", systemImage: "doc.text.fill")` | `Label("Agent 文件", systemImage: MPSymbol.files)` |
| `Label("IM 通信渠道", systemImage: "message.fill")` | `Label("IM 通信渠道", systemImage: MPSymbol.channels)` |
| `Label("Agents 管理", systemImage: "person.2.fill")` | `Label("Agents 管理", systemImage: MPSymbol.agents)` |
| `Label("定时任务", systemImage: "clock.badge")` | `Label("定时任务", systemImage: MPSymbol.scheduled)` |
| `Label("文件浏览器", systemImage: "folder.fill")` | `Label("文件浏览器", systemImage: MPSymbol.files)` |
| `Label("诊断中心", systemImage: "stethoscope")` | `Label("诊断中心", systemImage: MPSymbol.diagnostics)` |
| `Label("高级设置", systemImage: "gearshape.2.fill")` | `Label("高级设置", systemImage: MPSymbol.advanced)` |
| `Label("订阅管理", systemImage: "creditcard.fill")` | `Label("订阅管理", systemImage: MPSymbol.settings)` |

**文件**: `Features/Settings/SettingsView.swift`

### 3.2 SidebarView.swift — 底部按钮图标

| 当前 | 替换为 |
|------|--------|
| `Image(systemName: "gearshape.fill")` | `Image(systemName: MPSymbol.settings)` |

**文件**: `Views/SidebarView.swift`

### 3.3 InputBarView.swift — 操作按钮图标

| 当前 | 替换为 |
|------|--------|
| `Image(systemName: "paperclip")` | `Image(systemName: MPSymbol.attach)` |
| `Image(systemName: "ellipsis.circle")` | `Image(systemName: MPSymbol.menu)` |
| `Image(systemName: "arrow.up")` (发送) | `Image(systemName: MPSymbol.send)` |
| `Image(systemName: "stop.fill")` | `Image(systemName: MPSymbol.stop)` |
| `Image(systemName: "magnifyingglass")` (搜索) | `Image(systemName: MPSymbol.search)` |

**文件**: `Views/InputBarView.swift`

### 3.4 ChatHeaderSection.swift — 状态/操作图标

| 当前 | 替换为 |
|------|--------|
| `Image(systemName: "exclamationmark.triangle.fill")` (上下文警告) | `Image(systemName: MPSymbol.warning)` |
| `Image(systemName: "square.and.arrow.up")` (导出) | 保留系统图标（导出是系统标准操作） |

**文件**: `Features/Chat/ChatHeaderSection.swift`

### 3.5 WelcomeView.swift — 步骤图标

| 当前 | 替换为 |
|------|--------|
| `Image(systemName: "antenna.radiowaves.left.and.right")` | 保留（天线图标无对应 mp.* 图标） |
| StepRow icon: `"server.rack"` | 保留 |
| StepRow icon: `"terminal"` | 保留 |
| StepRow icon: `"plus.circle"` | `MPSymbol.add` |

**文件**: `Views/WelcomeView.swift`

### 3.6 PlaceholderSettingsPages.swift — 空状态图标

| 当前 | 替换为 |
|------|--------|
| `Image(systemName: icon)` (传入的 icon) | 如果 icon 在 MPSymbol 中有对应则替换 |

**文件**: `Features/Settings/PlaceholderSettingsPages.swift`

### 3.7 DiagnosticsCenterView.swift — metricCard 图标

metricCard 传入的 icon 参数（如 `"wifi"`, `"cpu"`, `"externaldrive"`）保留系统图标，这些是硬件指标，不适合替换。

### 3.8 ScheduledTasksView.swift — 空状态图标

| 当前 | 替换为 |
|------|--------|
| `Image(systemName: "clock.badge")` | `Image(systemName: MPSymbol.scheduled)` |

**文件**: `Features/Settings/ScheduledTasksView.swift`

### 3.9 AboutView.swift — App 图标

| 当前 | 替换为 |
|------|--------|
| `Image(systemName: "leaf.fill")` | 保留（品牌标识，不用 mp.*） |

### 3.10 AddInstanceView.swift — 实例图标

| 当前 | 替换为 |
|------|--------|
| `Image(systemName: "server.rack")` | 保留（服务器图标无对应 mp.*） |
| `Image(systemName: "key.fill")` | 保留 |

---

## Step 4: 添加 symbolEffect 动画

在关键交互位置添加 SF Symbols 动画效果：

### 4.1 InputBarView — 发送/停止按钮

```swift
Image(systemName: MPSymbol.send)
    .contentTransition(.symbolEffect(.replace))
Image(systemName: MPSymbol.stop)
    .contentTransition(.symbolEffect(.replace))
```

### 4.2 SidebarView — 设置按钮

```swift
Image(systemName: MPSymbol.settings)
    .contentTransition(.symbolEffect(.replace))
```

### 4.3 SettingsView — NavigationLink 图标

在 SettingsIconLabelStyle 中添加 contentTransition。

---

## Step 5: xcodebuild 验证

```bash
cd /Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot
xcodebuild -project MyPilot.xcodeproj -scheme MyPilot -configuration Debug -destination 'platform=macOS' -skipMacroValidation build
```

---

## 不替换的图标（保留系统 SF Symbols）

以下图标保留系统原生，因为：
1. **导航辅助**：`chevron.down`, `chevron.right` — 系统标准，用户认知一致
2. **状态标记**：`checkmark`, `xmark` — 系统标准
3. **文件类型**：`doc`, `photo`, `folder` — 系统标准
4. **硬件指标**：`wifi`, `cpu`, `externaldrive` — 无对应 mp.* 图标
5. **品牌标识**：`leaf.fill` — MyPilot 品牌色
6. **通用操作**：`square.and.arrow.up`（导出）— 系统标准

---

## 注意事项

1. **SVG 格式**：当前 SVG 是 stroke-based，在 SF Symbols 中作为 monochrome 渲染。如需 multicolor/hierarchical 渲染，需要重新设计 SVG（添加 fill 层）。
2. **无 .fill 变体**：当前没有 `.fill` SVG 文件，所以 `mp.chat.fill` 等不可用。如果需要 fill 变体，需要设计新的 SVG。
3. **Asset Catalog 命名空间**：如果 `Assets.xcassets/Contents.json` 设置了 `provides-namespace: true`，调用时需要 `Image(systemName: "mp.chat")`，系统会自动在 Asset Catalog 中查找。
4. **SVG 兼容性**：SF Symbols 要求 SVG 使用特定格式（SFSymbol SVG template）。当前 SVG 使用 `stroke="currentColor"`，这在 macOS 26 的 SF Symbols 渲染中应该可以正常工作（monochrome 模式下 `currentColor` 会被 `foregroundStyle` 替换）。
