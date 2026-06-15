# 设计文件夹整理方案：Mac / iPad / iPhone 三平台独立

## 当前状态分析

当前 `设计/` 目录结构混乱：
- `UI展示/` 里 14 个 HTML 全是 Mac 版本（v1~v10 + pages-v10 + subscription + icons），只有 1 个 iOS（iPhone）版本
- `Mac-V10/` 只放了 2 个文件，Mac 其他版本散落在 `UI展示/`
- `基础规范/` 里 5 个文件全部是 Mac 相关的设计规范
- `iPad/` 结构合理，只有 2 个文件
- `图标设计/` 和 `参考/` 是跨平台共享的，结构合理

### 文件分类清单

| 文件 | 平台 | 版本 | 归属 |
|------|------|------|------|
| UI展示/mypilot-ui-showcase.html | Mac | v1 | Mac/v1 |
| UI展示/mypilot-ui-showcase-v2.html | Mac | v2 | Mac/v2 |
| UI展示/mypilot-ui-showcase-v3.html | Mac | v3 | Mac/v3 |
| UI展示/mypilot-ui-showcase-v4.html | Mac | v4 | Mac/v4 |
| UI展示/mypilot-ui-showcase-v5.html | Mac | v5 | Mac/v5 |
| UI展示/mypilot-ui-showcase-v6.html | Mac | v6 | Mac/v6 |
| UI展示/mypilot-ui-showcase-v7.html | Mac | v7 | Mac/v7 |
| UI展示/mypilot-ui-showcase-v8.html | Mac | v8 | Mac/v8 |
| UI展示/mypilot-ui-showcase-v9.html | Mac | v9 | Mac/v9 |
| UI展示/mypilot-ui-showcase-v10.html | Mac | v10 | Mac/v10 |
| UI展示/mypilot-ui-showcase-pages-v10.html | Mac | v10 | Mac/v10 |
| UI展示/mypilot-advanced-subscription.html | Mac | - | Mac/专项 |
| UI展示/mypilot-page-icons.html | Mac | - | Mac/专项 |
| Mac-V10/MyPilot-V10-Design-Spec.md | Mac | v10 | Mac/v10 |
| Mac-V10/mypilot-complete-ui-showcase.html | Mac | v10 | Mac/v10 |
| 基础规范/MyPilot-Complete-UI-Design-Spec.md | Mac | v1 | Mac/规范 |
| 基础规范/MyPilot-Complete-UI-SwiftUI-Components.md | Mac | v1 | Mac/规范 |
| 基础规范/MyPilot-Design-Requirements.md | Mac | v1 | Mac/规范 |
| 基础规范/MyPilot-Design-System.md | Mac | v4 | Mac/规范 |
| 基础规范/MyPilot-SF-Symbols-Integration.md | 跨平台 | v4 | 共享 |
| UI展示/mypilot-ui-showcase-ios-v3.html | iPhone | v3 | iPhone/v3 |
| iPad/MyPilot-iPad-Design-Spec.md | iPad | - | iPad/ |
| iPad/MyPilot-iPad-UI-Preview.html | iPad | - | iPad/ |

## 目标结构

```
设计/
├── Mac/
│   ├── v1/
│   │   ├── mypilot-ui-showcase.html
│   │   ├── MyPilot-Complete-UI-Design-Spec.md
│   │   ├── MyPilot-Complete-UI-SwiftUI-Components.md
│   │   └── MyPilot-Design-Requirements.md
│   ├── v2/
│   │   └── mypilot-ui-showcase-v2.html
│   ├── v3/
│   │   └── mypilot-ui-showcase-v3.html
│   ├── v4/
│   │   ├── mypilot-ui-showcase-v4.html
│   │   └── MyPilot-Design-System.md
│   ├── v5/
│   │   └── mypilot-ui-showcase-v5.html
│   ├── v6/
│   │   └── mypilot-ui-showcase-v6.html
│   ├── v7/
│   │   └── mypilot-ui-showcase-v7.html
│   ├── v8/
│   │   └── mypilot-ui-showcase-v8.html
│   ├── v9/
│   │   └── mypilot-ui-showcase-v9.html
│   ├── v10/
│   │   ├── mypilot-ui-showcase-v10.html
│   │   ├── mypilot-ui-showcase-pages-v10.html
│   │   ├── mypilot-complete-ui-showcase.html
│   │   └── MyPilot-V10-Design-Spec.md
│   └── 专项/
│       ├── mypilot-advanced-subscription.html
│       └── mypilot-page-icons.html
│
├── iPad/
│   ├── MyPilot-iPad-Design-Spec.md
│   └── MyPilot-iPad-UI-Preview.html
│
├── iPhone/
│   └── v3/
│       └── mypilot-ui-showcase-ios-v3.html
│
├── 共享/
│   ├── 图标设计/           ← 从设计/根移入
│   │   ├── MyPilot-Icon-Design-Spec.md
│   │   ├── MyPilot-Icon-Final-Spec.md
│   │   ├── MyPilot-Icon-Final.svg
│   │   ├── MyPilot-Icon-v2-Review.html
│   │   ├── generate_mypilot_icon.py
│   │   ├── generate_mypilot_icon_v2.py
│   │   ├── mypilot-icons-svg/
│   │   ├── output-sf-templates/
│   │   └── ... (其余图标文件)
│   ├── SF-Symbols-Integration.md
│   └── 参考/
│       ├── Trae_Solo_Parham_参考.html
│       └── matrix-media-1780771232813-f636a85c.png
│
└── (根目录干净，无散落文件)
```

