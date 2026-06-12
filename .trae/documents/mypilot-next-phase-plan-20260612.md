# MyPilot P7 开发计划：daemon 测试 + 日志增强

## Summary

P7 聚焦 daemon 端两个方向：1) 补齐 WebSocket 协议层测试空白（当前最大测试盲区）；2) 增强 daemon 日志 API 能力（级别过滤、时间范围查询、连接事件记录）。

## Current State Analysis

### 已有 daemon 测试
- `daemon-http.test.js` — HTTP 端点测试（CORS、health、info、config、upload、workspace-files 等），使用 `handleHttpRequest` mock
- `daemon-api.test.js` — 工具函数测试（getMimeType、stripThinkingTags、extractContentParts、setNestedValue、getNestedValue）
- `daemon-utils.test.js` — 30 项边界测试
- `scheduler.test.js` — 15 项调度器测试
- `device-identity.test.js` — 7 项设备身份测试
- `connect-token.test.js` — 9 项连接令牌测试
- `search-providers.test.js` — 6 项加密测试
- `search-providers-business.test.js` — 15 项业务逻辑测试

### 测试盲区
**WebSocket 协议层完全没有测试**。当前 daemon 的核心功能（chat.send → stream → done、RPC 往返、schedule.* 操作、设备配对）全部通过 WebSocket 通信，但没有任何自动化测试覆盖。

### 日志 API 现状
- `/api/logs` 已存在，支持 `source` 和 `limit` 参数
- `readLinkLogSnapshot()` 从 runtime.js 导出，支持读取日志文件尾部
- **不支持**：日志级别过滤、时间范围查询
- **缺少**：客户端连接/断开/重连事件记录

---

## Proposed Changes

### P7-1：daemon WebSocket 协议测试

**文件**: `mypilot-link/src/daemon-ws.test.js`（新建）

**测试策略**: 使用 `ws` 库创建真实 WebSocket 客户端连接到临时 daemon 实例，测试完整的 WS 协议交互。

**测试场景**:

1. **连接握手**
   - 无 token 连接被拒绝或降级
   - 有效 token 连接成功，收到 `hello` 消息
   - 重复 deviceId 连接处理

2. **chat.send → stream → done 完整流程**
   - 发送 chat.send，收到 chat.delta 流式消息
   - 收到 chat.final 或 agent.lifecycle.end 后状态正确
   - 空 content 发送被拒绝

3. **RPC 往返**
   - `config.get` 返回配置
   - `config.set` 修改配置并持久化
   - `agents.list` 返回 Agent 列表
   - `models.list` 返回模型列表
   - 无效 RPC method 返回错误响应
   - RPC 请求-响应 id 匹配

4. **schedule.* RPC**
   - `schedule.list` 返回任务列表 + crontabTasks
   - `schedule.create` 创建任务并返回
   - `schedule.update` 更新任务字段
   - `schedule.delete` 删除任务
   - `schedule.run` 手动触发任务
   - 非法 cron 表达式创建失败
   - 缺失 id 的更新/删除失败
   - 重复删除不报错

5. **断线重连**
   - 客户端断开后重连，daemon 仍可接受新消息
   - 多客户端连接隔离

**实现方式**:
- 启动临时 daemon 实例在随机端口
- 使用 `ws` 库创建客户端连接
- 每个测试用例独立，测试后关闭连接
- 需要模拟 Gateway 或使用真实 Gateway（取决于测试环境）

**替代方案**（如果模拟 Gateway 太复杂）:
- 将 WebSocket 消息处理逻辑提取为可独立测试的函数
- 直接测试 `handleWsMessage(frame, ws)` 的输入输出
- 不启动真实 HTTP/WS 服务器，仅测试消息路由逻辑

**验收**: `npm run verify` 通过，新增 ≥20 个 WS 协议测试用例

---

### P7-2：daemon 日志与监控增强

**文件**:
- `mypilot-link/src/daemon.js` — 修改 `/api/logs` 端点
- `mypilot-link/src/runtime.js` — 修改 `readLinkLogSnapshot()` 支持过滤
- `mypilot-link/src/daemon-http.test.js` — 新增日志 API 测试

**P7-2a: 日志级别过滤**

修改 `/api/logs` 端点，支持 `level` 查询参数：
- `GET /api/logs?level=error` — 只返回 error 级别日志
- `GET /api/logs?level=warn` — 只返回 warn 及以上级别
- `GET /api/logs?level=info` — 返回所有级别（默认行为）
- 支持多级别：`?level=error,warn`

修改 `readLinkLogSnapshot()`:
- 新增 `level` 参数
- 解析每行日志的 `level` 字段进行过滤
- 过滤在读取后、截断前执行

**P7-2b: 时间范围查询**

修改 `/api/logs` 端点，支持时间参数：
- `GET /api/logs?since=2026-06-12T00:00:00Z` — 只返回该时间之后的日志
- `GET /api/logs?until=2026-06-12T23:59:59Z` — 只返回该时间之前的日志
- 解析每行日志的 `ts` 字段进行过滤

**P7-2c: 连接事件日志**

在 daemon.js 中增加连接事件日志：
- 客户端连接时：`[daemon] Client connected: deviceId=xxx`
- 客户端断开时：`[daemon] Client disconnected: deviceId=xxx, reason=xxx`
- 重连时：`[daemon] Client reconnected: deviceId=xxx`

**验收**:
- `GET /api/logs?level=error` 只返回 error 级别日志
- `GET /api/logs?since=xxx` 只返回指定时间之后的日志
- 客户端连接/断开时日志中有对应记录
- `npm run verify` 通过

---

## 实施顺序

```
P7-1 (WS 协议测试) ──→ P7-2a (级别过滤) ──→ P7-2b (时间范围) ──→ P7-2c (连接事件)
```

P7-1 优先，因为测试覆盖是最重要的基线。P7-2 的三个子项可以连续推进。

---

## Assumptions & Decisions

1. P7-1 的 WS 测试优先采用"提取消息处理函数 + 直接测试"方式，避免需要模拟 Gateway 的复杂性
2. 日志级别过滤基于每行 JSON 日志的 `level` 字段，兼容非 JSON 行（保留）
3. 时间过滤基于 `ts` 字段（ISO 8601 格式），缺失 ts 的行保留
4. 连接事件日志不暴露 token、密钥等敏感信息
5. 所有改动通过 `npm run verify` 验证

## Verification

```bash
cd /Users/liaoxing/Downloads/未命名文件夹/mypilot-link
npm run verify
```
