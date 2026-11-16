"use client";

import { RaceDataText } from "./race-data-text";
import { language, englishDate, englishTimestamp } from "@/lib/english-races";
import { englishRaceTerm } from "@/lib/race-terms.en";
import { useClock } from "@/lib/use-clock";
import { displayDate, formatTimestamp } from "@/lib/races";
import { registrationTimeline } from "@/lib/registration-timeline";
import type { Race } from "@/lib/types";

export function RegistrationTimeline({
  race,
  initialNow,
  english = false,
}: {
  race: Race;
  initialNow: string;
  english?: boolean;
}) {
  const t = language(english);
  const now = useClock(initialNow);
  const { milestones, next } = registrationTimeline(race, now);
  if (!milestones.length) return null;

  function dateLabel(entry: (typeof milestones)[number]) {
    if (english)
      return entry.timed
        ? englishTimestamp(entry.date)
        : englishDate(entry.date) + " · Time unverified";
    return entry.timed
      ? `${formatTimestamp(entry.date)} HKT`
      : `${displayDate(entry.date, { year: "numeric" })} · 時間待核實`;
  }

  return (
    <section className="registration-timeline" aria-labelledby="registration-timeline-title">
      <h3 id="registration-timeline-title">{t("報名時間線", "Registration timeline")}</h3>
      {next ? (
        <div className="registration-timeline-next">
          <span>{t("下一個已核實日期", "Next verified date")}</span>
          <strong>
            {englishRaceTerm(next.label, english)} ·{" "}
            <time dateTime={next.date}>{dateLabel(next)}</time>
          </strong>
          <small>
            {englishRaceTerm(next.channel, english)} ·{" "}
            {[...next.groups]
              .map((name) => englishRaceTerm(name, english))
              .join(english ? " / " : "／")}
          </small>
        </div>
      ) : (
        <p>{t("暫未有下一個已核實日期。", "No upcoming verified dates.")}</p>
      )}
      <details className="registration-timeline-details">
        <summary>
          {t(`查看全部 ${milestones.length} 個日期`, `See all ${milestones.length} dates`)}
        </summary>
        <ol>
          {milestones.map((entry) => (
            <li key={entry.key} data-next={entry.key === next?.key}>
              <time dateTime={entry.date}>{dateLabel(entry)}</time>
              <strong>
                {englishRaceTerm(entry.label, english)} · {englishRaceTerm(entry.channel, english)}
              </strong>
              <span>
                {[...entry.groups]
                  .map((name) => englishRaceTerm(name, english))
                  .join(english ? " / " : "／")}
              </span>
              <div className="registration-timeline-sources">
                {[...entry.sources.values()].map((source) => (
                  <a key={source.id} href={source.url} target="_blank" rel="noopener noreferrer">
                    <RaceDataText value={source.title} english={english} /> ↗
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
