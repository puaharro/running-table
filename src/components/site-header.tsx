"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { siteName } from "@/lib/site";
import { SiteNavigation } from "./site-navigation";

export function Header({ quickNavigation }: { quickNavigation: ReactNode }) {
  const pathname = usePathname();
  const isCalendar = pathname === "/races" || pathname === "/races/";
  const notice = (
    <div className="prototype-strip">
      資料核實提示 <span>報名狀態只對應所列渠道，付款前請向大會再次確認。</span>
    </div>
  );

  return (
    <>
      <a className="skip-link" href="#main">
        跳到主要內容
      </a>
      {!isCalendar && notice}
      <header className={isCalendar ? "site-header site-header--calendar" : "site-header"}>
        <div className="shell header-inner">
          <Link className="brand" href="/" aria-label={`${siteName} 首頁`}>
            <span className="brand-mark" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span className="brand-wordmark">{siteName}</span>
          </Link>
          {isCalendar && quickNavigation}
          <SiteNavigation />
          {isCalendar ? (
            <>
              <button
                type="button"
                className="calendar-site-menu-toggle"
                popoverTarget="calendar-site-menu"
                aria-label="主要導航選單"
              >
                <span aria-hidden="true" />
              </button>
              <div id="calendar-site-menu" className="calendar-site-menu" popover="auto">
                <SiteNavigation />
              </div>
            </>
          ) : (
            quickNavigation
          )}
        </div>
      </header>
      {isCalendar && notice}
    </>
  );
}
