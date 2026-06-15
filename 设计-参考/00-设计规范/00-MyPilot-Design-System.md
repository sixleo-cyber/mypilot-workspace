# MyPilot App — Design System v4

> 版本：v4.0 Nature Palette
> 适用平台：iOS / iPadOS / macOS
> 设计工具：SwiftUI + Tailwind CSS (HTML 原型)
> 最后更新：2026-06-07

---

## 1. 设计哲学

### 1.1 核心理念

以自然色系为基调，琥珀、青柠、叶绿三色交织，营造有机且现代的界面体验。遵循 Apple Design System 的克制美学，减少不必要的卡片化，强化信息层级，让内容本身成为界面主角。

### 1.2 设计原则

1. **自然有机** — 色彩取自自然，界面呼吸感强
2. **克制优雅** — 减少装饰元素，内容即界面
3. **跨平台一致** — 三端共享同一套设计语言，仅在布局上因设备而异
4. **深色无缝** — 深浅模式切换自然，不割裂视觉体验

---

## 2. 色彩系统

### 2.1 基础色阶（Ink — 暖灰阶）

| Token | 浅色模式 | 深色模式 | 用途 |
|-------|---------|---------|------|
| `ink-50` | `#FAFBF7` | `#1C1F14` | 最浅背景、卡片底色 |
| `ink-100` | `#F2F4EC` | `#2E3322` | 页面背景、分隔线 |
| `ink-200` | `#D4D9C8` | `#424A30` | 边框、次要分隔 |
| `ink-300` | `#A8B092` | `#5A6342` | 禁用文字、占位符 |
| `ink-400` | `#7C8760` | `#7C8760` | 次要文字、说明文字 |
| `ink-500` | `#5A6342` | `#A8B092` | 辅助文字 |
| `ink-600` | `#424A30` | `#D4D9C8` | 中等强调文字 |
| `ink-700` | `#2E3322` | `#F2F4EC` | 主要文字（深色模式） |
| `ink-800` | `#1C1F14` | `#FAFBF7` | 标题文字（深色模式） |
| `ink-900` | `#0D0F09` | `#F2F4EC` | 最深色、标题文字（浅色模式） |

### 2.2 强调色系

#### Amber（琥珀）— 能量、提示

| Token | 色值 | 用途 |
|-------|------|------|
| `amber-300` | `#F6AD02` | 主要强调、高亮、进度条（警告区间） |
| `amber-50` | `#FFFBF0` | 浅色背景点缀 |
| `amber-100` | `#FFF3D6` | 标签背景 |
| `amber-900` | `#322400` | 深色模式标签背景 |

#### Lime（青柠）— 活力、实例

| Token | 色值 | 用途 |
|-------|------|------|
| `lime-300` | `#ACCE22` | 实例标识、次要强调、图表 |
| `lime-50` | `#FAFDF0` | 浅色背景点缀 |
| `lime-900` | `#222C04` | 深色模式标签背景 |

#### Leaf（叶绿）— 行动、成功

| Token | 色值 | 用途 |
|-------|------|------|
| `leaf-300` | `#0DA945` | 主按钮、发送按钮、状态指示、成功态 |
| `leaf-50` | `#F0FBF2` | 浅色背景点缀 |
| `leaf-900` | `#01190B` | 深色模式标签背景 |

### 2.3 语义色

| 语义 | 浅色模式 | 深色模式 | 用途 |
|------|---------|---------|------|
| 页面背景 | `#F2F4EC` | `#0D0F09` | 全局页面底色 |
| 表面色 | `#FFFFFF` | `#1C1F14` | 卡片、浮层背景 |
| 提升色 | `#FAFBF7` | `#2E3322` | 输入框、轻量卡片 |
| 分隔线 | `#E8EBE0` | `#2E3322` | 列表分隔、区块分隔 |
| 用户气泡 | `#1C1F14` | `#F2F4EC` | 用户发送的消息 |
| AI 气泡 | `#F2F4EC` | `#1C1F14` | AI 回复的消息 |
| AI 气泡边框 | `#D4D9C8` | `#2E3322` | AI 气泡描边 |
| 代码块背景 | `#1C1F14` | `#2E3322` | 代码/代码片段背景 |

