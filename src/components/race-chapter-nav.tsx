"use client";

import { useEffect, useState } from "react";

type Chapter = { id: string; label: string };

export function RaceChapterNav({
  chapters,
  compact = false,
}: {
  chapters: Chapter[];
  compact?: boolean;
}) {
  const [active, setActive] = useState(chapters[0]?.id);

  useEffect(() => {
    const targets = chapters.flatMap(({ id }) => {
      const target = document.getElementById(id);
      return target ? [target] : [];
    });
    let frame = 0;
    function measure() {
      frame = 0;
      const scrollPadding =
        Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
      let current = targets[0]?.id;
      for (const target of targets) {
        const scrollMargin = Number.parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
        if (target.getBoundingClientRect().top <= scrollPadding + scrollMargin + 8) {
          current = target.id;
        }
      }
      setActive(current);
    }
    function schedule() {
      if (!frame) frame = window.requestAnimationFrame(measure);
    }
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    document.addEventListener("toggle", schedule, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("toggle", schedule, true);
    };
  }, [chapters]);

  return (
    <nav
      className={compact ? "race-contents race-contents-compact" : "race-contents"}
      aria-label="頁內目錄"
    >
      {!compact && <h2>頁內目錄</h2>}
      {chapters.map(({ id, label }) => (
        <a key={id} href={`#${id}`} aria-current={active === id ? "location" : undefined}>
          {label}
        </a>
      ))}
    </nav>
  );
}
