# MyPilot 下一步开发规划

## 当前进度总览

### 已完成
| 阶段 | 内容 | 状态 |
|------|------|------|
| P0 稳定性 | 连接恢复、附件统一、协议稳定、会话持久化 | ✅ |
| P1 体验增强 | 消息操作、定时任务、权限配置、文件浏览器 | ✅ |
| P2 深度拆分 | WS 944→570 行、daemon 可靠性 | ✅ |
| P3 持续开发 | 运行链路、回归集、诊断升级 | ✅ |
| P4 推进 | WS 深度拆分、测试增强、诊断体验 | ✅ |
| F-1~F-11 | e2e 测试修复 | ✅ |
| P5-1 | daemon HTTP API 协议测试 (50 用例) | ✅ |
| P5-2 | Swift 核心服务测试增强 (97→97 用例) | ✅ |
| P6-1 | AI 回传文件体验增强（过期状态、另存为） | ✅ |
| P6-2 | 会话管理体验优化（分组显示） | ✅ |
| P6-3 | 聊天输入体验优化（紧凑单行布局、更多入口） | ✅ |

### 当前测试覆盖
- Swift: 14 文件, 97 tests
- daemon: 7 文件, 140 tests
- package: 3 文件

---

## 待做事项（按优先级排列）

### 第一梯队：产品可用性补全

**A. P6-4 自定义添加模型**
- 优先级：**高** — 核心产品能力缺失
- 当前状态：只能用 Gateway 返回的模型列表，无法自定义（如本地 Ollama、第三方 API）
- 涉及文件：
  - `NetworkSettingsView.swift` — 增加自定义模型区域
  - `ModelPickerView.swift` — 合并 Gateway + 自定义模型
  - `WebSocketRpcMethods.swift` — 已有 `setAgentModel`/`updateAgent`/`createAgent` RPC
- 验收：可添加/编辑/删除自定义模型，Agent 可切换到自定义模型

**B. P5-3 端到端回归记录模板**
- 优先级：**中** — 保障质量
- 内容：建立结构化人工回归检查表
- 验收：模板文件创建完成

### 第二梯队：Daemon 能力补全

**C. P7-1 daemon WebSocket 协议测试**
- 优先级：**中** — daemon WS 层测试空白
- 文件：`daemon-ws.test.js`（新建）
- 内容：WS 握手、chat.send→stream→done、config RPC、schedule RPC 异常场景
- 验收：`npm run verify` 通过

**D. P7-2 daemon 日志与监控增强**
- 优先级：**低** — 改善运维体验
- 内容：`/api/logs` 级别过滤 + 时间范围查询 + 连接事件日志
- 验收：日志 API 可按级别和时间过滤

### 第三梯队：发布准备

**E. P8-1 App About 页面**
- 优先级：**低** — 发布前必须有
- 文件：新建 `AboutView.swift`
- 内容：App 版本 + daemon 版本 + 运行线 + 系统信息
- 验收：菜单栏"关于 MyPilot"打开 About 页面

**F. P8-2 package 仓库归属确认**
- 性质：**产品决策** — 需用户选择
- 选项：① 独立 GitHub repo ② mypilot-link 分支 ③ 保留当前目录

**G. P8-3 CI/CD 基础搭建**
- 优先级：**低** — 长期维护
- 当前状态：无任何 CI/CD 配置
- 内容：GitHub Actions 验证 + Swift build/test

### 第四梯队：长期维护（P9）

- P9-1: WebSocketService FrameRouter 抽取
- P9-2: 会话 runtime state 管理移出
- P9-3: 版本与迁移策略

---

## 建议执行顺序

```
A (自定义模型) → B (回归模板)
                 ↓
C (daemon WS 测试) → D (日志增强)
                 ↓
E (About 页面) → F (package 归属决策) → G (CI/CD)
                 ↓
              P9 (长期维护)
```

**推荐先做 A（自定义模型）**，因为这是核心产品能力缺口，且现有 RPC 方法已齐备（`setAgentModel`/`updateAgent`/`createAgent`），实现成本可控。
