# 修复 CFBundleExecutable 缺失

## 问题

iPad 模拟器安装失败：`missing or invalid CFBundleExecutable in its Info.plist`

## 原因

Info.plist 中缺少 `CFBundleExecutable` 字段，这是 iOS App 安装的必需字段，指定可执行文件名。

## 修复

在 Info.plist 中添加：
```xml
<key>CFBundleExecutable</key>
<string>$(EXECUTABLE_NAME)</string>
```

位置：在 `CFBundlePackageType` 之后添加。

## 验证

macOS + iPadOS 双平台编译通过后，在 Xcode 中重新运行 iPad 模拟器安装。
