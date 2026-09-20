# ZoomPaper Plus v0.2.1

本版本基于上游 ZoomPaper `v0.2.0`，重点改善 AI 对话、划词速译、阅读流程和本地数据可靠性。

## 新增与优化

- 重做问答界面和输入区，使阅读器侧栏与独立问答页更接近成熟 AI 对话产品。
- 输入框自动增高；支持 `Enter` 发送、`Shift + Enter` 换行，并兼容中文输入法组合态。
- 支持停止生成、复制回答、恢复历史会话，以及记忆快速/深度模式和联网开关。
- PDF、AI 博客和中文译文支持划词速译，直接返回简洁中文释义。
- 论文库支持按标题、作者和摘要筛选、记忆排序、继续阅读和导出阅读笔记。
- 新增 ZoomPaper Connector 浏览器扩展：可从论文页面或 PDF 链接右键加入论文库，覆盖常见学术元数据，并内置 ACL Anthology、arXiv、OpenReview、CVF Open Access、NeurIPS 规则。

## 修复

- 修复 DeepSeek 深度模式的推理内容回放和工具调用兼容问题。
- 标注改为顺序、原子写入，避免连续编辑时覆盖或产生不完整文件。
- 损坏的标注文件不再被静默覆盖。
- Embedding 准备过程不再长时间占用数据库锁。
- macOS / Unix 下的 `settings.json` 权限收紧为 `0600`，降低 API Key 被同机其他用户读取的风险。

## 下载与兼容性

- 系统：macOS 13+
- 处理器：Apple Silicon（M1/M2/M3/M4）
- 安装包：`ZoomPaper_0.2.1_aarch64.dmg`
- 浏览器扩展：`ZoomPaper-Connector_0.2.1.zip`（Chrome / Edge，解压后以开发者模式加载）
- 当前未提供 Intel、Windows 或 Linux 安装包。

应用尚未进行 Apple 签名和公证。首次启动时，请在访达中右键点击 ZoomPaper 并选择“打开”。如系统仍然拦截，可执行：

```sh
xattr -dr com.apple.quarantine /Applications/ZoomPaper.app
```

## 使用前配置

PDF 解析需要 MinerU。翻译、问答和费曼学习需要配置 OpenAI、Anthropic、Gemini 或 DeepSeek 中至少一个服务。

## 升级说明

应用会自动执行数据库迁移。升级前仍建议备份：

```text
~/Library/Application Support/com.paper-reader/
```

## 验证结果

- 前端交互与网站识别测试：22 项通过
- Rust 测试：138 项通过，1 项真实模型集成测试默认忽略
- `npm audit`：0 个已知漏洞

完整功能说明请查看[上游 README](https://github.com/Flutter-Misdreavus/ZoomPaper#readme)，本 fork 的差异见[本仓库 README](https://github.com/bingxunqing/ZoomPaper-plus#readme)。
