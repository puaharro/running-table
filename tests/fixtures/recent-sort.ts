import { races as fictionalRaces } from "./races";

// Fictional QA-only data. Never imported by product source or public catalog.
const rows = [
  ["old-year", "2025-12-31", "2027-01-01", 10, "組合"],
  ["tie-later", "2026-11-12", "2027-04-20", 10, ""],
  ["newest", "2026-11-13", "2027-03-01", 5, "組合"],
  ["old-month", "2026-09-30", "2027-02-01", 10, ""],
  ["tie-earlier", "2026-11-12", "2027-01-20", 10, ""],
  ["new-year", "2026-01-01", "2027-05-01", 10, ""],
  ["new-month", "2026-10-01", "2027-02-20", 10, ""],
  ["oldest", "2025-01-01", "2027-01-02", 5, ""],
  ["november", "2026-11-01", "2027-03-20", 10, "組合"],
  ["spring", "2026-02-01", "2027-06-01", 10, ""],
  ["summer", "2026-06-01", "2027-01-10", 10, ""],
  ["autumn", "2026-09-01", "2027-04-01", 10, ""],
] as const;

export const recentSortRaces = rows.map(([key, updatedAt, date, distanceKm, marker]) => {
  const base = structuredClone(fictionalRaces[0]);
  const id = `qa-recent-${key}`;
  return {
    ...base,
    id,
    slug: id,
    name: `測試資料｜${marker}${key}｜更新 ${updatedAt}`,
    englishName: `FICTIONAL QA ${key}`,
    date,
    endDate: date,
    updatedAt,
    venue: "虛構測試場地",
    organizer: "虛構測試資料",
    sourceUrl: null,
    sources: [],
    groups: [
      {
        ...base.groups[0],
        id: `${id}-group`,
        name: `${distanceKm}K 測試組`,
        date,
        distanceKm,
        channels: [],
      },
    ],
  };
});

// Explicit expectation independent of the production comparator.
export const expectedRecentIds = [
  "newest",
  "tie-earlier",
  "tie-later",
  "november",
  "new-month",
  "old-month",
  "autumn",
  "summer",
  "spring",
  "new-year",
  "old-year",
  "oldest",
].map((key) => `qa-recent-${key}`);
