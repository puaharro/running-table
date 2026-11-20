"use client";
import { language, localPath } from "@/lib/english-races";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  quickSearchQueryKey,
  quickSearchResultsHref,
  readRememberedResultsHref,
  resultsHref,
} from "@/lib/results-location";

type ReturnLinkProps = {
  compactOnMobile?: boolean;
  english?: boolean;
};

function ReturnLinkContent({
  compactOnMobile = false,
  english = false,
  href,
  fromSearch = false,
}: ReturnLinkProps & { href: string; fromSearch?: boolean }) {
  const t = language(english);
  return (
    <Link
      className={`text-link return-link${compactOnMobile ? " return-link-responsive" : ""}`}
      href={localPath(href, english)}
    >
      {fromSearch ? (
        t("← 返回搜尋結果", "← Back to search results")
      ) : compactOnMobile ? (
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

function CurrentReturnLink(props: ReturnLinkProps) {
  const pathname = usePathname();
  const params = useSearchParams();
  const searchHref = quickSearchResultsHref(params?.get(quickSearchQueryKey) ?? null);
  const [rememberedHref, setRememberedHref] = useState(() => resultsHref());
  useEffect(() => {
    setRememberedHref(readRememberedResultsHref());
  }, [pathname]);
  return (
    <ReturnLinkContent {...props} href={searchHref ?? rememberedHref} fromSearch={!!searchHref} />
  );
}

export function ReturnLink(props: ReturnLinkProps) {
  return (
    <Suspense fallback={<ReturnLinkContent {...props} href={resultsHref()} />}>
      <CurrentReturnLink {...props} />
    </Suspense>
  );
}
