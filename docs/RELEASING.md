# ZoomPaper Plus 发布指南

ZoomPaper Plus 使用 **GitHub Releases** 分发 macOS 安装包。GitHub Packages 主要用于 npm、Docker、Maven 等依赖包，不适合分发普通用户双击安装的 `.dmg`，因此本项目不需要配置 Packages。

## 自动发布流程

`.github/workflows/release.yml` 会在推送 `v*` 标签后执行以下步骤：

1. 检查标签、`package.json`、`Cargo.toml` 和 `tauri.conf.json` 的版本是否一致。
2. 读取对应的 `docs/RELEASE-v<版本>.md` 作为 Release 说明。
3. 打包 Chrome / Edge 浏览器扩展，并在 GitHub 的 Apple Silicon runner 上构建正式版 DMG。
4. 创建一个 Draft Release，填写标题和说明，并附加 DMG 与扩展 ZIP。
5. 保持草稿状态，等待维护者检查后手动发布。

Draft Release 只有仓库维护者能看到，不会立即通知用户，也不会出现在公开的最新版本下载链接中。

## 发布新版本

以 `0.2.1` 为例，先确认以下文件中的版本都是 `0.2.1`：

- `package.json`
- `package-lock.json`
- `src-tauri/Cargo.toml`
- `src-tauri/Cargo.lock`
- `src-tauri/tauri.conf.json`

准备 `docs/RELEASE-v0.2.1.md`，提交并推送 `main`，然后执行：

```sh
git tag -a v0.2.1 -m "ZoomPaper Plus v0.2.1"
git push origin v0.2.1
```

随后打开仓库的 **Actions → Release** 查看构建进度。成功后进入 **Releases → Drafts**，检查以下内容：

- 标题为 `ZoomPaper Plus v0.2.1`
- 标签为 `v0.2.1`
- 附件包含 `ZoomPaper_0.2.1_aarch64.dmg`
- 附件包含 `ZoomPaper-Connector_0.2.1.zip`
- 系统要求和已知限制准确

确认无误后点击 **Publish release**。如果构建失败，不要创建同名新标签；修复后在 Actions 页面重新运行失败任务即可。

## 手动触发

也可以打开 **Actions → Release → Run workflow**，填写已经写入源码和发布说明文件的版本号。工作流仍然只创建草稿，不会直接公开发布。
