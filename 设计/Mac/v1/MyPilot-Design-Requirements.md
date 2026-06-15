# MyPilot 设计需求文档

> 从现有代码反向推导，版本 v1.0.0 · 2026-06-13

---

## 一、产品概述

### 1.1 产品定位
MyPilot 是一款 macOS 原生 AI 助手客户端，通过 WebSocket 连接私有化部署的 OpenClaw Gateway，实现多 Agent 对话、文件传输、定时任务、用量监控等能力。核心卖点：**数据完全私有**。

### 1.2 目标用户
- 需要私有化部署 AI 助手的企业/个人
- 使用 OpenClaw Gateway 的开发者
- 需要多 Agent 管理和协作的用户

### 1.3 平台
- macOS 14+ (Sonoma)，SwiftUI 原生应用
- 支持深色/浅色模式切换

---

## 二、信息架构

### 2.1 整体结构
```
NavigationSplitView
├── Sidebar（侧边栏）
│   ├── 实例列表
│   ├── Agent 列表（含头像、名称、在线状态）
│   ├── 快捷操作（新建对话、搜索）
│   └── 底部设置入口
│
└── Detail（主内容区）
    ├── WelcomeView（无实例时的引导页）
    └── ChatView（对话主界面）
        ├── ChatHeaderSection（标题栏 + Token 用量条）
        ├── ChatMessageSection（消息列表）
        └── ChatInputSection（输入栏）
```

### 2.2 页面清单

| 页面 | 入口 | 类型 |
|------|------|------|
| WelcomeView | 无实例时默认展示 | 引导页 |
| ChatView | 点击侧边栏实例 | 主页面 |
| SettingsView | 侧边栏底部 | NavigationLink |
| AgentsManagementView | 设置 → Agent 管理 | NavigationLink |
| AgentDetailView | Agent 列表项点击 | NavigationLink |
| NetworkSettingsView | 设置 → 网络设置 | NavigationLink |
| DiagnosticsCenterView | 网络设置 → 诊断 | NavigationLink |
| ScheduledTasksView | 设置 → 定时任务 | NavigationLink |
| UsageStatsView | 设置 → 用量统计 | NavigationLink |
| AdvancedSettingsView | 设置 → 高级 | NavigationLink |
| AboutView | 菜单栏 → 关于 | Sheet |
| AddInstanceView | 欢迎页/侧边栏 | Sheet |
| ModelPickerView | 聊天头部模型按钮 | Popover |
| CommandPickerView | 输入框输入 `/` | Popover |
| SearchPanelView | 侧边栏搜索 | Overlay |
| ImagePreviewView | 点击图片附件 | Sheet |
| QRScannerView | 添加实例 | Sheet |

---

## 三、设计系统

### 3.1 色彩体系

**主色板（自然色系）**

| 色阶 | Light | Dark | 用途 |
|------|-------|------|------|
| ink50 | #FAFBF7 | #1C1F14 | 页面背景 |
| ink100 | #F2F4EC | #2E3322 | 卡片/表面 |
| ink200 | #D4D9C8 | #424A30 | 进度条底色 |
| ink300 | #A8B092 | #5A6342 | 次要文字 |
| ink400 | #7C8760 | #7C8760 | 辅助文字 |
| ink500 | #5A6342 | #A8B092 | — |
| ink600 | #424A30 | #D4D9C8 | — |
| ink700 | #2E3322 | #F2F4EC | — |
| ink800 | #1C1F14 | #FAFBF7 | — |

**强调色**

| 名称 | Light | Dark | 用途 |
|------|-------|------|------|
| amber300 | #F6AD02 | #F6C842 | 警告、品牌强调 |
| lime300 | #ACCE22 | #C4E040 | 辅助强调 |
| leaf300 | #0DA945 | #30D060 | 成功、主操作 |

**功能色**

