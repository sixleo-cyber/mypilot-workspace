# ClawPilot 完整功能清单
> 来源：用户实机录屏 + App Store 截图 + 官网文档
> 版本：v2.0（实机验证版）
> 日期：2026-05-26

---

## 一、侧边栏（Sidebar）

### 1.1 搜索
- 历史会话全文搜索

### 1.2 Agent 切换区
- Agent 列表，每个 Agent 显示：
  - 头像（自定义图标，如机器人/鸟头等）
  - 名称（如"未来"、"护理脑子"）
  - 最后一条消息摘要
- 当前激活 Agent 高亮

### 1.3 底部栏
- **升级特权**：￥6.00/月（Free 用户可见）
- **设置入口**：齿轮图标

---

## 二、主聊天窗口（Conversation）

### 2.1 顶部栏
- 当前 Agent 名称 + 头像
- 右侧：三点菜单（更多操作）

### 2.2 消息区域
- **系统提示词展示**（灰色块，可折叠）：
  - 包含日期（`{{$date}}`）
  - 时区（`Asia/Shanghai`）
  - 工作区路径（如 `/root/.workspace/open-workspace/HEARTBEAT.md`）
  - 对 Agent 的严格指令（如"Read HEARTBEAT.md... reply HEARTBEAT_OK"）
- **Agent 回复气泡**
- **Token 消耗进度条**（颜色规则：0-30%绿 / 30-70%黄 / 70-100%红）

### 2.3 底部输入栏
#### 图标按钮组（左侧→右侧）：
| 图标 | 功能 |
|------|------|
| App Store 图标 | 插件/功能库 |
| 文件图标 | 附件（上下文文件上传） |
| 灯泡图标 | 建议（AI 主动推荐下一步） |
| 齿轮图标 | 快速设置 |
| 相机图标 | 拍照 |
| 图片图标 | 图库 |
| 人像图标 | 切换角色/人格 |

#### 输入框
- 占位符文字：`"开始聊天吧... 发送一条状态，或者用关键词激活 ClawPilot 的内置功能。"`
- 支持 `/` 触发内置指令菜单

#### 内置指令（`/` 菜单）
| 指令 | 功能 |
|------|------|
| `/models` | 列出所有可用模型 |
| `/model <id>` | 切换当前模型 |
| `/reasoning` | 推理模式开关 |
| `/verbose` | 详细输出模式 |
| `/status` | 查看当前连接状态 |
| `/commands` | 列出所有指令 |
| `/help` | 帮助信息 |
| `/restart` | 重启当前会话 |

---

## 三、设置页面（Settings）

### 3.1 用户状态区
- 用户 ID（如 `lv-yelyll9s74nu2627fddt`）
- 连接状态：绿色 `Link Relay`（在线）

---

### 3.2 网络设置（Network Settings）

#### A. 隐私模式
- 开关：保护个人隐私，提高安全性

#### B. 记忆读取（Memory Reading）
- **待导入记录**：显示需要从本地设备导入的记录数
- **日志快照**：
  - 显示历史日志条目
  - 每条含：作业名（`operator`）、角色名（`waiter-bot`, `operator-admin`）、时间戳
  - 开关：`隐私记忆读取`（脱敏处理）
- **历史记忆解析**：开关
- **显示同步状态**：开关
- **更新策略**：
  - `每次一次（推荐）`
  - `按需读取`
  - `每 6 小时一次`
- **读取范围**：
  - `读取当前活跃时间段`
  - `读取本周的所有记录`

#### C. 搜索及网页解析（Search & Web Parsing）
- **OpenClaw 网页解析**：开关 + 自动导入
- **服务商配置**：
  | 服务商 | 状态 |
  |--------|------|
  | Brave Search | 已配置 API Key，在线 |
  | LLM Context | - |
  | Gemini | - |
  | Grok | - |
  | Kimi | - |
  | Perplexity | - |
  | Tavily | 配置中 |

#### D. 执行权限配置（Execution Permissions）
- **执行范围**（单选）：
  - `仅对话`
  - `本地主机`
  - `小网`
  - `混合`
  - `全量` ✅
- **Exec 执行方案**（单选）：
  - `自动` ✅
  - `本地`
  - `混合`
  - `仿真`
  - `节点`
- **批准执行指令**（单选）：
  - `始终`
  - `一次性`
  - `从不` ✅
- **执行记录追踪**（单选）：
  - `不追踪`
  - `仅关键`
  - `全记录` ✅
  - `静默`
- **Gateway 主机授权**：
  - 开关：`特权操作手动触发`
  - 开关：`特权读取`
  - 开关：`智能 Exec 审批`
  - 开关：`代码编写与导出`

#### E. Gateway 设置
- **状态**：`当前 Gateway @ ClawPilot Link 已连接`，`已同步`，`在线`
- **参数**：连接名、ID（`lv-yelyll9s74nu2627fddt`）
- **网络信息**：
  - Relay 地址：`https://relay.clawpilot.com/`
  - 本地 IP：`10.0.2.2`, `172.20.10.2`

---

### 3.3 高级设置（Advanced Settings）

#### A. 搜索引擎与服务（Search Engines & Services）
- **默认模型**：`qwen - qlm-2.1`
- **内置服务商列表**：
  | 服务商 | 状态 |
  |--------|------|
  | DeepSeek | 🟢 在线 |
  | Anthropic | 🟡 离线 |
  | Google Gemini | 🟡 离线 |
  | Groq | 🟡 离线 |
  | Hugging Face | 🟡 离线 |
  | MiniMax | 🟡 离线 |
  | Mistral | 🟡 离线 |
  | Model Studio（阿里魔搭）| 🟡 离线 |
  | Moonshot/Kimi | 🟡 离线 |
  | OpenRouter | 🟡 离线 |
  | Qianfan（百度千帆）| 🟡 离线 |
  | Synthetic | 🟡 离线 |
  | Together AI | 🟡 离线 |
  | Vertex | 🟡 离线 |
