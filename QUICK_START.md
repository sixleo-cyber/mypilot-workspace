# 🦐 ClawLink 快速开始指南

> 自研 ClawPilot 客户端 - 私有化 OpenClaw 管理方案
> **版本**：v1.0 | **日期**：2026-05-26

---

## 📦 已创建的内容

### 1. 云端服务：clawlink-server
**位置**：`clawlink-server/`

**功能**：
- ✅ 管理多个 OpenClaw 实例
- ✅ WebSocket 实时通信
- ✅ 配对码生成与验证
- ✅ 实例状态监控

### 2. 开发计划
**位置**：`DEVELOPMENT_PLAN_V2.md`

**内容**：
- 完整系统架构
- API 接口规范
- 部署指南
- 开发阶段规划

---

## 🚀 快速开始

### 第一步：在云服务器部署 ClawLink

```bash
# 1. 通过 SSH 连接到你的云服务器
ssh root@你的服务器IP

# 2. 创建项目目录
mkdir -p /opt/clawlink
cd /opt/clawlink

# 3. 上传代码（选择一种方式）

# 方式 A: 如果你本地有代码，使用 scp 上传
# 在本地电脑执行：
scp -r ./clawlink-server/* root@你的服务器IP:/opt/clawlink/

# 方式 B: 如果你能访问 Git，创建 Git 仓库后拉取
git clone <你的仓库地址> /opt/clawlink

# 4. 安装依赖
cd /opt/clawlink
npm install

# 5. 启动服务
npm start

# 6. 测试是否运行成功
curl http://localhost:52378/health
```

**预期输出**：
```json
{
  "status": "ok",
  "version": "1.0.0",
  "instances": 0,
  "connections": 0
}
```

---

### 第二步：配置开机自启

```bash
# 创建 systemd 服务文件
sudo nano /etc/systemd/system/clawlink.service
```

粘贴以下内容：
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

保存退出（Ctrl+X → Y → Enter），然后：

```bash
# 启用服务
sudo systemctl enable clawlink

# 启动服务
sudo systemctl start clawlink

# 检查状态
sudo systemctl status clawlink
```

---

### 第三步：开放防火墙端口

```bash
# 开放 52378 端口
sudo ufw allow 52378/tcp

# 如果使用云服务器，还需要：
# 在云平台控制台 → 安全组 → 添加规则
# 端口：52378
# 协议：TCP
```

---

### 第四步：添加 OpenClaw 实例

```bash
# 在你的电脑或服务器上执行
curl -X POST http://localhost:52378/api/instances \
  -H "Content-Type: application/json" \
  -d '{
    "name": "火虾服务器",
    "gatewayUrl": "http://118.145.240.41:18789",
    "authToken": "你的Token"
  }'
```

**查看所有实例**：
```bash
curl http://localhost:52378/api/instances
```

---

## 📱 客户端开发（进行中）

**下一步**：开发 iPad/Mac 客户端 App（SwiftUI）

客户端需要实现的功能：
- [x] 项目结构设计
- [ ] 连接 ClawLink 服务
- [ ] 聊天界面
- [ ] 实例管理
- [ ] 配对码扫码

**预计完成时间**：1-2 周

---

## ❓ 常见问题

### Q1: 服务启动失败
```bash
# 检查 Node.js 版本
node -v
# 需要 18.0+

# 检查端口是否被占用
lsof -i :52378

# 查看详细错误
npm start
```

### Q2: 无法访问服务
```bash
# 检查防火墙
sudo ufw status

# 检查服务是否运行
sudo systemctl status clawlink

# 查看日志
journalctl -u clawlink -f
```

### Q3: 实例连接失败
```bash
# 测试 OpenClaw Gateway 是否可达
curl http://你的OpenClaw服务器:18789/health

# 检查 Token 是否正确
curl http://localhost:52378/api/instances
# 查看返回的 authToken 是否正确
```

---

## 🔧 常用命令

```bash
# 启动服务
sudo systemctl start clawlink

# 停止服务
sudo systemctl stop clawlink

# 重启服务
sudo systemctl restart clawlink

# 查看状态
sudo systemctl status clawlink

# 查看实时日志
journalctl -u clawlink -f

# 查看 API 文档
curl http://localhost:52378/health
```

---

## 📊 API 端点

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/health` | 健康检查 |
| GET | `/api/instances` | 获取实例列表 |
| POST | `/api/instances` | 添加实例 |
| DELETE | `/api/instances/:id` | 删除实例 |
| POST | `/api/instances/:id/test` | 测试连接 |
| POST | `/api/pairing/generate` | 生成配对码 |
| POST | `/api/pairing/verify` | 验证配对码 |
| GET | `/api/status` | 服务状态 |

---

## 🛡️ 安全建议

1. **配置 HTTPS**（生产环境）
   ```bash
   # 使用 Nginx 反向代理 + Let's Encrypt 证书
   # （后续会提供详细配置）
   ```

2. **设置访问密码**
   - 在 `src/index.js` 中添加 Basic Auth
   - 或使用 Nginx 认证

3. **定期更新**
   ```bash
   cd /opt/clawlink
   git pull
   npm install
   sudo systemctl restart clawlink
   ```

---

## 📞 获取帮助

如果遇到问题：
1. 查看日志：`journalctl -u clawlink -f`
2. 检查服务状态：`sudo systemctl status clawlink`
3. 测试 API：`curl http://localhost:52378/health`

---

## ⏭️ 下一步

1. ✅ 部署 ClawLink 服务
2. ⏳ 添加 OpenClaw 实例
3. ⏳ 开发客户端 App（进行中）
4. ⏳ 测试完整流程

**客户端开发进度**：30%（已完成项目结构设计和部分代码）

---

*文档版本：v1.0 | 更新：2026-05-26*

