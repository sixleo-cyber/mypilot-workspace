# MyPilot 全链路模拟部署计划

## 摘要

彻底卸载服务器上的 mypilot-link，重新打包 DMG，确认 GitHub 仓库代码就绪，模拟真实用户从零开始的使用流程。

## 当前状态分析

### 服务器（118.145.240.41）
- `@mypilot/link@0.8.0` 已全局安装（`/usr/bin/mypilot`）
- `~/.mypilot-link/` 有配置文件：config.json, credentials.json, devices.json, state.json, daemon.lock, logs/, files/, uploads/
- `~/.openclaw/plugins/mypilot-link/` 有插件数据
- `~/.openclaw/openclaw.json` 有 Gateway 配置（端口/token）

### 本地代码
- `开发/mypilot-link` 有未提交/未推送的改动：
  - `cli.js` — 添加了 --version 支持
  - `daemon.js` — connect bug 修复 + P0/P1/P2 代码质量修复
  - `mypilot-link-0.8.0.tgz` — 未跟踪的打包文件
- GitHub 仓库：`git@github.com:sixleo-cyber/mypilot-link.git`
- 最新远程提交：`9e8782f fix: 代码审查修复`

### AddInstanceView 安装命令
- 当前显示：`npm install -g @mypilot/link`
- 方案：将 `@mypilot/link` 发布到 npmjs.com，用户直接 `npm install -g @mypilot/link` 安装
- npmjs 账号：`sixleo`（当前 0 个包）
- package.json 中 name 已是 `@mypilot/link`，无需修改

### DMG 安装包
- 桌面有旧版 `MyPilot.dmg`（5.4M），需要重建并删除

## 修改计划

### 第一步：提交并推送代码到 GitHub

1. **提交本地改动**
   - 文件：`开发/mypilot-link/src/cli.js`, `开发/mypilot-link/src/daemon.js`
   - 提交信息：包含 connect bug 修复 + 代码质量修复（readBody 限制、execSync 异步化、错误截断、Logger 替换等）

2. **推送到 GitHub**
   - `git push origin main`（或 master）
   - 确保远程仓库包含所有最新修复

### 第一步半：发布到 npm

1. **登录 npm**
   - `npm login`（使用 sixleo 账号）
   - 需要用户交互输入用户名/密码/OTP

2. **确认 package.json 配置**
   - name: `@mypilot/link`（scoped package）
   - version: `0.8.0`
   - 检查 `files` 字段确保只包含必要文件
   - 检查 `repository` 字段指向 GitHub 仓库

3. **发布**
   - `npm publish --access public`
   - scoped package 在免费账号下必须加 `--access public`
   - 发布后验证：`npm view @mypilot/link`

### 第二步：卸载服务器上的 mypilot-link

1. **停止 daemon**
   - `mypilot stop`

2. **运行卸载命令**
   - `mypilot uninstall`（清除配置和状态）

3. **手动清除残留数据**
   - `rm -rf ~/.mypilot-link/`（配置/状态/日志/设备密钥）
   - `rm -rf ~/.openclaw/plugins/mypilot-link/`（插件数据/上传文件）
   - `npm uninstall -g @mypilot/link`（卸载全局包）

4. **验证卸载干净**
   - `which mypilot` 应无输出
   - `ls ~/.mypilot-link/` 应不存在
   - `ls ~/.openclaw/plugins/mypilot-link/` 应不存在

### 第三步：模拟真实用户安装 mypilot-link

1. **从 npm 安装**
   - `npm install -g @mypilot/link`
   - 验证：`mypilot --version` 输出 `0.8.0`

2. **启动 daemon**
   - `mypilot start`
   - 验证：`curl http://127.0.0.1:52378/api/health` 返回 `gatewayConnected: true`

3. **生成配对码**
   - `mypilot pair`
   - 记录配对码

### 第四步：重新打包 DMG

1. **更新 AddInstanceView 安装命令**
   - 文件：`MyPilotApp/MyPilot/MyPilot/Views/AddInstanceView.swift`
   - 当前已是 `npm install -g @mypilot/link`，无需修改（发布到 npm 后此命令即可用）

2. **Xcode Release 构建**
   - `xcodebuild -project MyPilot.xcodeproj -scheme MyPilot -configuration Release ...`

3. **打包 DMG**
   - 创建 DMG 安装包到桌面

4. **删除旧安装包**
   - 删除桌面旧的 `MyPilot.dmg`
   - 删除项目目录下的旧 `MyPilot-macOS-v0.8.0.zip`

### 第五步：端到端验证

1. **Mac App 连接服务器**
   - 打开新打包的 MyPilot.app
   - 添加实例：输入服务器 IP + 配对码
   - 验证：能看到 agent 列表、能发送消息、能收到流式回复

2. **确认 npm 安装源可用**
   - 在服务器上确认 `npm install -g @mypilot/link` 能成功安装

## 假设与决策

- 不修改 `~/.openclaw/openclaw.json`（Gateway 配置保留，这是 OpenClaw 自身的配置）
- `~/.openclaw/workspace/` 目录保留（这是 OpenClaw 的工作区，不属于 mypilot-link）
- 卸载后重新安装时，需要重新生成设备密钥和配对
- **采用 npm 发布方案**：将 `@mypilot/link` 发布到 npmjs.com，用户通过 `npm install -g @mypilot/link` 安装
- GitHub 仓库保持 private，不需要改 public
- AddInstanceView 中的安装命令 `npm install -g @mypilot/link` 无需修改
- npm publish 需要 `--access public`（scoped package 免费账号限制）
- `npm login` 需要用户交互输入凭据，无法自动完成

## 验证步骤

1. `ssh root@118.145.240.41 "mypilot --version"` — 确认安装成功
2. `ssh root@118.145.240.41 "curl -s http://127.0.0.1:52378/api/health"` — 确认 daemon 运行且 Gateway 已连接
3. Mac App 添加实例 + 发送消息 — 确认端到端可用
4. `ls ~/Desktop/MyPilot.dmg` — 确认新 DMG 已生成
