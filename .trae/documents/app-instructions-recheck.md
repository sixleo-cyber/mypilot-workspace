# MyPilot App 使用说明检查

## 摘要
审查 App 端所有面向用户的使用说明、引导文案和排障步骤，发现 **3 个问题**需要修复。

## 当前状态分析

已审查的文件：
- [AddInstanceView.swift](file:///Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Views/AddInstanceView.swift) — 添加实例引导
- [WelcomeView.swift](file:///Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Views/WelcomeView.swift) — 欢迎页引导
- [DiagnosticsCenterView.swift](file:///Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Settings/DiagnosticsCenterView.swift) — 诊断排障
- [AboutView.swift](file:///Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Settings/AboutView.swift) — 关于页
- [CommandPickerView.swift](file:///Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Chat/CommandPickerView.swift) — 命令面板
- [cli.js](file:///Users/liaoxing/Downloads/未命名文件夹/开发/mypilot-link/src/cli.js) — CLI 命令定义

## 发现的问题

### 问题 1（严重）：`mypilot start` vs `mypilot daemon` 命令不一致

**位置**：
- AddInstanceView.swift 第 82 行：`"2. 启动 daemon：mypilot start"`
- WelcomeView.swift 第 34 行：`"npm i -g mypilot-link && mypilot start"`
- DiagnosticsCenterView.swift 第 368 行：`"确认 daemon 已启动：终端运行 mypilot start"`

**问题**：CLI 中 `mypilot start` 是**前台模式**（阻塞终端），`mypilot daemon` 才是**后台模式**（生产环境使用）。用户在服务器上应该用 `mypilot daemon` 后台运行，而不是 `mypilot start` 前台运行（前台模式会占用终端且关闭终端后进程终止）。

CLI 代码证据：
- `cmdStart()` → "启动 MyPilot Link（前台模式）" → `runDaemon()` 直接阻塞
- `cmdDaemon()` → "启动 MyPilot Link（后台模式）" → spawn 子进程 + detach
- `cmdPair()` 中也提示 `"运行: mypilot daemon"`（第 73、109 行）

**修复**：将 App 中所有 `mypilot start` 改为 `mypilot daemon`。

### 问题 2（中等）：WelcomeView 步骤 2 的命令组合不完整

**位置**：WelcomeView.swift 第 34 行
```
StepRow(number: 2, title: "安装 MyPilot Link", subtitle: "npm i -g mypilot-link && mypilot start", icon: "terminal")
```

**问题**：
1. `mypilot start` 应改为 `mypilot daemon`（同问题 1）
2. 一行命令 `npm i -g mypilot-link && mypilot daemon` 虽然技术上可行，但建议分两步显示更清晰（与 AddInstanceView 保持一致）

**修复**：subtitle 改为 `"npm i -g mypilot-link && mypilot daemon"`

### 问题 3（轻微）：AddInstanceView 步骤 4 描述不够准确

**位置**：AddInstanceView.swift 第 88 行
```
Text("4. 在下一步输入终端显示的配对码完成配对")
```

**问题**：配对码不是 daemon 启动时自动显示的，而是需要用户**主动执行** `mypilot pair` 命令才会生成。当前描述可能让用户以为启动 daemon 后终端会自动显示配对码。

**修复**：改为 `"4. 在服务器终端执行 mypilot pair 获取配对码，然后在下一步输入"`（与 step2View 第 116 行的描述保持一致）

## 修复计划

| # | 文件 | 修改 | 优先级 |
|---|------|------|--------|
| 1 | AddInstanceView.swift:82 | `mypilot start` → `mypilot daemon` | 高 |
| 2 | WelcomeView.swift:34 | `mypilot start` → `mypilot daemon` | 高 |
| 3 | DiagnosticsCenterView.swift:368 | `mypilot start` → `mypilot daemon` | 高 |
| 4 | AddInstanceView.swift:88 | 补充 `mypilot pair` 命令说明 | 中 |

## 验证步骤

1. Xcode 编译通过
2. 检查 App 内所有 `mypilot start` 引用已替换为 `mypilot daemon`
3. 重新打包 DMG
