# 项目文件夹分类整理计划

## 目标
将 `/Users/liaoxing/Downloads/未命名文件夹/` 下的散乱文件按 **产品（功能需求）**、**开发（项目代码）**、**UI 设计** 三个维度归类到三个文件夹。

## 当前状态分析

根目录下有大量散落文件，分为以下几类：

### 1. 产品/功能需求文档（根目录散落）
- `DEVELOPMENT_PLAN.md` / `DEVELOPMENT_PLAN_V2.md` / `FINAL_DEVELOPMENT_PLAN.md`
- `FEATURE_CHECKLIST.md`
- `ClawPilot_Features_v2.md`
- `PROGRESS_SAVE.md`
- `QUICK_START.md`
- `OPENCLAW_OS_ANALYSIS.md`
- `CLAWPILOT_ARCHITECTURE_ANALYSIS.md`
- `SettingsView重构prompt.md`
- `test_frontend_skill_prompt.md`

### 2. UI 设计文件（根目录散落）
- `MyPilot-Design-Requirements.md`
- `MyPilot-Design-System.md`
- `MyPilot-V10-Design-Spec.md`
- `MyPilot-Icon-Design-Spec.md` / `MyPilot-Icon-Final-Spec.md`
- `MyPilot-Icon-Final.svg`
- `MyPilot-SF-Symbols-Integration.md`
- `mypilot-icon*.html`（7 个图标设计稿）
- `mypilot-ui-showcase*.html`（11 个 UI 展示稿）
- `mypilot-advanced-subscription.html`
- `mypilot 参考icon.png`
- `mypilot-icons.zip`
- `matrix-media-1780771232813-f636a85c.png`
- `mypilot-icons-svg/`（64 个原始 SVG）
- `output-sf-templates/`（64 个 SF Symbols 模板 SVG）
- `Trae_Solo_Parham_参考.html`

### 3. 开发/项目代码（已有子目录 + 根目录散落）
- `MyPilotApp/` — SwiftUI App 完整项目
- `mypilot-link/` — MyPilot daemon（Node.js）
- `package/` — ClawPilot 公共发布包
- `scripts/` — 转换脚本
- `clawpilot-app-link-1.3.7.tgz` — npm 包压缩包

### 4. .trae/ 目录
- `.trae/documents/` — 96 个开发计划/修复计划文档
- `.trae/rules/` — 项目规则
- **不动**，这是 TRAE 工具的配置目录

## 整理方案

### 新建三个文件夹

```
未命名文件夹/
├── 产品/                    ← 功能需求
├── 开发/                    ← 项目代码
├── 设计/                    ← UI 设计
├── .trae/                   ← 不动
└── (清理后的根目录)
```

### 具体移动映射

#### 📁 产品/ — 功能需求文件

| 来源 | 目标 |
|------|------|
| `DEVELOPMENT_PLAN.md` | `产品/DEVELOPMENT_PLAN.md` |
| `DEVELOPMENT_PLAN_V2.md` | `产品/DEVELOPMENT_PLAN_V2.md` |
| `FINAL_DEVELOPMENT_PLAN.md` | `产品/FINAL_DEVELOPMENT_PLAN.md` |
| `FEATURE_CHECKLIST.md` | `产品/FEATURE_CHECKLIST.md` |
| `ClawPilot_Features_v2.md` | `产品/ClawPilot_Features_v2.md` |
| `PROGRESS_SAVE.md` | `产品/PROGRESS_SAVE.md` |
| `QUICK_START.md` | `产品/QUICK_START.md` |
| `OPENCLAW_OS_ANALYSIS.md` | `产品/OPENCLAW_OS_ANALYSIS.md` |
| `CLAWPILOT_ARCHITECTURE_ANALYSIS.md` | `产品/CLAWPILOT_ARCHITECTURE_ANALYSIS.md` |
| `SettingsView重构prompt.md` | `产品/SettingsView重构prompt.md` |
| `test_frontend_skill_prompt.md` | `产品/test_frontend_skill_prompt.md` |

#### 📁 设计/ — UI 设计文件

