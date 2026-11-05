# 體驗評級頁改版與驗證

2026-11-01。預覽：`http://127.0.0.1:3015/ratings/`。未部署／推送。

## 實作

- 兩篇已發布評論以年份排序卡片比較；包含原有摘要、三項獨立分數、年份及組別，並清楚區分承載頁面年份與評論年份。
- 預設收合觀察範圍及當屆 14 個組別的評論狀態，原文和未評標示完整保留。
- 評分準則摘要、完整原有準則及發布流程入口；hash 直接到 #method 會展開，鍵盤 Enter 可收合。
- 墨綠、暖白及杏色與其他核心頁一致；手機單欄、主要操作至少 44px、可見焦點、長文字自然換行、reduced-motion。

## 檢查

- TypeScript、155 tests / 20 files、正式 Next 建置通過。
- 新增三項內容正確性測試：摘要／分數年份組別對應；null 保留未評且不同年份不標作當屆；當屆評論不跨年或跨組套用。
- 舊索引測試按本次展示需求改為允許已批准 quickTake 摘要，仍檢查詳細評語留在內頁及完整 review anchor。
- Editorial 檢查通過：2 份已批准評論；評論資料、評分準則、審批及原評論元件沒有 diff。
- 匯出檢查通過：21 HTML 頁面、661 內部引用及來源披露。
- 真實瀏覽器驗證兩篇完整評論精確跳轉到各 review anchor、未評 5K 組別跳轉、觀察範圍展開、當屆狀態展開、評分準則 hash 自動展開／Enter 收合／直接連結載入。
- 在 320、375、768、900、1440px（包括 900×500 橫向）及展開準則／組別狀態後沒有橫向溢出。
- 新增 CSS 約 9.8KB，gzip 約 2.1KB；維持靜態輸出，不增加第三方依賴。未進行真實網絡 Core Web Vitals 或完整螢幕閱讀器測試。
- `git diff --check` 通過；瀏覽器 console 無 warning / error。

設計規格：`design-system/nxtgo/pages/ratings.md`。截圖：`artifacts/ratings-desktop.png`、`artifacts/ratings-mobile.png`。
