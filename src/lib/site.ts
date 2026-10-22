import type { Metadata } from "next";
import type { Race } from "./types";
export const siteName = "NXTGO";
export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
export const raceHref = (race: Race) => `/races/${race.date.slice(0, 4)}/${race.slug}/`;
export const pageMetadata = (title: string, description: string, path: string): Metadata => ({
  title: { absolute: `${title}｜${siteName}` },
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
