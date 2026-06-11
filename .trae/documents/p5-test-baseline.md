# P5: 测试与回归基线

## Summary

补齐 daemon HTTP API 协议测试和 Swift 核心服务测试增强，建立回归基线。

## Current State

- daemon 测试: 7 个 .test.js 文件，140 tests — 但 HTTP API 层无测试覆盖
- Swift 测试: 14 个测试文件，97 tests — ConnectionManager、AttachmentTransport 场景不够
- WebSocket 协议层零测试覆盖

## Proposed Changes

### P5-1: daemon HTTP API 协议测试

**文件**: `mypilot-link/src/daemon-api.test.js`（新建）

测试内容：
- `/api/health` — 返回结构、gatewayConnected 状态
- `/api/info` — packageName、flavor、version 字段
- `/api/config` — 读取成功、API key 脱敏
- `/api/logs` — 基础返回格式
- `/api/workspace-files` — 路径边界（不允许越权访问）
- `/api/upload` — 错误路径（无文件、非法类型）

测试方式：启动 daemon HTTP server，用 node:http 发请求验证响应。参考现有 `daemon-utils.test.js` 模式。

### P5-2: Swift 核心服务测试增强

**文件**: 补充现有测试文件

增强内容：
- `ConnectionManagerTests.swift` — 重连退避计算、风暴检测逻辑、pending queue flush
- `AttachmentTransportTests.swift` — 多附件发送、base64 fallback 路径
- `ChatStreamHandlerTests.swift` — delta 合并、thinking 过滤、done 触发

### P5-3: 端到端回归记录模板

**文件**: `.trae/documents/e2e-regression-checklist.md`（已存在，需更新）

更新内容：基于最新功能状态，更新 20 个回归场景

## Verification

1. `npm run verify` 通过，测试数 ≥150
2. Swift 测试编译通过
3. 回归模板文件更新完成
