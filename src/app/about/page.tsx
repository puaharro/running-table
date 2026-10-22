import Link from "next/link";
import { Breadcrumb } from "@/components/ui";
import { pageMetadata, siteName } from "@/lib/site";
import { releaseSettings } from "@/lib/release";
export const metadata = pageMetadata(
  `關於${siteName}及資料政策`,
  `${siteName}嘅網站定位、資料核實方式及更正政策。`,
  "/about/",
);
export default function About() {
  return (
    <main id="main" className="content-main shell">
      <Breadcrumb items={[{ label: `關於${siteName}` }]} />
      <div className="page-heading">
        <div className="eyebrow">ABOUT {siteName}</div>
        <h1>
          每一個起點，
          <br />
          都值得清楚嘅資訊。
        </h1>
        <p>{siteName}係一個以香港路跑為主嘅資訊網站，協助跑手比較賽事同掌握報名資料。</p>
      </div>
      <div className="prose narrow">
        <section>
          <h2>網站目前處於正式開發及內容整理階段</h2>
          <p>
            賽事紀錄已改為官方來源整理，逐項列出核實範圍與時間；未核實欄位維持未知。本站提供資訊及官方連結，唔代辦報名或收款，會員與個人功能留待下一階段。
          </p>
        </section>
        <section>
          <h2>正式資料點樣整理</h2>
          <p>
            每場已發布紀錄按主辦方官網或正式公告整理，清楚記錄來源及核實範圍。報名狀態超過 72
            小時未核對會變為待核實，已過明確截止時間則顯示已截止。報名狀態按組別分開處理，未知資料標示「未公布」或「待核實」。
          </p>
          <p>
            第三方資訊唔代替官方條款。付款前應再次核對比賽年份、組別、費用、資格及退款／改期安排。
          </p>
        </section>
        <section>
          <h2>原創內容與廣告</h2>
          <p>
            本站指南提供報名同選賽嘅整理方法。內容同廣告會清楚區分，廣告版位唔會偽裝成官方報名入口。目前未投放廣告。
          </p>
        </section>
        <section id="corrections">
          <h2>資料更正與聯絡</h2>
          {releaseSettings.operatorName && (
            <p>網站營運／資料整理：{releaseSettings.operatorName}</p>
          )}
          {releaseSettings.contactEmail ? (
            <p>
              如發現日期、組別或報名安排有誤，請電郵{" "}
              <a href={`mailto:${releaseSettings.contactEmail}`}>{releaseSettings.contactEmail}</a>
              ，附上賽事名稱、需要更正嘅內容同官方公告連結。我們會核實後更新紀錄。
            </p>
          ) : (
            <p>此測試版本暫未開放公開投稿或回報。正式上線時會提供營運者資料同聯絡渠道。</p>
          )}
        </section>
        <Link className="text-link" href="/guides/">
          閱讀原創指南 →
        </Link>
      </div>
    </main>
  );
}
