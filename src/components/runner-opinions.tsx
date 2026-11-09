import { unscopedRunnerOpinionsForRace, type RunnerOpinions } from "@/data/runner-opinions";
import { OpinionTopicFilter } from "./opinion-topic-filter";
import { opinionTopics, topicComments } from "@/lib/opinion-topic-filter";

export function RunnerOpinionSummary({
  record,
  currentYear,
}: {
  record: RunnerOpinions;
  currentYear: number;
}) {
  const comments = topicComments(record);
  return (
    <article className="runner-opinions" aria-label={`${record.editionYear}年外站跑手意見`}>
      <p className="review-context">
        {record.editionYear} 年{record.groupLabel ?? "半馬"} · 外站跑手意見整理 · 不設分數
      </p>
      {record.editionYear < currentYear && (
        <p className="review-edition-note">往屆意見 · 不代表 {currentYear} 年安排或表現</p>
      )}
      <ul className="runner-topic-counts" aria-label="主題留言數">
        {opinionTopics.map((topic) => (
          <li key={topic}>
            {topic}（{comments.filter((entry) => entry.topics.includes(topic)).length}）
          </li>
        ))}
      </ul>
      <dl className="runner-opinion-topics">
        {record.topics.map((topic) => (
          <div key={topic.title}>
            <dt>{topic.title}</dt>
            <dd>{topic.summary}</dd>
          </div>
        ))}
      </dl>
      <details className="runner-opinion-sources">
        <summary>按主題查看留言原文及來源</summary>
        <OpinionTopicFilter record={record} />
      </details>
      <details className="runner-opinion-sources">
        <summary>閱讀完整整理稿 · {record.publicationVersion}</summary>
        {record.intro && <p>{record.intro}</p>}
        {record.reminders && (
          <ul>
            {record.reminders.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        )}
        {record.fullText.split("\n\n").map((paragraph, index) => (
          <p className="runner-opinion-full-text" key={index}>
            {paragraph}
          </p>
        ))}
      </details>
      <details className="runner-opinion-sources">
        <summary>查看原文、來源及觀察範圍</summary>
        <p className="runner-opinion-scope">個別跑手感受；批次及完賽位置多數未明，不代表全體。</p>
        <p>{record.scope}</p>
        <p>
          <a href={record.sourceUrl} target="_blank" rel="noopener noreferrer">
            {record.sourceName} {record.editionYear} 來源總覽 ↗
          </a>
          {" · "}查閱：<time dateTime={record.checkedOn}>{record.checkedOn}</time>
        </p>
        {record.topics.map(
          (topic) =>
            topic.sources.length > 0 && (
              <section key={topic.title} aria-label={`${topic.title}跑手原文及來源`}>
                <h5>{topic.title}</h5>
                <ul>
                  {topic.sources.map((source) => (
                    <li key={source.url}>
                      <a href={source.url} target="_blank" rel="noopener noreferrer">
                        {source.reference} · {source.author} · 原帖 ↗
                      </a>
                      {source.postedOn !== undefined && (
                        <p>出帖日期：{source.postedOn ?? "未顯示（非賽事日期）"}</p>
                      )}
                      <p>
                        {source.excerpt ? "原文節錄" : "原文"}：「{source.quote}」
                      </p>
                      {source.scope && (
                        <p className="runner-opinion-source-scope">{source.scope}</p>
                      )}
                      {source.confirmationUrl && (
                        <p>
                          <a
                            href={source.confirmationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            S04a · 同日半馬組別確認 ↗
                          </a>
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ),
        )}
      </details>
    </article>
  );
}

export function UnscopedRunnerOpinions({ race }: { race: import("@/lib/types").Race }) {
  const records = unscopedRunnerOpinionsForRace(race);
  if (!records.length) return null;
  return (
    <section>
      <details className="runner-opinion-sources">
        <summary>2025 跑手意見 · 組別未明（暫不納入組別評價）</summary>
        {records.map((record) => (
          <RunnerOpinionSummary
            key={record.targetId}
            record={record}
            currentYear={Number(race.date.slice(0, 4))}
          />
        ))}
      </details>
    </section>
  );
}
