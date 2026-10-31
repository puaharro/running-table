import Link from "next/link";
import { EditorialFeedback } from "@/components/editorial-feedback";
import { Breadcrumb } from "@/components/ui";
import { races } from "@/data/races";
import { editorialContactEmail } from "@/lib/editorial-contact";
import { reviewTargets } from "@/lib/rating-policy";
import { pageMetadata } from "@/lib/site";
export const metadata = {
  ...pageMetadata(
    "評級更正、投訴及大會回應",
    "以私人電郵提供爭議內容及佐證，核實後記錄更正或大會回應。",
    "/ratings/feedback/",
  ),
  robots: { index: false, follow: true },
};
export default function FeedbackPage() {
  return (
    <main id="main" className="content-main shell">
      <Breadcrumb
        items={[{ label: "體驗評級", href: "/ratings/" }, { label: "更正、投訴及回應" }]}
      />
      <div className="page-heading">
        <div className="eyebrow">EDITORIAL FEEDBACK</div>
        <h1>
          指出具體內容，
          <br />
          一齊核實。
        </h1>
        <p>評級更正、投訴及大會回應，經私人電郵處理。</p>
      </div>
      <div className="prose narrow">
        <Link className="text-link" href="/ratings/process/">
          了解審閱及更正流程 →
        </Link>
        <EditorialFeedback
          races={races.map((r) => ({
            id: r.id,
            name:
              reviewTargets.find((target) => target.raceId === r.id)?.name ??
              r.name.replace(/\s*20\d{2}(?:\/\d{2,4})?/g, "").trim(),
          }))}
          recipient={editorialContactEmail}
        />
      </div>
    </main>
  );
}