## 执行步骤

### Step 1: 创建新目录结构
```bash
cd /Users/liaoxing/Downloads/未命名文件夹/设计
mkdir -p Mac/{v1,v2,v3,v4,v5,v6,v7,v8,v9,v10,专项}
mkdir -p iPhone/v3
mkdir -p 共享
```

### Step 2: 移动 Mac UI展示 HTML（v1~v10 + 专项）
```bash
mv UI展示/mypilot-ui-showcase.html          Mac/v1/
mv UI展示/mypilot-ui-showcase-v2.html        Mac/v2/
mv UI展示/mypilot-ui-showcase-v3.html        Mac/v3/
mv UI展示/mypilot-ui-showcase-v4.html        Mac/v4/
mv UI展示/mypilot-ui-showcase-v5.html        Mac/v5/
mv UI展示/mypilot-ui-showcase-v6.html        Mac/v6/
mv UI展示/mypilot-ui-showcase-v7.html        Mac/v7/
mv UI展示/mypilot-ui-showcase-v8.html        Mac/v8/
mv UI展示/mypilot-ui-showcase-v9.html        Mac/v9/
mv UI展示/mypilot-ui-showcase-v10.html       Mac/v10/
mv UI展示/mypilot-ui-showcase-pages-v10.html Mac/v10/
mv UI展示/mypilot-advanced-subscription.html Mac/专项/
mv UI展示/mypilot-page-icons.html            Mac/专项/
```

### Step 3: 移动 Mac-V10/ 内容到 Mac/v10/
```bash
mv Mac-V10/MyPilot-V10-Design-Spec.md       Mac/v10/
mv Mac-V10/mypilot-complete-ui-showcase.html Mac/v10/
rmdir Mac-V10
```

### Step 4: 移动基础规范（全部 Mac 相关）
```bash
mv 基础规范/MyPilot-Complete-UI-Design-Spec.md      Mac/v1/
mv 基础规范/MyPilot-Complete-UI-SwiftUI-Components.md Mac/v1/
mv 基础规范/MyPilot-Design-Requirements.md           Mac/v1/
mv 基础规范/MyPilot-Design-System.md                  Mac/v4/
# SF-Symbols 是跨平台的，移到共享
mv 基础规范/MyPilot-SF-Symbols-Integration.md        共享/
rmdir 基础规范
```

### Step 5: 移动 iPhone 文件
```bash
mv UI展示/mypilot-ui-showcase-ios-v3.html iPhone/v3/
```

### Step 6: 整理共享资源
```bash
mv 图标设计 共享/图标设计
mv 参考 共享/参考
```

### Step 7: 清理空目录
```bash
rmdir UI展示
```

### Step 8: 验证
- 确认 `设计/` 根目录只有 `Mac/`、`iPad/`、`iPhone/`、`共享/` 四个文件夹
- 确认每个文件都在正确位置
- 确认无空文件残留

## 决策说明

1. **Mac 按版本分目录**：v1~v10 每个版本独立文件夹，方便追溯设计演进
2. **Mac 规范文档归入对应版本**：Design-Requirements 和 Complete-UI-Design-Spec 归 v1（它们是最初版本），Design-System 归 v4（文件标注 v4.0）
3. **Mac 专项独立**：subscription 和 icons 不属于特定版本迭代，放在 `Mac/专项/`
4. **iPhone 独立**：目前只有 v3 一个文件，但预留版本扩展结构
5. **共享资源**：图标设计、SF Symbols、参考素材是三平台共用的，放在 `共享/`
6. **iPad 保持现状**：iPad 目录结构已合理，无需调整
