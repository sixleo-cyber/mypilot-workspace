# 自研 ClawPilot 客户端 - 开发计划

> **目标**：开发私有化的 ClawPilot，支持 iPad/Mac 与云端多 OpenClaw 实例的连接和管理
> **架构参考**：OpenClaw OS + ClawPilot App
> **技术栈**：Node.js（云端）+ SwiftUI（客户端）
> **版本**：v1.0
> **日期**：2026-05-26

---

## 一、系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                     你的 iPad / Mac                         │
│  ┌───────────────────────────────────────────────────────┐ │
│  │               自研 ClawPilot App（SwiftUI）            │ │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────────────────┐ │ │
│  │  │ 侧边栏  │  │ 聊天区  │  │      设置面板        │ │ │
│  │  │ Agent   │  │ 消息    │  │  配置/模型/插件      │ │ │
│  │  │ 切换    │  │ 气泡    │  │                     │ │ │
│  │  └─────────┘  └─────────┘  └─────────────────────┘ │ │
│  └───────────────────────────────────────────────────────┘ │
│                           │                                 │
│                           │ WebSocket / HTTPS              │
└───────────────────────────┼─────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     云服务器集群                           │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │              自研 ClawLink 服务（Node.js）            │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │ │
│  │  │ 连接管理      │  │ 协议转换     │  │ 认证鉴权   │ │ │
│  │  │ 多实例路由   │  │ WebSocket   │  │ 配对码     │ │ │
│  │  └──────────────┘  └──────────────┘  └────────────┘ │ │
│  └───────────────────────────────────────────────────────┘ │
│                           │                                 │
│            ┌─────────────┼─────────────┐                   │
│            ↓             ↓             ↓                   │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐      │
│  │ OpenClaw 1   │ │ OpenClaw 2   │ │ OpenClaw N   │      │
│  │ (服务器 A)   │ │ (服务器 B)   │ │ (服务器 ...) │      │
│  └──────────────┘ └──────────────┘ └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## 二、组件说明

### 2.1 ClawLink（云端服务）
**作用**：管理多个 OpenClaw 实例的连接，提供统一的 API 给客户端

**核心功能**：
- 实例管理（添加、删除、连接、断开）
- WebSocket 代理（客户端 ↔ OpenClaw Gateway）
- 配对码生成与验证
- 连接状态监控
- 消息转发

**技术栈**：
- Node.js 18+
- Express.js（HTTP API）
- ws（WebSocket）
- Redis（可选，用于多实例共享状态）
- JSON 文件存储（轻量级）

### 2.2 ClawPilot App（客户端）
**作用**：提供用户界面，连接 ClawLink，管理 OpenClaw 实例

**核心功能**：
- 侧边栏（Agent 列表、历史会话、搜索）
- 聊天界面（消息发送/接收、附件上传）
- 设置面板（网络、模型、插件配置）
- 多实例切换
- 本地数据缓存

**技术栈**：
- Swift 5.9+
- SwiftUI
- SwiftData（数据持久化）
- URLSession + WebSocket

---

## 三、开发阶段

### 阶段一：ClawLink 云端服务（Week 1）

#### 3.1.1 项目初始化
```
clawlink-server/
├── src/
│   ├── index.js              # 入口
│   ├── config/
│   │   └── index.js          # 配置管理
│   ├── services/
│   │   ├── instanceManager.js    # 实例管理
│   │   ├── websocketProxy.js     # WebSocket 代理
│   │   ├── pairing.js            # 配对管理
│   │   └── messageRouter.js      # 消息路由
│   ├── routes/
│   │   ├── api.js            # REST API
│   │   └── websocket.js      # WebSocket 端点
│   └── utils/
│       ├── logger.js         # 日志
│       └── validator.js      # 参数校验
├── data/
│   └── instances.json        # 实例配置存储
├── package.json
└── README.md
```

#### 3.1.2 核心功能清单

| 功能 | 描述 | 优先级 |
|------|------|--------|
| 实例管理 API | 添加/删除/列出 OpenClaw 实例 | P0 |
| WebSocket 连接 | 客户端与实例的双向通信 | P0 |
| 配对码 | 生成、验证、撤销配对码 | P0 |
| 实例状态监控 | 心跳检测、在线/离线状态 | P1 |
| 日志记录 | 操作日志、错误日志 | P1 |

#### 3.1.3 API 接口设计

**实例管理**
```javascript
// 获取实例列表
GET /api/instances

// 添加实例
POST /api/instances
{
  "name": "火虾服务器",
  "gatewayUrl": "http://118.145.240.41:18789",
  "authToken": "xxx"
}

// 删除实例
DELETE /api/instances/:id

// 测试连接
POST /api/instances/:id/test
```

**配对管理**
```javascript
// 生成配对码
POST /api/pairing/generate

// 验证配对码
POST /api/pairing/verify
{
  "code": "LK-XXXX-XXXX"
}

// 撤销配对
DELETE /api/pairing/:deviceId
```

**WebSocket**
```javascript
// 连接格式
ws://localhost:52378/ws?deviceId=xxx&instanceId=xxx

// 消息格式
{
  "type": "message|status|error",
  "payload": {...},
  "timestamp": 1234567890
}
```

---

### 阶段二：ClawPilot App 客户端（Week 2-3）

