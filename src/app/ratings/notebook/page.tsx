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
export default function NotebookPage() {
  return (
    <main id="main" className="content-main shell">
      <Breadcrumb items={[{ label: "賽事體驗評級", href: "/ratings/" }, { label: "參賽筆記" }]} />
      <div className="page-heading">
        <div className="eyebrow">EXPERIENCE NOTEBOOK</div>
        <h1>
          先記低，
          <br />
          再慢慢整理。
        </h1>
        <p>親身跑過嘅細節，就係原創評論嘅開始。</p>
      </div>
      <div className="prose narrow">
        <Link className="text-link" href="/ratings/">
          查看評分準則 →
        </Link>
        <ReviewNotebook />
      </div>
    </main>
  );
}
