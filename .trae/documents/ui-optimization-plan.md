# MyPilot UI 优化计划 — 基于 Design System v4

## 概述

根据 [MyPilot-Design-System.md](file:///Users/liaoxing/Downloads/未命名文件夹/MyPilot-Design-System.md) 的设计规范，对现有 SwiftUI 项目进行全面 UI 优化。

### 优化范围
- 颜色系统：替换所有硬编码颜色为 Design Token
- 聊天气泡：实现非对称圆角 + 规范配色
- 输入框：改为药丸形全圆角
- 按钮：主按钮使用 leaf-300 色
- 组件微调：圆角、间距、字体匹配规范
- 深色模式：添加基础支持

---

## 修改计划

### 第1步：DesignSystem 层（基础设施）

**文件：`AppColors.swift`**

完全重写，定义设计规范中的所有颜色 Token：

| Token | 浅色 | 深色 | 用途 |
|-------|------|------|------|
| `ink50` | #FAFBF7 | #1C1F14 | 最浅背景 |
| `ink100` | #F2F4EC | #2E3322 | 页面背景 |
| `ink200` | #D4D9C8 | #424A30 | 边框 |
| `ink300` | #A8B092 | #5A6342 | 禁用/占位符 |
| `ink400` | #7C8760 | #7C8760 | 次要文字 |
| `ink600` | #424A30 | #D4D9C8 | 中等文字 |
| `ink800` | #1C1F14 | #FAFBF7 | 标题文字 |
| `ink900` | #0D0F09 | #F2F4EC | 最深文字 |
| `amber300` | #F6AD02 | #F6AD02 | 强调/高亮 |
| `lime300` | #ACCE22 | #ACCE22 | 实例标识 |
| `leaf300` | #0DA945 | #0DA945 | 主按钮/成功 |

语义色：
- `pageBackground` = ink100 (浅) / ink900 (深)
- `surfaceCard` = white (浅) / ink800 (深)
- `elevatedSurface` = ink50 (浅) / ink700 (深)
- `separatorLine` = #E8EBE0 (浅) / #2E3322 (深)
- `userBubbleBg` = ink900 (浅) / ink100 (深)
- `aiBubbleBg` = ink100 (浅) / ink800 (深)
- `aiBubbleBorder` = ink200 (浅) / ink700 (深)
- `codeBlockBg` = ink900 (浅) / ink700 (深)

实现方式：使用 SwiftUI `@Environment(\.colorScheme)` 在属性中切换，或使用 `Color("colorName")` Asset Catalog 方式。由于项目已有 Assets.xcassets，推荐使用后者。

**决定**：使用 View extension computed properties 方式，根据 `@Environment(\.colorScheme)` 动态返回颜色（最小依赖，无需修改 Assets.xcassets）。

**文件：`AppRadius.swift`**

更新圆角值：
- `sm`: 4px（标签、进度条）
- `md`: 8px（列表项、小卡片）
- `lg`: 12px（按钮、输入框）
- `xl`: 16px（大卡片）
- `xxl`: 18px（聊天气泡）
- `full`: CGFloat.infinity（药丸形）

**文件：`AppTypography.swift`**

更新字体规范，匹配设计文档中的字号/字重。

**文件：`Spacing.swift`**

已匹配设计规范（4, 8, 12, 16, 20, 24, 32, 48），无需修改。

---

### 第2步：聊天气泡（核心视觉改动）

**文件：`MessageBubbleView.swift`**

改动：
1. **用户气泡**：
   - 背景色改用 `AppColors.userBubbleBg`
   - 文字色改用 `.white`（浅色）/ `AppColors.ink900`（深色）
   - 圆角改为不对称：`.topLeft: 18, .topRight: 18, .bottomLeft: 18, .bottomRight: 4`
   - 添加 `.scaleIn` 入场动画

2. **AI 气泡**：
   - 背景色改用 `AppColors.aiBubbleBg`
   - 文字色改用 `AppColors.ink800`（浅色）/ `AppColors.ink100`（深色）
   - 添加边框：`AppColors.aiBubbleBorder` 1px
   - 圆角改为不对称：`.topLeft: 4, .topRight: 18, .bottomLeft: 18, .bottomRight: 18`
   - 添加 `.slideUp` 入场动画

**文件：`ChatMessageSection.swift`**

改动：
1. `StreamingIndicator` 中的背景色改用 `AppColors.aiBubbleBg`、边框改用 `AppColors.aiBubbleBorder`

---

### 第3步：输入区域

**文件：`InputBarView.swift`**

改动：
1. 输入框背景改用 `AppColors.elevatedSurface`
2. 输入框边框添加 `AppColors.ink200` 1px
3. 输入框圆角改为全圆 `cornerRadius: 9999`（药丸形）
4. 发送按钮颜色改用 `AppColors.leaf300`
5. 按钮禁用状态颜色改用 `AppColors.ink300`

---

### 第4步：Header 区域

**文件：`ChatHeaderSection.swift`**

改动：
1. `AgentHeaderView` 中 Agent 头像圆圈改用 `AppColors.amber300`（琥珀色）
2. 连接状态指示点改为 `AppColors.leaf300`（在线）/ `AppColors.amber300`（离线）
3. `TokenUsageBar` 进度条：
   - 轨道背景改用 `AppColors.ink200`
   - 填充色改用 `AppColors.leaf300`（正常）、`AppColors.amber300`（警告）

---

### 第5步：Markdown 渲染

**文件：`MarkdownRenderer.swift`**

改动：
1. `CodeBlockView` 背景色改用 `AppColors.codeBlockBg`，文字色改用 `AppColors.ink100`

---

### 第6步：侧边栏 + 欢迎页 + 设置页

**文件：`SidebarView.swift`**
- 搜索框背景颜色
- AgentRow 选中状态颜色
- ConversationRow 选中状态颜色

**文件：`WelcomeView.swift`**
- 图标颜色改用 `AppColors.amber300`
- 主按钮使用 `AppColors.leaf300`

**文件：`SettingsView.swift`**
- 状态指示点使用设计色

---

### 第7步：深色模式支持

**文件：`MyPilotApp.swift`**
- 注入 `ColorScheme` 环境（跟随系统）
- 添加 `@AppStorage("mypilot-dark-mode")` 支持

---

## 实施文件清单

| # | 文件 | 改动类型 |
|---|------|---------|
| 1 | `Core/DesignSystem/AppColors.swift` | 重写 — 添加完整 Design Token |
| 2 | `Core/DesignSystem/AppRadius.swift` | 更新 — 匹配设计规范 |
| 3 | `Core/DesignSystem/AppTypography.swift` | 更新 — 匹配设计规范 |
| 4 | `Features/Chat/MessageBubbleView.swift` | 重写 — 非对称圆角 + 设计色 |
| 5 | `Features/Chat/ChatMessageSection.swift` | 更新 — StreamingIndicator 颜色 |
| 6 | `Features/Chat/ChatHeaderSection.swift` | 更新 — Header 颜色 |
| 7 | `Features/Chat/MarkdownRenderer.swift` | 更新 — 代码块颜色 |
| 8 | `Views/InputBarView.swift` | 更新 — 药丸输入框 + leaf 发送按钮 |
| 9 | `Views/SidebarView.swift` | 更新 — 侧边栏颜色 |
| 10 | `Views/WelcomeView.swift` | 更新 — 欢迎页颜色 |
| 11 | `Features/Settings/SettingsView.swift` | 更新 — 设置页颜色 |
| 12 | `MyPilotApp.swift` | 更新 — 深色模式支持 |

## 验证
1. 构建成功 (`xcodebuild`)
2. 浅色模式下聊天气泡颜色正确（用户深色、AI浅色+边框）
3. 深色模式下聊天气泡颜色正确（用户浅色、AI深色+边框）
4. 输入框为全圆角药丸形
5. 发送按钮为叶绿色
6. Markdown 代码块有独立背景色
7. `###` 标题正确渲染为粗体
