"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { siteName } from "@/lib/site";
import { SiteNavigation } from "./site-navigation";

export function Header({
  quickNavigation,
  english = false,
  missingPage = false,
}: {
  quickNavigation: ReactNode;
  english?: boolean;
  missingPage?: boolean;
}) {
  const menu = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const alternate = missingPage
    ? "/en/"
    : english
      ? pathname.replace(/^\/en(?=\/|$)/, "") || "/"
      : `/en${pathname}`;

  useEffect(() => {
    const narrow = window.matchMedia("(width < 768px)");
    function closeOnWiderScreen(event: MediaQueryListEvent) {
      if (!event.matches) menu.current?.hidePopover?.();
    }
    narrow.addEventListener("change", closeOnWiderScreen);
    return () => narrow.removeEventListener("change", closeOnWiderScreen);
  }, []);

  return (
    <>
      <a className="skip-link" href="#main">
        {english ? "Skip to main content" : "跳到主要內容"}
      </a>
      <header className="site-header">
        <div className="shell header-inner">
          <Link
            className="brand"
            href={english ? "/en/" : "/"}
            aria-label={english ? "NXTGO home" : `${siteName} 首頁`}
          >
            <span className="brand-mark" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span className="brand-wordmark">{siteName}</span>
          </Link>
          {quickNavigation}
          <SiteNavigation english={english} />
          <button
            type="button"
            className="site-menu-toggle"
            popoverTarget="site-menu"
            aria-label={english ? "Open main navigation" : "主要導航選單"}
          >
            <span aria-hidden="true" />
          </button>
          <div ref={menu} id="site-menu" className="site-menu" popover="auto">
            <SiteNavigation english={english} />
          </div>
          <a
            className="site-language"
            href={alternate}
            hrefLang={english ? "zh-HK" : "en"}
            lang={english ? "zh-HK" : "en"}
            onClick={(event) => {
              if (
                missingPage ||
                event.button !== 0 ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
              )
                return;
              const { search, hash } = window.location;
              if (!search && !hash) return;
              event.preventDefault();
              window.location.assign(alternate + search + hash);
            }}
          >
            {english ? "中文" : "EN"}
          </a>
        </div>
      </header>
      <div className="prototype-strip">
        {english ? "Registration notice" : "資料核實提示"}{" "}
        <span>
          {english
            ? "Registration status applies only to the listed entry channels. Confirm with the organiser before paying."
            : "報名狀態只對應所列渠道，付款前請向大會再次確認。"}
        </span>
      </div>
    </>
  );
}
