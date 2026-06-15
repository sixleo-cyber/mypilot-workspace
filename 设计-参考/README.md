# MyPilot 设计文档索引

> 本目录为 MyPilot 设计系统文档的**快照**，与实际代码库（`/Users/liaoxing/Downloads/MyPilot/`）保持一致。可在另一个对话中直接引用以执行 UI 开发任务。

---

## 📁 目录结构

```
设计/
├── README.md                                  ← 本文件（索引）
├── PROMPT.md                                  ← 其他会话快速启用提示
│
├── 00-设计规范/                               ← 设计规范文档（设计师/PM 阅读）
│   ├── 00-MyPilot-Design-System.md            # 设计系统总览（色彩/字体/间距/圆角）
│   ├── 01-MyPilot-Complete-UI-Design-Spec.md  # 19 个页面的完整 UI 规范
│   └── 02-MyPilot-V10-Design-Spec.md          # V10 iMessage-style 风格规范
│
├── 01-开发参考/                               ← 开发者参考（写代码时查阅）
│   └── 00-MyPilot-SwiftUI-Components-Reference.md
│         # Design Tokens + 核心组件 + SwiftUI 模式 + 关键约束
│
├── 02-UI展示/                                 ← 可视化设计稿
│   └── 00-mypilot-complete-ui-showcase.html   # 19 个页面的最终 HTML 展示
│
├── 03-图标设计/                               ← 图标系统
│   ├── 00-MyPilot-Icon-Design-Spec.md         # 图标设计规范
│   ├── 01-MyPilot-Icon-Final-Spec.md          # 最终图标方案
│   ├── 02-MyPilot-Icon-Final.svg              # 最终 Logo SVG
│   ├── 03-MyPilot-SF-Symbols-Integration.md   # SF Symbols 集成说明
│   ├── 04-mypilot-icons-svg/                  # 63 个 mp.* 自定义 SVG（已回滚，仅作历史保留）
│   └── 05-output-sf-templates/                # SF Symbol templates（已回滚，仅作历史保留）
│
└── 04-历史版本/                               ← 历史版本（参考/对比，不用于开发）
    ├── 00-MyPilot-Design-Requirements.md      # 早期需求文档
    ├── HTML-v1.html ... HTML-v10.html         # 设计迭代历史（V1 → V10）
    ├── HTML-icons.html                        # 图标展示页
    ├── HTML-advanced-subscription.html        # 订阅占位页早期版
    ├── 参考/                                  # 第三方设计参考
    │   ├── HTML-Trae-参考.html
    │   └── matrix-media-参考.png
    ├── 图标设计历史/                          # 图标设计迭代
    │   ├── icon-v1.html / v2.html / v3.html
    │   ├── icon-geometry.html / icon-svg.html
    │   ├── icon-final.html
    │   ├── icon-参考.png
    │   └── icons-backup.zip
    └── .DS_Store
```

---

## 🎯 使用指南

### 我是设计师/PM
- 先看 `00-设计规范/00-MyPilot-Design-System.md` 了解整体设计语言
- 再看 `00-设计规范/01-MyPilot-Complete-UI-Design-Spec.md` 看具体页面规范
- 最后用 `02-UI展示/00-mypilot-complete-ui-showcase.html` 打开 HTML 预览所有页面

### 我是开发者（执行 UI 开发）
- **首先读 `PROMPT.md`** —— 一句话告诉其他会话怎么用本目录
- 再看 `01-开发参考/00-MyPilot-SwiftUI-Components-Reference.md` —— 包含 Design Tokens + 核心组件 + SwiftUI 模式
- 写代码时严格按照该文档的「关键约束」章节执行
- 需要看视觉稿？打开 `02-UI展示/00-mypilot-complete-ui-showcase.html`

### 我想对比设计迭代
- 看 `04-历史版本/HTML-v1.html` 到 `HTML-v10.html` 了解 V1 → V10 的设计演进
- 看 `04-历史版本/图标设计历史/` 了解图标从 v1 → final 的迭代

---

## 🔗 与实际代码的对应关系

| 设计文档 | 实际代码路径 |
|----------|-------------|
| `01-开发参考/00-...Components-Reference.md` → AppColors | `MyPilotApp/MyPilot/MyPilot/Core/DesignSystem/AppColors.swift` |
| 同上 → Spacing | `Core/DesignSystem/Spacing.swift` |
| 同上 → AppRadius | `Core/DesignSystem/AppRadius.swift` |
| 同上 → AppTypography | `Core/DesignSystem/AppTypography.swift` |
| 聊天主页 | `Views/ChatView.swift` + `Features/Chat/*` |
| 侧边栏 | `Views/SidebarView.swift` |
| 设置主页 | `Features/Settings/SettingsView.swift` |
| 智能体管理 | `Features/Settings/AgentsManagementView.swift` |
| 共享组件 | `SharedComponents/*.swift` |

---

## ⚠️ 重要约束

1. **不修改已部署素材** —— 图标 SVG 和 Asset Catalog 中的图标资源不允许修改
2. **使用 SF Symbols** —— 不要使用 `mp.*` 自定义图标（已回滚）
3. **使用现有 Design Tokens** —— 不要硬编码颜色/字体/间距
4. **macOS App** —— 不要使用 iOS-only API（如 `presentationDetents`）
5. **VStack 布局** —— 不要用 `HSplitView`/`NavigationSplitView`
6. **`@Observable` 宏** —— 状态管理使用项目统一方案

---

## 📅 文档版本

- **V10 iMessage-style** —— 当前设计基线（2026-06）
- **同步于项目记忆 P22** —— 自定义图标已回滚
- **同步于同步设计文档 Spec** —— `.trae/specs/sync-design-docs-to-codebase/`
