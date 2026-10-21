# 資料合約 v0.2

程式型別：src/lib/types.ts。真實資料：src/data/catalog.json。資料匯入時會執行 assertCatalog，建置失敗時唔會產生新發布。

## Race：一個活動嘅一屆

穩定 ID、slug、中英文名、開始及結束日期、地區／細分地區／起點、路跑類別、標籤、主辦／統籌、原創摘要、選賽重點、交通說明、組別、官方網址、修改日期。

publication 為 draft 或 published；verification 為 demo、pending 或 verified。只有 published + verified 可以匯出頁面；虛構測試資料另放 tests/fixtures，唔寫入正式 catalog。

region 可以係四大區或 null。多組別起點未確定時留 null，按組別已核實起點篩選，唔硬套某一組地區。

## RaceGroup：參賽組別及所列渠道

| 欄位                                       | 規則                                                 |
| ------------------------------------------ | ---------------------------------------------------- |
| id / name                                  | 全站唯一組別 ID、清楚列明渠道嘅名稱                  |
| distanceKm / date / endDate                | 實際公里數、香港日期；組別日期落於活動範圍           |
| price / priceNote                          | 港元；未知 null、免費 0；區分本地費用等條件          |
| status                                     | open / upcoming / waitlist / full / closed / unknown |
| registrationMethod / registrationNote      | 公眾抽籤、先到先得等；說明只涵蓋所列渠道             |
| registrationUrl                            | 已核對官方資料／報名入口，必須 HTTPS                 |
| registrationOpensAt / registrationClosesAt | ISO 8601，必須有時區；以香港顯示                     |
| registrationStart / deadline               | 日期版欄位，與精確截止換算後嘅香港日期一致           |
| registrationVerifiedAt                     | 實際核對狀態時間，已知狀態必填                       |
| region / venue                             | 已核實組別起點，覆蓋活動預設值；未知可 null          |
| limit                                      | 年齡、時限等已核實說明，未知唔補造                   |
| sourceIds                                  | 引用同一活動 sources 中嘅 ID，唔接受斷開引用         |

半馬 21.0975、全馬 42.195；其他公里數按實際資料記錄。

## 欄位來源

sources 每項有 id、title、url、checkedAt、fields、可選 note。fields 列明核實日期、地點、費用、報名等範圍。已知報名狀態必須引用有 groups.registration 證據嘅來源。

verifiedAt 代表最後完成當次欄位核對嘅時間，唔代表全部資訊完整；未知欄位仍留空。updatedAt 只記實際內容修改日；changes 保存日期及變更說明。

## 狀態優先次序

取消／已完成／組別日期已過 → 已截止；延期 → 待核實；明確截止已到 → 已截止；原始未知 → 待核實；未到開放時間 → 未開放；超過 72 小時未核對 → 待核實。到達原定開放時間，唔會憑日曆自動承諾有名額。

同一活動可以仲有本頁未收錄嘅慈善、輪椅或其他渠道。列表同詳情都有範圍說明，唔以公眾抽籤截止概括所有參賽方式。
