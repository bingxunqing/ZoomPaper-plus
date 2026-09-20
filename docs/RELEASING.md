# ZoomPaper Plus 发布指南

ZoomPaper Plus 使用 **GitHub Releases** 分发 macOS、Windows 和 Linux 安装包。GitHub Packages 主要用于 npm、Docker、Maven 等依赖包，不适合分发桌面安装包，因此本项目不需要配置 Packages。

## 自动发布流程

`.github/workflows/release.yml` 会在推送 `v*` 标签后执行以下步骤：

1. 检查标签、`package.json`、`Cargo.toml` 和 `tauri.conf.json` 的版本是否一致。
2. 读取对应的 `docs/RELEASE-v<版本>.md` 作为 Release 说明。
3. 并行构建 macOS DMG、Windows NSIS EXE、Linux DEB / AppImage，并打包浏览器扩展。
4. 创建一个 Draft Release，填写标题和说明，并附加所有平台产物。
5. 保持草稿状态，等待维护者检查后手动发布。

Draft Release 只有仓库维护者能看到，不会立即通知用户，也不会出现在公开的最新版本下载链接中。

## 发布新版本

以 `0.2.2` 为例，先确认以下文件中的版本都是 `0.2.2`：

- `package.json`
- `package-lock.json`
- `src-tauri/Cargo.toml`
- `src-tauri/Cargo.lock`
- `src-tauri/tauri.conf.json`

准备 `docs/RELEASE-v0.2.2.md`，提交并推送 `main`，然后执行：

```sh
git tag -a v0.2.2 -m "ZoomPaper Plus v0.2.2"
git push origin v0.2.2
```

随后打开仓库的 **Actions → Release** 查看构建进度。成功后进入 **Releases → Drafts**，检查以下内容：

- 标题和标签对应当前版本
- 附件包含 macOS DMG、Windows EXE、Linux DEB / AppImage
- 附件包含同版本的 `ZoomPaper-Connector_<版本>.zip`
- 系统要求和已知限制准确

确认无误后点击 **Publish release**。如果构建失败，不要创建同名新标签；修复后在 Actions 页面重新运行失败任务即可。

## 手动触发

也可以打开 **Actions → Release → Run workflow**，填写已经写入源码和发布说明文件的版本号。工作流仍然只创建草稿，不会直接公开发布。
