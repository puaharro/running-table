"use client";

import { language } from "@/lib/english-races";
import { englishRaceTerm } from "@/lib/race-terms.en";
import { useEffect, useState, type FormEvent } from "react";
import {
  feedbackTypes,
  prepareEditorialFeedback,
  type EditorialFeedback as Feedback,
} from "@/lib/editorial-contact";

export function EditorialFeedback({
  races,
  recipient,
  english = false,
}: {
  races: { id: string; name: string }[];
  recipient: string;
  english?: boolean;
}) {
  const t = language(english);
  const [raceId, setRaceId] = useState("");
  const [fields, setFields] = useState<Omit<Feedback, "raceName">>({
    type: "correction",
    group: "",
    year: "",
    reviewId: "",
    quotedText: "",
    details: "",
    evidenceUrl: "",
    replyEmail: "",
  });
  const [prepared, setPrepared] = useState<ReturnType<typeof prepareEditorialFeedback> | null>(
    null,
  );
  const [error, setError] = useState("");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (races.some((r) => r.id === params.get("race"))) setRaceId(params.get("race")!);
    setFields((f) => ({
      ...f,
      reviewId: (params.get("review") ?? "").slice(0, 150),
      year: /^20\d{2}$/.test(params.get("year") ?? "") ? params.get("year")! : "",
      group: (params.get("group") ?? "").slice(0, 100),
    }));
  }, [races]);
  function field<K extends keyof typeof fields>(key: K, value: (typeof fields)[K]) {
    setFields((f) => ({ ...f, [key]: value }));
    setPrepared(null);
    setError("");
  }
  function prepare(event: FormEvent) {
    event.preventDefault();
    setPrepared(null);
    try {
      setPrepared(
        prepareEditorialFeedback(
          { ...fields, raceName: races.find((r) => r.id === raceId)?.name ?? "" },
          recipient,
          english,
        ),
      );
      setError("");
    } catch (e) {
      setError(
        e instanceof Error
          ? englishRaceTerm(e.message, english)
          : t("請檢查輸入內容。", "Check the fields and try again."),
      );
    }
  }
  return (
    <form className="correction-form editorial-feedback" onSubmit={prepare}>
      <p>
        {t(
          "此表格只產生電郵草稿，不會上傳或儲存投訴。請確認內容後，自行寄到",
          "This form prepares an email draft without uploading or storing the report. Review it and send it to",
        )}{" "}
        <a href={`mailto:${recipient}`}>{recipient}</a>
        {t("；附件可在電郵加入。", ". You can add attachments in your email app.")}
      </p>
      <label>
        {t("回報類別", "Feedback type")}
        <select
          value={fields.type}
          onChange={(e) => field("type", e.target.value as Feedback["type"])}
        >
          {Object.entries(feedbackTypes).map(([value, label]) => (
            <option key={value} value={value}>
              {englishRaceTerm(label, english)}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t("賽事系列", "Race series")}
        <select
          required
          value={raceId}
          onChange={(e) => {
            setRaceId(e.target.value);
            setPrepared(null);
          }}
        >
          <option value="">{t("請選擇賽事", "Select a race")}</option>
          {races.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t("所指參賽年份", "Edition year")}
        <input
          required
          inputMode="numeric"
          pattern="20[0-9]{2}"
          maxLength={4}
          value={fields.year}
          onChange={(e) => field("year", e.target.value)}
          placeholder={t(
            "例如 2025；往屆請填實際年份",
            "For example, 2025. Enter the year the race took place.",
          )}
        />
      </label>
      <label>
        {t("組別", "Category")}
        <input
          required
          maxLength={100}
          value={fields.group}
          onChange={(e) => field("group", e.target.value)}
          placeholder={t(
            "例如半馬、全馬或起跑批次",
            "For example, half marathon, marathon or start wave",
          )}
        />
      </label>
      <label>
        {t("評論參考（選填）", "Review reference (optional)")}
        <input
          maxLength={150}
          value={fields.reviewId}
          onChange={(e) => field("reviewId", e.target.value)}
        />
      </label>
      <label>
        {t("爭議句子／分數", "Disputed wording or score")}
        <textarea
          required
          maxLength={1200}
          rows={3}
          value={fields.quotedText}
          onChange={(e) => field("quotedText", e.target.value)}
        />
      </label>
      <label>
        {t("原因／希望更正或回應的內容", "Reason and requested correction or response")}
        <textarea
          required
          maxLength={2000}
          rows={5}
          value={fields.details}
          onChange={(e) => field("details", e.target.value)}
        />
      </label>
      <label>
        {t("佐證連結（選填，毋須為官方公告）", "Evidence link (optional)")}
        <input
          type="url"
          pattern="https://.*"
          maxLength={500}
          value={fields.evidenceUrl}
          onChange={(e) => field("evidenceUrl", e.target.value)}
          placeholder="https://"
        />
      </label>
      <label>
        {t("回覆電郵（選填）", "Reply email (optional)")}
        <input
          type="email"
          maxLength={200}
          value={fields.replyEmail}
          onChange={(e) => field("replyEmail", e.target.value)}
        />
      </label>
      <p>
        {t(
          "請只提供處理所需資料，避免加入身份證、健康資料或無關人士個人資料；回報內容不會轉發至公開的 GitHub 儲存庫。",
          "Include only information needed to review the report. Leave out identity documents, medical data and unrelated personal information. Your report is not forwarded to the public GitHub repository.",
        )}
      </p>
      <button type="submit" className="button button-dark">
        {t("準備私人電郵", "Prepare private email")}
      </button>
      {error && <p role="alert">{error}</p>}
      {prepared && (
        <div className="prepared-feedback" role="status">
          <h3>{t("電郵草稿已準備，尚未寄出", "Email draft ready to send")}</h3>
          <p>
            {t(
              "網站尚未收到此回報。請自行開啟電郵程式、確認收件人及內容，再按寄出。",
              "Open your email app, check the recipient and contents, then send the draft.",
            )}
          </p>
          <a className="text-link" href={prepared.url}>
            {t("開啟電郵草稿", "Open email draft")}
          </a>
          <label>
            {t("電郵內容（可複製）", "Email text (copyable)")}
            <textarea readOnly rows={12} value={`${prepared.subject}\n\n${prepared.body}`} />
          </label>
          <p>
            {t(
              "如電郵程式未帶齊內容，可複製以上文字，自行寄到",
              "If your email app omits part of the draft, copy the text above and send it to",
            )}{" "}
            {prepared.recipient}
            {t("。", ".")}
          </p>
        </div>
      )}
    </form>
  );
}
