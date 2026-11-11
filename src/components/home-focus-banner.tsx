"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import { Icon } from "./ui";
import { useClock } from "@/lib/use-clock";
import { displayDate, hongKongToday } from "@/lib/races";

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
  date?: string;
} & ({ kind: "editorial"; category: string } | { kind: "sponsored"; sponsorName: string });

function slideStep(track: HTMLDivElement) {
  const [first, second] = track.children;
  return second
    ? second.getBoundingClientRect().left - first.getBoundingClientRect().left
    : track.clientWidth;
}

export function HomeFocusBanner({
  slides,
  initialNow,
}: {
  slides: FocusSlide[];
  initialNow: string;
}) {
  const now = useClock(initialNow);
  const reduceMotion = useReducedMotion();
  const today = hongKongToday(new Date(now));
  const available = slides.filter((slide) => !slide.validUntil || slide.validUntil >= today);
  const [activeId, setActiveId] = useState(slides[0]?.id);
  const [settledId, setSettledId] = useState<string | null>(null);
  const track = useRef<HTMLDivElement>(null);
  const measuredStep = useRef(0);
  const currentSlide = useRef(0);
  const targetSlide = useRef<number | null>(null);
  const settleTimer = useRef<number | undefined>(undefined);
  const active = Math.max(
    0,
    available.findIndex((slide) => slide.id === activeId),
  );
  const availabilityKey = available.map((slide) => slide.id).join(":");
  const firstId = available[0]?.id;
  useEffect(() => {
    const node = track.current;
    setActiveId(firstId);
    setSettledId(null);
    currentSlide.current = 0;
    targetSlide.current = null;
    if (!node) return;
    measuredStep.current = slideStep(node);
    node.scrollTo({ left: 0, behavior: "instant" });

    const observer = new ResizeObserver(() => {
      const step = slideStep(node);
      if (!step || Math.abs(step - measuredStep.current) < 0.5) return;
      measuredStep.current = step;
      const index = targetSlide.current ?? currentSlide.current;
      node.scrollTo({ left: index * step, behavior: "instant" });
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
      window.clearTimeout(settleTimer.current);
    };
  }, [availabilityKey, firstId]);
  if (!available.length) return null;

  function show(index: number) {
    const node = track.current;
    if (!node || !available[index]) return;
    const left = index * slideStep(node);
    if (targetSlide.current === null && Math.abs(node.scrollLeft - left) < 1) return;
    window.clearTimeout(settleTimer.current);
    setSettledId(null);
    targetSlide.current = index;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    node.scrollTo({
      left,
      behavior: reducedMotion ? "instant" : "smooth",
    });
  }

  return (
    <section
      className="shell home-focus-banner"
      aria-label="焦點賽事及資訊"
      aria-roledescription="輪播"
      data-multiple={available.length > 1}
    >
      <div
        className="focus-banner-track"
        id="home-focus-track"
        ref={track}
        tabIndex={0}
        onPointerDown={() => {
          targetSlide.current = null;
        }}
        onWheel={() => {
          targetSlide.current = null;
        }}
        onScroll={(event) => {
          const node = event.currentTarget;
          const step = slideStep(node);
          if (!step || Math.abs(step - measuredStep.current) >= 0.5) return;
          const index = Math.round(node.scrollLeft / step);
          const aligned = Math.abs(node.scrollLeft - index * step) < 1;
          if (aligned && index === targetSlide.current) {
            targetSlide.current = null;
          }
          window.clearTimeout(settleTimer.current);
          setSettledId(null);
          const next = available[index];
          if (next && index !== currentSlide.current) {
            currentSlide.current = index;
            setActiveId(next.id);
          }
          if (next && aligned && targetSlide.current === null) {
            settleTimer.current = window.setTimeout(() => setSettledId(next.id), 100);
          }
        }}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          const destinations: Record<string, number> = {
            ArrowLeft: Math.max(0, (targetSlide.current ?? active) - 1),
            ArrowRight: Math.min(available.length - 1, (targetSlide.current ?? active) + 1),
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
            data-settled={settledId === slide.id}
            inert={index !== active}
          >
            <div className="focus-banner-copy">
              <span className="focus-banner-category">
                {slide.kind === "sponsored" ? `贊助 · ${slide.sponsorName}` : slide.category}
              </span>
              <h2>{slide.title}</h2>
              {slide.date && (
                <time className="focus-banner-date" dateTime={slide.date}>
                  <Icon name="calendar" size={16} />
                  {displayDate(slide.date, { year: "numeric" })}
                </time>
              )}
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
          <LayoutGroup>
            {available.map((slide, index) => (
              <button
                key={slide.id}
                aria-label={`顯示第 ${index + 1} 張：${slide.title}`}
                aria-pressed={active === index}
                onClick={() => show(index)}
              >
                <span />
                {active === index && (
                  <motion.span
                    className="focus-banner-active-marker"
                    layoutId={reduceMotion ? undefined : "focus-banner-active"}
                    transition={{ layout: { duration: 0.22, ease: "easeOut" } }}
                  />
                )}
              </button>
            ))}
          </LayoutGroup>
        </div>
      </div>
    </section>
  );
}
