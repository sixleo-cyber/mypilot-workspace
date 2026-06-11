# Gateway 搜索服务扩展计划

## 摘要

在 mypilot-link daemon 侧新增搜索服务配置管理模块，提供 HTTP REST API 供 App 读写搜索服务配置（含加密存储 API Key），并将内置服务的 Key 同步回 openclaw.json 的 `skills.entries`，使 Gateway 的 skill 插件可用。隐私/记忆设置仅存 App 本地。

## 当前状态分析

### 现有架构
- **三层代理**: App (WS) ↔ Daemon (HTTP+WS) ↔ OpenClaw Gateway (WS)
- **配置读写**: `config.get` / `config.set` RPC 转发到 Gateway，Gateway 读写 `~/.openclaw/openclaw.json`
- **搜索现状**: 远程服务器仅配置了 `skills.entries.tavily-search`（含明文 apiKey）和 `tools.web.search/fetch`
- **无统一搜索服务管理**: 没有 `search.providers` 分区，没有加密存储，没有 REST API

### 关键文件
| 文件 | 作用 |
|------|------|
| `mypilot-link/src/daemon.js` | Daemon 主文件，HTTP 端点 + WS RPC 转发 |
| `mypilot-link/src/runtime.js` | 路径工具、JSON 读写、日志 |
| `mypilot-link/src/constants.js` | 端口、版本等常量 |
| `MyPilot/Services/WebSocketService.swift` | App 侧 WS 服务，含 `getConfig`/`setConfig` |
| `MyPilot/Features/Settings/NetworkSettingsView.swift` | 网络设置页 UI |

### 远程服务器 openclaw.json 搜索相关结构
```json
{
  "skills": {
    "entries": {
      "tavily-search": { "enabled": true, "apiKey": "tvly-dev-..." }
    }
  },
  "tools": {
    "web": { "search": { "enabled": true }, "fetch": { "enabled": true } }
  }
}
```

## 决策记录

| 决策项 | 选择 | 理由 |
|--------|------|------|
| API Key 存储位置 | Daemon 侧独立文件 | 不修改 openclaw.json 结构，daemon 自管理 |
| 加密方式 | AES-256-GCM + 设备密钥(PBKDF2) | 安全且简单，每个 daemon 实例密钥不同 |
| API 风格 | HTTP REST API | 方便调试，与现有 `/api/config` 风格一致 |
| 隐私/记忆设置 | 仅 App 本地 @AppStorage | Gateway 无此概念，无需同步 |
| Key 同步范围 | 仅同步内置服务 Key 到 skills.entries | 让 Gateway skill 插件可用，自定义服务不污染 openclaw.json |

## 提议变更

### 1. 新增 `mypilot-link/src/search-providers.js` — 搜索服务管理模块

**职责**: 搜索服务的 CRUD、API Key 加密/解密、与 openclaw.json 同步

**数据模型** — 存储文件: `~/.openclaw/plugins/mypilot-link/search-providers.json`
```json
{
  "providers": [
    {
      "id": "brave",
      "name": "Brave Search",
      "icon": "shield.fill",
      "isBuiltIn": true,
      "isConfigured": false,
      "encryptedApiKey": null,
      "apiKeyNonce": null,
      "baseUrl": null
    },
    {
      "id": "tavily",
      "name": "Tavily",
      "icon": "magnifyingglass",
      "isBuiltIn": true,
      "isConfigured": true,
      "encryptedApiKey": "base64-encoded-ciphertext",
      "apiKeyNonce": "base64-encoded-nonce",
      "baseUrl": null
    },
    {
      "id": "custom-abc12345",
      "name": "My Custom Search",
      "icon": "globe",
      "isBuiltIn": false,
      "isConfigured": true,
      "encryptedApiKey": "base64-encoded-ciphertext",
      "apiKeyNonce": "base64-encoded-nonce",
      "baseUrl": "https://api.example.com"
    }
  ],
  "defaultProvider": "tavily",
  "webParsingEnabled": true,
  "autoImportEnabled": false
}
```

**加密方案**:
- 密钥派生: `PBKDF2(deviceId, salt="mypilot-link-v1", iterations=100000, keylen=32, sha512)`
- 加密算法: `aes-256-gcm`，每次加密生成随机 12-byte nonce
- 存储格式: `encryptedApiKey` = base64(ciphertext + authTag)，`apiKeyNonce` = base64(nonce)

