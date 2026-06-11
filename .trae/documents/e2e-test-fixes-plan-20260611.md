# 端到端测试问题修复计划

## 问题分类

### 可自主修复（7 项）

| # | 来源 | 问题 | 复杂度 |
|---|------|------|--------|
| F-1 | 测试 4A | 命令执行开关不持久化 | 小 |
| F-2 | 测试 4/O-3 | 联网搜索板块缺少功能描述 | 小 |
| F-3 | 测试 8/O-4 | 设置页面二次进入同一子页面失败 | 中 |
| F-4 | 测试 12/O-6 | 文件浏览器打开文件返回 Not found | 中 |
| F-5 | 测试 16/O-8 | 表格渲染行底部文字被截断 | 小 |
| F-6 | 测试 17/O-9 | Token 进度条计算不准确 | 中 |
| F-7 | 测试 18/O-10 | 修改 Agent 名称保存失败 | 中 |

### 需产品决策或人工验证（4 项，不执行）

| # | 来源 | 问题 | 原因 |
|---|------|------|------|
| D-1 | 测试 2/O-1 | 搜索框位置锁定 + 动画 | 需 UI 交互设计决策 |
| D-2 | 测试 3/O-2 | 添加实例弹窗操作说明 | 需确认文案内容 |
| D-3 | 测试 11 | 定时任务列表不同步 + 创建失败 | 需 daemon 端排查，可能涉及 Gateway 协议 |
| D-4 | 测试 14/15 | AI 回传文件失败 | 需 Gateway 侧支持，非 App 端问题 |

### 待开发功能（3 项，不执行）

| # | 来源 | 问题 |
|---|------|------|
| T-1 | 测试 9 | 钉钉未配置渠道显示异常 |
| T-2 | 测试 10/O-5 | 创建新 Agent Gateway 注册 |
| T-3 | 测试 20/O-11 | 自定义助手头像 |

---

## 修复方案

### F-1: 命令执行开关不持久化

**根因**：`permissionRow` 使用 `setConfig` 设置 `commands.native`，值类型为 `true/false`。但 Gateway 可能期望 `"auto"` 字符串而非布尔值，导致 setConfig 返回 false → 回滚到旧值。

**文件**：`NetworkSettingsView.swift`（~L220-230）

**修复**：
1. 在 `permissionRow` 的 `onChange` 回调中，如果 `setConfig` 返回 `false`，不立即回滚，而是先读回当前值确认
2. 增加 `commands.native` 的值映射：开关 ON → `true`，开关 OFF → `false`（当前逻辑已正确，问题可能在 Gateway 侧不识别布尔值）
3. 添加调试日志：在 setConfig 回调中打印 key/value/ok 结果

**验证**：开启命令执行 → 退出页面 → 重新进入，开关保持开启

### F-2: 联网搜索板块添加功能描述

**文件**：`NetworkSettingsView.swift`（~L292-357）

**修复**：参照 `privacySection` 的 `VStack(alignment: .leading, spacing: 2)` + `Text("描述").font(.caption).foregroundStyle(.secondary)` 模式，为以下控件添加描述：

| 控件 | 描述文案 |
|------|---------|
| OpenClaw 网页解析 | AI 回复时自动解析网页内容，获取更准确的信息 |
| 自动导入 | 自动将网页内容导入到对话上下文中 |
| 最大抓取大小 | 单次网页抓取的最大字节数 |
| 超时时间 | 网页抓取请求的超时秒数 |
| 默认服务 | 联网搜索使用的默认搜索引擎 |

**验证**：进入网络设置 → 联网搜索板块，每个功能项下方有灰色小字描述

### F-3: 设置页面二次进入同一子页面失败

**根因**：SwiftUI `NavigationLink` 在 `NavigationStack` 中，返回后 `path` 被清空，但 `NavigationLink` 的目标视图仍被缓存。再次点击同一链接时，SwiftUI 认为导航未变化，不触发 push。

**文件**：`SettingsView.swift`

**修复**：使用 `NavigationStack(path:)` + 显式 `Binding<[String]` 管理导航路径，确保每次点击都能正确 push。或者更简单的方案：为每个 `NavigationLink` 添加 `value` 参数，使用 `navigationDestination(for:)` 替代闭包式 `NavigationLink`。

**具体方案**：
```swift
// 定义导航目标枚举
enum SettingsDestination: Hashable {
    case network, agentFiles, imChannels, agents, scheduledTasks, fileBrowser, diagnostics, advanced, subscription
}

// 使用 NavigationStack(path:) + navigationDestination
NavigationStack(path: $navPath) {
    List {
        // NavigationLink(value:) 替代 NavigationLink { Destination() }
        NavigationLink(value: SettingsDestination.network) {
            Label("网络设置", systemImage: "network")
        }
        // ...
    }
    .navigationDestination(for: SettingsDestination.self) { dest in
        switch dest {
        case .network: NetworkSettingsView()
        // ...
        }
    }
}
```

**验证**：进入设置 → 网络设置 → 返回 → 再次点击网络设置，能正常进入

### F-4: 文件浏览器打开文件返回 Not found

**根因**：daemon 的 `/api/workspace-files` 返回的 URL 是 `/mypilot-media/{id}/{file}`，但 daemon 没有注册该路径的 HTTP handler，导致请求返回 404。

**文件**：
1. `mypilot-link/src/daemon.js` — 添加 `/mypilot-media/` 静态文件服务
2. `PlaceholderSettingsPages.swift` — 改进 `openFile` 方法，先下载到本地再打开

