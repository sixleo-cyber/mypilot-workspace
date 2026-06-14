# 修复模型选择器点击无反应

## 根因分析

**QuickSettingsPanel 的「切换模型」行点击后只调用 `onClose()`，没有打开 ModelPickerView。**

文件 `Views/InputBarView.swift` L478-480：
```swift
settingRow(icon: "cpu", title: "切换模型", subtitle: modelName) {
    onClose()  // ← 只关闭了面板，没有打开模型选择器
}
```

ModelPickerView 本身功能正常（L53-64 有完整的 onSelect → setAgentModel 流程），但从未被展示。

## 修复方案

### 方案：在 QuickSettingsPanel 中添加 ModelPickerView 的 sheet/popover

1. 给 QuickSettingsPanel 添加 `@State private var showModelPicker = false`
2. 「切换模型」行点击后设置 `showModelPicker = true`（而非 onClose）
3. 添加 `.sheet` 或 `.popover` 展示 ModelPickerView

**文件**: `Views/InputBarView.swift` L458-510

```swift
struct QuickSettingsPanel: View {
    let wsService: WebSocketService
    let modelName: String
    let isConnected: Bool
    let onResetChat: () -> Void
    let onClose: () -> Void
    @State private var showModelPicker = false  // 新增

    var body: some View {
        VStack(spacing: 0) {
            // ... header ...
            ScrollView {
                VStack(spacing: 0) {
                    settingRow(icon: "cpu", title: "切换模型", subtitle: modelName) {
                        showModelPicker = true  // 改为打开模型选择器
                    }
                    // ... 其他行 ...
                }
            }
        }
        .sheet(isPresented: $showModelPicker) {  // 新增
            ModelPickerView(wsService: wsService, isPresented: $showModelPicker)
                .frame(minWidth: 320, minHeight: 400)
        }
    }
}
```

## 验证步骤

1. 点击输入栏底部「MiniMax-M3 ▾」按钮 → 弹出 QuickSettingsPanel
2. 点击「切换模型」行 → 弹出 ModelPickerView sheet
3. 点击列表中的模型 → 调用 setAgentModel，显示切换成功消息
4. 关闭 sheet 后模型名按钮显示新模型名
