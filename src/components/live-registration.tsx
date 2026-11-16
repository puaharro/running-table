"use client";

import { RaceDataText } from "./race-data-text";
import { englishDate, englishDistance, englishTimestamp, language } from "@/lib/english-races";
import { englishRaceTerm } from "@/lib/race-terms.en";
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
  english = false,
}: {
  race: Race;
  initialNow: string;
  english?: boolean;
}) {
  const t = language(english);
  const now = useClock(initialNow);
  const groups = race.groups.map((group) => ({
    ...group,
    channels: group.channels.filter((channel) => channel.type === "general"),
  }));
  const countdown = registrationCountdown(race, groups, now);
  const status = groups.some((group) => group.channels.length)
    ? englishRaceTerm(statusSummary(race, groups, now).label, english)
    : t("未有一般公眾報名資料", "No general public entry information");

  return (
    <section
      className="public-registration-countdown"
      aria-label={t("一般公眾報名", "General public entry")}
    >
      <h2>
        <Icon name="clock" size={18} /> {t("一般公眾報名", "General public entry")}
      </h2>
      {countdown ? (
        <>
          <p
            className="public-registration-state"
            data-timed={countdown.deadline.includes("T")}
            data-urgent={countdown.urgent}
          >
            {countdown.deadline.includes("T")
              ? englishRaceTerm(countdown.label, english)
              : t("接受申請", "Accepting entries")}
          </p>
          <dl className="public-registration-deadline">
            <dt>{t("報名截止", "Entry deadline")}</dt>
            <dd>
              <Timestamp english={english} value={countdown.deadline} />
            </dd>
          </dl>
          <a href={`#channel-${countdown.channelId}`}>
            {englishRaceTerm(countdown.groupName, english)} ·{" "}
            {englishRaceTerm(countdown.channelName, english)} <Icon name="arrow" size={16} />
          </a>
        </>
      ) : (
        <p className="public-registration-state">{status}</p>
      )}
    </section>
  );
}

