# 私人內容管理與賽事研究

這是本機私人研究工具，沿用 Threads 的保存、去重、逐條覆核、主題修正及摘要流程。沒有公開投稿、情緒分數、平台全量爬取或自動發布。

## 每次研究一場比賽

Node.js 24+，在 repo 根目錄執行：

```sh
npm run content:manage
```

開啟終端顯示的網址，預設為 `http://127.0.0.1:3334/`。如埠已使用，可加 `-- --port 0` 自選空閒埠。停止工具按 Ctrl+C。

## 三個簡單分區

- **賽事資料**：查看目前網站目錄、組別與官方來源。按「建立更新建議稿」預填賽事及年份，沒有直接改動正式資料。
- **賽事研究**：搜尋入口、貼原文、清理／去重、人工覆核及摘要沿用原有流程，位於 `/research`。
- **評論草稿**：保存評論或賽事更新建議，材料／來源與觀察範圍按需展開；保留每個版本，可下載完整稿及歷史。

流程是「草稿 → 待確認 → 確認後另行發布」。正文、材料及範圍齊備才可標記待確認；這個標記不是營運者批准，沒有發布按鈕或自動建立審批紀錄。任何修改會返回草稿，須重新確認完整版本。下載後按現有營運者確認及發布流程處理，工具不會直接改動網站。研究摘要不會自動變成已批准評論，歷史已發布評論也不會自動匯入私人草稿。

## 研究操作

進入「賽事研究」後：

1. 選賽事及目標年份，填組別／距離；可以改搜尋字詞。現有四場香港賽事 preset 沿用 Threads 工具，未知賽事需要另加 preset，不能亂用另一場。
2. 按來源搜尋入口：Marathon’s World、Facebook、Threads、Instagram、YouTube、個人網誌、運動筆記。YouTube 開站內搜尋，其他開 Google 網站範圍搜尋；網誌為一般網頁搜尋。這些是搜尋起點，不是已讀取的搜尋結果。年份只是字詞，不是出帖日期篩選。
3. 需要登入時，在原站自行登入，查看可存取的公開帖／留言／影片。一般瀏覽器登入不等於 API 授權，工具不讀密碼、Cookie 或 token，亦不會自動開啟來源網址。
4. 選正確平台，貼原文、來源及作者。出帖日期只填來源實際顯示的日期，未知留空；賽事專頁屆次另外記錄。例如 MW 2025 專頁可以填屆次 2025，出帖日期仍保持未知。
5. 組別按材料填；「補充專頁屆次及觀察範圍」預設收起，需要時才填跑手位置及經驗來源，未知保持未知。「作者自述參賽」不是獨立核實。Vlog 的觀察範圍、影片時間點或利益披露可寫來源備註。影片上載日期與留言日期分開，填的是當前匯入項目的出帖日期。
6. 保存後，在批次按「清理、去重並準備人工覆核」。覆核保留／排除、賽事及年份，才進入已確認資料集；來源專頁屆次不會自動批准內容。
7. 沿用主題分類與人工修正，按賽道、大會安排、補給等主題查看摘要。自動分類只是建議，正反意見、原文及觀察範圍分開保留；不會將同一賽事的不同跑手說法拼成共識。
8. 匯出私人 JSON／CSV，整理精簡稿交營運者確認。確認資料集不是公開稿件的發布批准，工具沒有發布按鈕。

### 來源搜尋覆蓋與登入協作

每次研究須按「來源搜尋」逐類檢查 Threads、Marathon’s World、Facebook 公開帖、Instagram 公開帖、YouTube Vlog／留言、運動筆記及個人網誌，不得默默跳過平台。官方資料另作賽事基本資料核對，不能代替跑手親身材料搜尋。

遇到登入要求，請營運者在原站完成登入，完成後續查同一來源；不索取密碼、Cookie 或 token。等待時可繼續其他來源，但該來源仍屬「等待登入」，不能標記完成。搜尋摘要只作線索，未讀原帖須明確記錄。

每類保存搜尋字詞、實際檢查時間、已查看連結、相關材料及限制；區分「未搜尋」「等待登入」「已搜尋但無相關結果」「已讀原文」及「嘗試後仍無法存取」。尚有待處理來源時不得聲稱研究完成，亦不能由無結果推論跑手沒有意見。

後台的「逐來源研究進度／登入協作」已提供逐來源狀態及完成度檢查表，操作見下方新版流程。

