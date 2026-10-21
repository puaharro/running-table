# 香港路跑賽事資訊（暫名）

以香港路跑資訊吸引搜尋流量，再透過 Google AdSense 變現嘅內容網站。

目前階段：第一版可運作原型，2026-10-21 建立。暫名「跑期 RunDates」。已建立本地 Git repo、網頁、開發文件及檢查流程。未連接 GitHub remote、未公開部署、未申請或接入 AdSense。

## 已建立嘅網頁

一頁賽事總覽、日期／距離／地區／類別／報名狀態篩選、關鍵字搜尋、截止日期等排序、每場獨立資訊頁、三篇原創指南及支援頁。桌面用比較列表，手機用卡片。全站賽事均為虛構示範，已設 noindex，唔提供報名或收款。

## 開發文件入口

- [產品構想](docs/CONCEPT.md)：定位、資訊架構、流量與變現方向。
- [第一版產品規格](docs/REQUIREMENTS.md)：使用流程、篩選規則及驗收。
- [技術架構](docs/ARCHITECTURE.md)：Next.js、頁面、SEO、部署方式。
- [資料合約](docs/DATA_MODEL.md)：賽事、組別與正式資料擴充。
- [內容維護](docs/CONTENT_OPERATIONS.md)：核實、指南、更新、更正及廣告。
- [開發及交接](docs/DEVELOPMENT.md)：啟動方式、已做內容、正式上線前事項。
- [驗證紀錄](docs/QA.md)：已完成檢查及未驗證範圍。

## 啟動與檢查

```text
npm ci
npm run dev
```

開啟終端顯示嘅本機網址。建置後可使用 `npm start` 預覽 out/ 靜態網站。測試用 `npm test`，類型檢查用 `npm run typecheck`，建置用 `npm run build`，匯出檢查用 `npm run check:export`。

## 已確認範圍

- 第一階段只做路跑：5K、10K、半馬、全馬，以及屬路跑性質嘅親子／慈善跑。
- 首頁係一頁賽事總覽，集中全站已發布賽事，提供日期、距離、地區、運動類別、報名狀態五項組合篩選；第一階段運動類別只有路跑。
- 每個比賽名稱連去站內獨立資訊頁，詳情頁再提供官方報名連結。
- 優先做總覽、獨立賽事頁、原創報名及選賽指南、SEO 基礎及廣告版位。月份／距離專頁按內容需要後續加入。
- 收藏、加入日曆、會員系統一併留到第二階段；第一階段亦唔做本機收藏或免登入日曆匯出。
- 獨立 Git repo，開發方式參照 MTRI-v0：Next.js App Router、React、TypeScript、人工整理靜態資料、分階段交付。
- 程式碼、公開資料、內容及文件使用 Git 管理；會員資料、投稿者個人資料及密鑰唔放入公開 repo。

完整規劃、流量策略、MTRI 參考方式、廣告安排同驗收標準見 [產品構想](docs/CONCEPT.md)。

## Git 開發方式

倉庫暫名保留 `hk-sports-calendar`，品牌及正式 repo 名稱稍後再定。

使用 `main` 加短期功能分支，透過 Pull Request 審閱；已備妥 GitHub Actions 檢查設定，接上 GitHub 後先會運行。內容更新一併留低修改紀錄，發布對應確定嘅 Git commit。

開發次序：內容與資料規格 → 公開資訊頁原型 → 核實資料與 SEO → 公開部署 → AdSense 申請與接入 → 會員與個人功能。

## 參考

- 本機 MTRI-v0 嘅 README、package.json、src 結構及 next.config.ts，2026-10-21 查閱。參照開發方式，保留為獨立產品。
- [Fitz 香港運動比賽時間表](https://fitz.hk/hksports-timetable/)
- [Next.js Metadata](https://nextjs.org/docs/app/getting-started/metadata-and-og-images)
- [AdSense 網站準備指南](https://support.google.com/adsense/answer/7299563?hl=en)
- [AdSense 廣告版位政策](https://support.google.com/adsense/answer/1346295?hl=en)
