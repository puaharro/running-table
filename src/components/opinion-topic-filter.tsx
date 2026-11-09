"use client";

import { useId, useState } from "react";
import type { RunnerOpinions } from "@/data/runner-opinions";
import { opinionTopics, topicComments, type OpinionTopic } from "@/lib/opinion-topic-filter";

export function OpinionTopicFilter({ record }: { record: RunnerOpinions }) {
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
      aria-label={`${record.editionYear} 年 ${record.groupLabel ?? "半馬"} 留言主題篩選`}
    >
      <h5>
        留言主題 · {record.editionYear} 年 · {record.groupLabel ?? "半馬"}
      </h5>
      <div className="opinion-topic-buttons" role="group" aria-label="選擇留言主題">
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
              {topic}（{count}）
            </button>
          );
        })}
      </div>
      <p className="opinion-topic-help">
        只計本年份／組別已發布來源，按連結、作者及原文去重。同一留言可屬多個主題，各主題數不可相加；不計入編輯總評分或評分人數。
      </p>
      <div id={id}>
        <p role="status" aria-live="polite">
          {selected === null
            ? "選擇主題查看原文及來源。"
            : `${selected}：${visible.length} 則留言${visible.length ? "" : "，暫未收錄相關原文"}。`}
        </p>
        {selected !== null && (
          <ul className="opinion-filter-results">
            {visible.map(({ source, topics }) => (
              <li key={JSON.stringify([source.url, source.author, source.quote])}>
                <p>
                  <a href={source.url} target="_blank" rel="noopener noreferrer">
                    {source.reference} · {source.author} · 原帖 ↗
                  </a>
                </p>
                <p>
                  {source.excerpt ? "原文節錄" : "原文"}：「
                  <span style={{ whiteSpace: "pre-wrap" }}>{source.quote}</span>」
                </p>
                <small>
                  主題：{topics.join("、") || "其他／未分類"} · 出帖日期：
                  {source.postedOn ?? "未顯示（非賽事日期）"}
                </small>
                {source.scope && <p>{source.scope}</p>}
                {source.confirmationUrl && (
                  <p>
                    <a href={source.confirmationUrl} target="_blank" rel="noopener noreferrer">
                      同日組別確認 ↗
                    </a>
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      <details>
        <summary>主題及數量說明</summary>
        <p>
          賽道及賽事組織沿用已發布整理分類；交通、寄存、水站按原文字詞篩選，不判斷正負面。未命中字詞不代表沒有相關體驗；可用「全部」查看其他留言。來源日期、年份及組別限制沿用原有紀錄。
        </p>
      </details>
    </section>
  );
}