研究批次以 preset／目標屆次分開；組別按每則原文保存，不會因選擇批次而認定其他留言屬於同一組。已確認資料集可搜尋組別及來源平台；摘要逐項保留來源與組別資料，不能把半馬意見套用十公里或全馬。不同來源的短句不自動合併成同一跑手。

## 原帖、留言與影片

- 優先保存獨立留言連結；YouTube 的 `lc`、Facebook 的 `comment_id`、MW 的評價 `rid` 都保留，避免不同留言被合併。
- 只有父帖／影片連結時，選「留言／回覆」及「只有主帖連結」，保留作者、原文和來源備註。不要把主帖 URL 當成每則留言的獨立 permalink。
- 多個 Vlog 片段如需要各自保存，用只有影片來源的個別觀測方式；來源備註記下時間點。單純更改影片 `t` 不會被當成另一位跑手或另一條留言。
- 同一來源同一內容重貼不重複新增；修文或修改日期／觀察範圍會保留新版本。只有父帖 URL 的情況，以本地原文觀測識別，無法證明來源中的兩條相同留言是不同人／不同項目。
- 跨平台轉載不會自動當成獨立跑手。原有去重會提示疑似重複；保留原文及來源供人工判斷。
- 短網址、搜尋頁、登入頁或不支援的來源格式可能被拒絕；請打開原帖取得完整連結。網址通過格式檢查不代表內容確實存在、完整或與該賽事有關。

## 私人保存與相容性

- 多來源原始資料：`.editorial-private/research/comments/manual.sqlite`。
- 人工覆核：同目錄 `manual-reviews.sqlite`。連同草稿資料庫一起備份。
- 草稿與版本紀錄：`.editorial-private/content-management/manual.sqlite`，與研究資料庫分開。
- 示範測試：`npm run research:comments -- --demo --port 0`，使用獨立的 `demo.sqlite`／`demo-reviews.sqlite`，不自動載入任何虛構內容。
- 舊 `npm run import:threads` 保持 Threads-only，使用原來的資料庫與埠 3332。多來源與舊工作區不可混用資料庫，沒有改寫既有原始資料。
- 全部私人內容受 `.editorial-private/` Git 忽略規則保護；不放入 `src/data/`、`public/`、網站部署封裝或提交到 Git。
- 未實作其他平台 API connector、排程、自動抓取、多來源批次檔案匯入，亦未自動導入歷史 Markdown 研究稿。既有 Threads API collector 仍需其獨立有效權限。

## 測試

```sh
npm run test:research
npm run test:threads
npm run test:threads:http
```

測試使用虛構資料及本機 HTTP，不對第三方平台發出請求。覆蓋平台／連結驗證、留言身份、日期與屆次分離、原文歷史、舊工作區隔離、CSRF、來源與觀察範圍到覆核／摘要／匯出的完整流程。

## 材料互通、批次匯入及私人備份

賽事資料卡可連去該場材料庫及相關草稿；賽事研究入口新增材料庫，原有搜尋／逐條覆核仍可使用。材料庫支援最多100則 JSON 陣列，整批驗證成功才寫入；完全相同材料不重複保存，修訂材料另存不可變版本。原有研究批次可明確指定賽事及目標屆次後連接，屆次仍待覆核，不繼承任何發布批准。

勾選同一賽事、年份的材料可建立未審閱草稿。草稿保存材料ID及當時文字；匯出含對應材料。舊草稿不會被新材料覆寫。標記待確認仍不等於發布批准。

「建立私人備份」保存三個 SQLite 資料庫的完整快照（包含版本紀錄），及 SHA-256 manifest，存於忽略的 `.editorial-private/backups/<UUID>/`，目錄權限700、檔案600。這是本機備份，不是異地備援；請將完成的整個目錄另存私人離線位置。恢復前停止後台，先另備份當前資料，核對manifest的SHA-256及每個SQLite的 `PRAGMA integrity_check`，再將content.sqlite、materials.sqlite、reviews.sqlite分別複製到啟動時的content-db、db、review-db路徑。保留原mode，恢復不會授予發布批准。

## AI 私人草稿建議（第一版）

沿用現有 SQLite、材料庫及草稿版本。第一版只處理私人草稿建議，不會自動確認留言／屆次／主題、核實事實、產生評分或批准發布；原有人工研究流程保持可用。

