# Checklist

## 平台配置
- [x] Xcode 项目同时支持 macOS 和 iPadOS 编译目标
- [x] AppIcon 包含 macOS 和 iPadOS 所有必需尺寸 + 实际图片文件已部署
- [x] Info.plist 包含 NSCameraUsageDescription 隐私描述
- [x] Entitlements 包含相机和文件访问权限

## AppKit 隔离
- [x] macOS 专用代码全部用 `#if os(macOS)` 包裹
- [x] MarkdownRenderer 中 NSFont/NSColor/NSPasteboard 已条件编译隔离
- [x] macOS 编译行为不变 (BUILD SUCCEEDED)
- [x] PlatformImage 类型别名正确替代 NSImage/UIImage
- [x] NSWorkspace.shared.open 替换为跨平台文件打开

## iPad UI
- [x] iPad 竖屏时侧边栏自动折叠
- [x] 输入栏正确避让软键盘
- [x] 消息操作通过长按/上下文菜单触发 (非悬停)
- [x] 无菜单栏时"新建对话""搜索"等操作有 UI 入口

## iPad 通知
- [x] iPad 后台收到 AI 回复时推送 UNUserNotificationCenter 本地通知
- [x] 点击通知回到对应对话

## iPad 连接
- [x] iPad 可通过手动输入远程地址连接 Daemon
- [x] WebSocket 支持 wss:// TLS 连接

## App Store 合规
- [x] App Sandbox 已启用且权限最小化
- [x] 代码签名配置正确（自动签名）
- [x] 版本号规范化 (1.0.0)
- [x] ~~App Store 截图和描述~~ — 不上架，跳过

## 编译冲突修复
- [x] Info.plist 从 PBXFileSystemSynchronizedRootGroup 的 Copy Bundle Resources 中排除
- [x] AppIcon.png 已部署到 appiconset 目录

## 双平台验证
- [x] macOS Debug 编译通过
- [ ] iPadOS 模拟器编译通过 — 需从 Xcode IDE 构建（命令行 swift-plugin-server bug）
- [ ] macOS 核心功能回归通过（需手动测试）
- [ ] iPadOS 核心功能测试通过（需手动测试）
