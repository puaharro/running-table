"use client";

import { useEffect, useState } from "react";
import {
  displayDate,
  distanceLabel,
  formatTimestamp,
  groupStatus,
  registrationIsStale,
  statusSummary,
} from "@/lib/races";
import { type Race } from "@/lib/types";

import { StatusBadge } from "./status-badge";

function useClock(initialNow: string) {
  const [now, setNow] = useState(initialNow);
  useEffect(() => {
    setNow(new Date().toISOString());
    const timer = window.setInterval(() => setNow(new Date().toISOString()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}
export function LiveRaceStatus({ race, initialNow }: { race: Race; initialNow: string }) {
  const now = useClock(initialNow),
    summary = statusSummary(race, race.groups, now);
  return <StatusBadge status={summary.key}>{summary.label}</StatusBadge>;
}
export function RegistrationSummary({ race, initialNow }: { race: Race; initialNow: string }) {
  const now = useClock(initialNow);
  return (
    <section className="registration-summary" aria-labelledby="registration-summary-heading">
      <div className="registration-summary-heading">
        <h2 id="registration-summary-heading">報名重點</h2>
        <a href="#registration-groups">查看完整組別資料 ↓</a>
      </div>
      <p>按組別核對渠道、費用及截止時間；抽籤申請唔等於取得名額。</p>
      <ul className="registration-summary-list">
        {race.groups.map((group) => {
          const status = groupStatus(race, group, now);
          const officialUrl = group.registrationUrl ?? race.sourceUrl;
          return (
            <li key={group.id}>
              <div className="summary-group-name">
                <strong>{group.name}</strong>
                <StatusBadge status={status} />
                <span>{group.registrationMethod ?? "渠道待核實"}</span>
              </div>
              <dl>
                <div>
                  <dt>參賽費用</dt>
                  <dd>
                    {group.price === null
                      ? "待核實"
                      : group.price === 0
                        ? "免費"
                        : `HK$ ${group.price}`}
                    {group.priceNote && <small>{group.priceNote}</small>}
                  </dd>
                </div>
                <div>
                  <dt>報名截止 · 香港時間</dt>
                  <dd>
                    {group.registrationClosesAt ? (
                      <time dateTime={group.registrationClosesAt}>
                        {formatTimestamp(group.registrationClosesAt)} HKT
                      </time>
                    ) : group.deadline ? (
                      <time dateTime={group.deadline}>
                        {displayDate(group.deadline, { year: "numeric" })}
                      </time>
                    ) : (
                      "待核實／未有已核對期限"
                    )}
                  </dd>
                </div>
              </dl>
              {officialUrl && (
                <a
                  className="summary-official-link"
                  href={officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  查看{group.registrationUrl ? "此組別" : "賽事"}官方資料 ↗
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
export function RegistrationGroups({ race, initialNow }: { race: Race; initialNow: string }) {
  const now = useClock(initialNow);
  return (
    <div className="group-grid">
      {race.groups.map((group) => {
        const status = groupStatus(race, group, now);
        return (
          <div key={group.id} className="group-card">
            <div className="group-card-top">
              <strong>{distanceLabel(group.distanceKm)}</strong>
              <StatusBadge status={status} />
            </div>
            <h3>{group.name}</h3>
            <dl>
              <div>
                <dt>比賽日期</dt>
                <dd>{displayDate(group.date, { year: "numeric" })}</dd>
              </div>
              <div>
                <dt>參賽費用</dt>
                <dd>
                  {group.price === null
                    ? "待核實"
                    : group.price === 0
                      ? "免費"
                      : `HK$ ${group.price}`}
                </dd>
              </div>
              {group.priceNote && (
                <div>
                  <dt>費用說明</dt>
                  <dd>{group.priceNote}</dd>
                </div>
              )}
              <div>
                <dt>所列報名渠道</dt>
                <dd>{group.registrationMethod ?? "待核實"}</dd>
              </div>
              <div>
                <dt>報名截止</dt>
                <dd>
                  {group.registrationClosesAt ? (
                    <time dateTime={group.registrationClosesAt}>
                      {formatTimestamp(group.registrationClosesAt)} HKT
                    </time>
                  ) : group.deadline ? (
                    displayDate(group.deadline, { year: "numeric" })
                  ) : (
                    "待核實／未有已核對期限"
                  )}
                </dd>
              </div>
              <div>
                <dt>組別起點</dt>
                <dd>{group.venue ?? race.venue}</dd>
              </div>
              <div>
                <dt>資格／時限</dt>
                <dd>{group.limit ?? "待核實，請查看官方組別資料。"}</dd>
              </div>
              <div>
                <dt>狀態核對</dt>
                <dd>
                  {group.registrationVerifiedAt
                    ? formatTimestamp(group.registrationVerifiedAt)
                    : "尚未核實報名狀態"}
                </dd>
              </div>
            </dl>
            {group.registrationNote && <p className="group-note">{group.registrationNote}</p>}
            {status === "unknown" && registrationIsStale(race, group, now) && (
              <p className="group-note">報名資料未核實或已超過 72 小時，請向官方確認最新安排。</p>
            )}
            {group.registrationUrl && (
              <a
                className="text-link group-official-link"
                href={group.registrationUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                查看此組別官方資料 ↗
              </a>
            )}
            <div className="group-sources">
              核實依據：
              {group.sourceIds?.map((id) => {
                const source = race.sources?.find((s) => s.id === id);
                return source ? (
                  <a key={id} href={source.url} target="_blank" rel="noopener noreferrer">
                    {source.title}
                  </a>
                ) : null;
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
