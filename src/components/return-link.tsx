"use client";
import { language, localPath } from "@/lib/english-races";
import { useEffect, useState } from "react";
import Link from "next/link";
import { readRememberedResultsHref, resultsHref } from "@/lib/results-location";
export function ReturnLink({
  compactOnMobile = false,
  english = false,
}: {
  compactOnMobile?: boolean;
  english?: boolean;
}) {
  const t = language(english);
  const [href, setHref] = useState(() => resultsHref());
  useEffect(() => {
    setHref(readRememberedResultsHref());
  }, []);
  return (
    <Link
      className={`text-link return-link${compactOnMobile ? " return-link-responsive" : ""}`}
      href={localPath(href, english)}
    >
      {compactOnMobile ? (
        <>
          <span className="return-link-full">
            {t("← 返回賽事搜尋／時間表", "← Back to the race calendar")}
          </span>
          <span className="return-link-short">{t("← 返回時間表", "← Back to calendar")}</span>
        </>
      ) : (
        t("← 返回賽事搜尋／時間表", "← Back to the race calendar")
      )}
    </Link>
  );
}
