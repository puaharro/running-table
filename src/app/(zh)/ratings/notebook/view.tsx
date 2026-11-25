import { language, localPath } from "@/lib/english-races";
import Link from "next/link";
import { Breadcrumb } from "@/components/ui";
import { ReviewNotebook } from "@/components/review-notebook";
import { pageMetadata } from "@/lib/site";
export const metadata = {
  ...pageMetadata(
    "參賽筆記",
    "整理每屆賽道、大會及補給經驗，筆記僅在目前瀏覽器儲存。",
    "/ratings/notebook/",
  ),
  robots: { index: false, follow: false },
};
export default function NotebookPage({ english = false }: { english?: boolean }) {
  const t = language(english);
  return (
    <main id="main" className="content-main shell">
      <Breadcrumb
        english={english}
        items={[
          { label: t("跑手分享", "Runner accounts"), href: "/ratings/" },
          { label: t("參賽筆記", "Race notebook") },
        ]}
      />
      <div className="page-heading">
        <h1>
          {t("先記低，", "Capture race details")}
          <br />
          {t("再慢慢整理。", "while they’re fresh.")}
        </h1>
        <p>
          {t(
            "記錄親身參賽的細節，為原創評論整理素材。",
            "Record your first-hand race experience as material for an original review.",
          )}
        </p>
      </div>
      <div className="prose narrow">
        <Link className="text-link" href={localPath("/ratings/", english)}>
          {t("查看評分準則", "View the rating criteria")}
        </Link>
        <ReviewNotebook english={english} />
      </div>
    </main>
  );
}
