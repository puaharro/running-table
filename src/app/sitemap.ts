import type { MetadataRoute } from "next";
import { publicRaces as races } from "@/data/races";
import { guides } from "@/data/guides";
import { raceHref } from "@/lib/site";
import { releaseSettings } from "@/lib/release";
export const dynamic = "force-static";
export default function sitemap(): MetadataRoute.Sitemap {
  if (!releaseSettings.indexable || !releaseSettings.origin) return [];
  const origin = releaseSettings.origin;
  return [
    "/",
    "/races/",
    "/guides/",
    "/about/",
    "/ratings/",
    "/ratings/process/",
    "/privacy/",
    ...guides.map((g) => `/guides/${g.slug}/`),
  ]
    .map((path) => ({ url: new URL(path, releaseSettings.origin).toString() }))
    .concat(
      races.map((r) => ({
        url: new URL(raceHref(r), releaseSettings.origin).toString(),
        lastModified: r.updatedAt,
      })),
    )
    .flatMap((entry) => {
      const englishUrl = new URL(`/en${new URL(entry.url).pathname}`, origin).toString();
      const alternates = { languages: { "zh-HK": entry.url, en: englishUrl } };
      return [
        { ...entry, alternates },
        { ...entry, url: englishUrl, alternates },
      ];
    });
}
