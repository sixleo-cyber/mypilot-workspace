# P19: MyPilot V10 设计规范全面落地

## 概述
按照 `MyPilot-V10-Design-Spec.md` 规范，对 MyPilot 整个项目的 UI 进行全面审计和修正。

---

## Step 1: 设计系统层修正（基础层，影响全局）

### 1.1 AppColors.swift

| Token | 当前值 | V10 规范 | 修改 |
|-------|--------|----------|------|
| `pageBackground` | `#FFFFFF` / dark `#0D0F09` | `#FFFFFF` / dark `#000000` | darkHex 改为 `#000000` |
| `surfaceCard` | `#FFFFFF` / dark `#1C1F14` | 无直接对应，V10 用 `bg2=#F5F5F7` | 改为 `#F5F5F7` / dark `#1C1C1E` |
| `elevatedSurface` | `#F5F5F7` / dark `#2E3322` | `#F5F5F7` / dark `#1C1C1E` | darkHex 改为 `#1C1C1E` |
| `aiBubbleBg` | `#E9E9EB` / dark `#2C2C2E` | `#E5E5EA` / dark `#2C2C2E` | lightHex 改为 `#E5E5EA` |
| `aiBubbleBorder` | `#E9E9EB` / dark `#2C2C2E` | 不需要（V10 无边框） | 可保留但已不使用 |
| `aiBubbleText` | `#000000` / dark `#FFFFFF` | `#000000` / dark `#FFFFFF` | ✓ |
| `ink` 色阶 | 自然色系（绿调灰） | V10 规范用标准灰阶 | 需替换为标准灰 |
| `success` | `#0DA945` / dark `#30D060` | `#34C759` / dark `#30D158` | 改为系统绿 |
| `danger` | `#DC2626` / dark `#F87171` | `#FF3B30` / dark `#FF453A` | 改为系统红 |
| `warning` | `#F6AD02` / dark `#F6C842` | `#FF9500` / dark `#FF9F0A` | 改为系统橙 |
| `info` | `#2563EB` / dark `#60A5FA` | `#007AFF` / dark `#0A84FF` | 改为系统蓝 |
| 新增 `primaryText` | 无 | `#000000` / dark `#FFFFFF` | 新增 |
| 新增 `secondaryText` | 无 | `#8E8E93` / dark `#8E8E93` | 新增 |
| 新增 `tertiaryText` | 无 | `#C7C7CC` / dark `#48484A` | 新增 |
| 新增 `accentSoft` | 无 | `#007AFF1A` | 新增 |
| 新增 `dangerSoft` | 无 | `#FF3B301A` | 新增 |
| 新增 `successSoft` | 无 | `#34C7591A` | 新增 |
| 新增 `warningSoft` | 无 | `#FF95001A` | 新增 |

**Ink 色阶替换**（V10 规范标准灰阶）：
| Token | 当前 | V10 |
|-------|------|-----|
| `ink50` | `#FAFBF7` | `#FAFAFA` |
| `ink100` | `#F2F4EC` | `#F5F5F7` |
| `ink200` | `#D4D9C8` | `#E5E5EA` |
| `ink300` | `#A8B092` | `#D1D1D6` |
| `ink400` | `#7C8760` | `#8E8E93` |
| `ink500` | `#5A6342` | `#636366` |
| `ink600` | `#424A30` | `#48484A` |
| `ink700` | `#2E3322` | `#3A3A3C` |
| `ink800` | `#1C1F14` | `#1C1C1E` |
| `ink900` | `#0D0F09` | `#1C1C1E` |

dark 模式同理替换。

**文件**: `Core/DesignSystem/AppColors.swift`

### 1.2 AppTypography.swift

