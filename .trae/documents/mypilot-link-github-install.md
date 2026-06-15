# mypilot-link 从 GitHub 安装方案

## 现状
- `@mypilot/link` 未发布到 npm registry
- 代码已推送到 https://github.com/sixleo-cyber/mypilot-link
- 其他服务器可通过 GitHub URL 直接安装

## 安装命令

其他服务器执行：
```bash
npm install -g git+https://github.com/sixleo-cyber/mypilot-link.git
```

或指定版本/分支：
```bash
npm install -g git+https://github.com/sixleo-cyber/mypilot-link.git#main
```

安装后可使用：
```bash
mypilot daemon    # 启动 daemon
mypilot --version # 查看版本
```

## 需要验证
1. 确保 package.json 的 `files` 字段包含所有必要文件
2. 确保 `src/cli.js` 有正确的 shebang (`#!/usr/bin/env node`)
3. 在另一台机器上测试安装

## 验证步骤
1. 检查 cli.js shebang
2. 检查 files 字段是否完整
3. 本地模拟安装测试：`npm install -g /Users/liaoxing/Downloads/未命名文件夹/开发/mypilot-link`
