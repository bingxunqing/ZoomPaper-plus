<p align="center">
  <img src="app-icon.png" alt="ZoomPaper Plus" width="112" />
</p>

<h1 align="center">ZoomPaper Plus</h1>

<p align="center"><strong>AI 英文论文阅读助手</strong></p>

<p align="center">
  ZoomPaper Plus 面向需要阅读英文论文的中文用户，把 PDF 阅读、划词翻译、全文翻译、带引用的 AI 问答和论文整理放在一个桌面应用里，减少在翻译工具、浏览器和笔记软件之间来回切换。
</p>

<p align="center">
  <a href="https://github.com/bingxunqing/ZoomPaper-plus/releases/latest">下载最新版本</a> ·
  <a href="https://github.com/Flutter-Misdreavus/ZoomPaper#readme">上游项目说明</a>
</p>

## 界面预览

<p align="center">
  <img src="docs/images/reader-ai.png" alt="阅读论文并通过带引用的 AI 助手深入问答" width="100%" />
  <br />
  <sub>在原文旁完成划词速译、带引用问答、笔记和深度分析。</sub>
</p>

<table>
  <tr>
    <td width="50%">
      <img src="docs/images/library.png" alt="支持收藏、文件夹和阅读状态的论文库" />
      <br />
      <sub><strong>论文库：</strong>用收藏、文件夹和阅读状态整理资料。</sub>
    </td>
    <td width="50%">
      <img src="docs/images/timeline.png" alt="论文阅读时间线和年度热力图" />
      <br />
      <sub><strong>阅读时间线：</strong>查看阅读时长、连续天数和年度热力图。</sub>
    </td>
  </tr>
</table>

<p align="center">
  <img src="docs/images/help.png" alt="ZoomPaper Plus 功能帮助中心" width="100%" />
  <br />
  <sub>按页面查找操作步骤，也可以直接向 AI 询问软件用法。</sub>
</p>

## 为什么翻译和问答更准确

ZoomPaper Plus 先通过 MinerU 提取论文的标题、段落、公式和图片，再按论文结构分块翻译。翻译提示会保持 Markdown、LaTeX、代码和图片位置，已完成的分块会缓存，因此长文可以逐段生成、对照阅读和继续翻译；划词速译还会带上附近语境，只返回当前术语或短句的中文含义。

问答采用本地 RAG：正文按章节切分并生成向量索引，提问时只取语义相关的原文片段，必要时扩展到完整章节。用户选中的内容会作为优先上下文，回答中的引用保留论文、章节和页码，可以直接回到原文核对。深度模式还会按问题调用论文检索、章节读取和联网搜索，而不是把整篇论文一次性塞给模型。

## 相比上游多了什么

- **论文阅读**：加入划词速译、选文提问、中文标题与摘要、可调节预览、AI 博客、费曼学习和测验。
- **带引用的 AI 助手**：重新设计对话区，支持快速/深度模式、联网搜索、工具调用过程、会话历史、停止生成和原文回跳。
- **论文库与阅读管理**：加入收藏、多级文件夹、多选操作、未读/在读/已读状态、回收站、阅读计划、年度热力图和阅读历史。
- **浏览器 Connector**：从 Chrome / Edge 论文页右键导入，识别常见计算机论文网站、会议与 GitHub 项目；OpenReview 使用浏览器验证会话下载。
- **帮助与易用性**：提供完整的软件内帮助、AI 功能问答、图标提示、网站来源图标和更精简的桌面界面。
- **稳定性修复**：生成任务切换论文后继续运行，并修复中文输入、DeepSeek 回放、文件夹多选、标注覆盖、数据库阻塞和本地密钥权限问题。

原项目的完整功能和配置方式请查看[上游 README](https://github.com/Flutter-Misdreavus/ZoomPaper#readme)。

软件内的“帮助”页面提供操作说明和功能问答；完整功能索引见[使用指南](docs/USER_GUIDE.md)。

## 下载

支持 macOS、Windows 和 Linux 桌面系统。

| 发布附件 | 用途 |
| --- | --- |
| `ZoomPaper.Plus_<版本>_aarch64.dmg` | macOS 13+，Apple Silicon |
| `ZoomPaper.Plus_<版本>_x64-setup.exe` | Windows 10/11，x64 |
| `ZoomPaper.Plus_<版本>_amd64.deb` | Debian / Ubuntu，x64 |
| `ZoomPaper.Plus_<版本>_amd64.AppImage` | 其他常见 x64 Linux 发行版 |
| `ZoomPaper-Plus-Connector_<版本>.zip` | Chrome / Edge 浏览器扩展 |

[前往 Releases 下载](https://github.com/bingxunqing/ZoomPaper-plus/releases/latest)

安装包暂未进行代码签名。macOS 首次启动时，请在访达中右键点击 ZoomPaper Plus 并选择“打开”；若仍被拦截，可执行：

```sh
xattr -dr com.apple.quarantine "/Applications/ZoomPaper Plus.app"
```

Windows 如显示 SmartScreen 提示，请确认下载来源为本仓库后选择“更多信息 → 仍要运行”。Linux 使用 AppImage 时，可能需要先执行 `chmod +x ZoomPaper.Plus_*.AppImage`。

PDF 解析需要配置 MinerU；翻译和 AI 功能需要配置 OpenAI、Anthropic、Gemini 或 DeepSeek 中至少一个服务。

## 浏览器扩展

1. 安装并启动一次 ZoomPaper Plus。在 [Releases](https://github.com/bingxunqing/ZoomPaper-plus/releases/latest) 下载 `ZoomPaper-Plus-Connector_<版本>.zip` 并解压。
2. 打开 Chrome 的 `chrome://extensions` 或 Edge 的 `edge://extensions`，开启**开发者模式**，点击**加载已解压的扩展程序**，选择解压后包含 `manifest.json` 的文件夹。
3. 在论文页面右键选择**加入 ZoomPaper Plus**，或点击扩展图标；首次使用时允许浏览器打开桌面应用。

从 Connector `v0.2.8` 起扩展 ID 固定。更新时解压新版并在扩展管理页重新加载即可覆盖升级；从更早版本升级需要最后一次移除旧扩展。`v0.2.9` 新增浏览器下载权限，用于导入受验证保护的 OpenReview PDF。也可以直接安装仓库中的 [`browser-extension`](browser-extension/README.md) 文件夹；支持的网站见[兼容性说明](docs/BROWSER-SUPPORT.md)。

<details>
  <summary>开发与构建</summary>

  ```sh
  npm install
  npm run tauri dev
  npm run tauri build
  ```

  发布流程见 [docs/RELEASING.md](docs/RELEASING.md)，人工验收见 [docs/WORKFLOW-ACCEPTANCE.md](docs/WORKFLOW-ACCEPTANCE.md)。
</details>

## 协议与致谢

本项目遵循 [MIT License](LICENSE)。感谢 [ZoomPaper 原作者及贡献者](https://github.com/Flutter-Misdreavus/ZoomPaper/graphs/contributors)。本 fork 当前同步至上游 `v0.3.0`。
