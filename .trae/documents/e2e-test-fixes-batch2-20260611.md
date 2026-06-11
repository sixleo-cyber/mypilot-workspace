# 续：端到端测试问题修复计划（第二批）

## 已完成（F-1 ~ F-7）

F-1 开关持久化、F-2 联网搜索描述、F-3 设置导航、F-4 文件浏览器、F-5 表格截断、F-6 Token 估算、F-7 Agent 名称保存

## 本批可自主修复（4 项）

| # | 来源 | 问题 | 复杂度 |
|---|------|------|--------|
| F-8 | 测试 2/O-1 | 搜索框随搜索结果下移，无动画过渡 | 中 |
| F-9 | 测试 9/T-1 | 钉钉未配置渠道显示异常（仅插件存在但无渠道配置时显示为"已启用"） | 小 |
| F-10 | 测试 3/O-2 | 添加实例弹窗缺少操作说明 | 小 |
| F-11 | 测试 11/D-3 | 定时任务列表不同步（onAppear 只加载一次，返回后不刷新） | 小 |

## 仍需人工介入（不执行）

| # | 来源 | 问题 | 原因 |
|---|------|------|------|
| D-4 | 测试 14/15 | AI 回传文件失败 | 需 Gateway 侧支持 |
| T-2 | 测试 10 | 创建新 Agent Gateway 注册 | 需 Gateway 侧排查 |
| T-3 | 测试 20 | 自定义助手头像 | 新功能开发 |

---

## 修复方案

### F-8: 搜索框位置锁定 + 动画过渡

**根因**：`SidebarView` 的 `searchField` 和 `sessionList`/`SearchPanelView` 在 `VStack` 中顺序排列，搜索结果出现时将 `sessionList` 替换为 `SearchPanelView`，导致搜索框位置随内容变化而跳动。

**文件**：`MyPilotApp/MyPilot/MyPilot/Views/SidebarView.swift`

**修复**：
1. 搜索框固定在顶部（不变）
2. 搜索结果区域使用 `ZStack` 叠加在 `sessionList` 上方，而非替换
3. 搜索结果出现/消失时添加 `.transition(.move(edge: .top).combined(with: .opacity))` + `.animation(.easeInOut(duration: 0.2), value: showSearch)`

```swift
var body: some View {
    VStack(spacing: 0) {
        searchField  // 固定在顶部

        ZStack {
            sessionList  // 始终存在

            if showSearch && !searchQuery.isEmpty {
                SearchPanelView(...)
                    .background(.ultraThinMaterial)
                    .transition(.move(edge: .top).combined(with: .opacity))
            }
        }
        .animation(.easeInOut(duration: 0.2), value: showSearch)
    }
    // ... overlay, sheets 等
}
```

### F-9: 钉钉未配置渠道显示异常

**根因**：`IMChannelsView.parseChannels` 中，`isConfigured = hasChannelConfig || pluginEnabled`，`isEnabled = channelEnabled || pluginEnabled`。当仅有 `dingtalk-connector` 插件（`pluginEnabled = true`）但无渠道配置时，`isConfigured = true`、`isEnabled = true`，显示为"已启用"。

**文件**：`MyPilotApp/MyPilot/MyPilot/Features/Settings/IMChannelsView.swift`

**修复**：区分"已配置"和"仅插件存在"状态：
1. `isConfigured` 仅当 `hasChannelConfig` 为 true
2. `isEnabled` 仅当 `channelEnabled` 为 true（非仅 `pluginEnabled`）
3. 新增 `hasPlugin` 属性用于显示"插件已安装"状态
4. 列表显示逻辑：未配置渠道（`!isConfigured`）显示为"插件已安装，未配置"而非"已启用"