| Token | 当前 | V10 规范 | 修改 |
|-------|------|----------|------|
| `heroNumber` | 40pt semibold | 28pt bold (stat-value) | 改为 28pt bold |
| `pageTitle` | 24pt semibold | 24pt semibold | ✓ |
| `sectionTitle` | 16pt semibold | 15pt semibold (page header) | 改为 15pt |
| `listTitle` | 15pt medium | 14pt medium (agent name) | 改为 14pt |
| `body` | 13pt regular | 13pt regular | ✓ |
| `caption` | 12pt regular | 12pt regular | ✓ |
| `badge` | 11pt semibold | 11pt semibold | ✓ |
| `data` | 11pt regular | 11pt regular | ✓ |
| `nano` | 9pt regular | 11pt regular (V10 nano=11pt) | 改为 11pt |
| `actionIcon` | 12pt medium | 16px (按钮图标) | 改为 16pt |

**文件**: `Core/DesignSystem/AppTypography.swift`

### 1.3 AppRadius.swift

| Token | 当前 | V10 规范 | 修改 |
|-------|------|----------|------|
| `sm` | 4 | 8 | 改为 8 |
| `md` | 8 | 10 | 改为 10 |
| `lg` | 12 | 14 | 改为 14 |
| `xl` | 16 | 16 | ✓ |
| `card` | 16 | 14 | 改为 14 |
| `xxl` | 18 | 18 | ✓ |

**文件**: `Core/DesignSystem/AppRadius.swift`

### 1.4 Spacing.swift

| Token | 当前 | V10 规范 | 修改 |
|-------|------|----------|------|
| `xxs` | 4 | 2 | 改为 2 |
| `xs` | 8 | 4 | 改为 4 |
| `sm` | 12 | 8 | 改为 8 |
| `md` | 16 | 12 | 改为 12 |
| `lg` | 20 | 16 | 改为 16 |
| `xl` | 24 | 24 | ✓ |
| `xxl` | 32 | 32 | ✓ |

**文件**: `Core/DesignSystem/Spacing.swift`

---

## Step 2: 聊天核心区修正

### 2.1 MessageBubbleView.swift

- 用户气泡内边距：`12/8` → `14/8`（V10 规范 horizontal 14, vertical 8）
- AI 气泡内边距：`12/8` → `14/8`
- AI 气泡背景色：通过 AppColors.aiBubbleBg 修改自动生效（#E9E9EB → #E5E5EA）

### 2.2 ChatHeaderSection.swift

- TokenUsageBar 高度：3pt → 4pt
- AgentHeaderView：V10 规范"无底线/顶线"，当前无 Divider ✓
- 状态指示器圆点：8px → 7px（V10 规范 7px）
- Agent 头像：28px → 30px（V10 规范 30px）
- Agent 名称字号：sectionTitle (16→15pt after Step 1) ✓

### 2.3 InputBarView.swift

- 文本框圆角：`AppRadius.xxl`(18) → 20（V10 规范 pill shape 20px）
- 文本框背景：`AppColors.elevatedSurface`（Step 1 修改后自动为 #F5F5F7）✓
- 文本框 minHeight：24 → 40（V10 规范输入框 min 40pt）
- IMETextView fontSize：14 → 16（V10 规范输入框文字 16px）
- 按钮 32px 圆形背景 #F5F5F7 ✓（已完成）
- 发送按钮 32px 圆形蓝底白图标 ✓（已完成）

### 2.4 ChatMessageSection.swift

- 消息间距：需确认当前值，V10 规范 2px
- 消息组间距：V10 规范 8px

---

## Step 3: 侧边栏修正

### 3.1 SidebarView.swift

- 搜索框圆角：8 → 10（V10 规范 10px）
- 侧边栏宽度：需确认 NavigationSplitView 的 columnWidth，V10 规范 280px
- 底部按钮：V10 规范 primary 按钮 `#007AFF` 背景、13px Semibold 白字、圆角 10px、高度 32px
  - 当前：`AppColors.leaf300` 背景 → 改为 `AppColors.userBubbleBg`（#007AFF）
