"use client";

import Link from "next/link";
import { Icon } from "./ui";
import { StatusBadge } from "./status-badge";
import { useClock } from "@/lib/use-clock";
import { displayDate, distanceLabel, hongKongToday, statusSummary } from "@/lib/races";
import { raceHref } from "@/lib/site";
import type { Race } from "@/lib/types";

const featuredIds = [
  "hzmb-half-marathon-2026",
  "unicef-powerun-2027",
  "standard-chartered-hk-marathon-2027",
];
const featuredArtwork: Record<string, { headline: string; caption: string }> = {
  "hzmb-half-marathon-2026": { headline: "21.1", caption: "跨越大橋" },
  "unicef-powerun-2027": { headline: "RUN FOR\nGOOD.", caption: "為善起跑" },
  "standard-chartered-hk-marathon-2027": { headline: "42.2", caption: "城市挑戰" },
};
const distances = (race: Race) => [
  ...new Set(race.groups.map((group) => distanceLabel(group.distanceKm))),
];

export function HomeHighlights({ races, initialNow }: { races: Race[]; initialNow: string }) {
  const now = useClock(initialNow);
  const today = hongKongToday(new Date(now));
  const upcoming = races
    .filter((race) => race.status === "scheduled" && race.endDate >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  const featured = [
    ...featuredIds.flatMap((id) => upcoming.filter((race) => race.id === id)),
    ...upcoming.filter((race) => !featuredIds.includes(race.id)),
  ].slice(0, 3);
  const latestVerified = races
    .flatMap((race) => (race.verifiedAt ? [race.verifiedAt.slice(0, 10)] : []))
    .sort()
    .at(-1);

  return (
    <>
      <section className="shell home-search-strip" aria-label="搜尋賽事入口">
        <form action="/races/" role="search" aria-label="搜尋香港路跑賽事">
          <label htmlFor="home-query" className="home-search-label">
            已有目標賽事？
          </label>
          <div className="home-search">
            <Icon name="search" size={21} />
            <input
              id="home-query"
              name="q"
              type="search"
              placeholder="賽事名稱、地點或主辦方"
              maxLength={200}
              enterKeyHint="search"
            />
            <button type="submit">
              搜尋 <Icon name="arrow" size={18} />
            </button>
          </div>
        </form>
        <Link href="/races/" className="home-search-full">
          按日期、地區、距離搵賽事 <Icon name="arrow" size={18} />
        </Link>
      </section>
      <section className="shell home-calendar-section" aria-labelledby="home-calendar-heading">
        <div className="home-calendar-section-head">
          <div>
            <h2 id="home-calendar-heading">近期路跑時間表</h2>
          </div>
          <Link href="/races/">
            全部賽期 <Icon name="arrow" size={17} />
          </Link>
        </div>
        <div className="home-calendar-layout">
          <div className="home-agenda-sheet">
            <div className="home-agenda-caption">
              <span>已收錄賽事 · 按起跑日期排列</span>
              <span>香港</span>
            </div>
            <ol className="home-agenda">
              {upcoming.slice(0, 3).map((race) => (
                <li key={race.id}>
                  <Link href={raceHref(race)}>
                    <time dateTime={race.date}>
                      <strong>{race.date.slice(8)}</strong>
                      <span>
                        <span>{Number(race.date.slice(5, 7))}月</span>
                        <span className="home-agenda-date-separator"> · </span>
                        <span>{race.date.slice(0, 4)}</span>
                      </span>
                    </time>
                    <div>
                      <h3>{race.name}</h3>
                      <p>{race.district === "按組別起點" ? "香港 · 按組別起點" : race.district}</p>
                      <span>{distances(race).join(" · ")}</span>
                    </div>
                    <span className="home-agenda-action">
                      <span>詳細資料</span>
                      <Icon name="arrow" size={18} />
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
            {!upcoming.length && (
              <p className="home-calendar-empty">新一季賽事整理中。可以先到時間表查看歷屆賽事。</p>
            )}
            <Link className="home-agenda-more" href="/races/">
              進入賽事搜尋／時間表 <Icon name="arrow" size={17} />
            </Link>
          </div>
          <aside className="home-calendar-focus" aria-labelledby="home-focus-heading">
            <h2 id="home-focus-heading">
              一場比賽，
              <br />
              睇清楚再決定。
            </h2>
            <p>日期同距離係開始。報名資格、交通安排同跑手體驗，一齊了解先揀得啱。</p>
            <ul>
              <li>
                <Icon name="check" size={17} /> 當屆官方資料逐項整理
              </li>
              <li>
                <Icon name="check" size={17} /> 往屆評論列明年份及組別
              </li>
              <li>
                <Icon name="check" size={17} /> 未能確認嘅資料保留待核實
              </li>
            </ul>
            <Link href="/ratings/">
              了解體驗評論與評分 <Icon name="arrow" size={17} />
            </Link>
          </aside>
        </div>
      </section>
      <section className="shell home-block" aria-labelledby="featured-heading">
        <div className="home-section-head">
          <div>
            <h2 id="featured-heading">精選賽事</h2>
            <p>由大橋半馬到城市全馬，先睇日期，再了解每場特色。</p>
          </div>
          <Link href="/races/">
            全部賽事 <Icon name="arrow" />
          </Link>
        </div>
        <div className="home-picks">
          {featured.map((race, index) => {
            const summary = statusSummary(race, race.groups, now);
            const artwork = featuredArtwork[race.id] ?? { headline: "START.", caption: race.sport };
            return (
              <article className="home-pick" key={race.id}>
                <Link className="home-pick-primary" href={raceHref(race)}>
                  <div className={`home-pick-cover home-pick-cover--${index}`} aria-hidden="true">
                    <span>{race.date.slice(0, 4)} SEASON</span>
                    <strong>{artwork.headline}</strong>
                    <div className="home-pick-track" />
                    <span>{artwork.caption}</span>
                  </div>
                  <div className="home-pick-copy">
                    <time dateTime={race.date}>
                      {displayDate(race.date, { year: "numeric", weekday: "short" })}
                    </time>
                    <h3>{race.name}</h3>
                    <p>
                      <Icon name="pin" size={15} />
                      {race.district === "按組別起點" ? "香港 · 按組別起點" : race.district}
                    </p>
                    <ul aria-label="比賽距離">
                      {distances(race).map((distance) => (
                        <li key={distance}>{distance}</li>
                      ))}
                    </ul>
                    <span className="home-pick-action">
                      查看詳細資料 <Icon name="arrow" size={18} />
                    </span>
                  </div>
                </Link>
                <div className="home-pick-status">
                  <StatusBadge status={summary.key}>{summary.label}</StatusBadge>
                  <span>按所列報名渠道</span>
                </div>
              </article>
            );
          })}
        </div>
        {!featured.length && <p>新一季精選賽事整理中，歡迎查看完整時間表。</p>}
        <p className="home-source-note">
          {latestVerified &&
            `賽事資料最近核對：${displayDate(latestVerified, { year: "numeric" })}。`}
          報名狀態按各渠道核對時間顯示，付款前請向大會確認。
        </p>
      </section>
    </>
  );
}
