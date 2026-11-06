import type { RunnerOpinions } from "@/data/runner-opinions";

export function RunnerOpinionSummary({
  record,
  currentYear,
}: {
  record: RunnerOpinions;
  currentYear: number;
}) {
  return (
    <article className="runner-opinions" aria-label={`${record.editionYear}年外站跑手意見`}>
      <p className="review-context">{record.editionYear} 年半馬 · 外站跑手意見整理 · 不設分數</p>
      {record.editionYear < currentYear && (
        <p className="review-edition-note">往屆意見 · 不代表 {currentYear} 年安排或表現</p>
      )}
      <dl className="runner-opinion-topics">
        {record.topics.map((topic) => (
          <div key={topic.title}>
            <dt>{topic.title}</dt>
            <dd>{topic.summary}</dd>
          </div>
        ))}
      </dl>
      <p className="runner-opinion-scope">個別跑手感受；批次及完賽位置多數未明，不代表全體。</p>
      <details className="runner-opinion-sources">
        <summary>查看原文、來源及觀察範圍</summary>
        <p>{record.scope}</p>
        <p>
          <a href={record.sourceUrl} target="_blank" rel="noopener noreferrer">
            {record.sourceName} 2025 賽事專頁 ↗
          </a>
          {" · "}查閱：<time dateTime={record.checkedOn}>{record.checkedOn}</time>
        </p>
        {record.topics.map((topic) => (
          <section key={topic.title} aria-label={`${topic.title}跑手原文及來源`}>
            <h5>{topic.title}</h5>
            <ul>
              {topic.sources.map((source) => (
                <li key={source.url}>
                  <a href={source.url} target="_blank" rel="noopener noreferrer">
                    {source.author} · 原帖 ↗
                  </a>
                  <p>
                    {source.excerpt ? "原文節錄" : "原文"}：「{source.quote}」
                  </p>
                  {source.scope && <p className="runner-opinion-source-scope">{source.scope}</p>}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </details>
    </article>
  );
}
