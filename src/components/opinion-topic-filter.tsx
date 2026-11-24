"use client";

import { RaceDataText } from "./race-data-text";
import { englishRaceTerm } from "@/lib/race-terms.en";
import { language } from "@/lib/english-races";
import { useId, useState } from "react";
import type { RunnerOpinions } from "@/data/runner-opinions";
import { opinionTopics, topicComments, type OpinionTopic } from "@/lib/opinion-topic-filter";

export function OpinionTopicFilter({
  record,
  english = false,
}: {
  record: RunnerOpinions;
  english?: boolean;
}) {
  const t = language(english);
  const [selected, setSelected] = useState<OpinionTopic | "全部" | null>(null);
  const id = useId();
  const comments = topicComments(record);
  const visible =
    selected === "全部"
      ? comments
      : comments.filter((entry) => selected && entry.topics.includes(selected));
  return (
    <section
      className="opinion-topic-filter"
      aria-label={t(
        `${record.editionYear} 年 ${record.groupLabel ?? "半馬"} 留言主題篩選`,
        `${record.editionYear} comment topic filter`,
      )}
    >
      <h5>
        {t(
          `留言主題 · ${record.editionYear} 年 · ${record.groupLabel ?? "半馬"}`,
          `Comment topics · ${record.editionYear} · ${englishRaceTerm(record.groupLabel ?? "半馬", true)}`,
        )}
      </h5>
      <div
        className="opinion-topic-buttons"
        role="group"
        aria-label={t("選擇留言主題", "Choose a comment topic")}
      >
        {(["全部", ...opinionTopics] as const).map((topic) => {
          const count =
            topic === "全部"
              ? comments.length
              : comments.filter((entry) => entry.topics.includes(topic)).length;
          return (
            <button
              key={topic}
              type="button"
              aria-pressed={selected === topic}
              aria-controls={id}
              onClick={() => setSelected(topic)}
            >
              {englishRaceTerm(topic, english)}
              {t("（", " (")}
              {count}
              {t("）", ")")}
            </button>
          );
        })}
      </div>
      <p className="opinion-topic-help">
        {t(
          "只計本年份／組別已發布來源，按連結、作者及原文去重。同一留言可屬多個主題，各主題數不可相加。",
          "Counts cover published sources for this edition and category, with duplicates removed by link, author and text. A comment may appear under several topics.",
        )}
      </p>
      <div id={id}>
        <p role="status" aria-live="polite">
          {selected === null
            ? t("選擇主題查看原文及來源。", "Choose a topic to see original comments and sources.")
            : english
              ? `${englishRaceTerm(selected, true)}: ${visible.length} comments`
              : `${selected}：${visible.length} 則留言${visible.length ? "" : "，暫未收錄相關原文"}。`}
        </p>
        {selected !== null && (
          <ul className="opinion-filter-results">
            {visible.map(({ source, topics }) => (
              <li key={JSON.stringify([source.url, source.author, source.quote])}>
                <p>
                  <a href={source.url} target="_blank" rel="noopener noreferrer">
                    {source.reference} · {source.author} {t("· 原帖 ↗", "· Original post ↗")}
                  </a>
                </p>
                <p>
                  {source.excerpt
                    ? t("原文節錄", "Original excerpt")
                    : t("原文", "Original wording")}
                  ：「
                  <span style={{ whiteSpace: "pre-wrap" }}>
                    <RaceDataText original value={source.quote} english={english} />
                  </span>
                  」
                </p>
                <small>
                  {t("主題：", "Topics: ")}
                  {topics
                    .map((topic) => englishRaceTerm(topic, english))
                    .join(english ? ", " : "、") || "其他／未分類"}{" "}
                  {t("· 出帖日期：", "· Posted: ")}
                  {source.postedOn ??
                    t("未顯示（非賽事日期）", "Not shown (separate from race date)")}
                </small>
                {source.scope && (
                  <p>
                    <RaceDataText original value={source.scope} english={english} />
                  </p>
                )}
                {source.confirmationUrl && (
                  <p>
                    <a href={source.confirmationUrl} target="_blank" rel="noopener noreferrer">
                      {t("同日組別確認 ↗", "Category confirmation ↗")}
                    </a>
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      <details>
        <summary>{t("主題及數量說明", "How topics and counts work")}</summary>
        <p>
          {t(
            "賽道及賽事組織沿用已發布整理分類；交通、寄存、水站按原文字詞篩選，不判斷正負面。未命中字詞不代表沒有相關體驗；可用「全部」查看其他留言。來源日期、年份及組別限制沿用原有紀錄。",
            "Course and organisation use the published categories. Transport, bag drop and water stations are matched using words in the original comments. Matching does not assess sentiment. Choose All to see other entries. Source dates, editions and category restrictions are retained.",
          )}
        </p>
      </details>
    </section>
  );
}
