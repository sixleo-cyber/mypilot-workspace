# sessions.abort 参数名修复

## 一、根因

[daemon.js:L739](file:///Users/liaoxing/Downloads/未命名文件夹/mypilot-link/src/daemon.js#L739)：

```javascript
sendGatewayRpc(ws, deviceIdParam, "sessions.abort", { sessionKey: sk }, frame.id);
//                                                       ^^^^^^^^^^ 错误！
```

Gateway 报错明确说了：`must have required property 'key'; at root: unexpected property 'sessionKey'`。daemon 传了 `sessionKey` 但 Gateway schema 期望 `key`。

**后果**：abort 失败 → 会话状态卡在 running → 后续 `chat.send` 被拒绝（因为旧 run 未结束）。

## 二、修复

[daemon.js:L739](file:///Users/liaoxing/Downloads/未命名文件夹/mypilot-link/src/daemon.js#L739)：

```javascript
// 修改前
sendGatewayRpc(ws, deviceIdParam, "sessions.abort", { sessionKey: sk }, frame.id);

// 修改后
sendGatewayRpc(ws, deviceIdParam, "sessions.abort", { key: sk }, frame.id);
```

## 三、部署

scp + 重启 daemon。

## 四、用户操作

修复部署后，把卡住的会话删掉重新对话即可（或在 App 中切换到一个新会话）。
