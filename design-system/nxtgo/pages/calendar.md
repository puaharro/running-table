# 賽事搜尋／時間表

2026-11-01。沿用 `../MASTER.md` 的品牌、字體與內容限制。本頁覆蓋首頁資訊次序，專注搜尋及按月瀏覽，不設宣傳橫幅。

## 研究與優先次序

1. 手機原有完整篩選區令賽期過遲出現：搜尋常駐，篩選可展開／收合，預設先顯示賽事；已選條件保持可見及可移除。
2. 桌面原有橫排篩選浪費空間：左側 276px 篩選區，右側時間表；1000px 以下縮小側欄，767px 以下單欄。
3. 選項操作感及層次不足：選項加外框，選中深綠、粗體及下緣；月份原生 select，44px 以上操作尺寸，8px 間距。
4. 同一張賽事卡只保留名稱、舉辦地點、所有距離及起跑日期。名稱大字，綠色地點／日期 SVG、杏色距離、墨綠「詳細資料」。不新增評分或報名摘要。

## Skill 實際查詢

- `directory filter mobile --domain ux`：Chip Collection Reflow / Mobile Keyboards / Mobile First；採用選項及已選條件換行、手機保留核心賽期。
- `client component interactive filters --stack nextjs`：Push Client Components down / Mark Client Components explicitly；維持 Server page，互動只在現有 RaceExplorer。
- 已讀本地 Next 16.4.3 use-client、CSS、linking-and-navigating（History API）文件；沿用 URL 篩選、詳情返回定位及 GET 搜尋相容。

## 操作與內容

- 搜尋即時更新；年分顯示當年及下一年，月份 1–12，保留月份 placeholder、不加「全部」。
- 所有國家／地區選項保留；香港以外沒有資料時明示未收錄，不新增虛構賽事。
- 「顯示 N 場賽事」收合手機篩選，焦點移到結果工具列；列表末端「返回篩選」會展開篩選。
- 分月標題 h2、賽事名稱 h3；其他排序的賽事名稱 h2。結果數量 atomic live status、欄位有可見 label、日期錯誤 aria-invalid / aria-describedby、可見鍵盤焦點。
- 單欄日期輸入避免窄屏及原生日期控制裁切。不增加固定浮層或捲動遮擋。
- 沒有新增依賴；React / Next MIT、本地 Fontsource 字體 SIL OFL、沿用既有 SVG。原生 button/select/date input 足夠完成操作，不加入額外元件套件。
