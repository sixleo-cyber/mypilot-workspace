# 定时任务刷新 + 文件浏览器同步修复

## 问题分析

### 问题1：定时任务刷新无反应

**数据流**：ScheduledTasksView.loadTasks() → ws.scheduleListDetailed() → rpcClient.scheduleListDetailed() → sendRpc("schedule.list") → daemon → scheduler.list() + scheduler.listCrontab()

**根因**：daemon 的 `schedule.list` 是从本地 `~/.mypilot-link/schedules.json` 读取的，不是从远端 OpenClaw Gateway 同步。用户期望的是"同步远端 OpenClaw 的定时任务列表"，但 daemon 的 scheduler 是本地模块，不与 Gateway 通信。

**解决方案**：定时任务本身就是本地 daemon 管理的（通过 cron 表达式触发 AI 对话），不存在"远端同步"。刷新按钮应该能正常加载本地任务列表。如果无反应，可能是：
1. WebSocket 连接断开，`appState.currentWebSocket` 为 nil
2. daemon 未运行
3. RPC 回调未触发 UI 更新

需要加调试日志确认 RPC 是否发出、是否有响应。

### 问题2：文件浏览器没有一键同步远端文件列表

**数据流**：AgentFilesView.onAppear → ws.requestAgentFileList() → rpcClient.requestAgentFileList() → sendRpc("agents.files.list") → daemon → sendGatewayRpc("agents.files.list") → OpenClaw Gateway

**根因**：文件列表只在 `onAppear` 时加载一次，没有刷新按钮。且 `agents.files.list` 是转发到 Gateway 的，应该能获取远端文件列表。但缺少：
1. 手动刷新按钮
2. 加载状态指示
3. 错误提示

## 修改计划

### 1. ScheduledTasksView.swift — 加调试日志 + 错误提示

- `loadTasks()` 中加 `print("[Schedule] loadTasks called, ws=\(ws != nil)")` 确认调用
- 在 `scheduleListDetailed` 回调中加 `print("[Schedule] response: success=\(success), tasks=\(rawTasks.count)")` 确认响应
- 如果 daemon 未连接，显示更明确的错误提示

### 2. AgentFilesView.swift — 添加刷新按钮

- 在 `fileListPanel` 顶部添加刷新按钮
- 添加 `isLoadingFiles` 状态
- 刷新时调用 `ws.requestAgentFileList()`
- 显示加载/错误状态

### 具体修改

#### ScheduledTasksView.swift

```swift
private func loadTasks() {
    isLoading = true
    guard let ws = appState.currentWebSocket else {
        isLoading = false
        loadCachedTasks(message: "未连接到 daemon，已显示本地缓存")
        return
    }
    print("[Schedule] loadTasks: requesting schedule.list")
    ws.scheduleListDetailed { success, rawTasks, rawCrontabTasks in
        print("[Schedule] loadTasks: response success=\(success), tasks=\(rawTasks.count), crontab=\(rawCrontabTasks.count)")
        self.isLoading = false
        if success {
            let schedulerTasks = rawTasks.compactMap(ScheduledTask.init(daemonTask:))
            let crontabTasks = rawCrontabTasks.compactMap(ScheduledTask.init(daemonTask:))
            self.tasks = schedulerTasks + crontabTasks
            self.saveTasks(schedulerTasks)
            self.loadError = nil
        } else {
            self.loadCachedTasks(message: "无法加载定时任务，已显示本地缓存")
        }
    }
}
```

#### AgentFilesView.swift

在 `fileListPanel` 中添加刷新按钮：

```swift
private var fileListPanel: some View {
    VStack(spacing: 0) {
        HStack {
            Text("文件列表")
                .font(AppTypography.sectionTitle)
            Spacer()
            Button(action: { refreshFiles() }) {
                Image(systemName: isLoadingFiles ? "arrow.clockwise" : "arrow.clockwise")
                    .rotationEffect(.degrees(isLoadingFiles ? 360 : 0))
                    .animation(isLoadingFiles ? .linear(duration: 1).repeatForever(autoreverses: false) : .default, value: isLoadingFiles)
            }
            .buttonStyle(.borderless)
            .disabled(isLoadingFiles)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(AppColors.surfaceCard)

        Divider()

        // ... 文件列表不变
    }
}

private func refreshFiles() {
    guard let ws = ws else { return }
    isLoadingFiles = true
    ws.requestAgentFileList(agentId: ws.currentAgentId)
    // 延迟重置加载状态（等待 RPC 回调更新 agentFiles）
    DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
        isLoadingFiles = false
    }
}
```

添加 `@State private var isLoadingFiles = false` 状态。

## 验证

1. 定时任务页面：点击刷新按钮，Xcode 控制台输出 `[Schedule] loadTasks` 日志
2. 文件浏览器：出现刷新按钮，点击后文件列表更新
3. daemon 未连接时，显示明确错误提示
