"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { Icon } from "./ui";

export function RaceBackToSearch({ searchBar }: { searchBar: RefObject<HTMLDivElement | null> }) {
  const button = useRef<HTMLButtonElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 767px)");
    let frame = 0;

    function measure() {
      frame = 0;
      const search = searchBar.current?.getBoundingClientRect();
      if (!search || !mobile.matches) {
        setVisible(false);
        return;
      }
      setVisible(search.bottom < 0);
      const start = window.scrollY + search.top;
      const range = document.documentElement.scrollHeight - window.innerHeight - start;
      const progress = range > 0 ? Math.min(1, Math.max(0, -search.top / range)) : 0;
      button.current?.style.setProperty("--calendar-progress", `${progress * 100}%`);
    }

    function schedule() {
      if (!frame) frame = window.requestAnimationFrame(measure);
    }

    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const observer = new ResizeObserver(schedule);
    observer.observe(document.body);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, [searchBar]);

  return (
    <button
      className="calendar-back-to-search"
      type="button"
      hidden={!visible}
      ref={button}
      aria-label="返回搜尋賽事"
      onClick={(event) => {
        const search = searchBar.current;
        const keyboard = event.detail === 0;
        if (keyboard) search?.querySelector("input")?.focus({ preventScroll: true });
        search?.scrollIntoView({
          block: "start",
          behavior:
            keyboard || window.matchMedia("(prefers-reduced-motion: reduce)").matches
              ? "instant"
              : "smooth",
        });
      }}
    >
      <Icon name="arrow" size={20} />
    </button>
  );
}
