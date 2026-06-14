# Tasks

## Phase 1: 项目配置与平台基础

- [x] Task 1: 配置 Xcode 项目支持 macOS + iPadOS 双平台
  - [x] 1.1: 修改 project.pbxproj 添加 iPadOS 支持
  - [x] 1.2: 更新 MyPilot.entitlements 添加 iPad 所需权限
  - [x] 1.3: 更新 Info.plist 添加隐私描述
  - [x] 1.4: 补全 AppIcon 目录结构 + 部署 AppIcon.png

## Phase 2: AppKit 依赖条件编译隔离

- [x] Task 2 ~ 13: 所有 AppKit 依赖条件编译隔离（NSViewRepresentable、NSImage、NSWorkspace、NSColor、NSPasteboard、NSFont、NSApplication 等）

## Phase 3: iPad UI 适配

- [x] Task 14 ~ 17: iPad 输入栏适配、长按菜单、NavigationSplitView 自适应、工具栏按钮

## Phase 4: iPad Daemon 连接适配

- [x] Task 18: iPad 远程 Daemon 连接支持

## Phase 5: 上线准备

- [x] Task 19: App Sandbox 合规
- [x] Task 20: 代码签名与 Provisioning（自动签名已配置）
- [x] Task 21: 版本号规范化 (1.0.0)
- [x] ~~Task 22: App Store 元数据~~ — 不上架 App Store，跳过

## Phase 6: 验证发现的问题修复

- [x] Task 25: 修复 MarkdownRenderer.swift 中未保护的 AppKit 引用 (NSFont/NSColor/NSPasteboard)
- [x] Task 26: 实现点击通知回到对应对话 (NotificationDelegate + navigateToConversation)

## Phase 7: 最终验证

- [x] Task 27: 修复 Info.plist 编译冲突 (PBXFileSystemSynchronizedBuildFileExceptionSet)
- [x] Task 28: 部署 AppIcon 图片 (从桌面复制 MyPilot-AppIcon-1024.png)
- [x] Task 29: macOS 编译验证 — BUILD SUCCEEDED
- [ ] Task 30: iPadOS 编译验证 — 需从 Xcode IDE 构建（命令行受 swift-plugin-server bug 阻塞）
- [ ] Task 31: 手动功能测试 — 按测试清单逐项验证
