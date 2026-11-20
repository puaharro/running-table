import type { Metadata, Viewport } from "next";
import { Header } from "@/components/site-header";
import { QuickNavigation } from "@/components/quick-navigation";
import { publicRaces } from "@/data/races";
import { englishGuides } from "@/data/guides.en";
import { raceHref } from "@/lib/site";
import { assertReleaseReady, releaseSettings } from "@/lib/release";
import { Footer } from "@/components/ui";
import { AdFrame } from "@/components/ad-frame";
import "@fontsource-variable/inter/wght.css";
import "@fontsource-variable/noto-sans-hk";
import "@fontsource/barlow-condensed/latin-700.css";
import "../tokens.css";
import "../globals.css";
import "../refresh.css";
import "../components.css";
import "../site-header.css";

assertReleaseReady();

export const metadata: Metadata = {
  title: { default: "NXTGO", template: "%s | NXTGO" },
  robots: { index: releaseSettings.indexable, follow: true },
  ...(releaseSettings.origin ? { metadataBase: new URL(releaseSettings.origin) } : {}),
};
export const viewport: Viewport = { themeColor: "#ffffff" };

const destinations = [
  { href: "/en/races/", label: "Race calendar", category: "Page" },
  { href: "/en/races/?saved=1#race-list", label: "Saved races", category: "Page" },
  { href: "/en/ratings/", label: "Runner reviews", category: "Page" },
  { href: "/en/guides/", label: "Race guides", category: "Page" },
  { href: "/en/about/", label: "About NXTGO", category: "Page" },
  ...englishGuides.map((guide) => ({
    href: `/en/guides/${guide.slug}/`,
    label: guide.title,
    category: "Guide",
  })),
  ...publicRaces.map((race) => ({
    href: `/en${raceHref(race)}`,
    label: race.englishName,
    category: "Race",
    keywords: race.name,
  })),
];

export default function EnglishLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <AdFrame>
          <Header
            english
            quickNavigation={<QuickNavigation english destinations={destinations} />}
          />
          {children}
          <Footer english />
        </AdFrame>
      </body>
    </html>
  );
}
