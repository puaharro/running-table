# 資料合約

目前型別定義喺 `src/lib/types.ts`。內容仍全部係虛構示範，唔可以只改 verification 就當正式資料。

## Race：一個活動嘅一屆

| 欄位 | 規則 |
| --- | --- |
| id / slug | 穩定、唯一；已發布後修改 slug 需處理舊連結 |
| name / englishName | 顯示名稱，唔包含推銷或未核實認證描述 |
| date / endDate | YYYY-MM-DD，比賽開始／結束日期，香港日期語意 |
| region / district / venue | 四大區、細分地區、起點；同頁展示 |
| sport | 首階段只接受「路跑」 |
| tags | 親子、慈善、海濱等屬性；唔當距離或運動類別 |
| status | scheduled / postponed / cancelled / completed |
| summary / highlights / transport | 原創整理；判斷需有根據 |
| sourceUrl | 原型為 null；正式資料要記錄官方來源 |
| updatedAt | 實際資料修改日期，唔隨每次建置虛假更新 |
| verification | demo / verified / pending |

## RaceGroup：組別

每組有固定 ID、名稱、距離公里數、比賽日期、可選結束日期、費用、報名狀態、可選開放／截止日期同限制說明。組別日期須落喺活動日期範圍。

半馬用 21.0975，全馬用 42.195。免費費用係 0；未知係 null。其他距離照實保存，唔硬套 5K 或 10K。

報名狀態：open、upcoming、waitlist、full、closed、unknown。賽事取消、已完成或組別日期已過時覆蓋為 closed；延期覆蓋為 unknown；截止翌日覆蓋為 closed。到達開放日期而無重新核實，upcoming 變 unknown。

## 正式資料擴充前必做

目前單一 sourceUrl 同 updatedAt 只夠原型。正式內容匯入前補上每個組別／重要欄位嘅 sources、verifiedAt、報名網址、公開／草稿狀態、精確香港開賽／截止時間及修改記錄，並加入驗證。資料過舊要標示待核實。

唔好以目前虛構 organizer、費用或示範文字代替真實核實。無官方報名網址時只顯示無入口，唔製造連結。
