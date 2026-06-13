# 任务：重构 ClawPilot 设置页（Settings Tab）

## 背景

ClawPilot 是 SwiftUI iPad/Mac 客户端，连云端 OpenClaw Gateway。设置页目前太复杂，用户面对一堆开关容易产生"黑箱恐惧"。

**目标**：把设置页**从"复杂配置面板"改造成"极简控制中心"**。

## 核心设计原则（必须遵守）

### 原则 1：App 端永远只管"开关 + 选择"，复杂配置去云端

- ❌ App 端**不填**任何 API Key / Token
- ❌ App 端**不显示** 4 级细粒度配置（隐私脱敏、记忆更新频率、读取范围等）
- ✅ App 端**只显示状态**（已配置 ✓ / 未配置） + **让用户"开/关"或"选默认"**
- ✅ 配置入口："去云端控制台配"（跳转链接）

### 原则 2：好产品是"做了正确的事"，不是"让用户配置正确的事"

- ❌ 不要把 4 个细粒度开关都塞给用户
- ✅ 全部用云端默认值（隐私脱敏开、记忆每天更新一次、读活跃时段）
- ✅ UI 上**只显示 1 行结论**："AI 已开启隐私记忆"（用户不用管）

### 原则 3：状态可见，控制极简

每个设置项**最多 1 个控件**（toggle / picker / row），**不嵌套**。

---

## 当前设置页要做的删减

**全部砍掉（移到云端配置，App 端只显示一行结论）**：
- ❌ "执行权限配置" 整个 Tab
- ❌ "记忆读取" 4 个开关（隐私脱敏 / 历史解析 / 更新策略 / 读取范围）
- ❌ 任何 API Key 输入框

**保留并简化**：
- ✅ 隐私模式 → 1 个 toggle
- ✅ 联网搜索 → 1 个 toggle + 1 个默认服务选择器 + 服务状态列表

---

## 设置页最终结构（严格按这个做）

```
┌─ 设置 ─────────────────────────────────┐
│                                         │
│  顶部：Gateway 状态卡                     │
│  ┌──────────────────────────────────┐   │
│  │ ● 已连接                          │   │
│  │ 118.145.240.41:18789 · v2026.3.14 │   │
│  │ [测试连接]  [重新加载]             │   │
│  └──────────────────────────────────┘   │
│                                         │
│  ─── 隐私 ──────────────────────────  │
│  ┌──────────────────────────────────┐   │
│  │ 🛡 隐私模式               [开 ●] │   │
│  │ AI 不会将你的对话上传任何第三方    │   │
│  └──────────────────────────────────┘   │
│  ┌──────────────────────────────────┐   │
│  │ 🧠 智能记忆               [开 ●] │   │
│  │ AI 已自动开启隐私脱敏和记忆       │   │
│  │ 前往云端控制台管理 →              │   │
│  └──────────────────────────────────┘   │
│                                         │
│  ─── 联网 ──────────────────────────  │
│  ┌──────────────────────────────────┐   │
│  │ 🌐 联网搜索               [开 ●] │   │
│  │ 让 AI 能搜索最新信息和网页        │   │
│  │ 网页解析已默认开启（无需配置）     │   │
│  └──────────────────────────────────┘   │
│  ┌──────────────────────────────────┐   │
│  │ 默认搜索服务:                      │   │
│  │ [Brave Search ▼]                  │   │
│  │  ✓ 3 个服务已配置                  │   │
│  │  ○ 5 个服务可配置                  │   │
│  │ 前往云端控制台管理 →              │   │
│  └──────────────────────────────────┘   │
│                                         │
│  ─── 危险区 ──────────────────────────  │
│  ┌──────────────────────────────────┐   │
│  │ ⚠ 重置所有设置                     │   │
│  │ 删除本地缓存、恢复默认            │   │
│  └──────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

---

## 数据来源（重要）

### PrivacyViewModel
```swift
@Observable @MainActor
final class PrivacyViewModel: LoadableViewModel<PrivacyState> {
    var privacyModeEnabled: Bool = true
    var memoryEnabled: Bool = true

    // 从云端拉取（用 Parham 项目的 /stats/* 协议或自建端点）
    // 字段含义：
    //   privacyModeEnabled — 云端是否配置了隐私模式
    //   memoryEnabled — 云端是否开启了持久化记忆
}
```

### SearchViewModel
```swift
@Observable @MainActor
final class SearchViewModel: LoadableViewModel<SearchState> {
    var webSearchEnabled: Bool = true
    var defaultProvider: String = "brave"  // "brave" / "perplexity" / "tavily" / "duckduckgo" / ...
    var configuredProviders: [ProviderInfo] = []  // 已配置
    var availableProviders: [ProviderInfo] = []    // 可配置（未配置）
}

