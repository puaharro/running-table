// Editorial comparison rules. Change the version whenever criteria change.
// These are comparison labels, not a validated model of overall race difficulty.
export const ratingPolicy = {
  version: "2026-10-30-v2",
  publisher: "NXTGO 編輯",
  cutoffBands: [
    { minimumMinutesPerKm: 10, label: "寬鬆" },
    { minimumMinutesPerKm: 9, label: "較寬鬆" },
    { minimumMinutesPerKm: 8, label: "一般" },
    { minimumMinutesPerKm: 7, label: "較緊" },
    { minimumMinutesPerKm: 0, label: "緊" },
  ],
  distanceBands: [
    { maximumKm: 5, label: "低" },
    { maximumKm: 21.1, label: "中" },
    { maximumKm: Infinity, label: "高" },
  ],
  transportProfiles: {
    "organizer-shuttle": {
      label: "需大會接駁",
      explanation:
        "須先到指定集合點，再乘大會接駁；需接駁不代表服務較差，前往集合點的路程及班次未納入比較。",
    },
    "special-service-required": {
      label: "需特別交通安排",
      explanation: "集合早於已列常規列車服務時段，須另作安排；未確認特別巴士班次或餘額。",
    },
  },
  fullDifficultyMissing: ["路面及技術要求", "累積爬升／下降", "途中截點", "補給及環境條件"],
} as const;

export function cutoffBand(minutesPerKm: number) {
  return ratingPolicy.cutoffBands.find((band) => minutesPerKm >= band.minimumMinutesPerKm)!.label;
}
export function distanceBand(km: number) {
  return ratingPolicy.distanceBands.find((band) => km <= band.maximumKm)!.label;
}
export function cutoffCriteria() {
  return ratingPolicy.cutoffBands
    .map((band, index) => {
      const higher = ratingPolicy.cutoffBands[index - 1];
      const range = !higher
        ? `${band.minimumMinutesPerKm}分鐘或以上`
        : band.minimumMinutesPerKm === 0
          ? `不足${higher.minimumMinutesPerKm}分鐘`
          : `${band.minimumMinutesPerKm}至不足${higher.minimumMinutesPerKm}分鐘`;
      return `${range}：${band.label}`;
    })
    .join("；");
}
export function distanceCriteria() {
  return ratingPolicy.distanceBands
    .map((band, index) => {
      const lower = ratingPolicy.distanceBands[index - 1];
      const range = !lower
        ? `${band.maximumKm} km或以下`
        : !Number.isFinite(band.maximumKm)
          ? `超過${lower.maximumKm} km`
          : `超過${lower.maximumKm}至${band.maximumKm} km`;
      return `${range}：${band.label}`;
    })
    .join("；");
}
