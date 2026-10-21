export const regions = ["港島", "九龍", "新界", "離島"] as const;
export const distanceOptions = ["5K", "10K", "半馬", "全馬", "其他"] as const;
export const registrationLabels = {
  open: "開放中", upcoming: "未開放", waitlist: "候補", full: "額滿", closed: "已截止", unknown: "待核實",
} as const;
export type RegistrationStatus = keyof typeof registrationLabels;
export type Region = typeof regions[number];
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
}
export interface Race {
  id: string;
  slug: string;
  name: string;
  englishName: string;
  date: string;
  endDate: string;
  region: Region;
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
