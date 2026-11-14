"use client";

import Link from "next/link";
import { favoriteResultsHref } from "@/lib/results-location";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./ui";

export type QuickDestination = {
  href: string;
  label: string;
  category: string;
  keywords?: string;
};

function normalize(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("zh-HK")
    .replace(/[\p{P}\s]/gu, "");
}

export function QuickNavigation({ destinations }: { destinations: QuickDestination[] }) {
  const [query, setQuery] = useState("");
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const search = normalize(query);
  const matches = search
    ? destinations
        .filter(({ label, category, keywords }) =>
          normalize(`${label} ${keywords ?? ""} ${category}`).includes(search),
        )
        .slice(0, 10)
    : destinations.slice(0, 5);

  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        event.repeat ||
        !(event.metaKey || event.ctrlKey) ||
        event.altKey ||
        event.shiftKey ||
        event.key.toLowerCase() !== "k" ||
        document.querySelector("dialog[open]")
      )
        return;
      event.preventDefault();
      trigger.current?.focus({ preventScroll: true });
      trigger.current?.click();
    }

    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);

  return (
    <div className="site-quick-navigation">
      <button
        ref={trigger}
        type="button"
        className="button quick-navigation-trigger"
        aria-haspopup="dialog"
        aria-keyshortcuts="Meta+K Control+K"
        onClick={() => {
          setQuery("");
          dialog.current?.showModal();
        }}
      >
        <span className="quick-navigation-icon">
          <Icon name="search" size={16} />
        </span>
        <span>快速前往</span>
      </button>
      <dialog
        className="nxtgo-dialog quick-navigation-dialog"
        ref={dialog}
        aria-labelledby="quick-navigation-title"
      >
        <div className="nxtgo-dialog-heading">
          <h2 id="quick-navigation-title">快速前往</h2>
          <button type="button" className="button" onClick={() => dialog.current?.close()}>
            關閉
          </button>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!matches[0]) return;
            dialog.current?.close();
            if (matches[0].href === favoriteResultsHref) {
              window.location.assign(favoriteResultsHref);
            } else {
              router.push(matches[0].href);
            }
          }}
        >
          <label htmlFor="quick-navigation-search" className="sr-only">
            搜尋賽事、指南或頁面
          </label>
          <input
            id="quick-navigation-search"
            type="search"
            autoFocus
            value={query}
            maxLength={100}
            placeholder="搜尋賽事、指南或頁面"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key !== "ArrowDown" ||
                !matches.length ||
                event.nativeEvent.isComposing ||
                event.nativeEvent.keyCode === 229
              )
                return;
              event.preventDefault();
              dialog.current?.querySelector<HTMLElement>(".quick-navigation-results a")?.focus();
            }}
          />
        </form>
        <p className={matches.length ? "sr-only" : undefined} role="status">
          {matches.length ? `顯示 ${matches.length} 個選項` : "搵唔到相符結果。"}
        </p>
        <ul
          className="quick-navigation-results"
          onKeyDown={(event) => {
            if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
            const links = Array.from(event.currentTarget.querySelectorAll("a"));
            const index = links.indexOf(document.activeElement as HTMLAnchorElement);
            if (index < 0) return;
            event.preventDefault();
            const next = index + (event.key === "ArrowDown" ? 1 : -1);
            if (next < 0) dialog.current?.querySelector("input")?.focus();
            else links[next]?.focus();
          }}
        >
          {matches.map(({ href, label, category }) => {
            const content = (
              <>
                <span>{label}</span>
                <small>{category}</small>
              </>
            );
            const close = () => dialog.current?.close();
            return (
              <li key={href}>
                {href === favoriteResultsHref ? (
                  <a href={href} onClick={close}>
                    {content}
                  </a>
                ) : (
                  <Link href={href} prefetch={false} onClick={close}>
                    {content}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </dialog>
    </div>
  );
}
