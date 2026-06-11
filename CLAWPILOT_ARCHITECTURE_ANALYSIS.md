# 🔬 ClawPilot Link 架构深度分析

> 基于 `@clawpilot-app/link@1.3.7` npm 包源码分析
> 分析时间：2026-05-29

---

## 📦 包文件总览

```
@clawpilot-app/link/
├── src/
│   ├── cli.js              # 101.2kB - CLI 命令入口
│   ├── daemon.js           # 95.5kB - 核心守护进程
│   ├── openclaw.js        # 33.6kB - OpenClaw 协议通信
│   ├── network.js         # 10.5kB - 网络发现、端口等
│   ├── server-api.js      # 3.9kB - 官方 Relay 服务器 API
│   ├── runtime.js         # 19.7kB - 配置、状态、日志
│   ├── autostart.js       # 21.7kB - 开机自启
│   ├── device-identity.js # 4.4kB - 设备身份
│   ├── connect-token.js   # 4.0kB - 连接令牌
│   ├── i18n.js           # 50.1kB - 国际化
│   ├── version-support.js
│   └── constants.js       # 版本常量
└── scripts/
    ├── check-node-version.mjs
    └── postinstall.mjs
```

---

## 🏗️ 核心架构（三层）

```
          Layer 0: 用户设备
             ┌─────────────┐
             │   iPad/Mac  │
             │   App       │
             └──────┬──────┘
                    │ WebSocket
        ┌───────────┼───────────┐
        │           ↓           │
Layer 1 │  LAN 直连   │   Relay  │  Layer 2
        │  (52378)    │  服务器  │  (ClawPilot 官方)
        │             ↓           │
        │  ┌───────────────────┐ │
        │  │   ClawPilot Link  │ │
        │  │   (daemon)        │ │
        │  └──────────┬────────┘ │
        └─────────────┼──────────┘
                      ↓
          Layer 3: OpenClaw Gateway
                      (18789)
```

### 三层详细说明

| 层级 | 角色 | 端口/地址 |
|------|------|----------|
| **Layer 0** | 用户 App（iPad/Mac） | 客户端 |
| **Layer 1** | Link Daemon（你服务器上的） | 端口 52378 |
| **Layer 2** | Relay 服务器（ClawPilot 官方） | `relay.clawpilot.com` |
| **Layer 3** | OpenClaw Gateway | 端口 18789 |

---

## 🔌 连接方式：三种优先级

### 方式 1：本地局域网直连（最快）
```
iPad/Mac
    ↓ 局域网 WebSocket
ClawPilot Link (端口 52378)
    ↓
OpenClaw Gateway (18789)
```

### 方式 2：公网直连（次之）
```
iPad/Mac
    ↓ 公网 IP:52378
ClawPilot Link
    ↓
OpenClaw Gateway
```

### 方式 3：Relay 中继（保底）
```
iPad/Mac
    ↓
ClawPilot Relay Server
    ↓
ClawPilot Link
    ↓
OpenClaw Gateway
```

---

## 🔑 配对流程（`clawlink pair` 命令）

```
用户执行 `clawlink pair`
    ↓
1. 自动发现本地 OpenClaw（读 ~/.openclaw/openclaw.json）
    ↓ 找不到则手动输入
2. 调用 Relay 服务器 API
   POST /api/v1/openclaw/link/pairing-sessions
    ↓
3. 服务器返回 pairingSessionId + pairingToken
    ↓
4. 生成二维码（含 pairingSessionId）
    ↓
5. 用户用 App 扫描二维码
    ↓
6. App 连接 Relay 完成配对
    ↓
7. 调用 bootstrap API 完成注册
   POST /api/v1/openclaw/link/bootstrap
    ↓
8. 获得 refreshToken + accessToken
    ↓
9. 启动 Daemon 后台运行
    ↓
10. 询问是否开机自启
```

---

## 🌐 Relay 服务器 API 端点

所有请求发往 **`home.clawpilot.me`** 或类似域名：

| API 端点 | 方法 | 用途 |
|---------|------|------|
| `/api/v1/openclaw/link/pairing-sessions` | POST | 创建配对会话 |
| `/api/v1/openclaw/link/bootstrap` | POST | 引导完成配对 |
| `/api/v1/openclaw/link/access-token` | POST | 获取访问令牌 |
| `/api/v1/openclaw/link/status` | POST | 上报 Link 状态 |

---

## 💻 Link Daemon 启动后做什么

### 1. 启动本地 WebSocket 服务器
```
端口：52378
用途：局域网内 App 直连
```

