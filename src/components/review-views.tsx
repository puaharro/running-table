"use client";

import { useId, useRef, useState, type ReactNode } from "react";

export function ReviewViews({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(0);
  const id = useId();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  return (
    <div className="review-views">
      <div className="review-tabs" role="tablist" aria-label="評論來源">
        {["編輯點評", "跑手心得"].map((label, index) => (
          <button
            key={label}
            ref={(el) => {
              buttons.current[index] = el;
            }}
            type="button"
            role="tab"
            id={`${id}-tab-${index}`}
            aria-controls={`${id}-panel-${index}`}
            aria-selected={active === index}
            tabIndex={active === index ? 0 : -1}
            onClick={() => setActive(index)}
            onKeyDown={(event) => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
              event.preventDefault();
              const next = event.key === "Home" ? 0 : event.key === "End" ? 1 : 1 - index;
              setActive(next);
              buttons.current[next]?.focus();
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`${id}-panel-0`}
        aria-labelledby={`${id}-tab-0`}
        hidden={active !== 0}
        tabIndex={0}
      >
        {children}
      </div>
      <div
        role="tabpanel"
        id={`${id}-panel-1`}
        aria-labelledby={`${id}-tab-1`}
        hidden={active !== 1}
        tabIndex={0}
      >
        <p className="review-empty">暫未開放公開投稿，未有已發布跑手心得。</p>
        <p className="review-empty">編輯點評與跑手心得分開呈現，不合併計分。</p>
      </div>
    </div>
  );
}
