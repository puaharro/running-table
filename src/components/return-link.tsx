"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { safeResultsHref } from "@/lib/results-location";
export function ReturnLink() {
  const [href, setHref] = useState("/races/#race-list");
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("rundates:results");
      setHref(safeResultsHref(saved));
    } catch {
      /* Storage can be blocked by the visitor. */
    }
  }, []);
  return (
    <Link className="text-link return-link" href={href}>
      ← 返回賽事搜尋／時間表
    </Link>
  );
}
