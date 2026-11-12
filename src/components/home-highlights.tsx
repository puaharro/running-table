"use client";

import Link from "next/link";
import Image from "next/image";
import { Icon } from "./ui";
import { useClock } from "@/lib/use-clock";
import { distanceLabel, hongKongToday } from "@/lib/races";
import { raceHref } from "@/lib/site";
import type { Race } from "@/lib/types";

const distances = (race: Race) => [
  ...new Set(race.groups.map((group) => distanceLabel(group.distanceKm))),
];

export function HomeHighlights({ races, initialNow }: { races: Race[]; initialNow: string }) {
  const now = useClock(initialNow);
  const today = hongKongToday(new Date(now));
  const upcoming = races
    .filter((race) => race.status === "scheduled" && race.endDate >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
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
                      <strong>
                        {Number(race.date.slice(5, 7))}月{Number(race.date.slice(8))}日
                      </strong>
                      <span>{race.date.slice(0, 4)} 年</span>
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
            <div className="home-photo">
              <Image
                src="/images/home/harbour-run.webp"
                alt="清晨沿海旁慢跑嘅跑手"
                width={768}
                height={512}
              />
            </div>
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
    </>
  );
}
