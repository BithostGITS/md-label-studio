# 刻录之后 · MiniDisc Label Studio

[在线使用](https://bithostgits.github.io/md-label-studio/) · [源代码](https://github.com/BithostGITS/md-label-studio)

中文优先、零运行时依赖的静态标签编辑器。所有封面和项目留在本机；无后端、无分析统计、
无外部字体请求。独立实现，不包含参考网站未经许可的代码或素材。

## 本地运行

在仓库根目录（或解压后的发行包根目录）执行：

```sh
python3 -m http.server 8080 --bind 127.0.0.1
```

打开 `http://127.0.0.1:8080/`。请勿双击 `file://` 打开：浏览器会阻止 ES 模块/字体清单。
运行不需要 npm install。开发测试：`npm test`；构建：`npm run build`。
构建把仅需公开的文件复制至 `dist/`，生成逐文件 SHA-256 的 `build-manifest.json`。
静态发行包可从 `dist/` 运行；开发测试仍在源码 `tests/`。

## 功能

- A/B 两套独立专辑、艺术家、年份、封面、字体、主题、大小写、隐藏头部和尺寸。
- 上传 PNG/JPEG/WebP（≤12 MiB），等比 contain；拒绝 SVG/动图、坏文件、超过6400万像素的图。
  边长超过2048像素时本地降采样。四款原创程序绘制示例随机切换，只更改内容/封面。
- 深色 `#231F20` / 白字，浅色白底 / 黑字。英文大写不改变编辑值与文件名。
- 原版几何：38×54；头部5，封面38×38；正文 x2 / y43 / w34 / h11。
  隐藏头部后封面 y0，正文 y38 / h16。正文字号1.76、行距2.12；长文字区域截断不缩小。
  书脊仅专辑与艺术家，过长省略。保留原输入；无虚构的曲目列表功能。
- 所有生成标签都有 **0.10 mm 内置裁切线**。此线是新增功能，不属于原版像素完全复现。
- 正面/书脊 PNG、两套整张 PNG、未补偿双轴校准 PNG；全部带300 DPI `pHYs`。
- 本地项目 JSON 保存/载入（含上传图片），几何 manifest 下载、安全文件名、载入失败提示。
  不会自动把项目写入浏览器持久存储；关闭/刷新前请保存。
- 字体：Atkinson、B612、Noto Sans SC、Noto Serif SC、LXGW WenKai TC；全部离线，授权见字体目录。

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

- 默认：**成品100×148 mm →1181×1748 px**，不是有进纸撕边的100×177。
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

`schema: md-studio/1`，包含纸张、导出画布、两套front/spine、毫米及像素边界、内置裁切线和校准。
`designMm` 是原始中心布局，`renderedMm = center + (designMm-center)*factor`。
既有独立 `tests/geometry-check.mjs` 只识别关于原点的乘法；为了兼容，清单中
`nominalMm` 的 **位置**显式预平移为 `renderedPosition/factor`，尺寸仍是名义尺寸。
随后既有检查器的 `nominalMm*factor` 恰好等于实际中心变换。`transform` 字段解释该约定。
这不改变实际图像或混淆物理标称大小。初始未校准时 `nominalMm===designMm`。
清单像素值来自真正生成的canvas尺寸，不代表独立PNG解码；浏览器测试另行解码下载PNG进行验证。
物理验证字段永远不据此设为true。

## 测试与发布

- `npm test`：纯Node几何/PNG元数据/字体授权测试；若相邻独立几何checker存在，也测试真实生产清单。
- `npm run build`：可选的独立静态发行包构建；仅明确列出的文件进入 `dist/`。
- GitHub Pages 直接从 `main` 分支根目录发布，无后端、无需安装依赖或构建。`.nojekyll` 禁用 Jekyll。
- 此公开仓库只包含独立实现、OFL 字体、纯 Node 单元测试和文档；不包含研究归档、用户封面、浏览器测试产物或私人项目 JSON。
- 浏览器支持要求：ES模块、Canvas2D、FontFace、structuredClone。已实测Chrome；Safari/Firefox尚未验证。
- 不注册Service Worker。下载目录在无互联网时可用本地HTTP运行；浏览器强制Offline模式下的**首次导航/刷新**
  不保证可用。已载入页面断网后可继续编辑与导出。

## 权利与明确差异

原代码无可验证许可，故全部独立编写。未复用专辑图、官方MiniDisc标志、Adobe kit。
原站Futura替换为OFL Atkinson；插入头使用普通三角和「MD」文字，不复制品牌图。
原始四张程序艺术随应用MIT许可；用户上传图片由用户自己确认权利。
字体转换重命名及许可证、源hash、版本在 `assets/fonts/`；共14.36MiB，无字形裁剪。
无原站同输入视觉diff；字体、抗锯齿、原版的非法bold font-variant语义与边框等差异不可能声称逐像素一致。
并未复制原站的图片载入竞态，文本文字处理是独立实现，长词换行细节需原站实测后复核。

## 尺寸来源链接（依据研究报告，未在本实现中重新进行网络实测）

- [Elecom EDT-KMD1 正面 32×52](https://www.elecom.co.jp/products/EDT-KMD1.html)
- [A-one 31274 正面 32×52](https://www.a-one.co.jp/product/search/detail.php?id=31274)
- [Elecom EDT-KMD2 书脊 58×3.5](https://www.elecom.co.jp/products/EDT-KMD2.html)
- [SWHarden 社区测量](https://swharden.com/blog/2005-08-12-custom-minidisc-labels/)
- [社区35.75×52.75模板记录](https://www.scribd.com/document/882070177/Sony-Minidisc-Labels-a4-6up)

这些外链只在用户点击后访问；应用不会后台请求。社区测量与厂商规格须区分；实物适配仍需试印。

## Independent QA fixes
- Front, spine, sheet and calibration availability are validated independently of preview selection. Failed previews are cleared and their errors remain visible.
- Spine validates album/artist and selected offline fonts, not year or cover. Front/sheet retain their own validation.
- APNG chunks and WebP animation flags/chunks are rejected before image decoding, including restored project images; static PNG/JPEG/WebP remain supported. Rejected uploads retain the previous valid cover.
- Builds use a fresh staging directory and an explicit file allowlist. Only owned `dist/` is replaced; unrelated files are not cleaned. Symlink inputs/output are refused.