struct ProviderInfo: Identifiable {
    let id: String       // "brave" / "perplexity" / ...
    let name: String     // 显示名
    let icon: String     // SF Symbol name
    let isConfigured: Bool
    let isDefault: Bool
}
```

### 云端 API

| 端点 | 用途 | Method | 返回 |
|------|------|--------|------|
| `/v1/web_search` | 实际触发搜索 | POST | 搜索结果（这是 OpenClaw 原生端点）|
| **自建** `GET /api/settings/privacy` | 拉隐私/记忆状态 | GET | `{privacyMode: bool, memoryEnabled: bool}` |
| **自建** `GET /api/settings/search` | 拉搜索服务配置 | GET | `{default: "brave", configured: [...], available: [...]}` |

> **注**：OpenClaw 原生没暴露"列出已配置搜索服务"的 API，**需要在云端 Gateway 加一个轻量代理端点**（读 `openclaw.json` 的 `plugins.entries` 配置即可）。这个**1-2 小时的云端小活**，不复杂。

### 跳转到云端控制台

每个"前往云端控制台管理"按钮：
```swift
Button {
    UIApplication.shared.open(URL(string: "https://your-gateway.com/dashboard/settings")!)
} label: {
    HStack {
        Text("前往云端控制台管理")
        Image(systemName: "arrow.up.right.square")
    }
    .font(.subheadline)
    .foregroundStyle(.blue)
}
```

---

## 视觉风格要求（必须遵守）

- **iOS 17+ SwiftUI 原生 List 风格**（inset grouped）
- 每行：`HStack` 包含 `Text` 标题 + 右侧 `Toggle` 或 `Picker` 或 `Image(systemName: "chevron.right")`
- 标题用 `.body` 字体
- 副标题用 `.caption` 字体 + 灰色
- 分组用 `Section { ... } header: { Text("标题") }`
- 危险区用 `Section` 包裹，行文字用 `.red`
- 圆角：iOS 自动 10pt
- 颜色：iOS 系统色，不用自定义
- 图标：SF Symbols，不用 emoji
- 间距：iOS 自动，不要硬编码

---

## 绝对禁止（硬性黑名单）

- ❌ 任何 API Key 输入框
- ❌ 任何 4 级嵌套的细粒度开关
- ❌ 任何 emoji 图标
- ❌ 任何"高级设置""危险操作"的双重确认弹窗（除非是真正的破坏性操作如"重置"）
- ❌ 任何紫色/粉色渐变
- ❌ 任何"请配置您的..."空状态引导
- ❌ 复制 ClawPilot 视频里那个有 12 个 Tab 的复杂设置页

---

## 期望输出

请**只输出一段完整可编译的 SwiftUI 代码**：
- 一个 `SettingsView.swift` 文件
- 内含子 View：GatewayStatusCard / PrivacySection / SearchSection / DangerZoneSection
- 用 `List` 容器
- 不依赖外部 Swift Package（用系统框架即可）

**代码满足**：
- 单文件，不超过 250 行
- 可以直接复制到 Xcode 新建文件跑起来
- **必须有 1-2 行注释**说明每段的设计意图
- **ViewModel 完整可用**（不要只给占位 View）

---

## 验收标准

我会把生成的代码贴到 Xcode 跑模拟器看效果。**如果出来的东西**：
- 出现 API Key 输入框 → ❌ 不合格
- 出现 4 个记忆读取的细粒度开关 → ❌ 不合格
- 出现执行权限配置 Tab → ❌ 不合格
- 用 emoji 图标 → ❌ 不合格
- 超过 1 层嵌套的设置项 → ❌ 不合格
- 看起来像 ClawPilot 视频里那个复杂版本 → ❌ 不合格

**合格的样子**：
- 设置页**总共就 4-5 个分组**，每组 1-2 行
- 任何复杂配置都引导"去云端"
- 整个设置页**30 秒能看完**
- 用户感觉"设置搞定了"，不焦虑
- 跟 Parham 那种工程师克制风一致（结合之前 `Trae_Solo_Parham_参考.html` 的设计令牌）

## 设计参考

必须结合之前给你的两份参考文档：
- `Trae_Solo_Parham_参考.html` —— 设计系统、组件、命名约定
- `frontend-skill` 的"App UI" 章节 —— Linear-style 克制美学

## 完成后报告

请告诉我：
1. 实现了哪几个 Section
2. 用了哪些 Parham 复用组件
3. 哪些数据需要云端新增 API（列具体端点）
4. 单文件总行数
