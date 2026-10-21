"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
export function ReturnLink() {
  const [href, setHref] = useState("/#race-list");
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("rundates:results");
      if (saved && (saved.startsWith("/?") || saved === "/#race-list")) setHref(saved);
    } catch {
      /* Storage can be blocked by the visitor. */
    }
  }, []);
  return (
    <Link className="text-link return-link" href={href}>
      ← 返回賽事總覽
    </Link>
  );
}
