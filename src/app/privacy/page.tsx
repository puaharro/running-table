import { Breadcrumb } from "@/components/ui";
import { releaseSettings } from "@/lib/release";
import { pageMetadata } from "@/lib/site";
export const metadata = pageMetadata(
  "私隱說明",
  "了解跑期目前嘅篩選網址、瀏覽器儲存及資料處理方式。",
  "/privacy/",
);
export default function Privacy() {
  return (
    <main id="main" className="content-main shell">
      <Breadcrumb items={[{ label: "測試版私隱說明" }]} />
      <div className="page-heading">
        <div className="eyebrow">PRIVACY NOTE</div>
        <h1>測試版私隱說明</h1>
        <p>更新日期：2026 年 10 月 21 日。以下只描述目前測試版嘅功能。</p>
      </div>
      <div className="prose narrow">
        <section>
          <h2>目前網站功能</h2>
          <p>
            此測試版無會員登入、收藏、個人報名或付款表格，亦未加入 Google AdSense
            或流量分析程式。賽事資料按公開官方來源整理；未知欄位保留待核實。
          </p>
        </section>
        <section>
          <h2>篩選與瀏覽器儲存</h2>
          <p>
            你選擇嘅篩選條件會顯示喺網址，方便分享。請避免喺搜尋欄輸入姓名、電話等私人資料，分享連結會包含搜尋文字。
          </p>
          <p>
            瀏覽器 sessionStorage
            會保存最近嘅總覽篩選連結，方便由詳情頁返回。此儲存無需會員，唔包含跨裝置追蹤碼，可以透過瀏覽器清除網站資料。瀏覽器正常返回功能亦可保留上一頁狀態。
          </p>
        </section>
        <section>
          <h2>網站託管與正式上線</h2>
          <p>
            託管服務可能按自身運作記錄請求資訊。本說明唔涵蓋託管平台本身嘅完整資料政策。接入正式網域、廣告、分析或會員前，會按實際服務更新私隱政策及需要嘅同意機制。
          </p>
          <p>此頁係測試版功能說明，唔表示網站已完成正式營運所需嘅私隱或法律文件。</p>
        </section>
        {releaseSettings.contactEmail && (
          <section>
            <h2>聯絡</h2>
            <p>
              關於網站資料處理嘅查詢，請電郵{" "}
              <a href={`mailto:${releaseSettings.contactEmail}`}>{releaseSettings.contactEmail}</a>
              。
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
