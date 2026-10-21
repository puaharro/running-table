import type { MetadataRoute } from "next";
export const dynamic = "force-static";
// Prototype routes are noindex and intentionally excluded until factual content is reviewed.
export default function sitemap(): MetadataRoute.Sitemap { return []; }
