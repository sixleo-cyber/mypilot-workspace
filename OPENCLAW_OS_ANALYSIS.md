# 🔬 OpenClaw OS 技术原理深度分析

> **项目地址**：https://github.com/thesysdev/openclaw-os
> **分析时间**：2026-05-26
> **分析目的**：参考其架构设计，指导我们自研客户端的开发

---

## 📌 一句话总结

**OpenClaw OS 不是一个独立的 Web 应用，而是一个"OpenClaw 插件"**——它把整个工作空间 UI 打包成插件，让 OpenClaw Gateway 直接对外提供网页服务，浏览器访问后通过同源 WebSocket 与 Gateway 通信，实现 Agent 对话和动态 UI 渲染。

---

## 一、整体架构

### 1.1 架构图

```
┌─────────────────────────────────────────────────────────┐
│              你的浏览器（iPad/Mac/手机）                  │
│  ┌───────────────────────────────────────────────────┐ │
│  │       claw-client（Next.js 静态导出）              │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────┐ │ │
│  │  │ 侧边栏       │  │ 聊天界面     │  │ 应用面板  │ │ │
│  │  │ Agents 列表 │  │ OpenUI 渲染 │  │ 设置等   │ │ │
│  │  └─────────────┘  └─────────────┘  └──────────┘ │ │
│  └─────┬─────────────────────────────────────────────┘ │
│        │ 同源 WebSocket                                │
└────────┼─────────────────────────────────────────────────┘
         │ HTTP（GET 加载 UI）+ WebSocket（聊天通信）
         ↓
┌─────────────────────────────────────────────────────────┐
│              云服务器（运行 OpenClaw Gateway）            │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │            OpenClaw Gateway 进程                 │   │
│  │  ┌─────────────────────────────────────────┐   │   │
│  │  │   claw-plugin (OpenClaw 插件)            │   │   │
│  │  │  ┌─────────────────────────────────┐   │   │   │
│  │  │  │ 1. HTTP 路由                      │   │   │   │
│  │  │  │    /plugins/openclawos           │   │   │   │
│  │  │  │    （服务静态 UI 文件）           │   │   │   │
│  │  │  └─────────────────────────────────┘   │   │   │
│  │  │  ┌─────────────────────────────────┐   │   │   │
│  │  │  │ 2. before_prompt_build 钩子      │   │   │   │
│  │  │  │    （注入 OpenUI Lang 提示词）    │   │   │   │
│  │  │  └─────────────────────────────────┘   │   │   │
│  │  │  ┌─────────────────────────────────┐   │   │   │
│  │  │  │ 3. 工具/存储                     │   │   │   │
│  │  │  │    apps/artifacts/notifications  │   │   │   │
│  │  │  └─────────────────────────────────┘   │   │   │
│  │  │  ┌─────────────────────────────────┐   │   │   │
│  │  │  │ 4. CLI 命令                      │   │   │   │
│  │  │  │    openclaw os url               │   │   │   │
│  │  │  └─────────────────────────────────┘   │   │   │
│  │  └─────────────────────────────────────────┘   │   │
│  │                    ↓                            │   │
│  │  ┌─────────────────────────────────────────┐   │   │
│  │  │   Agent 系统（main, helper, ...）        │   │   │
│  │  │   会话管理（sessions）                    │   │   │
│  │  │   WebSocket 协议处理                     │   │   │
│  │  └─────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          ↓
                  调用 LLM API
              （智谱/豆包/Claude 等）
```

### 1.2 两大核心包

| 包名 | 角色 | 技术栈 |
|------|------|--------|
| **@openuidev/openclaw-os-plugin** | OpenClaw 插件层 | TypeScript + esbuild |
| **@openuidev/claw-client** | 工作空间前端 UI | Next.js 16 + React 19 |

**关键设计**：两个包**捆绑发布**——前端静态导出后被打包到插件里，由 Gateway 直接对外服务。

---

## 二、claw-plugin（插件层）技术原理

