# NXTGO 首頁重設：UI UX Pro Max 版本

日期：2026-11-01（香港時間）。範圍：首頁與共用導航／頁尾一致性。未部署、未推送 GitHub。

## 最新追加：焦點 banner 與搜尋分工

按營運者最新方向，首頁加入手動滑動／切換的焦點 banner，先顯示真實渣馬、港珠澳大橋賽事及原創 10K 指南。支援箭嘴、圓點、左右鍵與原生手指滑動；不自動播放，reduced-motion 下即時捲動。未顯示的投影片設 inert。

近期時間表改為三場。首頁只保留關鍵字搜尋與完整時間表連結；年月、地區、距離等完整 Search Engine 留在 `/races/`。贊助型別及顯示標籤已預留，目前沒有贊助內容、虛構品牌或東馬資料。

新增焦點內容及過期賽事排除測試後，共 152 項測試通過。以下設計研究及舊版檢查記錄保留作本輪設計過程，與以上最新方向衝突時以上述為準。

## Skill 確認與使用

已確認並完整讀取 `/Users/derekc/.codex/skills/ui-ux-pro-max/SKILL.md`，實際執行其本地搜尋程式，讀取 quick-reference.md 及 pro-rules.md。本輪已使用該 skill，與上一輪未安裝時的設計分開記錄。

第一次 `running events calendar editorial --design-system` 配對到產品影片展示及娛樂字體，與 NXTGO 不合，沒有採用。按查詢規則收窄為 `sports directory search --design-system`，取得 Marketplace / Directory、Flat Design 與綠色分類／杏橙提示方向。再查產品目錄、文字可讀性、表單 label、手機導航，以及 Next.js server/client 分界指引。

經篩選的專案設計規格見 `design-system/nxtgo/MASTER.md`，原有 rundates 規格保留。未照搬賣家入口、地圖、輪播、影片或純英文字型。

## 產品理解與問題優先次序

NXTGO 的核心流程：掌握賽期 → 根據日期與距離縮窄選擇 → 查閱當屆官方資訊 → 以原創往屆體驗評論補充判斷。亞洲為發展方向，MVP 只呈現已收錄香港路跑。

1. **高：賽期仍被口號區推低。** 縮短首區，改成可比較的四場近期時間表；手機直接以「香港路跑時間表」命名。375px 預覽第一場頂部約 615px，812px 高度內可完整看到第一場資訊。
2. **高：次要資料字太細，掃讀費力。** 手機及主要正文 16px，次要資料 12–14px，清楚分開賽名、日期、地點與距離。
3. **高：手機導航依賴橫捲，不易發現所有入口。** 五項導航同時可見：首頁、時間表、評級、指南、關於；各點擊區大於 44×44px。
4. **中：內容層次與功能關係弱。** 首頁依序為搜尋、近期賽期、資料／評論用途說明、精選、已批准評論、指南及完整時間表入口。
5. **中：首頁耦合詳情元件。** 將 useClock 抽為獨立 hook，保留既有即時更新／跨日行為，減少不必要的評論及登記元件依賴。

## 設計與元件決定

- 編輯誌式、資料先行；暖白頁面、墨綠操作、杏橙距離標籤。首頁語意色彩集中於 tokens.css。
- 搜尋使用原生 GET form、可見 label、16px input 與搜尋鍵提示；距離捷徑沿用現有 query 參數。
- 日期採 tabular 數字。全列／全卡可點，有可見焦點及箭嘴；狀態同時有文字，不依賴顏色。
- 共用手機頁尾兩欄，現有內容頁只作導航／風格一致性修正。
- 沒有新增外部套件、遠端圖片、假照片、合作品牌、虛構數字或用戶評語。封面純 CSS 圖形及真實賽事所對應的裝飾文字。
- 沿用 React 19.3.0、Next.js 16.4.3（MIT）、本地 Fontsource Noto Sans HK／Inter／Barlow Condensed（SIL OFL 1.1）、既有 SVG Icon。已核對本地 LICENSE 和 public/fonts 授權檔，沒有外連 Google Fonts。
- 已讀本專案安裝的 Next 16 Server/Client Components 文件及相關連結／usePathname 文件。亦按 Next 16 升級文件加入 data-scroll-behavior 標記，避免路由捲動警告及過渡時不必要的平滑捲動。

## 內容保留

所有賽事、渠道、評分、評論 wording 與審批資料保留。評論摘要直接讀取既有已批准 quickTake，沒有改寫；年份與組別明示，往屆不當成下一屆表現。未有材料仍保留未評／待核實。舊搜尋網址、完整篩選、詳情返回、渠道及更正入口均保留。

## 檢查結果

- 150 項測試通過；含四場近期賽期排序、過期移除及季末空狀態。
- TypeScript 與正式建置通過；21 個 HTML 頁面、646 個站內引用通過匯出檢查。
- HTTP smoke：18 條頁面路由回傳 200，404／405 處理通過。
- 評論審批檢查：2 篇已批准評論通過，待確認材料排除；評分及評論資料檔無差異。
- 正式預覽互動：首頁搜尋「美津濃」、5K 捷徑、詳情入口、保留 query 與賽事位置的返回連結、指定往屆評論錨點均正常。
- 320、375、768、1024、1440px 無整頁橫向溢出；手機 input 字體 16px。375px 導航點擊區約 65×47px。
- 鍵盤跳到主要內容、可見焦點、單一 h1、可見搜尋 label、裝飾 SVG aria-hidden 均有檢查；原有 reduced-motion 規則保留，沒有自動輪播／動畫。
- 主要文字對比：墨綠／暖白 10.85:1，次要文字／暖白 5.76:1，白字／主按鈕 7.96:1，距離標籤 6.95:1。
- 最終正式預覽的主要導航流程無 console error／warning，未見 hydration error。
- 首頁初始 HTML 引用 JS：前版 9 檔、629,552 bytes（gzip 估算 196,685），本版 8 檔、598,395 bytes（gzip 估算 185,509）。少約 11KB gzip。CSS 約 229KB，gzip 估算約 61KB，字體 unicode-range CSS 及全站共用樣式仍可後續精簡。

效能數字為本機檔案體積估算，並非實際壓縮傳輸或 Core Web Vitals 分數。尚未做真機慢網速、完整螢幕閱讀器、最大系統字體、dark mode 或全套跨瀏覽器測試；本專案目前只支援 light mode，不能將抽樣檢查當成完整 WCAG 認證。

## 預覽與檔案

- 正式建置本機預覽：`http://127.0.0.1:3015/`
- 桌面：`artifacts/homepage-uipro-desktop.png`
- 手機：`artifacts/homepage-uipro-mobile.png`
- 設計規格：`design-system/nxtgo/MASTER.md`
