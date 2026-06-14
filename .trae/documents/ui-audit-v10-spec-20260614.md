# UI 设计规范审计 — 全页面优化计划

## 审计结果摘要

对照 V10 设计规范，发现以下需要优化的问题（按优先级排序，不含输入框布局）：

---

### P1 — 高优先级（视觉明显不一致）

#### 1. SettingsRow 水平内边距 14px → 20px
- **规范**: 行内边距 `10px 20px`
- **当前**: `.padding(.horizontal, 14).padding(.vertical, 11)`
- **文件**: `SharedComponents/SettingsRow.swift:29-30`
- **修复**: `.padding(.horizontal, 20).padding(.vertical, 10)`

#### 2. SettingsGroup 圆角 md(10) → card(14)
- **规范**: 卡片圆角 `14px continuous`
- **当前**: `AppRadius.md` (10px)
- **文件**: `SharedComponents/SettingsRow.swift:46,48`
- **修复**: 改为 `AppRadius.card` + `.continuous` style

#### 3. ChatHeaderSection 有 Divider
- **规范**: Header 无底线/顶线，纯靠间距与消息区隔开
- **当前**: systemPrompt 上方有 `Divider()`
- **文件**: `Features/Chat/ChatHeaderSection.swift:14`
- **修复**: 移除 Divider，改用 spacing 区隔

#### 4. StatusDot 直径 8px → 10px
- **规范**: 状态圆点 10px 直径
- **当前**: 8px
- **文件**: `SharedComponents/StatusDot.swift`
- **修复**: 直径改为 10px

#### 5. IconBlock 圆角 size*0.25 → 8px
- **规范**: 图标块 28×28px，圆角 8px
- **当前**: `size * 0.25` = 7px（当 size=28）
- **文件**: `SharedComponents/IconBlock.swift`
- **修复**: 圆角改为固定 8px

---

### P2 — 中优先级（细节规范）

#### 6. CardContainer 标题字体 cardTitle(.headline) → sectionTitle(15px semibold)
- **规范**: 页面 Header 标题 15px Semibold
- **当前**: `AppTypography.cardTitle` = `Font.headline`（约 17px）
- **文件**: `SharedComponents/CardContainer.swift:19`
- **修复**: 改为 `AppTypography.sectionTitle`

#### 7. CardContainer 缺少 Header 分割线
- **规范**: Header 底部有 `0.5px` 分割线
- **当前**: 无分割线
- **文件**: `SharedComponents/CardContainer.swift`
- **修复**: 标题行添加底部 Divider overlay

#### 8. SettingsGroup 缺少 Section 标题
- **规范**: Section 标题 12px Semibold uppercase + 0.5px letter-spacing
- **当前**: 无 Section 标题组件
- **文件**: `SharedComponents/SettingsRow.swift`
- **修复**: 新增 `SettingsSectionHeader` 组件

#### 9. ChatHeaderSection padding 不规范
- **规范**: Header 内边距 `10px 20px`
- **当前**: `.padding()` (默认 16px)
- **文件**: `Features/Chat/ChatHeaderSection.swift:129`
- **修复**: 改为 `.padding(.horizontal, 20).padding(.vertical, 10)`

#### 10. Agent 头像 30px → 规范未明确但 Sidebar 选中行应无右边框
- **规范**: 侧边栏无右边框线
- **当前**: 需确认是否有分隔线
- **文件**: `Views/SidebarView.swift`

---

### P3 — 低优先级（微调）

#### 11. Chevron 颜色 ink300 → tertiaryText
- **规范**: Chevron 12px / `var(--tx3)` = `#C7C7CC`
- **当前**: `AppColors.ink300` = `#D1D1D6`
- **文件**: `SharedComponents/SettingsRow.swift:26`
- **修复**: 改为 `AppColors.tertiaryText`

#### 12. CardContainer 边框颜色 opacity 0.3 → 0.5
- **规范**: 边框 0.5px `rgba(0,0,0,0.08)` ≈ opacity 0.08
- **当前**: `separatorLine.opacity(0.3)` 偏深
- **文件**: `SharedComponents/CardContainer.swift:37`
- **修复**: 改为 `separatorLine.opacity(0.5)` 或更接近规范的 0.08

#### 13. CardContainer 圆角 style 缺少 continuous
- **规范**: `14px continuous`
- **当前**: `RoundedRectangle(cornerRadius: AppRadius.card)` 无 continuous
- **文件**: `SharedComponents/CardContainer.swift:32,36`
- **修复**: 添加 `style: .continuous`

---

## 修改文件清单

### 文件 1: SharedComponents/SettingsRow.swift
- SettingsRow: padding horizontal 14→20, vertical 11→10
- SettingsGroup: 圆角 md→card, 添加 continuous style
- 新增 SettingsSectionHeader 组件

### 文件 2: SharedComponents/CardContainer.swift
- 标题字体 cardTitle→sectionTitle
- 添加 Header 底部分割线
- 圆角添加 continuous style
- 边框 opacity 调整

### 文件 3: SharedComponents/StatusDot.swift
- 直径 8→10px

### 文件 4: SharedComponents/IconBlock.swift
- 圆角 size*0.25→8px

### 文件 5: Features/Chat/ChatHeaderSection.swift
- 移除 systemPrompt 上方 Divider
- padding 改为 horizontal 20, vertical 10

### 文件 6: 各设置页面
- 使用 SettingsSectionHeader 替代内联 Section 标题

---

## 验证步骤

1. 检查所有设置页面行内边距是否为 20px
2. 检查卡片圆角是否为 14px continuous
3. 检查 Chat Header 无分割线
4. 检查状态圆点直径 10px
5. 检查图标块圆角 8px
