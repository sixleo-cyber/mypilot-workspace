# MyPilot 完整 UI 设计规范

> 基于实际项目代码 + Apple HIG + iMessage 视觉风格
> 覆盖 19 个核心页面 · 适用于 macOS SwiftUI App
> 版本：v1.0 · 2026-06-13

---

## 目录

1. [设计原则](#1-设计原则)
2. [色彩系统](#2-色彩系统)
3. [字体系统](#3-字体系统)
4. [间距与圆角](#4-间距与圆角)
5. [核心页面（聊天）](#5-核心页面聊天)
6. [引导 & 配对](#6-引导--配对)
7. [设置](#7-设置)
8. [智能体](#8-智能体)
9. [任务与调度](#9-任务与调度)
10. [数据与监控](#10-数据与监控)
11. [通信](#11-通信)
12. [订阅与状态](#12-订阅与状态)
13. [组件库](#13-组件库)
14. [动效系统](#14-动效系统)
15. [图标系统](#15-图标系统)

---

## 1. 设计原则

### 1.1 核心准则

| 原则 | 描述 |
|------|------|
| **极简** | 无多余装饰、无阴影、无渐变背景 |
| **清晰层级** | 靠间距和颜色区分层级，不靠边框和卡片 |
| **系统原生** | 使用系统字体、系统颜色、系统组件行为 |
| **柔和** | 大圆角、低对比度、自然过渡 |
| **可识别** | 智能体色块、状态指示、操作反馈一眼可辨 |

### 1.2 关键取舍

- **iOS Inset Grouped Form** 风格（圆角卡片、白色背景）
- **iMessage 聊天** 风格（蓝/灰气泡、圆角 18px、底角 4px）
- **macOS HIG** 原则（13pt 起步、SF Pro 字体、Trailing icon）
- **状态色** 使用 Apple 系统色（success / danger / warning / info）

---

## 2. 色彩系统

### 2.1 基础色（实际项目 `AppColors`）

实际项目使用 `Color(hex:darkHex:)` 构造器，自动适配浅色/深色模式：

```swift
enum AppColors {
    static let white = Color(hex: "#FFFFFF", darkHex: "#E8EBE0")
    static let black = Color(hex: "#000000", darkHex: "#1C1C1E")

    // V10 标准灰阶（自动适配深色模式）
    static let ink50  = Color(hex: "#FAFAFA", darkHex: "#1C1C1E")
    static let ink100 = Color(hex: "#F5F5F7", darkHex: "#2C2C2E")
    static let ink200 = Color(hex: "#E5E5EA", darkHex: "#3A3A3C")
    static let ink300 = Color(hex: "#D1D1D6", darkHex: "#48484A")
    static let ink400 = Color(hex: "#8E8E93", darkHex: "#8E8E93")
    static let ink500 = Color(hex: "#636366", darkHex: "#A8A8AD")
    static let ink600 = Color(hex: "#48484A", darkHex: "#C7C7CC")
    static let ink700 = Color(hex: "#3A3A3C", darkHex: "#D1D1D6")
    static let ink800 = Color(hex: "#1C1C1E", darkHex: "#E5E5EA")
    static let ink900 = Color(hex: "#1C1C1E", darkHex: "#F5F5F7")

    // 页面背景与表面
    static let pageBackground = Color(hex: "#FFFFFF", darkHex: "#000000")
    static let surfaceCard  = Color(hex: "#F5F5F7", darkHex: "#1C1C1E")
    static let elevatedSurface = Color(hex: "#F5F5F7", darkHex: "#1C1C1E")
    static let separatorLine = Color(hex: "#E5E5EA", darkHex: "#38383A")

    // 文字色
    static let primaryText   = Color(hex: "#000000", darkHex: "#FFFFFF")
    static let secondaryText = Color(hex: "#8E8E93", darkHex: "#8E8E93")
    static let tertiaryText  = Color(hex: "#C7C7CC", darkHex: "#48484A")

    // 聊天气泡
    static let aiBubbleBg    = Color(hex: "#E5E5EA", darkHex: "#2C2C2E")
    static let aiBubbleBorder = Color(hex: "#E5E5EA", darkHex: "#2C2C2E")
    static let aiBubbleText  = Color(hex: "#000000", darkHex: "#FFFFFF")
    static let userBubbleBg   = Color(hex: "#007AFF", darkHex: "#0A84FF")
    static let userBubbleText = Color(hex: "#FFFFFF", darkHex: "#FFFFFF")
}
```

### 2.2 状态色（自动适配深色模式）

| Token | 浅色 | 深色 | 用途 |
|-------|------|------|------|
| `success` | `#34C759` | `#30D158` | 成功状态、已连接、活跃标签 |
| `danger` | `#FF3B30` | `#FF453A` | 错误、断开、删除 |
| `warning` | `#FF9500` | `#FF9F0A` | 警告、延迟高、风险提示 |
| `info` | `#007AFF` | `#0A84FF` | 信息、链接、主操作（与 userBubble 同） |

### 2.3 品牌色（自动适配深色模式）

| Token | 浅色 | 深色 | 用途 |
|-------|------|------|------|
| `leaf300` | `#0DA945` | `#30D060` | 智能体主色、健康、活跃 |
| `amber300` | `#F6AD02` | `#F6C842` | 强调、提示、引导页 |
| `lime300` | `#ACCE22` | `#C4E040` | 实例标记、第三色 |
| `ink300` | `#D1D1D6` | `#48484A` | 弱化文字 |
| `ink400` | `#8E8E93` | `#8E8E93` | 次要文字 |

### 2.4 Soft 色（背景 tint）

```swift
static let accentSoft  = Color(hex: "#007AFF").opacity(0.1)
static let dangerSoft  = Color(hex: "#FF3B30").opacity(0.1)
static let successSoft = Color(hex: "#34C759").opacity(0.1)
static let warningSoft = Color(hex: "#FF9500").opacity(0.1)
```

> **使用规则**：图标块背景 = soft 色，图标颜色 = 对应主色。

### 2.5 渠道色（自动适配深色模式）

| 渠道 | 浅色 | 深色 |
|------|------|------|
| 飞书 | `#3370FF` | `#5B8FFF` |
| 企业微信 | `#2AAE67` | `#4DC98A` |
| 钉钉 | `#0089FF` | `#4DAFFF` |
| Telegram | `#0088CC` | `#4DB8E5` |
| Slack | `#611F69` | `#9B59B6` |
| Discord | `#5865F2` | `#7983F5` |

### 2.6 深色模式

实际项目通过 `Color(hex:darkHex:)` 构造器在 macOS 上根据 `NSAppearance` 自动切换，无需手动维护 `_dark` 变量：

```swift
extension Color {
    init(hex: String, darkHex: String? = nil) {
        // 根据当前 NSAppearance 自动返回 light/dark 颜色
    }
}
```

---

## 3. 字体系统

### 3.1 实际项目 `AppTypography`

```swift
extension AppTypography {
    static let pageTitle = Font.system(size: 28, weight: .semibold)
    static let sectionTitle = Font.system(size: 17, weight: .semibold)
    static let body = Font.system(size: 13, weight: .regular)
    static let caption = Font.system(size: 12, weight: .regular)
    static let nano = Font.system(size: 10, weight: .regular)
}
```

### 3.2 字号对照表

| 用途 | 字号 | 字重 | 对应 |
|------|------|------|------|
| 大标题（页面名） | 22-28 | semibold | `pageTitle` |
| 区块标题 | 17 | semibold | `sectionTitle` |
| 主文字 | 15 | semibold | header name |
| 正文 | 13 | regular | 消息、列表项 |
| 副文字 | 12 | regular | `caption` |
| 提示 | 11 | regular | 描述、时间戳 |
| 占位符 | 10 | regular | `nano` |

### 3.3 字体规则

- 系统默认：`-apple-system, SF Pro Text, SF Pro Display, PingFang SC`
- 避免使用 Inter / Roboto 等 Web 字体
- 数字用 `SF Mono` (如 token 计数、连接延迟)
- 避免字重 `thin` / `ultraLight` / `black`

---

## 4. 间距与圆角

### 4.1 间距

```swift
enum Spacing {
    static let xxs: CGFloat = 2
    static let xs: CGFloat = 4
    static let sm: CGFloat = 8
    static let md: CGFloat = 12
    static let lg: CGFloat = 16
    static let xl: CGFloat = 24
    static let xxl: CGFloat = 32
    static let xxxl: CGFloat = 48
}
```

| 元素 | 间距 |
|------|------|
| Section 标题与内容 | 8-12 |
| List 行内 padding | 10-12 |
| Form Group 边距 | 16 |
| Card 内 padding | 14-20 |
| 页面边距 | 16-20 |

### 4.2 圆角

```swift
enum AppRadius {
    static let sm: CGFloat = 8
    static let md: CGFloat = 10
    static let lg: CGFloat = 14
    static let xl: CGFloat = 16
    static let card: CGFloat = 14
    static let xxl: CGFloat = 18   // 聊天气泡
    static let full: CGFloat = .infinity // 圆形按钮
}
```

| 元素 | 圆角 |
|------|------|
| 输入框 | 18-20 |
| 聊天气泡 | 18（朝外角 4） |
| 卡片 | 10-12 |
| 按钮（圆） | 16-18 |
| 按钮（方） | 8-10 |
| 图标块 | 6-7 |
| 头像 | 50%（圆形） |

### 4.3 边框

- 优先使用 `Color.gray.opacity(0.2)` 极淡边框
- 极重要分割用 0.5px 边
- 极小元素边框圆角 6-8

---

## 5. 核心页面（聊天）

### 5.1 页面布局

```
┌─────────────────────────────────────────────────┐
│ [Avatar] Name ▼      [● 42ms 已连接]    [Export]│  Header
│         model ▼                                  │
├─────────────────────────────────────────────────┤
│ ▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░  32%          │  Token Bar
│ ↓1.2k  ↑486  $0.0042            64k/200k        │
├─────────────────────────────────────────────────┤
│ ⓘ You are MyPilot, an AI assistant...            │  System Prompt
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌─ iOS 端开发讨论 ─┐                             │
│  │ 帮我用 Swift 写一个 │  ← AI bubble (灰)        │
│  │ iOS 端的网络请求封装 │                          │
│  └──────────────┘ 14:23                          │
│              ┌──────────────┐                    │
│              │ 好的，下面是 │ ← User bubble (蓝) │
│              │ 一个基于...   │                    │
│              └──────────────┘ 14:24              │
│                                                  │
├─────────────────────────────────────────────────┤
│ [📎] [⋯] [输入框   发送]      [➤]               │  Input Bar
└─────────────────────────────────────────────────┘
```

### 5.2 Header 规范

| 元素 | 规格 |
|------|------|
| Padding | `12px 16px` |
| Avatar | 30×30 圆，软色背景 |
| Name | 15px / semibold / 黑色 + chevron 9×9 |
| Model | 11px / regular / 灰 + chevron |
| 连接状态 | 7px dot + 11px 延迟（SF Mono）+ "已连接" |
| Border | 0.5px `divider` 底 |

### 5.3 Token Usage Bar

```swift
// 4px 进度条 + 下方 11px 文字行
HStack {
    Text("↓1.2k").foregroundStyle(.blue)   // 输入
    Text("↑486").foregroundStyle(.green)   // 输出
    Text("$0.0042").foregroundStyle(.secondary)  // 成本
    Spacer()
    Text("64k / 200k").foregroundStyle(.secondary)
}
```

颜色规则：
- `0-74%`：使用 `leaf` 主色
- `75-89%`：使用 `amber` 警告色
- `90-100%`：使用 `danger` 错误色

### 5.4 消息气泡

```swift
// AI 气泡
.background(Color.aiBubbleBg)        // #E5E5EA
.foregroundStyle(.primary)            // 黑
.clipShape(
    UnevenRoundedRectangle(
        topLeadingRadius: 18,
        bottomLeadingRadius: 4,        // 朝外角
        bottomTrailingRadius: 18,
        topTrailingRadius: 18
    )
)

// User 气泡
.background(Color.userBubbleBg)       // #007AFF
.foregroundStyle(.white)
.clipShape(
    UnevenRoundedRectangle(
        topLeadingRadius: 18,
        bottomLeadingRadius: 18,
        bottomTrailingRadius: 4,       // 朝外角
        topTrailingRadius: 18
    )
)
```

| 属性 | 值 |
|------|---|
| Padding | 8px 13px |
| 字号 | 13px |
| 行高 | 1.45 |
| Max-width | 78% |
| 时间戳 | 10px / tertiary / 顶 padding 2 |

### 5.5 Input Bar

```
[📎 attach] [⋯ menu] [输入框            ] [➤ send]
   32×32       32×32    flex 1, 36-40h      32×32
   圆形         圆形     radius 20           圆形 accent
```

按钮规格：
- 圆按钮：32×32 / 圆形 / 背景 `surfaceCard` / 灰图标
- 发送按钮：背景 `userBubbleBg` (#007AFF) / 白图标
- 输入框：背景 `surfaceCard` / 无边框 / radius 20

### 5.6 侧边栏 Sidebar

```
┌─────────────────────────────┐
│ [🔍 搜索历史消息...]         │  ← Search
├─────────────────────────────┤
│ OPENCLAW 实例               │
│ ●  Mac Studio               │
│    127.0.0.1:52378          │
├─────────────────────────────┤
│ 智能体                       │
│ ●M MyPilot          ✓       │  ← 选中态
│    claude-sonnet-4.5        │
│ 💬 iOS 端开发讨论            │  ← 对话
│    帮我用 Swift 写...        │
│ ●C Coder                    │
│ 💬 Refactor AppState        │
├─────────────────────────────┤
│ [+ 添加实例]      [⚙ 设置] │  ← Bottom
└─────────────────────────────┘
```

| 元素 | 规格 |
|------|------|
| 宽度 | 230px |
| 背景 | `surfaceCard` |
| 右侧边 | 0.5px `divider` |
| Section 标题 | 10px / semibold / uppercase / 灰 / padding 4 8 |
| Row | 6-8 padding / 8 radius |
| Row 选中 | 背景 `userBubbleBg` / 白字 / ✓ |
| Agent 头像 | 24×24 / 圆 / soft 背景 |
| 对话行 | 12px / 💬 + 标题 + 末条预览 |
| 底部 | border-top + [+ 添加实例] (主色) + [⚙] (次按钮) |

---

## 6. 引导 & 配对

### 6.1 欢迎页（无实例）

**结构**：
1. **图标**：72×72 / 18 圆角 / `amber-soft` 背景 / `amber` 色 / antenna.radiowaves 图标
2. **标题**："MyPilot" / 22px / bold
3. **副标题**："私有化 OpenClaw 客户端" / 12px / 灰
4. **三步引导卡片**（圆角 10 / `surfaceCard` 背景）：
   ```
   ① 部署 OpenClaw         [icon]
      在服务器上安装 OpenClaw Gateway
   ② 安装 MyPilot Link
      npm i -g @mypilot/link && mypilot start
   ③ 添加实例
      输入服务器地址和配对码连接
   ```
5. **添加实例按钮**：`userBubbleBg` 背景 / 圆角 10 / 14px 文字 / + 图标
6. **页脚**："v1.0.0 · 数据完全私有" / 11px / 极淡灰

### 6.2 添加实例 Step 1（服务器地址）

```
[server icon - 56×56, blue soft]
输入服务器地址                    ← 18px / semibold / 居中

[http://127.0.0.1:52378]          ← input / 13px / mono

ℹ MyPilot 通过本地 daemon 连接 OpenClaw Gateway
1. 在服务器上安装 mypilot-link: npm install -g @mypilot/link
2. 启动 daemon: mypilot start
3. 输入 daemon 地址（默认端口 52378）
4. 在下一步输入终端显示的配对码完成配对
                                  ↑ 提示卡片 surfaceCard 背景

[取消]                [继续]      ← 底部双按钮
```

### 6.3 添加实例 Step 2（配对码）

```
[key icon - 56×56, blue soft]
输入配对码
在服务器终端执行 mypilot pair 获取配对码，或扫描二维码

[MQ4F-N8L2-9A7B] [📷 scan]      ← 单行 + 扫描按钮

[Mac Studio]                    ← 实例名

─────────────
或使用此服务器生成的配对码：

[QR code]                        ← 二维码
MQ4F-N8L2-9A7B                  ← 配对码 mono
─────────────

[返回]                [配对并连接]
```

---

## 7. 设置

### 7.1 设置主页（Inset Grouped Form）

```
设置
┌─ 通用 ────────────────────────┐
│ [⚙ 蓝]  外观              › │
│         主题、字体、显示       │
│ [💬 绿]  语言              › │
│         界面语言与时区         │
└───────────────────────────────┘
┌─ 网络 ────────────────────────┐
│ [📡 蓝]  连接设置          › │
│         服务器地址与端口       │
└───────────────────────────────┘
┌─ Agents ──────────────────────┐
│ [🤖 绿]  管理 Agents       › │
│         智能体与协作关系       │
└───────────────────────────────┘
┌─ 高级 ────────────────────────┐
│ [⚙ 灰]  高级设置          › │
│         日志、诊断、实验功能   │
└───────────────────────────────┘
```

| 元素 | 规格 |
|------|------|
| Group 边距 | 0 16px |
| Group 圆角 | 10 |
| Group 边框 | 0.5px `divider` |
| Group 之间 | 22px 间距 |
| Group 标题 | 12px / semibold / uppercase / 灰 / padding 24 20 8 |
| Row | padding 10 14 / 12px 分割线 |
| Icon Block | 28×28 / 圆角 7 / soft 背景 |
| Title | 13px / regular |
| Subtitle | 11px / secondary |

### 7.2 网络设置

```
网络
[Status Card:  ● 已连接  http://127.0.0.1:52378]   ← 绿色 soft 背景

连接
├── 服务器地址    http://127.0.0.1:52378
├── 端口          52378
└── API 路径      /api/info

安全
├── Token         ************
└── 配对码        ************

[测试连接]    [重置]
```

### 7.3 高级设置

```
高级
日志
├── 调试日志      [Toggle 关闭]
├── 日志保留      7 天
└── 导出日志

性能
├── 并发请求      4
├── 请求超时      30s
└── 重试次数      3

实验功能
├── 上下文压缩    [Toggle 开启]
├── 流式响应      [Toggle 开启]
└── 本地缓存      [Toggle 开启]
```

---

## 8. 智能体

### 8.1 Agents 管理

```
Agents 管理

搜索

Agent 列表
┌─────────────────────────────────────┐
│ ●  MyPilot        [活跃 绿色]    ⋯ │
│    claude-sonnet-4.5                 │
│    32 个对话                         │
├─────────────────────────────────────┤
│ ●  Coder         [活跃]            ⋯ │
│    claude-sonnet-4.5                 │
│    18 个对话                         │
├─────────────────────────────────────┤
│ ●  Researcher    [活跃]            ⋯ │
│    gemini-2.5-pro                    │
│    24 个对话                         │
└─────────────────────────────────────┘

[+ 创建 Agent]
```

Agent Row 元素：
- 头像 32×32 / 圆 / soft 背景 / 字母
- Name 13px / regular
- 模型 11px / 灰
- 对话数 11px / 灰
- 活跃标签 soft 绿色 + 边框
- ⋯ 菜单（编辑/删除）

### 8.2 Agent 详情

```
[×]  MyPilot              [编辑]

[Avatar 56]
MyPilot
claude-sonnet-4.5

基本信息
├── 名称        MyPilot
├── 模型        claude-sonnet-4.5
├── 工作区      /Users/.../mypilot
├── 创建时间    2026-05-01
└── 状态        活跃

操作
├── [重命名]
├── [更换头像]
├── [同步远端文件]
└── [删除 Agent]   ← 红色

Agent 文件
├── IDENTITY.md
├── SOUL.md
├── AGENTS.md
├── USER.md
├── TOOLS.md
├── HEARTBEAT.md
└── MEMORY.md
```

### 8.3 Agent 文件

```
[← 返回]   Agent 文件 — MyPilot

[SOUL.md]   IDENTITY.md
[IDENTITY.md]  USER.md
[AGENTS.md]   TOOLS.md
[USER.md]    HEARTBEAT.md
[TOOLS.md]   MEMORY.md
[HEARTBEAT.md]
[MEMORY.md]

┌─────────────────────────────────────┐
│ SOUL.md                              │
│ ─────────────────────────────────── │
│ # MyPilot Soul                       │
│                                      │
│ You are MyPilot, an AI assistant...  │
│ ...                                  │
└─────────────────────────────────────┘
```

---

## 9. 任务与调度

### 9.1 定时任务列表

```
[←]  定时任务             [+] 

[筛选: 全部 | 启用 | 禁用]

┌─────────────────────────────────────┐
│ ☑ 每日简报                    [⋮]  │
│ 每天 9:00 · claude-sonnet-4.5      │
│ 推送每日 AI 行业新闻摘要             │
├─────────────────────────────────────┤
│ ☑ 每周代码审查               [⋮]  │
│ 每周一 10:00 · coder               │
│ 审查本周代码变更                     │
├─────────────────────────────────────┤
│ ☐ 备份 MEMORY.md              [⋮]  │
│ 每天 23:00 · 自动                   │
│ 备份到云端                           │
└─────────────────────────────────────┘
```

任务卡规格：
- 背景 `surfaceCard` 圆角 10
- 启用图标 18×18 / 蓝
- 名称 14px / 500
- Cron 表达式 11px / 蓝色 soft
- 描述 11px / 灰

### 9.2 任务编辑 Sheet

```
[取消]  编辑任务          [保存]

任务名称
[每日简报]

Agent
[MyPilot ▼]

触发方式
[每天] [每周] [每月] [Cron]

时间
[09:00]

执行指令
[推送每日 AI 行业新闻摘要]

启用  [Toggle 开]
```

### 9.3 新建任务 Sheet

同任务编辑，但标题改为"新建任务"，Agent/指令为空。

---

## 10. 数据与监控

### 10.1 运行统计

```
运行统计

[今日]  [本周]  [本月]  [全部]

┌──────────┬──────────┐
│   1,247  │  2,486   │
│   对话   │  消息    │
├──────────┼──────────┤
│  $12.84  │   85%    │
│   成本   │  成功率  │
└──────────┴──────────┘

Token 使用
[Anthropic  ▓▓▓▓▓▓▓░░░░░░  68%]
[OpenAI     ▓▓▓▓░░░░░░░░░  42%]
[Gemini     ▓▓░░░░░░░░░░░  18%]

按 Agent
[MyPilot    ▓▓▓▓▓▓▓▓░░░░  78%]
[Coder      ▓▓▓░░░░░░░░░  32%]
[Researcher ▓░░░░░░░░░░░░  12%]
```

### 10.2 诊断中心

```
诊断中心

[运行诊断]  [导出报告]

网关连接
[● 正常]   http://118.145.240.41:52378  [重连]

性能指标
┌──────┬──────┐
│ 12ms │ 8.2  │  ← 延迟 / RPS
│ 延迟  │ QPS  │
├──────┼──────┤
│ 0.3% │ 99%  │  ← 错误率 / 成功率
│ 错误  │ 成功  │
└──────┴──────┘

最近日志
12:34  info   WebSocket 连接建立
12:33  warn   消息发送超时，重试中
12:32  info   Agent 列表更新（+1）
12:30  info   会话上下文压缩完成
```

---

## 11. 通信

### 11.1 IM 渠道

```
IM 通信渠道

[+ 添加渠道]

[飞书]        [企业微信]    [钉钉]
已连接         未配置         未配置
12 人在线      --            --

[Telegram]    [Slack]       [Discord]
未配置         未配置         未配置
```

渠道卡规格：
- 64×64 圆角 12 图标（品牌色）
- 名称 14px / 500
- 状态徽章 11px / 成功绿/警告黄/灰
- 在线人数 11px / 灰

### 11.2 频道详情

```
[←]  飞书                                [⋮]

[飞书 icon 64]
飞书 飞书企业版
● 已连接  12 人在线

配置
├── App ID      cli_xxx
├── App Secret  ************
├── 机器人      MyPilot Bot
└── Webhook     https://open.feishu.cn/...

权限
├── 接收消息    [开]
├── 发送消息    [开]
├── @提及响应   [关]
└── 私聊支持    [开]

最近消息
12:34  张三   你好
12:33  Bot    你好！我是 MyPilot
12:30  李四   帮我查一下...

[测试发送]  [断开]
```

---

## 12. 订阅与状态

### 12.1 订阅页

```
订阅

当前计划
[Pro 月付]                 [管理订阅]
$19/月
下次扣费 2026-07-13

用量
├── 对话    1,247 / 5,000  ▓▓░░░
├── Token   2.1M / 10M     ▓░░░░
├── Agent   3 / 10         ▓░░░░
└── 渠道    1 / 5          ▓░░░░

账单历史
2026-06-13  Pro 月付     $19.00
2026-05-13  Pro 月付     $19.00
2026-04-13  Pro 月付     $19.00

[升级到团队版]  [取消订阅]
```

### 12.2 空状态

```
[icon - 64×64, gray soft]

暂无对话
选择左侧智能体开始对话
或创建新会话

[+ 新建对话]
```

---

## 13. 组件库

### 13.1 SettingsRow

```swift
struct SettingsRow: View {
    let icon: String
    let color: Color
    let title: String
    let subtitle: String?

    var body: some View {
        HStack(spacing: 12) {
            iconBlock
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.system(size: 13))
                if let subtitle {
                    Text(subtitle).font(.system(size: 11)).foregroundStyle(.secondary)
                }
            }
            Spacer()
            Image(systemName: "chevron.right")
                .font(.system(size: 12))
                .foregroundStyle(.tertiary)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 11)
    }

    private var iconBlock: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 7)
                .fill(color.opacity(0.10))
            Image(systemName: icon)
                .font(.system(size: 14))
                .foregroundStyle(color)
        }
        .frame(width: 28, height: 28)
    }
}
```

### 13.2 IconBlock

```swift
struct IconBlock: View {
    let icon: String
    let color: Color
    var size: CGFloat = 28

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: size * 0.25)
                .fill(color.opacity(0.10))
            Image(systemName: icon)
                .font(.system(size: size * 0.5, weight: .medium))
                .foregroundStyle(color)
        }
        .frame(width: size, height: size)
    }
}
```

### 13.3 StatusDot

```swift
struct StatusDot: View {
    let status: Status
    @State private var isPulsing = false

    enum Status { case success, warning, danger, idle }

    var color: Color {
        switch status {
        case .success: return .green
        case .warning: return .orange
        case .danger: return .red
        case .idle: return .gray
        }
    }

    var body: some View {
        Circle()
            .fill(color)
            .frame(width: 8, height: 8)
            .overlay(
                Circle()
                    .stroke(color.opacity(0.3), lineWidth: 4)
                    .scaleEffect(isPulsing ? 1.5 : 1)
                    .opacity(isPulsing ? 0 : 1)
            )
            .onAppear {
                withAnimation(.easeOut(duration: 1.5).repeatForever(autoreverses: false)) {
                    isPulsing = true
                }
            }
    }
}
```

### 13.4 TokenProgressBar

```swift
struct TokenProgressBar: View {
    let percentage: Double   // 0-100
    let inputTokens: Int
    let outputTokens: Int
    let cost: Double
    let contextSize: Int
    let contextLimit: Int

    var color: Color {
        if percentage >= 90 { return .red }
        if percentage >= 75 { return .orange }
        return .green
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 2)
                        .fill(Color.gray.opacity(0.15))
                    RoundedRectangle(cornerRadius: 2)
                        .fill(color)
                        .frame(width: geo.size.width * percentage / 100)
                        .animation(.easeInOut(duration: 0.6), value: percentage)
                }
            }
            .frame(height: 4)

            HStack(spacing: 8) {
                Text("↓\(inputTokens.formatted())").foregroundStyle(.blue)
                Text("↑\(outputTokens.formatted())").foregroundStyle(.green)
                Text(String(format: "$%.4f", cost)).foregroundStyle(.secondary)
                Spacer()
                Text("\(contextSize.formatted()) / \(contextLimit.formatted())")
                    .foregroundStyle(.secondary)
            }
            .font(.system(size: 11, design: .monospaced))
        }
    }
}
```

### 13.5 ChatBubble

```swift
struct ChatBubble: View {
    let message: Message

    var body: some View {
        HStack {
            if message.role == .user { Spacer(minLength: 60) }
            VStack(alignment: message.role == .user ? .trailing : .leading, spacing: 2) {
                Text(message.content)
                    .font(.system(size: 13))
                    .padding(.horizontal, 13)
                    .padding(.vertical, 8)
                    .foregroundStyle(message.role == .user ? .white : .primary)
                    .background(
                        message.role == .user
                            ? Color.userBubbleBg
                            : Color.aiBubbleBg
                    )
                    .clipShape(
                        UnevenRoundedRectangle(
                            topLeadingRadius: 18,
                            bottomLeadingRadius: message.role == .user ? 18 : 4,
                            bottomTrailingRadius: message.role == .user ? 4 : 18,
                            topTrailingRadius: 18
                        )
                    )

                Text(message.timestamp.formatted(date: .omitted, time: .shortened))
                    .font(.system(size: 10))
                    .foregroundStyle(.tertiary)
            }
            if message.role == .assistant { Spacer(minLength: 60) }
        }
    }
}
```

---

## 14. 动效系统

### 14.1 动画曲线

| 场景 | 曲线 | 时长 |
|------|------|------|
| 气泡出现 | `spring(response: 0.3, dampingFraction: 0.85)` | 300ms |
| Tab 切换 | `easeInOut` | 200ms |
| Sheet 弹出 | `spring(response: 0.4, dampingFraction: 0.85)` | 400ms |
| 按钮反馈 | `easeInOut` | 150ms |
| 进度条 | `easeInOut` | 600ms |
| 警告滑入 | `spring(response: 0.45, dampingFraction: 0.78)` | 450ms |
| 侧边栏选中 | `easeInOut` | 200ms |

### 14.2 微动效

| 元素 | 动效 |
|------|------|
| 发送按钮 | 缩放 0.95 → 1.0 (spring) |
| 选中态切换 | ✓ 缩放 0.5 → 1.0 + 淡入 |
| 状态指示灯 | 脉冲呼吸 1.5s 循环 |
| 上下文压缩 | 进度条平滑过渡 0.6s |
| 消息发送失败 | 抖动 + 红色描边 |
| 文件上传 | 进度环 + 完成 ✓ |
| 主题切换 | 全局淡入淡出 0.3s |

### 14.3 转场

- **页面切换**：左侧滑入
- **Sheet**：底部上滑
- **Popover**：缩放 + 淡入
- **Sidebar 选中**：背景渐变 + ✓ 缩放

---

## 15. 图标系统

### 15.1 系统图标（SF Symbols）

| Token | 用途 |
|-------|------|
| `magnifyingglass` | 搜索 |
| `plus.circle.fill` | 添加 |
| `gearshape` | 设置 |
| `trash` | 删除 |
| `pencil` | 编辑 |
| `checkmark` | 完成 |
| `chevron.right` | 进入 |
| `chevron.down` | 展开 |
| `bubble.left` | 对话 |
| `antenna.radiowaves.left.and.right` | 信号/连接 |
| `server.rack` | 服务器 |
| `key.fill` | 钥匙/配对 |
| `qrcode.viewfinder` | 二维码扫描 |
| `network` | 网络 |
| `arrow.down.circle.fill` | 输入 |
| `arrow.up.circle.fill` | 输出 |
| `bolt.fill` | 缓存 |

### 15.2 自定义图标（已回滚）

> **注意**：P22 阶段已回滚所有 `mp.*` 自定义图标，统一使用 Apple 内置 SF Symbols。原 60 个 SVG 图标文件和 `MPSymbol` 枚举已从项目中移除。详见项目记忆 P22。

### 15.3 macOS 集成

直接使用 `Image(systemName:)` 引用 SF Symbols，无需额外集成步骤。

---

## 16. 补充业务功能

### 16.1 上下文管理命令

| 命令 | 行为 | UI 反馈 |
|------|------|---------|
| `/compact` | 发送给 Gateway 触发 OpenClaw 内置摘要压缩 | daemon 返回 `compacted: true`，App 自动重置 token 计数器 |
| `/new` | 调用 `chat.reset` 并重置 token 计数器，完全清空上下文 | 消息列表清空，token 归零 |

命令通过 `CommandPickerView` 选择或直接在输入框输入 `/` 触发。

### 16.2 上下文偏高警告

TokenUsageBar 用量 ≥75% 时：
- 显示黄色警告图标 + "上下文偏高" 文字
- 点击弹出操作面板（Popover），提供两个选项：
  - **压缩上下文**：发送 `/compact` 命令
  - **新建会话**：发送 `/new` 命令
- 用量 ≥90% 时颜色变红

### 16.3 ErrorToast 错误提示

聊天页面顶部的滑入/滑出错误提示条：

```
┌─────────────────────────────────────────┐
│ ⚠ 连接已断开，正在尝试重连...           │
└─────────────────────────────────────────┘
```

- 位置：ChatView 顶部，ChatHeaderSection 下方
- 动画：从顶部滑入 + 淡入，3 秒后自动滑出 + 淡出
- 触发：`WebSocketService.showError` 设置 `lastError` 和 `showError`
- 样式：`AppColors.dangerSoft` 背景 + `AppColors.danger` 文字 + 圆角卡片

### 16.4 DisconnectedBanner 断连横幅

持续显示的断连状态横幅（非自动消失）：

```
┌─────────────────────────────────────────┐
│ 🔴 连接已断开 · 点击重连               │
└─────────────────────────────────────────┘
```

- 触发条件：WebSocket 连接断开
- 点击可触发手动重连
- 连接恢复后自动消失

### 16.5 MessageDeliveryStatus 消息发送状态

用户消息的时间戳旁显示发送状态图标：

| 状态 | 图标 | 颜色 |
|------|------|------|
| `sending` | 旋转 ProgressView | 系统蓝 |
| `sent` | `checkmark` | `tertiaryText` |
| `failed` | `exclamationmark.circle.fill` | `danger` |

### 16.6 AvatarService 头像本地存储

- 存储路径：`Documents/AgentAvatars/{agentId}.png`
- 图片规格：256×256 PNG 压缩
- 加载优先级：本地文件 > 远端 `avatarUrl` > 默认首字母图标
- 编辑方式：`AvatarPickerView`（NSOpenPanel 选择 + 删除）
- 创建时暂存：`CreateAvatarPicker` 使用 `pendingAvatarData`，创建成功后用实际 `agentId` 保存
- 通知机制：`.agentAvatarDidChange` 通知驱动 SidebarView 等视图刷新

### 16.7 Agent 状态指示

当 Agent 正在执行命令时，"正在输入..." 替换为具体命令标题：
- daemon 在 `agent` 事件中检测 `kind === "command"` + `phase === "start"` 时推送 `agent.status` frame
- App 收到后更新 `processingStatusText`，ChatMessageSection 显示为 `processingStatusText ?? "正在输入..."`

---

## 附录 A：所有页面索引

| 编号 | 页面 | 路径 | 类型 |
|------|------|------|------|
| A1 | 主聊天页 | Views/ChatView.swift | Window |
| A2 | 欢迎页 | Views/WelcomeView.swift | Window |
| A3 | 添加实例 Step 1 | Views/AddInstanceView.swift | Sheet |
| A4 | 添加实例 Step 2 | Views/AddInstanceView.swift | Sheet |
| B | 设置主页 | Features/Settings/SettingsView.swift | Window |
| C | 网络设置 | Features/Settings/NetworkSettingsView.swift | Window |
| D | Agents 管理 | Features/Settings/AgentsManagementView.swift | Window |
| E | Agent 详情 | Features/Settings/AgentDetailView.swift | Window |
| F | 定时任务 | Features/Settings/ScheduledTasksView.swift | Window |
| G | 任务编辑 | Features/Settings/ScheduledTasksView.swift | Sheet |
| H | 运行统计 | Features/Settings/UsageStatsView.swift | Window |
| I | 诊断中心 | Features/Settings/DiagnosticsCenterView.swift | Window |
| J | IM 渠道 | Features/Settings/IMChannelsView.swift | Window |
| K | 频道详情 | Features/Settings/IMChannelsView.swift | Window |
| L | Agent 文件 | Features/Settings/AgentFilesView.swift | Window |
| M | 高级设置 | Features/Settings/AdvancedSettingsView.swift | Window |
| N | 订阅页 | Features/Settings/SubscriptionView.swift | Window |
| O | 新建任务 | Features/Settings/ScheduledTasksView.swift | Sheet |
| P | 空状态 | Views/EmptyView.swift | Component |

---

## 附录 B：参考资源

- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines)
- [SF Symbols](https://developer.apple.com/sf-symbols/)
- [iMessage Design Patterns](https://developer.apple.com/messages/)
- 实际项目代码：`MyPilotApp/MyPilot/MyPilot/`
- 图标设计：`设计/图标设计/`
- HTML 展示：`设计/mypilot-complete-ui-showcase.html`