### 2.1 它做的四件事

#### ① 服务工作空间 UI（HTTP 路由）
```typescript
// 注册 HTTP 路由
api.registerHttpRoute('/plugins/openclawos', (req, res) => {
  // 从插件的 static/ 目录读取 Next.js 静态导出的文件
  // 处理 MIME 类型
  // 防止路径穿越攻击
});
```

**精妙之处**：
- ❌ 不需要单独的 Next.js 进程
- ❌ 不需要反向代理（Nginx）
- ❌ 不需要解决 CORS
- ❌ 不需要内网穿透（tunnel）
- ✅ 直接复用 Gateway 的 HTTP 服务

#### ② 注入 OpenUI 系统提示词（before_prompt_build 钩子）
```typescript
// 当用户发消息时，钩子被触发
api.registerHook('before_prompt_build', (context) => {
  // 检查会话 key 是否以 :openclaw-os 结尾
  if (context.sessionKey.endsWith(':openclaw-os')) {
    // 在系统提示词前注入完整的 OpenUI Lang 规范
    return prependOpenUILangSpec(context.prompt);
  }
  return context.prompt;
});
```

**作用**：
- 告诉 LLM："你可以用 OpenUI Lang 这种格式输出 UI 组件"
- LLM 就会用结构化的标记语言流式输出 React 组件
- 前端实时解析渲染

#### ③ 提供持久化 UI 原语
插件维护了 4 个存储：

| 存储 | 用途 |
|------|------|
| **app-store** | Agent 创建的可重复打开的"应用"（仪表板、追踪器） |
| **artifact-store** | 文档、代码等"工件"（用 SQLite 持久化） |
| **notification-store** | 通知 |
| **upload-store** | 上传的文件 |

#### ④ 注册 CLI 命令
```bash
openclaw os url
# 输出：http://localhost:18789/plugins/openclawos?token=xxx
# 可以直接打开浏览器使用
```

### 2.2 两种 UI 表面（精妙设计）

| UI 类型 | 描述 | 加载方式 |
|---------|------|---------|
| **Inline UI** | 一次性 UI（图表、表格、表单） | **每次对话都注入**（spec 比较小） |
| **Durable Apps** | 持久化应用（仪表板、命令中心） | **按需加载**（用 `before_tool_call` 钩子门控） |

**为什么这样设计？**
- Inline UI 几乎每次回复都需要 → 直接嵌入提示词
- Durable Apps 只有少数情况需要 → 不浪费 token，让 LLM 主动读 SKILL.md

---

## 三、claw-client（前端）技术原理

### 3.1 技术栈

| 层 | 技术 |
|---|------|
| **框架** | Next.js 16（App Router）+ React 19 |
| **样式** | Tailwind CSS 3 + Radix UI |
| **OpenUI 渲染** | @openuidev/react-lang + react-ui + react-headless |
| **搜索** | fuse.js + cmdk |
| **加密** | @noble/ed25519, @noble/hashes（Gateway 认证用） |
| **构建** | Next.js 静态导出（`output: "export"`）|
| **可选部署** | Cloudflare Workers via @opennextjs/cloudflare |

### 3.2 核心特性

#### ① 流式聊天界面
```
LLM 输出 token →
前端解析 OpenUI Lang →
实时渲染 React 组件 →
用户看到 UI 一边生成一边出现
```

**OpenUI Lang 比 JSON 更高效**：
- 流式输出（一边生成一边渲染）
- 比 JSON 节省 67% 的 token
- 类型化组件契约（用 Zod 校验）
- 受控渲染（只能用预定义的组件库）

#### ② 多 Agent 侧边栏
Gateway 暴露的每个 Agent 都显示为一个独立的 thread（会话）。

#### ③ 同源认证
当从插件提供服务时，浏览器和 WebSocket 都是**同源**的：
- 无 CORS
- 无需手动设置认证
- WebSocket 自动复用 Gateway 的认证

### 3.3 项目结构

