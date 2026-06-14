# MyPilot 后续工作计划

## 当前状态总结

### 已完成的工作（近 25 次提交）
- **WebSocketService 深度拆分**：755 行拆为 7 个文件
- **流式输出体验**：打字机效果（双层缓冲 30ms）、BouncingDots 水波动画、自动滚动、气泡过渡一致性
- **Markdown 渲染**：StreamingLineText 解析、表格样式优化、思考内容分离
- **设计规范落地**：AppColors/AppTypography/Spacing token 系统、共享组件（SettingsRow/IconBlock/StatusDot/CardContainer）
- **全页面 UI 审计**：3 轮修复（按钮尺寸、颜色 token、空状态统一、边框/圆角）
- **字体统一**：25 个文件 215 处替换，所有系统语义字体→AppTypography token
- **功能特性**：token 用量统计、消息分页渲染、粘贴图片、上下文管理、自定义图标

### 遗留问题扫描结果

| 类别 | 数量 | 严重度 | 说明 |
|---|---|---|---|
| `.foregroundStyle(.secondary/.tertiary/.primary)` | ~79处 | 中 | 应替换为 AppColors.secondaryText/tertiaryText/primaryText |
| `.font(.system(size:))` 硬编码 | ~67处 | 低 | 大部分是图标/装饰尺寸（48/64/32），少量文本字号需统一 |
| `Color.black/gray/secondary` 硬编码 | ~5处 | 低 | AvatarPickerView 悬浮遮罩、CommandPickerView 阴影等 |
| InputBarView 未统一 | ~15处 | 低 | 按用户要求暂不动 |

---

## 建议的后续工作（按优先级排序）

### P1：foregroundStyle token 统一（影响视觉一致性）
**问题**：79 处 `.foregroundStyle(.secondary)` / `.foregroundStyle(.tertiary)` / `.foregroundStyle(.primary)` 使用系统语义色，而非 AppColors token。暗色模式下行为不可控。

**替换规则**：
- `.foregroundStyle(.secondary)` → `.foregroundStyle(AppColors.secondaryText)`
- `.foregroundStyle(.tertiary)` → `.foregroundStyle(AppColors.tertiaryText)`
- `.foregroundStyle(.primary)` → `.foregroundStyle(AppColors.primaryText)`

**涉及文件**（排除 InputBarView）：
- AgentsManagementView: ~12处
- NetworkSettingsView: ~12处
- MessageBubbleView: ~8处
- AddInstanceView: ~7处
- SystemPromptView: ~5处
- IMChannelsView: ~5处
- MemoryReadingView: ~3处
- ChatHeaderSection: ~2处
- CommandPickerView: ~2处
- SidebarView: ~1处
- 其他: ~5处

### P2：InputBarView 字体统一
**问题**：InputBarView 仍使用 `.font(.headline)` / `.font(.caption)` / `.font(.caption2)` / `.font(.system(size:))` 等硬编码字体，是唯一未统一的页面。

**涉及**：~15 处字体替换 + ~8 处 foregroundStyle 替换

### P3：小尺寸硬编码字号清理
**问题**：MessageBubbleView 中有大量 `.font(.system(size: 9))` 用于附件元数据标签，ChatHeaderSection 有 `.font(.system(size: 8/9))` 用于 badge，这些应统一为 AppTypography token。

**建议新增 token**：
- `badgeMini = Font.system(size: 9, weight: .semibold)` — 小型标签
- `labelMicro = Font.system(size: 9, weight: .regular)` — 微型说明文字

**涉及文件**：
- MessageBubbleView: ~10处 size:9/10
- ChatHeaderSection: ~2处 size:8/9
- ModelPickerView: ~1处 size:9
- ChatView: ~1处 size:10
- SearchPanelView: ~1处 size:10

### P4：Color 硬编码清理
**问题**：少量 `Color.black.opacity(0.3)` / `Color.gray.opacity(0.08)` / `Color.secondary.opacity(0.1)` / `Color.primary.opacity(0.15)` 等硬编码。

**建议**：在 AppColors 中新增 `overlayDark` / `overlayLight` / `shadowDefault` token。

**涉及文件**：
- AvatarPickerView: `Color.black.opacity(0.3)` ×2
- MessageBubbleView: `Color.gray.opacity(0.08)`
- CommandPickerView: `Color.primary.opacity(0.15)`
- ModelPill: `Color.secondary.opacity(0.1)`

### P5：AppTypography token 整理
**问题**：`cardTitle` 和 `sectionHeader` 与 `sectionTitle` 值完全相同（15px semibold），应合并或标记为 deprecated。

**建议**：
- `cardTitle` → 标记 `@available(*, deprecated, renamed: "sectionTitle")`
- `sectionHeader` → 同上
- 或直接删除，全局替换为 `sectionTitle`

---

## 验证步骤

每项工作完成后：
1. 全局 Grep 确认无遗漏
2. Xcode 编译通过
3. 提交 commit
