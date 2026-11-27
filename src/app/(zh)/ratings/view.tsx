import { englishRaceTerm } from "@/lib/race-terms.en";
import { language, localPath } from "@/lib/english-races";
import "./ratings.css";
import Link from "next/link";
import { publicRaces as races } from "@/data/races";
import { editorialReviews } from "@/data/editorial-reviews";
import notices from "@/data/editorial-notices.json";
import { RunnerAccountsCatalog } from "@/components/ratings-catalog";
import { RatingMethodDisclosure } from "@/components/rating-method-disclosure";
import { Breadcrumb, Icon } from "@/components/ui";
import { ratingDimensions, ratingPolicy, reviewTargets, scoreLabels } from "@/lib/rating-policy";
import { pageMetadata } from "@/lib/site";
export const metadata = pageMetadata(
  "跑手分享",
  "按賽事、組別及年份查閱 NXTGO 已發布的跑手分享。",
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
        <Breadcrumb english={english} items={[{ label: t("跑手分享", "Runner accounts") }]} />
        <header className="ratings-heading">
          <h1>{t("跑手分享", "Runner accounts")}</h1>
          <p>
            {t(
              "查閱指定年份及組別的參賽體驗，了解跑手在賽事中的實際觀察。",
              "Read first-hand runner observations by edition and race category.",
            )}
          </p>
          <nav aria-label={t("跑手分享頁入口", "Reviews quick links")}>
            <a href="#published-reviews">
              {t("查看有分享的賽事", "Browse runner accounts")} <Icon name="arrow" size={16} />
            </a>
            <a href="#method">{t("查看評分準則 ↓", "View rating criteria ↓")}</a>
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
                <h2 id="published-heading">{t("選擇賽事及年份", "Choose a race and edition")}</h2>
              </div>
              <RunnerAccountsCatalog english={english} races={races} />
            </section>
          </div>
          <details className="ratings-explainer">
            <summary>{t("如何閱讀參賽評論？", "How to read the reviews")}</summary>
            <p>
              {t("評論按年份及組別分開。", "Each review covers a specific edition and category.")}
            </p>

            <h2 id="ratings-explainer-heading">
              {t("從三個角度", "Three dimensions")}
              <span>{t("整理參賽體驗。", "of the race experience.")}</span>
            </h2>
            <ol>
              {ratingDimensions.map((key, index) => (
                <li key={key}>
                  <span aria-hidden="true">0{index + 1}</span>
                  <div>
                    <h3 data-rating-dimension={key}>
                      {englishRaceTerm(ratingPolicy.dimensions[key].title, english)}
                    </h3>
                    <p>{englishRaceTerm(ratingPolicy.dimensions[key].prompt, english)}</p>
                  </div>
                </li>
              ))}
            </ol>
            <a className="ratings-method-link" href="#method">
              {t("了解評論整理方式及發布流程", "Review methodology and publication process")}{" "}
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
                  "每篇稿件須經營運者確認，改稿後重新審閱。",
                  "The operator approves each review. Revised drafts need another review.",
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
              <h2>{t("評論整理方式", "How reviews are compiled")}</h2>
              <p>
                {t("由 ", "")}
                {englishRaceTerm(ratingPolicy.publisher, english)}{" "}
                {t(
                  "按親身參賽紀錄或跑手訪問整理不同體驗，交代觀察依據及適合對象。",
                  " uses first-hand records or runner interviews. Each dimension describes observations, evidence and who the race suited.",
                )}
              </p>
              <p>
                {t(
                  "距離、時限及官方安排繼續在賽事資料列出；賽道挑戰特性獨立描述，賽道難度與參賽體驗分開評估。",
                  "Distances, time limits and official arrangements appear on the race page. Course challenges and difficulty are assessed separately from the race experience.",
                )}
              </p>
            </section>
            <section>
              <h2>{t("評分級別", "Rating scale")}</h2>
              <ul className="ratings-scale">
                {scoreLabels.slice(1).map((label, index) => (
                  <li key={label} data-score={index + 1}>
                    <strong>{index + 1}/5</strong> {englishRaceTerm(label, english)}
                  </li>
                ))}
              </ul>
            </section>
            {ratingDimensions.map((key) => (
              <section key={key}>
                <h2 data-rating-dimension={key}>
                  {englishRaceTerm(ratingPolicy.dimensions[key].title, english)}
                </h2>
                <p>{englishRaceTerm(ratingPolicy.dimensions[key].prompt, english)}</p>
              </section>
            ))}
            <section>
              <h2>{t("閱讀評論時的注意事項", "Reading the reviews")}</h2>
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
                    "補給觀察會註明已知嘅跑手位置，方便理解後段供應嘅資料範圍。",
                    "Aid station comments record the runner’s position when known, so readers can judge what the account covers.",
                  )}
                </li>
                <li>
                  {t(
                    "修訂準則時會記錄版本及修改原因。",
                    "We record the version and reason for changes to our review criteria.",
                  )}
                </li>
              </ul>
            </section>
            <section>
              <h2>{t("由參賽筆記，累積成獨家評論", "From race notes to original reviews")}</h2>
              <p>
                {t(
                  "首輪整理港珠澳半馬及渣打全馬。先記低具體經驗、年份同觀察範圍，再完成編輯審閱及發布。",
                  "The first reviews cover the Hong Kong–Zhuhai–Macao Bridge Half Marathon and Standard Chartered Hong Kong Marathon. We gather specific experiences and record the edition and observation limits before editorial review and publication.",
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
