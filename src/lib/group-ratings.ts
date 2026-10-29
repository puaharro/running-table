import type { Race, RaceGroup, Source } from "./types";

export const ratingMethodVersion = "2026-10-29-v1";
export type GroupRating = {
  title: string;
  value: string;
  basis: string;
  sources: Source[];
};
export function groupRatings(race: Race, group: RaceGroup): GroupRating[] {
  const sources = (ids: string[] = []) => (race.sources ?? []).filter((s) => ids.includes(s.id));
  const evidence = group.ratingEvidence;
  const linked = sources(evidence?.sourceIds);
  const distanceSources = sources(group.sourceIds).filter((s) =>
    s.fields.some((f) => f === "groups.distanceKm" || /^groups\.[^.]+\.distanceKm$/.test(f)),
  );
  const distanceKnown =
    race.verification === "verified" &&
    distanceSources.length > 0 &&
    Number.isFinite(group.distanceKm) &&
    group.distanceKm > 0;
  const km = group.distanceKm;
  let beginner = "未評";
  let beginnerBasis = "欠缺已核對的組別時限或參賽資格，不能只按短距離推定適合新手。";
  const limitEvidence = linked.some(
    (s) =>
      group.sourceIds?.includes(s.id) &&
      s.fields.some((f) => f === "groups.limit" || /^groups\.[^.]+\.limit$/.test(f)),
  );
  if (evidence?.entry === "youth") {
    beginnerBasis = "此組只供指定年齡少年參加，不套用一般新手評分。";
  } else if (evidence?.entry === "mixed") {
    beginnerBasis = "同組有不同資格或時限，須先確認參加類別，暫不合併評分。";
  } else if (distanceKnown && limitEvidence && evidence?.cutoffMinutes && evidence.entry) {
    const pace = evidence.cutoffMinutes / km;
    let score = pace >= 10 ? 5 : pace >= 9 ? 4 : pace >= 8 ? 3 : pace >= 7 ? 2 : 1;
    if (km > 21.1) score = 1;
    else if (km > 10) score = Math.min(score, 3);
    if (evidence.entry === "restricted") score = Math.min(score, 2);
    beginner = `${score} / 5`;
    beginnerBasis = `${km} km，總時限${evidence.cutoffMinutes}分鐘，平均每公里約${pace.toFixed(1)}分鐘。${evidence.note}只評時限及資格，未評爬升、補給或路線安全；途中截點仍須遵守官方安排。`;
  }
  let transport = "未評";
  let transportBasis = "未有足夠的組別集合時間、公共交通或接駁安排依據；不按市區位置推定便利。";
  if (race.verification === "verified" && linked.some((s) => s.fields.includes("transport"))) {
    if (evidence?.transport === "organizer-shuttle") {
      transport = "3 / 5";
      transportBasis = `須先到指定集合點，再乘大會接駁。${evidence.note}只評接駁要求；前往集合點的路程及班次未納入評分。`;
    } else if (evidence?.transport === "special-service-required") {
      transport = "1 / 5";
      transportBasis = `${evidence.note}集合早於已列常規列車可服務時段，須另作特別交通安排；未確認特別巴士班次或餘額。`;
    }
  }
  return [
    {
      title: "新手友善度",
      value: beginner,
      basis: beginnerBasis,
      sources:
        beginner === "未評"
          ? linked
          : [...new Map([...distanceSources, ...linked].map((s) => [s.id, s])).values()],
    },
    {
      title: "體能挑戰",
      value: distanceKnown ? (km <= 5 ? "低" : km <= 21.1 ? "中" : "高") : "未評",
      basis: distanceKnown
        ? `${km} km；距離基準：5 km或以下為低、超過5至21.1 km為中、超過21.1 km為高。未包含爬升、路面及天氣，低不代表無需訓練。`
        : "距離缺少已核對的組別來源，暫不分級。",
      sources: distanceSources,
    },
    {
      title: "交通便利度",
      value: transport,
      basis: transportBasis,
      sources: transport === "未評" ? [] : linked.filter((s) => s.fields.includes("transport")),
    },
  ];
}
