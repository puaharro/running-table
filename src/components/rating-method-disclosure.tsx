"use client";

import { useEffect, useState, type ReactNode } from "react";

export function RatingMethodDisclosure({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const reveal = () => {
      if (window.location.hash === "#method") setOpen(true);
    };
    const revealLink = (event: MouseEvent) => {
      const anchor = event.target instanceof Element ? event.target.closest("a") : null;
      if (anchor?.getAttribute("href") === "#method") setOpen(true);
    };
    reveal();
    window.addEventListener("hashchange", reveal);
    document.addEventListener("click", revealLink);
    return () => {
      window.removeEventListener("hashchange", reveal);
      document.removeEventListener("click", revealLink);
    };
  }, []);
  return (
    <details
      id="method"
      className="rating-method-details"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      tabIndex={-1}
    >
      <summary>了解評分準則及發布流程</summary>
      <div className="ratings-method-body">{children}</div>
    </details>
  );
}