- 选中行背景 `AppColors.userBubbleBg` ✓（已完成）
- 选中行白字 ✓（已完成）

---

## Step 4: 欢迎页修正

### 4.1 WelcomeView.swift

- StepRow 圆圈尺寸：36 → 40（V10 规范 agent avatar 36px，但 StepRow 图标圆圈 V10 无明确值，保持 36 亦可）
- 空状态标题字号：V10 规范 17px Semibold，当前 `pageTitle` 24pt → 应改为 17pt
- 空状态描述：V10 规范 13px，当前 `caption` 12pt → 可接受
- 空状态图标：V10 规范 64px ✓

---

## Step 5: 设置页修正

### 5.1 SettingsView.swift

- 设置页宽度：`700-800` → `600`（V10 规范）
- Section 标题：V10 规范 12px Semibold 大写，当前系统默认
- 彩色图标块：V10 规范 28×28px 圆角 8px，5 种语义色 soft 背景
  - 当前使用系统 Label 图标，需改为彩色图标块样式

### 5.2 DiagnosticsCenterView.swift

- metricCard 内边距：14 → 16
- metricCard 圆角：`AppRadius.card`（Step 1 改为 14 后自动生效）

### 5.3 UsageStatsView.swift

- heroNumber 字号：40pt → 28pt（通过 AppTypography.heroNumber 修改自动生效）
- GaugeCard 圆角：`AppRadius.md`（Step 1 改为 10 后自动生效）

### 5.4 AgentsManagementView.swift

- Agent 行头像：V10 规范 36px
- Agent 名称字号：14px Medium（通过 AppTypography.listTitle 修改自动生效）
- 活跃徽章：V10 规范 11px 胶囊绿底绿字

### 5.5 NetworkSettingsView.swift

- Toggle tint：连接类开关用 `.green`，其他用 `.accent`

### 5.6 ScheduledTasksView.swift

- 任务卡内边距：V10 规范 14/20
- 状态徽章：running/success/failed/pending 各色

---

## Step 6: 跨页面一致性修正

### 6.1 所有页面 Header

- 统一内边距：`16px 20px`
- 统一标题字号：15px Semibold（通过 AppTypography.sectionTitle 修改自动生效）

### 6.2 所有卡片

- 圆角统一 14px continuous（通过 AppRadius.card 修改自动生效）
- 边框 0.5px separatorLine
- 阴影 `0 4px 16px rgba(0,0,0,0.06)`

### 6.3 所有按钮

- 高度 32px
- 圆角 10px（AppRadius.md）
- 字号 13px Medium

### 6.4 所有状态徽章

- 11px 胶囊
- 语义色 soft 背景 + 主色文字

---

## Step 7: xcodebuild 验证

```bash
cd /Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot
xcodebuild -project MyPilot.xcodeproj -scheme MyPilot -configuration Debug -destination 'platform=macOS' -skipMacroValidation build
```

---

## 风险评估

1. **Ink 色阶替换**：从自然色系灰（绿调）改为标准灰，影响面最广。所有使用 `AppColors.ink*` 的地方颜色都会变。需要全局搜索确认无硬编码色值。
2. **Spacing 缩减**：xxs 4→2, xs 8→4, sm 12→8, md 16→12, lg 20→16，所有使用 `Spacing.*` 的地方间距都会缩小。需确认不会导致布局溢出。
3. **surfaceCard 从白色改为浅灰**：所有使用 `surfaceCard` 的卡片背景会变灰，需确认视觉效果。
4. **状态色替换**：success/danger/warning/info 颜色变化，影响所有状态指示器。

## 决策

- 保留 `leaf300`/`amber300`/`lime300` 等品牌色 token，不删除，但新增 V10 规范的系统色 token
- `surfaceCard` 改为 #F5F5F7 后，需要检查所有使用 `surfaceCard` 的地方是否需要改为 `pageBackground`（纯白）
- Spacing 缩减可能需要逐页微调，先统一修改再验证
