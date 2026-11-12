import type { LocalRatingAssessment } from "@/lib/local-rating-preview";
import { ratingDimensions, ratingPolicy } from "@/lib/rating-policy";

export function RaceRatingAssessmentPreview({ draft }: { draft: LocalRatingAssessment }) {
  return (
    <section
      id="rating-assessment-preview"
      className="race-runner-copy"
      aria-labelledby="rating-assessment-heading"
    >
      <p className="runner-copy-preview-note">
        只供本機覆核 · 評估稿第 {draft.revision} 版 · 未確認、未發布
      </p>
      <h2 id="rating-assessment-heading">按現有準則評估</h2>
      <div className="runner-copy-body">
        <p>{draft.scope}</p>
        <p>
          沿用三項 1–5 分準則；資料不足保留未評，不當零分，不設總分。下方跑手分享仍保留第 2
          版正文，當中的「無評分」指該分享稿。
        </p>
        {ratingDimensions.map((key) => {
          const item = draft.dimensions[key];
          return (
            <div key={key}>
              <h3>{ratingPolicy.dimensions[key].title}：未評（資料不足）</h3>
              <p>{item.reason}</p>
              <p>
                {item.sources.length
                  ? `依據：下方分享稿來源 ${item.sources.join("、")}。`
                  : "來源：未知／未有足夠材料。"}
              </p>
            </div>
          );
        })}
        <p>準則版本：{draft.ruleVersion}。交通及寄存保留在五項分享內；既有準則不為兩者另設分數。</p>
      </div>
    </section>
  );
}
