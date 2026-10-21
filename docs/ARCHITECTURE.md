# 技術架構

## 開發方式

參照 MTRI 嘅 Next.js App Router、React、TypeScript、人工整理資料及 Vitest 做法，使用獨立 repo。唔包含 MTRI 問卷或推薦評分程式。

第一版使用 Next.js 靜態輸出。建置時產生總覽、所有賽事詳情、指南及支援頁；瀏覽器負責組合篩選及網址同步。唔需要資料庫或登入服務。

## 主要目錄

- `src/app`：頁面、metadata、robots、sitemap、樣式。
- `src/components`：總覽互動、共用介面、返回篩選連結。
- `src/data/races.ts`：目前虛構賽事資料。
- `src/data/guides.ts`：原創指南。
- `src/lib/types.ts`：資料合約。
- `src/lib/races.ts`：日期、狀態、篩選、查詢參數邏輯。
- `src/lib/*.test.ts`：核心邏輯與資料驗證。
- `scripts/serve.mjs`：建置輸出嘅本地預覽伺服器。
- `out/`：建置產物，唔追蹤入 Git。

## 網址

- `/`：總覽。
- `/races/[year]/[slug]/`：該屆賽事詳情。
- `/guides/`、`/guides/[slug]/`：指南列表及文章。
- `/about/`、`/privacy/`：原型支援說明。

## 日期與建置快照

總覽載入後會按香港當日更新狀態，每分鐘重新檢查日期。靜態詳情嘅狀態係建置時快照，正式營運需要排程重新建置或改成按請求更新；未設定排程前唔應聲稱即時名額資訊。

## SEO 與示範隔離

原型 metadata 全站 noindex；robots 允許爬取以讀到 noindex；sitemap 暫時空白。唔為虛構賽事輸出 Event 結構化資料。

設定真實 `NEXT_PUBLIC_SITE_URL` 後建置，先會輸出對應 canonical 與分享網址。正式啟用收錄前先替換／隔離示範資料、完成來源核實，再調整 robots metadata、有效 sitemap 同必要結構化資料。原型唔用假網域做 canonical。

篩選網址與專門內容入口要分開管理。正式上線時定義篩選頁 noindex／爬取策略，避免大量重複組合。

## 廣告與第二階段

廣告目前只係靜態版位。接 AdSense 時需要真實 publisher 設定、適當第三方載入／同意安排、ads.txt 及效能檢查；唔直接沿用 MTRI 限制所有外部腳本嘅設定。

第二階段再接入會員與資料庫，以固定賽事 ID 關聯收藏。會員資料唔放 Git；日曆匯出亦留待第二階段。
