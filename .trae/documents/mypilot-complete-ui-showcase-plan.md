# MyPilot 完整 UI 展示页面生成计划

## Summary

基于新归类的文件夹结构（开发/产品/设计/文档），生成一个完整的 HTML 文件，以 macOS 窗口模拟形式展示 MyPilot 所有页面的 UI 设计图。包含全部 30+ 个页面，使用统一的 V10 iMessage 风格设计系统，并嵌入所有 `mp.*` 自定义图标。

## Current State Analysis

### 已有资源
1. **V10 设计系统** (`MyPilot-V10-Design-Spec.md`):
   - 色彩: `#FFFFFF` bg, `#F5F5F7` bg2, `#007AFF` accent, `#E5E5EA` bdr
   - 字体: SF Pro, 13px body, 15px title
   - 圆角: 14px cards, 10px buttons, 20px bubbles
   - 布局: macOS NavigationSplitView 风格

2. **60 个 SVG 图标** (`mypilot-icons-svg/`):
   - 30 outline + 30 fill 变体
   - 命名空间 `mp.*`
   - 24×24 网格, 1.6pt stroke

3. **已有 HTML 展示文件**:
   - `mypilot-ui-showcase-v10.html` — 主聊天页
   - `mypilot-ui-showcase-pages-v10.html` — 12 个其他页面
   - `mypilot-advanced-subscription.html` — 高级设置 + 订阅
   - `mypilot-icon-final.html` — 图标展示

4. **SwiftUI 源代码** (确认所有页面功能):
   - SettingsView, NetworkSettingsView, AgentsManagementView
   - ScheduledTasksView, UsageStatsView, DiagnosticsCenterView
   - IMChannelsView, AgentFilesView, AdvancedSettingsView
   - ChatView, SidebarView, InputBarView 等

### 缺失
- 没有一个**统一的 HTML 文件**整合所有页面
- 部分页面（订阅、任务编辑 Sheet、Agent 详情、频道详情）尚未在展示中

## Proposed Changes

### 输出文件
`/Users/liaoxing/Downloads/未命名文件夹/mypilot-complete-ui-showcase.html`

### 文件结构

```
单文件 HTML，包含：
├── CSS 设计系统（V10 Token）
├── SVG Icon Sprite（内联所有 60 个 mp.* 图标）
├── 页面展示网格（2-3 列 macOS 窗口模拟）
│   ├── 主聊天页（完整对话界面）
│   ├── 设置主页
│   ├── 网络设置
│   ├── Agents 管理
│   ├── Agent 详情
│   ├── 定时任务
│   ├── 任务编辑 Sheet
│   ├── 运行统计
│   ├── 诊断中心
│   ├── IM 通信渠道
│   ├── 频道详情
│   ├── Agent 文件
│   ├── 高级设置
│   ├── 订阅页
│   ├── 新建任务 Sheet
│   └── 空状态页
└── 交互脚本（标签切换、hover 效果）
```

### 设计规范（基于 V10）

| Token | 值 |
|-------|-----|
| `--bg` | `#FFFFFF` |
| `--bg2` | `#F5F5F7` |
| `--bdr` | `#E5E5EA` |
| `--tx` | `#000000` |
| `--tx2` | `#8E8E93` |
| `--tx3` | `#C7C7CC` |
| `--accent` | `#007AFF` |
| `--accent-soft` | `rgba(0,122,255,0.1)` |
| `--leaf` | `#0DA945` |
| `--lime` | `#ACCE22` |
| `--amber` | `#F6AD02` |
| `--danger` | `#FF3B30` |
| `--radius-sm` | 8px |
| `--radius-md` | 10px |
| `--radius-lg` | 14px |
| `--shadow-md` | `0 4px 16px rgba(0,0,0,0.06)` |

### macOS 窗口模拟组件

每个页面用一个 `.window` 容器：
- 顶部 traffic lights（红/黄/绿）
- 标题栏（窗口标题居中）
- 内容区（根据页面类型：sidebar+main / form / split-view）

### 图标使用

所有图标使用内联 SVG（从 `mypilot-icons-svg/` 读取并嵌入），通过 `<use>` 或内联路径引用。确保：
- outline 变体用于默认态
- fill 变体用于激活态/选中态
- 统一 `currentColor` 控制颜色

### 页面内容（基于 SwiftUI 源码还原）

1. **主聊天页**: 侧边栏(agent列表) + 聊天区(消息气泡+输入栏+header)
2. **设置主页**: 分组列表（通用/网络/Agents/高级）
3. **网络设置**: 连接状态卡 + 地址配置 + Toggle开关
4. **Agents管理**: Agent列表（头像+名称+状态+操作）
5. **Agent详情**: 头像+名称+模型+工作区+温度+保存/删除
6. **定时任务**: 任务列表（名称+频率+状态+下次运行）
7. **任务编辑Sheet**: 表单（名称/内容/频率/Agent选择）
8. **运行统计**: Hero数字 + Gauge卡片 + Token用量列表
9. **诊断中心**: 连接卡 + 指标网格 + Gateway状态 + 日志
10. **IM渠道**: 渠道列表（图标+名称+状态圆点）
11. **频道详情**: 配置信息 + 插件状态 + 密钥脱敏
12. **Agent文件**: 左侧文件树 + 右侧编辑器
13. **高级设置**: 服务/监控/调试/实验功能 分组
14. **订阅页**: 当前计划卡 + 用量条 + 3档计划 + 发票
15. **新建任务Sheet**: 底部弹起表单
16. **空状态**: 居中图标+文字+CTA

## Assumptions & Decisions

1. **单文件 HTML**: 所有内容内联（CSS + SVG + HTML），无需外部依赖，可直接浏览器打开
2. **macOS 窗口模拟**: 用 CSS 绘制 traffic lights 和标题栏，不是真实窗口
3. **图标内联**: 将 60 个 SVG 直接嵌入 HTML `<defs>`，通过 `<use>` 引用，避免外部文件依赖
4. **数据静态**: 使用模拟数据展示 UI，不连接真实后端
5. **响应式**: 桌面端 2-3 列网格，移动端单列
6. **无动画**: 仅保留 CSS hover 过渡，不添加复杂动画（保持展示文件轻量）

## Verification Steps

1. 在浏览器打开 `mypilot-complete-ui-showcase.html`
2. 验证所有 16 个页面窗口正常显示
3. 验证所有 `mp.*` 图标正确渲染
4. 验证浅色/深色模式切换（通过 CSS class）
5. 验证响应式布局（缩放浏览器窗口）
6. 对比 SwiftUI 源码，确认页面结构和元素与代码一致
