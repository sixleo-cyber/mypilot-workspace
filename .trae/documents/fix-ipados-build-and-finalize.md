# 修复 iPadOS 编译 & 最终上线准备

## 当前状态分析

- ✅ macOS 编译通过（BUILD SUCCEEDED）
- ✅ iOS SDK 已安装（iOS 26.5）
- ✅ MarkdownRenderer AppKit 引用已隔离（NSFont/NSColor/NSPasteboard 全部在 `#if os(macOS)` 中）
- ✅ 通知点击导航已实现（NotificationDelegate + navigateToConversation）
- ✅ 桌面有 AppIcon 文件（~/Desktop/MyPilot-AppIcon-1024.png，7803 字节，1024×1024 PNG）
- ❌ iPadOS 编译失败 — `Multiple commands produce Info.plist`
- ❌ AppIcon.png 不存在于 appiconset 目录
- ❌ 不考虑上架 App Store（跳过签名配置、元数据准备）

### Info.plist 冲突根因

项目使用 `PBXFileSystemSynchronizedRootGroup`（Xcode 26 自动目录同步），Xcode 会将 MyPilot 目录下所有文件自动加入 Copy Bundle Resources，包括 `Info.plist`。同时 `INFOPLIST_FILE = MyPilot/Info.plist` 又让 Xcode 通过 Info.plist 处理流程处理它，导致两个构建命令产出同一个文件。

**修复方式**：在 project.pbxproj 中添加 `PBXFileSystemSynchronizedBuildFileExceptionSet`，将 `Info.plist` 从自动同步的资源中排除。

## 实施计划

### Step 1: 修复 Info.plist 编译冲突

**文件**: `MyPilotApp/MyPilot/MyPilot.xcodeproj/project.pbxproj`

1. 添加 `PBXFileSystemSynchronizedBuildFileExceptionSet` 段落（在 `PBXFileSystemSynchronizedRootGroup` 段之前）：
   - 新对象 ID: `1F8C33EB2FC8BDF900AF5DD3`
   - `membershipExceptions` 包含 `Info.plist`
   - `target` 指向 MyPilot target (`1F8C33DC2FC8BDF900AF5DD3`)

2. 修改 `PBXFileSystemSynchronizedRootGroup` 中的 MyPilot 条目，添加 `exceptions` 引用

### Step 2: 部署 AppIcon 图片

将 `~/Desktop/MyPilot-AppIcon-1024.png` 复制到 `MyPilot/Assets.xcassets/AppIcon.appiconset/AppIcon.png`。

Contents.json 中所有条目已指向 `AppIcon.png`，只需文件到位即可。

### Step 3: 验证 iPadOS 编译

```bash
cd /Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot
xcodebuild -project MyPilot.xcodeproj -scheme MyPilot -configuration Debug \
  -destination 'platform=iOS Simulator,name=iPad Pro 13-inch (M4)' \
  -skipMacroValidation build 2>&1 | tail -30
```

如果仍有编译错误，根据错误信息逐一修复。

### Step 4: 验证 macOS 编译回归

```bash
cd /Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot
xcodebuild -project MyPilot.xcodeproj -scheme MyPilot -configuration Debug \
  -destination 'platform=macOS' -skipMacroValidation build 2>&1 | tail -5
```

### Step 5: 创建手动功能测试清单

为用户生成一个简单的手动测试清单，涵盖 Mac 和 iPad 上的核心功能验证。用户只需按步骤操作确认即可，无需编写自动化测试。

测试范围：
- **Mac 端**：启动 App → 连接本地 Daemon → 发送消息 → 收到 AI 回复 → 通知 → 复制消息 → 截图发送 → 二维码扫描 → 侧边栏操作
- **iPad 端**：启动 App → 连接远程 Daemon → 发送消息 → 长按菜单 → 侧边栏折叠/展开 → 设置入口

### Step 6: 更新 spec 文档

- 更新 tasks.md：勾选完成的任务，移除/标记 App Store 相关任务为不适用
- 更新 checklist.md：勾选通过的检查点

## 不做的事项

- ❌ App Store 签名配置（用户不考虑上架）
- ❌ App Store 截图/描述/隐私政策 URL
- ❌ Provisioning Profile 配置
- ❌ 自动化测试编写

## 验证标准

1. `xcodebuild` macOS Debug → BUILD SUCCEEDED
2. `xcodebuild` iPadOS Simulator Debug → BUILD SUCCEEDED
3. AppIcon 在两个平台构建产物中正确显示
4. 手动功能测试清单可执行
