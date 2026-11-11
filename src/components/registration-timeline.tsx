"use client";

import { useClock } from "@/lib/use-clock";
import { displayDate, formatTimestamp } from "@/lib/races";
import { registrationTimeline } from "@/lib/registration-timeline";
import type { Race } from "@/lib/types";

export function RegistrationTimeline({ race, initialNow }: { race: Race; initialNow: string }) {
  const now = useClock(initialNow);
  const { milestones, next } = registrationTimeline(race, now);
  if (!milestones.length) return null;

  function dateLabel(entry: (typeof milestones)[number]) {
    return entry.timed
      ? `${formatTimestamp(entry.date)} HKT`
      : `${displayDate(entry.date, { year: "numeric" })} · 時間待核實`;
  }

  return (
    <section className="registration-timeline" aria-labelledby="registration-timeline-title">
      <h3 id="registration-timeline-title">報名時間線</h3>
      {next ? (
        <div className="registration-timeline-next">
          <span>下一個已核實日期</span>
          <strong>
            {next.label} · <time dateTime={next.date}>{dateLabel(next)}</time>
          </strong>
          <small>
            {next.channel} · {[...next.groups].join("／")}
          </small>
        </div>
      ) : (
        <p>暫未有下一個已核實日期。</p>
      )}
      <details className="registration-timeline-details">
        <summary>查看全部 {milestones.length} 個日期</summary>
        <ol>
          {milestones.map((entry) => (
            <li key={entry.key} data-next={entry.key === next?.key}>
              <time dateTime={entry.date}>{dateLabel(entry)}</time>
              <strong>
                {entry.label} · {entry.channel}
              </strong>
              <span>{[...entry.groups].join("／")}</span>
              <div className="registration-timeline-sources">
                {[...entry.sources.values()].map((source) => (
                  <a key={source.id} href={source.url} target="_blank" rel="noopener noreferrer">
                    {source.title} ↗
                  </a>
                ))}
              </div>
            </li>
          ))}
        </ol>
      </details>
    </section>
  );
}