1. 啟動 `npm run content:manage`（示範：`npm run content:manage -- --demo`）。
2. `npm run content:agent -- context` 讀取賽事、材料及目前草稿；輸出是私人資料，勿放入公開目錄或提交。示範指令另加 `--demo`。
3. 將以下 JSON 存在 `.editorial-private/` 內，使用 context 中的真實 race_id／材料 ID。更新既有草稿時，填草稿 id 及當前 expected_revision；新增用 null／0。
4. `npm run content:agent -- propose .editorial-private/proposal.json`。
5. 在後台導覽「AI 建議覆核」查看目前完整版本、建議完整版本、依據原文、模型資料及 audit。輸入覆核備註，接受或拒絕。接受只保存 draft；之後仍需原有待確認及營運者完整指定版本的發布批准。

```json
{
  "idempotency_key": "unique-task-item-attempt",
  "agent": {
    "provider": "your-provider",
    "model": "your-model-version",
    "task_version": "draft-v1",
    "prompt_version": "prompt-v1"
  },
  "reason": "整理材料作私人草稿；未核實部分保留未知。",
  "draft": {
    "id": null,
    "expected_revision": 0,
    "kind": "review",
    "race_id": "replace-with-context-race-id",
    "year": 2026,
    "group": "未知",
    "title": "待覆核草稿",
    "body": "待覆核內容",
    "sources": "材料來源及限制",
    "scope": "觀察範圍及未知事項",
    "material_ids": []
  }
}
```

`list` 列出建議，`audit <proposal-id>` 讀取紀錄。CLI 輸出 schema_version=1，status=success/rejected；錯誤 code 包括 INVALID_INPUT、VERSION_CONFLICT、STALE_BASIS、IDEMPOTENCY_CONFLICT。模型身份是提交者提供的 metadata，不是供應商認證。

每份建議不可變，保存目標與所選不可變材料的 digest；目前草稿版本改變後不可接受舊建議。材料 ID 指向當時不可變原文；新增其他材料不會自動取代舊材料或表示已重新核實。需要新依據時建立新建議，人工必須核對來源及適用範圍。

相同 idempotency_key／相同內容重試回傳原建議；不同內容拒絕。接受後再次提交舊決定回 VERSION_CONFLICT，重新載入可查看既有結果。接受、草稿版本及 audit 使用同一資料庫交易，任何失敗整體回滾。拒絕不修改草稿。

建議及 audit 存於原有 content SQLite 的 ai_proposals／ai_proposal_audit，會納入現有私人備份。紀錄區分 agent 提議及 local_operator 覆核，不建立人工／法律／發布批准收據。原文只作材料，不作操作指令。

這是單一可信本機營運者工具：agent CLI 不提供接受／拒絕／發布命令；覆核沿用本機頁面的 Host／Origin／CSRF token。它不提供不同 OS 使用者、任意 shell agent 或共享資料庫寫入權限之間的強隔離。不要把覆核 session token 交給 worker；具有任意本機程式執行權限的 agent 仍須受宿主權限限制。遠端多使用者認證及獨立 worker credential 不在此版範圍。

## RMAC 已確認網站稿的正式建置接入

已確認的 CMS 網站稿第2版現存於 `content/runner-copies/rmac-2026.json`，`runnerCopyForRace` 在開發及正式靜態建置均載入指定賽事，不再使用 `LOCAL_RMAC_COPY_PREVIEW` 開關。來源 website ID、內容雜湊及轉換後文字雜湊綁定指定版本；改文字或版本須重新覆核並更新綁定，不會靜默採用其他草稿。

內容維持已確認匯出檔的完整標題、五個主題正文、來源編號連結、未知及觀察限制，包括標題原有的「候選・待覆核」文字；沒有另行改寫或新增評分。正式頁面不顯示開發專用「本機預覽／未部署」提示。CMS 資料庫、原始研究及操作紀錄繼續留在 `.editorial-private/`，正式建置不讀取私人檔案。

```sh
npm run build
npm run check:export
PORT=3002 npm start
```

`check:export` 除原匯出檢查，亦核對 RMAC 靜態 HTML 包含指定完整段落、五個主題及8個引用，不顯示人名／機構名，並確保不滲入其他賽事。這是建置接入，不代表已部署；實際部署仍須營運者另行批准。

## 新版：新增賽事 → 研究進度 → 網站稿 → 確認匯出

沿用原本機服務及 content SQLite，啟動時以新增資料表遷移，不覆寫原草稿、材料或 AI proposal。新增功能仍受原 Host／Origin／CSRF 驗證保護，只供可信單一本機營運者；沒有新增遠端登入或 agent 權限隔離。

