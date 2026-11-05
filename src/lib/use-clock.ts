"use client";

import { useEffect, useState } from "react";

// Keep the live clock independent of registration/review rendering so pages
// that only need date rollover do not import the full detail-page component tree.
export function useClock(initialNow: string) {
  const [now, setNow] = useState(initialNow);
  useEffect(() => {
    const sync = () => setNow(new Date().toISOString());
    sync();
    const timer = window.setInterval(sync, 30000);
    window.addEventListener("pageshow", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("pageshow", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);
  return now;
}
