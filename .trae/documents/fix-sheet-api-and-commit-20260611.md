# F-1~F-11 修复收尾计划

## 当前状态

### 构建错误
ScheduledTasksView.swift 中 `.sheet(onDismiss:)` API 参数顺序错误，导致 BUILD FAILED：
- **第35行**: `.sheet(isPresented:content:onDismiss:)` → 应为 `.sheet(isPresented:onDismiss:content:)`
- **第46行**: `.sheet(item:_:onDismiss:)` → 应为 `.sheet(item:onDismiss:content:)`

SwiftUI 正确签名：
```swift
.sheet(isPresented:onDismiss:content:)
.sheet(item:onDismiss:content:)
```

### 其他文件状态（已修改，逻辑正确）
| 文件 | 修改内容 | 状态 |
|------|---------|------|
| NetworkSettingsView.swift | F-1: 权限读回确认 + F-2: 搜索描述 | OK |
| SettingsView.swift | F-3: NavigationStack 重写 | OK |
| PlaceholderSettingsPages.swift | F-4: 文件下载后打开 | OK |
| MarkdownRenderer.swift | F-5: 表格行间距 | OK |
| ChatHeaderSection.swift | F-6: token 估算 /2 | OK |
| AgentsManagementView.swift | F-7: updateAgent RPC | OK |
| SidebarView.swift | F-8: ZStack 搜索面板 | OK |
| IMChannelsView.swift | F-9: 三态渠道显示 | OK |
| AddInstanceView.swift | F-10: 4步操作说明 | OK |
| ScheduledTasksView.swift | F-11: onDismiss 刷新 | **BUILD ERROR** |
| daemon.js | F-4: /mypilot-media/ 静态文件 | OK |

### daemon 侧
- 90 测试全部通过

## 执行步骤

### Step 1: 修复 ScheduledTasksView.swift 的 .sheet API 参数顺序

将第35-45行：
```swift
.sheet(isPresented: $showAddSheet) {
    TaskEditSheet(...)
} onDismiss: {
    loadTasks()
}
```
改为：
```swift
.sheet(isPresented: $showAddSheet, onDismiss: { loadTasks() }) {
    TaskEditSheet(...)
}
```

将第46-61行：
```swift
.sheet(item: $editingTask) { task in
    TaskEditSheet(...)
} onDismiss: {
    loadTasks()
}
```
改为：
```swift
.sheet(item: $editingTask, onDismiss: { loadTasks() }) { task in
    TaskEditSheet(...)
}
```

### Step 2: 验证构建
```bash
xcodebuild -project MyPilot.xcodeproj -scheme MyPilot -configuration Debug -destination 'platform=macOS' -skipMacroValidation build
```

### Step 3: 运行测试
```bash
xcodebuild test -project MyPilot.xcodeproj -scheme MyPilot -destination 'platform=macOS' -skipMacroValidation
```

### Step 4: 提交并推送
- MyPilot App: 提交 F-1~F-11 所有修改
- mypilot-link: 提交 daemon.js 修改
