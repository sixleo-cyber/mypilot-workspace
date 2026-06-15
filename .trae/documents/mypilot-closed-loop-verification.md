# MyPilot Mac App + 远端 mypilot-link 闭环验证

## 结论：技术上已实现闭环

完整连接链路：
```
Mac App → WebSocket → 远端 mypilot-link (0.0.0.0:52378) → WebSocket → OpenClaw Gateway
```

## 闭环验证清单

### 1. Daemon 端（服务器侧） ✅
- **监听地址**：`0.0.0.0:52378`（监听所有网卡，支持远程连接）
- **API 端点**：
  - `GET /api/health` — 健康检查
  - `POST /api/pair/generate` — 生成配对码
  - `POST /api/pair/verify` — 验证配对码，返回 deviceId + token
  - `GET /api/info` — 服务器信息
  - `GET /api/config` — 配置读取
  - `POST /api/upload` — 文件上传（需 Bearer token）
  - `WS /?deviceId=xxx&token=xxx` — App WebSocket 连接（需认证）
- **认证机制**：配对码 → deviceId + token，WebSocket 连接时验证
- **Gateway 连接**：`ws://127.0.0.1:${gatewayConfig.port}`，带 token + 签名设备身份

### 2. Mac App 端 ✅
- **添加实例**：`AddInstanceView` — 输入服务器 URL → 健康检查 → 输入配对码 → 验证 → 保存 Instance
- **Instance 模型**：包含 `serverURL`、`deviceId`、`token`
- **连接管理**：`ConnectionManager` 用 `instance.wsURL` + deviceId + token 建立 WebSocket
- **消息收发**：`WebSocketService` 完整实现 chat.send/chat.final/agent.lifecycle 等
- **文件上传**：`APIService.uploadFile` 带 Bearer token
- **QR 扫码**：支持 `mypilot://pair?code=xxx&host=xxx` 格式

### 3. 安装部署 ✅
- **npm 安装**：`npm install -g git+https://github.com/sixleo-cyber/mypilot-link.git`
- **启动**：`mypilot daemon` 或 `mypilot start`
- **配对**：`mypilot pair` 生成配对码
- **Mac App**：已构建 Release .app

## 潜在问题（非阻断性）

### P2: HTTPS / 安全性
- 当前 Daemon HTTP 服务是明文（无 TLS）
- WebSocket 连接 `ws://` 而非 `wss://`
- Token 在 URL query 参数中传输
- **影响**：公网部署时存在中间人攻击风险
- **建议**：生产环境使用 Nginx/Caddy 反向代理 + TLS

### P2: CORS
- Daemon 未设置 CORS 头
- **影响**：浏览器无法直接调用 API（但 Mac App 不受影响，URLSession 不受 CORS 限制）

### P3: 防火墙
- 服务器需开放 52378 端口
- **建议**：在 AddInstanceView 的提示文字中补充防火墙提醒

## 验证步骤（可在另一台 Mac 上执行）

1. 服务器安装 mypilot-link：
   ```bash
   npm install -g git+https://github.com/sixleo-cyber/mypilot-link.git
   ```
2. 配置 OpenClaw Gateway（确保 `~/.openclaw/` 下有配置）
3. 启动 daemon：
   ```bash
   mypilot start
   ```
4. 确认运行：
   ```bash
   curl http://服务器IP:52378/api/health
   ```
5. Mac App 添加实例：输入 `http://服务器IP:52378`
6. 服务器终端执行 `mypilot pair` 获取配对码
7. Mac App 输入配对码完成配对
8. 开始对话

## 需要修复的小问题

1. **AddInstanceView 安装提示文字**：当前写的是 `npm install -g @mypilot/link`（npm registry 不存在），应改为 `npm install -g git+https://github.com/sixleo-cyber/mypilot-link.git`
2. **mypilot CLI 版本号**：`mypilot --version` 不支持，建议添加
