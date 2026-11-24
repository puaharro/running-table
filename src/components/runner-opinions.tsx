import { RaceDataText } from "./race-data-text";
import { englishRaceTerm } from "@/lib/race-terms.en";
import { language } from "@/lib/english-races";
import { unscopedRunnerOpinionsForRace, type RunnerOpinions } from "@/data/runner-opinions";
import { OpinionTopicFilter } from "./opinion-topic-filter";
import { opinionTopics, topicComments } from "@/lib/opinion-topic-filter";

export function RunnerOpinionSummary({
  record,
  currentYear,
  english = false,
}: {
  record: RunnerOpinions;
  currentYear: number;
  english?: boolean;
}) {
  const t = language(english);
  const comments = topicComments(record);
  return (
    <article
      className="runner-opinions"
      aria-label={t(
        `${record.editionYear}年外站跑手意見`,
        `${record.editionYear} external runner comments`,
      )}
    >
      <p className="review-context">
        {t(
          `${record.editionYear} 年${record.groupLabel ?? "半馬"} · 外站跑手意見整理`,
          `${record.editionYear} · ${englishRaceTerm(record.groupLabel ?? "半馬", true)} · External runner comments`,
        )}
      </p>
      {record.editionYear < currentYear && (
        <p className="review-edition-note">
          {t(
            `往屆意見 · 不代表 ${currentYear} 年安排或表現`,
            `Past edition comments · Arrangements and experience may differ in ${currentYear}`,
          )}
        </p>
      )}
      <ul className="runner-topic-counts" aria-label={t("主題留言數", "Comment counts by topic")}>
        {opinionTopics.map((topic) => (
          <li key={topic}>
            {englishRaceTerm(topic, english)}
            {t("（", " (")}
            {comments.filter((entry) => entry.topics.includes(topic)).length}
            {t("）", ")")}
          </li>
        ))}
      </ul>
      <dl className="runner-opinion-topics">
        {record.topics.map((topic) => (
          <div key={topic.title}>
            <dt>
              <RaceDataText value={topic.title} english={english} />
            </dt>
            <dd>
              <RaceDataText original value={topic.summary} english={english} />
            </dd>
          </div>
        ))}
      </dl>
      <details className="runner-opinion-sources">
        <summary>
          {t("按主題查看留言原文及來源", "Browse original comments and sources by topic")}
        </summary>
        <OpinionTopicFilter english={english} record={record} />
      </details>
      <details className="runner-opinion-sources">
        <summary>
          {t("閱讀完整整理稿 ·", "Read the full compilation in Chinese ·")}{" "}
          {record.publicationVersion}
        </summary>
        {record.intro && (
          <p>
            <RaceDataText original value={record.intro} english={english} />
          </p>
        )}
        {record.reminders && (
          <ul>
            {record.reminders.map((note) => (
              <li key={note}>
                <RaceDataText original value={note} english={english} />
              </li>
            ))}
          </ul>
        )}
        {record.fullText.split("\n\n").map((paragraph, index) => (
          <p className="runner-opinion-full-text" key={index}>
            <RaceDataText original value={paragraph} english={english} />
          </p>
        ))}
      </details>
      <details className="runner-opinion-sources">
        <summary>
          {t("查看原文、來源及觀察範圍", "Original wording, sources and observation scope")}
        </summary>
        <p className="runner-opinion-scope">
          {t(
            "個別跑手感受；批次及完賽位置多數未明，不代表全體。",
            "These are individual runners’ experiences. Start waves and finish positions are mostly unknown.",
          )}
        </p>
        <p>
          <RaceDataText original value={record.scope} english={english} />
        </p>
        <p>
          <a href={record.sourceUrl} target="_blank" rel="noopener noreferrer">
            {record.sourceName} {record.editionYear} {t("來源總覽 ↗", "Source overview ↗")}
          </a>
          {" · "}
          {t("查閱：", "Checked: ")}
          <time dateTime={record.checkedOn}>{record.checkedOn}</time>
        </p>
        {record.topics.map(
          (topic) =>
            topic.sources.length > 0 && (
              <section
                key={topic.title}
                aria-label={t(
                  `${topic.title}跑手原文及來源`,
                  `${englishRaceTerm(topic.title, true)} comments and sources`,
                )}
              >
                <h5>
                  <RaceDataText value={topic.title} english={english} />
                </h5>
                <ul>
                  {topic.sources.map((source) => (
                    <li key={source.url}>
                      <a href={source.url} target="_blank" rel="noopener noreferrer">
                        {source.reference} · {source.author} {t("· 原帖 ↗", "· Original post ↗")}
                      </a>
                      {source.postedOn !== undefined && (
                        <p>
                          {t("出帖日期：", "Posted: ")}
                          {source.postedOn ??
                            t("未顯示（非賽事日期）", "Not shown (separate from race date)")}
                        </p>
                      )}
                      <p>
                        {source.excerpt
                          ? t("原文節錄", "Original excerpt")
                          : t("原文", "Original wording")}
                        ：「
                        <RaceDataText original value={source.quote} english={english} />」
                      </p>
                      {source.scope && (
                        <p className="runner-opinion-source-scope">
                          <RaceDataText original value={source.scope} english={english} />
                        </p>
                      )}
                      {source.confirmationUrl && (
                        <p>
                          <a
                            href={source.confirmationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {t(
                              "S04a · 同日半馬組別確認 ↗",
                              "S04a · Half marathon category confirmation ↗",
                            )}
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

export function UnscopedRunnerOpinions({
  race,
  english = false,
}: {
  race: import("@/lib/types").Race;
  english?: boolean;
}) {
  const t = language(english);
  const records = unscopedRunnerOpinionsForRace(race);
  if (!records.length) return null;
  return (
    <section>
      <details className="runner-opinion-sources">
        <summary>
          {t(
            "2025 跑手意見 · 組別未明（暫不納入組別評價）",
            "2025 runner accounts in Chinese · Category unconfirmed",
          )}
        </summary>
        {records.map((record) => (
          <RunnerOpinionSummary
            english={english}
            key={record.targetId}
            record={record}
            currentYear={Number(race.date.slice(0, 4))}
          />
        ))}
      </details>
    </section>
  );
}
