"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  ["/", "首頁", "首頁"],
  ["/races/", "賽事搜尋／時間表", "時間表"],
  ["/ratings/", "體驗評級", "評級"],
  ["/guides/", "報名及選賽指南", "指南"],
  ["/about/", "關於 NXTGO", "關於"],
] as const;

export function SiteNavigation() {
  const pathname = usePathname();
  return (
    <nav aria-label="主要導航">
      {links.map(([href, label, compactLabel]) => (
        <Link
          key={href}
          href={href}
          onClick={(event) => {
            event.currentTarget.closest<HTMLElement>("[popover]")?.hidePopover();
          }}
          aria-current={
            href === "/"
              ? pathname === "/"
                ? "page"
                : undefined
              : pathname === href.slice(0, -1) || pathname.startsWith(href)
                ? "page"
                : undefined
          }
        >
          <span className="nav-label-full">{label}</span>
          <span className="nav-label-compact">{compactLabel}</span>
        </Link>
      ))}
    </nav>
  );
}