```
src/
├── app/              # Next.js App Router 页面
├── components/       # React 组件（聊天、侧边栏、设置、artifacts）
├── lib/              # Gateway 客户端、hooks、聊天引擎、命令处理
│   └── gateway/
│       └── types.ts  # ⚠️ 内联了 OpenClaw 协议类型（OpenClaw 不公开导出）
└── types/            # 共享 TypeScript 接口
```

**重要细节**：
- OpenClaw 不公开导出 Gateway 协议类型
- 所以 claw-client 直接**复制了 OpenClaw 源码中的类型定义**
- 文件里有注释指向上游源码

---

## 四、通信协议和消息流

### 4.1 会话模型（Agents → Sessions → Threads）

#### Agent
```
- 在 Gateway 配置中定义的 AI 角色
- 例如：main、helper、support
- 固定的，客户端不能创建/删除
```

#### Session（会话）
**会话 key 的格式**：
```
agent:<agentId>:<channel>:<senderId?>
```

例如：
```
agent:main:main:openclaw-os
       ↑    ↑       ↑
     agent  channel  发送者后缀
```

**关键设计**：
- `<senderId>` 可以隔离不同客户端的对话历史
- 不带后缀 = 共享历史（和 CLI 共用）
- 带 `:openclaw-os` 后缀 = 独立历史

#### Thread（线程）
**前端概念**，1:1 映射到 session key。

#### 当前实现的映射
```
Agent ID（从 agents.list 获取）
   ↓
session key：agent:<id>:main:openclaw-os
   ↓
侧边栏中的一个 thread
   ↓
chat.history 拉取该 key 的消息
chat.send 写入消息到该 key
```

### 4.2 插件检测机制（精妙！）

**问题**：如何让插件只对 OpenClaw OS 客户端生效，不影响 CLI 和其他客户端？

**解决方案**：
1. 客户端在 session key 末尾追加 `:openclaw-os` 后缀
2. 插件的 `before_prompt_build` 钩子检查这个后缀
3. 只在匹配时注入 OpenUI Lang 提示词

**好处**：
- ✅ 同一个 Gateway 可以同时被多个客户端使用
- ✅ 每个客户端有自己的"特殊行为"
- ✅ 互不干扰

### 4.3 WebSocket 协议

```typescript
// 客户端连接 Gateway（同源）
const ws = new WebSocket('ws://gateway/ws');

// 消息格式（基于 OpenClaw 协议）
{
  type: 'chat.send',      // RPC 方法名
  payload: {
    sessionKey: 'agent:main:main:openclaw-os',
    content: '用户消息'
  }
}

// 服务端响应（流式）
{
  type: 'chat.stream',
  payload: {
    sessionKey: '...',
    delta: '部分输出',
    isComplete: false
  }
}
```

---

## 五、核心技术亮点

### 5.1 "零部署"哲学
**传统做法**：
```
Web 服务器 ←→ 反向代理 ←→ API 后端 ←→ Gateway
（Nginx）   （CORS问题）（认证问题）
```

**OpenClaw OS 做法**：
```
浏览器 ←→ Gateway（既是 API 又是 Web 服务器）
```

只需要一个进程，所有问题一并解决。

### 5.2 "插件即应用"模式
- 整个 Web 应用打包成插件
- 利用 Gateway 的所有基础设施（认证、HTTP、WebSocket）
- 上传插件 = 部署应用

### 5.3 流式生成 UI
- LLM 不再返回 JSON 让前端渲染
- LLM 直接"流式"输出 UI 标记
- 前端边接收边渲染
- 用户体验：UI 一边生成一边出现

### 5.4 会话隔离机制
通过 session key 后缀实现：
- 同一个 Agent 可以被多个客户端独立使用
- 每个客户端的对话历史互不干扰
- 不需要在 Gateway 层做客户端隔离

---

## 六、对我们项目的启示

### 6.1 可以借鉴的设计

