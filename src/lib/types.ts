export const regions = ["港島", "九龍", "新界", "離島"] as const;
export const distanceOptions = ["5K", "10K", "半馬", "全馬", "其他"] as const;
export const registrationLabels = {
  open: "開放中",
  upcoming: "未開放",
  waitlist: "候補",
  full: "額滿",
  closed: "已截止",
  unknown: "待核實",
} as const;
export type RegistrationStatus = keyof typeof registrationLabels;
export type Region = (typeof regions)[number];
export interface Source {
  id: string;
  title: string;
  url: string;
  checkedAt: string;
  fields: string[];
  note?: string;
}
export interface RaceGroup {
  id: string;
  name: string;
  distanceKm: number;
  date: string;
  endDate?: string;
  price: number | null;
  status: RegistrationStatus;
  registrationStart?: string;
  deadline?: string;
  limit?: string;
  startTime?: string;
  registrationUrl?: string;
  registrationOpensAt?: string;
  registrationClosesAt?: string;
  registrationVerifiedAt?: string;
  registrationMethod?: string;
  registrationNote?: string;
  priceNote?: string;
  region?: Region | null;
  venue?: string;
  sourceIds?: string[];
}
export interface Race {
  id: string;
  slug: string;
  name: string;
  englishName: string;
  date: string;
  endDate: string;
  region: Region | null;
  district: string;
  venue: string;
  sport: "路跑";
  tags: string[];
  status: "scheduled" | "postponed" | "cancelled" | "completed";
  organizer: string;
  summary: string;
  highlights: string[];
  transport: string;
  groups: RaceGroup[];
  sourceUrl: string | null;
  updatedAt: string;
  verification: "demo" | "verified" | "pending";
  publication?: "draft" | "published";
  verifiedAt?: string;
  sources?: Source[];
  changes?: { date: string; note: string }[];
}
export interface Filters {
  q: string;
  from: string;
  to: string;
  distances: string[];
  min: string;
  max: string;
  regions: string[];
  sports: string[];
  statuses: RegistrationStatus[];
  view: "upcoming" | "all" | "past";
  sort: "date" | "deadline" | "recent";
}
