# 開發及交接 v0.2

## 指令

```text
npm ci
npm run dev
npm test
npm run typecheck
npm run build
npm run check:export
npm run test:http
npm run review:data
npm start
```

Node 24、Next.js 靜態輸出；package-lock.json 固定依賴。dev 啟動開發環境；build 產生 out/；start 服務本機靜態預覽，預設 http://127.0.0.1:3000，可用 PORT 調整。唔使用 next start 服務靜態輸出。

格式化：npm run format。Windows npm shim 有問題可直接用 Node 執行 node_modules 入口。下載遇到系統憑證鏈問題可使用 Node --use-system-ca，唔停用 TLS。

## 編輯真實資料

改 src/data/catalog.json；保持固定 ID、來源及組別引用。先閱讀 DATA_MODEL.md。修改後跑測試、建置及匯出檢查。npm run review:data 產生待核對組別清單，包括 72 小時過期、7 日內截止、未知費用／起點。

來源核對只覆蓋明確列出欄位，唔將目錄網站嘅報名中標籤當成官方確認。UNKNOWN 唔等於未開放。

## Git 與 CI

本地開發分支 feature/production-content-foundation。程式、公開資料、指南及來源紀錄一併提交；唔放環境密鑰、私人投稿或會員資料。

已備 GitHub Actions，執行 npm ci、測試、建置、匯出及 HTTP 路由檢查。未連接 GitHub remote，未喺遠端執行；目前仍以本地 Git 作版本紀錄。

## 搜尋收錄與正式網域

.env.example 列出設定。預設 SITE_INDEXABLE=false，可維持真實資料測試版。

正式啟用收錄時需要：

- NEXT_PUBLIC_SITE_URL：真實 HTTPS origin，唔帶子路徑。
- SITE_CONTACT_EMAIL：真實公開聯絡電郵。
- SITE_OPERATOR_NAME：真實營運者名稱。
- SITE_INDEXABLE=true：明確開啟收錄；必要設定缺失會阻止建置。

目前按使用者決定沿用「跑期 RunDates」，聯絡資料稍後補齊。未有上述設定之前，繼續 noindex 測試版，唔妨礙開發。

## 公開發布前剩餘工作

1. 選定 GitHub repo、正式網域及部署平台，配置來源推送／部署流程。
2. 補完優先資料待辦，增加已核實香港路跑覆蓋面。
3. 完成桌面／手機瀏覽器與鍵盤操作驗證；目前有工具政策限制，未繞過。
4. 補上真實營運者與聯絡資料，按實際託管／資料處理完成政策文件。
5. 設定正式 origin、收錄及參數頁索引策略；核對 sitemap、canonical、活動資料。
6. 安排人工核實及靜態重新建置頻率，唔將重建當成重新核實。
7. 完整內容網站上線後申請 AdSense，再處理驗證、ads.txt、同意要求及效能。

無會員、無收藏、無加入日曆、無廣告腳本。呢啲仍按既定階段處理。
