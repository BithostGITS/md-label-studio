# 本地字体与授权

字体只从同源相对路径加载；不请求 Google Fonts / Adobe / 外部 CDN。
所有字体均为 **SIL Open Font License 1.1**，每款原始授权全文随包保留。

| UI 名称 | 原始文件来源（Google Fonts `ofl`） | 本地文件 | 修改 |
|---|---|---|---|
| Atkinson Hyperlegible | `atkinsonhyperlegible/AtkinsonHyperlegible-Bold.ttf` | atkinson.woff2 | WOFF2 转换，内部重命名 |
| B612 | `b612/B612-Bold.ttf` | b612.woff2 | 同上 |
| Noto Sans SC | `notosanssc/NotoSansSC[wght].ttf` | noto-sans.woff2 | 固定字重 600，WOFF2，内部重命名 |
| Noto Serif SC | `notoserifsc/NotoSerifSC[wght].ttf` | noto-serif.woff2 | 同上 |
| LXGW WenKai TC | `lxgwwenkaitc/LXGWWenKaiTC-Regular.ttf` | wenkai.woff2 | WOFF2 转换，内部重命名；TC 字形风格，覆盖简繁中文 |

源站根路径：https://raw.githubusercontent.com/google/fonts/main/ofl/
获取日期：2026-10-02。`manifest.json` 保留完整下载 URL、源文件 SHA-256、
字体内嵌版本、分发文件 SHA-256 / 字节数 / Unicode cmap 范围。
来源使用可变的 main URL；以归档 SHA-256 与内嵌版本标识本次实际字节，
不声称已固定 Git 提交版本。

字体内部全部重命名为 **MD Studio atkinson / b612 / noto-sans / noto-serif / wenkai**；
未复用保留字体名作为派生字体名称，原始版权声明保留。**未做字符子集裁剪**。
总计 15,061,404 bytes（14.36 MiB），最大单文件约 5.53 MiB。
源字体及 fontTools 不随静态发行包分发。

原站默认 Futura 的授权尚未取得。这里明确替换为 Atkinson，并不承诺逐像素相同。
每次导出检查所选 FontFace 已载入、浏览器字体检查成功、输入字符处于所选两款字体
的 cmap 联合覆盖范围；无法保证所有 Unicode 文本都可用。未覆盖字符会阻止导出，
不会静默借用系统字体。cmap 检查不等于完整复杂文字塑形验证；本次实测范围为中英混排。