**daemon.js 修复**：在 HTTP 请求处理区域添加：
```javascript
// 静态文件服务：/mypilot-media/
if (urlPath.startsWith("/mypilot-media/")) {
  const relativePath = urlPath.slice("/mypilot-media/".length);
  const filePath = path.join(mediaDir, relativePath);
  // 安全检查：防止路径遍历
  if (!filePath.startsWith(mediaDir)) {
    res.writeHead(403); res.end("Forbidden"); return;
  }
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const mime = getMimeType(filePath);
    const stat = fs.statSync(filePath);
    res.writeHead(200, {
      "Content-Type": mime,
      "Content-Length": stat.size,
      "Content-Disposition": `inline; filename="${path.basename(filePath)}"`,
    });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404); res.end("Not found");
  }
  return;
}
```

**PlaceholderSettingsPages.swift 修复**：`openFile` 方法改为先下载到临时目录再打开：
```swift
private func openFile(_ file: WorkspaceFile) {
    guard let url = URL(string: file.url) else { return }
    Task {
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            let tempDir = FileManager.default.temporaryDirectory
            let fileURL = tempDir.appendingPathComponent(file.name)
            try data.write(to: fileURL)
            NSWorkspace.shared.open(fileURL)
        } catch {
            // fallback: 尝试直接在浏览器打开
            if let url = URL(string: file.url) { NSWorkspace.shared.open(url) }
        }
    }
}
```

**验证**：文件浏览器 → 点击文件 → 本地打开成功

### F-5: 表格渲染行底部文字被截断

**根因**：`MarkdownTable` 的行单元格 `.padding(.vertical, 6)` 太小，且 `cellContent` 中 `Text` 的行高可能被压缩。`fixedSize(horizontal: false, vertical: true)` 虽然设置了，但外层 `HStack` 可能限制了高度。

**文件**：`MarkdownRenderer.swift`（~L352-431）

**修复**：
1. 行单元格 `.padding(.vertical, 6)` → `.padding(.vertical, 8)`
2. 确保 `HStack` 不限制子视图高度：在行 `HStack` 上添加 `.fixedSize(horizontal: false, vertical: true)`
3. 表格整体 `VStack` 添加 `.fixedSize(horizontal: false, vertical: true)`

**验证**：AI 回复包含多行表格 → 行底部文字完整显示

### F-6: Token 进度条计算不准确

**根因**：`TokenUsageBar.estimatedTokens` 用 `content.count / 4` 估算，但：
1. 只统计 `content` 字段，未统计 `thinkingContent`
2. 中文字符 1 字符 ≈ 1-2 tokens，不是 0.25 tokens
3. 未统计附件内容
4. 未考虑历史消息（只统计当前会话内存中的 messages）

**文件**：`ChatHeaderSection.swift`（~L206-258）

**修复**：
1. 统计 `thinkingContent`：`totalChars += $1.thinkingContent?.count ?? 0`
2. 改进估算公式：区分 CJK 字符和 ASCII
```swift
private var estimatedTokens: Int {
    var totalChars = 0
    for msg in wsService.messages {
        totalChars += msg.content.count
        totalChars += msg.thinkingContent?.count ?? 0
    }
    // 粗略估算：CJK 字符约 1.5 tokens/字，ASCII 约 0.25 tokens/字
    var tokens = 0
    for char in wsService.messages.flatMap({ Array($0.content + ($0.thinkingContent ?? "")) }) {
        tokens += char.isCJK ? 2 : 1
    }
    return max(1, tokens / 4 + totalChars / 4)
}
```
更简单的方案：将除数从 4 改为 2（更接近实际 token 比），并加上 thinkingContent：
```swift
private var estimatedTokens: Int {
    let totalChars = wsService.messages.reduce(0) { $0 + $1.content.count + ($1.thinkingContent?.count ?? 0) }
    return max(1, totalChars / 2)
}
```

3. 在 UI 上标注"约"字样，降低用户对精度的期望

**验证**：长对话后 token 数量与实际对话量基本匹配

### F-7: 修改 Agent 名称保存失败

**根因**：`saveAgent()` 使用 `setConfig(key: "agents.entries.\(agent.id).name", value: newName)` 保存名称。但 Gateway 的 config 路径可能不是这个格式，导致 setConfig 返回 false。

**文件**：`AgentsManagementView.swift`（~L362-421）

**修复**：
1. 同时使用 `updateAgent` RPC（Gateway 原生方法）和 `setConfig` 双路径保存
2. 优先使用 `updateAgent`，setConfig 作为 fallback
3. 添加调试日志，打印 setConfig 的 key/value/ok 结果

```swift
// 保存名称 — 优先使用 updateAgent RPC
if newName != agent.displayName {
    pendingCount += 1
    ws?.updateAgent(id: agent.id, name: newName, model: nil) { ok in
        DispatchQueue.main.async {
            if !ok { hasError = true }
            pendingCount -= 1
            if pendingCount == 0 {
                saveMessage = hasError ? "部分保存失败" : "已保存"
                isSaving = false
                if !hasError { onSave() }
            }
        }
    }
}
```

**验证**：修改 Agent 名称 → 保存 → 显示"已保存" → 重新进入名称已更新

---

## 执行顺序

1. F-1 + F-2（NetworkSettingsView 小修，一起改）
2. F-5（MarkdownRenderer 表格修复）
3. F-6（TokenUsageBar 估算改进）
4. F-7（Agent 名称保存修复）
5. F-3（SettingsView 导航修复）
6. F-4（daemon 文件服务 + App 下载打开）
7. 验证：xcodebuild build + test + npm run verify

## 验证命令

```bash
# Swift
cd /Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot
xcodebuild -project MyPilot.xcodeproj -scheme MyPilot -configuration Debug -destination 'platform=macOS' -skipMacroValidation build

# daemon
cd /Users/liaoxing/Downloads/未命名文件夹/mypilot-link && npm run verify
```
