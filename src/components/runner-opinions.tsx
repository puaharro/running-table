import { RaceDataText } from "./race-data-text";
import { englishRaceTerm } from "@/lib/race-terms.en";
import { language } from "@/lib/english-races";
import { unscopedRunnerOpinionsForRace, type RunnerOpinions } from "@/data/runner-opinions";
import { OpinionTopicFilter } from "./opinion-topic-filter";
import { opinionTopics, topicComments } from "@/lib/opinion-topic-filter";
import { runnerAccountTopics } from "@/lib/cms-runtime-schema.mjs";
import {
  RunnerAccountEdition,
  RunnerAccountHelp,
  RunnerAccountTopics,
} from "./runner-account-topics";

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
      <RunnerAccountEdition
        english={english}
        year={record.editionYear}
        currentYear={currentYear}
        group={record.groupLabel}
        context={t("外站跑手意見整理", "External runner comments")}
      />
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
      <RunnerAccountHelp english={english} />
      <div className="runner-copy-body experience-topics">
        <RunnerAccountTopics
          english={english}
          sections={runnerAccountTopics.flatMap((title) => {
            const topic = record.topics.find((item) => item.title === title);
            return topic
              ? [
                  {
                    topic: title,
                    body: topic.summary,
                    limitations: record.scope,
                    urls: topic.sources.map((source) => source.url),
                    sourceLabels: topic.sources.map((source) => source.reference),
                  },
                ]
              : [];
          })}
        />
      </div>
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
