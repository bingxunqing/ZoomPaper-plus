<p align="center">
  <img src="app-icon.png" alt="ZoomPaper" width="128" />
</p>

<h1 align="center">ZoomPaper Plus</h1>

<p align="center">面向真实论文阅读流程的 ZoomPaper 社区增强版。</p>

<p align="center">
  <a href="https://github.com/bingxunqing/ZoomPaper-plus/releases/latest">下载最新版本</a> ·
  <a href="https://github.com/Flutter-Misdreavus/ZoomPaper#readme">查看上游完整说明</a> ·
  <a href="docs/WORKFLOW-ACCEPTANCE.md">验收清单</a>
</p>

## 界面预览

<p align="center">
  <img src="docs/images/reader-ai.png" alt="阅读论文并通过带引用的 AI 助手深入问答" width="100%" />
  <br />
  <sub>原文阅读与 AI 问答并排进行，回答包含可回溯引用、工具轨迹和思考耗时。</sub>
</p>

<table>
  <tr>
    <td width="50%">
      <img src="docs/images/selection-translate.png" alt="选中论文术语后快速查看中文释义" />
      <br />
      <sub><strong>划词速译：</strong>选中术语即可得到简洁中文释义，也可继续高亮、提问或记笔记。</sub>
    </td>
    <td width="50%">
      <img src="docs/images/feynman-learning.png" alt="通过费曼学习计划深入理解论文" />
      <br />
      <sub><strong>费曼学习：</strong>按概念制定学习路线，由 AI 学生追问并通过测验检查理解。</sub>
    </td>
  </tr>
</table>

<details>
  <summary>查看论文库</summary>
  <br />
  <img src="docs/images/library.png" alt="ZoomPaper Plus 论文库" width="100%" />
</details>

## 与上游的关系

本仓库基于 [Flutter-Misdreavus/ZoomPaper](https://github.com/Flutter-Misdreavus/ZoomPaper)，当前已同步上游 `v0.2.0`。ZoomPaper 的完整功能、配置方式、技术架构和使用指南请直接查看[上游 README](https://github.com/Flutter-Misdreavus/ZoomPaper#readme)。本页只记录这个 fork 的差异。

## 本 fork 新增与修复

### 更像成熟产品的 AI 对话

- 重做阅读器侧栏和独立问答页的消息布局、状态提示、引用区与输入区。
- 输入框随内容增高；`Enter` 发送、`Shift + Enter` 换行，并正确处理中文输入法组合态。
- 支持生成中停止、回答复制、历史会话恢复，以及快速/深度模式和联网开关记忆。
- 修复 DeepSeek 深度模式中 `reasoning_content` 回放和工具调用兼容问题。

### 划词速译与阅读效率

- 在 PDF、AI 博客和中文译文中划选文字，可直接获得简洁中文释义。
- 速译会参考少量上下文区分学术词义，带加载、超时、失败重试和收起状态。
- 论文库可按标题、作者和摘要筛选，并记住排序方式；支持“继续阅读”和阅读笔记导出。

### 数据可靠性与安全

- 标注按顺序写入并采用原子落盘，避免快速连续操作覆盖数据或留下半写文件。
- 损坏的标注数据会明确报错，避免静默覆盖原文件。
- Embedding 准备移出数据库锁，减少首次索引时的界面阻塞。
- macOS / Unix 下将含 API Key 的 `settings.json` 权限收紧为仅当前用户可读写。

## 下载

当前只提供 **macOS 13+、Apple Silicon（M1/M2/M3/M4）** 安装包。

| 发布附件 | 用途 |
| --- | --- |
| `ZoomPaper_<版本>_aarch64.dmg` | 最终用户安装包；GitHub Release 应上传这个文件 |

[前往本 fork 的 Releases](https://github.com/bingxunqing/ZoomPaper-plus/releases/latest)

维护者发布新版本时，请参照[发布指南](docs/RELEASING.md)。

应用尚未进行 Apple 签名和公证。首次启动时，请在访达中右键点击 ZoomPaper，选择“打开”；也可执行：

```sh
xattr -dr com.apple.quarantine /Applications/ZoomPaper.app
```

## 开发与构建

需要 Node.js 20.19+、Rust stable、Xcode Command Line Tools。

```sh
npm install
npm run tauri dev

# 构建 Apple Silicon 的发布安装包
npm run tauri build -- --bundles dmg --target aarch64-apple-darwin
```

构建产物位于：

```text
src-tauri/target/aarch64-apple-darwin/release/bundle/dmg/
```

使用前仍需配置 MinerU，以及 OpenAI、Anthropic、Gemini 或 DeepSeek 中至少一个 AI 服务。应用数据默认位于：

```text
~/Library/Application Support/com.paper-reader/
```

## 验证

- 前端交互测试：14 项
- Rust 单元与集成测试：137 项通过，1 项真实模型测试默认忽略
- `npm audit`：0 个已知漏洞

详细人工回归步骤见 [docs/WORKFLOW-ACCEPTANCE.md](docs/WORKFLOW-ACCEPTANCE.md)。

## 协议与致谢

本项目遵循 [MIT License](LICENSE)。感谢 [ZoomPaper 原作者及贡献者](https://github.com/Flutter-Misdreavus/ZoomPaper/graphs/contributors)；上游版权声明保留在许可证中。
