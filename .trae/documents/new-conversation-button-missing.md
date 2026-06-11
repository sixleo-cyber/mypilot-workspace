# 新增会话按钮消失 — 诊断

## 根因

[SidebarView.swift L128](file:///Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Views/SidebarView.swift#L128)：

```swift
if let ws = appState.currentWebSocket, !ws.agents.isEmpty {
```

整个 Agent 区域（包含「+」新增会话按钮）被包装在这个条件中。当 `currentWebSocket` 为 nil 或 `agents` 数组为空时，整个 Section 不渲染。

**这不是 Bug，是正确的设计**——必须先连接上实例的 WebSocket 并获取到 Agent 列表，才能创建会话。

## 可能原因

1. **实例尚未选中** — 左侧没有点击任何实例（`currentInstance == nil`）→ 没有 WebSocket 连接 → agents 为空 → 按钮消失
2. **WebSocket 断连** — daemon 或 Gateway 重启导致 WebSocket 断开，agents 数组被清空
3. **`/stop` 后会话卡死** — 上次卡死的会话影响 WebSocket 状态

## 解决

不需要改代码。在 App 中：
1. 点击左侧「OpenClaw 实例」下的实例名称
2. 确保连接状态显示为已连接
3. Agent 列表重新出现，新增会话按钮恢复

如果实例已选中但按钮仍未出现，检查顶部 Header 的连接状态指示灯是否为绿色。
