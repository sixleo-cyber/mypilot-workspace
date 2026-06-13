
# ClawPilot iOS/macOS 客户端开发计划

&gt; 目标：开发一个类似 ClawPilot 的原生应用，用于 iPad 和 Mac 与部署在云服务器上的 openclaw 进行自然语言交互和管理
&gt; 技术栈：Swift + SwiftUI
&gt; 日期：2026-05-26

---

## 一、项目概述

### 1.1 核心目标
- 为 iPad 和 Mac 用户提供原生、流畅的 openclaw 交互体验
- 支持 Agent 管理、聊天对话、模型切换、文件上传等核心功能
- 与云服务器上的 openclaw 网关建立稳定连接

### 1.2 技术选型
| 组件 | 技术 |
|------|------|
| 开发语言 | Swift 5.9+ |
| UI 框架 | SwiftUI |
| 架构模式 | MVVM + Clean Architecture |
| 网络层 | Alamofire / URLSession |
| 数据存储 | SwiftData / CoreData |
| 实时通信 | WebSocket |
| 依赖管理 | Swift Package Manager |

---

## 二、项目架构设计

```
ClawPilotApp/
├── ClawPilotApp.swift              # App 入口
├── Models/                         # 数据模型
│   ├── Agent.swift
│   ├── Message.swift
│   ├── Conversation.swift
│   ├── Model.swift
│   ├── Settings.swift
│   └── Gateway.swift
├── ViewModels/                     # ViewModel 层
│   ├── ChatViewModel.swift
│   ├── AgentListViewModel.swift
│   ├── SettingsViewModel.swift
│   └── GatewayViewModel.swift
├── Views/                          # 视图层
│   ├── Main/
│   │   ├── ContentView.swift
│   │   ├── SidebarView.swift
│   │   └── ChatView.swift
│   ├── Settings/
│   │   ├── SettingsView.swift
│   │   ├── NetworkSettingsView.swift
│   │   └── AgentSettingsView.swift
│   └── Components/
│       ├── MessageBubble.swift
│       ├── AgentCard.swift
│       └── InputBar.swift
├── Services/                       # 服务层
│   ├── APIService.swift
│   ├── WebSocketService.swift
│   ├── GatewayService.swift
│   └── StorageService.swift
├── Utils/                          # 工具类
│   ├── Constants.swift
│   ├── Extensions.swift
│   └── Helpers.swift
└── Resources/                      # 资源
    ├── Assets.xcassets
    └── Info.plist
```

---

## 三、开发阶段规划

### 阶段一：项目初始化与基础设施（第 1 周）
- [ ] 创建 Xcode 项目
- [ ] 配置项目设置（支持 iPad + Mac）
- [ ] 搭建基础架构（MVVM 分层）
- [ ] 集成必要的依赖库
- [ ] 设计数据模型

### 阶段二：核心功能实现（第 2-3 周）
- [ ] Gateway 连接管理（WebSocket + HTTP API）
- [ ] Agent 列表与切换
- [ ] 基础聊天界面（消息发送/接收）
- [ ] 消息输入框与附件上传
- [ ] 系统提示词展示
- [ ] 内置指令支持（/models, /status, /help 等）

### 阶段三：重要功能开发（第 4-5 周）
- [ ] 历史会话搜索
- [ ] 定时任务管理
- [ ] Agent 创建/编辑
- [ ] SOUL 设置（输出模式/思维深度）
- [ ] 能力插件开关
- [ ] 用量统计展示
- [ ] 记忆读取配置
- [ ] 执行权限配置

### 阶段四：增强功能与优化（第 6 周）
- [ ] 语音通话设置
- [ ] 文件浏览器
- [ ] 自定义服务商
- [ ] 订阅管理
- [ ] 性能优化
- [ ] UI/UX 完善

---

## 四、openclaw 服务端部署指南

### 4.1 前置要求
- 云服务器（推荐配置：2核4G以上，Ubuntu 22.04 LTS）
- 域名（可选，用于 HTTPS）
- Docker 和 Docker Compose

### 4.2 部署步骤

#### 1. 准备云服务器
```bash
# 更新系统
sudo apt update &amp;&amp; sudo apt upgrade -y

# 安装 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 安装 Docker Compose
sudo apt install docker-compose -y

# 启动 Docker
sudo systemctl enable docker
sudo systemctl start docker
```

#### 2. 获取 openclaw
```bash
# 克隆仓库（假设 GitHub 仓库地址）
git clone https://github.com/openclaw/openclaw.git
cd openclaw

# 或者下载最新发布包
wget https://github.com/openclaw/openclaw/releases/latest/download/openclaw.tar.gz
tar -xzf openclaw.tar.gz
```

#### 3. 配置环境变量
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑配置
nano .env
```

关键配置项：
```env
# 基础配置
OPENCLAW_HOST=0.0.0.0
OPENCLAW_PORT=52378

