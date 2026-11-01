# 指南列表及文章改版驗證

2026-11-01。未部署、未推送。

## 修改

- 指南分成選賽及報名前準備，保留原有三篇文章及完整內容。
- 手機可見目錄、章節定位及返回目錄；桌面右欄目錄，正文欄寬受限。
- 原結尾段落加視覺重點，文章後有相關賽事、對應距離時間表及繼續閱讀。
- 沿用墨綠／暖白風格、主要連結 44px 以上、可見鍵盤焦點、減少動畫選項及自然文字換行。

## 檢查

- `npm run typecheck`、155 tests / 20 files、正式建置全部通過。
- Editorial 檢查通過：2 份已批准評論；指南資料、評級資料、準則及審批沒有 diff。
- 匯出檢查通過：21 HTML 頁面、679 內部引用及來源披露。
- 瀏覽器逐頁檢查列表及三篇文章：320 / 375 / 768 / 900 / 1440px（900×500 橫向），沒有橫向溢出。每篇仍有 4 節、8 段完整正文。
- 已驗證分類跳轉、手機目錄／返回目錄、10K／半馬距離篩選、一般報名指南未套距離、相關賽事內頁及繼續閱讀。
- 瀏覽器 console 無 warning / error；`git diff --check` 通過。
- 新增 CSS 約 10.5KB，gzip 約 2.3KB；沒有新增依賴或頁面 JavaScript。未進行真實網絡 Core Web Vitals 或完整螢幕閱讀器測試。

預覽：`http://127.0.0.1:3015/guides/`、`http://127.0.0.1:3015/guides/choose-your-first-10k/`。
截圖：`artifacts/guides-desktop.png`、`artifacts/guides-mobile.png`、`artifacts/guide-article-desktop.png`、`artifacts/guide-article-mobile.png`。
