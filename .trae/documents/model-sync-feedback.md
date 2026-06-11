# 模型列表同步功能

## Summary

为"同步模型列表"按钮添加视觉反馈，让用户知道同步成功/失败以及同步了多少模型。

## Current State

- `requestModelsList()` 已实现：发送 `models.list` RPC → Gateway 透传 → 更新 `self.models`
- 设置页按钮：`appState.currentWebSocket?.requestModelsList()` — 无反馈
- ModelPickerView 刷新按钮：`wsService.requestModelsList()` — 无反馈
- 用户点击后看不到任何结果

## Proposed Changes

### 1. NetworkSettingsView.swift — 同步按钮加反馈

- 添加 `@State private var isSyncingModels = false` 和 `@State private var syncResult: String?`
- 点击时设置 `isSyncingModels = true`，请求完成后显示 "已同步 N 个模型" 或失败提示
- 2 秒后自动清除提示

### 2. ModelPickerView.swift — 刷新按钮加反馈

- 刷新按钮点击时添加旋转动画
- 短暂显示加载状态

### 3. 同步远程 daemon

- daemon 代码不变（已有 models.list 透传）
- 确认远程 daemon 运行正常

## Verification

1. 设置页点"同步模型列表" → 显示 "已同步 N 个模型"
2. ModelPickerView 点刷新 → 模型列表更新
3. 在 OpenClaw 添加新模型后同步 → 新模型出现在列表中