1. **賽事資料 → 新增賽事**：名稱、年份必填，日期／組別／官方連結未知可留空。保存成私人賽事即可研究，不寫入 `catalog.json`，日期未知不虛構日期。修改或確認指定版本都有歷史及事件紀錄。
2. **逐來源研究進度／登入協作**：以賽事及年份分開，固定呈現七類來源。每類記錄實際搜尋字詞、含時區檢查時間、原文連結及限制；已讀原文須有連結，無結果／無法存取須有時間及說明。「請協助登入」保存等待狀態；營運者於原站登入後按繼續，只回到搜尋中，不代表已讀。沒有自動登入、爬取或第三方通知。
3. **研究材料**：可直接逐則填表保存原文、來源及範圍，私人新賽事毋須借用舊 preset；原有批次、覆核及 AI proposal 照常使用。CMS 材料主題增加寄存及交通，原 Threads 分類流程不變。
4. **網站稿**：由賽事入口或已保存草稿建立，參考原稿可展開；正文不自動由 AI 生成或當作已核實。固定賽道、補給、寄存、交通及大會安排，每項必須有正文（不足標未知）、限制及可選原文連結。來源按首次出現編號，同一連結重用編號；不顯示作者／機構欄位，但正文須由編輯自行確保不含名稱，連結仍可識別出處。完整預覽以跳脫文字呈現，不執行輸入 HTML。
5. **保存新版本並預覽 → 人工確認指定版本文字 → 匯出已確認版本**：確認綁定完整文字雜湊及版本。修改會回草稿；未保存修改時頁面鎖定確認及匯出。參考草稿、賽事資料或七類來源紀錄更新後，舊網站稿需另存新版本再確認，舊確認不能直接匯出。

尚有等待登入、未搜尋、搜尋中或無法存取來源時，不顯示研究完成。若營運者確實要保留未知先確認文字，必須額外明確勾選知悉未完成來源；匯出仍帶 `research_complete: false` 及逐平台狀態，不能將此操作當作已完成來源研究。

匯出為 schema_version=1 的私人待發布 JSON 交接檔，含指定內容／版本／文字雜湊、依據版本及來源進度（不含研究原文或整個 SQLite）；確認及匯出事件留在私人資料庫。`publication_approved`、`published` 均為 false，`deployment_required_approval` 為 true。這個匯出不是可直接覆蓋公開 catalog 的檔案；後續需按公開資料合約審閱整合、通過建置檢查並另外取得發布批准。此版本沒有網站寫入或部署命令。

可用獨立資料庫預覽示範，避免混入真實材料：

```sh
npm run content:manage -- --demo --port 3336 --db .editorial-private/research/comments/workflow-v2-demo.sqlite --review-db .editorial-private/research/comments/workflow-v2-demo-reviews.sqlite --content-db .editorial-private/content-management/workflow-v2-demo.sqlite
```

網站稿、來源進度及私人賽事都存於 content SQLite 的 `workflow_docs`、`workflow_versions`、`workflow_events`，會隨原私人備份流程完整備份。`content:agent context` 可讀到這些工作記錄，但 CLI 仍只提供 context／propose／list／audit，不增加確認、匯出或發布命令。

## CMS AI 操作 API V1

AI 共用現有賽事研究流程；`/materials` 顯示已連接研究批次及最近100項研究操作紀錄。沒有獨立 AI 工作頁；舊 `/agent-tools` 連結轉往 `/materials`。API 權限及使用方法保留在本文件。沿用私人資料庫及備份；不新增發布命令。

啟動 CMS 前，在程序環境設定兩個不同的隨機憑證（每個最少32字元）：

- `NXTGO_AGENT_TOKEN`：private_editor，可 context / import_materials / create_draft / update_draft / research_prepare / research_context / research_review。
- `NXTGO_AGENT_READ_TOKEN`：reader，可 context / research_context。
  未設定的角色不啟用；憑證不得放 Git、公開前端、模型 prompt、操作參數或日誌。更換憑證後重啟 CMS；API 只接受本機、無 Origin 的 JSON POST，沒有 CORS 開放。

CLI：`npm run content:agent -- execute .editorial-private/request.json`
以環境變數指定 `NXTGO_AGENT_URL=http://127.0.0.1:3334` 及對應憑證。CLI 只透過 HTTP 操作，不開資料庫；原 context/propose/list/audit 為可信本機營運者舊介面，保持相容，不能把它當成受限 worker 入口。