export function LiveRaceStatus({
  race,
  initialNow,
  english = false,
}: {
  race: Race;
  initialNow: string;
  english?: boolean;
}) {
  const now = useClock(initialNow),
    summary = statusSummary(race, race.groups, now);
  return (
    <StatusBadge english={english} status={summary.key}>
      {englishRaceTerm(summary.label, english)}
    </StatusBadge>
  );
}
export function RegistrationVerification({
  race,
  group,
  channel,
  now,
  english = false,
}: {
  race: Race;
  group: RaceGroup;
  channel: RegistrationChannel;
  now: string;
  english?: boolean;
}) {
  const t = language(english);
  const reason = registrationUncertaintyReason(race, group, channel, now, english);
  return (
    <div className="registration-verification">
      <p>
        {t("此渠道最後核對：", "Entry channel last checked:")}
        {channel.registrationVerifiedAt ? (
          <time dateTime={channel.registrationVerifiedAt}>
            {english
              ? englishTimestamp(channel.registrationVerifiedAt)
              : `${formatTimestamp(channel.registrationVerifiedAt)} HKT`}
          </time>
        ) : (
          t("尚未完成", "Pending")
        )}
      </p>
      {reason && <p className="verification-reason">{reason}</p>}
    </div>
  );
}
function Timestamp({ value, english = false }: { value: string; english?: boolean }) {
  return (
    <time dateTime={value}>
      {english
        ? value.includes("T")
          ? englishTimestamp(value)
          : englishDate(value)
        : value.includes("T")
          ? `${formatTimestamp(value)} HKT`
          : displayDate(value, { year: "numeric" })}
    </time>
  );
}
function RegistrationTerm({
  term,
  english = false,
}: {
  term: "公眾抽籤" | "最低籌款額";
  english?: boolean;
}) {
  const t = language(english);
  return (
    <details className="registration-term">
      <summary>
        {englishRaceTerm(term, english)} <span aria-hidden="true">?</span>
      </summary>
      <p>
        {term === "公眾抽籤"
          ? t(
              "提交抽籤申請後，請等候大會公布結果，以確認是否獲得名額。中籤後如設有付款期限，請按時付款。",
              "After applying, wait for the organiser to confirm the ballot results. If selected, pay by the stated deadline.",
            )
          : t(
              "透過該渠道參賽所需達到的最低籌款額。如另有參賽費，請按主辦方條款核對。",
              "This is the minimum you must raise to enter through this option. Check the organiser’s terms for any separate entry fee.",
            )}
      </p>
    </details>
  );
}
function ChannelCard({
  race,
  group,
  channel,
  now,
  english = false,
}: {
  race: Race;
  group: RaceGroup;
  channel: RegistrationChannel;
  now: string;
  english?: boolean;
}) {
  const t = language(english);
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
    <article
      className="registration-channel"
      aria-label={`${englishRaceTerm(group.name, english)} · ${englishRaceTerm(channel.name, english)}`}
    >
      <details
        className="channel-details"
        open={open}
        onToggle={(event) => setOpen(event.currentTarget.open)}
      >
        <summary className="channel-toggle">
          <h4>{englishRaceTerm(channel.name, english)}</h4>
          <StatusBadge english={english} status={channelStatus(race, group, channel, now)} />
          <span className="channel-toggle-facts">
            <span>
              {channelPriceHeading(channel, english)}：{channelPriceLabel(channel, english)}
              {channel.priceUnit && ` · ${englishRaceTerm(channel.priceUnit, english)}`}
            </span>
            <span>
              {t("截止：", "Deadline:")}
              {deadline ? (
                <Timestamp english={english} value={deadline} />
              ) : (
                t("待核實", "Unverified")
              )}
            </span>
          </span>
        </summary>
        <div className="channel-details-body">
          <p>
            {englishRaceTerm(channelTypeLabels[channel.type], english)}
            {channel.registrationMethod !== "公眾抽籤" &&
              ` · ${englishRaceTerm(channel.registrationMethod, english)}`}
          </p>
          {channel.registrationMethod === "公眾抽籤" && (
            <RegistrationTerm english={english} term="公眾抽籤" />
          )}
          <dl>
            <div>
              <dt>{t("申請資格／條件", "Eligibility and conditions")}</dt>
              <dd>
                <RaceDataText value={channel.eligibility} english={english} />
              </dd>
            </div>
            <div>
              <dt>
                {channel.priceType === "minimum-donation" ? (
                  <RegistrationTerm english={english} term="最低籌款額" />
                ) : (
                  channelPriceHeading(channel, english)
                )}
              </dt>
              <dd>
                {channelPriceLabel(channel, english)}
                {channel.priceUnit && ` · ${englishRaceTerm(channel.priceUnit, english)}`}
                {channel.priceNote && (
                  <small>
                    <RaceDataText value={channel.priceNote} english={english} />
                  </small>
                )}
              </dd>
            </div>
            {(channel.registrationOpensAt || channel.registrationStart) && (
              <div>
                <dt>{t("申請開始", "Applications open")}</dt>
                <dd>
                  <Timestamp
                    english={english}
                    value={(channel.registrationOpensAt ?? channel.registrationStart)!}
                  />
                </dd>
              </div>
            )}
            <div>
              <dt>{t("申請截止 · 香港時間", "Application deadline · Hong Kong time")}</dt>
              <dd>
                {deadline ? (
                  <Timestamp english={english} value={deadline} />
                ) : (
                  t("待核實／未有已核對期限", "No verified deadline")
                )}
              </dd>
            </div>
            {channel.resultAnnouncedAt && (
              <div>
                <dt>{t("結果公布", "Results announcement")}</dt>
                <dd>
                  <Timestamp english={english} value={channel.resultAnnouncedAt} />
                </dd>
              </div>
            )}
            {channel.paymentClosesAt && (
              <div>
                <dt>{t("獲確認後付款截止", "Payment deadline after confirmation")}</dt>
                <dd>
                  <Timestamp english={english} value={channel.paymentClosesAt} />
                </dd>
              </div>
            )}
          </dl>
          {channel.registrationNote && (
            <p className="group-note">
              <RaceDataText value={channel.registrationNote} english={english} />
            </p>
          )}
          <RegistrationVerification
            english={english}
            race={race}
            group={group}
            channel={channel}
            now={now}
          />
          {channel.registrationUrl && (
            <a
              className="text-link group-official-link"
              href={channel.registrationUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("查看此渠道官方資料 ↗", "Official entry information ↗")}
            </a>
          )}
          <div className="group-sources">
            {t("此渠道核實依據：", "Sources for this entry option:")}
            {channel.sourceIds.map((id) => {
              const source = race.sources?.find((source) => source.id === id);
              return source ? (
                <a key={id} href={source.url} target="_blank" rel="noopener noreferrer">
                  <RaceDataText value={source.title} english={english} />
                </a>
              ) : null;
            })}
          </div>
        </div>
      </details>
    </article>
  );
}
export function RegistrationSummary({
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
  const [sort, setSort] = useState<"ascending" | "descending">();
  const groups = sort
    ? [...race.groups].sort(
        (a, b) => (a.distanceKm - b.distanceKm) * (sort === "ascending" ? 1 : -1),
      )
    : race.groups;
  const fields = [
    t("距離", "Distance"),
    t("起點", "Start"),
    t("資格／時限", "Eligibility / time limit"),
    t("公眾報名", "Public entry"),
  ];
  const rows = groups.map((group) => {
    const publicChannels = group.channels.filter((channel) => channel.type === "general");
    return {
      group,
      values: [
        (english ? englishDistance : distanceLabel)(group.distanceKm),
        englishRaceTerm(groupLocations(race, [group])[0].venue, english) ??
          t("起點待核實", "Start location unverified"),
        (group.limit && englishRaceTerm(group.limit, english)) ?? t("待核實", "Unverified"),
        publicChannels.length
          ? englishRaceTerm(
              statusSummary(race, [{ ...group, channels: publicChannels }], now).label,
              english,
            )
          : t("未有公眾報名資料", "No public entry information"),
      ],
    };
  });
  return (
    <section className="registration-summary" aria-labelledby="registration-summary-heading">
      <div className="registration-summary-heading">
        <h2 id="registration-summary-heading">{t("報名重點", "Entry at a glance")}</h2>
        <a href="#registration-groups">{t("查看完整組別資料 ↓", "See all category details ↓")}</a>
      </div>
      <p>
        {t(
          "每個渠道有獨立資格、價格及期限；接受申請並不表示名額已獲確認。公布結果的日期和付款期限另行列出，與申請截止日期有別。",
          "Each option has its own eligibility, fees and deadlines. Applying does not guarantee a place. Results and payment dates are listed separately from the application deadline.",
        )}
      </p>
      <div className="group-compare">
        <button
          type="button"
          className="button group-compare-sort"
          onClick={() => setSort(sort === "ascending" ? "descending" : "ascending")}
        >
          {sort === "ascending"
            ? t("距離：短至長", "Distance: shortest first")
            : sort === "descending"
              ? t("距離：長至短", "Distance: longest first")
              : t("按距離排序", "Sort by distance")}
        </button>
        <table className="group-compare-table">
          <caption className="sr-only">
            {t(
              "各組起點、資格及公眾報名比較",
              "Compare starts, eligibility and public entry by category",
            )}
          </caption>
          <thead>
            <tr>
              <th scope="col">{t("組別", "Category")}</th>
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
                  <a href={`#group-${group.id}`}>{englishRaceTerm(group.name, english)}</a>
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
              <a href={`#group-${group.id}`}>{englishRaceTerm(group.name, english)}</a>
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
                <h3>{englishRaceTerm(group.name, english)}</h3>
                <span>
                  {group.channels.length + Number(!!group.charityEntry)}{" "}
                  {t("個渠道 ·", "entry options ·")}{" "}
                  {
                    group.channels.filter((c) => channelStatus(race, group, c, now) === "open")
                      .length
                  }{" "}
                  {t("個接受申請", "accepting entries")}
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
                      <strong>{englishRaceTerm(channel.name, english)}</strong>{" "}
                      <StatusBadge
                        english={english}
                        status={channelStatus(race, group, channel, now)}
                      />
                      <dl className="channel-comparison">
                        <div>
                          <dt>{channelPriceHeading(channel, english)}</dt>
                          <dd>
                            {channelPriceLabel(channel, english)}
                            {channel.priceUnit &&
                              ` · ${englishRaceTerm(channel.priceUnit, english)}`}
                          </dd>
                        </div>
                        <div>
                          <dt>
                            {t("申請截止 · 香港時間", "Application deadline · Hong Kong time")}
                          </dt>
                          <dd>
                            {channel.registrationClosesAt || channel.deadline ? (
                              <Timestamp
                                english={english}
                                value={(channel.registrationClosesAt ?? channel.deadline)!}
                              />
                            ) : (
                              t("期限待核實", "Deadline unverified")
                            )}
                          </dd>
                        </div>
                      </dl>
                      {channel.priceNote && (
                        <p>
                          <RaceDataText value={channel.priceNote} english={english} />
                        </p>
                      )}
                      <p>
                        <RaceDataText value={channel.eligibility} english={english} />
                      </p>
                      <a className="text-link" href={`#channel-${channel.id}`}>
                        {t("查看完整條件及官方資料 ↓", "See full terms and official information ↓")}
                      </a>
                    </li>
                  ))}
                {group.charityEntry && (
                  <li>
                    <CharityEntry english={english} group={group} />
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
  english = false,
  previewEdition,
}: {
  race: Race;
  initialNow: string;
  english?: boolean;
  previewEdition?: { groupId: string; year: number };
}) {
  const t = language(english);
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
            <strong>{(english ? englishDistance : distanceLabel)(group.distanceKm)}</strong>
          </div>
          <h3>
            {englishRaceTerm(group.name, english)}
            {selectedGroup === `group-${group.id}` && (
              <span className="selected-group-label">
                {" "}
                {t("· 所選組別", "· Selected category")}
              </span>
            )}
          </h3>
          <dl className="group-facts">
            <div>
              <dt>{t("比賽日期", "Race date")}</dt>
              <dd>
                {english ? englishDate(group.date) : displayDate(group.date, { year: "numeric" })}
              </dd>
            </div>
            <div>
              <dt>{t("組別起點", "Category start")}</dt>
              <dd>
                {englishRaceTerm(groupLocations(race, [group])[0].venue, english) ??
                  t(
                    "起點待核實，請查看官方組別資料。",
                    "Start location unverified. See the organiser’s category information.",
                  )}
              </dd>
            </div>
            <div>
              <dt>{t("參賽資格／賽事時限", "Eligibility / course time limit")}</dt>
              <dd>
                {(group.limit && englishRaceTerm(group.limit, english)) ??
                  t(
                    "待核實，請查看官方組別資料。",
                    "Unverified. See the organiser’s category information.",
                  )}
              </dd>
            </div>
          </dl>
          <GroupRatings
            english={english}
            race={race}
            group={group}
            excludedEditionYear={
              previewEdition?.groupId === group.id ? previewEdition.year : undefined
            }
          />
          <h4 className="channels-heading">
            {t("報名渠道 ·", "Entry options ·")}{" "}
            {group.channels.length + Number(!!group.charityEntry)}
          </h4>
          <ul className="registration-channel-list" role="list">
            {group.channels.map((channel) => (
              <li id={`channel-${channel.id}`} key={channel.id}>
                <ChannelCard
                  english={english}
                  race={race}
                  group={group}
                  channel={channel}
                  now={now}
                />
              </li>
            ))}
            {group.charityEntry && (
              <li id={"channel-" + group.id + "-charity"}>
                <CharityEntry english={english} group={group} />
              </li>
            )}
          </ul>
          <a className="group-back-link" href="#registration-groups">
            {t("返回組別選單 ↑", "Back to categories ↑")}
          </a>
        </section>
      ))}
    </div>
  );
}

