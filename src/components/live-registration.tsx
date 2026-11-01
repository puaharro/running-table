"use client";

import { useEffect, useState } from "react";
import {
  displayDate,
  distanceLabel,
  formatTimestamp,
  channelStatus,
  statusSummary,
} from "@/lib/races";
import { groupLocations } from "@/lib/group-locations";
import { registrationUncertaintyReason } from "@/lib/verification";
import {
  channelTypeLabels,
  type Race,
  type RaceGroup,
  type RegistrationChannel,
} from "@/lib/types";
import { StatusBadge } from "./status-badge";
import { GroupRatings } from "./group-ratings";
import { channelPriceHeading, channelPriceLabel } from "@/lib/registration-display";

export function useClock(initialNow: string) {
  const [now, setNow] = useState(initialNow);
  useEffect(() => {
    const sync = () => setNow(new Date().toISOString());
    sync();
    const timer = window.setInterval(sync, 30000);
    window.addEventListener("pageshow", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("pageshow", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);
  return now;
}
export function LiveRaceStatus({ race, initialNow }: { race: Race; initialNow: string }) {
  const now = useClock(initialNow),
    summary = statusSummary(race, race.groups, now);
  return <StatusBadge status={summary.key}>{summary.label}</StatusBadge>;
}
export function RegistrationVerification({
  race,
  group,
  channel,
  now,
}: {
  race: Race;
  group: RaceGroup;
  channel: RegistrationChannel;
  now: string;
}) {
  const reason = registrationUncertaintyReason(race, group, channel, now);
  return (
    <div className="registration-verification">
      <p>
        此渠道最後核對：
        {channel.registrationVerifiedAt ? (
          <time dateTime={channel.registrationVerifiedAt}>
            {formatTimestamp(channel.registrationVerifiedAt)} HKT
          </time>
        ) : (
          "尚未完成"
        )}
      </p>
      {reason && <p className="verification-reason">{reason}</p>}
    </div>
  );
}
function Timestamp({ value }: { value: string }) {
  return (
    <time dateTime={value}>
      {value.includes("T")
        ? `${formatTimestamp(value)} HKT`
        : displayDate(value, { year: "numeric" })}
    </time>
  );
}
function ChannelCard({
  race,
  group,
  channel,
  now,
}: {
  race: Race;
  group: RaceGroup;
  channel: RegistrationChannel;
  now: string;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const reveal = () => {
      if (window.location.hash === `#channel-${channel.id}`) setOpen(true);
    };
    const revealLink = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest("a") : null;
      if (link?.getAttribute("href") === `#channel-${channel.id}`) setOpen(true);
    };
    reveal();
    window.addEventListener("hashchange", reveal);
    document.addEventListener("click", revealLink);
    return () => {
      window.removeEventListener("hashchange", reveal);
      document.removeEventListener("click", revealLink);
    };
  }, [channel.id]);
  return (
    <article className="registration-channel" aria-label={`${group.name} · ${channel.name}`}>
      <details
        className="channel-details"
        open={open}
        onToggle={(event) => setOpen(event.currentTarget.open)}
      >
        <summary className="channel-toggle">
          <h4>{channel.name}</h4>
          <StatusBadge status={channelStatus(race, group, channel, now)} />
          <span className="channel-toggle-price">
            {channelPriceHeading(channel)}：{channelPriceLabel(channel)}
            {channel.priceUnit && ` · ${channel.priceUnit}`}
          </span>
        </summary>
        <div className="channel-details-body">
          <p>
            {channelTypeLabels[channel.type]} · {channel.registrationMethod}
          </p>
          <dl>
            <div>
              <dt>申請資格／條件</dt>
              <dd>{channel.eligibility}</dd>
            </div>
            <div>
              <dt>{channelPriceHeading(channel)}</dt>
              <dd>
                {channelPriceLabel(channel)}
                {channel.priceUnit && ` · ${channel.priceUnit}`}
                {channel.priceNote && <small>{channel.priceNote}</small>}
              </dd>
            </div>
            {(channel.registrationOpensAt || channel.registrationStart) && (
              <div>
                <dt>申請開始</dt>
                <dd>
                  <Timestamp value={(channel.registrationOpensAt ?? channel.registrationStart)!} />
                </dd>
              </div>
            )}
            <div>
              <dt>申請截止 · 香港時間</dt>
              <dd>
                {channel.registrationClosesAt || channel.deadline ? (
                  <Timestamp value={(channel.registrationClosesAt ?? channel.deadline)!} />
                ) : (
                  "待核實／未有已核對期限"
                )}
              </dd>
            </div>
            {channel.resultAnnouncedAt && (
              <div>
                <dt>結果公布</dt>
                <dd>
                  <Timestamp value={channel.resultAnnouncedAt} />
                </dd>
              </div>
            )}
            {channel.paymentClosesAt && (
              <div>
                <dt>獲確認後付款截止</dt>
                <dd>
                  <Timestamp value={channel.paymentClosesAt} />
                </dd>
              </div>
            )}
          </dl>
          {channel.registrationNote && <p className="group-note">{channel.registrationNote}</p>}
          <RegistrationVerification race={race} group={group} channel={channel} now={now} />
          {channel.registrationUrl && (
            <a
              className="text-link group-official-link"
              href={channel.registrationUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              查看此渠道官方資料 ↗
            </a>
          )}
          <div className="group-sources">
            此渠道核實依據：
            {channel.sourceIds.map((id) => {
              const source = race.sources?.find((source) => source.id === id);
              return source ? (
                <a key={id} href={source.url} target="_blank" rel="noopener noreferrer">
                  {source.title}
                </a>
              ) : null;
            })}
          </div>
        </div>
      </details>
    </article>
  );
}
export function RegistrationSummary({ race, initialNow }: { race: Race; initialNow: string }) {
  const now = useClock(initialNow);
  return (
    <section className="registration-summary" aria-labelledby="registration-summary-heading">
      <div className="registration-summary-heading">
        <h2 id="registration-summary-heading">報名重點</h2>
        <a href="#registration-groups">查看完整組別資料 ↓</a>
      </div>
      <p>
        每個渠道有獨立資格、價格及期限；接受申請唔等於已確認名額。結果公布及付款期限另列，唔等同申請截止。
      </p>
      <ul className="registration-summary-list">
        {race.groups.map((group) => (
          <li key={group.id}>
            <details className="summary-distance" open={group.channels.length === 1}>
              <summary>
                <h3>{group.name}</h3>
                <span>
                  {group.channels.length} 個渠道 ·{" "}
                  {
                    group.channels.filter((c) => channelStatus(race, group, c, now) === "open")
                      .length
                  }{" "}
                  個接受申請
                </span>
              </summary>
              <ul className="channel-summary-list">
                {[...group.channels]
                  .sort(
                    (a, b) =>
                      Number(channelStatus(race, group, b, now) === "open") -
                      Number(channelStatus(race, group, a, now) === "open"),
                  )
                  .map((channel) => (
                    <li key={channel.id}>
                      <strong>{channel.name}</strong>{" "}
                      <StatusBadge status={channelStatus(race, group, channel, now)} />
                      <dl className="channel-comparison">
                        <div>
                          <dt>{channelPriceHeading(channel)}</dt>
                          <dd>
                            {channelPriceLabel(channel)}
                            {channel.priceUnit && ` · ${channel.priceUnit}`}
                          </dd>
                        </div>
                        <div>
                          <dt>申請截止 · 香港時間</dt>
                          <dd>
                            {channel.registrationClosesAt || channel.deadline ? (
                              <Timestamp
                                value={(channel.registrationClosesAt ?? channel.deadline)!}
                              />
                            ) : (
                              "期限待核實"
                            )}
                          </dd>
                        </div>
                      </dl>
                      {channel.priceNote && <p>{channel.priceNote}</p>}
                      <p>{channel.eligibility}</p>
                      <a className="text-link" href={`#channel-${channel.id}`}>
                        查看完整條件及官方資料 ↓
                      </a>
                    </li>
                  ))}
              </ul>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}
export function RegistrationGroups({ race, initialNow }: { race: Race; initialNow: string }) {
  const now = useClock(initialNow);
  return (
    <div className="group-grid">
      {race.groups.map((group) => (
        <section key={group.id} className="group-card">
          <div className="group-card-top">
            <strong>{distanceLabel(group.distanceKm)}</strong>
          </div>
          <h3>{group.name}</h3>
          <GroupRatings race={race} group={group} />
          <dl>
            <div>
              <dt>比賽日期</dt>
              <dd>{displayDate(group.date, { year: "numeric" })}</dd>
            </div>
            <div>
              <dt>組別起點</dt>
              <dd>
                {groupLocations(race, [group])[0].venue ?? "起點待核實，請查看官方組別資料。"}
              </dd>
            </div>
            <div>
              <dt>參賽資格／賽事時限</dt>
              <dd>{group.limit ?? "待核實，請查看官方組別資料。"}</dd>
            </div>
          </dl>
          <h4 className="channels-heading">報名渠道 · {group.channels.length}</h4>
          {group.channels.map((channel) => (
            <div id={`channel-${channel.id}`} key={channel.id}>
              <ChannelCard race={race} group={group} channel={channel} now={now} />
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

export function RaceOverview({
  race,
  initialNow,
  experienceHref,
  experienceLabel,
}: {
  race: Race;
  initialNow: string;
  experienceHref: string;
  experienceLabel: string;
}) {
  const now = useClock(initialNow);
  const statuses = race.groups.flatMap((g) =>
    g.channels.map((c) => channelStatus(race, g, c, now)),
  );
  return (
    <section className="race-overview" aria-label="賽事重點">
      <dl>
        <div>
          <dt>比賽日期</dt>
          <dd>
            {displayDate(race.date, { year: "numeric" })}
            {race.date !== race.endDate && " 至 " + displayDate(race.endDate)}
          </dd>
        </div>
        <div>
          <dt>參賽組別</dt>
          <dd>{[...new Set(race.groups.map((g) => distanceLabel(g.distanceKm)))].join(" / ")}</dd>
        </div>
        <div>
          <dt>報名概況</dt>
          <dd>
            <LiveRaceStatus race={race} initialNow={now} />
            <small>
              {statuses.filter((s) => s === "open").length} 個渠道接受申請 ·{" "}
              {statuses.filter((s) => s === "unknown").length} 個待核實
            </small>
          </dd>
        </div>
      </dl>
      <p>報名狀態按渠道分開，接受申請不代表獲得名額。</p>
      <nav aria-label="賽事重點入口">
        <a href="#registration-groups">報名渠道 ↓</a>
        <a href={experienceHref}>{experienceLabel} ↓</a>
      </nav>
    </section>
  );
}