| 来源 | 目标 |
|------|------|
| `MyPilot-Design-Requirements.md` | `设计/MyPilot-Design-Requirements.md` |
| `MyPilot-Design-System.md` | `设计/MyPilot-Design-System.md` |
| `MyPilot-V10-Design-Spec.md` | `设计/MyPilot-V10-Design-Spec.md` |
| `MyPilot-Icon-Design-Spec.md` | `设计/MyPilot-Icon-Design-Spec.md` |
| `MyPilot-Icon-Final-Spec.md` | `设计/MyPilot-Icon-Final-Spec.md` |
| `MyPilot-Icon-Final.svg` | `设计/MyPilot-Icon-Final.svg` |
| `MyPilot-SF-Symbols-Integration.md` | `设计/MyPilot-SF-Symbols-Integration.md` |
| `mypilot-icon.html` | `设计/图标设计/mypilot-icon.html` |
| `mypilot-icon-v2.html` | `设计/图标设计/mypilot-icon-v2.html` |
| `mypilot-icon-v3.html` | `设计/图标设计/mypilot-icon-v3.html` |
| `mypilot-icon-geometry.html` | `设计/图标设计/mypilot-icon-geometry.html` |
| `mypilot-icon-svg.html` | `设计/图标设计/mypilot-icon-svg.html` |
| `mypilot-icon-final.html` | `设计/图标设计/mypilot-icon-final.html` |
| `mypilot 参考icon.png` | `设计/图标设计/mypilot-参考icon.png` |
| `mypilot-icons.zip` | `设计/图标设计/mypilot-icons.zip` |
| `mypilot-icons-svg/` | `设计/图标设计/mypilot-icons-svg/` |
| `output-sf-templates/` | `设计/图标设计/output-sf-templates/` |
| `mypilot-ui-showcase.html` | `设计/UI展示/mypilot-ui-showcase.html` |
| `mypilot-ui-showcase-v2.html` | `设计/UI展示/mypilot-ui-showcase-v2.html` |
| `mypilot-ui-showcase-v3.html` | `设计/UI展示/mypilot-ui-showcase-v3.html` |
| `mypilot-ui-showcase-v4.html` | `设计/UI展示/mypilot-ui-showcase-v4.html` |
| `mypilot-ui-showcase-v5.html` | `设计/UI展示/mypilot-ui-showcase-v5.html` |
| `mypilot-ui-showcase-v6.html` | `设计/UI展示/mypilot-ui-showcase-v6.html` |
| `mypilot-ui-showcase-v7.html` | `设计/UI展示/mypilot-ui-showcase-v7.html` |
| `mypilot-ui-showcase-v8.html` | `设计/UI展示/mypilot-ui-showcase-v8.html` |
| `mypilot-ui-showcase-v9.html` | `设计/UI展示/mypilot-ui-showcase-v9.html` |
| `mypilot-ui-showcase-ios-v3.html` | `设计/UI展示/mypilot-ui-showcase-ios-v3.html` |
| `mypilot-ui-showcase-pages-v10.html` | `设计/UI展示/mypilot-ui-showcase-pages-v10.html` |
| `mypilot-advanced-subscription.html` | `设计/UI展示/mypilot-advanced-subscription.html` |
| `mypilot-page-icons.html` | `设计/UI展示/mypilot-page-icons.html` |
| `Trae_Solo_Parham_参考.html` | `设计/参考/Trae_Solo_Parham_参考.html` |
| `matrix-media-1780771232813-f636a85c.png` | `设计/参考/matrix-media-1780771232813-f636a85c.png` |

#### 📁 开发/ — 项目代码文件

| 来源 | 目标 |
|------|------|
| `mypilot-link/` | `开发/mypilot-link/` |
| `package/` | `开发/package/` |
| `scripts/` | `开发/scripts/` |
| `clawpilot-app-link-1.3.7.tgz` | `开发/clawpilot-app-link-1.3.7.tgz` |

#### 不移动的代码目录
- `MyPilotApp/` — **留在根目录**，避免 Xcode 编译路径问题

### 不动的目录
- `.trae/` — TRAE 工具配置，移动会导致工具失效

## 重要约束

1. **MyPilotApp/ 留在根目录**，不移动，避免 Xcode 编译路径问题。
2. **project_rules.md 中的验证命令路径**需要从 `mypilot-link` 更新为 `开发/mypilot-link`（MyPilotApp 路径不变）。
3. **.trae/rules/project_rules.md** 需要同步更新路径。

## 执行步骤

1. 创建三个文件夹：`产品/`、`开发/`、`设计/`（含子目录 `图标设计/`、`UI展示/`、`参考/`）
2. 移动产品文档到 `产品/`
3. 移动设计文件到 `设计/`（含子目录分类）
4. 移动代码目录到 `开发/`
5. 更新 `.trae/rules/project_rules.md` 中的路径（mypilot-link → 开发/mypilot-link，package → 开发/package）
6. 验证：xcodebuild 编译、daemon npm run verify
