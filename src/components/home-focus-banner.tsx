"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "./ui";
import { useClock } from "@/lib/use-clock";
import { hongKongToday } from "@/lib/races";

export type FocusSlide = {
  id: string;
  title: string;
  description: string;
  href: string;
  action: string;
  graphic: string;
  location: string;
  tone: "green" | "blue" | "sand";
  validUntil?: string;
} & ({ kind: "editorial"; category: string } | { kind: "sponsored"; sponsorName: string });

export function HomeFocusBanner({
  slides,
  initialNow,
}: {
  slides: FocusSlide[];
  initialNow: string;
}) {
  const now = useClock(initialNow);
  const today = hongKongToday(new Date(now));
  const available = slides.filter((slide) => !slide.validUntil || slide.validUntil >= today);
  const [activeId, setActiveId] = useState(slides[0]?.id);
  const track = useRef<HTMLDivElement>(null);
  const active = Math.max(
    0,
    available.findIndex((slide) => slide.id === activeId),
  );
  const availabilityKey = available.map((slide) => slide.id).join(":");
  const firstId = available[0]?.id;
  useEffect(() => {
    setActiveId(firstId);
    track.current?.scrollTo({ left: 0, behavior: "instant" });
  }, [availabilityKey, firstId]);
  if (!available.length) return null;

  function show(index: number) {
    const node = track.current;
    if (!node || !available[index]) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    node.scrollTo({
      left: index * node.clientWidth,
      behavior: reducedMotion ? "instant" : "smooth",
    });
  }

  return (
    <section
      className="shell home-focus-banner"
      aria-label="焦點賽事及資訊"
      aria-roledescription="輪播"
    >
      <div
        className="focus-banner-track"
        id="home-focus-track"
        ref={track}
        tabIndex={0}
        onScroll={(event) => {
          const node = event.currentTarget;
          const index = Math.round(node.scrollLeft / node.clientWidth);
          if (available[index]) setActiveId(available[index].id);
        }}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          const destinations: Record<string, number> = {
            ArrowLeft: Math.max(0, active - 1),
            ArrowRight: Math.min(available.length - 1, active + 1),
            Home: 0,
            End: available.length - 1,
          };
          if (event.key in destinations) {
            event.preventDefault();
            show(destinations[event.key]);
          }
        }}
      >
        {available.map((slide, index) => (
          <article
            key={slide.id}
            className={`focus-banner-slide focus-banner-slide--${slide.tone}`}
            role="group"
            aria-roledescription="投影片"
            aria-label={`${index + 1}／${available.length}：${slide.title}`}
            inert={index !== active}
          >
            <div className="focus-banner-copy">
              <span className="focus-banner-category">
                {slide.kind === "sponsored" ? `贊助 · ${slide.sponsorName}` : slide.category}
              </span>
              <h2>{slide.title}</h2>
              <p>{slide.description}</p>
              <Link href={slide.href} className="focus-banner-cta">
                {slide.action}
                <Icon name="arrow" size={20} />
              </Link>
            </div>
            <div className="focus-banner-art" aria-hidden="true">
              <span>{slide.location}</span>
              <strong>{slide.graphic}</strong>
              <i />
              <i />
              <i />
            </div>
          </article>
        ))}
      </div>
      <div className="focus-banner-controls">
        <span className="focus-banner-counter" aria-live="polite" aria-atomic="true">
          焦點 {active + 1}／{available.length}
        </span>
        <div className="focus-banner-dots" role="group" aria-label="選擇焦點內容">
          {available.map((slide, index) => (
            <button
              key={slide.id}
              aria-label={`顯示第 ${index + 1} 張：${slide.title}`}
              aria-pressed={active === index}
              onClick={() => show(index)}
            >
              <span />
            </button>
          ))}
        </div>
        <div className="focus-banner-arrows">
          <button
            aria-label="上一張焦點"
            aria-controls="home-focus-track"
            disabled={active === 0}
            onClick={() => show(active - 1)}
          >
            <span className="focus-prev">
              <Icon name="arrow" />
            </span>
          </button>
          <button
            aria-label="下一張焦點"
            aria-controls="home-focus-track"
            disabled={active === available.length - 1}
            onClick={() => show(active + 1)}
          >
            <Icon name="arrow" />
          </button>
        </div>
      </div>
    </section>
  );
}
