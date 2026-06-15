# MyPilot App 使用说明检查计划

## 摘要

检查 App 端所有面向用户的说明文字，确保与当前产品实际情况一致。

## 当前状态分析

### 发现的问题

#### 问题 1：AddInstanceView 服务器地址占位符暴露了真实 IP
- **文件**: [AddInstanceView.swift:62](file:///Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Views/AddInstanceView.swift#L62)
- **当前**: `TextField("例如: http://118.145.240.41:52378", text: $serverURL)`
- **问题**: 占位符中使用了真实的服务器 IP 地址，应该用通用示例
- **修复**: 改为 `TextField("例如: http://your-server-ip:52378", text: $serverURL)`

#### 问题 2：AddInstanceView 缺少 Node.js 版本要求提示
- **文件**: [AddInstanceView.swift:72-87](file:///Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Views/AddInstanceView.swift#L72-L87)
- **当前**: 安装步骤只写了 `npm install -g mypilot-link`
- **问题**: 没有提示需要 Node.js >= 18，用户可能安装失败
- **修复**: 在步骤 1 前添加前提条件提示："需要 Node.js 18+"

#### 问题 3：AddInstanceView 缺少防火墙提示
- **文件**: [AddInstanceView.swift:72-87](file:///Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Views/AddInstanceView.swift#L72-L87)
- **当前**: 步骤 3 只写了"输入 daemon 地址（默认端口 52378）"
- **问题**: 远程服务器需要开放 52378 端口防火墙，这是最常见的连接失败原因
- **修复**: 步骤 3 改为"输入 daemon 地址（默认端口 52378，需开放防火墙）"

#### 问题 4：DiagnosticsCenterView gateway 排障步骤引用了不存在的域名
- **文件**: [DiagnosticsCenterView.swift:378](file:///Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Settings/DiagnosticsCenterView.swift#L378)
- **当前**: `"检查网络连接：curl -I https://gateway.mypilot.link"`
- **问题**: `gateway.mypilot.link` 域名不存在，Gateway 是本地服务（127.0.0.1:18789）
- **修复**: 改为 `"确认 OpenClaw Gateway 正在运行：curl http://127.0.0.1:18789"`

#### 问题 5：DiagnosticsCenterView daemon 排障步骤中引用了开发命令
- **文件**: [DiagnosticsCenterView.swift:368](file:///Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Settings/DiagnosticsCenterView.swift#L368)
- **当前**: `"确认 daemon 已启动：终端运行 mypilot 或 node src/daemon.js"`
- **问题**: `node src/daemon.js` 是开发模式命令，用户应该用 `mypilot start`
- **修复**: 改为 `"确认 daemon 已启动：终端运行 mypilot start"`

#### 问题 6：DiagnosticsCenterView gateway 排障中 connectToken 不适用于当前版本
- **文件**: [DiagnosticsCenterView.swift:379](file:///Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Settings/DiagnosticsCenterView.swift#L379)
- **当前**: `"确认 connectToken 配置正确：mypilot config get connectToken"`
- **问题**: 当前版本 daemon 自动从 `~/.openclaw/openclaw.json` 读取 Gateway 配置，不需要手动配置 connectToken
- **修复**: 改为 `"确认 OpenClaw 已安装并配置：cat ~/.openclaw/openclaw.json"`

#### 问题 7：WelcomeView 版本号过时
- **文件**: [WelcomeView.swift:75](file:///Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Views/WelcomeView.swift#L75)
- **当前**: `Text("v1.0.0 · 数据完全私有")`
- **问题**: 实际版本是 0.8.0，且硬编码版本号容易过时
- **修复**: 从 Info.plist 动态读取版本号，或改为 `v0.8.0`

#### 问题 8：AddInstanceView 配对码占位符格式正确但可更明确
- **文件**: [AddInstanceView.swift:117](file:///Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Views/AddInstanceView.swift#L117)
- **当前**: `TextField("XXXX-XXXX-XXXX", text: $pairingCode)`
- **验证**: cli.js 中配对码格式确实是 12 位字母数字（3 组 × 4 字符，`-` 分隔），占位符格式正确
- **无需修改**

## 修改计划

### 1. AddInstanceView.swift — 修复使用说明
- 占位符：`118.145.240.41` → `your-server-ip`
- 添加 Node.js 前提条件提示
- 步骤 3 添加防火墙提醒

### 2. DiagnosticsCenterView.swift — 修复排障步骤
- daemon 排障：移除 `node src/daemon.js`，只保留 `mypilot start`
- gateway 排障：`gateway.mypilot.link` → 本地 Gateway 地址
- gateway 排障：`connectToken` → `openclaw.json` 配置检查

### 3. WelcomeView.swift — 修复版本号
- `v1.0.0` → 动态读取或改为 `v0.8.0`

## 假设与决策
- 不修改功能逻辑，只修改面向用户的说明文字
- 配对码占位符格式 `XXXX-XXXX-XXXX` 与实际格式一致，无需修改
- 版本号建议从 Info.plist 动态读取，避免每次手动更新

## 验证步骤
1. Xcode 编译通过
2. 重新打包 DMG
