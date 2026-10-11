# IELTS Reader

仅提供 Cambridge IELTS 13 Academic → Test 3 → Reading Passage 3：**Whatever happened to the Harappan Civilisation?**

网站：https://3871337241-gif.github.io/ielts-reader/

## 使用

- 原文 A–H 全文与标题中的英文词都可以点击，基础功能词默认弱化。
- 词卡提供本文义、原形、词性、常见义、可信构词说明、题干同义替换和原形复现位置。
- 发音调用设备语音 API，请求 `en-GB` 并优先使用已安装的英国英语声音；没有合适语音时可从词卡打开 Cambridge Dictionary。未伪造 IPA 或词源。
- 收藏按原形合并。生词本可翻卡复习、记录掌握状态。
- Questions 27–40 保留原书完整说明、摘要和研究者列表；提交后评分，展示 14 题证据、逻辑、替换与易错点。
- 错题本、已作答答案、提交记录和阅读锚点自动保存在当前浏览器。学习导航可导出或导入 JSON 备份。
- 证据按钮定位并高亮具体原句，底部按钮返回原题。

## 来源与核对

原始 PDF 保留在用户本地，未修改、未上传。仅整理本篇。正文印刷页 68–69、原题 70–72、答案 123 均已逐页图像核对。

原始 PDF SHA-256：`f6bbbbf97633bc8dfd71f11b68b8fff4da607cbe2408cfebdbe54cf05c6b18cf`。

正文与 PDF 提取文本逐段比较，A–H 字母和数字全部一致；恢复了提取丢失的引号、标点与空格。官方答案：27 C, 28 H, 29 A, 30 B, 31 D, 32 shells, 33 lake, 34 rainfall, 35 grains, 36 pottery, 37 B, 38 A, 39 D, 40 A。

中文释义、解析及长句讲解是学习注释，不是原书译文。无需猜测的专名保持原文名称；不强行拆分没有可靠依据的词根。少数常见多义词按句子区分（如 course、led、bodies、fall）。

## 本地运行

在仓库根目录运行 `python3 -m http.server 8000`，访问 http://localhost:8000/ 。纯静态 HTML / CSS / ES modules，无构建依赖或后端。

## 验证

使用 Node.js 22 或更新版本：`npm test`。

包含评分边界、分词、备份恢复、无效导入防护等 5 项测试；内容检查覆盖 A–H、32 句、14 题与官方答案、全部 427 词形、890 个可点击词元以及证据和复现定位。

本地持有 PDF 时安装 `pypdf`，可运行：`python3 scripts/verify-pdf.py /你的路径/剑桥雅思13.pdf`。该脚本只读 PDF。

实测记录见 [TEST_RESULTS.md](TEST_RESULTS.md)。GitHub Actions 在每次提交和 PR 上运行代码与内容检查。

## GitHub Pages

Settings → Pages → Build and deployment → Deploy from a branch → `main` / `/(root)` → Save。所有资源使用相对路径，支持项目型 Pages URL，`.nojekyll` 禁用 Jekyll 处理。

## 文件结构

`src/` 为阅读器界面和学习逻辑；`content/c13-t3-p3/` 分离原文、词汇、原题与解析；`verification/source-check.json` 保存本篇核对信息；`tests/` 和 `scripts/` 提供校验。

当前只展示此篇。第一篇验收前不添加其他文章。数据使用句子 ID（如 E4）作为证据锚点，后续如需扩展必须另行提供核对过的数据并修改索引及当前文章选择逻辑。

## 使用限制

学习记录不会自动跨设备同步；清理浏览器数据前请导出备份。英国英语发音取决于设备可用语音。真实 iPhone Safari 硬件与实际音频输出仍需用户设备验收。第三方词典不是网站运行依赖，可能受网络限制。