### 2.4 深色模式切换规则

- 使用 CSS class `.dark` 作用于 `<html>` 根元素
- 所有颜色变化通过 `html.dark` 选择器覆盖
- 过渡动画：`transition: background 0.3s ease, color 0.3s ease`
- 持久化：`localStorage.setItem('mypilot-dark-mode', 'true'|'false')`

---

## 3. 字体系统

### 3.1 字体栈

```swift
// SwiftUI
.font(.custom("Inter", size: ...)) // 英文
.font(.custom("Noto Sans SC", size: ...)) // 中文

// 回退栈
font-family: 'Inter', 'Noto Sans SC', system-ui, -apple-system, sans-serif;
```

### 3.2 字号规范

| 样式 | 大小 | 字重 | 行高 | 字间距 | 用途 |
|------|------|------|------|--------|------|
| Hero Metric | 40px | 600 | 1.0 | -0.02em | 统计大数字 |
| 页面标题 | 24-28px | 600 | 1.2 | -0.02em | 页面级标题 |
| 区块标题 | 18-20px | 600 | 1.3 | -0.01em | 区块标题 |
| 列表标题 | 16px | 600 | 1.4 | 0 | 列表项主标题 |
| 正文 | 14px | 400 | 1.6 | 0 | 普通段落 |
| 辅助文字 | 12px | 400 | 1.5 | 0 | 说明、次要信息 |
| 标签文字 | 11px | 600 | 1.4 | 0.05em | 分类标签、大写英文 |
| 数据文字 | 11-12px | 400 | 1.4 | 0 | 数据、Token 计数 |

### 3.3 等宽字体

用于 Token 计数、代码片段、技术数据：

```swift
.font(.system(.caption, design: .monospaced))
// 或
font-family: 'SF Mono', SFMono-Regular, ui-monospace, monospace;
```

---

## 4. 布局系统

### 4.1 跨平台布局策略

| 平台 | 布局模式 | 导航方式 | 内容区特点 |
|------|---------|---------|-----------|
| iPhone | 单栏全屏 | 底部 Tab / 顶部导航栏 | 全宽内容，Inset Grouped 列表 |
| iPad | Sidebar + Detail 分栏 | 左侧边栏导航 | 主内容区居中，最大宽度限制 |
| Mac | 三栏/双栏窗口 | 左侧边栏 + 顶部工具栏 | 紧凑桌面窗口，traffic light 按钮 |

### 4.2 间距规范

| Token | 值 | 用途 |
|-------|-----|------|
| `space-1` | 4px | 图标与文字间距 |
| `space-2` | 8px | 紧凑元素间距 |
| `space-3` | 12px | 列表项内边距 |
| `space-4` | 16px | 卡片内边距、标准间距 |
| `space-5` | 20px | 区块间距 |
| `space-6` | 24px | 页面水平边距 |
| `space-8` | 32px | 大区块间距 |
| `space-12` | 48px | 页面顶部边距 |

### 4.3 圆角规范

| Token | 值 | 用途 |
|-------|-----|------|
| `radius-sm` | 4px | 小标签、进度条 |
| `radius-md` | 8px | 列表项、小卡片 |
| `radius-lg` | 12px | 按钮、输入框 |
| `radius-xl` | 16px | 大卡片、Agent 头像 |
| `radius-2xl` | 18px | 聊天气泡 |
| `radius-full` | 9999px | 圆形按钮、头像 |

### 4.4 设备框架规格

