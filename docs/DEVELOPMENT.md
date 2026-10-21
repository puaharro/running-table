# 開發及交接

## 本地開發

使用支援本項目 Next.js 版本嘅 Node.js；目前開發環境 Node 24。使用 package-lock.json 固定實際安裝版本。

```text
npm ci
npm run dev
npm test
npm run typecheck
npm run build
npm start
```

dev 啟動 Next.js 開發環境；build 產生 out/ 靜態網站；start 喺 http://127.0.0.1:3000 提供靜態預覽。可透過 PORT 設定預覽埠。唔使用 next start 服務靜態輸出。

如 Windows npm 指令 shim 出現問題，可用 Node 直接執行已安裝套件入口，例如 `node node_modules/vitest/vitest.mjs run`、`node node_modules/typescript/bin/tsc --noEmit`、`node node_modules/next/dist/bin/next build`。套件下載遇系統憑證鏈問題可使用 Node --use-system-ca，唔停用 TLS 驗證。

## Git 工作方式

main 保持可建置；短期功能分支交付一項完整改動，審閱後合併。唔追蹤 node_modules、out、.next、環境密鑰、個人投稿或會員資料。正式 GitHub repo 擁有者、名稱、存取權及部署平台待確認；目前唔聲稱已建立遠端 repo。

## 第一版已建立

- 賽事總覽、關鍵字搜尋、五項條件介面、複合篩選與三種排序。
- 即將舉行／歷屆／全部、快捷日期、分享連結、返回保留條件。
- 12 場虛構賽事詳情、組別與狀態、資料來源說明。
- 3 篇原創指南、列表、目錄、相關賽事連結。
- 手機／桌面樣式、404、關於、原型私隱說明、廣告版位。
- 全站 noindex、空 sitemap，避免示範資料當正式資訊收錄。
- 16 項核心邏輯與資料測試。
- 已備妥 GitHub Actions 檢查流程；尚未連接遠端，因此未在 GitHub 執行。

## 正式公開上線前

1. 確認品牌、正式 GitHub repo、網域及部署服務。
2. 擴充正式資料合約，替換／隔離所有虛構賽事。
3. 核實來源、組別報名網址及精確截止時間，加入變更紀錄。
4. 補上真實營運者身份、聯絡方式及按實際服務撰寫嘅政策文件。
5. 設定 NEXT_PUBLIC_SITE_URL；完成正式 canonical、有效 sitemap、篩選頁索引策略與需要嘅結構化資料。
6. 為靜態日期／報名狀態配置排程重新建置，或改用按請求更新。
7. 確認內容完整後再解除正式頁 noindex，連接 Search Console。
8. 申請 AdSense，按帳戶及投放地區完成驗證、ads.txt、同意機制、廣告版位及效能驗證。

會員、收藏、加入日曆、跨裝置同步留待第二階段。