- **自定义服务添加**：
  - 连接名（如 `mynew`）
  - Base URL（如 `https://api.openai.com/v1`）
  - API Key
  - API 格式：`Completions` / `Responses` / `Anthropic` / `Google`
  - 模型列表

#### B. 通话设置（Voice）
- 修改语音对话的语气、语言和策略

#### C. 运行统计（Usage Statistics）
- **数据汇总**（7天）：
  - Tokens 消耗：`264.5M`
  - 费用：`$0.00`
  - 活跃 Agent：`37.8M`
  - 活跃模型：`1.8K`
- **柱状图**：05-21 至 05-28 本地 Tokens 消耗趋势
- **模型来源列表**：按 Agent 分组的 Token 消耗明细
  - 示例：`agent:nursing:...` → `48.6M`

#### D. 定时任务（Scheduled Tasks）
- 任务列表
- **新增任务弹窗**：
  | 字段 | 说明 |
  |------|------|
  | 执行 Agent | 下拉选择（如"未来"、"护理脑子"） |
  | 名称 | 任务名（如`测试任务`） |
  | 描述 | 任务描述 |
  | 任务内容 | 指令内容（如`请在一分钟后发送一条测试消息`） |
  | 周期 | `一次` / `循环` / `Cron` |
  | 执行时间 | 日期时间选择器（如 `2024/05/28 13:35`） |
  | 激活 ClawPilot App | 开关 |

---

### 3.4 文件浏览器（File Browser）
- **状态**：`已激活`，`连接成功`
- 安装命令：`openclaw plugins install lv-yelyll9s74nu2627fddt-node-bridge`

---

### 3.5 Agents 管理

#### Agent 列表
- Agent 卡片展示，每个包含名称、头像、状态

#### 创建/编辑 Agent 页面
| 字段 | 说明 |
|------|------|
| 名称 | Agent 名称（如 `Support Bot`） |
| Creature 设定 | Agent 角色描述（如 `AI 工程师机器人`） |
| Voice 设定 | 语气指令（如 `冷静，简洁，正向。`） |
| 模型选择 | 下拉选择模型 |
| SOUL 设置 | 见下文 |

#### SOUL 设置
- **逻辑输出模式**：
  - `全链式推理`
  - `标准对话` ✅
  - `代码执行模式`
  - `流程图模式`
- **思维深度**：
  - `简洁`
  - `标准`
  - `进阶`
  - `深度`
  - `超级大脑` ✅

#### 能力插件（145个）
- 飞书系列插件：
  - `feishu-base`
  - `feishu-calendar`
  - `feishu-im-read`
  - `feishu-im`
  - `feishu-docs`
  - `feishu-sheets`
  - `feishu-bitable`
  - 等 145 个开关
- 每个插件可独立开关

#### 文件 Tab
- Agent 关联的 Markdown 文件列表：
  - `AGENTS.md`
  - `TOOLS.md`
  - `IDENTITY.md`
  - `USER.md`
  - `HEARTBEAT.md`
  - `BOOTSTRAP.md`
  - `MEMORY.md`

---

### 3.6 订阅管理（Subscription）
- **当前版本**：`FREE`
- **过期时间**：`2024/06/27`
- **订阅选项**：
  - ￥6.00/月（订阅制）
  - ￥28.00（单次/永久试用）

---

## 四、系统级功能

### 4.1 文件上传
- 来源：照片 / 文件 / iCloud 云盘
- 作为上下文附件发送给 Agent

### 4.2 相机拍摄
- 内置相机界面
- 拍完直接作为上下文

### 4.3 模型切换
- 聊天界面内快速切换模型
- 支持多个服务商（DeepSeek / qwen / 等）

### 4.4 插件/功能库
- App Store 入口
- 显示所有可用插件

---

## 五、ClawPilot Link（服务端）

### 5.1 连接信息
| 类型 | 地址 |
|------|------|
| 局域网 IPv4 | `172.31.16.2` |
| 公网 IPv4 | `118.145.65.209` |
| 直连端口 | `TCP 52378` |

### 5.2 服务端功能
- 二维码生成（供 ClawPilot App 扫码配对）
- 手动输入码：`LK-7GQ7-CTHF`
- systemd user service 自动启动
- Link Relay 中继服务（`https://relay.clawpilot.com/`）

---

## 六、功能优先级分层

### 🔴 核心功能（Must Have）
1. Agent 列表 + 切换
2. 聊天对话（消息发送/接收）
3. 系统提示词展示
4. 消息输入框
5. 发送附件（文件/图片/拍照）
6. 模型切换
7. 设置页面（Gateway 连接状态）
8. 内置指令（/models, /status, /help 等）

### 🟡 重要功能（Should Have）
9. 历史会话搜索
10. 定时任务（创建/管理）
11. Agent 管理（创建/编辑/删除）
12. SOUL 设置（输出模式/思维深度）
13. 能力插件开关
14. 用量统计（Token 消耗图表）
15. 记忆读取配置
16. 执行权限配置
17. 搜索及网页解析

### 🟢 增强功能（Nice to Have）
18. 语音通话设置
19. 文件浏览器
20. 自定义服务商
21. 订阅管理
22. 隐私模式
23. 插件库（App Store）
24. 建议功能（AI 主动推荐）
25. 深度思考模式切换
26. 多网络地址管理（Relay + 多 LAN IP）

---

*文档版本：v2.0 | 更新：2026-05-26 | 来源：实机录屏验证*