| 名称 | Light | Dark | 用途 |
|------|-------|------|------|
| success | #0DA945 | #30D060 | 成功状态 |
| danger | #DC2626 | #F87171 | 错误/危险 |
| warning | #F6AD02 | #F6C842 | 警告 |
| info | #2563EB | #60A5FA | 信息/链接 |

**iMessage 风格气泡色**

| 名称 | Light | Dark | 用途 |
|------|-------|------|------|
| userBubbleBg | #007AFF | #0A84FF | 用户消息气泡 |
| userBubbleText | #FFFFFF | #FFFFFF | 用户消息文字 |
| aiBubbleBg | #E9E9EB | #2C2C2E | AI 消息气泡 |
| aiBubbleText | #000000 | #FFFFFF | AI 消息文字 |

**语义表面色**

| 名称 | Light | Dark | 用途 |
|------|-------|------|------|
| pageBackground | #FFFFFF | #0D0F09 | 页面背景 |
| surfaceCard | #FFFFFF | #1C1F14 | 卡片表面 |
| elevatedSurface | #F5F5F7 | #2E3322 | 提升表面 |
| separatorLine | #E5E5EA | #2E3322 | 分割线 |
| codeBlockBg | #1C1F14 | #2E3322 | 代码块背景 |

**渠道/Provider 色彩**（飞书 #3370FF、企微 #2AAE67、钉钉 #0089FF、QQ #12B7F5、Telegram #0088CC、Slack #611F69、Discord #5865F2）

### 3.2 字体体系

| Token | 定义 | 用途 |
|-------|------|------|
| heroNumber | 40pt semibold monospacedDigit | 大数字展示 |
| pageTitle | 24pt semibold | 页面标题 |
| sectionTitle | 16pt semibold | 区块标题 |
| listTitle | 15pt medium | 列表项标题 |
| body | 15pt regular | 消息正文、正文 |
| caption | 12pt regular | 辅助说明 |
| badge | 11pt semibold | 标签/徽章 |
| data | 11pt regular | 数据展示（token 统计） |
| captionMono | system caption monospaced | 代码/等宽 |
| nano | 9pt regular | 极小文字（时间戳） |
| statusIcon | system caption | 状态图标 |
| actionIcon | 12pt medium | 操作按钮图标 |

### 3.3 间距体系

| Token | 值 | 用途 |
|-------|-----|------|
| xxs | 4pt | 紧凑间距 |
| xs | 8pt | 小间距 |
| sm | 12pt | 标准小间距 |
| md | 16pt | 标准间距 |
| lg | 20pt | 大间距 |
| xl | 24pt | 超大间距 |
| xxl | 32pt | 区块间距 |
| xxxl | 48pt | 页面级间距 |

### 3.4 圆角体系

| Token | 值 | 用途 |
|-------|-----|------|
| sm | 4pt | 小元素（标签） |
| md | 8pt | 中等元素（输入框） |
| lg | 12pt | 卡片 |
| xl | 16pt | 大卡片 |
| card | 16pt | 卡片容器 |
| xxl | 18pt | 消息气泡 |
| full | infinity | 圆形/胶囊 |

---

## 四、页面设计规格

### 4.1 WelcomeView（引导页）

**布局**：垂直居中，VStack spacing: 32

**元素**：
1. 天线图标 `antenna.radiowaves.left.and.right` — 64pt，amber300
2. "MyPilot" 标题 — pageTitle
3. "私有化 OpenClaw 客户端" 副标题 — caption，ink400
4. 三步引导 StepRow（圆形图标 + 标题 + 说明）
   - Step 1: 部署 OpenClaw — `server.rack`
   - Step 2: 安装 MyPilot Link — `terminal`
   - Step 3: 添加实例 — `plus.circle`
5. "添加实例" 按钮 — borderedProminent，leaf300，large
6. 底部版本号 — nano，ink300

**StepRow 组件**：HStack(spacing: 14)，36x36 圆形图标背景(amber300 15%透明度)

