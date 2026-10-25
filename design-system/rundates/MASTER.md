# NXTGO：設計系統

2026-10-25 更新配色。依 UI UX Pro Max 查詢、現有實作及已確認草案整理；此為經篩選的專案規格，不是原始自動生成模板。

## 產品與風格

香港路跑賽事目錄與原創選賽指南。列表以快速搜尋及比較為主，文章以閱讀理解為主。保留略縮 banner、珊瑚／深綠品牌及跑道線條；不新增會員、收藏、日曆或大型宣傳輪播。

## 規格來源

- `src/app/tokens.css`：唯一的共用顏色、字體、字級、圓角、間距及動態數值來源。
- `src/app/components.css`：共用按鈕、狀態標籤、控制項、焦點及日期數字樣式。
- `src/app/globals.css` 與 `refresh.css`：頁面結構、品牌圖形、響應式版面及廣告定位。沿用相容別名，但不重複宣告根 tokens。
- `src/components/status-badge.tsx`：報名狀態共用元件；特殊渠道限定語可由 children 提供，不能改變其真實狀態。

## 配色

| 角色               | token                             | 色碼    |
| ------------------ | --------------------------------- | ------- |
| 主文字／深底       | text-primary                      | #183A3B |
| 次要文字           | text-secondary                    | #58676A |
| 品牌點綴           | brand-accent                      | #E45D3C |
| 主操作             | action-primary                    | #B7472D |
| 主操作 hover／焦點 | action-primary-hover / focus-ring | #AA3B23 |
| 頁面               | surface-page                      | #F4F6F3 |
| 內容               | surface-card                      | #FFFFFF |
| 品牌淺底           | surface-brand                     | #EEF2F1 |
| 輕分隔             | border-subtle                     | #DCE2E2 |
| 控制項邊界         | border-control                    | #7B8B8E |

首頁 banner 使用白底；頁面保留 #F4F6F3，卡片白底，頁尾及次要區域使用中性灰青。大面積避免淡綠疊加；橙色限主要操作、品牌點綴及必要提示。日期月份使用深青綠底配淺字；中性快捷篩選與已選狀態分開，已選項保留文字／邊框。新增 surface-muted #F1F3F3、border-hover #91A5A5、state-selected #E3EDED。

接受申請、未開放、候補、額滿、截止及待核實各有獨立狀態 tokens；狀態文字必須保留，不能只靠顏色判斷。輕分隔線不能代替需要辨識的輸入邊界。

## 字體

- Noto Sans HK Variable：中文及正文，常用 400／500／700。本文 16px，長文行高約 1.9；重要輔助資訊 13–14px；12px 限短標籤。
- Barlow Condensed：大型日期、統計數字、少量英文展示。精確日期時間保持正文寬度，使用 tabular-nums。
- 自託管 Fontsource 固定版本：`@fontsource-variable/noto-sans-hk@5.3.1`；Barlow 版本以 package-lock.json 為準。字體 CSS 隨本地建置輸出，使用 unicode-range 分字集及 font-display: swap；不在訪客瀏覽時向 Google Fonts 發請求。
- 繁中字體完整資產不是單一小檔，必須保留分段載入。不要預載整套中文字型。保留 PingFang HK／Microsoft JhengHei／sans-serif fallback，新內容也能顯示。
- 本批選擇 Fontsource 的完整分字集 CSS，而非將 CJK 子集當成多個沒有 unicode-range 的 next/font/local face，以免遺失未來內容的字形或增加首載成本。
- 授權隨網站輸出在 `/fonts/NotoSansHK-OFL.txt`、`/fonts/BarlowCondensed-OFL.txt`。

## 元件

- 按鈕：主操作、深底次操作、文字連結及可切換篩選。主操作不可與廣告混淆。
- 控制項圓角 8px，卡片 12px，小標籤 6px；膠囊只用於適合的短選取條件。
- 間距以 4、8、12、16、24、32、48px 為主；同一組內較緊，段落之間較鬆。
- 網站主要控制項採 44px 點擊範圍；不把此設計標準冒稱為各平台一致的無障礙最低要求。
- 距離／渠道／狀態以緊湊組別列呈現。相同距離與渠道仍有多個組別時，保留完整名稱以免無法區分；完整賽事資料永遠可由詳情頁讀取。
- 列表僅顯示符合篩選的組別及渠道；預覽最多兩組、每組兩渠道，標示其餘數目。完整渠道、資格及待核實原因以原生 details 展開，保留鍵盤操作；相同距離的不同組別仍顯示完整名稱。

## UX 規則

1. 搜尋可見；日期、距離、地區及進階狀態逐步展開。已套用條件可辨識、逐個移除及重設。
2. 同一組別必須同時符合日期、距離、地區及狀態；不以其他組別的開放狀態代填。
3. 狀態維持原有 72 小時核實規則；待核實不等同未開放，也不是保證即時名額。
4. URL、返回結果、排序、空結果復原及錯誤範圍提示維持原有功能。
5. 所有互動具可見焦點。狀態改變不移走焦點，結果數目以完整語句通知輔助技術。
6. 動態限必要回饋，150–200ms；reduced-motion 關閉非必要過場，無需新增 GSAP。
7. 廣告示意仍由環境設定控制，不接入真實廣告；單獨驗收手機、桌面、關閉記憶、全屏逃離及焦點可見。

## 修改後驗收

375px 手機、820px 平板、1600px 桌面；長名稱、多組別、未知費用與狀態、空結果、錯誤範圍、字體 fallback、鍵盤及廣告開啟狀態。保留單元測試、TypeScript、生產建置、匯出及 HTTP 檢查。不要將抽樣檢查當成全站無障礙認證。