```swift
let isConfigured = hasChannelConfig  // 仅当有渠道配置
let isEnabled = channelEnabled && hasChannelConfig  // 需要渠道配置且启用
let hasPlugin = pluginEnabled  // 插件是否安装

// 列表显示
VStack(alignment: .leading, spacing: 2) {
    Text(channel.displayName)
    if channel.isConfigured {
        Text(channel.isEnabled ? "已启用" : "未启用")
            .foregroundStyle(channel.isEnabled ? AppColors.success : AppColors.ink400)
    } else if channel.hasPlugin {
        Text("插件已安装，未配置渠道")
            .foregroundStyle(AppColors.amber300)
    } else {
        Text("未配置")
            .foregroundStyle(AppColors.ink400)
    }
}
```

同时更新 `IMChannel` 模型，添加 `hasPlugin: Bool` 字段。

### F-10: 添加实例弹窗操作说明

**文件**：`MyPilotApp/MyPilot/MyPilot/Views/AddInstanceView.swift`

**修复**：在 step1View 中添加操作说明文本：

```swift
// 在 TextField 和 Button 之间添加
VStack(alignment: .leading, spacing: 6) {
    Label("MyPilot 通过本地 daemon 连接 OpenClaw Gateway", systemImage: "info.circle")
        .font(.caption)
        .foregroundStyle(.secondary)
    Text("1. 在服务器上安装 mypilot-link：npm install -g @mypilot/link")
        .font(.caption2)
        .foregroundStyle(.secondary)
    Text("2. 启动 daemon：mypilot start")
        .font(.caption2)
        .foregroundStyle(.secondary)
    Text("3. 输入 daemon 地址（默认端口 52378）")
        .font(.caption2)
        .foregroundStyle(.secondary)
    Text("4. 在下一步输入终端显示的配对码完成配对")
        .font(.caption2)
        .foregroundStyle(.secondary)
}
.padding(.horizontal, 4)
```

### F-11: 定时任务列表不同步

**根因**：`ScheduledTasksView` 只在 `onAppear` 时调用 `loadTasks()`，从子页面返回时不会重新加载。

**文件**：`MyPilotApp/MyPilot/MyPilot/Features/Settings/ScheduledTasksView.swift`

**修复**：使用 `.onReceive` 监听页面重新出现事件，或更简单地使用 `isPresented` 变化触发刷新：

```swift
// 方案：在 navigationTitle 后添加 onReceive 监听
.onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("RefreshScheduledTasks"))) { _ in
    loadTasks()
}

// 或更简单：在 body 的外层 VStack 上使用 onAppear + 额外的刷新触发
.onAppear { loadTasks() }
```

但 `onAppear` 在 NavigationStack 返回时不会重新触发。更好的方案：

```swift
// 使用 @Environment(\.isEnabled) 或自定义的刷新触发器
// 最简单的方案：添加 .task(id:) 监听
.task {
    loadTasks()
}
```

实际上最可靠的方案是：在 `ScheduledTasksView` 的 `body` 中添加 `.onReceive` 监听 `NSWindow.didBecomeKeyNotification`，但这太重了。

**最简方案**：在 `.onAppear` 之外，再添加一个 `@State private var refreshTrigger = false`，在 sheet dismiss 时触发刷新：

```swift
.sheet(isPresented: $showAddSheet) {
    TaskEditSheet(...)
} onDismiss: {
    loadTasks()  // 创建任务后刷新
}
.sheet(item: $editingTask) { task in
    TaskEditSheet(...)
} onDismiss: {
    loadTasks()  // 编辑任务后刷新
}
```

---

## 执行顺序

1. F-8（SidebarView 搜索框动画）
2. F-9（IMChannelsView 钉钉显示）
3. F-10（AddInstanceView 操作说明）
4. F-11（ScheduledTasksView 列表刷新）
5. 验证：xcodebuild build

## 验证命令

```bash
cd /Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot
xcodebuild -project MyPilot.xcodeproj -scheme MyPilot -configuration Debug -destination 'platform=macOS' -skipMacroValidation build
```
