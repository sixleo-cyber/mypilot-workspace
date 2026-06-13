# 测试任务：用 frontend-design skill 给 ClawPilot 做 iPad Home Dashboard 优化

## 项目背景

ClawPilot 是一个 SwiftUI iPad/Mac 客户端 App，连接云端 OpenClaw Gateway。App 基本功能快做完了，现在进入 UI 优化阶段。

App 的参考风格：**工程师向、克制、精致、长期使用不疲劳**（对标 Parham-dev/OpenClaw-ios 的 SwiftUI 项目）。

## 本次任务

**只做一个页面**：iPad 版的 Home Dashboard（主页）。

### 必须包含的卡片（按这个顺序）

1. **系统健康卡**
   - 标题 + 副标题
   - 三个仪表盘：CPU、RAM、磁盘
   - 每个仪表盘：环形进度（绿色 < 60% / 黄色 60-85% / 红色 > 85%）
   - 仪表盘中心显示百分比数字

2. **Token 用量卡**
   - 顶部：今天消耗总量（大数字 + 趋势 ↑12%）
   - 比例条：Input 45% / Output 30% / Cache 15% / 其他 10%（4 段不同颜色）
   - 比例条下方 4 项图例，每项一个色块 + 标签 + 数字

3. **Cron 摘要卡**
   - 三个状态徽章并排：ENABLED (绿) / PAUSED (灰) / FAILED (红)
   - 每个徽章显示数量
   - 徽章下方一行 "View Details →"

4. **快捷命令网格**
   - 3 列 × 2 行 = 6 个按钮
   - 每个按钮：图标 + 名称
   - **按钮对应的中文名和必须使用的 SF Symbol**（严格按这个）：
     - 新建会话 → `plus.message` (or `square.and.pencil`)
     - 定时任务 → `clock` (or `timer`)
     - 用量统计 → `chart.bar` (or `chart.line.uptrend.xyaxis`)
     - 记忆浏览 → `brain.head.profile` (or `brain`)
     - 技能管理 → `wrench.and.screwdriver` (or `wrench.adjustable`)
     - 设置 → `gearshape` (or `gearshape.fill`)

### 不需要做的（明确排除）
- ❌ 不要做底部 Tab Bar（iOS 自动有）
- ❌ 不要做导航栏（聚焦 Dashboard 内容）
- ❌ 不要做聊天界面
- ❌ 不要做其他 Tab 页（Crons / Sessions / Memory / Settings）

## 视觉风格要求（硬性约束）

- **设计语言**：iOS 17+ SwiftUI 原生，遵循 Apple Human Interface Guidelines
- **布局**：2 列卡片网格（iPad 横屏），每张卡片宽约 380pt
- **间距**：卡片之间 16pt，卡片内边距 20pt
- **圆角**：所有卡片 16pt 圆角
- **配色**：白底卡片 + 浅灰背景 + iOS 系统色（blue/orange/green/red/gray）
- **字体**：完全使用 SF Pro 系统字体，标题用 .largeTitle 风格，数字用 .system(size: 36, weight: .bold, design: .rounded)
- **状态点**：8pt 圆点，不用图标
- **数字字体**：大数字必须有 .monospacedDigit() 修饰（避免数字宽度跳动）
- **图标系统**：**只用 SF Symbols**（`.image(systemName: "...")`）。**绝对不用 emoji**。按钮图标用 `.font(.system(size: 24, weight: .regular))`，颜色跟 iOS 系统色（蓝/灰）。

## 绝对禁止（硬性黑名单）

- ❌ 紫色/粉色/青色渐变背景
- ❌ 装饰性阴影（卡片最多用 1pt Y 偏移 + 0.05 opacity）
- ❌ 圆点 loading（不要做）
- ❌ 任何花哨动画（这个版本是静态展示页，不做 motion）
- ❌ 装饰性图标（图标必须传达含义）
- ❌ **任何 emoji 图标**（🎉 🚀 💖 🧠 🔥 ⚡ 等都不行 —— 用 SF Symbols）
- ❌ 大段说明文字（卡片标题最多 4 个字）
- ❌ Hero section / 营销话术 / "让你的 AI 助手..." 之类的空话

## 期望输出

请**只输出一段完整可编译的 SwiftUI 代码**：
- 一个 `HomeDashboardView.swift` 文件
- 内含子视图（每个卡片一个 View struct）
- 用 `ViewThatFits` 或简单的 `VStack/HStack` 布局
- 可以用 `Charts` 框架做环形进度（system framework，无需 import）

**代码要满足**：
- 单文件，不超过 250 行
- 可以直接复制到 Xcode 新建文件跑起来
- 不需要外部依赖（除非用系统框架）
- 加简短注释（每个 View struct 上方一行说明）

## 验收

我会把生成的代码贴到 Xcode 里跑模拟器看效果。**如果出来的东西**：
- 用了紫色渐变 → 不合格
- 卡片马赛克没有呼吸感 → 不合格
- 数字没有 monospaced → 不合格
- 配色花哨 → 不合格
- 看起来像营销页 → 不合格

合格的样子是：**像一个安静的、专业的工具**，打开就让人觉得"这是给我干活的 App"。
