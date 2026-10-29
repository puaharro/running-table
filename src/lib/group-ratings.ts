import type { Race, RaceGroup, Source } from "./types";
import { cutoffBand, distanceBand, distanceCriteria, ratingPolicy } from "./rating-policy";

export const ratingMethodVersion = ratingPolicy.version;
export type GroupRating = { title: string; value: string; basis: string; sources: Source[] };
function groupSources(race: Race, group: RaceGroup, field: "limit" | "distanceKm") {
  if (race.verification !== "verified") return [];
  return (race.sources ?? []).filter(
    (s) =>
      group.sourceIds?.includes(s.id) &&
      s.fields.some(
        (f) => f === `groups.${field}` || new RegExp(`^groups\\.[^.]+\\.${field}$`).test(f),
      ),
  );
}
export function groupEntryLabel(race: Race, group: RaceGroup) {
  const evidence = group.ratingEvidence;
  if (
    !evidence?.entry ||
    !groupSources(race, group, "limit").some((s) => evidence.sourceIds.includes(s.id))
  )
    return "參加資格未完整核對";
  return {
    open: "須符合官方年齡及組別要求",
    restricted: "另有成績或參賽條件",
    youth: "只限指定年齡少年",
    mixed: "資格依參加類別／渠道而異",
  }[evidence.entry];
}
export function groupRatings(race: Race, group: RaceGroup): GroupRating[] {
  const evidence = group.ratingEvidence;
  const linked = (race.sources ?? []).filter((s) => evidence?.sourceIds.includes(s.id));
  const distanceSources = groupSources(race, group, "distanceKm");
  const distanceKnown =
    distanceSources.length > 0 && Number.isFinite(group.distanceKm) && group.distanceKm > 0;
  const limitSources = groupSources(race, group, "limit").filter((s) =>
    evidence?.sourceIds.includes(s.id),
  );
  const cutoff = evidence?.cutoffMinutes;
  let time = "未評";
  let timeBasis =
    evidence?.entry === "mixed"
      ? "此組資格或時限依參加類別而異，尚未有適用同一比較範圍的單一已核對時限。"
      : "缺少已核對距離或單一組別總時限，暫不比較。";
  if (
    distanceKnown &&
    limitSources.length &&
    cutoff !== undefined &&
    Number.isFinite(cutoff) &&
    cutoff > 0
  ) {
    const pace = cutoff / group.distanceKm;
    const seconds = Math.round(pace * 60);
    time = cutoffBand(pace);
    timeBasis = `${group.distanceKm} km，總時限${cutoff}分鐘，平均每公里容許約${Math.floor(seconds / 60)}分${String(seconds % 60).padStart(2, "0")}秒。按未四捨五入的數值分級；只比較時限，不因距離或資格扣分。途中截點可能更嚴格，不能視作建議配速或完賽保證。`;
  }
  const transportSources =
    race.verification === "verified" ? linked.filter((s) => s.fields.includes("transport")) : [];
  const profile = evidence?.transport
    ? ratingPolicy.transportProfiles[evidence.transport]
    : undefined;
  const transportKnown = transportSources.length > 0 && profile;
  return [
    {
      title: "時限寬鬆度",
      value: time,
      basis: timeBasis,
      sources:
        time === "未評"
          ? limitSources
          : [...new Map([...distanceSources, ...limitSources].map((s) => [s.id, s])).values()],
    },
    {
      title: "距離負荷",
      value: distanceKnown ? distanceBand(group.distanceKm) : "未評",
      basis: distanceKnown
        ? `${group.distanceKm} km。${distanceCriteria()}。只比較距離，未納入爬升、路面及天氣；低負荷不代表適合所有跑手。`
        : "距離缺少已核對的組別來源，暫不分級。",
      sources: distanceSources,
    },
    {
      title: "集合交通要求",
      value: transportKnown ? profile.label : "未評",
      basis: transportKnown
        ? `${profile.explanation}${evidence!.note}`
        : "未有足夠的組別集合時間及交通／接駁依據；不按市區位置估計便利程度。",
      sources: transportKnown ? transportSources : [],
    },
  ];
}
