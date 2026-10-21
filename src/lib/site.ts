import type { Metadata } from "next";
import type { Race } from "./types";
export const siteName = "跑期 RunDates";
export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
export const raceHref = (race: Race) => `/races/${race.date.slice(0, 4)}/${race.slug}/`;
export const pageMetadata = (title: string, description: string, path: string): Metadata => ({
  title,
  description,
  ...(siteUrl ? { alternates: { canonical: new URL(path, siteUrl).toString() } } : {}),
  openGraph: {
    title: `${title}｜${siteName}`,
    description,
    locale: "zh_HK",
    type: "website",
    ...(siteUrl ? { url: new URL(path, siteUrl).toString() } : {}),
  },
});
