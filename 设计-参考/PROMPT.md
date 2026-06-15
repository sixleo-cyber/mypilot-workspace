# PROMPT — 快速启用 MyPilot UI 开发

> 把这段话粘到新对话的开头即可：

```
我要基于 /Users/liaoxing/Downloads/未命名文件夹/设计/ 中的设计文档，开发 MyPilot macOS App 的 UI 组件。

请按以下顺序读取文档理解设计意图：
1. /Users/liaoxing/Downloads/未命名文件夹/设计/README.md（目录索引）
2. /Users/liaoxing/Downloads/未命名文件夹/设计/PROMPT.md（本文件）
3. /Users/liaoxing/Downloads/未命名文件夹/设计/01-开发参考/00-MyPilot-SwiftUI-Components-Reference.md
   （包含 Design Tokens、核心组件 SwiftUI 模式、关键约束）
4. /Users/liaoxing/Downloads/未命名文件夹/设计/00-设计规范/01-MyPilot-Complete-UI-Design-Spec.md
   （19 个页面的完整 UI 规范）
5. /Users/liaoxing/Downloads/未命名文件夹/设计/02-UI展示/00-mypilot-complete-ui-showcase.html
   （可视化预览，可直接浏览器打开）

实际代码路径：/Users/liaoxing/Downloads/MyPilot/MyPilotApp/MyPilot/MyPilot/
  - Design Token: Core/DesignSystem/{AppColors,Scaling,AppRadius,AppTypography}.swift
  - 视图: Views/{SidebarView,ChatView,AddInstanceView,WelcomeView}.swift
  - 功能: Features/Chat/*, Features/Settings/*
  - 共享: SharedComponents/*

核心约束（务必遵守）：
- 颜色用 AppColors.xxx（不要硬编码 hex）
- 间距用 Spacing.xxx
- 圆角用 AppRadius.xxx
- 字体用 AppTypography.xxx
- 状态管理用 @Observable 宏
- 用户/AI 气泡分别用 userBubbleBg / aiBubbleBg
- 消息气泡用 UnevenRoundedRectangle（18-18-18-4 或 18-4-18-18）
- 侧边栏宽 230px，ChatView 用 VStack 布局（不要用 HSplitView/NavigationSplitView）
- 用 Apple SF Symbols（不要用 mp.* 自定义图标）
- 不要使用 NSColor（macOS-only）
- 不要修改已部署的图标 SVG / Asset Catalog
```

---

## 任务模板

执行具体 UI 任务时，配合以下模板：

### 模板 A：新建一个完整页面

```
请基于设计文档实现 [页面名]：
1. 先读 00-MyPilot-Complete-UI-Design-Spec.md 中 [页面名] 的章节
2. 再读 02-UI展示/00-mypilot-complete-ui-showcase.html 中对应的 HTML 预览
3. 参照 00-MyPilot-SwiftUI-Components-Reference.md 中的组件模式
4. 实际代码放在 MyPilotApp/MyPilot/MyPilot/[目录]/[PageName].swift
5. 完成后给出文件路径列表
```

### 模板 B：实现一个共享组件

```
请实现 [组件名] 组件：
1. 设计参考：00-MyPilot-SwiftUI-Components-Reference.md 中 [组件名] 章节
2. 视觉参考：02-UI展示/00-mypilot-complete-ui-showcase.html
3. 实际代码：MyPilotApp/MyPilot/MyPilot/SharedComponents/[ComponentName].swift
4. 使用现有 Design Tokens（AppColors/Spacing/AppRadius/AppTypography）
```

### 模板 C：修改已有页面

```
请修改 [PageName]：
- 文件路径：MyPilotApp/MyPilot/MyPilot/[目录]/[PageName].swift
- 修改需求：[具体描述]
- 视觉参考：00-MyPilot-Complete-UI-Design-Spec.md 中 [页面名] 章节
- 设计 Token 严格使用 AppColors/Spacing/AppRadius/AppTypography
```

### 模板 D：校对设计文档与代码一致性

```
请校对 [文档名] 与实际代码的一致性：
- 校对文档：设计/00-设计规范/[文档名].md
- 校对代码：MyPilotApp/MyPilot/MyPilot/
- 关注点：
  * Design Token 名称是否一致（特别是 AppColors.separatorLine 不是 divider）
  * 布局结构（不要使用 HSplitView）
  * 图标使用（确认使用 SF Symbols）
  * 颜色值（颜色 token 名称是否与代码一致）
- 输出格式：列出所有不一致点 + 修改建议
```

---

## 一句话原则

> **设计文档看 `00-设计规范/` + `02-UI展示/`，开发参考看 `01-开发参考/`，代码约束看「关键约束」章节。**
