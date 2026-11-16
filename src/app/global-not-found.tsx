import type { Metadata } from "next";
import { Header } from "@/components/site-header";
import ChineseNotFound from "./(zh)/not-found";
import "./tokens.css";
import "./globals.css";
import "./refresh.css";
import "./components.css";

export const metadata: Metadata = { title: "找不到此頁面 | NXTGO", robots: { index: false } };

export default function GlobalNotFound() {
  return (
    <html lang="zh-HK">
      <body>
        <Header quickNavigation={null} missingPage />
        <ChineseNotFound />
      </body>
    </html>
  );
}
