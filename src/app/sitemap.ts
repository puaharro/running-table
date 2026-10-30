import type { MetadataRoute } from "next";
import { races } from "@/data/races";
import { guides } from "@/data/guides";
import { raceHref } from "@/lib/site";
import { releaseSettings } from "@/lib/release";
export const dynamic = "force-static";
export default function sitemap(): MetadataRoute.Sitemap {
  if (!releaseSettings.indexable || !releaseSettings.origin) return [];
  return [
    "/",
    "/races/",
    "/guides/",
    "/about/",
    "/ratings/",
    "/privacy/",
    ...guides.map((g) => `/guides/${g.slug}/`),
  ]
    .map((path) => ({ url: new URL(path, releaseSettings.origin).toString() }))
    .concat(
      races.map((r) => ({
        url: new URL(raceHref(r), releaseSettings.origin).toString(),
        lastModified: r.updatedAt,
      })),
    );
}
