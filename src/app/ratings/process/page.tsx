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
export default function EditorialProcessPage() {
  return (
    <main id="main" className="content-main shell">
      <Breadcrumb items={[{ label: "體驗評級", href: "/ratings/" }, { label: "審閱及更正流程" }]} />
      <div className="page-heading">
        <div className="eyebrow">EDITORIAL PROCESS</div>
        <h1>
          有依據，
          <br />
          亦有修正空間。
        </h1>
        <p>每一份評級，先整理材料，再確認稿件及分數。</p>
      </div>
      <div className="prose narrow">
        <section>
          <h2>發布前，逐項確認</h2>
          <ol>
            <li>草稿：記錄年份、組別、跑手位置、原始觀察及記憶限制，材料不足的項目保留未評。</li>
            <li>待確認：營運者審閱完整稿件、每項分數、材料依據及觀察範圍，記錄確認版本。</li>
            <li>
              已發布：顯示確認人、確認日期、版本及更正紀錄。修改分數、字眼、材料或大會回應後，須重新確認才發布。
            </li>
          </ol>
          <p>
            AI
            可協助整理文字；最終分數及稿件需要營運者確認。低分或敏感指控會要求額外人手覆核，必要時尋求法律意見；文字提示並非法律判斷。
          </p>
        </section>
        <section>
          <h2>事實、個人感受與編輯判斷分開</h2>
          <p>
            評論只涵蓋列明年份、組別及觀察時段。單一跑手的經驗不代表全部跑手，亦不推論其他年份安排。原始材料與私人聯絡資料不會直接放上網站。
          </p>
          <p>準則與審閱流程用於提升內容質素，唔代表法律認證或保證免責。</p>
        </section>
        <section>
          <h2>更正、投訴及大會回應</h2>
          <p>
            請指出評論參考、年份／組別、爭議句子或分數、原因及佐證。佐證不限官方公告；照片、參賽紀錄或其他材料可在電郵提供。
          </p>
          <ol>
            <li>由讀者或大會自行寄出電郵。網站準備草稿不代表已收到回報。</li>
            <li>
              營運者人工確認收到後，核對原始紀錄、具體指控及反證，需要時進一步查詢或徵詢專業意見。
            </li>
            <li>核實錯誤後更正，記錄修改日期及內容；具體爭議可在核實期間暫停展示。</li>
            <li>大會回應須先核實來源及可公開範圍，再與編輯評論分開列出；不公開寄件人私人資料。</li>
          </ol>
          <p>收到回報不會自動改分或公開內容。處理進度由電郵回覆，請勿將私人材料放到公開 GitHub。</p>
          <Link className="text-link" href="/ratings/feedback/">
            準備私人電郵回報 →
          </Link>
          <p>
            收件電郵：<a href={`mailto:${editorialContactEmail}`}>{editorialContactEmail}</a>
          </p>
        </section>
        <section id="publication-history">
          <h2>公開處理紀錄</h2>
          <ul className="editorial-notices">
            {notices.map((notice) => (
              <li key={notice.id}>
                <strong>
                  {notice.date} · {reviewTargets.find((t) => t.id === notice.targetId)?.name} ·{" "}
                  {notice.editionYear} · {notice.status}
                </strong>
                <p>{notice.summary}</p>
                <small>評論參考：{notice.reviewId}</small>
              </li>
            ))}
          </ul>
          <p>此處只列可公開的處理摘要；原始材料、投訴電郵及完整內部紀錄分開保存。</p>
        </section>
      </div>
    </main>
  );
}
