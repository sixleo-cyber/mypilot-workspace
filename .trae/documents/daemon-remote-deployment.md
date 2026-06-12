# Daemon 远端部署

## 概要

将本地 mypilot-link 最新代码部署到远端服务器 118.145.240.41，使 P11-2（agent.created 通知）和 P11-3（agent.status 工具调用状态）功能在远端生效。

## 当前状态

- 远端 daemon 版本 1.0.0，pid=3298729，Gateway 已连接
- 本地 daemon 版本 0.8.0（包含 P11-2/P11-3 新功能）
- 远端 daemon 目录：`/root/mypilot-link/src/`
- 部署方式：scp 上传 + tmux 重启

## 需要部署的文件

本地 `mypilot-link/src/` 下的非测试 JS 文件：

1. `daemon.js` — 核心改动：knownAgentIds 缓存、checkForNewAgents()、agent.status frame 转发、agents.delete 参数修正
2. `scheduler.js` — 定时任务调度器增强
3. `runtime.js` — 运行时工具函数
4. `constants.js` — 常量定义
5. `cli.js` — CLI 入口
6. `connect-token.js` — 连接令牌
7. `device-identity.js` — 设备身份
8. `network.js` — 网络工具
9. `openclaw.js` — OpenClaw 配置检测
10. `search-providers.js` — 搜索提供商

**不需要部署**：`*.test.js` 测试文件

## 部署步骤

### 1. 上传源文件

```bash
scp src/daemon.js src/scheduler.js src/runtime.js src/constants.js src/cli.js src/connect-token.js src/device-identity.js src/network.js src/openclaw.js src/search-providers.js root@118.145.240.41:/root/mypilot-link/src/
```

### 2. 重启 daemon

```bash
ssh root@118.145.240.41
tmux attach -t mypilot  # 或 tmux new -s mypilot
# Ctrl+C 停止当前 daemon
node src/cli.js daemon
```

### 3. 验证

```bash
curl http://118.145.240.41:52378/api/info
# 确认 gatewayConnected=true
# 确认版本号更新
```

## 风险

- 远端 daemon 版本号是 1.0.0，本地是 0.8.0，可能远端有自己的 package.json 版本设置
- 上传时不要覆盖远端的 `package.json`、`node_modules/`、`schedules.json` 等本地状态文件
- 只上传 `src/*.js` 非测试文件