### 2. 连接到 ClawPilot Relay 服务器
```
WebSocket 连接到：
wss://relay.clawpilot.com/link/connect

携带信息：
- accessToken
- 设备 ID
- 版本号
- 能力列表
```

### 3. 连接到本地 OpenClaw Gateway
```
ws://localhost:18789
```

### 4. 消息中转
```
App → Relay → Link Daemon → OpenClaw
                ↓ 转发
App ← Relay ← Link Daemon ← OpenClaw
```

---

## 🔒 安全机制

### 1. 设备身份
```javascript
// src/device-identity.js
- 生成公私钥对 (tweetnacl)
- 每台 Link 有唯一身份
- 签名验证消息
```

### 2. 连接令牌
```javascript
// src/connect-token.js
- 短期令牌
- 本地验证
- 防重放攻击
```

### 3. Access Token
```
- 定期刷新（60秒阈值）
- 过期前自动重新获取
```

---

## 📝 关键配置文件位置

```
~/.openclaw/
└── plugins/
    └── clawpilot-link/
        ├── config.json     # Link 配置
        ├── state.json      # 运行状态
        ├── credentials.json # 令牌、密钥
        └── logs/           # 日志文件
```

---

## 🚀 CLI 命令清单

| 命令 | 作用 |
|------|------|
| `clawlink help` | 帮助 |
| `clawlink version` | 版本 |
| `clawlink pair` | 配对（首次用） |
| `clawlink start` | 启动 Daemon |
| `clawlink status` | 查看状态 |
| `clawlink doctor` | 健康检查 |
| `clawlink restart` | 重启 |
| `clawlink stop` | 停止 |
| `clawlink autostart on/off` | 开机自启 |
| `clawlink uninstall --yes` | 卸载 |

---

## 📊 发现的依赖

```json
{
  "json5": "^2.2.3",        // 读配置
  "qrcode-terminal": "^0.12.0", // 终端二维码
  "tweetnacl": "^1.0.3",    // 加密
  "ws": "^8.18.3"           // WebSocket
}
```

---

## 🎯 对我们项目的启示

### 要做的事

#### 1. **架构改成：独立 npm 包（不是插件！）**
```
npm install -g @mypilot/link    # 对标 @clawpilot-app/link
mypilot pair                     # 对标 clawlink pair
```

#### 2. **三层架构**
- **Layer 1**: MyPilot Link Daemon（52378 端口）
- **Layer 2**: 我们自己的 Relay 服务器（可选）
- **Layer 3**: OpenClaw Gateway

#### 3. **核心组件**
```
src/
├── cli.js          # CLI 入口
├── daemon.js       # 守护进程
├── openclaw.js     # Gateway 通信
├── network.js      # 网络发现
├── server-api.js   # 我们的 Relay API（如果做）
├── runtime.js      # 配置、状态
└── autostart.js    # 开机自启
```

---

## ✅ 我们可以复用的代码

**不需要从零开始！** ClawPilot Link 是 **MIT 协议** 的开源代码！

我们可以：
1. ✅ 直接复用 `daemon.js` 的 WebSocket 转发逻辑
2. ✅ 直接复用 `openclaw.js` 的协议实现
3. ✅ 直接复用 `network.js` 的网络发现
4. ✅ 直接复用 `autostart.js` 的自启逻辑
5. ✅ 直接复用 `runtime.js` 的配置管理

---

## 📁 我们的新架构

```
mypilot-link/
├── package.json
├── src/
│   ├── cli.js              # CLI 入口
│   ├── daemon.js           # 守护进程
│   ├── openclaw.js        # OpenClaw 连接（直接抄！）
│   ├── network.js         # 网络（直接抄！）
│   ├── runtime.js        # 配置状态（直接抄！）
│   ├── autostart.js      # 开机自启（直接抄！）
│   ├── device-identity.js # 设备身份（直接抄！）
│   └── constants.js
└── README.md
```

---

## 🎉 结论

**我们之前走偏了！**

|  | 之前（错误） | 现在（正确，学 ClawPilot） |
|---|------------|--------------------------|
| 架构 | OpenClaw 插件 | 独立 npm 包 daemon |
| 安装 | `openclaw plugins install` | `npm install -g` |
| 端口 | 复用 18789 | 独立 52378 |
| 进程 | Gateway 内 | 独立进程 |

**好处：**
- 不侵入 OpenClaw 代码
- 可以管理**多个** OpenClaw 实例（甚至不同服务器的）
- 升级、卸载不影响 OpenClaw
- 完全和 ClawPilot 功能对齐

---

*分析完毕，开始重构！*
