# MyPilot 设计资源

本目录包含 MyPilot 项目的完整设计资源，覆盖 **19 个核心页面** 的视觉规范和 SwiftUI 实现参考。

---

## 📄 文档索引

| 文档 | 用途 | 阅读顺序 |
|------|------|---------|
| **[MyPilot-Complete-UI-Design-Spec.md](./MyPilot-Complete-UI-Design-Spec.md)** | 设计规范（色彩、字体、间距、组件） | 1️⃣ 先读 |
| **[MyPilot-Complete-UI-SwiftUI-Components.md](./MyPilot-Complete-UI-SwiftUI-Components.md)** | SwiftUI 复制即用的代码参考 | 2️⃣ 实现时对照 |
| **[mypilot-complete-ui-showcase.html](./mypilot-complete-ui-showcase.html)** | 19 个页面的 HTML 视觉展示 | 3️⃣ 视觉对比 |

---

## 🎨 19 个核心页面

### 引导 & 配对（4 个）
- **A1** 主聊天页（含完整侧边栏、Token Bar、Input Bar）
- **A2** 欢迎页（无实例时）
- **A3** 添加实例 - Step 1（服务器地址）
- **A4** 添加实例 - Step 2（配对码）

### 设置（3 个）
- **B** 设置主页（Inset Grouped Form）
- **C** 网络设置
- **M** 高级设置

### 智能体（3 个）
- **D** Agents 管理
- **E** Agent 详情
- **L** Agent 文件（左右分栏）

### 任务与调度（3 个）
- **F** 定时任务列表
- **G** 任务编辑 Sheet
- **O** 新建任务 Sheet

### 数据与监控（2 个）
- **H** 运行统计（KPI + Token 进度条）
- **I** 诊断中心（性能 + 日志）

### 通信（2 个）
- **J** IM 渠道（3 列卡片网格）
- **K** 频道详情

### 订阅与状态（2 个）
- **N** 订阅页（用量 + 账单）
- **P** 空状态

---

## 🛠️ 设计系统

### 核心色板
| Token | 色值 | 用途 |
|-------|------|------|
| `userBubbleBg` | `#007AFF` | 用户气泡、主按钮、选中态 |
| `aiBubbleBg` | `#E5E5EA` | AI 气泡、卡片背景 |
| `leaf300` | `#0DA945` | 智能体主色、活跃状态 |
| `amber300` | `#F6AD02` | 强调、引导页 |
| `lime300` | `#ACCE22` | OpenClaw 实例标记 |
| `success` | `#34C759` | 成功状态 |
| `danger` | `#FF3B30` | 错误、删除 |
| `warning` | `#FF9500` | 警告 |

### 字号
| 用途 | 字号 | 字重 |
|------|------|------|
| 页面大标题 | 28 | semibold |
| Section 标题 | 17 | semibold |
| 主文字 | 13-15 | regular/semibold |
| 副文字 | 11 | regular |
| 占位符 | 10 | regular |

### 圆角
| 元素 | 圆角 |
|------|------|
| 聊天气泡 | 18（朝外角 4） |
| 输入框 | 18-20 |
| 卡片 | 10-12 |
| 图标块 | 6-7 |
| 按钮（圆） | 50% |

---

## 🚀 快速开始

### 查看 HTML 展示
```bash
# 1. 启动 HTTP 服务器
cd "/Users/liaoxing/Downloads/未命名文件夹/设计"
python3 -m http.server 8081

# 2. 浏览器访问
open http://localhost:8081/mypilot-complete-ui-showcase.html
```

### 在 SwiftUI 项目中实现

1. **复制 Design Tokens**：
   - `AppColors.swift` → 你的 `Core/DesignSystem/`
   - `Spacing.swift` / `AppRadius.swift` → 同上

2. **复制基础组件**：
   - `IconBlock` / `SettingsRow` / `SettingsGroup` / `StatusDot`
   - 见 `MyPilot-Complete-UI-SwiftUI-Components.md` §2

3. **按页面复制**：
   - 每个页面有独立章节，代码可直接粘贴使用
   - 调整数据源（VM / 状态管理）以匹配项目

---

## 📁 相关资源

### 图标
- 使用 Apple 内置 SF Symbols（`Image(systemName:)`），无需自定义图标
- 原自定义图标（`mp.*` 命名空间 / MPSymbol 枚举）已在 P22 阶段回滚
- 历史图标文件保留在 `图标设计/` 目录仅供参考

### 历史版本
- `MyPilot-V10-Design-Spec.md` — V10 iMessage 风格规范
- `mypilot-ui-showcase-v10.html` — V10 HTML 展示
- `mypilot-icon-final.html` — 图标方案 A
- `MyPilot-Icon-Final-Spec.md` — 图标规范

---

## 📝 维护说明

- 设计规范修改请同步更新 HTML 展示和 SwiftUI 组件
- 新增颜色请在 `AppColors` 中定义并填写 Soft 变体
- 新增页面请保持与现有视觉风格一致
- 实际项目代码以 `MyPilotApp/MyPilot/MyPilot/` 为准
