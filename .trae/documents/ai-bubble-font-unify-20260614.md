# AI 气泡字号统一 + 加粗规范

## 问题分析

### 当前状态
- **用户气泡**：`Text(content).font(AppTypography.body)` → 13px regular，纯文本
- **AI 气泡（已完成消息）**：`MarkdownRenderer` → `ParaText` 正文行无 `.font()` 设置，标题用 pageTitle(24px)/sectionTitle(15px)/listTitle(14px)
- **AI 气泡（流式消息）**：`StreamingLineText` → `Text(verbatim:).font(AppTypography.body)` → 13px，正确

### 核心问题
1. AI 气泡正文没有显式 `.font(AppTypography.body)`，AttributedString 渲染的 bold 文本使用系统默认粗体，字号可能不一致
2. 标题层级字号过大（# → 24px, ## → 15px, ### → 14px），在消息气泡内不协调，应统一为 13px 正文 + 仅加粗区分

## 修改方案

### 1. MarkdownRenderer.swift — ParaText 正文统一字号

**文件**：`/Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot/MyPilot/Features/Chat/MarkdownRenderer.swift`

修改 ParaText body 中所有行的字体策略：

| 行类型 | 当前 | 修改后 | 原因 |
|---|---|---|---|
| `headingLevel == 1` (#) | `AppTypography.pageTitle` (24px semibold) | `AppTypography.body` + `.fontWeight(.bold)` | 气泡内不需要大标题，加粗即可 |
| `headingLevel == 2` (##) | `AppTypography.sectionTitle` (15px semibold) | `AppTypography.body` + `.fontWeight(.bold)` | 同上 |
| `headingLevel >= 3` (###) | `AppTypography.listTitle` (14px medium) | `AppTypography.body` + `.fontWeight(.bold)` | 同上 |
| 正文 (attr) | 无 `.font()` | `.font(AppTypography.body)` | 与用户气泡 13px 一致 |
| 正文 (raw fallback) | 无 `.font()` | `.font(AppTypography.body)` | 同上 |
| 空行 | `AppTypography.caption` (12px) | `AppTypography.caption` | 保持不变，空行占位 |

具体修改 ParaText body（约 L210-L246）：

```swift
var body: some View {
    VStack(alignment: .leading, spacing: 8) {
        ForEach(paras) { para in
            VStack(alignment: .leading, spacing: 0) {
                ForEach(para.lines) { line in
                    if line.isBlank {
                        Text(" ").font(AppTypography.caption)
                    } else if line.headingLevel > 0 {
                        // 所有标题统一为 13px bold，与正文同字号仅加粗区分
                        if let attr = line.attr {
                            Text(attr).font(AppTypography.body).fontWeight(.bold)
                        } else {
                            Text(line.raw).font(AppTypography.body).fontWeight(.bold)
                        }
                    } else if let attr = line.attr {
                        Text(attr).font(AppTypography.body)
                    } else {
                        Text(line.raw).font(AppTypography.body)
                    }
                }
                .lineLimit(nil)
                .fixedSize(horizontal: false, vertical: true)
            }
        }
    }
}
```

### 2. MarkdownRenderer.swift — 表格字号统一

表格当前：表头 `AppTypography.listTitle` (14px medium) + 单元格 `AppTypography.caption` (12px)

修改为：表头 `AppTypography.body` + `.fontWeight(.semibold)` + 单元格 `AppTypography.body`

**文件**：同上，MarkdownTable 组件

### 3. MarkdownRenderer.swift — 代码块字号确认

代码块当前：`AppTypography.dataMono` (11px) — 这是合理的，代码块用小号等宽字体，保持不变。

## 不修改的部分
- 用户气泡：已经是 `AppTypography.body` (13px)，无需改动
- StreamingLineText：已经是 `AppTypography.body` (13px)，无需改动
- 代码块：11px 等宽是合理设计，无需改动
- 空行占位：12px caption 是合理的，无需改动

## 验证
1. 全局 Grep 确认 ParaText 中无 pageTitle/sectionTitle/listTitle 用于标题
2. 确认 MarkdownTable 表头/单元格字号统一
3. 编译通过
