# ZoomPaper Plus v0.2.2

本版本新增 Windows 与 Linux 安装包，ZoomPaper Plus 现在可在 macOS、Windows 和 Linux 上使用。

## 新增

- Windows 10/11 x64：提供可直接安装的 NSIS `.exe`。
- Linux x64：提供 Debian / Ubuntu 使用的 `.deb` 和通用 `.AppImage`。
- 浏览器扩展在 Windows 与 Linux 上继续使用 `zoompaper://` 一键导入论文。
- 加入桌面端单实例处理：应用已打开时，浏览器导入会切回现有窗口，不再重复启动多个窗口。
- 发布工作流改为三平台并行构建，统一创建包含所有安装包和浏览器扩展的 Draft Release。

## 下载

| 系统 | 文件 |
| --- | --- |
| macOS 13+ Apple Silicon | `ZoomPaper_0.2.2_aarch64.dmg` |
| Windows 10/11 x64 | `ZoomPaper_0.2.2_x64-setup.exe` |
| Debian / Ubuntu x64 | `ZoomPaper_0.2.2_amd64.deb` |
| 其他常见 x64 Linux | `ZoomPaper_0.2.2_amd64.AppImage` |
| Chrome / Edge | `ZoomPaper-Connector_0.2.2.zip` |

安装包尚未进行 Apple 或 Microsoft 代码签名。Windows SmartScreen 或 macOS Gatekeeper 可能显示来源提示，请确认文件来自本仓库的正式 Release。

Linux 首次运行 AppImage 时，可能需要执行：

```sh
chmod +x ZoomPaper_0.2.2_amd64.AppImage
```

PDF 解析需要 MinerU；翻译、问答和费曼学习需要配置 OpenAI、Anthropic、Gemini 或 DeepSeek 中至少一个服务。

## 验证

- 前端交互与网站识别测试：22 项通过
- Rust 测试：138 项通过，1 项真实模型集成测试默认忽略
- 三个平台的安装包由 GitHub Actions 原生 runner 分别构建
