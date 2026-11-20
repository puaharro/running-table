import { useEffect, useState } from "react";
import { englishTimestamp, language } from "@/lib/english-races";
import { englishRaceTerm } from "@/lib/race-terms.en";
import { channelStatus, formatTimestamp } from "@/lib/races";
import { channelPriceHeading, channelPriceLabel } from "@/lib/registration-display";
import {
  channelTypeLabels,
  type Race,
  type RaceGroup,
  type RegistrationChannel,
} from "@/lib/types";
import { registrationUncertaintyReason } from "@/lib/verification";
import { RaceDataText } from "./race-data-text";
import { RegistrationTimestamp } from "./registration-timestamp";
import { StatusBadge } from "./status-badge";

function RegistrationVerification({
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
export function RegistrationChannelCard({
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
                <RegistrationTimestamp english={english} value={deadline} />
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
                  <RegistrationTimestamp
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
                  <RegistrationTimestamp english={english} value={deadline} />
                ) : (
                  t("待核實／未有已核對期限", "No verified deadline")
                )}
              </dd>
            </div>
            {channel.resultAnnouncedAt && (
              <div>
                <dt>{t("結果公布", "Results announcement")}</dt>
                <dd>
                  <RegistrationTimestamp english={english} value={channel.resultAnnouncedAt} />
                </dd>
              </div>
            )}
            {channel.paymentClosesAt && (
              <div>
                <dt>{t("獲確認後付款截止", "Payment deadline after confirmation")}</dt>
                <dd>
                  <RegistrationTimestamp english={english} value={channel.paymentClosesAt} />
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
