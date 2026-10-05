**语言：** [English](./README.md) · [简体中文](./README.zh-Hans.md) · [繁體中文](./README.zh-Hant.md) · [Español](./README.es.md) · [Français](./README.fr.md) · [日本語](./README.ja.md)

# 刻录之后 · MiniDisc 标签工作室

面向 MiniDisc 盘片的静态标签编辑器：六语言界面、零运行时依赖，为 SELPHY 尺寸纸张的精确 300 DPI 打印而设计。所有封面与项目文件都留在本机——无后端、无统计、无外部字体请求。可选在线资料查询默认关闭；启用后，输入的搜索词会直接发送给你选择的服务。[打开在线网站](https://bithostgits.github.io/md-label-studio/)。

代码为独立实现。原版 MiniDisc 标志作为单独资源保留，权利归其权利人所有，见 `THIRD-PARTY-NOTICES.txt`。

## 主要功能

- **A/B/C/D 四套独立标签**：每套可独立设置专辑、艺术家、年份、封面、字体、主题、大小写、隐藏头部与尺寸。默认一张纸打印四套；也保留经典两套 A/B 布局，切换不丢失 C/D。
- **原版几何**：正面 38×54 mm，头部 5 mm，封面 38×38 mm；书脊 58×3.5 mm。所有生成的标签都带 **0.10 mm 内置裁切线**。
- **300 DPI 导出**：四套整纸 100×148 mm → 1181×1748 px；真实毫米正面 449×638、书脊 685×41；历史兼容 448×637；未补偿双轴校准图。全部带 `pHYs` = 11811 px/m。
- **可选 Hi-MD 标志**（每套独立）：正面在 MiniDisc 标志旁加横向 Hi-MD 标志，书脊右侧加横条，使用真实 Hi-MD 字标，权利保留。
- **六语言界面**（默认英语，另有 简体中文、繁體中文、Español、Français、日本語），每种语言提供适配的离线字体；切换语言不会改变标签内容或导出字节。
- **可选在线专辑查询**（默认关闭）：MusicBrainz 两段式检索或 iTunes 元数据建议、分阶段进度与独立重试按钮、可选 Cover Art Archive 封面导入（含分辨率警告），手动上传封面始终可用。仅浏览器直连服务商，无代理、无密钥。
- 本地项目 JSON v2 保存/载入（含四套上传封面），兼容旧两套项目。

## 本地运行

在 `app/`（或解压后的发行包根目录）执行：

```sh
python3 -m http.server 8080 --bind 127.0.0.1
```

打开 `http://127.0.0.1:8080/`。请勿用 `file://` 打开（浏览器会阻止 ES 模块/字体清单）。无需 `npm install`。开发测试：`npm test`、`npm run test:browser`、`npm run test:fixes`、`npm run test:logo`、`npm run test:four-set`、`npm run test:spine`、`npm run test:himd`、`npm run test:i18n`、`npm run test:autocomplete`。构建：`npm run build`（按白名单复制到 `dist/` 并生成 SHA-256 清单）。

## 打印须知

- 默认整纸为**成品 100×148 mm**（不是带撕边的 100×177）。正面锚点：A(9,6)、B(53,6)、C(9,62)、D(53,62)；书脊 x21，y118/123.5/129/134.5。安全边距至少 6 mm；自定义布局无效时直接拒绝，绝不自动缩小。
- 可选真 4×6 英寸（101.6×152.4 mm → 1200×1800 px）；不宣称是 SELPHY 纸。
- 校准默认未补偿：先打印测试纸、测量后按 `factor = 50 / 实测值` 输入。未试印不保证实物适配。

## 权利与差异

代码独立编写（应用 MIT；原创示例 artwork 同为 MIT）。原版 MiniDisc 标志与 Hi-MD 标志为单独资源，商标/图稿权利归其权利人（Sony 相关）所有，未声称获得再分发许可。原站 Futura 替换为 OFL 许可的 Atkinson；中日文字体均为 OFL 离线字体。九款字体共 23.43 MiB，完整许可证在 `assets/fonts/`。不对原站做逐像素一致声明。尺寸来源（Elecom/A-one/SWHarden）见研究报告，链接仅在点击时访问。

其他语言说明见上方语言导航。
