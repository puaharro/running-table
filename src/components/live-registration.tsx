"use client";

import { englishDate, englishDistance, language } from "@/lib/english-races";
import { englishRaceTerm } from "@/lib/race-terms.en";
import { useEffect, useState } from "react";
import { useClock } from "@/lib/use-clock";
import {
  displayDate,
  distanceLabel,
  channelStatus,
  registrationCountdown,
  statusSummary,
} from "@/lib/races";
import { groupLocations } from "@/lib/group-locations";
import type { Race } from "@/lib/types";
import { StatusBadge } from "./status-badge";
import { GroupRatings } from "./group-ratings";
import { Icon } from "./ui";
import { CharityEntry } from "./charity-entry";
import { RegistrationChannelCard } from "./registration-channel-card";
import { RegistrationTimestamp } from "./registration-timestamp";

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
              <RegistrationTimestamp english={english} value={countdown.deadline} />
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

function LiveRaceStatus({
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
export function RegistrationGroups({
  race,
  initialNow,
  english = false,
  previewEdition,
}: {
  race: Race;
  initialNow: string;
  english?: boolean;
  previewEdition?: { groupId: string; year: number; relocatedReviewId?: string };
}) {
  const t = language(english);
  const now = useClock(initialNow);
  const [selectedGroup, setSelectedGroup] = useState("");
  useEffect(() => {
    const sync = () => {
      const hash = window.location.hash.slice(1);
      const group = race.groups.find(
        ({ id }) => hash === `group-${id}` || hash === `entry-options-${id}`,
      );
      setSelectedGroup(group ? `group-${group.id}` : "");
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
    if (!selectedGroup || window.location.hash !== `#${selectedGroup}`) return;
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
          {(group.channels.length > 0 || group.charityEntry) && (
            <a className="text-link group-entry-link" href={`#entry-options-${group.id}`}>
              {t("跳到報名渠道", "Jump to entry options")} <span aria-hidden="true">↓</span>
            </a>
          )}
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
            relocatedReviewId={
              previewEdition?.groupId === group.id ? previewEdition.relocatedReviewId : undefined
            }
            excludedEditionYear={
              previewEdition?.groupId === group.id ? previewEdition.year : undefined
            }
          />
          <h4 className="channels-heading" id={`entry-options-${group.id}`} tabIndex={-1}>
            {t("報名渠道 ·", "Entry options ·")}{" "}
            {group.channels.length + Number(!!group.charityEntry)}
          </h4>
          <ul className="registration-channel-list" role="list">
            {group.channels.map((channel) => (
              <li id={`channel-${channel.id}`} key={channel.id}>
                <RegistrationChannelCard
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