### 4.2 SidebarView（侧边栏）

**结构**：NavigationSplitView sidebar

**内容**：
- 实例列表（Agent 头像 + 名称 + 在线状态指示灯）
- 搜索入口
- 新建对话按钮
- 底部设置入口

**Agent 列表项**：
- AgentAvatarView（32pt 圆形头像）
- 名称（listTitle）
- 模型标签（ModelPill）
- 在线状态圆点（8pt，leaf300 / ink300）

### 4.3 ChatView（对话主界面）

**整体布局**：VStack，三段式

```
┌─────────────────────────────────┐
│ ChatHeaderSection               │  ← 固定顶部
├─────────────────────────────────┤
│                                 │
│ ChatMessageSection              │  ← 可滚动消息区
│ (ScrollView + LazyVStack)       │
│                                 │
├─────────────────────────────────┤
│ ChatInputSection                │  ← 固定底部
└─────────────────────────────────┘
```

### 4.4 ChatHeaderSection（标题栏）

**布局**：HStack

**元素**：
1. Agent 头像（AgentAvatarView）
2. Agent 名称 + 模型名
3. 连接状态指示
4. TokenUsageBar（进度条 + 统计数据）
5. 操作菜单（更多按钮）

**TokenUsageBar 规格**：
- 进度条高度 3pt，圆角 2pt
- 颜色：<30% leaf300，30-70% amber300，>70% danger
- 左侧：↓input ↑output ⚡cache_read
- 右侧：contextSize / contextLimit（如 "8.2k / 200k"）
- ≥75% 时显示黄色警告按钮，点击弹出操作面板

### 4.5 ChatMessageSection（消息列表）

**布局**：ScrollView + LazyVStack，分页渲染（100 条/页）

**消息类型**：
- 用户消息：右对齐，蓝色气泡
- AI 消息：左对齐，灰色气泡
- 系统消息：居中，无气泡
- 正在输入：左对齐，带动画指示器

**滚动行为**：新消息自动滚动到底部（withAnimation）

### 4.6 MessageBubble（消息气泡）

