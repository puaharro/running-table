import { races } from "./races";
import { guides } from "./guides";
import { raceHref } from "@/lib/site";
import type { FocusSlide } from "@/components/home-focus-banner";

// Editorial placements only. A future paid placement must use kind: "sponsored"
// and name its sponsor; it must not be presented as an editorial recommendation.
export const homeFocusSlides: FocusSlide[] = [
  ...[
    {
      id: "standard-chartered-hk-marathon-2027",
      graphic: "42.2",
      tone: "green" as const,
      description: "全馬、半馬、10K。由各組起點到報名渠道，計劃你嘅下一場城市挑戰。",
    },
    {
      id: "hzmb-half-marathon-2026",
      graphic: "21.1",
      tone: "blue" as const,
      description: "半馬定 10K？先了解組別資料、集合與接駁安排，再計劃你嘅大橋賽事。",
    },
  ].flatMap((entry) => {
    const race = races.find((race) => race.id === entry.id && race.status === "scheduled");
    return race
      ? [
          {
            id: race.id,
            kind: "editorial" as const,
            category: "焦點賽事",
            date: race.date,
            title: race.name,
            description: entry.description,
            href: raceHref(race),
            action: "查看賽事資料",
            graphic: entry.graphic,
            location: "HONG KONG",
            tone: entry.tone,
            validUntil: race.endDate,
          },
        ]
      : [];
  }),
  ...guides
    .filter((guide) => guide.slug === "choose-your-first-10k")
    .map((guide) => ({
      id: guide.slug,
      kind: "editorial" as const,
      category: "選賽資訊 · 原創指南",
      title: guide.title,
      description: guide.description,
      href: `/guides/${guide.slug}/`,
      action: "閱讀選賽指南",
      graphic: "10K",
      location: "YOUR FIRST START",
      tone: "sand" as const,
    })),
];
