# P22: 回滚自定义图标 — 恢复系统 SF Symbols

## 背景
P20/P21 自定义 SVG 图标方案失败：SVG 格式不被 Xcode 正确识别（symbolset 栅格化为 6x6，imageset 渲染成巨大图形撑乱布局）。用户反馈"icon 不对、排版乱了、功能布局全乱"。**全部回滚到 Apple 内置 SF Symbols。**

## 当前状态
- `mp.*.imageset` 目录**已删除**（Assets.xcassets 中无残留）
- `MPSymbol.swift` **仍存在**，包含 64 个 case 的 enum
- **5 个文件**共 **32 处**引用 `MPSymbol`：
  - `SidebarView.swift` — 3 处
  - `InputBarView.swift` — 4 处
  - `SettingsView.swift` — 22 处（11 对 Label + icon + labelStyle）+ 1 处 LabelStyle 定义
  - `ChatHeaderSection.swift` — 1 处
  - `ScheduledTasksView.swift` — 1 处
- `project.pbxproj` — 2 处（fileRef + buildFile）

## 执行步骤

### Step 1: 删除 MPSymbol.swift + 清理 pbxproj 引用
- 删除 `MyPilot/Core/DesignSystem/MPSymbol.swift`
- 从 `project.pbxproj` 移除 fileRef `EA7702844A2F4B1BA81913A0` 和 buildFile `D14FC36A75C94BA29C4B1767`

### Step 2: 回滚 SidebarView.swift（3 处）
| 行 | 当前 | 改为 |
|---|---|---|
| 50 | `MPSymbol.addFill.image` | `Image(systemName: "plus.circle.fill")` |
| 59 | `MPSymbol.settingsFill.image` | `Image(systemName: "gearshape.fill")` |
| 146 | `MPSymbol.search.image` | `Image(systemName: "magnifyingglass")` |

### Step 3: 回滚 InputBarView.swift（4 处）
| 行 | 当前 | 改为 |
|---|---|---|
| 87 | `MPSymbol.attach.image` | `Image(systemName: "paperclip")` |
| 107 | `MPSymbol.menu.image` | `Image(systemName: "ellipsis.circle")` |
| 288 | `MPSymbol.sendFill.image` | `Image(systemName: "arrow.up").contentTransition(.symbolEffect(.replace))` |
| 298 | `MPSymbol.stop.image` | `Image(systemName: "stop.fill").contentTransition(.symbolEffect(.replace))` |

> 注：发送/停止按钮恢复 `.contentTransition(.symbolEffect(.replace))` 动画（P20 原始实现）

### Step 4: 回滚 SettingsView.swift（11 处 Label + 1 处 LabelStyle）
Label 全部改为 `Label("标题", systemImage: "xxx")` 标准写法：

| 行 | 标题 | 当前 MPSymbol | 替换为 systemImage |
|---|---|---|---|
| 37-38 | 网络设置 | `.network` | `"network"` |
| 42-43 | Agent 文件 | `.files` | `"folder"` |
| 47-48 | IM 通信渠道 | `.channels` | `"bubble.left.and.bubble.right"` |
| 54-55 | Agents 管理 | `.agents` | `"person.2"` |
| 59-60 | 定时任务 | `.scheduled` | `"clock.badge"` |
| 64-65 | 文件浏览器 | `.filesFill` | `"folder.fill"` |
| 69-70 | 诊断中心 | `.diagnostics` | `"waveform.path.ecg"` |
| 76-77 | 高级设置 | `.advanced` | `"gearshape.2"` |
| 81-82 | 订阅管理 | `.settings` | `"creditcard"` |

`SettingsIconLabelStyle` 的 `icon` 参数类型从 `MPSymbol` 改回 `String`，内部用 `Image(systemName: icon)` 渲染。

### Step 5: 回滚 ChatHeaderSection.swift（1 处）
| 行 | 当前 | 改为 |
|---|---|---|
| 301 | `MPSymbol.warningFill.image` | `Image(systemName: "exclamationmark.triangle.fill")` |

### Step 6: 回滚 ScheduledTasksView.swift（1 处）
| 行 | 当前 | 改为 |
|---|---|---|
| 78 | `MPSymbol.scheduled.image` | `Image(systemName: "clock.badge")` |

### Step 7: 验证
```bash
cd /Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot
xcodebuild -project MyPilot.xcodeproj -scheme MyPilot -configuration Debug -destination 'platform=macOS' -skipMacroValidation build
```

## 不涉及修改的文件
以下文件在 P19 V10 设计规范中已正确使用系统 SF Symbols，无需改动：
- `AppColors.swift`, `AppTypography.swift`, `AppRadius.swift`, `Spacing.swift`
- `AboutView.swift`, `PlaceholderSettingsPages.swift`, `MessageBubbleView.swift`
- `WelcomeView.swift`, `AgentFilesView.swift`, `IMChannelsView.swift`, `CopyButton.swift`
- `DiagnosticsCenterView.swift`
