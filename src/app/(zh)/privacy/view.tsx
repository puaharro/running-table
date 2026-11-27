import { language } from "@/lib/english-races";
import { Breadcrumb } from "@/components/ui";
import { releaseSettings } from "@/lib/release";
import { pageMetadata, siteName } from "@/lib/site";
export const metadata = pageMetadata(
  "私隱說明",
  `了解${siteName}目前的篩選網址、瀏覽器儲存及資料處理方式。`,
  "/privacy/",
);
export default function Privacy({ english = false }: { english?: boolean }) {
  const t = language(english);
  return (
    <main id="main" className="content-main shell">
      <Breadcrumb english={english} items={[{ label: t("私隱說明", "Privacy notice") }]} />
      <div className="page-heading">
        <h1>{t("私隱說明", "Privacy notice")}</h1>
        <p>{t("更新日期：2026 年 11 月 22 日。", "Updated 22 November 2026.")}</p>
      </div>
      <div className="prose narrow">
        <section>
          <h2>{t("目前網站功能", "Current site features")}</h2>
          <p>
            {t(
              "NXTGO 無會員登入、個人報名或付款表格，亦未加入 Google AdSense 或流量分析程式。賽事資料按公開官方來源整理；未知欄位保留待核實。",
              "NXTGO has no account sign-in, event entry or payment forms, Google AdSense, or analytics scripts. Race information comes from public official sources. Unknown fields are marked unverified.",
            )}
          </p>
        </section>
        <section>
          <h2>{t("篩選與瀏覽器儲存", "Filters and browser storage")}</h2>
          <p>
            {t(
              "您選擇的篩選條件會顯示在網址中，方便分享。分享連結會包含搜尋文字，請避免在搜尋欄輸入姓名、電話等私人資料。",
              "Selected filters appear in the URL so you can share them. Shared links include search terms. Keep names, phone numbers and similar personal information out of the search box.",
            )}
          </p>
          <p>
            {t(
              "收藏只以賽事代號儲存在目前瀏覽器 localStorage，毋須登入，不會傳送至網站或跨裝置同步。清除網站資料會移除收藏。「只看收藏」的顯示選擇保存在目前分頁 sessionStorage，不會包含在分享連結中。",
              "Only race IDs are saved in this browser’s localStorage. Saving needs no sign-in and does not transmit data or sync across devices. Clearing site data removes saved races. The saved-only view is kept in the current tab’s sessionStorage and is excluded from shared links.",
            )}
          </p>
          <p>
            {t(
              "加入日曆會在本機產生 .ics 檔案，由您自行匯入日曆。網站不會存取您的日曆帳戶。匯入後，行程由您使用的日曆服務處理，大會改期或更新截止日期時，網站不會自動同步。",
              "Adding a race to your calendar creates a local .ics file for you to import. NXTGO does not access your calendar account. Your calendar service manages the imported entry. Date and deadline changes do not sync automatically.",
            )}
          </p>
          <p>
            {t(
              "瀏覽器 sessionStorage 會保存最近使用的總覽篩選連結，方便由詳情頁返回。此儲存無需會員，不包含跨裝置追蹤碼，可以透過瀏覽器清除網站資料。瀏覽器正常返回功能亦可保留上一頁狀態。",
              "Browser sessionStorage remembers the last filtered calendar link so you can return from a race page. It needs no account and contains no cross-device tracking identifier. You can remove it by clearing site data. Your browser’s Back button can also restore the previous page state.",
            )}
          </p>
        </section>
        <section>
          <h2>{t("參賽筆記與評級回報", "Race notes and editorial feedback")}</h2>
          <p>
            {t(
              "參賽筆記只在目前瀏覽器儲存，由您自行儲存、匯出或匯入，不會自動傳送至網站。清除瀏覽資料會移除本機草稿，請保留備份。",
              "Race notes stay in the current browser. You control saving, export and import; the site does not receive notes automatically. Clearing browser data removes local drafts, so keep a backup.",
            )}
          </p>
          <p>
            {t(
              "資料更正、評級投訴及大會回應表格只在頁面準備電郵內容，未建立伺服器收件或自動儲存功能。由你確認及寄出後，電郵及附件會由收件郵箱接收，用於核實、回覆及保存必要的處理紀錄；請只提供處理所需資料。",
              "The correction and review feedback forms prepare local email drafts and do not submit or automatically save them. Once you send it, the recipient mailbox receives the email and attachments for verification, reply and necessary record keeping. Include only the information needed to handle the request.",
            )}
          </p>
          <p>
            {t(
              "公開更正摘要會與私人材料分開整理。查詢、更正或刪除私人資料的要求，可透過下方電郵聯絡；處理時亦需考慮保存爭議紀錄的需要。",
              "Public correction summaries are kept separate from private material. Use the email below to ask about, correct or delete personal data. We consider any need to retain dispute records when handling requests.",
            )}
          </p>
        </section>
        <section>
          <h2>{t("網站託管及外部連結", "Hosting and external links")}</h2>
          <p>
            {t(
              "NXTGO 由 ChatGPT Sites 託管。服務供應商可能處理 IP 位址及請求紀錄，以提供及維護託管服務。",
              "NXTGO is hosted on ChatGPT Sites. The provider may process IP addresses and request logs to operate and maintain the hosting service.",
            )}
          </p>
          <p>
            {t(
              "透過本網站前往賽事主辦方或報名平台時，請參閱該網站的私隱說明。賽事報名及付款由該平台處理。",
              "When you follow a link to a race organiser or registration platform, check that website’s privacy notice. It handles event registration and payment.",
            )}
          </p>
        </section>
        {releaseSettings.contactEmail && (
          <section>
            <h2>{t("聯絡", "Contact")}</h2>
            {releaseSettings.operatorName && (
              <p>
                {t("網站營運者：", "Site operator: ")}
                {releaseSettings.operatorName}
              </p>
            )}
            <p>
              {t("關於網站資料處理的查詢，請電郵", "For questions about data handling, email ")}{" "}
              <a href={`mailto:${releaseSettings.contactEmail}`}>{releaseSettings.contactEmail}</a>
              {t("。", ".")}
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
