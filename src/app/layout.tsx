import type { Metadata, Viewport } from "next";
import { Header, Footer } from "@/components/ui";
import { publicRaces } from "@/data/races";
import { guides } from "@/data/guides";
import { QuickNavigation, type QuickDestination } from "@/components/quick-navigation";
import { AdFrame } from "@/components/ad-frame";
import { favoriteResultsHref } from "@/lib/results-location";
import { raceHref, siteName, siteUrl } from "@/lib/site";
import { assertReleaseReady, releaseSettings } from "@/lib/release";
import "@fontsource-variable/noto-sans-hk";
import "@fontsource-variable/inter/wght.css";
import "@fontsource/barlow-condensed/latin-700.css";
import "./tokens.css";
import "./globals.css";
import "./refresh.css";
import "./components.css";

assertReleaseReady();

const quickDestinations: QuickDestination[] = [
  { href: "/races/", label: "賽事搜尋／時間表", category: "頁面", keywords: "賽程 calendar" },
  { href: favoriteResultsHref, label: "我的收藏", category: "頁面" },
  { href: "/ratings/", label: "體驗評級", category: "頁面" },
  { href: "/guides/", label: "報名及選賽指南", category: "頁面" },
  { href: "/guides/race-registration-checklist/", label: "報名前清單", category: "指南" },
  ...guides
    .filter((guide) => guide.slug !== "race-registration-checklist")
    .map((guide) => ({
      href: `/guides/${guide.slug}/`,
      label: guide.title,
      category: "指南",
      keywords: guide.category,
    })),
  ...publicRaces.map((race) => ({
    href: raceHref(race),
    label: race.name,
    category: "賽事",
    keywords: `${race.englishName} ${race.district} ${race.slug.includes("standard-chartered") ? "渣馬 SCHKM" : ""}`,
  })),
];

export const metadata: Metadata = {
  title: { default: `${siteName}｜香港路跑賽事資訊`, template: `%s｜${siteName}` },
  description:
    "一頁掌握香港路跑賽事，按日期、距離、地區及報名狀態搵下一場比賽。附官方來源、核實時間及原創選賽指南。",
  robots: { index: releaseSettings.indexable, follow: true },
  ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#ffffff" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-HK" data-scroll-behavior="smooth">
      <body>
        <AdFrame>
          <Header quickNavigation={<QuickNavigation destinations={quickDestinations} />} />
          {children}
          <Footer />
        </AdFrame>
      </body>
    </html>
  );
}
