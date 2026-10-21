# 技術架構 v0.2

## 程式與內容

獨立 Git repo；參照 MTRI 嘅 Next.js App Router、React、TypeScript、人工整理資料及 Vitest，唔複製跑旅問卷或推薦評分。

Next.js 靜態輸出，建置時產生總覽、6 場真實賽事頁、指南及支援頁。瀏覽器處理搜尋、篩選、狀態時鐘及分享網址。唔需要會員或資料庫。

- src/data/catalog.json：真實資料與來源紀錄。
- src/data/races.ts：驗證並只匯出 published + verified 記錄。
- tests/fixtures/races.ts：舊虛構資料，只供測試，唔由應用匯入。
- src/lib/catalog.ts：阻止重複 ID、錯誤日期、非法費用、斷開來源、無佐證狀態等資料進入建置。
- src/lib/races.ts：香港日期、精確截止、72 小時狀態新鮮度、同組別配對、網址參數。
- src/components/live-registration.tsx：詳情頁狀態及組別時鐘。
- src/lib/release.ts：搜尋收錄設定檢查。
- src/lib/structured-data.ts：僅對真實且地點明確嘅活動產生 SportsEvent。

## 網址

首頁 /；賽事 /races/[year]/[slug]/；指南 /guides/ 及 /guides/[slug]/；關於 /about/；私隱 /privacy/。

比賽名稱先連本站詳情，再提供官方連結，唔將名額狀態理解為付款保證。

## 靜態快照與時鐘

初始 HTML 狀態係建置快照；總覽載入後按裝置當前時間每 60 秒重算，詳情每 30 秒重算，統一轉成香港時間。截止邏輯可處理時分秒；畫面更新有上述刷新間隔。使用者裝置時間錯誤亦可能影響顯示。

超過 72 小時未核對嘅報名狀態變待核實；已過官方明確截止時間、已完成及取消狀態唔會重新變開放。呢個機制唔會代替人工重查官方消息，亦唔會自動取得即時餘額。

正式部署需要定期重新建置以更新無 JavaScript 嘅 HTML 快照；目前未設定排程或自動部署。

## SEO 與發布

預設 SITE_INDEXABLE=false：全站 noindex、空 sitemap、唔輸出活動結構化資料。允許爬取，讓搜尋引擎讀到 noindex。

正式 HTTPS origin、營運者同聯絡電郵齊備後，可設定 SITE_INDEXABLE=true；缺必要設定會令建置失敗。此時產生正式 canonical、有效 sitemap、robots sitemap 連結及符合條件嘅 SportsEvent，未知時間、費用與名額唔會捏造。

來源日期使用實際內容核實時間，唔隨建置自動改成今天。結構化資料唔保證特殊搜尋展示。

篩選組合唔列入 sitemap；正式上線前再依選定託管平台配置參數頁嘅 HTTP 索引／爬取策略。靜態主機無法單靠建置時 metadata 分辨每個 query，所以目前整站仍處於 noindex 測試狀態。

## 廣告

預設完全唔載入廣告或分析腳本。只有 NEXT_PUBLIC_SHOW_AD_PLACEHOLDERS=true 先顯示開發版位。AdSense 帳戶接入、驗證、ads.txt、地區同意要求及效能驗證留待正式部署。

第二階段會員資料用獨立伺服器儲存，唔放 Git；收藏及加入日曆維持未實作。
