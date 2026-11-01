# 比賽內頁

2026-11-01。延續 `../MASTER.md` 的墨綠、暖白、杏色距離標籤及本地字體，套用所有六場真實賽事；不改資料、評分、評論及審批紀錄。

## 問題及決定

1. 官方網站入口原本在手機內容最尾：移到頁頂重點區之後，桌面放標題右側；保留原有官方資訊提示及外部連結。
2. 賽事概覽、組別、交通、來源難以跳轉：重點卡提供五個頁內入口；桌面提供頁內目錄；沿用原生 anchor，不加第二條固定導航。
3. 多組別、多渠道令閱讀失去位置：組別改單欄，各組有穩定 anchor；上方組別選單、各組底部返回選單。先日期／起點／資格，再原有評論、報名渠道。
4. 原有核實段落佔據頁首：原文留在原生 details，摘要保留核對時間及來源整理標示；資料來源及核實範圍仍完整列出。
5. 詳細評論及長渠道使用單欄、16px 正文、自然換行。往屆年份／適用範圍獨立高亮，絕不把舊評分包裝成當屆分數。

## Skill 與文件

- 已重新讀取已安裝 UI UX Pro Max、專案 AGENTS.md、既有 MASTER。
- `progressive disclosure long content --domain ux` 回傳 Truncation 和 Long Token Wrapping；只採用相關的長字串換行建議，不截斷評論。收窄 `progressive disclosure` 後仍未找到摺疊模式直接匹配（回傳 Heading Line Balance），所以摺疊設計依照 skill 優先表中的基本規則及現有原生 details，並已向用戶說明。
- `focus not obscured --domain ux`：Focus Not Obscured (Enhanced)，屬 AAA 指引，不宣稱已獲 AAA 認證。無新增固定浮層；頁內目標保留足夠 scroll margin。
- 已讀本地 Next 16.4.3 use-client、CSS 的全域／載入次序說明及 Link hash／scroll-margin 文件；頁面保持 Server Component，現有時鐘、渠道及評論頁籤沿用客戶端元件。

## 元件、授權與界線

原生 details、button、anchor、Next Link 及現有 SVG 已足夠；沒有新增元件套件。沿用 Next / React（MIT）及 Fontsource 本地字體（SIL OFL）。所有樣式以 `.race-detail-page` 包住，避免影響時間表及評級頁。

評論元件 `group-ratings.tsx`、`review-views.tsx` 及編輯資料未修改；只移動整個既有元件的展示次序。報名狀態、核對時間、渠道資格／價格及官方來源一律沿用原有邏輯。
