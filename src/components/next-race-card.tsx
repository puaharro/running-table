"use client";

import Link from "next/link";
import { Icon } from "./ui";
import { StatusBadge } from "./status-badge";
import { useClock } from "./live-registration";
import { distanceLabel, displayDate, nextScheduledRace, statusSummary } from "@/lib/races";
import { raceHref } from "@/lib/site";
import type { Race } from "@/lib/types";

export function NextRaceCard({ races, initialNow }: { races: Race[]; initialNow: string }) {
  const now = useClock(initialNow);
  const nextRace = nextScheduledRace(races, now);
  if (!nextRace) return null;
  const summary = statusSummary(nextRace, nextRace.groups, now);
  return (
    <Link href={raceHref(nextRace)} className="next-race-card">
      <div className="next-race-top">
        <span>下一場已收錄賽事</span>
        <Icon name="arrow" />
      </div>
      <div className="next-race-visual" aria-hidden="true">
        <div className="track-orbit" />
        <div className="next-race-day">
          {nextRace.date.slice(8)}
          <span>
            {Number(nextRace.date.slice(5, 7))} 月 · {nextRace.date.slice(0, 4)}
          </span>
        </div>
        <span className="next-race-word">
          NEXT
          <br />
          START.
        </span>
      </div>
      <div className="next-race-bottom">
        <small>
          {displayDate(nextRace.date)} · {nextRace.district}
        </small>
        <h2>{nextRace.name}</h2>
        <div>
          <StatusBadge status={summary.key}>{summary.label}</StatusBadge>
          {[...new Set(nextRace.groups.map((group) => distanceLabel(group.distanceKm)))].map(
            (distance) => (
              <span key={distance}>{distance}</span>
            ),
          )}
          <span className="next-race-detail">查看賽事 ↗</span>
        </div>
      </div>
    </Link>
  );
}