**用户气泡**：
- 背景：userBubbleBg (#007AFF)
- 文字：白色 15pt
- 圆角：18pt（左上、右上、左下），4pt（右下）— iMessage 风格尾巴
- 内边距：水平 12pt，垂直 8pt
- 失败状态：danger 15% 透明度背景 + danger 描边

**AI 气泡**：
- 背景：aiBubbleBg (#E9E9EB)
- 文字：黑色/白色 15pt
- 圆角：18pt（右上、左下、右下），4pt（左上）— iMessage 风格尾巴
- 描边：aiBubbleBorder 1pt
- 内容：MarkdownRenderer 渲染

**思考过程（ThinkingSection）**：
- 折叠/展开按钮（chevron + brain 图标 + "思考过程" badge）
- 展开区域：elevatedSurface 背景，最大高度 200pt
- 圆角 AppRadius.md (8pt)，1pt separatorLine 描边

**附件**：
- 图片：最大 240x240，圆角 8pt，支持点击预览/缩放/保存
- 文档：HStack 布局，44x44 彩色图标 + 文件名 + 类型标签 + 下载按钮
- 视频/音频：类似文档卡片

**交互**：
- 悬停显示时间戳（opacity 动画）
- 右键菜单：复制内容、复制思考内容、复制附件链接、重试、删除
- 文本选择启用

**消息状态图标**（用户消息）：
| 状态 | 图标 | 颜色 |
|------|------|------|
| sending | ProgressView | — |
| sent | checkmark | ink400 |
| queued | clock + "排队中" | amber300 |
| running | ProgressView + "处理中" | leaf300 |
| delivered | 双 checkmark | leaf300 |
| failed | exclamationmark.circle | danger |
| timedOut | clock.badge.exclamationmark + "超时" | amber300 |
| cancelled | xmark.circle + "已取消" | ink400 |
| lost | questionmark.circle + "丢失" | ink400 |

### 4.7 InputBarView（输入栏）

**布局**：VStack
- 附件预览条（AttachmentPreviewBar）
- 错误提示条
- 主输入区：HStack
  - 文本编辑器（自动增高，最大 120pt）
  - 发送按钮 / 停止按钮
  - 更多操作按钮（+）
  - 快捷设置按钮

**交互**：
- 输入 `/` 触发 CommandPickerView（Popover）
- Cmd+V 粘贴图片
- Enter 发送，Shift+Enter 换行
- 发送中禁用输入

**CommandPickerView**：
- 宽度 280pt
- 列表项：SF Symbol 图标 + 命令名 + 说明
- 底部：Esc 关闭 / Enter 选择
- 可用命令：help, compact, new, models, status, clear, agent, stop, model, search

### 4.8 SettingsView（设置页）

**布局**：NavigationStack + List（inset grouped 样式）

**分组**：
| 区块 | 项目 |
|------|------|
| 连接 | 网络设置、诊断中心 |
| Agent | Agent 管理 |
| 任务 | 定时任务 |
| 数据 | 用量统计 |
| 其他 | 高级设置 |

### 4.9 AgentsManagementView（Agent 管理）

**布局**：List + NavigationLink

**Agent 列表项**：
- AgentAvatarView（40pt）
- 名称 + 模型名
- 在线状态

**操作**：
- 新建 Agent（NavigationLink）
- 点击进入 AgentDetailView

### 4.10 AgentDetailView（Agent 详情）

**布局**：Form（inset grouped）

**区块**：
- 头像编辑行（AvatarPickerView）
- 名称（只读）
- 模型切换
- 文件管理（AgentFilesView）
- 删除 Agent（红色按钮，确认弹窗）

---

## 五、组件库

### 5.1 共享组件

| 组件 | 用途 | 视觉特征 |
|------|------|----------|
| AgentAvatarView | Agent 头像渲染 | 圆形，优先级：本地 > 远端 > 默认图标 |
| ModelPill | 模型名称标签 | 胶囊形状，带颜色标识 |
| CardContainer | 卡片容器 | 圆角 16pt，阴影 |
| CopyButton | 复制按钮 | 小图标按钮 |
| DetailTitleView | 详情页标题 | — |
| AvatarPickerView | 头像选择器 | NSOpenPanel |
| TokenUsageBar | Token 用量进度条 | 3pt 高度，三色渐变 |
| ErrorToast | 错误提示 | 顶部浮动条 |
| SearchPanelView | 搜索面板 | 侧边栏 overlay |

### 5.2 消息组件

| 组件 | 用途 |
|------|------|
| MessageBubble | 消息气泡（用户/AI） |
| ThinkingSection | 思考过程折叠区 |
| AttachmentGrid | 附件网格 |
| ImageAttachmentCard | 图片附件 |
| DocumentFileCard | 文档附件 |
| VideoAttachmentCard | 视频附件 |
| AudioAttachmentCard | 音频附件 |
| ImagePreviewView | 图片预览（缩放/拖拽/保存） |
| MarkdownRenderer | Markdown 渲染 |

---

## 六、动画与交互

### 6.1 现有动画

| 位置 | 动画类型 | 描述 |
|------|----------|------|
| 思考过程展开/折叠 | withAnimation(.easeInOut(duration: 0.25)) | 折叠/展开过渡 |
| 消息列表滚动 | withAnimation | 新消息自动滚底 |
| 消息渲染 | withAnimation | 内容出现过渡 |
| 输入中指示器 | .easeInOut(duration: 0.5).repeatForever(autoreverses: true) | 呼吸灯效果 |
| 侧边栏展开/收起 | .transition + .animation | 宽度变化 |
| 悬停时间戳 | opacity 隐式动画 | hover 显示/隐藏 |
| 模型刷新 | .linear(duration: 1).repeatForever | 旋转加载 |
| Agent 列表增删 | .transition + .animation | 列表项出现/消失 |
| 文件视图切换 | .transition + .animation | 视图切换过渡 |

### 6.2 缺失的动画（优化方向）

| 场景 | 建议动画 |
|------|----------|
| 消息气泡出现 | 从底部滑入 + 淡入，spring 弹性 |
| Agent 切换 | 交叉淡入淡出 |
| 侧边栏选中项 | 高亮背景滑动过渡 |
| Token 进度条变化 | 数值变化时平滑过渡 |
| 发送按钮状态切换 | 图标旋转/缩放变形 |
| 错误提示出现/消失 | 从顶部滑入/滑出 |
| 搜索面板展开 | 从左侧滑入 + 遮罩淡入 |
| 模型切换 | Popover 内容切换过渡 |
| 头像更新 | 交叉淡入淡出 |
| 窗口首次加载 | 整体淡入 |

---

## 七、交互规格

### 7.1 快捷键

| 快捷键 | 功能 |
|--------|------|
| Cmd+N | 新建对话 |
| Cmd+Shift+F | 搜索消息 |
| Cmd+Shift+D | 切换深色模式 |
| Cmd+V | 粘贴图片到输入框 |
| Enter | 发送消息 |
| Shift+Enter | 换行 |
| / | 打开命令选择器 |
| Esc | 关闭 Popover/搜索 |

### 7.2 右键菜单

**消息右键**：复制内容、复制思考内容、复制附件链接、重试（失败时）、删除

**图片右键**：另存为、复制链接

**文档右键**：在浏览器中打开、另存为、复制链接

### 7.3 拖拽

- 图片可拖拽到输入框
- 文件可拖拽到输入框

---

## 八、窗口规格

| 属性 | 值 |
|------|-----|
| 默认宽度 | 1100pt |
| 默认高度 | 700pt |
| 侧边栏宽度 | 系统默认（约 260pt） |
| 记住位置 | 是 |
| 记住大小 | 是 |
| 深色模式 | 支持，手动切换 |

---

## 九、无障碍

- 所有交互元素添加 accessibilityLabel
- 消息气泡标注"用户消息"/"AI 回复"
- 思考过程标注"思考过程，点击展开"
- 删除按钮标注"删除此消息"
- 文本选择启用

---

## 十、待优化项（P18 方向）

### 10.1 UI 设计优化

1. **消息气泡出现动画**：当前无入场动画，需添加 spring 弹性滑入
2. **Agent 切换过渡**：当前硬切换，需添加交叉淡入淡出
3. **侧边栏交互**：选中项缺少滑动高亮，hover 反馈不足
4. **输入栏**：发送/停止按钮切换缺少变形动画
5. **Token 进度条**：数值变化缺少平滑过渡
6. **错误提示**：ErrorToast 缺少入场/退场动画
7. **搜索面板**：展开缺少遮罩和滑入动画
8. **欢迎页**：StepRow 缺少入场动画（可考虑依次出现）
9. **头像更新**：缺少过渡动画
10. **窗口首次加载**：缺少整体淡入

### 10.2 动画效果增强

1. **微交互**：按钮点击缩放反馈、hover 放大
2. **列表动画**：Agent 列表增删使用 slide + fade
3. **状态转换**：连接/断开状态指示器动画
4. **数据可视化**：Token 用量条数值动画（数字滚动）
5. **页面转场**：设置页 NavigationLink 转场效果

### 10.3 视觉一致性

1. **圆角统一**：部分视图使用硬编码圆角，需统一使用 AppRadius
2. **间距统一**：部分视图使用硬编码间距，需统一使用 Spacing
3. **颜色统一**：部分视图使用系统色，需统一使用 AppColors
4. **字体统一**：部分视图使用硬编码字体，需统一使用 AppTypography
