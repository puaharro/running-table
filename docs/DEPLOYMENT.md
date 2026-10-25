# Sites 部署

GitHub 是產品來源；Sites 保存對應部署來源及靜態版本。`.openai/hosting.json` 記錄固定 Site 身份，更新時必須重用，不另建同一網站。

- 網站：https://nxtgo-running-table-20261025.pauharro.chatgpt.site
- 託管：Sites 靜態網站，發布目錄 `out`。
- 首次部署預設只有擁有人可見；訪問權限以 Sites 最新設定為準。
- 搜尋收錄維持 `SITE_INDEXABLE=false`，未啟用廣告。

發布步驟：先審閱／合併產品 PR 並確認 CI，再以該 main 來源建立乾淨的部署 checkout。使用 Node 24 和 package-lock.json 的依賴，將 `NEXT_PUBLIC_SITE_URL` 設為上述 origin，經 Sites build helper 執行 Next.js 靜態建置，通過匯出及 HTTP 檢查後，以 Sites source helper 同步來源並打包，最後儲存版本及部署。憑證只經工具記憶體及 stdin 傳遞，不寫入 repo 或環境檔。

GitHub main 的更新目前不會自動發布到 Sites；須完成上述同步與部署。部署版本及結果以 Sites 回傳紀錄為準。回復版本時選擇先前已儲存的版本重新部署，不刪除歷史。

開放公眾訪問與啟用搜尋收錄是兩項設定。啟用收錄前仍需補齊真實營運者及聯絡資料，並核對 canonical、sitemap 及資料時效。