#### 3.2.1 项目结构
```
ClawPilotApp/
├── ClawPilotApp.swift
├── Models/
│   ├── Instance.swift          # OpenClaw 实例
│   ├── Agent.swift            # Agent
│   ├── Message.swift          # 消息
│   ├── Conversation.swift      # 会话
│   └── Settings.swift         # 设置
├── ViewModels/
│   ├── InstanceListViewModel.swift
│   ├── ChatViewModel.swift
│   ├── SettingsViewModel.swift
│   └── ConnectionViewModel.swift
├── Views/
│   ├── Main/
│   │   ├── ContentView.swift
│   │   ├── SidebarView.swift
│   │   └── ChatView.swift
│   ├── Instance/
│   │   ├── InstanceListView.swift
│   │   ├── AddInstanceView.swift
│   │   └── InstanceDetailView.swift
│   ├── Settings/
│   │   ├── SettingsView.swift
│   │   ├── NetworkSettingsView.swift
│   │   └── ModelSettingsView.swift
│   └── Components/
│       ├── MessageBubble.swift
│       ├── AgentCard.swift
│       ├── InputBar.swift
│       └── TokenProgressBar.swift
├── Services/
│   ├── APIService.swift       # REST API 调用
│   ├── WebSocketService.swift # WebSocket 连接
│   ├── InstanceManager.swift   # 实例管理
│   └── StorageService.swift   # 本地存储
└── Resources/
    ├── Assets.xcassets
    └── Info.plist
```

#### 3.2.2 核心功能清单

**P0 必须功能**
- [ ] 连接 ClawLink 服务
- [ ] 添加/管理 OpenClaw 实例
- [ ] 实例列表展示
- [ ] 切换实例
- [ ] 聊天消息发送/接收
- [ ] 消息气泡展示

**P1 重要功能**
- [ ] Agent 列表与切换
- [ ] 历史会话
- [ ] 系统提示词展示
- [ ] Token 消耗显示
- [ ] 基础设置页面

**P2 增强功能**
- [ ] 文件上传
- [ ] 内置指令支持
- [ ] 模型切换
- [ ] 用量统计
- [ ] 定时任务

---

## 四、部署指南

### 4.1 ClawLink 服务部署

#### 服务器要求
- Node.js 18+
- 2GB+ RAM
- 公网可访问（端口 52378）
- HTTPS 证书（推荐 Let's Encrypt）

#### 部署步骤

```bash
# 1. 创建项目目录
mkdir -p /opt/clawlink
cd /opt/clawlink

# 2. 克隆或创建项目（从我们的代码）
# （后续会提供代码）

# 3. 安装依赖
npm install

# 4. 配置
cp config.example.js config.js
# 编辑 config.js，设置端口、认证等

# 5. 启动
npm start

# 6. 开机自启（systemd）
sudo nano /etc/systemd/system/clawlink.service
```

**systemd 服务配置**：
```ini
[Unit]
Description=ClawLink Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/clawlink
ExecStart=/usr/bin/node src/index.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable clawlink
sudo systemctl start clawlink
```

#### 防火墙配置
```bash
# 开放端口
sudo ufw allow 52378/tcp

# 如果使用 HTTPS（443）
sudo ufw allow 443/tcp
```

---

### 4.2 客户端使用

#### iPad / Mac
1. 在 Xcode 中打开项目
2. 选择目标设备（iPad Simulator / Mac）
3. 运行
4. 首次使用：
   - 输入 ClawLink 服务地址（如 `https://your-server.com:52378`）
   - 扫描或输入配对码
   - 开始使用

---

## 五、开发优先级

### 第一阶段：最小可用产品（MVP）

**目标**：能够连接 OpenClaw 并发送/接收消息

| 序号 | 功能 | 说明 |
|------|------|------|
| 1 | ClawLink 服务 | 基础 WebSocket 代理 |
| 2 | 客户端连接 | 成功连接 ClawLink |
| 3 | 消息发送 | 发送消息到 OpenClaw |
| 4 | 消息接收 | 显示 OpenClaw 回复 |
| 5 | 实例管理 | 添加/切换 OpenClaw 实例 |

**预计时间**：1-2 周

### 第二阶段：完善功能

| 序号 | 功能 | 说明 |
|------|------|------|
| 6 | 侧边栏 | Agent 列表、搜索 |
| 7 | 会话管理 | 历史消息、本地缓存 |
| 8 | 基础设置 | 网络配置、模型选择 |
| 9 | 配对码 | 扫码配对 |
| 10 | 错误处理 | 连接失败、超时等 |

**预计时间**：1 周

### 第三阶段：高级功能

| 序号 | 功能 | 说明 |
|------|------|------|
| 11 | 文件上传 | 图片、文档 |
| 12 | 插件管理 | 启用/禁用插件 |
| 13 | 用量统计 | Token 消耗图表 |
| 14 | 定时任务 | 创建/管理任务 |
| 15 | 订阅管理 | 多用户支持 |

**预计时间**：1-2 周

---

## 六、参考资源

- **OpenClaw OS**：https://github.com/thesysdev/openclaw-os
  - WebSocket 协议参考
  - UI 设计参考
  
- **ClawPilot App**：见 `ClawPilot_Features_v2.md`
  - 完整功能清单
  - UI 交互参考

- **OpenClaw Gateway API**
  - WebSocket 连接方式
  - 消息格式
  - 认证机制

---

## 七、下一步行动

### 立即开始
1. ✅ 本文档制定完成
2. ⏳ 开发 ClawLink 云端服务
3. ⏳ 开发 ClawPilot App 客户端

### 需要确认
- [ ] 云服务器 SSH 访问权限
- [ ] 现有 OpenClaw 实例配置位置
- [ ] 是否需要多用户支持

---

**文档版本**：v1.0
**创建日期**：2026-05-26
**最后更新**：2026-05-26

