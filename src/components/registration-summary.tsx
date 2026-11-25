"use client";

import { useState } from "react";
import { englishDistance, language } from "@/lib/english-races";
import { groupLocations } from "@/lib/group-locations";
import { englishRaceTerm } from "@/lib/race-terms.en";
import { channelStatus, distanceLabel, statusSummary } from "@/lib/races";
import { channelPriceHeading, channelPriceLabel } from "@/lib/registration-display";
import type { Race } from "@/lib/types";
import { useClock } from "@/lib/use-clock";
import { CharityEntry } from "./charity-entry";
import { RaceDataText } from "./race-data-text";
import { RegistrationDeadline } from "./registration-timestamp";
import { StatusBadge } from "./status-badge";

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
                            {channel.registrationDeadlineCondition === "until-full" &&
                            !channel.registrationClosesAt &&
                            !channel.deadline
                              ? t("申請截止", "Application deadline")
                              : t("申請截止 · 香港時間", "Application deadline · Hong Kong time")}
                          </dt>
                          <dd>
                            <RegistrationDeadline
                              channel={channel}
                              english={english}
                              fallback={t("期限待核實", "Deadline unverified")}
                            />
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