**导出函数**:
```js
// 初始化：从 openclaw.json 的 skills.entries 迁移已有 Key
export function initSearchProviders(deviceId)

// CRUD
export function listProviders()           // → providers[], apiKey 已解密
export function getProvider(id)           // → provider | null
export function saveProvider(id, apiKey, baseUrl?)  // 加密存储，内置服务同步到 skills.entries
export function deleteProvider(id)        // 清除 Key，内置服务同步清除 skills.entries
export function addCustomProvider(name, baseUrl, apiKey)  // 创建自定义服务

// 设置
export function getDefaultProvider()      // → provider id | ""
export function setDefaultProvider(id)    // 设置默认服务
export function getWebParsingEnabled()    // → bool
export function setWebParsingEnabled(v)   // 设置网页解析开关
export function getAutoImportEnabled()    // → bool
export function setAutoImportEnabled(v)   // 设置自动导入开关

// 内部：同步内置服务 Key 到 openclaw.json
async function syncToOpenClawConfig(id, apiKey)  // 通过 gatewayRpc config.get/set 写入 skills.entries.{id}.apiKey
async function clearFromOpenClawConfig(id)       // 清除 skills.entries.{id}.apiKey
```

**初始化迁移逻辑** (`initSearchProviders`):
1. 读取 `search-providers.json`，如不存在则创建默认 8 个内置服务
2. 通过 `gatewayRpc("config.get", {})` 获取 openclaw.json
3. 遍历 `skills.entries`，如果某个内置服务 id（如 `tavily-search`）有 apiKey 且 daemon 侧尚未存储，则迁移过来（加密存储，标记 isConfigured=true）
4. 注意: `tavily-search` 在 skills.entries 中的 key 是 `tavily-search`，映射到 provider id `tavily`

**内置服务 ID 映射**:
| Provider ID | skills.entries key | 说明 |
|-------------|-------------------|------|
| brave | brave-search | Brave Search |
| llm-context | llm-context | LLM Context |
| gemini | gemini-search | Gemini |
| grok | grok-search | Grok |
| kimi | kimi-search | Kimi |
| perplexity | perplexity-search | Perplexity |
| tavily | tavily-search | Tavily |
| duckduckgo | duckduckgo-search | DuckDuckGo |

### 2. 修改 `mypilot-link/src/daemon.js` — 新增 HTTP REST API 端点

在 `handleHttpRequest` 函数中新增以下端点（在 `/api/config` 端点之后）:

#### `GET /api/settings/search`
返回搜索服务配置概览（不含解密后的 Key）
```json
{
  "webSearchEnabled": true,
  "autoImport": false,
  "defaultProvider": "tavily",
  "providers": [
    { "id": "brave", "name": "Brave Search", "isConfigured": false, "isBuiltIn": true },
    { "id": "tavily", "name": "Tavily", "isConfigured": true, "isBuiltIn": true },
    { "id": "custom-abc", "name": "My Custom", "isConfigured": true, "isBuiltIn": false, "baseUrl": "https://..." }
  ]
}
```

#### `POST /api/settings/search/provider/{id}`
保存/更新服务的 API Key
- Body: `{ "apiKey": "tvly-xxx", "baseUrl": "https://..." }` (baseUrl 可选，仅自定义服务需要)
- 行为: 加密存储 apiKey，如果是内置服务则同步到 openclaw.json 的 skills.entries
- 返回: `{ "ok": true, "provider": { "id": "tavily", "isConfigured": true } }`

#### `DELETE /api/settings/search/provider/{id}`
清除服务的 API Key
- 行为: 清除加密存储的 Key，如果是内置服务则同步清除 openclaw.json 的 skills.entries
- 返回: `{ "ok": true, "provider": { "id": "tavily", "isConfigured": false } }`

#### `POST /api/settings/search/provider/custom`
创建自定义搜索服务
- Body: `{ "name": "My Search", "baseUrl": "https://api.example.com", "apiKey": "sk-xxx" }`
- 行为: 生成 id (`custom-{uuid8}`)，加密存储 apiKey
- 返回: `{ "ok": true, "provider": { "id": "custom-abc12345", "name": "My Search", "isConfigured": true, "isBuiltIn": false, "baseUrl": "https://api.example.com" } }`

#### `PUT /api/settings/search/default`
设置默认搜索服务
- Body: `{ "providerId": "tavily" }`
- 校验: providerId 必须是已配置的服务
- 返回: `{ "ok": true, "defaultProvider": "tavily" }`

#### `PUT /api/settings/search/toggles`
更新开关设置
- Body: `{ "webSearchEnabled": true, "autoImport": false }`
- 行为: 更新 webParsingEnabled 和 autoImportEnabled，同时同步 `tools.web.search.enabled` 到 openclaw.json
- 返回: `{ "ok": true }`

### 3. 修改 `mypilot-link/src/daemon.js` — 初始化时调用迁移

在 `runDaemon()` 函数中，Gateway 连接成功后（`gatewayReady = true` 之后），调用:
```js
initSearchProviders(deviceId);
```

### 4. 修改 `MyPilot/Services/WebSocketService.swift` — 新增 HTTP API 调用方法

新增方法（不走 WebSocket，直接 HTTP 请求 daemon）:
```swift
func fetchSearchSettings(callback: @escaping ([String: Any]?) -> Void)
func saveSearchProvider(id: String, apiKey: String, baseUrl: String?, callback: @escaping (Bool) -> Void)
func deleteSearchProvider(id: String, callback: @escaping (Bool) -> Void)
func addCustomSearchProvider(name: String, baseUrl: String, apiKey: String, callback: @escaping ([String: Any]?) -> Void)
func setDefaultSearchProvider(id: String, callback: @escaping (Bool) -> Void)
func updateSearchToggles(webSearchEnabled: Bool, autoImport: Bool, callback: @escaping (Bool) -> Void)
```

