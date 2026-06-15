# MyPilot Page Icons — SVG 包

> 30 个 outline + 30 个 fill = **60 个 SVG 图标**，统一 SF Symbols 风格设计语言

## 规格

| 属性 | 值 |
|------|------|
| 画布 | 24×24 |
| 描边宽度 | 1.6pt（outline 变体） |
| 端点/连接 | round |
| 命名空间 | `mp.*` |
| Fill 变体命名 | `mp.<name>.fill.svg`（如 `mp.chat.fill.svg`） |

## 变体规则

每个图标都有 2 个变体：

| 变体 | 用途 | 渲染模式 |
|------|------|------|
| **outline** (`mp.*.svg`) | 默认态、次要信息 | 单色描边 |
| **fill** (`mp.*.fill.svg`) | 激活态、选中态、强调展示 | 纯色填充 |

SwiftUI 调用：

```swift
// 静态切换
Image(systemName: isActive ? "mp.heartbeat.fill" : "mp.heartbeat")

// iOS 17+ 动画切换
Image(systemName: "mp.heartbeat")
    .symbolEffect(.bounce, value: isActive)
```

## 图标清单（60 个）

### 核心功能（16 个 outline + 16 fill）

| ID | 中文 | 状态色 |
|------|------|------|
| `mp.chat` | 对话 | blue |
| `mp.agents` | 智能体 | blue |
| `mp.settings` | 设置 | gray |
| `mp.network` | 网络 | blue |
| `mp.scheduled` | 定时任务 | blue |
| `mp.usage` | 运行统计 | blue |
| `mp.diagnostics` | 诊断中心 | orange |
| `mp.channels` | 通信渠道 | blue |
| `mp.files` | Agent 文件 | blue |
| `mp.task.create` | 新建任务 | blue |
| `mp.advanced` | 高级设置 | yellow |
| `mp.empty` | 空状态 | gray |
| `mp.workflow` | 工作流 | blue |
| `mp.memory` | 记忆 | blue |
| `mp.permission` | 权限 | red |
| `mp.heartbeat` | 心跳 | red |

### 交互（8 个 outline + 8 fill）

| ID | 中文 |
|------|------|
| `mp.send` | 发送 |
| `mp.stop` | 停止（含 outline + fill） |
| `mp.attach` | 附件 |
| `mp.search` | 搜索 |
| `mp.add` | 新建 |
| `mp.delete` | 删除 |
| `mp.edit` | 编辑 |
| `mp.refresh` | 刷新 |

### 状态（6 个 outline + 6 fill）

| ID | 中文 |
|------|------|
| `mp.connection` | 连接 |
| `mp.info` | 信息 |
| `mp.warning` | 警告 |
| `mp.success` | 成功 |
| `mp.close` | 关闭 |
| `mp.back` | 返回 |
| `mp.menu` | 菜单 |

## 使用

### Web / HTML

```html
<!-- 内联使用 -->
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
     stroke-linecap="round" stroke-linejoin="round" style="color:#007AFF">
  <path d="..."/>
</svg>

<!-- 引用文件 -->
<img src="mypilot-icons-svg/mp.chat.svg" width="24" height="24" style="color:#007AFF"/>
<img src="mypilot-icons-svg/mp.chat.fill.svg" width="24" height="24" style="color:#007AFF"/>
```

### SwiftUI（导入到 Asset Catalog 后）

```swift
// 基础
Image("mp.chat")

// 适配深色模式
Image("mp.chat")
    .foregroundStyle(Color.accentColor)

// 激活态切换（配合 Image Set 的 Universal 配置）
Image(isActive ? "mp.heartbeat.fill" : "mp.heartbeat")
```

## 颜色规范

- **描边色**：使用 `currentColor`，跟随父元素文字色
- **浅色模式**：`#1D1D1F`（主）/ `#007AFF`（强调）
- **深色模式**：`#FFFFFF`（主）/ `#0A84FF`（强调）
- **尺寸**：16 / 20 / 24 / 32 / 48 / 64pt
- **最小可识别**：16pt

## 集成到 iOS Asset Catalog

1. 创建 `Symbols.xcassets` 资源目录
2. 每个图标创建 Symbol Set：
   - 添加 `mp.chat.svg` 和 `mp.chat.fill.svg`
   - 在 Attributes Inspector 中设置 `Rendering Mode` 为 `Template (Monochrome)`
3. 在 SwiftUI 中用 `Image("mp.chat")` 调用

详见 `MyPilot-SF-Symbols-Integration.md`
