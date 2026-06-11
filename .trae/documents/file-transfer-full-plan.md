# 双向文件收发完整规划

## 实施状态

| 任务 | 状态 | 日期 |
|------|------|------|
| daemon `getMimeType()` 统一函数 | ✅ 已完成 | 2026-06-05 |
| daemon workspace 正则扩展（全部文件类型） | ✅ 已完成 | 2026-06-05 |
| daemon workspace-file 端点采用 getMimeType | ✅ 已完成 | 2026-06-05 |
| daemon 部署到服务器 | ✅ 已完成 | 2026-06-05 |
| Swift `AttachmentCard` URL 拼接修复 | ✅ 已完成 | 2026-06-05 |
| Swift `AttachmentCard` 文档类型图标 | ✅ 已完成 | 2026-06-05 |
| Swift `AttachmentCard` 错误状态处理 | ✅ 已完成 | 2026-06-05 |
| **测试验证** | ⏳ 待测试 | — |

## 待测试项

1. 让 AI「生成一张图片发给我」→ 观察 App 是否显示图片卡片
2. 让 AI「生成一个 PDF/Word/Excel 文件」→ 观察 App 是否显示文件卡片，点击能否在系统应用打开
3. 从 App 发送 .docx/.xlsx/.pptx/.pdf 文件 → 观察 AI 能否读取内容
4. 从 App 发送 .md 文件 → 已验证 ✅
