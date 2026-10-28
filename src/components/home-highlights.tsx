"use client";

import Link from "next/link";
import { Icon } from "./ui";
import { StatusBadge } from "./status-badge";
import { useClock } from "./live-registration";
import { displayDate, distanceLabel, hongKongToday, statusSummary } from "@/lib/races";
import { raceHref } from "@/lib/site";
import type { Race } from "@/lib/types";

const featuredIds = [
  "standard-chartered-hk-marathon-2027",
  "unicef-powerun-2027",
  "hzmb-half-marathon-2026",
];

const notices = [
  {
    label: "報名渠道",
    title: "公眾抽籤截止，仲有其他選擇？",
    description: "一般、慈善、優先同住宿名額各有資格同期限。先比較渠道，再決定點報名。",
    href: "/races/?channel=charity",
    action: "查看慈善報名渠道",
    icon: "filter" as const,
  },
  {
    label: "截止時間",
    title: "想報下一場，先睇報名期限。",
    description: "按報名截止排序，集中睇接受申請嘅渠道；名額同資格以大會確認為準。",
    href: "/races/?status=open&sort=deadline",
    action: "查看報名時間表",
    icon: "clock" as const,
  },
  {
    label: "報名前必讀",
    title: "距離、費用、資格，一次核對。",
    description: "由揀組別到付款確認，用報名清單逐項檢查，為起跑做好準備。",
    href: "/guides/race-registration-checklist/",
    action: "閱讀報名清單",
    icon: "check" as const,
  },
];

export function HomeHighlights({ races, initialNow }: { races: Race[]; initialNow: string }) {
  const now = useClock(initialNow);
  const today = hongKongToday(new Date(now));
  const upcoming = races.filter((race) => race.status === "scheduled" && race.endDate >= today);
  const featured = [
    ...featuredIds.flatMap((id) => upcoming.filter((race) => race.id === id)),
    ...upcoming.filter((race) => !featuredIds.includes(race.id)),
  ].slice(0, 3);

  return (
    <>
      <section className="home-section shell" aria-labelledby="featured-heading">
        <div className="section-heading">
          <div>
            <div className="eyebrow">ON YOUR RADAR</div>
            <h2 id="featured-heading">值得留意嘅下一場</h2>
            <p>編輯精選，由城市馬拉松到慈善跑，搵啲起跑靈感。</p>
          </div>
          <Link className="text-link" href="/races/">
            搜尋全部賽事 <Icon name="arrow" />
          </Link>
        </div>
        <div className="featured-race-grid">
          {featured.map((race, index) => {
            const summary = statusSummary(race, race.groups, now);
            return (
              <Link
                className={`featured-race-card featured-race-card--${index + 1}`}
                href={raceHref(race)}
                key={race.id}
              >
                <div className="featured-race-art">
                  <span className="eyebrow">{race.district} · 路跑</span>
                  <time dateTime={race.date}>
                    {race.date.slice(5, 7)}
                    <span> / </span>
                    {race.date.slice(8)}
                    <small>{race.date.slice(0, 4)}</small>
                  </time>
                  <div className="featured-distances">
                    {[...new Set(race.groups.map((group) => distanceLabel(group.distanceKm)))].join(
                      " · ",
                    )}
                  </div>
                </div>
                <div className="featured-race-body">
                  <div className="featured-race-meta">
                    <span>{displayDate(race.date)}</span>
                    <StatusBadge status={summary.key}>{summary.label}</StatusBadge>
                  </div>
                  <h3>{race.name}</h3>
                  <p>{race.summary}</p>
                  <span className="text-link">
                    查看賽事資訊 <Icon name="arrow" size={16} />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
        {!featured.length && <p>新一季精選賽事整理中。你可以到賽事搜尋查看完整時間表。</p>}
      </section>
      <section className="home-information" aria-labelledby="information-heading">
        <div className="shell home-section">
          <div className="section-heading">
            <div>
              <div className="eyebrow">GOOD TO KNOW</div>
              <h2 id="information-heading">起跑之前，呢啲要知。</h2>
              <p>報名重點同實用提醒，幫你行好每一步。</p>
            </div>
          </div>
          <div className="home-notice-grid">
            {notices.map((notice) => (
              <Link className="home-notice" key={notice.label} href={notice.href}>
                <div className="notice-top">
                  <Icon name={notice.icon} size={22} />
                  <span>{notice.label}</span>
                </div>
                <h3>{notice.title}</h3>
                <p>{notice.description}</p>
                <span className="text-link">
                  {notice.action} <Icon name="arrow" size={16} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
