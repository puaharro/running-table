"use client";

import { useId, useState } from "react";
import type { RunnerOpinions } from "@/data/runner-opinions";
import { opinionTopics, topicComments, type OpinionTopic } from "@/lib/opinion-topic-filter";
import { ComparisonTopicNote } from "./comparison-topic-note";

// Records are scoped by runnerOpinionsForGroup on the server before reaching this component.
export function comparisonComments(records: RunnerOpinions[], year: number, topic: OpinionTopic) {
  const entries = records.filter((record) => record.editionYear === year).flatMap(topicComments);
  const unique = new Map(
    entries
      .filter((entry) => entry.topics.includes(topic))
      .map((entry) => [
        JSON.stringify([entry.source.url, entry.source.author, entry.source.quote]),
        entry,
      ]),
  );
  return {
    hasEdition: records.some((record) => record.editionYear === year),
    entries: [...unique.values()],
  };
}

export function OpinionYearComparison({
  records,
  currentYear,
  groupName,
  scope,
}: {
  records: RunnerOpinions[];
  currentYear: number;
  groupName: string;
  scope?: string;
}) {
  const years = [...new Set([currentYear, ...records.map((record) => record.editionYear)])].sort(
    (a, b) => a - b,
  );
  const [left, setLeft] = useState(years[0]);
  const [right, setRight] = useState(years.at(-1)!);
  const id = useId();
  const [dirtyNotes, setDirtyNotes] = useState<Record<string, boolean>>({});
  const [warning, setWarning] = useState("");
  function changeYear(side: "left" | "right", year: number) {
    if (Object.values(dirtyNotes).some(Boolean)) {
      setWarning("有未儲存備註，請先儲存或還原已儲存版本，再切換年份。");
      return;
    }
    setWarning("");
    if (side === "left") setLeft(year);
    else setRight(year);
  }
  if (years.length < 2)
    return <p>跨年份主題比較 · {groupName}：目前只有一個年份可選，待收錄其他年份資料。</p>;
  return (
    <section className="opinion-year-comparison" aria-labelledby={id}>
      <h5 id={id}>跨年份主題留言比較 · {groupName}</h5>
      <div className="opinion-year-selectors">
        <label>
          左側年份{" "}
          <select value={left} onChange={(event) => changeYear("left", Number(event.target.value))}>
            {years.map((year) => (
              <option key={year} value={year} disabled={year === right}>
                {year} 年
              </option>
            ))}
          </select>
        </label>
        <label>
          右側年份{" "}
          <select
            value={right}
            onChange={(event) => changeYear("right", Number(event.target.value))}
          >
            {years.map((year) => (
              <option key={year} value={year} disabled={year === left}>
                {year} 年
              </option>
            ))}
          </select>
        </label>
      </div>
      <p role="status">{warning}</p>
      <p>
        只比較此賽事、此組別已發布留言；年份為賽事屆次，不是出帖年份。數量反映本站收錄量，不代表體驗改善或變差，不影響編輯總評分。同一留言可屬多個主題，各主題數不可相加。
      </p>
      {opinionTopics.map((topic) => (
        <section
          className="opinion-comparison-topic"
          key={topic}
          aria-label={`${groupName} ${topic} 跨年份比較`}
        >
          <h6>{topic}</h6>
          <div className="opinion-comparison-columns">
            {[left, right].map((year) => {
              const { hasEdition, entries } = comparisonComments(records, year, topic);
              return (
                <div key={year}>
                  <strong>
                    {year} 年 · {groupName}
                  </strong>
                  <p>
                    {!hasEdition
                      ? "此年份／組別暫未收錄留言，無法比較。"
                      : `${entries.length} 則相關留言${entries.length ? "" : "；此主題未有相關原文，不代表沒有問題或體驗"}。`}
                  </p>
                  {entries.length > 0 && (
                    <details>
                      <summary>查看 {entries.length} 則原文及來源</summary>
                      <ul className="opinion-filter-results">
                        {entries.map(({ source }) => (
                          <li key={JSON.stringify([source.url, source.author, source.quote])}>
                            <a href={source.url} target="_blank" rel="noopener noreferrer">
                              {source.reference} · {source.author} · 原帖 ↗
                            </a>
                            <p>
                              {source.excerpt ? "原文節錄" : "原文"}：「
                              <span style={{ whiteSpace: "pre-wrap" }}>{source.quote}</span>」
                            </p>
                            <small>出帖日期：{source.postedOn ?? "未顯示（非賽事日期）"}</small>
                            {source.scope && <p>{source.scope}</p>}
                            {source.confirmationUrl && (
                              <p>
                                <a
                                  href={source.confirmationUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  同日組別確認 ↗
                                </a>
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
          <ComparisonTopicNote
            key={JSON.stringify([scope ?? records[0]?.targetId, left, right, topic])}
            context={JSON.stringify([scope ?? records[0]?.targetId, left, right, topic])}
            basis={JSON.stringify(
              {
                groupName,
                topic,
                left: { year: left, ...comparisonComments(records, left, topic) },
                right: { year: right, ...comparisonComments(records, right, topic) },
              },
              null,
              2,
            )}
            onDirty={(dirty) =>
              setDirtyNotes((previous) =>
                previous[topic] === dirty ? previous : { ...previous, [topic]: dirty },
              )
            }
          />
        </section>
      ))}
      <details>
        <summary>比較範圍及來源限制</summary>
        <p>
          賽道及賽事組織沿用已發布分類；交通、寄存、水站按原文字詞篩選。留言按來源連結、作者及原文去重；留言數不是獨立跑手人數或評分人數。
        </p>
        {records.map((record) => (
          <p key={`${record.targetId}-${record.editionYear}`}>
            {record.editionYear} 年：{record.scope} · 來源查閱日期：{record.checkedOn}
          </p>
        ))}
      </details>
    </section>
  );
}
