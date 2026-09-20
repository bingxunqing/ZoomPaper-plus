# ZoomPaper Plus v0.2.3

本版本将桌面应用和浏览器扩展统一更名为 **ZoomPaper Plus**，使 fork 版本能与原版 ZoomPaper 清楚区分并同时安装。

## 更新

- macOS、Windows 和 Linux 中的应用名称统一为 `ZoomPaper Plus`。
- 使用独立应用标识 `com.zoompaper.plus`，避免覆盖原版应用。
- 浏览器扩展更名为 `ZoomPaper Plus Connector`。
- 浏览器导入协议改为 `zoompaper-plus://`，避免同时安装原版时唤起错误应用。
- 应用窗口、网页标题和 AI 助手品牌文字同步更新。

## 下载

| 系统 | 文件 |
| --- | --- |
| macOS 13+ Apple Silicon | `ZoomPaper.Plus_0.2.3_aarch64.dmg` |
| Windows 10/11 x64 | `ZoomPaper.Plus_0.2.3_x64-setup.exe` |
| Debian / Ubuntu x64 | `ZoomPaper.Plus_0.2.3_amd64.deb` |
| 其他常见 x64 Linux | `ZoomPaper.Plus_0.2.3_amd64.AppImage` |
| Chrome / Edge | `ZoomPaper-Plus-Connector_0.2.3.zip` |

安装包尚未进行 Apple 或 Microsoft 代码签名。Windows SmartScreen 或 macOS Gatekeeper 可能显示来源提示，请确认文件来自本仓库的正式 Release。

从旧版升级后请重新加载 `ZoomPaper Plus Connector v0.2.3`；旧扩展仍使用原版 `zoompaper://` 协议，无法唤起更名后的应用。

## 验证

- 前端交互与网站识别测试：22 项通过
- Rust 测试：138 项通过，1 项真实模型集成测试默认忽略
- 三个平台的安装包由 GitHub Actions 原生 runner 分别构建
