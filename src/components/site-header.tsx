"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import { siteName } from "@/lib/site";
import { SiteNavigation } from "./site-navigation";

export function Header({ quickNavigation }: { quickNavigation: ReactNode }) {
  const menu = useRef<HTMLDivElement>(null);

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
        跳到主要內容
      </a>
      <header className="site-header">
        <div className="shell header-inner">
          <Link className="brand" href="/" aria-label={`${siteName} 首頁`}>
            <span className="brand-mark" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span className="brand-wordmark">{siteName}</span>
          </Link>
          {quickNavigation}
          <SiteNavigation />
          <button
            type="button"
            className="site-menu-toggle"
            popoverTarget="site-menu"
            aria-label="主要導航選單"
          >
            <span aria-hidden="true" />
          </button>
          <div ref={menu} id="site-menu" className="site-menu" popover="auto">
            <SiteNavigation />
          </div>
        </div>
      </header>
      <div className="prototype-strip">
        資料核實提示 <span>報名狀態只對應所列渠道，付款前請向大會再次確認。</span>
      </div>
    </>
  );
}
