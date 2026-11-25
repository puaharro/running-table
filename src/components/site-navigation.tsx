"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  ["/", "首頁", "首頁", "Home"],
  ["/races/", "賽事搜尋／時間表", "時間表", "Calendar"],
  ["/ratings/", "跑手分享", "分享", "Runner accounts"],
  ["/guides/", "報名及選賽指南", "指南", "Guides"],
  ["/about/", "關於 NXTGO", "關於", "About"],
] as const;

export function SiteNavigation({ english = false }: { english?: boolean }) {
  const pathname = usePathname();
  const section = english ? pathname.replace(/^\/en(?=\/|$)/, "") || "/" : pathname;
  return (
    <nav aria-label={english ? "Main navigation" : "主要導航"}>
      {links.map(([href, label, compactLabel, englishLabel]) => (
        <Link
          key={href}
          href={english ? `/en${href}` : href}
          onClick={(event) => {
            event.currentTarget.closest<HTMLElement>("[popover]")?.hidePopover();
          }}
          aria-current={
            href === "/"
              ? section === "/"
                ? "page"
                : undefined
              : section === href.slice(0, -1) || section.startsWith(href)
                ? "page"
                : undefined
          }
        >
          <span className="nav-label-full">{english ? englishLabel : label}</span>
          <span className="nav-label-compact">{english ? englishLabel : compactLabel}</span>
        </Link>
      ))}
    </nav>
  );
}
