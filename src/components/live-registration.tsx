"use client";

import { useEffect, useState } from "react";
import { useClock } from "@/lib/use-clock";
export { useClock } from "@/lib/use-clock";
import {
  displayDate,
  distanceLabel,
  formatTimestamp,
  channelStatus,
  registrationCountdown,
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
import { Icon } from "./ui";
import { CharityEntry } from "./charity-entry";
import { channelPriceHeading, channelPriceLabel } from "@/lib/registration-display";

export function PublicRegistrationCountdown({
  race,
  initialNow,
}: {
  race: Race;
  initialNow: string;
}) {
  const now = useClock(initialNow);
  const groups = race.groups.map((group) => ({
    ...group,
    channels: group.channels.filter((channel) => channel.type === "general"),
  }));
  const countdown = registrationCountdown(race, groups, now);
  const status = groups.some((group) => group.channels.length)
    ? statusSummary(race, groups, now).label
    : "未有一般公眾報名資料";

  return (
    <section className="public-registration-countdown" aria-label="一般公眾報名">
      <h2>
        <Icon name="clock" size={18} /> 一般公眾報名
      </h2>
      {countdown ? (
        <>
          <p
            className="public-registration-state"
            data-timed={countdown.deadline.includes("T")}
            data-urgent={countdown.urgent}
          >
            {countdown.deadline.includes("T") ? countdown.label : "接受申請"}
          </p>
          <dl className="public-registration-deadline">
            <dt>報名截止</dt>
            <dd>
              <Timestamp value={countdown.deadline} />
            </dd>
          </dl>
          <a href={`#channel-${countdown.channelId}`}>
            {countdown.groupName} · {countdown.channelName} <Icon name="arrow" size={16} />
          </a>
        </>
      ) : (
        <p className="public-registration-state">{status}</p>
      )}
    </section>
  );
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
function RegistrationTerm({ term }: { term: "公眾抽籤" | "最低籌款額" }) {
  return (
    <details className="registration-term">
      <summary>{term} <span aria-hidden="true">?</span></summary>
      <p>
        {term === "公眾抽籤"
          ? "提交抽籤申請後，要等大會公布結果先知有冇名額。中籤後如有付款期限，要按時完成付款。"
          : "參加該渠道所需達到嘅最低籌款金額。如另有參賽費，請按主辦方條款核對。"}
      </p>
    </details>
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
  const deadline = channel.registrationClosesAt ?? channel.deadline;
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
          <span className="channel-toggle-facts">
            <span>
              {channelPriceHeading(channel)}：{channelPriceLabel(channel)}
              {channel.priceUnit && ` · ${channel.priceUnit}`}
            </span>
            <span>截止：{deadline ? <Timestamp value={deadline} /> : "待核實"}</span>
          </span>
        </summary>
        <div className="channel-details-body">
          <p>
            {channelTypeLabels[channel.type]}
            {channel.registrationMethod !== "公眾抽籤" && ` · ${channel.registrationMethod}`}
          </p>
          {channel.registrationMethod === "公眾抽籤" && <RegistrationTerm term="公眾抽籤" />}
          <dl>
            <div>
              <dt>申請資格／條件</dt>
              <dd>{channel.eligibility}</dd>
            </div>
            <div>
              <dt>
                {channel.priceType === "minimum-donation" ? (
                  <RegistrationTerm term="最低籌款額" />
                ) : (
                  channelPriceHeading(channel)
                )}
              </dt>
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
              <dd>{deadline ? <Timestamp value={deadline} /> : "待核實／未有已核對期限"}</dd>
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
  const [sort, setSort] = useState<"ascending" | "descending">();
  const groups = sort
    ? [...race.groups].sort(
        (a, b) => (a.distanceKm - b.distanceKm) * (sort === "ascending" ? 1 : -1),
      )
    : race.groups;
  const fields = ["距離", "起點", "資格／時限", "公眾報名"];
  const rows = groups.map((group) => {
    const publicChannels = group.channels.filter((channel) => channel.type === "general");
    return {
      group,
      values: [
        distanceLabel(group.distanceKm),
        groupLocations(race, [group])[0].venue ?? "起點待核實",
        group.limit ?? "待核實",
        publicChannels.length
          ? statusSummary(race, [{ ...group, channels: publicChannels }], now).label
          : "未有公眾報名資料",
      ],
    };
  });
  return (
    <section className="registration-summary" aria-labelledby="registration-summary-heading">
      <div className="registration-summary-heading">
        <h2 id="registration-summary-heading">報名重點</h2>
        <a href="#registration-groups">查看完整組別資料 ↓</a>
      </div>
      <p>
        每個渠道有獨立資格、價格及期限；接受申請唔等於已確認名額。結果公布及付款期限另列，唔等同申請截止。
      </p>
      <div className="group-compare">
        <button
          type="button"
          className="button group-compare-sort"
          onClick={() => setSort(sort === "ascending" ? "descending" : "ascending")}
        >
          {sort === "ascending"
            ? "距離：短至長"
            : sort === "descending"
              ? "距離：長至短"
              : "按距離排序"}
        </button>
        <table className="group-compare-table">
          <caption className="sr-only">各組起點、資格及公眾報名比較</caption>
          <thead>
            <tr>
              <th scope="col">組別</th>
              {fields.map((field, index) => (
                <th key={field} scope="col" aria-sort={index === 0 ? sort : undefined}>
                  {field}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ group, values }) => (
              <tr key={group.id}>
                <th scope="row">
                  <a href={`#group-${group.id}`}>{group.name}</a>
                </th>
                {values.map((value, index) => (
                  <td key={fields[index]}>{value}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <ul className="group-compare-list" role="list">
          {rows.map(({ group, values }) => (
            <li key={group.id}>
              <a href={`#group-${group.id}`}>{group.name}</a>
              <dl>
                {values.map((value, index) => (
                  <div key={fields[index]}>
                    <dt>{fields[index]}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>
      </div>
      <ul className="registration-summary-list">
        {race.groups.map((group) => (
          <li key={group.id}>
            <details
              className="summary-distance"
              open={group.channels.length + Number(!!group.charityEntry) === 1}
            >
              <summary>
                <h3>{group.name}</h3>
                <span>
                  {group.channels.length + Number(!!group.charityEntry)} 個渠道 ·{" "}
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
                {group.charityEntry && (
                  <li>
                    <CharityEntry group={group} />
                  </li>
                )}
              </ul>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}
export function RegistrationGroups({
  race,
  initialNow,
  previewEdition,
}: {
  race: Race;
  initialNow: string;
  previewEdition?: { groupId: string; year: number };
}) {
  const now = useClock(initialNow);
  const [selectedGroup, setSelectedGroup] = useState("");
  useEffect(() => {
    const sync = () => {
      const hash = window.location.hash.slice(1);
      setSelectedGroup(race.groups.some((group) => `group-${group.id}` === hash) ? hash : "");
    };
    sync();
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, [race.groups]);
  useEffect(() => {
    if (!selectedGroup) return;
    const frame = window.requestAnimationFrame(() => {
      const group = document.getElementById(selectedGroup);
      group?.scrollIntoView({ block: "start", behavior: "instant" });
      group?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [selectedGroup]);
  return (
    <div className="group-grid">
      {race.groups.map((group) => (
        <section
          key={group.id}
          className={`group-card${selectedGroup === `group-${group.id}` ? " is-selected" : ""}`}
          id={`group-${group.id}`}
          tabIndex={-1}
        >
          <div className="group-card-top">
            <strong>{distanceLabel(group.distanceKm)}</strong>
          </div>
          <h3>
            {group.name}
            {selectedGroup === `group-${group.id}` && (
              <span className="selected-group-label"> · 所選組別</span>
            )}
          </h3>
          <dl className="group-facts">
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
          <GroupRatings
            race={race}
            group={group}
            excludedEditionYear={
              previewEdition?.groupId === group.id ? previewEdition.year : undefined
            }
          />
          <h4 className="channels-heading">
            報名渠道 · {group.channels.length + Number(!!group.charityEntry)}
          </h4>
          <ul className="registration-channel-list" role="list">
            {group.channels.map((channel) => (
              <li id={`channel-${channel.id}`} key={channel.id}>
                <ChannelCard race={race} group={group} channel={channel} now={now} />
              </li>
            ))}
            {group.charityEntry && (
              <li id={"channel-" + group.id + "-charity"}>
                <CharityEntry group={group} />
              </li>
            )}
          </ul>
          <a className="group-back-link" href="#registration-groups">
            返回組別選單 ↑
          </a>
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
          <dt>地區／起點</dt>
          <dd>{race.venue}</dd>
        </div>
        <div>
          <dt>報名概況</dt>
          <dd>
            {statuses.length ? (
              <LiveRaceStatus race={race} initialNow={now} />
            ) : (
              "詳情請參閱大會網站"
            )}
            {!!statuses.length && (
              <small>
                {statuses.filter((s) => s === "open").length} 個渠道接受申請 ·{" "}
                {statuses.filter((s) => s === "unknown").length} 個待核實
              </small>
            )}
          </dd>
        </div>
      </dl>
      <p>報名狀態按渠道分開，接受申請不代表獲得名額。</p>
      <nav aria-label="賽事重點入口">
        <a href="#race-about">賽事概覽 ↓</a>
        <a href="#registration-groups">報名渠道 ↓</a>
        <a href={experienceHref}>{experienceLabel} ↓</a>
        <a href="#race-transport">交通安排 ↓</a>
        <a href="#race-sources">資料來源 ↓</a>
      </nav>
    </section>
  );
}
