# 刻录之后 · MiniDisc Label Studio

六语言界面、零运行时依赖的静态标签编辑器。所有封面和项目留在本机；无后端、无分析统计、
无外部字体请求。[公开网站](https://bithostgits.github.io/md-label-studio/)。代码独立实现；原 MiniDisc 标志单独保留权利，见 THIRD-PARTY-NOTICES.txt。

## UI languages / 多语言界面

**English is the default.** Use the language selector at the top-right to choose
**English, 简体中文 (Simplified Chinese), 繁體中文 (Traditional Chinese), Español,
Français, or 日本語**, in that order. Your choice is saved locally in this browser
and restored on reload. The page language and accessibility labels follow your
selection. If browser storage is unavailable, language switching still works for
the current visit; a new visit defaults to English.

Only the interface changes: your album/artist text, sample content, selected label
fonts, canvas artwork, geometry, and printed exports stay unchanged.

The selectors offer one additional language-appropriate offline face per language:
Source Sans 3 for English/Español/Français; Noto Sans SC Regular 400 for 简体中文
(alongside the existing 600-weight face); Noto Sans TC for 繁體中文; Noto Sans JP
for 日本語. All are freely redistributable under SIL OFL 1.1, with source URLs and
full license files in [the font documentation](./assets/fonts/README.md).
All nine faces total 23.43 MiB (9.07 MiB added), within the existing 25 MiB font
budget. Original font files and old projects’ font choices are unchanged.
Font choices are saved per set in the existing backward-compatible project schema;
a selected font outside the current language’s suggestions remains selected and
is marked as retained. Switching language never automatically selects a different
font. Selecting a font deliberately changes label rendering; export bytes remain
identical across UI languages **when font choices and other settings are unchanged**.

 The printed
insertion/calibration captions retain their existing wording. Download filenames
are localized; the exported PNG bytes are identical for identical project settings.
The single `i18n.mjs` module contains all six dictionaries; there are no translation
services or runtime external requests. The additional fonts and licenses are bundled
as local static assets. Already-loaded pages also support
language switching without internet access. No service worker or offline first-load
claim is made.

- **简体中文：** 欢迎！在右上角选择语言；界面切换不会改变标签内容或打印图像。
- **繁體中文：** 歡迎！在右上角選擇語言；切換介面不會改變標籤內容或列印圖像。
- **Español:** ¡Bienvenido! Elige el idioma arriba a la derecha; el contenido de las etiquetas y las imágenes impresas no cambian.
- **Français :** Bienvenue ! Choisissez la langue en haut à droite ; le contenu des étiquettes et les images imprimées restent inchangés.
- **日本語：** ようこそ！右上で言語を選べます。ラベルの内容や印刷画像は変わりません。

Regression tests: `npm run test:fonts` checks per-language options, glyph coverage,
real downloads and project round-tripping. `npm run test:i18n` verifies all UI dictionaries, rendered strings,
localStorage/reload/default behavior, localized errors, and SHA-256 equality of
real PNG downloads across all languages. `npm run test:spine` and
`npm run test:himd` remain available alongside the existing suites.

## 本地运行

在 `app/`（或解压后的发行包根目录）执行：

```sh
python3 -m http.server 8080 --bind 127.0.0.1
```

打开 `http://127.0.0.1:8080/`。请勿双击 `file://` 打开：浏览器会阻止 ES 模块/字体清单。
运行不需要 npm install。开发测试：`npm test`、`npm run test:browser`、`npm run test:fixes`、`npm run test:logo`、
`npm run test:four-set`；构建：`npm run build`。
构建把仅需公开的文件复制至 `dist/`，生成逐文件 SHA-256 的 `build-manifest.json`。
静态发行包可从 `dist/` 运行；开发测试仍在源码 `app/tests/`。

## 功能

- A/B/C/D 四套独立专辑、艺术家、年份、封面、字体、主题、大小写、隐藏头部和尺寸。
  默认打印四套；可选原两套 A/B 布局。切换套数不丢失 C/D，四套都保存在项目内。
- 上传 PNG/JPEG/WebP（≤12 MiB），等比 contain；拒绝 SVG/动图、坏文件、超过6400万像素的图。
  边长超过2048像素时本地降采样。四款原创程序绘制示例随机切换，只更改内容/封面。
- 深色 `#231F20` / 白字，浅色白底 / 黑字。英文大写不改变编辑值与文件名。
- 原版几何：38×54；头部5，封面38×38；正文 x2 / y43 / w34 / h11。
  隐藏头部后封面 y0，正文 y38 / h16。正文字号1.76、行距2.12；长文字区域截断不缩小。
  书脊仅专辑与艺术家，过长省略。保留原输入；无虚构的曲目列表功能。
- 所有生成标签都有 **0.10 mm 内置裁切线**。此线是新增功能，不属于原版像素完全复现。
- 正面/书脊 PNG、四套或两套整张 PNG、未补偿双轴校准 PNG；全部带300 DPI `pHYs`。
- 本地项目 JSON v2 保存/载入（含四套上传图片），兼容旧 v1 双套项目：保留 A/B 和原两套布局，
  新增独立 C/D 示例，可手动切换四套。几何 manifest 下载、安全文件名、载入失败提示。
  不会自动把项目写入浏览器持久存储；关闭/刷新前请保存。
- 字体：保留原五款，新增 Source Sans 3、Noto Sans SC 常规 400、Noto Sans TC、Noto Sans JP；九款均离线，完整授权和来源见字体目录。

## 两类导出不能混淆

1. **原版像素兼容**：只适用于原版38×54方案，缩放11.811，画布整数截断 **448×637**。
   pHYs=11811像素/米，约299.9994 DPI，编码物理尺寸约37.931×53.933 mm。
   这是来自参考审计的高可信源码推导；**没有原站真实下载 PNG 或截图作为验证**。
2. **真实毫米取整**：`round(mm×300/25.4)`，38×54 → **449×638**；58×3.5 → **685×41**。
   单边量化≤0.04234 mm。纸张内标签按连续毫米绘制、绝对边缘取整记录；宽度误差可≤1像素。

独立单标签导出不受打印纸校准影响；纸张内标签始终使用名义毫米几何（不放大448×637贴图）。
厂商32×52与社区Sony35.75×52.75是**独立方案**，不替换38×54基线。
尺寸证据来源于项目研究：Elecom EDT-KMD1 / A-one 31274 正面规格；Elecom EDT-KMD2 书脊58×3.5；
Sony尺寸为社区测量，不是官方通用贴纸规格。未模拟Sony单角切角，自定义请依据实测。

## SELPHY、校准与物理限制

- 默认：**四套，成品100×148 mm →1181×1748 px**，不是有进纸撕边的100×177。
  正面38×54 mm：A/B 起点 (9,6)/(53,6)，C/D (9,62)/(53,62)；
  书脊58×3.5 mm：x21，y118/123.5/129/134.5。裁切线0.10 mm向内，安全边距至少6 mm。
  自定义尺寸沿用这些锚点，重叠或超出安全边距时拒绝整张导出，不自动缩小或换位。
  有效的独立正面/书脊导出仍可使用；两套模式保留旧居中布局。
- 可选真正4×6英寸：**101.6×152.4 mm →1200×1800 px**，不宣称是SELPHY纸。
- 页面始终提示未经物理验证。默认双轴系数1，未校准。
- 测试纸水平、垂直标尺都是以纸张中心为中点的 **50 mm 全长**（−25…+25）；绝非100mm横向标尺。
  附带38×8和58×3.5参考框，其尺寸清楚标注；不是虚构的标准正面框。
- 用同一打印机、路径和设置打印**未补偿**测试纸，分别测量X/Y两端长刻线距离，输入后开启补偿。
  `factorX=50/measuredX`，Y同理。不预设无边距过扫描常数。
- 标签内容和裁切线 **一起围绕纸张中心变换**，纸张画布及300 DPI元数据保持不变。
  6mm安全边距、全部标签之间的碰撞在补偿后同时检查，不自动缩放/裁掉无效布局。
- 有边距的缩小不算精确适配；两种边距模式均需试印。必须再测量两套标签。
  打印机型号/路径/实物试印未知，不能保证真实盘壳适配。测试纸始终未补偿，防止递归误校准。

## 几何清单 / 独立 checker 适配

`schema: md-studio/1`，包含纸张、导出画布、两套或四套front/spine、毫米及像素边界、内置裁切线和校准。
`designMm` 是原始中心布局，`renderedMm = center + (designMm-center)*factor`。
既有独立 `tests/geometry-check.mjs` 只识别关于原点的乘法；为了兼容，清单中
`nominalMm` 的 **位置**显式预平移为 `renderedPosition/factor`，尺寸仍是名义尺寸。
随后既有检查器的 `nominalMm*factor` 恰好等于实际中心变换。`transform` 字段解释该约定。
这不改变实际图像或混淆物理标称大小。初始未校准时 `nominalMm===designMm`。
清单像素值来自真正生成的canvas尺寸，不代表独立PNG解码；浏览器测试另行解码下载PNG进行验证。
物理验证字段永远不据此设为true。

## 测试与发布

- `npm test`：纯Node几何/PNG元数据/字体授权测试；若相邻独立几何checker存在，也测试真实生产清单。
- `npm run test:browser`：Playwright Core + 本地Chrome。只访问隔离的127.0.0.1服务，含子路径、实际下载、
  pHYs/CRC、字体矩阵、图片/项目处理、断网导出、损坏字体、手机宽度截图。无需/不会访问参考站。
  按环境设置 `PLAYWRIGHT_MODULE=/path/to/playwright-core`、`CHROME_PATH=/path/to/chrome`；
  不自动下载或安装浏览器。输出在 `tests/artifacts/`。运行各测试命令查看当前测试结果。
- `npm run build` 后仅部署 `dist/` 内容。GitHub Pages 可放在仓库根或发布目录，所有URL均相对路径；
  也可放任意静态服务器子路径。公开版本由 GitHub Pages 仓库根目录发布。
- 浏览器支持要求：ES模块、Canvas2D、FontFace、structuredClone。已实测Chrome；Safari/Firefox尚未验证。
- 不注册Service Worker。下载目录在无互联网时可用本地HTTP运行；浏览器强制Offline模式下的**首次导航/刷新**
  不保证可用。已载入页面断网后可继续编辑与导出。

## 权利与明确差异

原代码无可验证许可，故全部独立编写。未复用专辑图或 Adobe kit。原 MiniDisc 标志作为单独本地资源复用，非 MIT/OFL；未声称已获权利人许可。
原站Futura替换为OFL Atkinson；插入头使用普通三角及原 44×43 黑白 MiniDisc 图；不随主题染色。标志右缘为宽度减2mm（38mm正面时36mm），y=(5−43/11.811)/2≈0.6794mm，尺寸44/11.811×43/11.811mm；隐藏头部时不加载或绘制。
原始四张程序艺术随应用MIT许可；用户上传图片由用户自己确认权利。
字体转换重命名及许可证、源hash、版本在 `assets/fonts/`；原五款 14.36MiB，含新增字体共 23.43MiB，无字形裁剪。
无原站同输入视觉diff；字体、抗锯齿、原版的非法bold font-variant语义与边框等差异不可能声称逐像素一致。
并未复制原站的图片载入竞态，文本文字处理是独立实现，长词换行细节需原站实测后复核。

## 尺寸来源链接（依据研究报告，未在本实现中重新进行网络实测）

- [Elecom EDT-KMD1 正面 32×52](https://www.elecom.co.jp/products/EDT-KMD1.html)
- [A-one 31274 正面 32×52](https://www.a-one.co.jp/product/search/detail.php?id=31274)
- [Elecom EDT-KMD2 书脊 58×3.5](https://www.elecom.co.jp/products/EDT-KMD2.html)
- [SWHarden 社区测量](https://swharden.com/blog/2005-08-12-custom-minidisc-labels/)
- [社区35.75×52.75模板记录](https://www.scribd.com/document/882070177/Sony-Minidisc-Labels-a4-6up)

这些外链只在用户点击后访问；应用不会后台请求。来源级别和访问限制见父项目研究报告。

## Independent QA fixes
- Front, spine, sheet and calibration availability are validated independently of preview selection. Failed previews are cleared and their errors remain visible.
- Spine validates album/artist and selected offline fonts, not year or cover. Front/sheet retain their own validation.
- APNG chunks and WebP animation flags/chunks are rejected before image decoding, including restored project images; static PNG/JPEG/WebP remain supported. Rejected uploads retain the previous valid cover.
- Builds use a fresh staging directory and an explicit file allowlist. Only owned `dist/` is replaced; unrelated files are not cleaned. Symlink inputs/output are refused.

## 四套项目边界与恢复（审计 F1–F4 修复）

A/B/C/D 始终可独立编辑和导出；两套模式只切片整张纸的 A/B，不隐藏 C/D，
切换模式保持当前编辑套装。键盘左右循环仅遍历可见、启用的标签页。

本地项目 JSON 保持原始四套字段和已接受的图片 data URL，不去重、不额外重编码、
不静默截断。上传仍限每张 12 MiB；原有最长边超过 2048 px 的等比缩图规则未改变。
缩图后的 PNG 可能比源压缩图片更大，因此保存和载入统一允许每张 data URL 最多
24 Mi 字符（含前缀），项目文件最多 100 MiB。四张 ASCII data URL 合计最多 96 MiB；
每套三个文字字段各限 2000 字符、图片名 1024 字符及固定 JSON 元数据远小于余下 4 MiB。
24 Mi 字符足以容纳 2048² RGBA PNG 或未缩图的 12 MiB 文件。保存前执行与载入相同
的字段检查及实际 Blob 字节上限检查；超限拒绝保存/上传，不改变原内容。
载入在任何状态替换前完成文件大小、字段与全部图片/字体验证；失败保留原项目。
恢复不从网络读取图片、不持久化、不附加有损压缩；大项目需要相应浏览器内存。

默认 100×148 mm / 1181×1748 px / 300 DPI，X/Y=1，不自动缩小。
正面 38×54 mm：A (9,6)、B (53,6)、C (9,62)、D (53,62)。
书脊 58×3.5 mm：x21，y118 /123.5 /129 /134.5。原标志、边框、旧项目迁移保持。

### 书脊文字垂直居中

书脊使用最终显示字符串（含省略号）的实际墨迹 ascent/descent 测量；alphabetic 基线为
`labelHeight/2 + (actualBoundingBoxAscent - actualBoundingBoxDescent)/2`，不再误把 Canvas
`middle` 的 em-box 中点当成可见中文/Latin 字形的中心。单条书脊取实际整数 PNG 高度，
整张排版保持连续毫米尺寸；两者共用同一绘制路径。字号、水平起点、裁切线和几何不变。
原站资料仅包含正面标签，其 Konva `verticalAlign="middle"` 居中行框；不能当作存在原站书脊导出
或精确字形墨迹居中的证据。新增实下载测试覆盖两款 Latin、三款 CJK、纯中/英及混排、
深浅主题和截断文字；墨迹带中心允许至多 1 个像素的取整/抗锯齿误差。

## Hi-MD（每套独立）

勾选 Hi-MD 后，正面在原 MiniDisc 标志左侧显示真实水平 Hi-MD 标志，
使用应用生成的加宽外框（106×43 源单位），保留原框高度、笔画与边角；
标志保持原始 272:88 比例，两框间距 0.5 mm。原 MiniDisc 像素位置不变。
此框是应用设计，不是官方带框变体；不再使用历史方形组合稿。
隐藏头部也隐藏正面两种标志。书脊右侧使用同一原始水平 Hi-MD 图像，
文字按剩余宽度截断，按可见字形垂直居中。
选项默认关闭；v2 项目保存每套 hiMD 布尔值，旧 v1/v2 项目缺省关闭。
标志来自 Wikimedia 的 Sony/Minidisc.org 来源位图，图稿及商标权利保留，
见 THIRD-PARTY-NOTICES.txt；不属于代码 MIT 或字体 OFL 授权。