# Relay 配置（可选）
RELAY_URL=https://relay.clawpilot.com/

# 模型配置
DEFAULT_MODEL=qwen-qlm-2.1

# 插件配置（如飞书等）
FEISHU_APP_ID=your_app_id
FEISHU_APP_SECRET=your_app_secret
```

#### 4. 启动服务
```bash
# 使用 Docker Compose 启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 检查服务状态
docker-compose ps
```

#### 5. 配置防火墙
```bash
# 允许直连端口
sudo ufw allow 52378/tcp

# 如果使用 Nginx 反向代理
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

#### 6. 验证部署
访问 `http://&lt;your-server-ip&gt;:52378` 或使用配对码连接

---

## 五、API 接口设计（基于 ClawPilot 文档推测）

### 5.1 连接管理
- `GET /api/status` - 获取 Gateway 状态
- `POST /api/connect` - 建立连接
- `WebSocket /ws` - 实时通信

### 5.2 Agent 管理
- `GET /api/agents` - 获取 Agent 列表
- `POST /api/agents` - 创建 Agent
- `PUT /api/agents/:id` - 更新 Agent
- `DELETE /api/agents/:id` - 删除 Agent

### 5.3 会话管理
- `GET /api/conversations` - 获取会话列表
- `POST /api/conversations` - 创建会话
- `GET /api/conversations/:id/messages` - 获取消息历史
- `POST /api/conversations/:id/messages` - 发送消息

### 5.4 模型管理
- `GET /api/models` - 获取可用模型列表
- `POST /api/models/:id/select` - 切换模型

### 5.5 设置管理
- `GET /api/settings` - 获取设置
- `PUT /api/settings` - 更新设置

---

## 六、功能优先级实施路线图

### 🔴 Week 1-2: 核心功能（Must Have）
1. ✅ 项目初始化与架构搭建
2. Gateway 连接与状态管理
3. Agent 列表展示与切换
4. 基础聊天界面（消息气泡、输入框）
5. 消息发送与接收
6. 系统提示词展示
7. 内置指令支持
8. 文件/图片上传

### 🟡 Week 3-4: 重要功能（Should Have）
9. 历史会话搜索
10. 定时任务创建与管理
11. Agent 创建/编辑/删除
12. SOUL 设置界面
13. 能力插件开关
14. 用量统计图表
15. 记忆读取配置
16. 执行权限配置

### 🟢 Week 5-6: 增强功能（Nice to Have）
17. 语音通话设置
18. 文件浏览器
19. 自定义服务商配置
20. 订阅管理
21. 隐私模式
22. 插件库（App Store 入口）
23. AI 建议功能
24. 深度思考模式切换

---

## 七、关键技术实现要点

### 7.1 WebSocket 实时通信
```swift
// 伪代码示例
class WebSocketService: ObservableObject {
    @Published var isConnected = false
    @Published var receivedMessages: [Message] = []
    
    private var webSocketTask: URLSessionWebSocketTask?
    
    func connect(url: URL) {
        let session = URLSession(configuration: .default)
        webSocketTask = session.webSocketTask(with: url)
        webSocketTask?.resume()
        receiveMessage()
    }
    
    private func receiveMessage() {
        webSocketTask?.receive { [weak self] result in
            // 处理接收到的消息
            self?.receiveMessage() // 继续监听
        }
    }
    
    func send(_ message: String) {
        webSocketTask?.send(.string(message)) { error in
            // 处理发送结果
        }
    }
}
```

### 7.2 SwiftData 数据持久化
```swift
// 伪代码示例
@Model
class Conversation {
    var id: UUID
    var agentId: String
    var messages: [Message]
    var createdAt: Date
    
    init(id: UUID = UUID(), agentId: String, messages: [Message] = [], createdAt: Date = Date()) {
        self.id = id
        self.agentId = agentId
        self.messages = messages
        self.createdAt = createdAt
    }
}
```

### 7.3 响应式 UI 设计
```swift
// 伪代码示例
struct ChatView: View {
    @StateObject var viewModel: ChatViewModel
    
    var body: some View {
        NavigationSplitView {
            SidebarView(viewModel: viewModel)
        } detail: {
            ConversationView(viewModel: viewModel)
        }
    }
}
```

---

## 八、后续扩展方向

- 支持更多平台（iOS、Android、Web）
- 添加更多 AI 模型服务商
- 开发更多自定义插件
- 语音交互优化
- 离线模式支持
- 多语言国际化

---

## 九、资源链接

- openclaw GitHub: [待定]
- SwiftUI 文档: https://developer.apple.com/documentation/swiftui
- SwiftData 文档: https://developer.apple.com/documentation/swiftdata

*文档版本：v1.0 | 创建：2026-05-26*

