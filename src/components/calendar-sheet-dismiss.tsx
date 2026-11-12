"use client";

import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
} from "motion/react";
import { useEffect, useRef } from "react";

export function CalendarSheetDismiss() {
  const y = useMotionValue(0);
  const reduceMotion = useReducedMotion();
  const grip = useRef<HTMLDivElement>(null);
  const start = useRef(0);
  const animation = useRef<ReturnType<typeof animate> | null>(null);
  const sheet = () => grip.current?.closest("dialog");

  useMotionValueEvent(y, "change", (offset) => {
    const dialog = sheet();
    if (!dialog) return;
    dialog.style.translate = `0 ${offset}px`;
    const progress = Math.min(1, offset / Math.max(dialog.offsetHeight, 1));
    dialog.style.setProperty("--calendar-backdrop-opacity", String(0.5 * (1 - progress)));
  });
  useEffect(() => () => animation.current?.stop(), []);

  return (
    <form method="dialog" className="calendar-sheet-dismiss">
      <motion.div
        ref={grip}
        className="calendar-sheet-grip"
        aria-hidden="true"
        onPanStart={() => {
          animation.current?.stop();
          start.current = y.get();
        }}
        onPan={(_, { offset }) => {
          y.set(Math.max(0, start.current + offset.y));
        }}
        onPanEnd={(event, { velocity, offset }) => {
          const dialog = sheet();
          if (!dialog?.open) return;
          const height = dialog.offsetHeight;
          const dismiss =
            event.type !== "pointercancel" &&
            (y.get() >= height * 0.42 || (offset.y > 16 && velocity.y > 550));
          const complete = () => {
            if (dismiss && dialog.open) dialog.close();
          };
          if (reduceMotion) {
            y.set(0);
            complete();
            return;
          }
          animation.current = animate(y, dismiss ? height : 0, {
            type: "spring",
            stiffness: 430,
            damping: 39,
            velocity: event.type === "pointercancel" ? 0 : velocity.y,
            onComplete: complete,
          });
        }}
      />
      <button type="submit">關閉篩選</button>
    </form>
  );
}
