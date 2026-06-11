# 图片发送修复 — daemon 重启 + Capabilities 补齐

## 一、根因分析

经过完整代码审查，发现两层问题：

### 问题 1（已修复，待重启生效）

daemon.js 的 `sendToGateway` 中，图片被构建为 ContentPart **数组** `[{type:"image",...}]`，但 Gateway 的 `chat.send` schema 要求 `params.message` 为**字符串**。

✅ 已在 [daemon.js:L501-L533](file:///Users/liaoxing/Downloads/未命名文件夹/mypilot-link/src/daemon.js#L501-L533) 修复：图片转为 `![](data:image/png;base64,...)` Markdown 内联格式，message 始终为字符串。

**但这个修复尚未生效** — daemon 在远端服务器 118.145.240.41 上运行，需要重启。

### 问题 2（新发现）：缺失 media Capabilities

查看 daemon 的 Gateway 连接声明（[constants.js](file:///Users/liaoxing/Downloads/未命名文件夹/mypilot-link/src/constants.js#L17-L19)）：

```javascript
export const LOCAL_GATEWAY_CAPS = ["tool-events"];
```

daemon 只声明了 `tool-events` 能力，**没有声明任何 media/image 相关能力**。Gateway 根据 client 声明的 caps 决定是否启用媒体处理通道。这就像飞书频道需要注册 channel plugin 才能收发图片一样——daemon 需要在 connect 时告诉 Gateway "我能处理图片"。

### 问题 3：模型可能不支持 Vision

即使协议层问题都解决，当前使用的模型如果不是 vision 模型（如 `claude-sonnet-4-6` 有 vision），Gateway 也不会将图片传给模型。

## 二、修复方案（三步）

### Step 1：重启远端 daemon（让已修复的代码生效）

```bash
ssh root@118.145.240.41 "mypilot restart"
```

如果 `mypilot restart` 不可用，手动重启：

```bash
ssh root@118.145.240.41
pkill -f "daemon.js"  # 或 ps aux | grep node 找到进程号
cd /path/to/mypilot-link && node src/cli.js daemon &
```

**前提**：修复后的 daemon.js 需要先传到服务器上。

### Step 2：补齐 media Capabilities

修改 [constants.js](file:///Users/liaoxing/Downloads/未命名文件夹/mypilot-link/src/constants.js#L18)：

```javascript
// 之前
export const LOCAL_GATEWAY_CAPS = ["tool-events"];

// 之后
export const LOCAL_GATEWAY_CAPS = ["tool-events", "media"];
```

在 Gateway 协议中，client caps 告诉 Gateway 客户端支持什么功能。`"media"` cap 告诉 Gateway "这个客户端可以收发媒体文件"，Gateway 才会从 `params.message` 字符串中提取和解析 data: URI 图片。

### Step 3：确保使用 Vision 模型

验证当前使用的模型是否支持 vision：
- `claude-sonnet-4-6` ✅ 支持
- `claude-haiku-4-6` ✅ 支持  
- `gpt-4o` / `gpt-5.4` ✅ 支持
- `deepseek-v3` / `qwen-turbo` 等 ❌ 不支持

在 App 中切换到一个 vision 模型（ModelPickerView），或在 Gateway 配置中确认默认模型：

```bash
ssh root@118.145.240.41 "openclaw config get agents.defaults.model.primary"
```

## 三、文件变更

| 文件 | 操作 | 说明 |
|------|------|------|
| `mypilot-link/src/constants.js` | 修改 | `LOCAL_GATEWAY_CAPS` 添加 `"media"` |
| `mypilot-link/src/daemon.js` | 已修改 | sendToGateway 图片转 Markdown 内联（需要传到服务器） |

## 四、部署步骤

1. 将修改后的 `constants.js` 和 `daemon.js` 传到服务器
2. 重启 daemon
3. 在 App 中切换到 vision 模型
4. 发送图片测试

## 五、验证

1. 发送带图片消息 → 不再出现 `must be string` 错误
2. 询问 AI "描述你看到的图片" → AI 正确描述图片内容