請求格式（模型欄位只是自報 metadata，權限由憑證決定）：

```json
{
  "action": "context",
  "input": { "race_id": "hzmb-half-marathon-2026", "year": 2025 },
  "idempotency_key": "research-2025-context-001",
  "reason": "讀取指定屆次的私人研究材料",
  "agent": {
    "provider": "external",
    "model": "chosen-model",
    "task_version": "research-v1",
    "prompt_version": "v1"
  }
}
```

`import_materials` 的 input 為既有材料格式的1–100則陣列（race_id/year/group/platform/url/text/posted_at/scope/topic），沿用平台 URL 驗證、去重及不可變材料。未知出帖日期填 null，AI 提供的年份／主題只作材料標記，不代表人工核實。

`create_draft` 的 input 為既有完整草稿格式（id/expected_revision/kind/race_id/year/group/title/body/sources/scope/material_ids）。僅接受 id=null、expected_revision=0，新建 status=draft。可用於摘要、主題整理及網站文字建議，必須保留材料依據與限制。create_draft 不可覆寫既有草稿；修改同一賽事及年份的私人 draft 可用 update_draft 並帶 expected_revision。待確認稿件須經原 proposal 人手覆核流程。不可標記確認、建立發布批准或發布。

所有寫入必須提供理由及 idempotency_key。相同請求重試回傳原結果；相同 key 不同內容或角色回 IDEMPOTENCY_CONFLICT。材料庫與草稿寫入及成功操作紀錄在同一內容 SQLite 交易，失敗會回滾；跨研究資料庫操作的重試語義見下方橋接說明。紀錄保存角色、動作、模型資料、理由、時間及當時結果／新草稿版本。讀取不寫操作紀錄，失敗不算成功。

這是本機可信營運者工具的 API 權限限制，不是 OS 沙箱。持有任意 shell、資料庫檔案或人手頁面 session 的 agent 仍可能繞過介面；真正獨立 worker 必須在另行限制的執行環境中只取得所需 Bearer 憑證，不取得私人檔案權限或人手 session。資料原文只是材料，不是操作指令。本版不會自動爬取來源、不接模型 API、不評分、不確認、不發布或部署。

### 已授權 AI 操作的本地 session

營運者已明確授權 AI／LLM 使用受限 CMS 介面：讀取、匯入材料、整理及建立私人草稿；確認文字、評分及公開發布仍由營運者操作。此授權不是任何稿件的發布批准。

`node scripts/content-agent-session.mjs` 可由可信宿主啟動，透過隱藏 stdin 接收 `{editor_token,reader_token,port}`。憑證由宿主產生並保留在 session 記憶體，不落檔、不顯示、不放 shell 參數。當前本地預覽採用此方式啟用；不需要將模型供應商 API key 交給 CMS。程序停止後要重新建立憑證及啟用本地 session，無需重新要求同一範圍的操作授權。CLI／worker 的請求仍受原角色白名單約束。

### AI 與原有研究流程橋接（2026-11-12）

營運者本輪授權 AI 對既有20則材料清理、去重、逐條研究覆核並更新2025私人草稿。

- research_prepare：input={material_ids:[...]}；呼叫原 ManualStore、cleanReport、ReviewStore.register 及 remember，保留原清理規則和快照。
- research_context：input={material_id}；讀清理結果、來源映射、逐條決定和歷史。reader也可讀。
- research_review：input={material_id,decision,note,expected_revision}；decision為keep/exclude/pending；記錄可信端點所附AI身份和操作識別，不能指定人手身份或覆寫人手研究決定。
- update_draft：沿用草稿欄位及expected_revision，只更新同賽事、年份、種類且status=draft的私人版本；待確認稿件不可寫。

來源短摘以原流程的root_text_observation保存，非平台留言ID，不杜撰作者、參賽身份或完整原文。相同來源不同摘錄各留觀察，同文重試不重複；同一影片不等於多個獨立樣本。

跨內容、原始材料和研究三個SQLite庫並非單一交易：原始匯入與快照可重試，研究決定帶request_key恢復已完成寫入；內容稿件及命令紀錄在同一交易。失敗須重試同一完整請求，不能宣稱全批原子寫入。AI保留只代表私人研究取材決定，並非人手稿件確認或發布批准。
