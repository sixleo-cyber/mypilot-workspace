# 提交到 GitHub + 生成 DMG 安装包

## 任务概述
1. 将代码推送到 GitHub（子模块 + 新建父仓库）
2. 生成 macOS .dmg 安装镜像

## 当前状态
- **子模块** `MyPilotApp/MyPilot`：origin = `https://github.com/sixleo-cyber/mypilot-app.git`，ahead 37 commits，有未提交的修改
- **父仓库**（未命名文件夹）：无 remote，有大量 untracked 文件
- **Xcode 项目**：scheme `MyPilot`，target `MyPilot`，只有 Debug 配置

## 步骤

### 1. 子模块提交未暂存的修改并推送
```bash
cd MyPilotApp/MyPilot
git add -A
git commit -m "feat: 设计规范落地 + NSTextView自由选择 + 操作栏 + 通知系统"
git push origin main
```

### 2. 新建父仓库并推送
- 在 GitHub 上创建仓库 `sixleo-cyber/mypilot-workspace`（或用户指定名称）
- 添加 remote 并推送
```bash
cd /Users/liaoxing/Downloads/未命名文件夹
git remote add origin https://github.com/sixleo-cyber/mypilot-workspace.git
# 先提交所有 untracked 文件
git add .trae/ 设计/ 前端工程/ 开发/ README.md 等
git commit -m "chore: 初始提交 - 完整工作区"
git push -u origin main
```

### 3. 生成 Release Build
```bash
cd MyPilotApp/MyPilot
xcodebuild -project MyPilot.xcodeproj \
  -scheme MyPilot \
  -configuration Release \
  -destination 'platform=macOS' \
  -skipMacroValidation \
  clean build \
  CONFIGURATION_BUILD_DIR=/tmp/mypilot-build
```

### 4. 打包 DMG
```bash
# 创建临时目录结构
mkdir -p /tmp/mypilot-dmg
cp -R /tmp/mypilot-build/MyPilot.app /tmp/mypilot-dmg/
ln -s /Applications /tmp/mypilot-dmg/Applications

# 生成 DMG
hdiutil create -volname "MyPilot" \
  -srcfolder /tmp/mypilot-dmg \
  -ov -format UDZO \
  ~/Desktop/MyPilot.dmg
```

## 验证
- GitHub 仓库可访问
- DMG 双击可安装，拖入 Applications 后可运行