```
iPhone: 375 x 812 pt (iPhone X 比例), 圆角 48px, 边框 10px #1C1F14
iPad:   820 x 600 pt (横屏), 圆角 28px, 边框 8px #1C1F14
Mac:    900 x 600 pt, 圆角 12px, 无边框阴影
```

---

## 5. 组件规范

### 5.1 聊天气泡

#### 用户气泡（User）

```swift
// SwiftUI 伪代码
Text(message)
    .padding(.horizontal, 16)
    .padding(.vertical, 12)
    .background(Color.ink900) // 浅色模式
    .foregroundColor(.white)
    .cornerRadius(18, corners: [.topLeft, .topRight, .bottomLeft])
    .frame(maxWidth: 280, alignment: .trailing)
```

- 背景：`ink-900` (#1C1F14) / 深色模式：`ink-100` (#F2F4EC)
- 文字：白色 / 深色模式：`ink-900`
- 圆角：`18px 18px 4px 18px`（左下尖角）
- 最大宽度：78%（iOS）、65%（iPad）、60%（Mac）
- 入场动画：`scaleIn` 0.35s

#### AI 气泡（Assistant）

```swift
Text(message)
    .padding(.horizontal, 16)
    .padding(.vertical, 12)
    .background(Color.ink100) // 浅色模式
    .foregroundColor(Color.ink800)
    .overlay(
        RoundedRectangle(cornerRadius: 18)
            .stroke(Color.ink200, lineWidth: 1)
    )
    .cornerRadius(18, corners: [.topRight, .bottomLeft, .bottomRight])
```

- 背景：`ink-100` (#F2F4EC) / 深色模式：`ink-800` (#1C1F14)
- 边框：`ink-200` (#D4D9C8) / 深色模式：`ink-700` (#2E3322)
- 文字：`ink-800` (#1C1F14) / 深色模式：`ink-100`
- 圆角：`18px 18px 18px 4px`（左上尖角）
- 入场动画：`slideUp` 0.3s

### 5.2 按钮

#### 主按钮（Primary）

```swift
Button(action: {}) {
    Label("发送", systemImage: "paperplane.fill")
}
.buttonStyle(.borderedProminent)
.tint(.leaf300)
```

- 背景：`leaf-300` (#0DA945)
- 文字：白色
- 圆角：12px（iOS）、8px（Mac）
- 高度：44px（iOS）、36px（Mac）
- 悬停：亮度提升 10%

#### 次要按钮（Secondary）

```swift
Button(action: {}) {
    Text("取消")
}
.buttonStyle(.bordered)
.tint(.ink600)
```

- 背景：`ink-100` / 深色模式：`ink-800`
- 文字：`ink-700` / 深色模式：`ink-300`
- 圆角：12px
- 悬停：背景加深

#### 文字按钮（Text）

```swift
Button(action: {}) {
    Text("关闭")
}
.foregroundColor(.leaf300)
.font(.system(size: 14, weight: .medium))
```

- 文字：`leaf-300`
- 无背景
- 用于导航栏操作

### 5.3 输入框

```swift
TextField("开始聊天吧...", text: $input)
    .padding(.horizontal, 16)
    .padding(.vertical, 8)
    .background(Color.ink100) // 浅色
    .cornerRadius(9999) // 药丸形
    .overlay(
        RoundedRectangle(cornerRadius: 9999)
            .stroke(Color.ink200, lineWidth: 1)
    )
```

- 背景：`ink-100` / 深色模式：`ink-800`
- 边框：`ink-200` / 深色模式：`ink-700`
- 占位符：`ink-400` / 深色模式：`ink-600`
- 圆角：全圆（药丸形）

### 5.4 开关（Toggle）

```swift
Toggle("隐私模式", isOn: $privacyMode)
    .tint(.leaf300)
```

- 关闭状态背景：`ink-200` / 深色模式：`ink-700`
- 开启状态背景：`leaf-300`
- 滑块：白色
- 尺寸：44 x 26 pt
- 过渡：0.25s cubic-bezier(0.22, 1, 0.36, 1)

### 5.5 列表项（Section Divider）

```swift
HStack {
    // Icon + Label
    HStack(spacing: 12) {
        Image(systemName: icon)
            .frame(width: 32, height: 32)
            .background(Color.ink100)
            .cornerRadius(8)
        Text(title)
            .font(.system(size: 14, weight: .medium))
    }
    Spacer()
    // Accessory
    Image(systemName: "chevron.right")
        .foregroundColor(.ink300)
}
.padding(.vertical, 14)
.overlay(
    Rectangle()
        .frame(height: 1)
        .foregroundColor(.separator)
        .alignmentGuide(.bottom) { $0[.bottom] }
)
```

- 内边距：14px 垂直
- 分隔线：1px `separator` 色
- 图标容器：32 x 32px，圆角 8px，背景 `ink-100`
- 最后一项无分隔线

### 5.6 进度条

```swift
GeometryReader { geo in
    ZStack(alignment: .leading) {
        Rectangle()
            .fill(Color.ink200)
            .frame(height: 3)
        Rectangle()
            .fill(progressColor)
            .frame(width: geo.size.width * progress, height: 3)
    }
}
.frame(height: 3)
.cornerRadius(2)
```

- 轨道高度：3px
- 轨道背景：`ink-200` / 深色模式：`ink-700`
- 填充色：根据语义（leaf-300 正常、amber-300 警告）
- 圆角：2px
- 动画：宽度变化 1s cubic-bezier(0.22, 1, 0.36, 1)

### 5.7 状态指示点

```swift
Circle()
    .fill(Color.leaf300)
    .frame(width: 6, height: 6)
```

- 尺寸：6 x 6px
- 颜色：`leaf-300`（在线）
- 用于 Agent 状态、连接状态

### 5.8 毛玻璃导航栏

```swift
ZStack {
    // Content
}
.background(.ultraThinMaterial)
.overlay(
    Rectangle()
        .frame(height: 0.5)
        .foregroundColor(.separator)
        .frame(maxHeight: .infinity, alignment: .bottom)
)
```

- 背景：`.ultraThinMaterial`（SwiftUI）或 `rgba(255,255,255,0.85)` + `backdrop-filter: blur(20px)`
- 底部边框：0.5px `separator` 色
- 深色模式：背景变为 `rgba(13,15,9,0.85)`

---

## 6. 动效系统

### 6.1 动画曲线

| 名称 | 值 | 用途 |
|------|-----|------|
| `ease-out-expo` | `cubic-bezier(0.22, 1, 0.36, 1)` | 所有入场动画、页面切换 |
| `ease-standard` | `ease` | 颜色过渡、状态变化 |

### 6.2 入场动画

| 动画名 | 时长 | 效果 | 适用场景 |
|--------|------|------|---------|
| `slideUp` | 0.5s | 从下方 24px 淡入 | 页面内容、列表项 |
| `slideInRight` | 0.4s | 从右侧 20px 淡入 | 侧边栏内容、详情页 |
| `scaleIn` | 0.4s | 从 0.96 缩放到 1 | 弹窗、用户气泡 |
| `fadeIn` | 0.4s | 纯淡入 | 轻量元素 |

### 6.3 延迟层级

```
delay-1: 0.06s
delay-2: 0.12s
delay-3: 0.18s
delay-4: 0.24s
```

用于列表项依次入场，营造层次感。

### 6.4 页面切换

- 使用 `display: none/block` 切换（HTML 原型）
- SwiftUI 中使用 `.transition(.opacity)` 或 `.transition(.move(edge: .trailing))`
- 切换后 50ms 重新触发入场动画

### 6.5 Onboarding 引导页

- 幻灯片切换：0.5s cubic-bezier(0.22, 1, 0.36, 1)
- 当前页：`translateX(0)`, opacity 1
- 下一页：`translateX(100%)`, opacity 0
- 上一页：`translateX(-100%)`, opacity 0

---

## 7. 页面规范

### 7.1 聊天页面（Chat）

#### iPhone 布局

```
┌─────────────────────────┐
│ 状态栏                   │
├─────────────────────────┤
│ 关闭  [Agent信息]   ⋮   │  ← Glass Header
├─────────────────────────┤
│ [进度条] 12.5k / 32k    │  ← Token Bar
├─────────────────────────┤
│                         │
│    [AI 气泡]            │  ← Messages
│            [用户气泡]   │
│                         │
├─────────────────────────┤
│ [+] [输入框──────] [▶]  │  ← Input Bar
├─────────────────────────┤
│ Home Indicator          │
└─────────────────────────┘
```

#### iPad 布局

```
┌────────┬────────────────────────────────┐
│        │ 状态栏                          │
│ 搜索框  ├────────────────────────────────┤
│        │ [Agent信息]      [Token 45%]   │
│ 实例列表 ├────────────────────────────────┤
│        │                                │
│ Agents │      [AI 气泡]                 │
│        │              [用户气泡]        │
│        │                                │
│ [+添加]├────────────────────────────────┤
│        │ [输入框──────────────────] [▶] │
└────────┴────────────────────────────────┘
```

#### Mac 布局

```
┌───┬───┬────────────────────────────────────┐
│ ● │ ● │ ● │           MyPilot               │  ← Traffic Light
├───┴───┴────────────────────────────────────┤
│ 搜索 │                                        │
│ 实例  │  [Agent信息]        [Token 45%]       │
│      ├────────────────────────────────────────┤
│Agents│                                        │
│      │        [AI 气泡]                       │
│      │                  [用户气泡]            │
│[+添加]│                                        │
│      ├────────────────────────────────────────┤
│      │ [输入框────────────────────────] [▶]   │
└──────┴────────────────────────────────────────┘
```

### 7.2 设置页面（Settings）

#### iPhone

- 全屏模态呈现
- 顶部导航栏：关闭按钮 + 标题
- 连接状态卡片（Agent 名称、地址、状态点、测试连接按钮）
- 分组列表：配置、管理
- 列表项：图标 + 标题 + 右箭头

#### iPad

- Sidebar + Detail 分栏
- 左侧：设置分类列表
- 右侧：选中分类的详细设置
- 支持 Toggle 开关、输入框

#### Mac

- 三栏布局（文件列表 / 编辑器 / 预览）
- 顶部工具栏：文件名 + 操作按钮
- 编辑器区域：等宽字体、语法高亮

### 7.3 Agents 管理页面

#### 通用元素

- Agent 卡片：大头像（48-64px）+ 名称 + 模型 + 状态标签
- 状态标签：leaf-300 背景，白色文字，圆角全满
- 创建按钮：leaf-300 背景，白色文字，底部固定
- 模型选择：网格卡片，当前选中 leaf-300 边框

### 7.4 统计页面（Stats）

#### 核心指标

- Hero Metric 大数字：40px / 600 字重
- 趋势标签：leaf-300（下降/优化）、lime-300（上升）
- 图表：柱状图，当前日 leaf-300，其他 ink-200

#### 系统健康

- 图标 + 名称 + 规格 + 进度条 + 百分比
- CPU：leaf-300（正常）
- 内存：amber-300（警告区间）

---

## 8. 图标系统

### 8.1 图标风格

- 使用 SF Symbols（SwiftUI）或 Heroicons（HTML）
- 线框风格（outline），2px 描边
- 尺寸规范：
  - 导航图标：20-24px
  - 列表图标：16px
  - 按钮图标：20px
  - 状态图标：12-14px

### 8.2 常用图标映射

| 功能 | SF Symbol | Heroicons |
|------|-----------|-----------|
| 发送 | `paperplane.fill` | `paper-airplane` |
| 添加 | `plus` | `plus` |
| 设置 | `gear` | `cog` |
| 搜索 | `magnifyingglass` | `search` |
| 关闭 | `xmark` | `x` |
| 返回 | `chevron.left` | `chevron-left` |
| 更多 | `ellipsis` | `dots-vertical` |
| 文档 | `doc.text` | `document-text` |
| 网络 | `globe` | `globe` |
| 统计 | `chart.bar` | `chart-bar` |
| CPU | `cpu` | `chip` |
| 内存 | `memorychip` | `server` |
| 闪电 | `bolt` | `lightning-bolt` |
| 锁 | `lock` | `lock-closed` |
| 勾选 | `checkmark` | `check` |

---

## 9. 深色模式实现指南

### 9.1 SwiftUI 实现

```swift
import SwiftUI

// 自动跟随系统
@main
struct MyPilotApp: App {
    @AppStorage("darkMode") private var darkMode: Bool = false
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .preferredColorScheme(darkMode ? .dark : .light)
        }
    }
}

// 颜色扩展
extension Color {
    static let ink50 = Color("ink-50")
    static let ink100 = Color("ink-100")
    // ... 其他色值定义在 Assets.xcassets 中
}
```

### 9.2 Assets.xcassets 颜色定义

为每个颜色创建 Color Set，定义 Any Appearance 和 Dark 两种模式：

```
ink-900.colorset/
├── Contents.json
└── 包含：
    - Any Appearance: #0D0F09
    - Dark: #F2F4EC
```

### 9.3 切换逻辑

```swift
@AppStorage("mypilot-dark-mode") var isDarkMode: Bool = false

Toggle("深色模式", isOn: $isDarkMode)
    .onChange(of: isDarkMode) { newValue in
        // 通知全局更新
        NotificationCenter.default.post(
            name: .colorSchemeChanged,
            object: newValue
        )
    }
```

---

## 10. 文件清单

| 文件名 | 说明 |
|--------|------|
| `mypilot-ui-showcase.html` | V1 麦穗金主题完整版 |
| `mypilot-ui-showcase-v2.html` | V2 优化版（Cardless Layout + 动效） |
| `mypilot-ui-showcase-v3.html` | V3 Linear-style 纯灰阶方案 |
| `mypilot-ui-showcase-v4.html` | **V4 自然色系方案（当前采用）** |
| `MyPilot-Design-System.md` | 本设计系统文档 |

---

## 11. 开发检查清单

### 11.1 颜色

- [ ] 所有硬编码颜色已替换为 Design Token
- [ ] 深色模式颜色在 Assets.xcassets 中定义
- [ ] 过渡动画已添加（background, color, border-color）

### 11.2 布局

- [ ] iPhone 使用全屏单栏布局
- [ ] iPad 使用 Sidebar + Detail 分栏
- [ ] Mac 使用三栏/双栏窗口布局
- [ ] 适配安全区域（Safe Area）

### 11.3 组件

- [ ] 聊天气泡圆角方向正确（用户左下尖角，AI 左上尖角）
- [ ] 按钮高度符合平台规范（iOS 44pt / Mac 36pt）
- [ ] 输入框为药丸形（全圆角）
- [ ] Toggle 使用 leaf-300 作为开启色

### 11.4 动效

- [ ] 页面入场使用 slideUp / scaleIn
- [ ] 列表项有延迟层级（0.06s 递增）
- [ ] 页面切换后重新触发入场动画
- [ ] 颜色过渡使用 0.3s ease

### 11.5 深色模式

- [ ] 支持系统级深色模式切换
- [ ] 支持应用内手动切换
- [ ] 用户偏好已持久化
- [ ] 所有页面元素已适配深色模式

---

> 本文档基于 MyPilot App 的 V4 自然色系设计方案编写，供 iOS / iPadOS / macOS 开发团队参考使用。
