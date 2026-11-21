---
name: nxtgo-race-research
description: Run NXTGO’s Hong Kong road race update cycle. Discover missing race editions, verify changes to existing listings, and collect current-edition runner comments after races for Traditional Chinese CMS drafts. Use for routine NXTGO updates or targeted race research.
---

# NXTGO 賽事更新

先讀 repo 的 `AGENTS.md` 及[每輪更新流程](../../docs/CONTENT_OPERATIONS.md#每輪更新流程)。除非營運者指定範圍，每輪按以下次序做三項：

1. **搵新賽事。** 查主辦方、田總及官方報名平台的香港路跑公告。按中英文賽名、屆次、日期及主辦方對照 `src/data/catalog.json` 及可見 CMS 建議。比賽組別、報名渠道和同一屆的不同寫法保留在同一賽事下。以官方當屆資料核對後，先進 CMS 待覆核清單。
2. **更新已收錄賽事。** 執行 `npm run review:data` 產生報名待覆核清單。優先查改期、取消、七日內截止與將開放的賽事。逐組逐渠道記錄官方來源、香港時間及欄位差異。申請、結果、付款期限分開記錄。未知名額保持待核實，查閱時間只更新實際核對的欄位。
3. **更新剛完賽一屆的跑手留言。** 先核對屆次及完賽狀態，再查看 CMS 現有草稿和材料。按[賽事研究 SOP](../../docs/RACE_RESEARCH_SOP.md) 逐類查原文並記錄覆蓋與限制。保留組別、來源及觀察範圍，去除同作者重複分享。以繁體中文整理賽道、補給、寄存、交通和大會安排。資料不足列缺口。待登入的平台沿用 SOP，並繼續查其他來源。

每輪提供新增候選、既有賽事欄位差異、最新一屆留言建議，以及仍待核實項目。已有材料可依 [CMS 工作計劃](../../docs/CMS_JOBS.md) 整理成建議。營運者確認相應內容後才更新正式資料，部署沿用現有流程。需要驗收頁面時用 `nxtgo-site-qa`。研究、稿件及工作計劃留在私人工作區。
