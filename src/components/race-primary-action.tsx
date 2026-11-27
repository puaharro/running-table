"use client";

import { language } from "@/lib/english-races";
import { clockTime, hongKongToday, statusSummary } from "@/lib/races";
import type { Race } from "@/lib/types";
import { useClock } from "@/lib/use-clock";
import { Icon } from "./ui";

export function RacePrimaryAction({
  race,
  initialNow,
  english,
  runnerAccountsHref,
  hasRaceDayInformation,
}: {
  race: Race;
  initialNow: string;
  english: boolean;
  runnerAccountsHref?: string;
  hasRaceDayInformation: boolean;
}) {
  const t = language(english);
  const now = useClock(initialNow);
  const today = hongKongToday(clockTime(now));
  const completed = race.status === "completed" || race.endDate < today;
  let action = {
    heading: t("賽事資料", "Race information"),
    label: t("查看賽事概覽", "View race overview"),
    href: "#race-about",
  };

  if (race.status === "cancelled" || race.status === "postponed") {
    action = {
      heading: t("賽事變更", "Race update"),
      label: t("查看資料來源", "View sources"),
      href: "#race-sources",
    };
  } else if (completed && runnerAccountsHref) {
    action = {
      heading: t("賽後回顧", "Race recap"),
      label: t("睇跑手分享", "Read runner accounts"),
      href: runnerAccountsHref,
    };
  } else if (statusSummary(race, race.groups, now).key === "open") {
    action = {
      heading: t("報名與組別", "Race entry and categories"),
      label: t("查看官方報名", "View official entry options"),
      href: "#registration-groups",
    };
  } else if (!completed && hasRaceDayInformation) {
    action = {
      heading: t("比賽日準備", "Race day preparation"),
      label: t("查看比賽日安排", "View race day information"),
      href: "#race-transport",
    };
  }

  return (
    <div className="race-primary-panel">
      <h2>{action.heading}</h2>
      <a className="button button-coral race-primary-cta" href={action.href}>
        {action.label} <Icon name="arrow" />
      </a>
    </div>
  );
}
