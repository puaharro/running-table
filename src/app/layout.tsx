import type { Metadata, Viewport } from "next";
import { Header, Footer } from "@/components/ui";
import { siteName, siteUrl } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: `${siteName}｜香港路跑賽事資訊`, template: `%s｜${siteName}` },
  description: "一頁掌握香港路跑賽事，按日期、距離、地區及報名狀態搵下一場比賽。開發原型，賽事均為示範資料。",
  robots: { index: false, follow: true },
  ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#102d3b" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-HK"><body><Header/>{children}<Footer/></body></html>;
}