这些方法通过 `URLSession` 调用 `http://127.0.0.1:52378/api/settings/search/...`。

### 5. 修改 `MyPilot/Features/Settings/NetworkSettingsView.swift` — 对接新 API

**变更点**:
- `loadConfigFromGateway()` 改为调用 `fetchSearchSettings()` 一次性拉取所有搜索配置
- 保存/删除 Key 改为调用 `saveSearchProvider()` / `deleteSearchProvider()`
- 添加自定义服务改为调用 `addCustomSearchProvider()`
- 默认服务 Picker 改为调用 `setDefaultSearchProvider()`
- 网页解析/自动导入开关改为调用 `updateSearchToggles()`
- 隐私/记忆设置保持 `@AppStorage` 本地存储不变
- `SearchProvider.isConfigured` 状态从 API 返回值同步，不再本地猜测

## 数据流

### 读取流程
```
App 启动 → fetchSearchSettings() → HTTP GET /api/settings/search
→ daemon: listProviders() → 读取 search-providers.json → 解密 apiKey → 返回概览（不含明文 Key）
→ App 更新 providers[] 和 UI 状态
```

### 保存 Key 流程
```
用户在 ProviderDetailView 点"保存"
→ App: saveSearchProvider(id, apiKey) → HTTP POST /api/settings/search/provider/{id}
→ daemon: saveProvider(id, apiKey) → 加密存储 → 如果是内置服务: syncToOpenClawConfig(id, apiKey)
  → gatewayRpc("config.get") → 修改 skills.entries.{mappedKey}.apiKey → gatewayRpc("config.set")
→ 返回 { ok: true, provider: {...} }
→ App 更新 provider.isConfigured = true
```

### 清除 Key 流程
```
用户点"清除 Key"
→ App: deleteSearchProvider(id) → HTTP DELETE /api/settings/search/provider/{id}
→ daemon: deleteProvider(id) → 清除加密存储 → 如果是内置服务: clearFromOpenClawConfig(id)
  → gatewayRpc("config.get") → 清除 skills.entries.{mappedKey}.apiKey → gatewayRpc("config.set")
→ 返回 { ok: true, provider: {...} }
→ App 更新 provider.isConfigured = false
```

## 边界情况

1. **Gateway 未连接时**: HTTP API 仍可读写 daemon 本地存储，但同步到 openclajson 的操作会失败 → 返回 `{ ok: true, syncFailed: true }`，App 可提示"已保存，Gateway 重连后自动同步"
2. **并发写入**: search-providers.json 读写加文件锁（`fs.writeFileSync` 是原子的），config.set 使用 baseHash 乐观锁
3. **首次启动迁移**: 如果 skills.entries 中已有 tavily-search.apiKey，initSearchProviders 会迁移到 daemon 侧加密存储，原 openclaw.json 中的 Key 保留（不删除，避免影响现有 skill 运行）
4. **deviceId 变更**: 加密密钥依赖 deviceId，如果 deviceId 变更则无法解密旧 Key → 需要用户重新输入。initSearchProviders 会检测解密失败并标记 isConfigured=false

## 验证步骤

1. 启动 daemon，确认 `search-providers.json` 自动创建，含 8 个内置服务
2. 调用 `GET /api/settings/search`，确认返回正确结构
3. 调用 `POST /api/settings/search/provider/tavily` 保存 Key，确认:
   - search-providers.json 中 encryptedApiKey 非空
   - openclaw.json 中 skills.entries.tavily-search.apiKey 已更新
4. 调用 `DELETE /api/settings/search/provider/tavily`，确认:
   - search-providers.json 中 encryptedApiKey 为 null
   - openclaw.json 中 skills.entries.tavily-search.apiKey 已清除
5. 调用 `POST /api/settings/search/provider/custom` 创建自定义服务，确认:
   - search-providers.json 中新增自定义 provider
   - openclaw.json 未被修改
6. App 端测试: 打开网络设置页 → 点击服务 → 输入 Key → 保存 → 状态变为"已配置 ✓"
7. App 端测试: 切换默认服务 Picker → 确认选择持久化
8. App 端测试: 隐私/记忆开关 → 确认仅存本地，不影响 Gateway

## 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `mypilot-link/src/search-providers.js` | 新增 | 搜索服务管理模块（CRUD + 加密 + 同步） |
| `mypilot-link/src/daemon.js` | 修改 | 新增 6 个 HTTP 端点 + 初始化调用 |
| `MyPilot/Services/WebSocketService.swift` | 修改 | 新增 6 个 HTTP API 调用方法 |
| `MyPilot/Features/Settings/NetworkSettingsView.swift` | 修改 | 对接新 API，替换 config.get/set 调用 |
