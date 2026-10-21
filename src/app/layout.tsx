import type { Metadata, Viewport } from "next";
import { Header, Footer } from "@/components/ui";
import { AdFrame } from "@/components/ad-frame";
import { siteName, siteUrl } from "@/lib/site";
import { assertReleaseReady, releaseSettings } from "@/lib/release";
import "./globals.css";

assertReleaseReady();

export const metadata: Metadata = {
  title: { default: `${siteName}｜香港路跑賽事資訊`, template: `%s｜${siteName}` },
  description:
    "一頁掌握香港路跑賽事，按日期、距離、地區及報名狀態搵下一場比賽。附官方來源、核實時間及原創選賽指南。",
  robots: { index: releaseSettings.indexable, follow: true },
  ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#102d3b" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-HK">
      <body>
        <AdFrame>
          <Header />
          {children}
          <Footer />
        </AdFrame>
      </body>
    </html>
  );
}
