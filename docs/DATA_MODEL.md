# 資料合約 v0.3：組別與獨立報名渠道

程式型別：src/lib/types.ts。正式資料：src/data/catalog.json；assertCatalog 在匯入及建置時驗證。published + verified 紀錄才可發布，虛構資料只用於 tests/fixtures。

## Race：活動的一屆

穩定 ID、年份路徑、中英文名、活動日期、主辦方、地點、摘要、交通、來源、修改紀錄，以及 groups。

## RaceGroup：參賽組別

每組只記錄 id、name、distanceKm、date／endDate、startTime、region／venue、參賽資格／時限 limit、sourceIds 及 channels。

同一全馬不會因有四種渠道而變成四個組別。渠道名稱不放入組別名稱。組別的未知起點不得借用另一組別的資料。

## RegistrationChannel：獨立的申請紀錄

每個組別的 channels 陣列包含獨立渠道；每項有全站唯一 id，可獨立新增、修改及核實。

| 欄位                                      | 用途                                                                     |
| ----------------------------------------- | ------------------------------------------------------------------------ |
| type                                      | general 一般、priority 優先、charity 慈善、hotel 住宿連名額              |
| name／registrationMethod                  | 渠道名稱及申請方式，抽籤與先到先得分清楚                                 |
| eligibility                               | 該渠道的資格、籌款或套票條件，必填                                       |
| price／currency                           | 該渠道的金額及 HKD／USD；未知 null、免費 0，不借用一般報名費             |
| priceType                                 | entry-fee、minimum-donation 或 package                                   |
| priceUnit／priceNote                      | 每位、每套／晚等計價單位及內容；有金額的套票必填單位                     |
| status                                    | open、upcoming、waitlist、full、closed、unknown                          |
| registrationStart／deadline               | 只有日期的申請窗口                                                       |
| registrationOpensAt／registrationClosesAt | 有時區的精確申請窗口；截止與日期欄須對應香港同一天                       |
| resultAnnouncedAt／paymentClosesAt        | 結果公布及獲確認後付款期限，不能代替申請截止；同時有值時付款不得早於結果 |
| registrationVerifiedAt                    | 此渠道的實際核對時間；已知狀態必填                                       |
| registrationUrl／registrationNote         | 此渠道 HTTPS 官方入口及安排／限制                                        |
| sourceIds                                 | 只引用同一活動 sources；已知狀態必須有 channels.registration 證據        |

目前記錄可選的單輪結果／付款日期；如有多輪安排，note 必須說明所列輪次，完整時間表連到官方。不得用付款期限將已截止的抽籤重新顯示為接受申請。

## 狀態、篩選與計數

取消／已完成／組別日期已過 → closed；延期 → unknown；該渠道申請截止已到 → closed；未到開放 → upcoming；超過 72 小時未核對 → unknown。原先 upcoming 到預告開放時間只轉 unknown，不自動宣稱接受申請。

日期、距離、地區須在同一組別符合；渠道類型與狀態須在該組別的同一個渠道符合。不同欄 AND、同欄多選 OR。查詢使用可重複的 channel=general 等參數，支援分享及返回。

selectRaces 回傳該次符合的組別及其符合渠道，不修改原始 catalog。摘要、截止排序及倒數只採用符合條件的渠道。賽事及組別各計算一次，不按渠道重複計數。

任何接受申請的渠道仍須顯示資格。摘要可顯示「部分渠道接受申請」，不因一般報名截止概括所有渠道；無法確認慈善機構名額或房間供應時維持 unknown。

## 來源與內容維護

sources 包含 id、title、url、checkedAt、fields 及 note；checkedAt 只在實際閱讀來源後更新。Race.verifiedAt 不代表所有欄位齊備；渠道各自有 registrationVerifiedAt。review:data 逐組逐渠道列出覆核工作。
