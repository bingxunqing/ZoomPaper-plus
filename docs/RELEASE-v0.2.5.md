# ZoomPaper Plus v0.2.5

本版本修复论文文件夹归属弹窗的勾选状态不同步问题。

## 更新

- 论文加入新文件夹后，勾选状态会立即准确更新。
- 多个文件夹并存时，已有归属和新归属均能正确显示。
- 归属刷新完成前锁定选项，避免连续点击按旧状态重复提交。
- 为文件夹勾选控件补充可访问性状态，并增加交互回归测试。

## 下载

| 系统 | 文件 |
| --- | --- |
| macOS 13+ Apple Silicon | `ZoomPaper.Plus_0.2.5_aarch64.dmg` |
| Windows 10/11 x64 | `ZoomPaper.Plus_0.2.5_x64-setup.exe` |
| Debian / Ubuntu x64 | `ZoomPaper.Plus_0.2.5_amd64.deb` |
| 其他常见 x64 Linux | `ZoomPaper.Plus_0.2.5_amd64.AppImage` |
| Chrome / Edge | `ZoomPaper-Plus-Connector_0.2.5.zip` |

安装包尚未进行 Apple 或 Microsoft 代码签名。Windows SmartScreen 或 macOS Gatekeeper 可能显示来源提示，请确认文件来自本仓库的正式 Release。

## 验证

- 前端交互与核心逻辑测试：60 项通过
- 前端生产构建通过
- 三个平台的安装包由 GitHub Actions 原生 runner 分别构建
