import Link from "next/link";
import { EditorialReviewCard } from "@/components/group-ratings";
import { editorialReviews } from "@/data/editorial-reviews";
import { Breadcrumb } from "@/components/ui";
import { ratingDimensions, ratingPolicy, scoreLabels, reviewTargets } from "@/lib/rating-policy";
import { pageMetadata } from "@/lib/site";
export const metadata = pageMetadata(
  "賽事體驗評級準則",
  "NXTGO 原創賽事評論：賽道體驗、大會執行與補給體驗，以參賽觀察及訪問支持每項評分。",
  "/ratings/",
);
export default function RatingsPage() {
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
        <p>賽道、大會執行同補給，靠具體經驗寫出值得肯定同需要留意嘅地方。</p>
      </div>
      <div className="prose narrow rating-method-page">
        {!!editorialReviews.length && (
          <section id="pilot-reviews">
            <h2>首輪體驗評論</h2>
            <p>
              以下按受訪跑手實際提供的經驗整理，分數由編輯依試行準則判斷。只適用所列年份及組別。
            </p>
            {editorialReviews.map((review) => (
              <div className="group-ratings" key={review.id}>
                <h3>
                  {reviewTargets.find((target) => target.id === review.targetId)?.name} ·{" "}
                  {reviewTargets.find((target) => target.id === review.targetId)?.group}
                </h3>
                <EditorialReviewCard review={review} />
              </div>
            ))}
          </section>
        )}
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
        <Link className="text-link" href="/races/">
          返回賽事搜尋／時間表 →
        </Link>
      </div>
    </main>
  );
}
