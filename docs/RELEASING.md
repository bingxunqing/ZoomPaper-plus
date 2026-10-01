# ZoomPaper Plus 发布指南

ZoomPaper Plus 使用 **GitHub Releases** 分发桌面安装包和浏览器扩展。仓库不再通过 GitHub Actions 编译或自动创建 Release，所有产物均在对应系统本地构建，由维护者手动上传。

GitHub Packages 主要用于 npm、Docker、Maven 等依赖包，不适合分发桌面安装包，本项目无需使用。

## 发布前准备

发布 `X.Y.Z` 时，确认以下文件中的版本均为 `X.Y.Z`：

- `package.json`
- `package-lock.json`
- `src-tauri/Cargo.toml`
- `src-tauri/Cargo.lock`
- `src-tauri/tauri.conf.json`
- `browser-extension/manifest.json`

同时准备发布说明 `docs/RELEASE-vX.Y.Z.md`，并完成：

```sh
npm ci
npm test
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
```

## 本地构建

Tauri 桌面安装包应在目标操作系统原生构建。macOS 本机生成 DMG，Windows 本机生成 EXE，Linux 本机生成 DEB 和 AppImage；不要假设 macOS 构建能替代 Windows 或 Linux 构建。

### macOS Apple Silicon

```sh
npm ci
npm run tauri build -- --bundles dmg --target aarch64-apple-darwin
```

产物位于 `src-tauri/target/aarch64-apple-darwin/release/bundle/dmg/`。

### Windows x64

```powershell
npm ci
npm run tauri build -- --bundles nsis
```

产物位于 `src-tauri/target/release/bundle/nsis/`。

### Linux x64

先安装 Tauri 所需系统依赖，再执行：

```sh
npm ci
npm run tauri build -- --bundles deb,appimage
```

产物分别位于 `src-tauri/target/release/bundle/deb/` 和 `src-tauri/target/release/bundle/appimage/`。

### 浏览器扩展

在项目根目录执行：

```sh
npm run package:extension
```

默认生成可直接加载的 `ZoomPaper-Plus-Connector` 文件夹，并排除说明文档和系统隐藏文件；重复运行会原地更新。ZIP 仅在传入 `--zip` 时生成。不要修改 `manifest.json` 的 `key`，并保留原来加载的目录路径，以保持扩展 ID 和升级方式稳定。

## 文件命名

上传前统一为：

- `ZoomPaper.Plus_<版本>_aarch64.dmg`
- `ZoomPaper.Plus_<版本>_x64-setup.exe`
- `ZoomPaper.Plus_<版本>_amd64.deb`
- `ZoomPaper.Plus_<版本>_amd64.AppImage`
- 本地安装：`ZoomPaper-Plus-Connector/`，在 Chrome / Edge 中直接加载该文件夹。
- GitHub Release 附件：运行 `npm run package:extension -- --zip` 生成 `ZoomPaper-Plus-Connector_<版本>.zip`，下载后需先解压。

## 手动发布

1. 提交版本改动并推送 `main`。
2. 创建并推送标签：

   ```sh
   git tag -a vX.Y.Z -m "ZoomPaper Plus vX.Y.Z"
   git push origin vX.Y.Z
   ```

3. 在 GitHub 的 **Releases → Draft a new release** 中选择对应标签。
4. 标题填写 `ZoomPaper Plus vX.Y.Z`，正文粘贴 `docs/RELEASE-vX.Y.Z.md`。
5. 上传已在本地构建的安装包和浏览器扩展。
6. 核对文件名、版本、平台和说明后手动发布。

安装包暂未进行 Apple 或 Microsoft 代码签名。发布前应在各目标系统至少完成一次安装和启动验收。
