import { language, localPath } from "@/lib/english-races";
import Link from "next/link";
import { EditorialFeedback } from "@/components/editorial-feedback";
import { Breadcrumb } from "@/components/ui";
import { publicRaces as races } from "@/data/races";
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
export default function FeedbackPage({ english = false }: { english?: boolean }) {
  const t = language(english);
  return (
    <main id="main" className="content-main shell">
      <Breadcrumb
        english={english}
        items={[
          { label: t("跑手分享", "Runner accounts"), href: "/ratings/" },
          { label: t("更正、投訴及回應", "Corrections, complaints and responses") },
        ]}
      />
      <div className="page-heading">
        <h1>
          {t("指出具體內容，", "Tell us what needs checking.")}
          <br />
          {t("一齊核實。", "We’ll review the details.")}
        </h1>
        <p>
          {t(
            "評級更正、投訴及大會回應，經私人電郵處理。",
            "We handle rating corrections, complaints and organiser responses by private email.",
          )}
        </p>
      </div>
      <div className="prose narrow">
        <Link className="text-link" href={localPath("/ratings/process/", english)}>
          {t("了解審閱及更正流程", "How we review corrections")}
        </Link>
        <EditorialFeedback
          english={english}
          races={races.map((r) => ({
            id: r.id,
            name: english
              ? r.englishName
              : (reviewTargets.find((target) => target.raceId === r.id)?.name ?? r.name),
          }))}
          recipient={editorialContactEmail}
        />
      </div>
    </main>
  );
}
