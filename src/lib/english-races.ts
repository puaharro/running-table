import type { RegistrationStatus } from "./types";

export const englishChannels = {
  general: "General entry",
  priority: "Priority entry",
  charity: "Charity entry",
  hotel: "Accommodation package",
};

const distanceNames: Record<string, string> = {
  全馬: "Marathon",
  半馬: "Half marathon",
  其他: "Other",
};
export function englishDistanceTag(label: string) {
  return distanceNames[label] ?? label;
}

export function language(english: boolean) {
  return (chinese: string, translation: string) => (english ? translation : chinese);
}

export function localPath(path: string, english: boolean) {
  return english && path.startsWith("/") && !path.startsWith("//") ? `/en${path}` : path;
}

export const englishStatus: Record<RegistrationStatus, string> = {
  open: "Accepting entries",
  upcoming: "Not yet open",
  waitlist: "Waiting list",
  full: "Full",
  closed: "Closed",
  unknown: "Not verified",
};

export function englishDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Hong_Kong",
  }).format(new Date(date));
}

export function englishTimestamp(date: string) {
  return (
    new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Hong_Kong",
    }).format(new Date(date)) + " HKT"
  );
}

export function englishDistance(km: number) {
  if (Math.abs(km - 42.195) < 0.1) return "Marathon";
  if (Math.abs(km - 21.0975) < 0.1) return "Half marathon";
  return `${km} km`;
}
