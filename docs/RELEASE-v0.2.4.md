# ZoomPaper Plus v0.2.4

本版本修复 AI 博客生成过程中切换论文会导致任务看似中断的问题。

## 更新

- 博客生成改为按论文管理的后台任务，离开当前论文后仍会继续生成。
- 返回论文时自动恢复“生成中”状态，并在完成后立即展示博客。
- 支持同时为不同论文生成博客；同一篇论文生成期间会自动避免重复提交。
- 补全测试发现规则，确保核心逻辑测试会在本地和发布流程中实际执行。

## 下载

| 系统 | 文件 |
| --- | --- |
| macOS 13+ Apple Silicon | `ZoomPaper.Plus_0.2.4_aarch64.dmg` |
| Windows 10/11 x64 | `ZoomPaper.Plus_0.2.4_x64-setup.exe` |
| Debian / Ubuntu x64 | `ZoomPaper.Plus_0.2.4_amd64.deb` |
| 其他常见 x64 Linux | `ZoomPaper.Plus_0.2.4_amd64.AppImage` |
| Chrome / Edge | `ZoomPaper-Plus-Connector_0.2.4.zip` |

安装包尚未进行 Apple 或 Microsoft 代码签名。Windows SmartScreen 或 macOS Gatekeeper 可能显示来源提示，请确认文件来自本仓库的正式 Release。

## 验证

- 前端交互与核心逻辑测试：59 项通过
- 前端生产构建通过
- 三个平台的安装包由 GitHub Actions 原生 runner 分别构建
