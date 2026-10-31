import Link from "next/link";
import { races } from "@/data/races";
import { editorialReviews } from "@/data/editorial-reviews";
import notices from "@/data/editorial-notices.json";
import { Breadcrumb } from "@/components/ui";
import { ratingDimensions, ratingPolicy, scoreLabels, reviewTargets } from "@/lib/rating-policy";
import { pageMetadata, raceHref } from "@/lib/site";
export const metadata = pageMetadata(
  "評論索引及評分準則",
  "NXTGO 原創賽事評論：賽道體驗、大會執行與補給體驗，以參賽觀察及訪問支持每項評分。",
  "/ratings/",
);
export default function RatingsPage() {
  const paused = notices.filter(
    (n) => n.status === "待確認" && !editorialReviews.some((r) => r.id === n.reviewId),
  );
  return (
    <main id="main" className="content-main shell">
      <Breadcrumb items={[{ label: "賽事體驗評級" }]} />
      <div className="page-heading">
        <div className="eyebrow">NXTGO RACE EXPERIENCE</div>
        <h1>
          跑過之後，
          <br />
          先知道嘅事。
        </h1>
        <p>從索引前往賽事詳情頁，閱讀指定年份及組別嘅參賽體驗。</p>
      </div>
      <div className="prose narrow rating-method-page">
        <section aria-label="已發布評論索引">
          <h2>評論索引</h2>
          <p>評論重點及完整依據放在賽事詳情頁。往屆評論不代表當屆安排或表現。</p>
          {!editorialReviews.length && <p>尚未有已發布編輯點評。</p>}
          <ul className="review-index">
            {editorialReviews.map((review) => {
              const target = reviewTargets.find((t) => t.id === review.targetId);
              const race = races.find((r) => r.id === target?.raceId);
              if (!target || !race) return null;
              return (
                <li key={review.id}>
                  <Link href={raceHref(race) + "#review-" + review.id}>
                    {target.name} · {review.editionYear} 年 · {target.group}評論 →
                  </Link>
                  <small>於 {race.date.slice(0, 4)} 年賽事頁閱讀 · 編輯點評</small>
                </li>
              );
            })}
          </ul>
        </section>
        <details id="method" className="rating-method-details">
          <summary>了解評分準則及發布流程</summary>
          <section className="editorial-notice">
            <h2>先確認，再發布</h2>
            <p>每篇稿件及分數須經營運者確認，改稿後重新審閱。待確認內容不會當成正式分數。</p>
            {paused.map((n) => (
              <p key={n.id}>
                {reviewTargets.find((t) => t.id === n.targetId)?.name} {n.editionYear}：{n.summary}
              </p>
            ))}
            <Link className="text-link" href="/ratings/process/">
              審閱、更正及大會回應流程 →
            </Link>
            <p>
              <Link className="text-link" href="/ratings/feedback/">
                提出更正／投訴／大會回應 →
              </Link>
            </p>
          </section>
          <section>
            <h2>三項獨立評分，每項 1–5 分</h2>
            <p>
              由 {ratingPolicy.publisher}{" "}
              制定試行準則，評審按親身參賽紀錄或跑手訪問作編輯判斷。每項有短評、觀察依據及適合對象；資料不足保留未評，不當零分，不設總分。
            </p>
            <p>距離、時限及官方安排繼續在賽事資料列出；賽道挑戰特性獨立描述，難跑唔等於體驗差。</p>
          </section>
          {ratingDimensions.map((key) => (
            <section key={key}>
              <h2>{ratingPolicy.dimensions[key].title}</h2>
              <p>{ratingPolicy.dimensions[key].prompt}</p>
              <ol className="rating-anchors">
                {ratingPolicy.dimensions[key].anchors.map((anchor, index) => (
                  <li key={anchor}>
                    <strong>{scoreLabels[index + 1]}</strong>：{anchor}
                  </li>
                ))}
              </ol>
            </section>
          ))}
          <section>
            <h2>讀分數時，一齊睇呢幾點</h2>
            <ul>
              <li>評論按年份及組別分開；往屆體驗不代表下一屆表現，全馬評論亦不套用半馬。</li>
              <li>顯示評審署名、前／中／後段位置、參賽或利益關係、更新日期及觀察限制。</li>
              <li>
                單一評審只代表其觀察，唔當成所有跑手共識；官方安排、GPX
                或影片可補充背景，唔會單憑宣傳內容評服務表現。
              </li>
              <li>5 分需要具體紀錄支持，補給尤其要留意後段供應；未觀察到唔等於冇問題。</li>
              <li>未來修訂準則會保留修改原因及版本；這是編輯試行評級，尚未經大規模校準。</li>
            </ul>
          </section>
          <section>
            <h2>由參賽筆記，累積成獨家評論</h2>
            <p>
              首輪整理港珠澳半馬及渣打全馬。先記低具體經驗、年份同觀察範圍，再完成編輯審閱及發布；未有材料的年份或項目保留未評。
            </p>
            <Link className="text-link" href="/ratings/notebook/">
              開啟參賽筆記 →
            </Link>
          </section>
          <p>
            <small>準則版本：{ratingPolicy.version}</small>
          </p>
        </details>
        <Link className="text-link" href="/races/">
          返回賽事搜尋／時間表 →
        </Link>
      </div>
    </main>
  );
}
