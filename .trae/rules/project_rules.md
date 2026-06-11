# MyPilot 项目规则

## 仓库与主线

- MyPilot App 仓库：`MyPilotApp/MyPilot`
- MyPilot 当前 daemon 主线：`mypilot-link`
  - package：`@mypilot/link`
  - flavor：`mypilot-link`
  - CLI：`mypilot`
  - 本地直连端口：`52378`
- ClawPilot 公共发布包线：`package`
  - package：`@clawpilot-app/link`
  - flavor：`clawpilot-link`
  - CLI：`clawlink`

## 修改边界

- MyPilot App 私有化体验、诊断、定时任务、附件协议、本地 OpenClaw 调试：优先修改 `mypilot-link`。
- ClawPilot 公共 npm 发布包、`clawlink` CLI、公共发布流程：修改 `package`。
- 不要把 MyPilot 专属能力无差别复制到 `package`。
- 修改 daemon 前先确认 `/api/info` 的 `packageName` 与 `flavor`。
- 不修改服务器素材，不动 `/root/.openclaw/agents/main/SOUL.md`。

## 常用验证命令

```bash
cd /Users/liaoxing/Downloads/未命名文件夹/mypilot-link
npm run verify
```

```bash
cd /Users/liaoxing/Downloads/未命名文件夹/package
npm run verify
```

```bash
cd /Users/liaoxing/Downloads/未命名文件夹/MyPilotApp/MyPilot
xcodebuild -project MyPilot.xcodeproj -scheme MyPilot -configuration Debug -destination 'platform=macOS' -skipMacroValidation build
xcodebuild test -project MyPilot.xcodeproj -scheme MyPilot -destination 'platform=macOS' -skipMacroValidation
```

## 运行线确认

```bash
curl http://127.0.0.1:52378/api/info
```

MyPilot 主线预期至少包含：

```json
{
  "packageName": "@mypilot/link",
  "flavor": "mypilot-link"
}
```
