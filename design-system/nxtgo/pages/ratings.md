# 體驗評級頁

2026-11-01。沿用 `../MASTER.md` 的墨綠、暖白、杏色標示及本地字體。範圍為 `/ratings/`；流程、回報及參賽筆記保留原有頁面。

## 問題及方向

- 原本只有文字索引，必須進內頁才看見年份、組別及分數。改用兩張直接並列的評論卡；手機單欄，按評論年份由近至遠，沒有總分或排行榜。
- 每張卡明示評論年份／組別、往屆或當屆狀態、三項獨立分數、原有 quickTake 摘要、跑手位置、觀察範圍及更新日期。所有評論文字原樣讀取已批准資料。
- 當屆賽事頁可能承載往屆評論：保留「於某年賽事頁閱讀」及「不代表當屆安排或表現」標示；完整評論精確連到原 review anchor。
- 各當屆組別另列評論狀態：當屆已評／當屆未評但有往屆／未評，使用現有 reviewsForGroup 配對，避免全馬分數套用半馬或 10K。
- 評分準則摘要可直接閱讀，完整原文及發布流程維持摺疊；支援 #method 直接連結、自動展開、原生鍵盤操作。

## Skill 及技術

- 已重新讀取安裝的 UI UX Pro Max、AGENTS.md 及 MASTER。
- `color not only --domain ux`：Color Only；年份、組別、狀態及分數均有文字，不只依賴顏色。
- `comparison accessible labels --domain ux` 回傳 ARIA Labels / Form Labels；本次沒有搜尋表單，不採用表單建議，保留清楚命名的評論入口。
- `server component list --stack nextjs`：Push Client Components down；卡片、內容及準則保留 Server Component，只有摺疊 hash 行為是一個小型 Client Component。
- 已讀 Next 16.4.3 本地 use-client、CSS、Link hash／scroll margin 文件，以及 skill quick-reference accessibility / interaction / performance。
- 原生 details、Next Link、既有 SVG 已足夠。沒有新增套件；React / Next MIT，Fontsource 字體 SIL OFL，無新增外部媒體請求。

## 內容界線

沒有修改 editorial-reviews.json、notices、rating-policy、原內頁評論元件或審批資料。只增加現有已批准摘要及分數的索引展示；不重寫、裁切摘要，不推算缺失分數、不計總分、不產生評價。
