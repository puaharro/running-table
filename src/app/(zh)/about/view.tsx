import { language, localPath } from "@/lib/english-races";
import { CorrectionForm } from "@/components/correction-form";
import { publicRaces as races } from "@/data/races";
import { raceHref } from "@/lib/site";
import Link from "next/link";
import { Breadcrumb } from "@/components/ui";
import { pageMetadata, siteName } from "@/lib/site";
import { releaseSettings } from "@/lib/release";
export const metadata = pageMetadata(
  `關於${siteName}及資料政策`,
  `${siteName}的網站定位、資料核實方式及更正政策。`,
  "/about/",
);
export default function About({ english = false }: { english?: boolean }) {
  const t = language(english);
  return (
    <main id="main" className="content-main shell">
      <Breadcrumb
        english={english}
        items={[{ label: t(`關於${siteName}`, `About ${siteName}`) }]}
      />
      <div className="page-heading">
        <h1>
          {t("每一個起點，", "Every start line")}
          <br />
          {t("都值得清晰的資訊。", "deserves clear information.")}
        </h1>
        <p>
          {siteName}
          {t(
            "是以香港路跑為主的資訊網站，協助跑手比較賽事及掌握報名資料。",
            " helps runners compare Hong Kong road races and find entry information.",
          )}
        </p>
      </div>
      <div className="prose narrow">
        <section>
          <h2>{t("網站目前處於正式開發及內容整理階段", "Site development and editorial work")}</h2>
          <p>
            {t(
              "賽事紀錄已改為官方來源整理，逐項列出核實範圍與時間；未核實欄位維持未知。本站提供資訊及官方連結，不代辦報名或收款，會員與個人功能留待下一階段。",
              "Race listings cite official sources and show what was checked and when. Unverified fields are left open. We provide information and official links. We do not handle entries or payments. Accounts and personal features are planned for a later phase.",
            )}
          </p>
        </section>
        <section>
          <h2>{t("官方資料的整理方式", "How we compile official information")}</h2>
          <p>
            {t(
              "每場已發布紀錄按主辦方官網或正式公告整理，清楚記錄來源及核實範圍。報名狀態超過 72 小時未核對會變為待核實，已過明確截止時間則顯示已截止。報名狀態按組別分開處理，未知資料標示「待核實」並說明原因；只有官方明確表示尚未公布，先會標示「官方未公布」。",
              "Each published listing uses the organiser’s website or announcements and records what was verified. Entry status becomes unverified after 72 hours without a check and is marked closed once a confirmed deadline passes. Each category is assessed separately. We explain what could not be verified and mark information unpublished only when the organiser says so.",
            )}
          </p>
          <p>
            {t(
              "第三方資訊不能取代官方條款。付款前應再次核對比賽年份、組別、費用、資格及退款／改期安排。",
              "The organiser’s terms govern entry. Before paying, check the race edition, category, fee, eligibility, and refund or rescheduling arrangements.",
            )}
          </p>
        </section>
        <section>
          <h2>{t("原創內容與廣告", "Original content and advertising")}</h2>
          <p>
            {t(
              "本站指南提供報名及選賽方法。內容與廣告會清楚區分，廣告版位不會偽裝成官方報名入口。目前未投放廣告。",
              "Our guides help you enter and choose races. Advertising is clearly separate from editorial content and is never presented as an official entry link. The site currently carries no ads.",
            )}
          </p>
          <p>
            {t(
              "參賽評論整理自參賽紀錄或跑手訪問，按年份及組別列出，並交代來源及觀察限制。",
              " Our editors use race records and runner interviews. Reviews are specific to the edition and category, and list the reviewer and observation limits. ",
            )}
            <Link href={localPath("/ratings/", english)}>
              {t("了解評論整理方式", "How reviews are compiled")}
            </Link>
          </p>
          <p>
            <Link href={localPath("/ratings/process/", english)}>
              {t("評級審閱及更正流程", "Editorial review and corrections")}
            </Link>{" "}
            ·{" "}
            <Link href={localPath("/ratings/feedback/", english)}>
              {t(
                "評級投訴／大會回應（私人電郵）",
                "Rating complaints or organiser responses (private email)",
              )}
            </Link>
          </p>
        </section>
        <section id="photo-credits">
          <h2>{t("首頁圖片來源", "Homepage photo credits")}</h2>
          <ul>
            <li>
              <a href="https://commons.wikimedia.org/wiki/File:Hong_Kong-Zhuhai-Macau_Bridge_at_Sha_Lo_Wan_(20180918131126).jpg">
                {t(
                  "港珠澳大橋香港連接路 · 沙螺灣（2018 年環境照）",
                  "Hong Kong–Zhuhai–Macao Bridge Hong Kong Link Road · Sha Lo Wan (2018 location photo)",
                )}
              </a>{" "}
              {t("· 攝影 N509FZ", "· Photo by N509FZ")}
            </li>
            <li>
              <a href="https://commons.wikimedia.org/wiki/File:Standard_Chartered_Hong_Kong_Marathon_2026_runners_18-01-2026(12).jpg">
                {t(
                  "渣打香港馬拉松 2026 · 市區路段",
                  "Standard Chartered Hong Kong Marathon 2026 · Urban section",
                )}
              </a>{" "}
              {t("· 攝影 LN9267", "· Photo by LN9267")}
            </li>
          </ul>
          <p>
            {t("以上兩張相按", "The two photos above are used under ")}{" "}
            <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>{" "}
            {t(
              "授權使用，已縮放及裁切展示。首頁海旁跑步及三張指南配圖為 AI 生成示意圖。",
              " and have been resized and cropped. The waterfront running image and three guide illustrations were AI-generated.",
            )}
          </p>
        </section>
        <section id="corrections">
          <h2>{t("資料更正與聯絡", "Corrections and contact")}</h2>
          <p>
            {t(
              "下方處理官方賽事資料更正；評級字眼、分數或體驗爭議請使用",
              "Use the form below to correct official race information. For wording, ratings or disputes about a review, use the ",
            )}
            <Link href={localPath("/ratings/feedback/", english)}>
              {t("評級回報入口", "editorial feedback form")}
            </Link>
            {t(
              "，毋須提供官方公告。",
              ". An official announcement is optional for editorial feedback.",
            )}
          </p>
          {releaseSettings.operatorName && (
            <p>
              {t("網站營運／資料整理：", "Site operator and data editor: ")}
              {releaseSettings.operatorName}
            </p>
          )}
          <CorrectionForm
            english={english}
            races={races.map((race) => ({
              id: race.id,
              name: english ? race.englishName : race.name,
              path: localPath(raceHref(race), english),
            }))}
            contactEmail={releaseSettings.contactEmail}
          />
        </section>
        <Link className="text-link" href={localPath("/guides/", english)}>
          {t("閱讀原創指南", "Read our guides")}
        </Link>
      </div>
    </main>
  );
}
