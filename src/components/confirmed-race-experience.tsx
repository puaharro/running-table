import type { ConfirmedRaceExperience } from "@/lib/confirmed-race-experience";
import { ratingDimensions, ratingPolicy } from "@/lib/rating-policy";

export function RaceConfirmedExperience({
  experience: e,
  currentYear,
  reviewAnchor,
}: {
  experience: ConfirmedRaceExperience;
  currentYear: string;
  reviewAnchor?: string;
}) {
  const urls = [...new Set(e.sections.flatMap((s) => s.urls))];
  return (
    <section
      id="race-confirmed-experience"
      className="race-runner-copy experience-compact"
      tabIndex={-1}
    >
      {reviewAnchor && <span id={reviewAnchor} aria-hidden="true" />}
      <h2>{e.title}</h2>
      <p className="review-edition-note">
        {e.year} 年 · {e.group} · 往屆體驗，不代表 {currentYear} 年安排或表現。
      </p>
      <dl className="rating-grid quick-scores experience-scores" aria-label="三項獨立評分">
        {ratingDimensions.map((key) => (
          <div key={key}>
            <dt>{ratingPolicy.dimensions[key].title}</dt>
            <dd>
              <strong>
                {e.assessments[key].score === null ? "未評" : `${e.assessments[key].score} / 5`}
              </strong>
            </dd>
          </div>
        ))}
      </dl>
      <details className="experience-rating-details">
        <summary>查看完整評語及評分依據</summary>
        <div className="runner-copy-body">
          <p>按已確認材料作編輯判斷；三項分別評估，不設總分。個人自述不代表全體跑手。</p>
          {ratingDimensions.map((key) => {
            const a = e.assessments[key];
            return (
              <section key={key}>
                <h3>{ratingPolicy.dimensions[key].title} · 完整評語</h3>
                <p>{a.comment}</p>
                {!!a.positives.length && <p>優點：{a.positives.join("；")}</p>}
                {!!a.concerns.length && <p>關注：{a.concerns.join("；")}</p>}
                <p>適用範圍：{a.suitedFor}</p>
                <p>依據及限制：{a.basis}</p>
              </section>
            );
          })}
          <p>準則版本：{e.ruleVersion}。交通、寄存不另設分數。</p>
        </div>
      </details>
      <h3 className="experience-topics-heading">跑手分享</h3>
      <p className="experience-help">點開主題查看全文、來源及觀察限制。</p>
      <div className="runner-copy-body experience-topics">
        {e.sections.map((s) => (
          <details key={s.topic} className="experience-topic">
            <summary>
              <strong>{s.topic}</strong>
              <span className="experience-topic-excerpt">
                {s.body.match(/^.*?[。！？]/)?.[0] ?? s.body}
              </span>
              {s.body.includes("未知") && !s.body.startsWith("未知") && <small>部分未知</small>}
            </summary>
            <div className="experience-topic-content">
              <p>{s.body}</p>
              <p>
                <strong>觀察限制：</strong>
                {s.limitations}
              </p>
              <p>
                {s.urls.length
                  ? s.urls.map((url) => (
                      <span key={url}>
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          來源{urls.indexOf(url) + 1} ↗
                        </a>{" "}
                      </span>
                    ))
                  : "來源：未知／原始公開連結未提供"}
              </p>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
