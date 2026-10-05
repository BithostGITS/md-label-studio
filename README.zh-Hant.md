**語言：** [English](./README.md) · [简体中文](./README.zh-Hans.md) · [繁體中文](./README.zh-Hant.md) · [Español](./README.es.md) · [Français](./README.fr.md) · [日本語](./README.ja.md)

# 刻錄之後 · MiniDisc 標籤工作室

面向 MiniDisc 光碟的靜態標籤編輯器：六語言介面、零執行期相依，為 SELPHY 尺寸紙張的精確 300 DPI 列印而設計。所有封面與專案檔都留在本機——無後端、無統計、無外部字型請求。可選線上資料查詢預設關閉；啟用後，輸入的搜尋詞會直接傳送給你選擇的服務。[開啟線上網站](https://bithostgits.github.io/md-label-studio/)。

程式碼為獨立實作。原版 MiniDisc 標誌作為單獨資源保留，權利歸其權利人所有，詳見 `THIRD-PARTY-NOTICES.txt`。

## 主要功能

- **A/B/C/D 四套獨立標籤**：每套可獨立設定專輯、藝人、年份、封面、字型、主題、大小寫、隱藏標頭與尺寸。預設一張紙列印四套；亦保留經典兩套 A/B 版面，切換不會遺失 C/D。
- **原版幾何**：正面 38×54 mm，標頭 5 mm，封面 38×38 mm；書脊 58×3.5 mm。所有產生的標籤都內建 **0.10 mm 裁切線**。
- **300 DPI 匯出**：四套整頁 100×148 mm → 1181×1748 px；真實公厘正面 449×638、書脊 685×41；歷史相容 448×637；未補償雙軸校準圖。全部帶 `pHYs` = 11811 px/m。
- **可選 Hi-MD 標誌**（每套獨立）：正面在 MiniDisc 標誌旁加上橫向 Hi-MD 標誌，書脊右側加橫條，使用真實 Hi-MD 字標，權利保留。
- **六語言介面**（預設英語，另有 简体中文、繁體中文、Español、Français、日本語），每種語言提供適配的離線字型；切換語言不會改變標籤內容或匯出位元組。
- **可選線上專輯查詢**（預設關閉）：MusicBrainz 兩段式檢索或 iTunes 詮釋資料建議、分階段進度與獨立重試按鈕、可選 Cover Art Archive 封面匯入（含解析度警告），手動上傳封面始終可用。僅瀏覽器直連服務商，無代理、無金鑰。
- 本地專案 JSON v2 儲存／載入（含四套上傳封面），相容舊兩套專案。

## 本機執行

在 `app/`（或解壓後的發行包根目錄）執行：

```sh
python3 -m http.server 8080 --bind 127.0.0.1
```

開啟 `http://127.0.0.1:8080/`。請勿用 `file://` 開啟（瀏覽器會阻擋 ES 模組／字型清單）。無需 `npm install`。開發測試：`npm test`、`npm run test:browser`、`npm run test:fixes`、`npm run test:logo`、`npm run test:four-set`、`npm run test:spine`、`npm run test:himd`、`npm run test:i18n`、`npm run test:autocomplete`。建置：`npm run build`（按白名單複製到 `dist/` 並產生 SHA-256 清單）。

## 列印須知

- 預設整頁為**成品 100×148 mm**（不是帶撕邊的 100×177）。正面錨點：A(9,6)、B(53,6)、C(9,62)、D(53,62)；書脊 x21，y118/123.5/129/134.5。安全邊距至少 6 mm；自訂版面無效時直接拒絕，絕不自動縮小。
- 可選真 4×6 英吋（101.6×152.4 mm → 1200×1800 px）；不宣稱是 SELPHY 紙。
- 校準預設未補償：先列印測試紙、測量後按 `factor = 50 / 實測值` 輸入。未試印不保證實物吻合。

## 權利與差異

程式碼獨立撰寫（應用 MIT；原創示範 artwork 同為 MIT）。原版 MiniDisc 標誌與 Hi-MD 標誌為單獨資源，商標／圖稿權利歸其權利人（Sony 相關）所有，未聲稱取得再散布許可。原站 Futura 改用 OFL 授權的 Atkinson；中日文字型皆為 OFL 離線字型。九款字型共 23.43 MiB，完整授權條款在 `assets/fonts/`。不對原站做逐像素一致聲明。尺寸來源（Elecom/A-one/SWHarden）詳見研究報告，連結僅在點擊時造訪。

其他語言說明見上方語言導覽。