export function RaceOverview({
  race,
  initialNow,
  english = false,
  experienceHref,
  experienceLabel,
}: {
  race: Race;
  initialNow: string;
  english?: boolean;
  experienceHref: string;
  experienceLabel: string;
}) {
  const t = language(english);
  const now = useClock(initialNow);
  const statuses = race.groups.flatMap((g) =>
    g.channels.map((c) => channelStatus(race, g, c, now)),
  );
  return (
    <section className="race-overview" aria-label={t("賽事重點", "Race at a glance")}>
      <dl>
        <div>
          <dt>{t("比賽日期", "Race date")}</dt>
          <dd>
            {english ? englishDate(race.date) : displayDate(race.date, { year: "numeric" })}
            {race.date !== race.endDate &&
              (english ? " – " + englishDate(race.endDate) : " 至 " + displayDate(race.endDate))}
          </dd>
        </div>
        <div>
          <dt>{t("參賽組別", "Race categories")}</dt>
          <dd>
            {[
              ...new Set(
                race.groups.map((g) => (english ? englishDistance : distanceLabel)(g.distanceKm)),
              ),
            ].join(" / ")}
          </dd>
        </div>
        <div>
          <dt>{t("地區／起點", "Region / start location")}</dt>
          <dd>{englishRaceTerm(race.venue, english)}</dd>
        </div>
        <div>
          <dt>{t("報名概況", "Registration")}</dt>
          <dd>
            {statuses.length ? (
              <LiveRaceStatus english={english} race={race} initialNow={now} />
            ) : (
              t("詳情請參閱大會網站", "See the organiser’s website")
            )}
            {!!statuses.length && (
              <small>
                {statuses.filter((s) => s === "open").length}{" "}
                {t("個渠道接受申請 ·", "options accepting entries ·")}{" "}
                {statuses.filter((s) => s === "unknown").length} {t("個待核實", "unverified")}
              </small>
            )}
          </dd>
        </div>
      </dl>
      <p>
        {t(
          "報名狀態按渠道分開，接受申請不代表獲得名額。",
          "Entry status is shown separately for each option. Applying does not guarantee a place.",
        )}
      </p>
      <nav aria-label={t("賽事重點入口", "Race quick links")}>
        <a href="#race-about">{t("賽事概覽 ↓", "Race overview ↓")}</a>
        <a href="#registration-groups">{t("報名渠道 ↓", "Entry options ↓")}</a>
        <a href={experienceHref}>{experienceLabel} ↓</a>
        <a href="#race-transport">{t("交通安排 ↓", "Transport ↓")}</a>
        <a href="#race-sources">{t("資料來源 ↓", "Sources ↓")}</a>
      </nav>
    </section>
  );
}
