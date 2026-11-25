import { englishRaceTerm } from "@/lib/race-terms.en";
import { language, localPath } from "@/lib/english-races";
import Link from "next/link";
import { Breadcrumb } from "@/components/ui";
import notices from "@/data/editorial-notices.json";
import { reviewTargets } from "@/lib/rating-policy";
import { editorialContactEmail } from "@/lib/editorial-contact";
import { pageMetadata } from "@/lib/site";
export const metadata = pageMetadata(
  "評級審閱及更正流程",
  "了解評論的材料整理、營運者確認、版本紀錄及更正／大會回應流程。",
  "/ratings/process/",
);
export default function EditorialProcessPage({ english = false }: { english?: boolean }) {
  const t = language(english);
  return (
    <main id="main" className="content-main shell">
      <Breadcrumb
        english={english}
        items={[
          { label: t("跑手分享", "Runner accounts"), href: "/ratings/" },
          { label: t("審閱及更正流程", "Review and correction process") },
        ]}
      />
      <div className="page-heading">
        <h1>
          {t("有依據，", "Grounded in evidence.")}
          <br />
          {t("亦有修正空間。", "Open to correction.")}
        </h1>
        <p>
          {t(
            "每一份評級，先整理材料，再確認稿件及分數。",
            "We gather the evidence before confirming each review and its ratings.",
          )}
        </p>
      </div>
      <div className="prose narrow">
        <section>
          <h2>{t("發布前，逐項確認", "What we check before publication")}</h2>
          <ol>
            <li>
              {t(
                "草稿：記錄年份、組別、跑手位置、原始觀察及記憶限制，材料不足的項目保留未評。",
                "Draft: record the edition, category, runner’s position, original observations and limits of recall. Leave dimensions unrated where evidence is insufficient.",
              )}
            </li>
            <li>
              {t(
                "待確認：營運者審閱完整稿件、每項分數、材料依據及觀察範圍，記錄確認版本。",
                "Pending approval: the site operator checks the full draft, each score, the supporting evidence and the scope of observation, and records the approved version.",
              )}
            </li>
            <li>
              {t(
                "已發布：顯示確認人、確認日期、版本及更正紀錄。修改分數、字眼、材料或大會回應後，須重新確認才發布。",
                "Published: we show the approver, approval date, version and corrections. Changes to scores, wording, evidence or organiser responses require fresh approval before publication.",
              )}
            </li>
          </ol>
          <p>
            {t(
              "AI 可協助整理文字；最終分數及稿件需要營運者確認。低分或敏感指控會要求額外人手覆核，必要時尋求法律意見；文字提示並非法律判斷。",
              "AI may help organise the wording. The operator confirms the final scores and draft. Low scores or sensitive allegations need extra human review and, where necessary, legal advice. Writing prompts do not constitute legal judgment.",
            )}
          </p>
        </section>
        <section>
          <h2>
            {t(
              "事實、個人感受與編輯判斷分開",
              "Facts, personal observations and editorial judgment",
            )}
          </h2>
          <p>
            {t(
              "評論只涵蓋列明年份、組別及觀察時段。單一跑手的經驗不代表全部跑手，亦不推論其他年份安排。原始材料與私人聯絡資料不會直接放上網站。",
              "Reviews cover the stated edition, category and observation period. One runner’s experience does not represent every runner or predict other editions. We keep original materials and private contact details off the public site.",
            )}
          </p>
          <p>
            {t(
              "準則與審閱流程用於提升內容質素，不構成法律認證或免責保證。",
              "The criteria and review process support editorial quality. They offer no legal certification or guarantee against liability.",
            )}
          </p>
        </section>
        <section>
          <h2>{t("更正、投訴及大會回應", "Corrections, complaints and organiser responses")}</h2>
          <p>
            {t(
              "請指出評論參考、年份／組別、爭議句子或分數、原因及佐證。佐證不限官方公告；照片、參賽紀錄或其他材料可在電郵提供。",
              "Include the review reference, edition and category, disputed text or score, your reasons and any evidence. You may attach photographs, race records or other materials to your email.",
            )}
          </p>
          <ol>
            <li>
              {t(
                "由讀者或大會自行寄出電郵。網站準備草稿不代表已收到回報。",
                "Readers and organisers send the email themselves. Preparing a draft does not submit feedback.",
              )}
            </li>
            <li>
              {t(
                "營運者人工確認收到後，核對原始紀錄、具體指控及反證，需要時進一步查詢或徵詢專業意見。",
                "After acknowledging receipt, the operator checks original records, the specific claims and any conflicting evidence, and seeks further information or professional advice as needed.",
              )}
            </li>
            <li>
              {t(
                "核實錯誤後更正，記錄修改日期及內容；具體爭議可在核實期間暫停展示。",
                "We correct verified errors and record the date and changes. We may pause display of disputed material while reviewing it.",
              )}
            </li>
            <li>
              {t(
                "大會回應須先核實來源及可公開範圍，再與編輯評論分開列出；不公開寄件人私人資料。",
                "We verify the source of an organiser’s response and what may be published before displaying it separately from the editorial review. We keep the sender’s personal data private.",
              )}
            </li>
          </ol>
          <p>
            {t(
              "收到回報不會自動改分或公開內容。處理進度由電郵回覆，請勿將私人材料放到公開 GitHub。",
              "Feedback does not automatically change a score or publish content. We reply by email. Keep private materials out of public GitHub.",
            )}
          </p>
          <Link className="text-link" href={localPath("/ratings/feedback/", english)}>
            {t("準備私人電郵回報", "Prepare private email feedback")}
          </Link>
          <p>
            {t("收件電郵：", "Email recipient: ")}
            <a href={`mailto:${editorialContactEmail}`}>{editorialContactEmail}</a>
          </p>
        </section>
        <section id="publication-history">
          <h2>{t("公開處理紀錄", "Public record of corrections")}</h2>
          <ul className="editorial-notices">
            {notices.map((notice) => (
              <li key={notice.id}>
                <strong>
                  {notice.date} ·{" "}
                  {englishRaceTerm(
                    reviewTargets.find((t) => t.id === notice.targetId)?.name,
                    english,
                  )}{" "}
                  · {notice.editionYear} · {englishRaceTerm(notice.status, english)}
                </strong>
                <p lang={english ? "zh-HK" : undefined}>{notice.summary}</p>
                <small>
                  {t("評論參考：", "Review reference: ")}
                  {notice.reviewId}
                </small>
              </li>
            ))}
          </ul>
          <p>
            {t(
              "此處只列可公開的處理摘要；原始材料、投訴電郵及完整內部紀錄分開保存。",
              "This record contains public summaries. We store original materials, complaint emails and full internal records separately.",
            )}
          </p>
        </section>
      </div>
    </main>
  );
}
