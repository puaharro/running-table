# 報名及選賽指南

2026-11-01。延續 `../MASTER.md` 的品牌、字體、暖白頁面、墨綠操作及原創內容界線。範圍為 `/guides/` 與三篇現有文章。

## 問題及方向

- 原列表未分用途：以資料原有 category 分為「點揀比賽」及「報名前準備」，每篇只列一次；分類是頁內跳轉，不加三篇內容用不到的搜尋或篩選器。
- 原手機目錄被隱藏：目錄改在正文前，手機、桌面均可使用；桌面右欄停留，矮螢幕改為普通文流，避免遮擋焦點。
- 文章先保留標題、摘要、原創署名及原日期，再提供目錄、清楚編號的正文；最後一節以淡綠背景突出原有結尾重點，不截斷或重寫原文。
- 完整內容後提供帶文章距離的時間表、相關真實賽事及其全部距離、另外兩篇文章；不把「相關」標成仍可報名或即將舉行。

## Skill 與實作

- 已讀取已安裝 UI UX Pro Max、AGENTS.md、MASTER 及本地 Next 16.4.3 use-client / CSS / Link hash 文件。
- `line length readability --domain ux`：Line Height / Line Length，限制閱讀欄寬，採 18px 桌面、16px 手機正文及適合中文的 1.85–1.9 行距。
- `server component content --stack nextjs`：Use Server Components by default；列表、目錄、文章及相關入口全部保留 Server Component，使用原生 anchor 及 Next Link。
- 沿用 GuideCard、SVG 圖示及已核實本地字體；以 `.guides-page` 等獨有範圍覆蓋樣式，不更改首頁或比賽頁的共用卡片實作。
- React / Next 為 MIT、本地字體為 SIL OFL；沒有新增依賴、外部字體、媒體或客戶端元件。

## 內容保留

`src/data/guides.ts` 沒有 diff：三篇標題、描述、分鐘數、四節／八段正文保持原樣；原文章日期 2026-10-21 保留。評論、評分準則、分數及審批完全沒有修改。