| OpenClaw OS 设计 | 我们能借鉴什么 |
|------|------|
| **会话 key 后缀** | 为我们的客户端定义独特后缀（如 `:my-app`），实现历史隔离 |
| **OpenUI Lang** | 未来可以考虑支持 LLM 输出动态 UI |
| **Gateway 直接服务** | 如果用浏览器版本，可以直接复用这个插件 |
| **流式渲染** | 客户端必须实现流式消息接收 |

### 6.2 关键差异

| 维度 | OpenClaw OS | 我们的方案 |
|------|------------|----------|
| **客户端形态** | 浏览器（Web） | 原生 App（SwiftUI） |
| **部署位置** | OpenClaw Gateway 内 | 独立 Link 服务 + 客户端 |
| **多实例管理** | 一个 Gateway 一个 OS | 一个 Link 管多个 Gateway |
| **加载方式** | 浏览器访问 | App 安装 |

### 6.3 借鉴建议

#### ✅ 必须借鉴
1. **会话 key 结构**：`agent:<id>:<channel>:<senderId>`
2. **WebSocket 同源认证**（如果可以的话）
3. **session key 后缀隔离**

#### 🤔 可选借鉴
1. **OpenUI Lang 渲染**（短期不做，长期可以）
2. **Apps/Artifacts 概念**（可作为高级功能）

#### ❌ 不适合借鉴
1. **Next.js 静态导出**（我们用 SwiftUI）
2. **插件捆绑模式**（我们要支持多实例）

---

## 七、关键代码位置参考

### 7.1 协议类型定义
**OpenClaw 源码**：
- 客户端 ID 和模式：`src/gateway/protocol/client-info.ts`
- 协议帧 schema：`src/gateway/protocol/schema/protocol-schemas.ts`

**OpenClaw OS 内联位置**：
- `packages/claw-client/src/lib/gateway/types.ts`

### 7.2 插件入口
- 文件：`packages/claw-plugin/src/index.ts`
- 包含：钩子注册、工具注册、RPC、HTTP 路由、CLI

### 7.3 提示词
- Inline UI 规范：`packages/claw-plugin/prompts/openui-inline-ui.md`
- App SKILL：`packages/claw-plugin/skills/openui-app/SKILL.md`

---

## 八、技术总结

### 8.1 一图概括

```
       浏览器（任何设备）
            ↓
            ↓ 同源
            ↓
   OpenClaw Gateway
   ├── HTTP 服务（提供 UI）
   ├── WebSocket（聊天通信）
   └── Plugin Hook 系统
       └── 注入 OpenUI 提示词
           ↓
           Agent
           ↓
           LLM
           ↓
       流式 OpenUI Lang
           ↓
       前端实时渲染
```

### 8.2 三大核心创新

1. **插件即应用**：用 Gateway 的能力反过来服务 Web
2. **流式生成 UI**：LLM 直接输出可渲染的 UI 标记
3. **同源认证**：消除所有部署复杂度

### 8.3 适合什么场景？

✅ **适合**：
- 单一 OpenClaw 实例的全功能管理
- 不想开发原生 App，浏览器够用
- 想要丰富的动态 UI（仪表板、表格、图表）

❌ **不适合**：
- 多 OpenClaw 实例统一管理（每个实例都要装插件）
- 需要离线使用
- 需要原生 App 体验

---

## 九、最终结论

**OpenClaw OS 的本质**：
> 利用 OpenClaw 的插件系统，把整个 Web 工作空间"塞进" Gateway 内部，让 Gateway 既当大脑又当门面，用最少的部署复杂度实现最完整的功能。

**对我们的价值**：
1. **协议参考**：理解 OpenClaw 的 WebSocket 协议
2. **会话模型**：借鉴 session key 设计
3. **未来方向**：长期可以考虑 OpenUI Lang 支持
4. **备选方案**：如果不想自研，可以直接装这个

---

*分析时间：2026-05-26*
*分析者：基于 GitHub 公开仓库 README + AGENTS.md*
