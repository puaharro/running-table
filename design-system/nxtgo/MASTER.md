# NXTGO 首頁設計系統

2026-11-01。UI UX Pro Max 已安裝並讀取；此文件為經產品判斷調整後的規格，並非自動模板。原有 `design-system/rundates/MASTER.md` 保留；本次首頁以此文件為準，其他頁面保留既有規格。

## 實際 skill 查詢與適用性

- `running events calendar editorial --design-system`：首個 pattern 為 Product Demo + Features，字體為娛樂用途 Righteous/Poppins；與賽事目錄和繁體中文不合，已拒用且沒有保存為產品規格。
- 收窄為 `sports directory search --design-system`：Marketplace / Directory、Flat Design、green category / amber CTA；與搜尋、目錄及運動情境相符。
- `directory search filters --domain product`：Directory / Listing Site，資訊卡片及清晰類別入口適用。地圖及賣家／刊登入口不在 MVP 範圍；焦點輪播按營運者後續要求加入。
- `body text readability --domain ux`：Contrast Readability；`form visible labels --domain ux`：Form Labels / Input Labels。採高對比文字、可見搜尋 label、16px 手機正文。
- `mobile navigation discoverability --domain ux`：首項 Back Button，次項 Sticky Navigation。保留既有返回行為；重要導航不用隱藏橫捲。
- `server client component bundle --stack nextjs`：Server Components 預設、Client Components 下放至必要範圍。頁面與評論區保留 Server Component；時鐘獨立，避免首頁透過 live-registration 引入完整評論元件樹。

## 首頁資訊次序

1. 簡短定位及可手動左右切換的焦點 banner；焦點賽事／資訊以此為主要展示位置。
2. 輕量關鍵字搜尋入口；完整年月、地區及距離篩選保留在 `/races/`。
3. 三場近期賽期，按真實日期排序；官方資料／評論用途說明在手機放於賽期之後。
4. 精選賽事、已批准評論原文、原創指南。
5. 完整時間表及原有報名重點入口。

## 設計原則

- 資料先於裝飾，Flat Design，不加影片、3D、假照片、假評價、虛構數字或合作品牌。
- 墨綠操作、暖白頁面、杏橙距離標籤；所有首頁色彩存於 tokens.css 的 home-* tokens。
- Noto Sans HK 中文、Inter 數字／拉丁、Barlow Condensed 僅用品牌及封面裝飾；中文不用 condensed 字形。
- 桌面 h1 36–48px、手機 30px；正文 16px；標題 19–30px；輔助 12–14px。11px 英文字樣只作非必要裝飾。
- 主要操作 44px 以上，間距至少 8px；全卡／全列可點且有可見焦點及箭嘴。
- 手機五項導航以「首頁／時間表／評級／指南／關於」同時可見，不依賴橫向手勢。
- 螢幕閱讀順序跟視覺一致；單一 h1；可見 label；裝飾 SVG aria-hidden；不以顏色獨自傳遞狀態。
- 焦點 banner 只手動切換，不自動輪播；微互動採 160ms 色彩回饋，尊重 reduced-motion。保持放大及窄畫面自然換行。

## 元件及授權選擇

沿用 React 19.3.0、Next.js 16.4.3（MIT）、本地 Fontsource 字體（SIL OFL 1.1）及既有 SVG Icon，使用 Next Link 和原生 GET form。已檢查本地授權檔與 Next 16 文件；沒有新增第三方套件或外部字體請求。

## 內容界線

保留香港 MVP、既有賽事資料及所有功能。評論區只讀取已批准 quickTake 原文與既有年份／組別，未修改分數、評論 wording、審批紀錄或規則。過期賽事移出近期區，季末顯示空狀態。

## 焦點 banner（營運者追加方向）

- 使用原生橫向捲動及 scroll-snap，支援手指滑動、上一張／下一張、選頁按鈕及焦點區左右鍵／Home／End。
- 不自動換頁，不需要播放／暫停；互動捲動尊重 reduced-motion。非當前 slide 設 inert，避免鍵盤進入畫面外的連結。
- 先用現有渣馬、港珠澳大橋賽事及原創 10K 指南。過期賽事自動移出；香港以外的焦點待真實資料加入。
- 內容來源 `src/data/home-focus.ts`。未來付費版位使用 `kind: sponsored` 並提供 `sponsorName`，畫面明示「贊助 · 名稱」。目前沒有付費內容，也沒有加入虛構贊助商。
