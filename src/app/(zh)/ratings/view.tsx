import { englishRaceTerm } from "@/lib/race-terms.en";
import { language, localPath } from "@/lib/english-races";
import "./ratings.css";
import Link from "next/link";
import { publicRaces as races } from "@/data/races";
import { editorialReviews } from "@/data/editorial-reviews";
import notices from "@/data/editorial-notices.json";
import { EditionReviewCoverage, PublishedReviewCards } from "@/components/ratings-catalog";
import { RatingMethodDisclosure } from "@/components/rating-method-disclosure";
import { Breadcrumb, Icon } from "@/components/ui";
import { ratingDimensions, ratingPolicy, scoreLabels, reviewTargets } from "@/lib/rating-policy";
import { pageMetadata } from "@/lib/site";
export const metadata = pageMetadata(
  "賽事體驗評級及評論",
  "NXTGO 原創賽事評論：賽道體驗、大會執行與補給體驗，以參賽觀察及訪問支持每項評分。",
  "/ratings/",
);
export default function RatingsPage({ english = false }: { english?: boolean }) {
  const t = language(english);
  const paused = notices.filter(
    (n) => n.status === "待確認" && !editorialReviews.some((r) => r.id === n.reviewId),
  );
  return (
    <main id="main" className="ratings-page">
      <div className="shell">
        <Breadcrumb
          english={english}
          items={[{ label: t("賽事體驗評級", "Runner reviews and ratings") }]}
        />
        <header className="ratings-heading">
          <h1>{t("賽事體驗評級", "Runner reviews and ratings")}</h1>
          <p>
            {t(
              "查閱指定年份及組別的參賽體驗，了解跑手在賽事中的實際觀察。",
              "Read first-hand runner observations by edition and race category.",
            )}
          </p>
          <nav aria-label={t("評級頁入口", "Reviews quick links")}>
            <a href="#published-reviews">
              {t("查看已發布評論", "Read published reviews")} <Icon name="arrow" size={16} />
            </a>
            <a href="#method">{t("了解評分準則 ↓", "Rating criteria ↓")}</a>
          </nav>
        </header>
        <div className="ratings-layout">
          <div className="ratings-main">
            <section
              id="published-reviews"
              className="ratings-published"
              aria-labelledby="published-heading"
              tabIndex={-1}
            >
              <div className="ratings-section-heading">
                <h2 id="published-heading">
                  {t("已發布評論", "Published reviews")}{" "}
                  <span>
                    {editorialReviews.length}
                    {t(" 篇", "")}
                  </span>
                </h2>
                <span>{t("按評論年份，由近至遠", "Newest editions first")}</span>
              </div>
              {!editorialReviews.length && (
                <p className="ratings-empty">
                  {t("尚未有已發布編輯點評。", "No editorial reviews have been published yet.")}
                </p>
              )}
              <PublishedReviewCards english={english} races={races} reviews={editorialReviews} />
            </section>
            <EditionReviewCoverage english={english} races={races} reviews={editorialReviews} />
          </div>
          <details className="ratings-explainer">
            <summary>{t("如何理解評分？", "How to read the ratings")}</summary>
            <p>
              {t(
                "評論按年份及組別分開，保留三項獨立評分，總評分為三項等權平均。",
                "Each review covers a specific edition and category. The overall score gives equal weight to the three dimensions.",
              )}
            </p>

            <h2 id="ratings-explainer-heading">
              {t("從三個角度", "Three dimensions")}
              <span>{t("分項評估參賽體驗。", "of the race experience.")}</span>
            </h2>
            <p>
              {t(
                "每項 1–5 分；資料不足保留未評，不當零分；三項齊備才計算總評分，滿分 5 分，顯示一位小數。",
                "Each dimension is scored from 1 to 5. Insufficient evidence leaves that dimension unrated. The overall score is shown to one decimal place only when all three ratings are available.",
              )}
            </p>
            <ol>
              {ratingDimensions.map((key, index) => (
                <li key={key}>
                  <span aria-hidden="true">0{index + 1}</span>
                  <div>
                    <h3>{englishRaceTerm(ratingPolicy.dimensions[key].title, english)}</h3>
                    <p>{englishRaceTerm(ratingPolicy.dimensions[key].prompt, english)}</p>
                  </div>
                </li>
              ))}
            </ol>
            <a className="ratings-method-link" href="#method">
              {t("了解評分準則及發布流程", "Rating criteria and publication process")}{" "}
              <Icon name="arrow" size={16} />
            </a>
            <Link className="ratings-process-link" href={localPath("/ratings/process/", english)}>
              {t("審閱、更正及大會回應流程", "Review, corrections and organiser responses")}
            </Link>
          </details>
        </div>
        <div className="ratings-method-section prose">
          <RatingMethodDisclosure english={english}>
            <section className="editorial-notice">
              <h2>{t("先確認，再發布", "Approval before publication")}</h2>
              <p>
                {t(
                  "每篇稿件及分數須經營運者確認，改稿後重新審閱。待確認內容不會當成正式分數。",
                  "The operator approves each review and its ratings. Revised drafts need another review. Pending ratings have no official status.",
                )}
              </p>
              {paused.map((n) => (
                <p key={n.id}>
                  {reviewTargets.find((t) => t.id === n.targetId)?.name} {n.editionYear}：
                  {n.summary}
                </p>
              ))}
              <Link className="text-link" href={localPath("/ratings/process/", english)}>
                {t("審閱、更正及大會回應流程", "Review, corrections and organiser responses")}
              </Link>
              <p>
                <Link className="text-link" href={localPath("/ratings/feedback/", english)}>
                  {t(
                    "提出更正／投訴／大會回應",
                    "Submit a correction, complaint or organiser response",
                  )}
                </Link>
              </p>
            </section>
            <section>
              <h2>{t("三項獨立評分，每項 1–5 分", "Three independent scores from 1 to 5")}</h2>
              <p>
                {t("由 ", "")}
                {englishRaceTerm(ratingPolicy.publisher, english)}{" "}
                {t(
                  "制定試行準則，評審按親身參賽紀錄或跑手訪問作編輯判斷。每項有短評、觀察依據及適合對象；資料不足保留未評，不當零分；三項齊備才計算總評分，滿分 5 分，顯示一位小數。",
                  " developed these trial criteria. Reviewers use first-hand records or runner interviews. Each dimension describes observations, evidence and who the race suited. An overall score out of 5 is shown to one decimal place once all three ratings are available.",
                )}
              </p>
              <p>
                {t(
                  "距離、時限及官方安排繼續在賽事資料列出；賽道挑戰特性獨立描述，賽道難度與參賽體驗分開評估。",
                  "Distances, time limits and official arrangements appear on the race page. Course challenges and difficulty are assessed separately from the race experience.",
                )}
              </p>
            </section>
            {ratingDimensions.map((key) => (
              <section key={key}>
                <h2>{englishRaceTerm(ratingPolicy.dimensions[key].title, english)}</h2>
                <p>{englishRaceTerm(ratingPolicy.dimensions[key].prompt, english)}</p>
                <ol className="rating-anchors">
                  {ratingPolicy.dimensions[key].anchors.map((anchor, index) => (
                    <li key={englishRaceTerm(anchor, english)}>
                      <strong>{englishRaceTerm(scoreLabels[index + 1], english)}</strong>
                      {t("：", ": ")}
                      {englishRaceTerm(anchor, english)}
                    </li>
                  ))}
                </ol>
              </section>
            ))}
            <section>
              <h2>{t("閱讀評分時的注意事項", "Reading the ratings")}</h2>
              <ul>
                <li>
                  {t(
                    "評論按年份及組別分開；往屆體驗不代表下一屆表現，全馬評論亦不套用半馬。",
                    "Reviews apply to the stated edition and category. An earlier edition or a different category may offer a different experience.",
                  )}
                </li>
                <li>
                  {t(
                    "顯示評審署名、前／中／後段位置、參賽或利益關係、更新日期及觀察限制。",
                    "We list the reviewer, their position in the field, participation or conflicts of interest, update date and observation limits.",
                  )}
                </li>
                <li>
                  {t(
                    "單一評審只代表其觀察，並不代表所有跑手的共識；官方安排、GPX 或影片可補充背景，服務表現的評估須有宣傳內容以外的依據。",
                    "One reviewer reports their own observations. Official plans, GPX files and videos can add context. Assessments of service require evidence beyond promotional materials.",
                  )}
                </li>
                <li>
                  {t(
                    "5 分需要具體紀錄支持，補給尤其要留意後段供應；未有觀察記錄，無法據此判定有否問題。",
                    "A score of 5 requires specific evidence. Aid station ratings should consider supply for runners towards the back. An absence of observations leaves the outcome unknown.",
                  )}
                </li>
                <li>
                  {t(
                    "未來修訂準則會保留修改原因及版本；這是編輯試行評級，尚未經大規模校準。",
                    "Future revisions will record their reasons and version. These trial criteria have yet to be calibrated at scale.",
                  )}
                </li>
              </ul>
            </section>
            <section>
              <h2>{t("由參賽筆記，累積成獨家評論", "From race notes to original reviews")}</h2>
              <p>
                {t(
                  "首輪整理港珠澳半馬及渣打全馬。先記低具體經驗、年份同觀察範圍，再完成編輯審閱及發布；未有材料的年份或項目保留未評。",
                  "The first reviews cover the Hong Kong–Zhuhai–Macao Bridge Half Marathon and Standard Chartered Hong Kong Marathon. We gather specific experiences and record the edition and observation limits before editorial review and publication. Editions and dimensions without evidence remain unrated.",
                )}
              </p>
              <Link className="text-link" href={localPath("/ratings/notebook/", english)}>
                {t("開啟參賽筆記", "Open the race notebook")}
              </Link>
            </section>
            <p>
              <small>
                {t("準則版本：", "Criteria version: ")}
                {ratingPolicy.version}
              </small>
            </p>
          </RatingMethodDisclosure>
          <Link className="text-link" href={localPath("/races/", english)}>
            {t("返回賽事搜尋／時間表", "Back to race search and calendar")}
          </Link>
        </div>
      </div>
    </main>
  );
}
