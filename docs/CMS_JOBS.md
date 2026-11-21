# CMS 工作計劃與 Mac 排程

由營運者決定要處理的賽事、屆次和材料。先在 repo 根目錄執行 `mkdir -p -m 700 .editorial-private/jobs`，再把工作計劃保存在 `.editorial-private/jobs/plan.json`，由本機可信操作者執行。

```json
{
  "registration_review": true,
  "runner_drafts": []
}
```

- `registration_review` 使用既有的 `review:data` 規則，將近期截止、狀態過期及缺漏欄位寫到 `.editorial-private/jobs/registration-review.json`。查閱清單後按所列官方連結核對。清單時間是生成時間。
- 每份 `runner_drafts` 項目填 `race_id`、整數 `year` 和 `material_ids`（從 CMS 選取同一賽事及屆次的材料）。可附 `body` 作為自己或 Codex 寫好的繁體中文正文。引用編號 `[1]`、`[2]` 跟 `material_ids` 次序。省略正文時，程式按主題整理短摘錄為待覆核初稿。完整原文、組別及觀察範圍可由 CMS 的材料 ID 查看。
- 工作計劃使用已匯入的材料。需要查閱官方網站或搜集新留言時，先按 [賽事研究 SOP](RACE_RESEARCH_SOP.md) 處理及記錄來源。
- 中文稿會出現在 CMS 的「AI 建議覆核」，相同內容重跑會回傳同一筆建議。接受後保存私人草稿，之後可按原有流程建立網站稿。稿件確認及發布由營運者操作。
- 各草稿分別處理，回傳 JSON 列明成功的建議 ID、狀態及失敗項目位置。修正失敗項目後可重跑整份計劃。

## 先手動執行

在 repo 根目錄用 Node 24+ 執行。先啟動過正式 CMS 並匯入指定材料，排程讀取同一個私人內容庫。

```sh
npm run content:jobs -- .editorial-private/jobs/plan.json
```

## 安裝 macOS LaunchAgent

先建立 `~/Library/LaunchAgents`（如尚未存在）。將 [範本](examples/com.nxtgo.editorial-jobs.plist) 複製到 `~/Library/LaunchAgents/com.nxtgo.editorial-jobs.plist`。以 Node 24+ 執行檔的絕對路徑取代 `NODE_PATH`（可用 `node -p process.execPath` 查閱），以 checkout 的絕對路徑取代所有 `REPO_PATH`。如路徑有 `&` 等 XML 特殊字元，使用相應的 XML 跳脫。範本是 Mac 本地時間每日 09:00，可按需要調整。

```sh
plist_path="$HOME/Library/LaunchAgents/com.nxtgo.editorial-jobs.plist"
plutil -lint "$plist_path"
launchctl bootstrap "gui/$(id -u)" "$plist_path"
launchctl kickstart "gui/$(id -u)/com.nxtgo.editorial-jobs"
```

查看私人目錄的 `stdout.log`、`stderr.log` 和報名覆核清單，並在 CMS 對照建議 ID。更新計劃 JSON 後由下一次執行讀取。更改排程或路徑時先用 `launchctl bootout "gui/$(id -u)" "$plist_path"` 卸載，再重新載入。
